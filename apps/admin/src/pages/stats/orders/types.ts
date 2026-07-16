// 주문 통계 도메인 타입 (A40 소유)
//
// [상태 어휘는 카페24의 실제 주문 상태를 그대로 쓴다]
//   입금전 · 배송준비중 · 배송보류 · 배송대기 · 배송중 · 배송완료 · 구매확정
// '입금대기'·'결제완료'는 카페24에 없는 말이라 쓰지 않는다. 운영자는 카페24 관리자에서 보던 상태를
// 여기서도 같은 이름으로 찾는다 — 이름을 하나라도 고치면 같은 주문이 두 이름을 갖는다.
//
// [취소·교환·반품은 주문 상태가 아니다]
// 카페24에서 이 셋은 상태 값이 아니라 **별도의 CS 흐름**이다. 같은 목록에 끼워 넣으면
// '배송중이면서 취소 접수된' 주문을 셀 자리가 사라진다 — 한 주문이 상태 하나만 갖는다는 전제가
// 깨지기 때문이다. 그래서 상태와 나란히 두지 않고 각자의 건수로 센다.
//
// [취소와 반품을 가르는 것은 '배송중' 시점이다 — 카페24의 처리 기준]
//   배송중 이전에 멈추면  → 주문취소
//   배송중 이후에 돌아오면 → 반품
// 같은 '주문을 물렀다'라도 배송이 떠났는지에 따라 이름도 처리도 갈린다.
import type { SegmentOption } from '../_shared/types';

/** 카페24의 주문 상태 — 입금 전부터 구매확정까지 한 방향으로 흐른다 */
export type OrderStatus =
  'pending' | 'preparing' | 'holding' | 'waiting' | 'shipping' | 'delivered' | 'confirmed';

interface OrderStatusDef {
  readonly id: OrderStatus;
  readonly label: string;
}

/** 표시 순서 = 주문이 실제로 흘러가는 순서다 — 운영자가 흐름대로 읽는다 */
export const ORDER_STATUSES: readonly OrderStatusDef[] = [
  { id: 'pending', label: '입금전' },
  { id: 'preparing', label: '배송준비중' },
  { id: 'holding', label: '배송보류' },
  { id: 'waiting', label: '배송대기' },
  { id: 'shipping', label: '배송중' },
  { id: 'delivered', label: '배송완료' },
  { id: 'confirmed', label: '구매확정' },
];

/** 주문 상태 세그먼트 — 전체 + 상태 7종 */
export type OrderSegment = 'all' | OrderStatus;

export const ORDER_SEGMENTS: readonly SegmentOption[] = [
  { id: 'all', label: '전체' },
  ...ORDER_STATUSES,
];

export function isOrderSegment(value: unknown): value is OrderSegment {
  return typeof value === 'string' && ORDER_SEGMENTS.some((option) => option.id === value);
}

/** 드릴다운 축 — 일자별로 추이를 보고, 상태별로 어디에 주문이 고여 있는지 본다 */
export const ORDER_BREAKDOWNS: readonly SegmentOption[] = [
  { id: 'daily', label: '일자별' },
  { id: 'status', label: '상태별' },
];

/** 하루치 주문 지표 */
export interface OrderRow {
  /** 구간 식별자 — 일자('2026-07-16') */
  readonly id: string;
  /** 표에 보이는 이름 — '2026.07.16' */
  readonly label: string;
  /** 그날 들어온 주문 건수 — 상태별 분포의 합과 같다 */
  readonly orders: number;
  /** 배송중 이전에 멈춘 건수 */
  readonly canceled: number;
  /** 배송중 이후에 되돌아온 건수 */
  readonly returned: number;
  readonly exchanged: number;
  /** 상태별 분포 — 합이 orders 와 같아야 구성비 합계가 100% 가 된다 */
  readonly statusCounts: Readonly<Record<OrderStatus, number>>;
}

export interface OrderStats {
  /** 일자별 — 추이 차트와 기본 표의 원천. 상태별은 여기서 합쳐 낸다 */
  readonly daily: readonly OrderRow[];
  /** 비교 기간의 일자별. 비교 안 함이면 null */
  readonly compareDaily: readonly OrderRow[] | null;
}

export const EMPTY_ORDER_STATS: OrderStats = {
  daily: [],
  compareDaily: null,
};

export function sumOf(rows: readonly OrderRow[], pick: (row: OrderRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

/** 비율(%) — 분모가 0 이면 나눌 수 없어 0 이다 (0으로 나누지 않는다) */
export function rateOf(part: number, total: number): number {
  return total === 0 ? 0 : (part / total) * 100;
}

/** 세그먼트가 고른 주문 건수 — 전체이거나 특정 상태의 건수 */
export function ordersOfSegment(row: OrderRow, segment: OrderSegment): number {
  return segment === 'all' ? row.orders : row.statusCounts[segment];
}

/** 한 상태의 기간 합계 — 구성비 막대의 원천 */
export function statusTotal(rows: readonly OrderRow[], status: OrderStatus): number {
  return sumOf(rows, (row) => row.statusCounts[status]);
}

/** 취소율(%) = 취소 건수 / 주문 건수 × 100 */
export function cancelRate(rows: readonly OrderRow[]): number {
  return rateOf(
    sumOf(rows, (row) => row.canceled),
    sumOf(rows, (row) => row.orders),
  );
}

/** 반품률(%) = 반품 건수 / 주문 건수 × 100 */
export function returnRate(rows: readonly OrderRow[]): number {
  return rateOf(
    sumOf(rows, (row) => row.returned),
    sumOf(rows, (row) => row.orders),
  );
}
