// 검색어 분석 — /stats/keywords (A40 소유)
//
// [이 화면이 답하는 질문] '손님이 무엇을 찾아 들어오는가, 그리고 우리는 그것을 갖고 있는가.'
// 다른 통계 화면이 '얼마나 왔나'를 세는 데 반해 여기서는 **순위**가 본체다 — 어떤 검색어가 위에
// 있고, 그중 우리 카탈로그가 받아내지 못한 것이 무엇인지. 그래서 표의 모든 수치 열이 정렬
// 가능하고 기본 정렬이 검색수 내림차순이다 (ERP-04).
//
// [검색 입력이 있는 유일한 통계 화면] 검색어 목록은 수백 줄이라 눈으로 훑어 찾을 수 없다.
// 한글 IME 안전 커밋(조합 중에는 조회하지 않는다)은 셸이 StatsFilterBar → useImeSearch 로
// 처리하고, 여기서는 **확정된** params.keyword 로 행을 거를 뿐이다 (COMP-10).
import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';

import { Card, CardTitle, StatusBadge } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { StatsKpiRow } from '../_shared/StatsKpiRow';
import { StatsPageShell } from '../_shared/StatsPageShell';
import { StatsTable } from '../_shared/StatsTable';
import { StatsTrendCard } from '../_shared/StatsTrendCard';
import { StatsEmpty } from '../_shared/StatsEmpty';
import { formatPercentValue } from '../_shared/format';
import { comparePeriodOf } from '../_shared/period';
import { useCsvExport } from '../_shared/useCsvExport';
import { useStatsQuery } from '../_shared/queries';
import { useStatsParams } from '../_shared/useStatsParams';
import type { SegmentOption, StatsColumn, StatsKpi, StatsTrend } from '../_shared/types';
import { fetchKeywordStats } from './data-source';
import {
  EMPTY_KEYWORD_STATS,
  KEYWORD_SEGMENTS,
  KEYWORD_VIEWS,
  averageClickRate,
  clickRateOf,
  conversionRateOf,
  dailyConversionRateOf,
  filterKeywordRows,
  isKeywordSegment,
  isZeroResultKeyword,
  sumOf,
  totalConversionRate,
  zeroResultCountOf,
} from './types';
import type { KeywordDailyRow, KeywordRow, KeywordSegment } from './types';

const ROUTE = '/stats/keywords';

/** 참조검색어 없음 행의 '검색결과 수' — 0 으로 적으면 '결과가 0개'라는 거짓말이 된다 */
const NOT_APPLICABLE = '—';

function segmentOf(value: string): KeywordSegment {
  return isKeywordSegment(value) ? value : 'all';
}

const keywordCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

/** 결과 없음 검색어는 이 화면에서 유일하게 '지금 손대야 하는' 행이다 — 색이 아니라 문구가 말한다 */
function KeywordCell({ row }: { readonly row: KeywordRow }) {
  return (
    <span style={keywordCellStyle}>
      {row.keyword}
      {isZeroResultKeyword(row) ? <StatusBadge tone="warning" label="결과 없음" /> : null}
    </span>
  );
}

