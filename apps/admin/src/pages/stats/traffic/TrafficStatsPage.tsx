// 유입 분석 — /stats/traffic
//
// [방문자 통계와 무엇이 다른가]
//   방문자 통계: **몇 명이 왔나** — 방문·순 방문자·체류시간. 사람을 센다.
//   여기:        **어디서 왔고, 그중 무엇이 팔았나** — 채널마다 유입수 옆에 구매건수·매출액·
//                구매전환율이 붙는다. 유입을 매출로 잇는 것이 이 화면의 전부다.
// 그래서 유입수 1위 채널이 매출 1위가 아닐 수 있다는 것이 여기서 보인다 — '많이 온 곳'과
// '파는 곳'을 가르는 것이 유입 분석의 존재 이유다.
import { useCallback, useMemo } from 'react';
import { SegmentedControl } from '@tds/ui';

import { Alert, Card, CardTitle } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { ShareBarList } from '../_shared/ShareBarList';
import { StatsKpiRow } from '../_shared/StatsKpiRow';
import { StatsPageShell } from '../_shared/StatsPageShell';
import { StatsTable } from '../_shared/StatsTable';
import { StatsTrendCard } from '../_shared/StatsTrendCard';
import { StatsEmpty } from '../_shared/StatsEmpty';
import { formatPercentValue, formatWonValue, shareOf } from '../_shared/format';
import { comparePeriodOf } from '../_shared/period';
import { useCsvExport } from '../_shared/useCsvExport';
import { useStatsQuery } from '../_shared/queries';
import { useStatsParams } from '../_shared/useStatsParams';
import type { SegmentOption, ShareItem, StatsColumn, StatsKpi, StatsTrend } from '../_shared/types';
import { fetchTrafficStats } from './data-source';
import {
  EMPTY_TRAFFIC_STATS,
  TRAFFIC_BREAKDOWNS,
  TRAFFIC_CHANNELS,
  TRAFFIC_SEGMENTS,
  channelVisits,
  conversionRate,
  isTrafficSegment,
  metricsOfSegment,
  totalOf,
} from './types';
import type { TrafficDayRow, TrafficRow, TrafficSegment } from './types';

const ROUTE = '/stats/traffic';

/** 카페24의 '북마크'가 무엇을 담는지 — 이름만 보면 즐겨찾기로 오해한다 */
const BOOKMARK_HINT =
  '북마크에는 즐겨찾기뿐 아니라 주소창 직접입력·앱 접속처럼 유입 경로가 남지 않은 방문이 함께 담깁니다.';

function segmentOf(value: string): TrafficSegment {
  return isTrafficSegment(value) ? value : 'all';
}

/** 세그먼트가 고른 '유입' 지표의 이름 — KPI·차트 라벨이 함께 바뀐다 */
function visitLabelOf(segment: TrafficSegment): string {
  if (segment === 'all') return '총 유입수';
  return `${TRAFFIC_SEGMENTS.find((option) => option.id === segment)?.label ?? ''} 유입수`;
}

/** 검색엔진별·랜딩페이지별은 컬럼이 같다 — 첫 칸의 이름만 다르다 */
function columnsOf(header: string): readonly StatsColumn<TrafficRow>[] {
  return [
    {
      key: 'label',
      header,
      align: 'left',
      render: (row) => row.label,
      csv: (row) => row.label,
      sortValue: (row) => row.label,
    },
    {
      key: 'visits',
      header: '유입수',
      align: 'right',
      render: (row) => formatNumber(row.visits),
      csv: (row) => formatNumber(row.visits),
      sortValue: (row) => row.visits,
    },
    {
      key: 'orders',
      header: '구매건수',
      align: 'right',
      render: (row) => formatNumber(row.orders),
      csv: (row) => formatNumber(row.orders),
      sortValue: (row) => row.orders,
    },
    {
      // ERP-07 — 단위는 헤더가 갖는다. 우측 정렬 칸에 '원'을 붙이면 단위가 마지막 자릿수를
      // 따라다녀 tabular-nums 세로 정렬이 깨진다.
      key: 'revenue',
      header: '매출액 (원)',
      align: 'right',
      render: (row) => formatWonValue(row.revenue),
      csv: (row) => formatWonValue(row.revenue),
      sortValue: (row) => row.revenue,
    },
    {
      key: 'conversion',
      header: '구매전환율 (%)',
      align: 'right',
      render: (row) => formatPercentValue(conversionRate(row.visits, row.orders)),
      csv: (row) => formatPercentValue(conversionRate(row.visits, row.orders)),
      sortValue: (row) => conversionRate(row.visits, row.orders),
    },
  ];
}

