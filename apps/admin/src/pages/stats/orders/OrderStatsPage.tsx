// 주문 통계 — /stats/orders
//
// [주문 관리(목록)와 무엇이 다른가]
//   주문 관리: 주문 하나를 열어 '이 건을 어떻게 처리하나'를 푼다. 행이 곧 처리 대상이다.
//   여기:      주문이 **어디에 고여 있고**(상태별) · **얼마나 되돌아오나**(취소·반품률) ·
//              그 추세가 지난 기간과 견주어 어떤가를 본다.
// 그래서 이 화면에는 개별 주문으로 내려가는 손잡이가 없다 — 그건 주문 관리의 일이다.
// 여기서 얻는 답은 '이 주문'이 아니라 '배송보류가 왜 이번 주에 두 배인가' 같은 것이다.
import { useCallback, useMemo } from 'react';
import { SegmentedControl } from '@tds/ui';

import { Card, CardTitle } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { ShareBarList } from '../_shared/ShareBarList';
import { StatsKpiRow } from '../_shared/StatsKpiRow';
import { StatsPageShell } from '../_shared/StatsPageShell';
import { StatsTable } from '../_shared/StatsTable';
import { StatsTrendCard } from '../_shared/StatsTrendCard';
import { StatsEmpty } from '../_shared/StatsEmpty';
import { formatPercentValue, shareOf } from '../_shared/format';
import { comparePeriodOf } from '../_shared/period';
import { useCsvExport } from '../_shared/useCsvExport';
import { useStatsQuery } from '../_shared/queries';
import { useStatsParams } from '../_shared/useStatsParams';
import { pgSellable, readPaymentSettings } from '../../../shared/commerce/payment-settings';
import { InquiryStatsPanel } from '../_shared/InquiryStatsPanel';
import type { SegmentOption, ShareItem, StatsColumn, StatsKpi, StatsTrend } from '../_shared/types';
import { fetchOrderStats } from './data-source';
import {
  EMPTY_ORDER_STATS,
  ORDER_BREAKDOWNS,
  ORDER_SEGMENTS,
  ORDER_STATUSES,
  cancelRate,
  isOrderSegment,
  ordersOfSegment,
  rateOf,
  returnRate,
  statusTotal,
  sumOf,
} from './types';
import type { OrderRow, OrderSegment } from './types';

const ROUTE = '/stats/orders';

/**
 * 취소와 반품을 가르는 규칙 — 카페24의 실제 처리 기준이다.
 * KPI 옆에 붙여두지 않으면 '취소한 건데 왜 반품에 잡히나'라는 문의가 매번 반복된다.
 */
const CANCEL_HINT = '배송중 이전에 멈춘 주문이에요. 배송이 시작된 뒤로는 반품으로 잡혀요.';
const RETURN_HINT = '배송중 이후에 되돌아온 주문이에요. 배송 전에 멈추면 취소로 잡혀요.';

function segmentOf(value: string): OrderSegment {
  return isOrderSegment(value) ? value : 'all';
}

/** 세그먼트가 고른 '주문' 지표의 이름 — KPI·차트 라벨이 함께 바뀐다 */
function orderLabelOf(segment: OrderSegment): string {
  if (segment === 'all') return '주문 건수';
  return `${ORDER_SEGMENTS.find((option) => option.id === segment)?.label ?? ''} 건수`;
}

const columns: readonly StatsColumn<OrderRow>[] = [
  {
    key: 'label',
    header: '일자',
    align: 'left',
    render: (row) => row.label,
    csv: (row) => row.label,
    sortValue: (row) => row.id,
  },
  {
    key: 'orders',
    header: '주문 건수',
    align: 'right',
    render: (row) => formatNumber(row.orders),
    csv: (row) => formatNumber(row.orders),
    sortValue: (row) => row.orders,
  },
  {
    key: 'canceled',
    header: '취소',
    align: 'right',
    render: (row) => formatNumber(row.canceled),
    csv: (row) => formatNumber(row.canceled),
    sortValue: (row) => row.canceled,
  },
  {
    key: 'returned',
    header: '반품',
    align: 'right',
    render: (row) => formatNumber(row.returned),
    csv: (row) => formatNumber(row.returned),
    sortValue: (row) => row.returned,
  },
  {
    key: 'exchanged',
    header: '교환',
    align: 'right',
    render: (row) => formatNumber(row.exchanged),
    csv: (row) => formatNumber(row.exchanged),
    sortValue: (row) => row.exchanged,
  },
  {
    key: 'cancelRate',
    header: '취소율 (%)',
    align: 'right',
    render: (row) => formatPercentValue(rateOf(row.canceled, row.orders)),
    csv: (row) => formatPercentValue(rateOf(row.canceled, row.orders)),
    sortValue: (row) => rateOf(row.canceled, row.orders),
  },
  {
    key: 'returnRate',
    header: '반품률 (%)',
    align: 'right',
    render: (row) => formatPercentValue(rateOf(row.returned, row.orders)),
    csv: (row) => formatPercentValue(rateOf(row.returned, row.orders)),
    sortValue: (row) => rateOf(row.returned, row.orders),
  },
];

