// 방문자 통계 — /stats/visitors (A40 소유)
//
// [대시보드의 방문자 카드와 무엇이 다른가]
//   대시보드: 일/주/월 토글 + 방문자·페이지뷰 2계열 = '지금 어떤가'의 요약 위젯.
//   여기:     기간을 직접 좁히고(프리셋·직접입력) · **비교 기간과 겹쳐 보고**(직전/전년) ·
//             방문자 유형으로 갈라 보고(처음/다시) · 일자→시간대→요일로 파고들고 ·
//             조건 전체를 엑셀로 내린다. = '왜 그런가'를 파는 분석 화면.
// 요약을 한 번 더 그리는 게 아니라, 요약이 답하지 못하는 질문을 받는다.
import { useCallback, useMemo } from 'react';
import { SegmentedControl } from '@tds/ui';

import { Card, CardTitle } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { StatsKpiRow } from '../_shared/StatsKpiRow';
import { StatsPageShell } from '../_shared/StatsPageShell';
import { StatsTable } from '../_shared/StatsTable';
import { StatsTrendCard } from '../_shared/StatsTrendCard';
import { StatsEmpty } from '../_shared/StatsEmpty';
import { formatDuration, formatPercentValue } from '../_shared/format';
import { comparePeriodOf } from '../_shared/period';
import { useCsvExport } from '../_shared/useCsvExport';
import { useStatsQuery } from '../_shared/queries';
import { useStatsParams } from '../_shared/useStatsParams';
import type { SegmentOption, StatsColumn, StatsKpi, StatsTrend } from '../_shared/types';
import { fetchVisitorStats } from './data-source';
import {
  EMPTY_VISITOR_STATS,
  VISITOR_BREAKDOWNS,
  VISITOR_SEGMENTS,
  averageDuration,
  isVisitorSegment,
  revisitRate,
  sumOf,
  visitsOfSegment,
} from './types';
import type { VisitorRow, VisitorSegment } from './types';

const ROUTE = '/stats/visitors';

/** 세그먼트가 고른 '방문' 지표의 이름 — KPI·차트 라벨이 함께 바뀐다 */
const SEGMENT_METRIC_LABEL: Readonly<Record<VisitorSegment, string>> = {
  all: '전체 방문 수',
  new: '처음 온 방문자',
  returning: '다시 온 방문자',
};

function segmentOf(value: string): VisitorSegment {
  return isVisitorSegment(value) ? value : 'all';
}

/** 한 행의 재방문율 — 표의 파생 컬럼 */
function rowRevisitRate(row: VisitorRow): number {
  return row.visits === 0 ? 0 : (row.returningVisitors / row.visits) * 100;
}

const columns: readonly StatsColumn<VisitorRow>[] = [
  {
    key: 'label',
    header: '구간',
    align: 'left',
    render: (row) => row.label,
    csv: (row) => row.label,
    sortValue: (row) => row.id,
  },
  {
    key: 'visits',
    header: '전체 방문 수',
    align: 'right',
    render: (row) => formatNumber(row.visits),
    csv: (row) => formatNumber(row.visits),
    sortValue: (row) => row.visits,
  },
  {
    key: 'uniqueVisitors',
    header: '순 방문자 수',
    align: 'right',
    render: (row) => formatNumber(row.uniqueVisitors),
    csv: (row) => formatNumber(row.uniqueVisitors),
    sortValue: (row) => row.uniqueVisitors,
  },
  {
    key: 'pageViews',
    header: '페이지뷰',
    align: 'right',
    render: (row) => formatNumber(row.pageViews),
    csv: (row) => formatNumber(row.pageViews),
    sortValue: (row) => row.pageViews,
  },
  {
    key: 'newVisitors',
    header: '처음 온 방문자',
    align: 'right',
    render: (row) => formatNumber(row.newVisitors),
    csv: (row) => formatNumber(row.newVisitors),
    sortValue: (row) => row.newVisitors,
  },
  {
    key: 'returningVisitors',
    header: '다시 온 방문자',
    align: 'right',
    render: (row) => formatNumber(row.returningVisitors),
    csv: (row) => formatNumber(row.returningVisitors),
    sortValue: (row) => row.returningVisitors,
  },
  {
    key: 'revisitRate',
    header: '재방문율 (%)',
    align: 'right',
    render: (row) => formatPercentValue(rowRevisitRate(row)),
    csv: (row) => formatPercentValue(rowRevisitRate(row)),
    sortValue: (row) => rowRevisitRate(row),
  },
  {
    key: 'duration',
    header: '평균 체류시간',
    align: 'right',
    render: (row) => formatDuration(row.durationSeconds),
    csv: (row) => formatDuration(row.durationSeconds),
    sortValue: (row) => row.durationSeconds,
  },
];

/** 추이 차트가 그릴 수 있는 지표 — URL 의 metric 파라미터가 고른다 */
const TREND_METRICS: readonly SegmentOption[] = [
  { id: 'visits', label: '방문' },
  { id: 'pageViews', label: '페이지뷰' },
  { id: 'unique', label: '순 방문자' },
  { id: 'duration', label: '체류시간' },
];

