// 매출 통계 조회 — 픽스처
//
// [백엔드 0] 지금은 결정론적 픽스처다. 백엔드가 붙으면 build 안쪽만 fetch 로 바꾼다 —
// 지연·실패·빈 상태의 재현 경로(_shared/mock.ts)와 화면은 그대로다.
//
// [금액은 한 곳에서만 조립한다] 순매출·과세 구분을 만드는 곳은 rowOf 하나뿐이다. 일자별과
// 결제수단별이 각자 계산하면 '순매출 = 결제합계 − 환불합계'가 한쪽에서만 깨져도 화면은
// 멀쩡해 보인다 — 두 표의 합계가 어긋나서야 발견된다.
//
// TODO(backend): GET /api/stats/revenue?start&end&method
// TODO(backend): GET /api/stats/revenue/methods?start&end
import { eachDay, formatDayLabel } from '../_shared/period';
import type { StatsPeriod } from '../_shared/period';
import { loadStats, seededRandom, seededSeries } from '../_shared/mock';
import { EMPTY_REVENUE_STATS, payMethodLabel, sumOf } from './types';
import type { RevenueByMethod, RevenuePayMethod, RevenueRow, RevenueStats } from './types';

const SCOPE = 'stats-revenue';

/** 결제수단별 비중 — 간편결제가 신용카드를 빠르게 따라잡는 국내 결제 현실 (합 1.00) */
const METHOD_WEIGHTS: Readonly<Record<RevenuePayMethod, number>> = {
  card: 0.41,
  easy: 0.34,
  transfer: 0.14,
  vbank: 0.11,
};

/** 결제수단별 표의 행 순서 — 비중이 큰 순서다 */
const REVENUE_METHODS: readonly RevenuePayMethod[] = ['card', 'easy', 'transfer', 'vbank'];

/** 하루 결제건수의 기준값·진폭 — 수단별 비중을 곱해 나눈다 */
const DAILY_ORDERS = 260;
const DAILY_ORDERS_VARIANCE = 120;

/** 주문 1건의 결제금액 대역(원) — 패션·잡화 쇼핑몰의 현실적인 객단가 */
const ORDER_VALUE_BASE = 42000;
const ORDER_VALUE_SPREAD = 26000;

/** 면세·영세 비중 — 대부분의 상품은 과세다. 영세(수출)는 아주 얇다 */
const TAX_FREE_SHARE = 0.12;
const ZERO_RATED_SHARE = 0.03;

/**
 * 한 행 — 순매출과 과세 구분을 만드는 유일한 자리.
 * 순매출 = 결제합계 − 환불합계 (카페24 정의) · 과세 + 면세 + 영세 = 순매출
 */
function rowOf(
  id: string,
  label: string,
  paymentTotal: number,
  refundTotal: number,
  orderCount: number,
): RevenueRow {
  const netRevenue = paymentTotal - refundTotal;
  const taxFree = Math.round(netRevenue * TAX_FREE_SHARE);
  const zeroRated = Math.round(netRevenue * ZERO_RATED_SHARE);
  // 과세는 나머지 전부다 — 반올림 오차를 여기서 흡수해 셋의 합이 순매출과 정확히 맞는다.
  // 셋을 따로 반올림하면 표의 과세+면세+영세가 순매출과 몇 원씩 어긋난다.
  const taxable = netRevenue - taxFree - zeroRated;
  return {
    id,
    label,
    paymentTotal,
    refundTotal,
    netRevenue,
    orderCount,
    taxable,
    taxFree,
    zeroRated,
  };
}

function methodRowsOf(period: StatsPeriod, method: RevenuePayMethod): readonly RevenueRow[] {
  const days = eachDay(period);
  const weight = METHOD_WEIGHTS[method];
  const orders = seededSeries(
    `${SCOPE}:${method}`,
    days,
    DAILY_ORDERS * weight,
    DAILY_ORDERS_VARIANCE * weight,
  );

  return days.map((day, index) => {
    const random = seededRandom(`${SCOPE}:pay:${method}:${day}`);
    const orderCount = orders[index] ?? 0;
    const paymentTotal = Math.round(
      orderCount * (ORDER_VALUE_BASE + random() * ORDER_VALUE_SPREAD),
    );
    // 환불은 결제의 3~11% 대역 — 반품이 잦은 패션 카테고리의 현실적인 폭이다
    const refundTotal = Math.round(paymentTotal * (0.03 + random() * 0.08));
    return rowOf(day, formatDayLabel(day), paymentTotal, refundTotal, orderCount);
  });
}

/** 'all' 은 네 수단의 합이다 — 따로 만들면 합계와 수단별 값이 어긋나 관리자가 둘 다 못 믿는다 */
function totalRowsOf(
  period: StatsPeriod,
  methods: readonly (readonly RevenueRow[])[],
): readonly RevenueRow[] {
  return eachDay(period).map((day, index) => {
    const pick = (take: (row: RevenueRow) => number): number =>
      methods.reduce((sum, rows) => {
        const row = rows[index];
        return sum + (row === undefined ? 0 : take(row));
      }, 0);

    return rowOf(
      day,
      formatDayLabel(day),
      pick((row) => row.paymentTotal),
      pick((row) => row.refundTotal),
      pick((row) => row.orderCount),
    );
  });
}

function dailyOf(period: StatsPeriod): RevenueByMethod {
  const card = methodRowsOf(period, 'card');
  const easy = methodRowsOf(period, 'easy');
  const transfer = methodRowsOf(period, 'transfer');
  const vbank = methodRowsOf(period, 'vbank');
  return { all: totalRowsOf(period, [card, easy, transfer, vbank]), card, easy, transfer, vbank };
}

/** 결제수단별 한 줄 — 기간 전체의 합계다. 일자별과 같은 원천에서 접어 만든다 */
function methodTotalsOf(daily: RevenueByMethod): readonly RevenueRow[] {
  return REVENUE_METHODS.map((method) => {
    const rows = daily[method];
    return rowOf(
      method,
      payMethodLabel(method),
      sumOf(rows, (row) => row.paymentTotal),
      sumOf(rows, (row) => row.refundTotal),
      sumOf(rows, (row) => row.orderCount),
    );
  });
}

interface RevenueQuery {
  readonly period: StatsPeriod;
  readonly comparePeriod: StatsPeriod | null;
}

export function fetchRevenueStats(query: RevenueQuery, signal: AbortSignal): Promise<RevenueStats> {
  return loadStats<RevenueStats>(
    SCOPE,
    signal,
    () => {
      const daily = dailyOf(query.period);
      return {
        daily,
        compareDaily: query.comparePeriod === null ? null : dailyOf(query.comparePeriod),
        byMethod: methodTotalsOf(daily),
      };
    },
    () => EMPTY_REVENUE_STATS,
  );
}
