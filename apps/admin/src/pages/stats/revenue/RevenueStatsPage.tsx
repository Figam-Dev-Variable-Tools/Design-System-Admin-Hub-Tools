// 매출 통계 — /stats/revenue (A40 소유)
//
// [대시보드의 매출 카드와 무엇이 다른가]
//   대시보드: '오늘 얼마 팔렸나' 한 숫자.
//   여기:     결제합계·환불합계·순매출을 갈라 세우고 · 비교 기간과 겹쳐 보고 · 결제수단으로
//             나누고 · 과세/면세/영세까지 내려가 · 조건 전체를 엑셀로 내린다.
// 한 숫자로 '매출'을 말하면 환불이 얼마였는지 영영 보이지 않는다. 이 화면의 존재 이유가 그것이다.
//
// [ERP-07 — 금액 칸에 '원'을 붙이지 않는다] 우측 정렬 금액에 단위를 붙이면 단위가 마지막
// 자릿수를 따라다녀 tabular-nums 세로 정렬이 깨진다. 단위는 컬럼 헤더가 이름표로 갖고
// (withUnitSuffix), 칸은 formatWonValue 로 숫자만 담는다.
import { useCallback, useMemo } from 'react';
import { SegmentedControl } from '@tds/ui';

import { Alert, Card, CardTitle } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { StatsKpiRow } from '../_shared/StatsKpiRow';
import { StatsPageShell } from '../_shared/StatsPageShell';
import { StatsTable } from '../_shared/StatsTable';
import { StatsTrendCard } from '../_shared/StatsTrendCard';
import { StatsEmpty } from '../_shared/StatsEmpty';
import { formatWonValue, withUnitSuffix } from '../_shared/format';
import { comparePeriodOf } from '../_shared/period';
import { useCsvExport } from '../_shared/useCsvExport';
import { useStatsQuery } from '../_shared/queries';
import { useStatsParams } from '../_shared/useStatsParams';
import type { SegmentOption, StatsColumn, StatsKpi, StatsTrend } from '../_shared/types';
import { fetchRevenueStats } from './data-source';
import {
  EMPTY_REVENUE_STATS,
  PAY_METHODS,
  REVENUE_BREAKDOWNS,
  aovOf,
  averageOrderValue,
  isPayMethod,
  sumOf,
} from './types';
import type { PayMethod, RevenueRow } from './types';

const ROUTE = '/stats/revenue';

/**
 * [부가세 고지 — 카페24 매출 통계의 관례를 따른다]
 * 쇼핑몰 통계의 금액은 결제 시점의 집계라서 세무 신고가 요구하는 귀속·공급가액 기준과 다르다.
 * 고지 없이 '매출'만 크게 띄우면 이 숫자를 그대로 신고에 옮겨 적는 사고가 난다. 그래서 토스트가
 * 아니라 화면에 상주하는 안내다 — 사라지는 안내는 안내가 아니다.
 */
const VAT_NOTICE = (
  <Alert tone="info">
    순매출은 결제합계에서 환불합계를 뺀 금액이며, 부가세가 포함된 금액입니다. 과세 상품의 결제
    금액에는 부가세가 붙고, 면세(도서·농축수산물 등)와 영세율(수출 등) 상품에는 붙지 않습니다. 이
    통계는 쇼핑몰 운영 참고용이며, 국세청 신고 등 제출용 자료로는 사용하실 수 없습니다.
  </Alert>
);

function methodOf(value: string): PayMethod {
  return isPayMethod(value) ? value : 'all';
}

/** 일자별·결제수단별이 공유하는 금액 칸 — 두 표가 같은 정의를 쓴다는 것이 컬럼으로 보장된다 */
const MONEY_COLUMNS: readonly StatsColumn<RevenueRow>[] = [
  {
    key: 'paymentTotal',
    header: withUnitSuffix('결제합계', 'won'),
    align: 'right',
    render: (row) => formatWonValue(row.paymentTotal),
    csv: (row) => formatWonValue(row.paymentTotal),
    sortValue: (row) => row.paymentTotal,
  },
  {
    key: 'refundTotal',
    header: withUnitSuffix('환불합계', 'won'),
    align: 'right',
    render: (row) => formatWonValue(row.refundTotal),
    csv: (row) => formatWonValue(row.refundTotal),
    sortValue: (row) => row.refundTotal,
  },
  {
    key: 'netRevenue',
    header: withUnitSuffix('순매출', 'won'),
    align: 'right',
    render: (row) => formatWonValue(row.netRevenue),
    csv: (row) => formatWonValue(row.netRevenue),
    sortValue: (row) => row.netRevenue,
  },
  {
    // 건수는 단위 없이 읽어도 오해가 없다 — '결제건수 (건)'는 이름표가 두 번 붙은 꼴이다
    key: 'orderCount',
    header: '결제건수',
    align: 'right',
    render: (row) => formatNumber(row.orderCount),
    csv: (row) => formatNumber(row.orderCount),
    sortValue: (row) => row.orderCount,
  },
  {
    key: 'aov',
    header: withUnitSuffix('객단가', 'won'),
    align: 'right',
    render: (row) => formatWonValue(aovOf(row.netRevenue, row.orderCount)),
    csv: (row) => formatWonValue(aovOf(row.netRevenue, row.orderCount)),
    sortValue: (row) => aovOf(row.netRevenue, row.orderCount),
  },
];