export default function VisitorStatsPage() {
  const params = useStatsParams({
    segments: VISITOR_SEGMENTS,
    views: VISITOR_BREAKDOWNS,
    metrics: TREND_METRICS,
    defaultSort: { key: 'label', direction: 'desc' },
  });
  const exportState = useCsvExport();

  const comparePeriod = comparePeriodOf(params.period, params.compare);
  const segment = segmentOf(params.segment);

  // 조회 조건 전체가 키에 들어간다 — 늦게 온 이전 조건의 응답이 현재를 덮지 못한다 (COMP-10)
  const query = useStatsQuery(
    ['stats', 'visitors', params.period, comparePeriod, params.compare],
    useCallback(
      (signal: AbortSignal) => fetchVisitorStats({ period: params.period, comparePeriod }, signal),
      [params.period, comparePeriod],
    ),
  );

  const stats = query.data ?? EMPTY_VISITOR_STATS;

  const kpis = useMemo<readonly StatsKpi[]>(() => {
    const daily = stats.daily;
    const compare = stats.compareDaily;
    const pick = (rows: readonly VisitorRow[]): number =>
      sumOf(rows, (row) => visitsOfSegment(row, segment));

    return [
      {
        id: 'visits',
        label: SEGMENT_METRIC_LABEL[segment],
        unit: 'count',
        value: pick(daily),
        compareValue: compare === null ? null : pick(compare),
        hint: '같은 사람이 두 번 오면 2회로 셉니다.',
      },
      {
        id: 'unique',
        label: '순 방문자 수',
        unit: 'people',
        value: sumOf(daily, (row) => row.uniqueVisitors),
        compareValue: compare === null ? null : sumOf(compare, (row) => row.uniqueVisitors),
        hint: '중복을 제거한 실제 방문자 수입니다.',
      },
      {
        id: 'pageViews',
        label: '전체 페이지뷰',
        unit: 'count',
        value: sumOf(daily, (row) => row.pageViews),
        compareValue: compare === null ? null : sumOf(compare, (row) => row.pageViews),
        hint: '방문자가 열람한 페이지 수의 합입니다.',
      },
      {
        id: 'revisit',
        label: '재방문율',
        unit: 'percent',
        value: revisitRate(daily),
        compareValue: compare === null ? null : revisitRate(compare),
        hint: '전체 방문 중 다시 온 방문의 비율입니다.',
      },
      {
        id: 'duration',
        label: '평균 체류시간',
        unit: 'seconds',
        value: averageDuration(daily),
        compareValue: compare === null ? null : averageDuration(compare),
        hint: '방문 수로 가중평균한 체류시간입니다.',
      },
    ];
  }, [stats, segment]);

  const trends = useMemo<readonly StatsTrend[]>(() => {
    const labels = stats.daily.map((row) => row.label);
    const trendOf = (
      id: string,
      label: string,
      unit: StatsTrend['unit'],
      pick: (row: VisitorRow) => number,
    ): StatsTrend => ({
      id,
      label,
      labels,
      unit,
      current: stats.daily.map(pick),
      compare: stats.compareDaily === null ? null : stats.compareDaily.map(pick),
    });

    return [
      trendOf('visits', SEGMENT_METRIC_LABEL[segment], 'count', (row) =>
        visitsOfSegment(row, segment),
      ),
      trendOf('pageViews', '페이지뷰', 'count', (row) => row.pageViews),
      trendOf('unique', '순 방문자', 'people', (row) => row.uniqueVisitors),
      trendOf('duration', '체류시간', 'seconds', (row) => row.durationSeconds),
    ];
  }, [stats, segment]);

  // 드릴다운 축 — 일자별에서 시간대별·요일별로 파고든다
  const rows: readonly VisitorRow[] =
    params.view === 'hourly'
      ? stats.hourly
      : params.view === 'weekday'
        ? stats.weekday
        : stats.daily;

  const viewLabel = VISITOR_BREAKDOWNS.find((item) => item.id === params.view)?.label ?? '일자별';

  return (
    <StatsPageShell
      description="기간을 좁혀 비교하고, 방문자 유형과 시간대·요일까지 파고드는 방문 분석입니다. 대시보드의 방문자 위젯이 '지금 몇 명'이라면 여기서는 '지난 기간과 견주어 어떻게 달라졌는지'를 봅니다."
      route={ROUTE}
      params={params}
      segments={VISITOR_SEGMENTS}
      segmentLabel="방문자 유형"
      error={query.error}
      onRetry={query.refetch}
      exportState={exportState}
      exportCount={rows.length}
      onExport={() => {
        exportState.start({ baseName: `stats-visitors-${params.view}`, columns, rows });
      }}
    >
      <StatsKpiRow kpis={kpis} loading={query.isFirstLoad} error={query.error} />

      <StatsTrendCard
        title="방문 추이"
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
              options={VISITOR_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
              size="sm"
              ariaLabel="드릴다운 축"
              disabled={query.isFirstLoad}
              onChange={params.setView}
            />
          }
        >
          {viewLabel} 상세
        </CardTitle>

        <StatsTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          caption={`${viewLabel} 방문자 상세`}
          sort={params.sort}
          onToggleSort={params.toggleSort}
          page={params.page}
          pageSize={params.pageSize}
          onPageChange={params.setPage}
          onPageSizeChange={params.setPageSize}
          loading={query.isFirstLoad}
          empty={
            <StatsEmpty
              label="방문 기록"
              hasActiveFilters={params.hasActiveFilters}
              onResetFilters={params.resetFilters}
            />
          }
        />
      </Card>
    </StatsPageShell>
  );
}