/** 추이 차트가 그릴 수 있는 지표 — URL 의 metric 파라미터가 고른다 */
const TREND_METRICS: readonly SegmentOption[] = [
  { id: 'orders', label: '주문' },
  { id: 'canceled', label: '취소' },
  { id: 'returned', label: '반품' },
];

export default function OrderStatsPage() {
  const params = useStatsParams({
    segments: ORDER_SEGMENTS,
    views: ORDER_BREAKDOWNS,
    metrics: TREND_METRICS,
    defaultSort: { key: 'label', direction: 'desc' },
  });
  const exportState = useCsvExport();

  const comparePeriod = comparePeriodOf(params.period, params.compare);
  const segment = segmentOf(params.segment);
  const isStatusView = params.view === 'status';

  // 조회 조건 전체가 키에 들어간다 — 늦게 온 이전 조건의 응답이 현재를 덮지 못한다 (COMP-10)
  const query = useStatsQuery(
    ['stats', 'orders', params.period, comparePeriod, params.compare],
    useCallback(
      (signal: AbortSignal) => fetchOrderStats({ period: params.period, comparePeriod }, signal),
      [params.period, comparePeriod],
    ),
  );

  const stats = query.data ?? EMPTY_ORDER_STATS;

  const kpis = useMemo<readonly StatsKpi[]>(() => {
    const daily = stats.daily;
    const compare = stats.compareDaily;
    const pick = (rows: readonly OrderRow[]): number =>
      sumOf(rows, (row) => ordersOfSegment(row, segment));

    return [
      {
        id: 'orders',
        label: orderLabelOf(segment),
        unit: 'count',
        value: pick(daily),
        compareValue: compare === null ? null : pick(compare),
        hint: '선택한 기간에 접수된 주문 건수예요.',
      },
      {
        id: 'canceled',
        label: '취소 건수',
        unit: 'count',
        value: sumOf(daily, (row) => row.canceled),
        compareValue: compare === null ? null : sumOf(compare, (row) => row.canceled),
        // 취소가 늘어난 것을 초록으로 칠하지 않는다
        isLowerBetter: true,
        hint: CANCEL_HINT,
      },
      {
        id: 'returned',
        label: '반품 건수',
        unit: 'count',
        value: sumOf(daily, (row) => row.returned),
        compareValue: compare === null ? null : sumOf(compare, (row) => row.returned),
        isLowerBetter: true,
        hint: RETURN_HINT,
      },
      {
        id: 'cancelRate',
        label: '취소율',
        unit: 'percent',
        value: cancelRate(daily),
        compareValue: compare === null ? null : cancelRate(compare),
        isLowerBetter: true,
        hint: '취소 건수 ÷ 주문 건수. 배송중 이전에 멈춘 주문만 포함해요.',
      },
      {
        id: 'returnRate',
        label: '반품률',
        unit: 'percent',
        value: returnRate(daily),
        compareValue: compare === null ? null : returnRate(compare),
        isLowerBetter: true,
        hint: '반품 건수 ÷ 주문 건수. 배송이 시작된 뒤 되돌아온 주문만 포함해요.',
      },
    ];
  }, [stats, segment]);

  const trends = useMemo<readonly StatsTrend[]>(() => {
    const labels = stats.daily.map((row) => row.label);
    const trendOf = (id: string, label: string, pick: (row: OrderRow) => number): StatsTrend => ({
      id,
      label,
      labels,
      unit: 'count',
      current: stats.daily.map(pick),
      compare: stats.compareDaily === null ? null : stats.compareDaily.map(pick),
    });

    return [
      trendOf('orders', orderLabelOf(segment), (row) => ordersOfSegment(row, segment)),
      trendOf('canceled', '취소', (row) => row.canceled),
      trendOf('returned', '반품', (row) => row.returned),
    ];
  }, [stats, segment]);

  // 상태별은 기간 전체를 상태로 합친 것이다 — 일자별 원천에서 낸다 (같은 값의 두 번째 원천을 두지 않는다)
  const statusItems = useMemo<readonly ShareItem[]>(
    () =>
      ORDER_STATUSES.map((status) => ({
        id: status.id,
        label: status.label,
        value: statusTotal(stats.daily, status.id),
        compareValue:
          stats.compareDaily === null ? null : statusTotal(stats.compareDaily, status.id),
      })),
    [stats],
  );

  // 내보내기도 화면과 같은 원천을 쓴다 — 막대에 보이는 값이 그대로 엑셀에 담긴다 (ERP-12)
  const statusColumns = useMemo<readonly StatsColumn<ShareItem>[]>(() => {
    const total = statusItems.reduce((sum, item) => sum + item.value, 0);
    return [
      {
        key: 'label',
        header: '상태',
        align: 'left',
        render: (item) => item.label,
        csv: (item) => item.label,
      },
      {
        key: 'value',
        header: '건수',
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
  }, [statusItems]);

  const viewLabel = ORDER_BREAKDOWNS.find((item) => item.id === params.view)?.label ?? '일자별';

  /* [매출 0 을 그리지 않는다] 결제를 쓰지 않으면 이 화면의 모든 숫자가 구조적으로 0 이다 —
     운영자는 그것을 장애로 읽는다. 그래서 화면을 통째로 문의·견적 지표로 갈아 끼운다.
     조회 훅은 위에서 이미 다 돌았다(훅 순서 불변) — 여기서는 무엇을 그릴지만 고른다. */
  if (!pgSellable(readPaymentSettings())) {
    return <InquiryStatsPanel replacedLabel="주문 통계" />;
  }

  return (
    <StatsPageShell
      description="주문이 어느 상태에 고여 있는지, 얼마나 취소·반품으로 되돌아오는지 보는 화면이에요. 개별 주문의 처리는 주문 관리에서 하고, 여기서는 '지난 기간과 견주어 무엇이 달라졌는지'를 봐요."
      route={ROUTE}
      params={params}
      segments={ORDER_SEGMENTS}
      segmentLabel="주문 상태"
      error={query.error}
      onRetry={query.refetch}
      exportState={exportState}
      exportCount={isStatusView ? statusItems.length : stats.daily.length}
      onExport={() => {
        if (isStatusView) {
          exportState.start({
            baseName: 'stats-orders-status',
            columns: statusColumns,
            rows: statusItems,
          });
          return;
        }
        exportState.start({ baseName: 'stats-orders-daily', columns, rows: stats.daily });
      }}
    >
      <StatsKpiRow kpis={kpis} loading={query.isFirstLoad} error={query.error} />

      <StatsTrendCard
        title="주문 추이"
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
              options={ORDER_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
              size="sm"
              ariaLabel="드릴다운 축"
              disabled={query.isFirstLoad}
              onChange={params.setView}
            />
          }
        >
          {viewLabel} 상세
        </CardTitle>

        {isStatusView ? (
          /* 상태별은 표가 아니라 구성비 막대다 — '배송준비중이 몇 건인가'보다
             '전체 중 얼마가 배송준비중에 고여 있나'가 물음이라 길이로 읽힌다 */
          <ShareBarList
            items={statusItems}
            unit="count"
            loading={query.isFirstLoad}
            skeletonCount={ORDER_STATUSES.length}
            empty={
              <StatsEmpty
                label="주문"
                hasActiveFilters={params.hasActiveFilters}
                onResetFilters={params.resetFilters}
              />
            }
          />
        ) : (
          <StatsTable
            rows={stats.daily}
            columns={columns}
            rowKey={(row) => row.id}
            caption="일자별 주문 상세"
            sort={params.sort}
            onToggleSort={params.toggleSort}
            page={params.page}
            pageSize={params.pageSize}
            onPageChange={params.setPage}
            onPageSizeChange={params.setPageSize}
            loading={query.isFirstLoad}
            empty={
              <StatsEmpty
                label="주문 기록"
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