/** 추이 차트가 그릴 수 있는 지표 — URL 의 metric 파라미터가 고른다 */
const TREND_METRICS: readonly SegmentOption[] = [
  { id: 'visits', label: '유입' },
  { id: 'orders', label: '구매' },
  { id: 'revenue', label: '매출' },
  { id: 'conversion', label: '전환율' },
];

export default function TrafficStatsPage() {
  const params = useStatsParams({
    segments: TRAFFIC_SEGMENTS,
    views: TRAFFIC_BREAKDOWNS,
    metrics: TREND_METRICS,
    defaultSort: { key: 'visits', direction: 'desc' },
  });
  const exportState = useCsvExport();

  const comparePeriod = comparePeriodOf(params.period, params.compare);
  const segment = segmentOf(params.segment);
  const isChannelView = params.view === 'channel';
  const isEngineView = params.view === 'engine';

  // 조회 조건 전체가 키에 들어간다 — 늦게 온 이전 조건의 응답이 현재를 덮지 못한다 (COMP-10)
  const query = useStatsQuery(
    ['stats', 'traffic', params.period, comparePeriod, params.compare],
    useCallback(
      (signal: AbortSignal) => fetchTrafficStats({ period: params.period, comparePeriod }, signal),
      [params.period, comparePeriod],
    ),
  );

  const stats = query.data ?? EMPTY_TRAFFIC_STATS;

  const kpis = useMemo<readonly StatsKpi[]>(() => {
    const daily = stats.daily;
    const compare = stats.compareDaily;
    const visitsOf = (rows: readonly TrafficDayRow[]): number =>
      totalOf(rows, segment, (metrics) => metrics.visits);
    const ordersOf = (rows: readonly TrafficDayRow[]): number =>
      totalOf(rows, segment, (metrics) => metrics.orders);
    const revenueOf = (rows: readonly TrafficDayRow[]): number =>
      totalOf(rows, segment, (metrics) => metrics.revenue);
    const rateOf = (rows: readonly TrafficDayRow[]): number =>
      conversionRate(visitsOf(rows), ordersOf(rows));

    return [
      {
        id: 'visits',
        label: visitLabelOf(segment),
        unit: 'count',
        value: visitsOf(daily),
        compareValue: compare === null ? null : visitsOf(compare),
        ...(segment === 'bookmark' ? { hint: BOOKMARK_HINT } : {}),
      },
      {
        id: 'orders',
        label: '구매건수',
        unit: 'count',
        value: ordersOf(daily),
        compareValue: compare === null ? null : ordersOf(compare),
        hint: '해당 유입으로 들어와 결제까지 이어진 건수입니다.',
      },
      {
        id: 'revenue',
        label: '매출액',
        unit: 'won',
        value: revenueOf(daily),
        compareValue: compare === null ? null : revenueOf(compare),
        hint: '해당 유입에서 발생한 결제 금액의 합입니다.',
      },
      {
        id: 'conversion',
        label: '구매전환율',
        unit: 'percent',
        value: rateOf(daily),
        compareValue: compare === null ? null : rateOf(compare),
        hint: '구매건수 ÷ 방문수 × 100 으로 계산합니다.',
      },
    ];
  }, [stats, segment]);

  const trends = useMemo<readonly StatsTrend[]>(() => {
    const labels = stats.daily.map((row) => row.label);
    const trendOf = (
      id: string,
      label: string,
      unit: StatsTrend['unit'],
      pick: (row: TrafficDayRow) => number,
    ): StatsTrend => ({
      id,
      label,
      labels,
      unit,
      current: stats.daily.map(pick),
      compare: stats.compareDaily === null ? null : stats.compareDaily.map(pick),
    });

    return [
      trendOf(
        'visits',
        visitLabelOf(segment),
        'count',
        (row) => metricsOfSegment(row, segment).visits,
      ),
      trendOf('orders', '구매건수', 'count', (row) => metricsOfSegment(row, segment).orders),
      trendOf('revenue', '매출액', 'won', (row) => metricsOfSegment(row, segment).revenue),
      trendOf('conversion', '구매전환율', 'percent', (row) => {
        const metrics = metricsOfSegment(row, segment);
        return conversionRate(metrics.visits, metrics.orders);
      }),
    ];
  }, [stats, segment]);

  const channelItems = useMemo<readonly ShareItem[]>(
    () =>
      TRAFFIC_CHANNELS.map((channel) => ({
        id: channel.id,
        label: channel.label,
        value: channelVisits(stats.daily, channel.id),
        compareValue:
          stats.compareDaily === null ? null : channelVisits(stats.compareDaily, channel.id),
      })),
    [stats],
  );

  // 내보내기도 화면과 같은 원천을 쓴다 — 막대에 보이는 값이 그대로 엑셀에 담긴다 (ERP-12)
  const channelColumns = useMemo<readonly StatsColumn<ShareItem>[]>(() => {
    const total = channelItems.reduce((sum, item) => sum + item.value, 0);
    return [
      {
        key: 'label',
        header: '유입 채널',
        align: 'left',
        render: (item) => item.label,
        csv: (item) => item.label,
      },
      {
        key: 'value',
        header: '유입수',
        align: 'right',
        render: (item) => formatNumber(item.value),
        csv: (item) => formatNumber(item.value),
      },
      {
        key: 'share',
        header: '구성비 (%)',
        align: 'right',
        render: (item) => formatPercentValue(shareOf(item.value, total)),
        csv: (item) => formatPercentValue(shareOf(item.value, total)),
      },
    ];
  }, [channelItems]);

  const tableRows: readonly TrafficRow[] = isEngineView ? stats.engines : stats.landings;
  const tableColumns = useMemo(
    () => columnsOf(isEngineView ? '검색엔진' : '랜딩페이지'),
    [isEngineView],
  );

  const viewLabel = TRAFFIC_BREAKDOWNS.find((item) => item.id === params.view)?.label ?? '채널별';

  return (
    <StatsPageShell
      description="유입이 어디서 왔고 그중 무엇이 실제로 팔았는지 보는 화면입니다. 방문자 통계가 '몇 명이 왔나'라면 여기서는 채널마다 유입수 옆에 구매건수와 매출액을 붙여 '어느 유입이 매출로 이어졌는지'를 봅니다."
      route={ROUTE}
      params={params}
      segments={TRAFFIC_SEGMENTS}
      segmentLabel="유입 채널"
      error={query.error}
      onRetry={query.refetch}
      exportState={exportState}
      exportCount={isChannelView ? channelItems.length : tableRows.length}
      onExport={() => {
        if (isChannelView) {
          exportState.start({
            baseName: 'stats-traffic-channel',
            columns: channelColumns,
            rows: channelItems,
          });
          return;
        }
        exportState.start({
          baseName: `stats-traffic-${params.view}`,
          columns: tableColumns,
          rows: tableRows,
        });
      }}
      notice={
        isEngineView ? (
          // 화면이 조용히 비어 보이는 대신, 왜 검색어가 없는지 먼저 말한다.
          // 구글은 개인정보 보호정책상 검색어를 리퍼러로 넘기지 않는다 — 카페24는 이것을
          // '참조검색어 없음'으로 집계한다. 유입수는 정상으로 잡히고 검색어만 빈다.
          <Alert tone="info">
            구글 유입은 개인정보 보호정책에 따라 검색어가 전달되지 않아 카페24에서 '참조검색어
            없음'으로 집계됩니다. 아래 유입수·매출액은 정상으로 잡히지만, 어떤 검색어로 들어왔는지는
            확인할 수 없습니다.
          </Alert>
        ) : null
      }
    >
      <StatsKpiRow kpis={kpis} loading={query.isFirstLoad} error={query.error} />

      <StatsTrendCard
        title="유입 추이"
        trends={trends}
        activeId={params.metric}
        onActiveChange={params.setMetric}
        period={params.period}
        comparePeriod={comparePeriod}
        loading={query.isFirstLoad}
        error={query.error}
      />

      <Card>
        <CardTitle
          action={
            <SegmentedControl
              value={params.view}
              options={TRAFFIC_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
              size="sm"
              ariaLabel="드릴다운 축"
              disabled={query.isFirstLoad}
              onChange={params.setView}
            />
          }
        >
          {viewLabel} 상세
        </CardTitle>

        {isChannelView ? (
          /* 채널별은 표가 아니라 구성비 막대다 — '검색엔진이 몇 명인가'보다
             '전체 유입 중 얼마가 검색엔진인가'가 물음이라 길이로 읽힌다 */
          <ShareBarList
            items={channelItems}
            unit="count"
            loading={query.isFirstLoad}
            skeletonCount={TRAFFIC_CHANNELS.length}
            empty={
              <StatsEmpty
                label="유입"
                hasActiveFilters={params.hasActiveFilters}
                onResetFilters={params.resetFilters}
              />
            }
          />
        ) : (
          <StatsTable
            rows={tableRows}
            columns={tableColumns}
            rowKey={(row) => row.id}
            caption={`${viewLabel} 유입 상세`}
            sort={params.sort}
            onToggleSort={params.toggleSort}
            page={params.page}
            pageSize={params.pageSize}
            onPageChange={params.setPage}
            onPageSizeChange={params.setPageSize}
            loading={query.isFirstLoad}
            empty={
              <StatsEmpty
                label="유입 기록"
                hasActiveFilters={params.hasActiveFilters}
                onResetFilters={params.resetFilters}
              />
            }
          />
        )}
      </Card>
    </StatsPageShell>
  );
}