/** 과세 구분 — 셋의 합이 순매출과 같다. 일자별에서만 편다(수단별로는 세 구분이 갈리지 않는다) */
const TAX_COLUMNS: readonly StatsColumn<RevenueRow>[] = [
  {
    key: 'taxable',
    header: withUnitSuffix('과세', 'won'),
    align: 'right',
    render: (row) => formatWonValue(row.taxable),
    csv: (row) => formatWonValue(row.taxable),
    sortValue: (row) => row.taxable,
  },
  {
    key: 'taxFree',
    header: withUnitSuffix('면세', 'won'),
    align: 'right',
    render: (row) => formatWonValue(row.taxFree),
    csv: (row) => formatWonValue(row.taxFree),
    sortValue: (row) => row.taxFree,
  },
  {
    key: 'zeroRated',
    header: withUnitSuffix('영세', 'won'),
    align: 'right',
    render: (row) => formatWonValue(row.zeroRated),
    csv: (row) => formatWonValue(row.zeroRated),
    sortValue: (row) => row.zeroRated,
  },
];

const dailyColumns: readonly StatsColumn<RevenueRow>[] = [
  {
    key: 'label',
    header: '일자',
    align: 'left',
    render: (row) => row.label,
    csv: (row) => row.label,
    sortValue: (row) => row.id,
  },
  ...MONEY_COLUMNS,
  ...TAX_COLUMNS,
];

const methodColumns: readonly StatsColumn<RevenueRow>[] = [
  {
    // 정렬 값을 주지 않는다 — 네 줄뿐이라 정렬할 것이 없고, 비중이 큰 순서(신용카드→간편결제→
    // 계좌이체→가상계좌)가 곧 관리자가 기대하는 순서다. 금액으로 줄 세우려면 금액 칸을 누른다.
    key: 'label',
    header: '결제수단',
    align: 'left',
    render: (row) => row.label,
    csv: (row) => row.label,
  },
  ...MONEY_COLUMNS,
];

/** 추이 차트가 그릴 수 있는 지표 — URL 의 metric 파라미터가 고른다 */
const TREND_METRICS: readonly SegmentOption[] = [
  { id: 'net', label: '순매출' },
  { id: 'payment', label: '결제합계' },
  { id: 'refund', label: '환불합계' },
  { id: 'orders', label: '결제건수' },
  { id: 'aov', label: '객단가' },
];