const columns: readonly StatsColumn<KeywordRow>[] = [
  {
    key: 'keyword',
    header: '검색어',
    align: 'left',
    render: (row) => <KeywordCell row={row} />,
    csv: (row) => row.keyword,
    sortValue: (row) => row.keyword,
  },
  {
    key: 'searchCount',
    header: '검색수',
    align: 'right',
    render: (row) => formatNumber(row.searchCount),
    csv: (row) => formatNumber(row.searchCount),
    sortValue: (row) => row.searchCount,
  },
  {
    key: 'resultCount',
    header: '검색결과 수',
    align: 'right',
    // 참조검색어 없음은 검색어를 모르니 '결과 수'가 성립하지 않는다 — 빈 칸이 아니라 '—' 다
    render: (row) => (row.isUnknownReferrer ? NOT_APPLICABLE : formatNumber(row.resultCount)),
    csv: (row) => (row.isUnknownReferrer ? NOT_APPLICABLE : formatNumber(row.resultCount)),
    sortValue: (row) => row.resultCount,
  },
  {
    key: 'clickCount',
    header: '클릭수',
    align: 'right',
    render: (row) => formatNumber(row.clickCount),
    csv: (row) => formatNumber(row.clickCount),
    sortValue: (row) => row.clickCount,
  },
  {
    key: 'clickRate',
    header: '클릭률 (%)',
    align: 'right',
    render: (row) => formatPercentValue(clickRateOf(row)),
    csv: (row) => formatPercentValue(clickRateOf(row)),
    sortValue: (row) => clickRateOf(row),
  },
  {
    key: 'purchaseCount',
    header: '구매건수',
    align: 'right',
    render: (row) => formatNumber(row.purchaseCount),
    csv: (row) => formatNumber(row.purchaseCount),
    sortValue: (row) => row.purchaseCount,
  },
  {
    key: 'conversionRate',
    header: '구매전환율 (%)',
    align: 'right',
    render: (row) => formatPercentValue(conversionRateOf(row)),
    csv: (row) => formatPercentValue(conversionRateOf(row)),
    sortValue: (row) => conversionRateOf(row),
  },
];

/** 추이 차트가 그릴 수 있는 지표 — URL 의 metric 파라미터가 고른다 */
const TREND_METRICS: readonly SegmentOption[] = [
  { id: 'search', label: '검색수' },
  { id: 'zeroResult', label: '검색결과 없음' },
  { id: 'conversion', label: '구매전환율' },
];

