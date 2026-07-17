// 주문 통계 조회 — 픽스처
//
// [백엔드 0] 지금은 결정론적 픽스처다. 백엔드가 붙으면 buildStats 안쪽만 fetch 로 바꾼다 —
// 지연·실패·빈 상태의 재현 경로(_shared/mock.ts)와 화면은 그대로다.
//
// TODO(backend): GET /api/stats/orders?start&end&status
// TODO(backend): GET /api/stats/orders/status?start&end
import { eachDay, formatDayLabel } from '../_shared/period';
import type { StatsPeriod } from '../_shared/period';
import { loadStats, seededRandom, seededSeries } from '../_shared/mock';
import { EMPTY_ORDER_STATS } from './types';
import type { OrderRow, OrderStats, OrderStatus } from './types';

const SCOPE = 'stats-orders';

/**
 * 상태 분포의 기준 비중 — 합이 1 이다.
 * 뒤쪽(배송완료·구매확정)에 쌓이고 앞쪽(입금전·배송보류)은 얇다. 실제 쇼핑몰의 모양이다 —
 * 평평하게 두면 '상태별' 화면이 어디에 주문이 고였는지 말해주지 못한다.
 */
const STATUS_WEIGHTS: Readonly<Record<OrderStatus, number>> = {
  pending: 0.08,
  preparing: 0.14,
  holding: 0.03,
  waiting: 0.1,
  shipping: 0.15,
  delivered: 0.25,
  confirmed: 0.25,
};

/**
 * 주문 건수를 상태별로 쪼갠다.
 * 마지막 상태(구매확정)가 나머지를 흡수한다 — 반올림 오차를 그냥 두면 상태 합이 주문 건수와
 * 어긋나 표의 '주문 건수'와 구성비 막대가 서로 다른 말을 한다.
 */
function statusCountsOf(orders: number, seed: string): Readonly<Record<OrderStatus, number>> {
  const random = seededRandom(seed);
  // 비중에 ±20% 흔들림 — 날마다 같은 비율이면 '상태별'이 날짜와 무관해 보인다
  const share = (weight: number): number => Math.round(orders * weight * (0.8 + random() * 0.4));

  const pending = share(STATUS_WEIGHTS.pending);
  const preparing = share(STATUS_WEIGHTS.preparing);
  const holding = share(STATUS_WEIGHTS.holding);
  const waiting = share(STATUS_WEIGHTS.waiting);
  const shipping = share(STATUS_WEIGHTS.shipping);
  const delivered = share(STATUS_WEIGHTS.delivered);
  const confirmed = Math.max(
    0,
    orders - pending - preparing - holding - waiting - shipping - delivered,
  );

  return { pending, preparing, holding, waiting, shipping, delivered, confirmed };
}

function rowOf(id: string, label: string, orders: number, seed: string): OrderRow {
  const random = seededRandom(`o:${seed}`);
  // 취소 3~6% · 반품 1~3% · 교환 0.5~2% — 국내 커머스의 현실적인 대역.
  // 반품이 취소보다 얇은 것은 배송이 떠난 뒤에야 반품이 되기 때문이다.
  return {
    id,
    label,
    orders,
    canceled: Math.round(orders * (0.03 + random() * 0.03)),
    returned: Math.round(orders * (0.01 + random() * 0.02)),
    exchanged: Math.round(orders * (0.005 + random() * 0.015)),
    statusCounts: statusCountsOf(orders, `s:${seed}`),
  };
}

function dailyRowsOf(period: StatsPeriod): readonly OrderRow[] {
  const days = eachDay(period);
  const orders = seededSeries(SCOPE, days, 180, 90);
  return days.map((day, index) => rowOf(day, formatDayLabel(day), orders[index] ?? 0, day));
}

/** 호출부는 객체 리터럴로 넘긴다 — 공개 표면을 넓히지 않으려고 export 하지 않는다 */
interface OrderQuery {
  readonly period: StatsPeriod;
  readonly comparePeriod: StatsPeriod | null;
}

export function fetchOrderStats(query: OrderQuery, signal: AbortSignal): Promise<OrderStats> {
  return loadStats<OrderStats>(
    SCOPE,
    signal,
    () => ({
      daily: dailyRowsOf(query.period),
      compareDaily: query.comparePeriod === null ? null : dailyRowsOf(query.comparePeriod),
    }),
    () => EMPTY_ORDER_STATS,
  );
}