export default function RevenueStatsPage() {
  const params = useStatsParams({
    segments: PAY_METHODS,
    views: REVENUE_BREAKDOWNS,
    metrics: TREND_METRICS,
    defaultSort: { key: 'label', direction: 'desc' },
  });
  const exportState = useCsvExport();

  const comparePeriod = comparePeriodOf(params.period, params.compare);
  const method = methodOf(params.segment);

  // 조회 조건 전체가 키에 들어간다 — 늦게 온 이전 조건의 응답이 현재를 덮지 못한다 (COMP-10)
  const query = useStatsQuery(
    ['stats', 'revenue', params.period, comparePeriod, params.compare],
    useCallback(
      (signal: AbortSignal) => fetchRevenueStats({ period: params.period, comparePeriod }, signal),
      [params.period, comparePeriod],
    ),
  );

  const stats = query.data ?? EMPTY_REVENUE_STATS;
  const daily = stats.daily[method];

  // 결제수단은 화면 전체를 좁힌다 — KPI·추이·표가 모두 고른 수단의 값이다
  const kpis = useMemo<readonly StatsKpi[]>(() => {
    const compare = stats.compareDaily === null ? null : stats.compareDaily[method];
    const pick =
      (take: (row: RevenueRow) => number) =>
      (source: readonly RevenueRow[]): number =>
        sumOf(source, take);
    const payment = pick((row) => row.paymentTotal);
    const refund = pick((row) => row.refundTotal);
    const net = pick((row) => row.netRevenue);
    const orders = pick((row) => row.orderCount);

    return [
      {
        id: 'payment',
        label: '결제합계',
        unit: 'won',
        value: payment(daily),
        compareValue: compare === null ? null : payment(compare),
        hint: '기간 안에 결제가 완료된 금액의 합입니다.',
      },
      {
        id: 'refund',
        label: '환불합계',
        unit: 'won',
        value: refund(daily),
        compareValue: compare === null ? null : refund(compare),
        // 환불이 늘어난 것을 초록으로 칠하지 않는다
        isLowerBetter: true,
        hint: '기간 안에 환불 처리된 금액의 합입니다.',
      },
      {
        id: 'net',
        label: '순매출',
        unit: 'won',
        value: net(daily),
        compareValue: compare === null ? null : net(compare),
        hint: '결제합계에서 환불합계를 뺀 금액입니다.',
      },
      {
        id: 'orders',
        label: '결제건수',
        unit: 'count',
        value: orders(daily),
        compareValue: compare === null ? null : orders(compare),
        hint: '결제가 완료된 주문 건수입니다.',
      },
      {
        id: 'aov',
        label: '객단가',
        unit: 'won',
        value: averageOrderValue(daily),
        compareValue: compare === null ? null : averageOrderValue(compare),
        hint: '순매출을 결제건수로 나눈 값입니다.',
      },
    ];
  }, [stats, method, daily]);

  const trends = useMemo<readonly StatsTrend[]>(() => {
    const compare = stats.compareDaily === null ? null : stats.compareDaily[method];
    const labels = daily.map((row) => row.label);
    const trendOf = (
      id: string,
      label: string,
      unit: StatsTrend['unit'],
      pick: (row: RevenueRow) => number,
    ): StatsTrend => ({
      id,
      label,
      labels,
      unit,
      current: daily.map(pick),
      compare: compare === null ? null : compare.map(pick),
    });

    return [
      trendOf('net', '순매출', 'won', (row) => row.netRevenue),
      trendOf('payment', '결제합계', 'won', (row) => row.paymentTotal),
      trendOf('refund', '환불합계', 'won', (row) => row.refundTotal),
      trendOf('orders', '결제건수', 'count', (row) => row.orderCount),
      trendOf('aov', '객단가', 'won', (row) => aovOf(row.netRevenue, row.orderCount)),
    ];
  }, [stats, method, daily]);

  // 결제수단을 하나로 좁힌 채 결제수단별을 보면 그 한 줄만 남는다 — 조회 조건과 표가 서로
  // 다른 말을 하지 않게 한다('간편결제만 보는 중'인데 표에 신용카드가 있으면 안 된다)
  const methodRows = useMemo<readonly RevenueRow[]>(
    () => (method === 'all' ? stats.byMethod : stats.byMethod.filter((row) => row.id === method)),
    [stats.byMethod, method],
  );

  // 드릴다운 축 — 일자별에서 결제수단별로 파고든다
  const isMethodView = params.view === 'method';
  const rows = isMethodView ? methodRows : daily;
  const columns = isMethodView ? methodColumns : dailyColumns;
  const viewLabel = REVENUE_BREAKDOWNS.find((item) => item.id === params.view)?.label ?? '일자별';

  return (
    <StatsPageShell
      description="결제수단별로 결제·환불·순매출을 갈라 보고, 비교 기간과 견주는 매출 분석입니다. 순매출은 결제합계에서 환불합계를 뺀 금액이라, 결제합계만 세는 화면과는 다른 숫자를 냅니다."
      route={ROUTE}
      params={params}
      segments={PAY_METHODS}
      segmentLabel="결제수단"
      notice={VAT_NOTICE}
      error={query.error}
      onRetry={query.refetch}
      exportState={exportState}
      exportCount={rows.length}
      onExport={() => {
        exportState.start({ baseName: `stats-revenue-${params.view}`, columns, rows });
      }}
    >
      <StatsKpiRow kpis={kpis} loading={query.isFirstLoad} error={query.error} />

      <StatsTrendCard
        title="매출 추이"
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
              options={REVENUE_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
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
          caption={`${viewLabel} 매출 상세`}
          sort={params.sort}
          onToggleSort={params.toggleSort}
          page={params.page}
          pageSize={params.pageSize}
          onPageChange={params.setPage}
          onPageSizeChange={params.setPageSize}
          loading={query.isFirstLoad}
          empty={
            <StatsEmpty
              label="매출 기록"
              hasActiveFilters={params.hasActiveFilters}
              onResetFilters={params.resetFilters}
            />
          }
        />
      </Card>
    </StatsPageShell>
  );
}