export default function KeywordStatsPage() {
  const params = useStatsParams({
    segments: KEYWORD_SEGMENTS,
    views: KEYWORD_VIEWS,
    metrics: TREND_METRICS,
    defaultSort: { key: 'searchCount', direction: 'desc' },
  });
  const exportState = useCsvExport();

  const comparePeriod = comparePeriodOf(params.period, params.compare);
  const segment = segmentOf(params.segment);

  // 조회 조건 전체가 키에 들어간다 — 늦게 온 이전 조건의 응답이 현재를 덮지 못한다 (COMP-10)
  const query = useStatsQuery(
    ['stats', 'keywords', params.period, comparePeriod, params.compare],
    useCallback(
      (signal: AbortSignal) => fetchKeywordStats({ period: params.period, comparePeriod }, signal),
      [params.period, comparePeriod],
    ),
  );

  const stats = query.data ?? EMPTY_KEYWORD_STATS;

  // 세그먼트·검색어를 한 곳에서 건다 — 표·KPI·내보내기가 **같은 집합**을 본다 (ERP-12).
  // 비교 기간에도 같은 조건을 걸어야 '원피스 검색이 지난주 대비 늘었나'가 성립한다.
  const rows = useMemo(
    () => filterKeywordRows(stats.rows, segment, params.keyword),
    [stats.rows, segment, params.keyword],
  );
  const compareRows = useMemo(
    () =>
      stats.compareRows === null
        ? null
        : filterKeywordRows(stats.compareRows, segment, params.keyword),
    [stats.compareRows, segment, params.keyword],
  );

  const kpis = useMemo<readonly StatsKpi[]>(() => {
    const compare = compareRows;
    const searchOf = (list: readonly KeywordRow[]): number => sumOf(list, (row) => row.searchCount);

    return [
      {
        id: 'search',
        label: '총 검색수',
        unit: 'count',
        value: searchOf(rows),
        compareValue: compare === null ? null : searchOf(compare),
        hint: '조회 조건에 걸린 검색어로 유입된 검색 횟수의 합입니다.',
      },
      {
        id: 'unique',
        label: '순 검색어 수',
        unit: 'count',
        value: rows.length,
        compareValue: compare === null ? null : compare.length,
        hint: '중복을 제거한 서로 다른 검색어의 개수입니다.',
      },
      {
        id: 'zeroResult',
        label: '검색결과 없음 검색어',
        unit: 'count',
        // 늘어나면 나쁘다 — 손님이 찾는 것을 우리가 못 받아내고 있다는 뜻이다
        isLowerBetter: true,
        value: zeroResultCountOf(rows),
        compareValue: compare === null ? null : zeroResultCountOf(compare),
        hint: '걸리는 상품이 0개인 검색어입니다. 상품을 추가하거나 동의어를 걸면 줄어듭니다.',
      },
      {
        id: 'clickRate',
        label: '평균 클릭률',
        unit: 'percent',
        value: averageClickRate(rows),
        compareValue: compare === null ? null : averageClickRate(compare),
        hint: '클릭수를 검색수로 나눈 값이며, 검색수로 가중평균합니다.',
      },
      {
        id: 'conversion',
        label: '구매전환율',
        unit: 'percent',
        value: totalConversionRate(rows),
        compareValue: compare === null ? null : totalConversionRate(compare),
        hint: '구매건수를 방문수로 나눈 값입니다.',
      },
    ];
  }, [rows, compareRows]);

  const trends = useMemo<readonly StatsTrend[]>(() => {
    const labels = stats.daily.map((row) => row.label);
    const trendOf = (
      id: string,
      label: string,
      unit: StatsTrend['unit'],
      pick: (row: KeywordDailyRow) => number,
    ): StatsTrend => ({
      id,
      label,
      labels,
      unit,
      current: stats.daily.map(pick),
      compare: stats.compareDaily === null ? null : stats.compareDaily.map(pick),
    });

    return [
      trendOf('search', '검색수', 'count', (row) => row.searchCount),
      trendOf('zeroResult', '검색결과 없음', 'count', (row) => row.zeroResultSearchCount),
      trendOf('conversion', '구매전환율', 'percent', dailyConversionRateOf),
    ];
  }, [stats]);

  return (
    <StatsPageShell
      description="손님이 무엇을 찾아 들어왔는지, 그중 우리 카탈로그가 받아내지 못한 검색어가 무엇인지 봅니다. 결과 없음으로 표시된 검색어는 상품을 추가하거나 동의어를 걸어 지금 메울 수 있는 자리입니다."
      route={ROUTE}
      params={params}
      segments={KEYWORD_SEGMENTS}
      segmentLabel="검색어 유형"
      searchLabel="검색어"
      error={query.error}
      onRetry={query.refetch}
      exportState={exportState}
      exportCount={rows.length}
      onExport={() => {
        exportState.start({ baseName: 'stats-keywords', columns, rows });
      }}
    >
      <StatsKpiRow kpis={kpis} loading={query.isFirstLoad} error={query.error} />

      {/* 제목이 '전체'라고 말하는 이유: 추이는 검색어별로 쪼개지 않은 기간 전체의 집계다.
          검색어를 걸어 표를 좁혀도 이 차트는 가게 전체를 그린다 — 라벨이 그 범위를 정직하게 말한다. */}
      <StatsTrendCard
        title="전체 검색 추이"
        trends={trends}
        activeId={params.metric}
        onActiveChange={params.setMetric}
        period={params.period}
        comparePeriod={comparePeriod}
        loading={query.isFirstLoad}
        error={query.error}
      />

      <Card>
        <CardTitle>검색어 순위</CardTitle>

        <StatsTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          caption="검색어 순위 상세"
          sort={params.sort}
          onToggleSort={params.toggleSort}
          page={params.page}
          pageSize={params.pageSize}
          onPageChange={params.setPage}
          onPageSizeChange={params.setPageSize}
          loading={query.isFirstLoad}
          empty={
            // 3분기 — '검색해서 안 나온 것'과 '필터로 걸러진 것'은 복구 방법이 다르다 (STATE-05)
            <StatsEmpty
              label="검색어"
              hasQuery={params.keyword.trim() !== ''}
              onClearSearch={() => {
                params.setKeyword('');
              }}
              hasActiveFilters={params.hasActiveFilters}
              onResetFilters={params.resetFilters}
            />
          }
        />
      </Card>
    </StatsPageShell>
  );
}
