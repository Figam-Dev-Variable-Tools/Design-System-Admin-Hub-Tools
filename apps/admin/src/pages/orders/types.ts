// 주문 화면의 표시 규칙 — 필터·검색·집계·요약 문구 (순수)
//
// [무엇이 여기 있고 무엇이 도메인에 있나]
// 상태 기계·금액 계산·재고 차감 시점은 **도메인**(shared/domain/order.ts)의 것이다 — 통계·반품·
// 적립 원장이 같은 규칙을 읽어야 하기 때문이다. 이 파일은 그 위에 **이 화면만의 것**을 얹는다:
// 좌측 필터의 항목과 건수, 표에 쓰는 배지 색, '외 2건' 같은 요약 문구, 검색 대상 필드.
// 색과 문구는 다른 화면이 알아야 할 이유가 없고, 알게 하면 도메인이 UI 를 배우기 시작한다.
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_SEQUENCE,
  canTransitionOrder,
  orderAmounts,
  shipmentProgress,
} from '../../shared/domain/order';
import type { Order, OrderEventKind, OrderStatus } from '../../shared/domain/order';
import type { StatusTone } from '../../shared/ui';

/* ── 상태 필터 ────────────────────────────────────────────────────────────── */

export const ORDER_STATUS_ALL = 'all';
/** 취소는 상태가 아니라 나란한 사실이라(도메인 머리말) 필터에서는 별도 항목으로 선다 */
export const ORDER_STATUS_CANCELED = 'canceled';

export type OrderStatusFilter =
  typeof ORDER_STATUS_ALL | typeof ORDER_STATUS_CANCELED | OrderStatus;

interface OrderStatusFilterDef {
  readonly id: OrderStatusFilter;
  readonly label: string;
}

/**
 * 좌측 필터 항목 — 전체 · 상태 7종 · 취소.
 *
 * 상태 순서는 도메인의 흐름 순서를 그대로 따른다(직접 나열하지 않는다): 운영자는 주문이 흘러가는
 * 순서대로 읽고, 한쪽만 순서를 고치면 같은 목록이 화면마다 다른 순서로 보인다.
 */
export const ORDER_STATUS_FILTERS: readonly OrderStatusFilterDef[] = [
  { id: ORDER_STATUS_ALL, label: '전체' },
  ...ORDER_STATUS_SEQUENCE.map((status) => ({ id: status, label: ORDER_STATUS_LABEL[status] })),
  { id: ORDER_STATUS_CANCELED, label: '취소' },
];

/** 허용 값 목록 — parseFilter 가 손으로 고친 URL 을 여기로 되돌린다(캐스팅 금지) */
export const ORDER_STATUS_FILTER_VALUES: readonly OrderStatusFilter[] = ORDER_STATUS_FILTERS.map(
  (filter) => filter.id,
);

/** 취소된 주문인가 — 필터·배지·전이 가드가 모두 이 한 줄을 읽는다 */
export function isCanceled(order: Pick<Order, 'canceledAt'>): boolean {
  return order.canceledAt !== '';
}

/**
 * 상태 필터 적용.
 *
 * 취소된 주문은 **상태 필터에서 빠진다**: '배송준비중' 을 고른 운영자가 보려는 것은 지금 준비해야
 * 할 주문이고, 취소된 건이 섞이면 그 목록의 건수가 곧 할 일의 양이 아니게 된다. 취소는 자기
 * 항목에서만 보인다. 전체는 말 그대로 전부다.
 */
export function filterOrdersByStatus(
  list: readonly Order[],
  filter: OrderStatusFilter,
): readonly Order[] {
  if (filter === ORDER_STATUS_ALL) return list;
  if (filter === ORDER_STATUS_CANCELED) return list.filter((order) => isCanceled(order));
  return list.filter((order) => !isCanceled(order) && order.status === filter);
}

/** 좌측 필터의 건수 배지 — **필터 이전** 전체 집합에서 센다(키를 다 적은 Record) */
export function countOrdersByStatus(
  list: readonly Order[],
): Readonly<Record<OrderStatusFilter, number>> {
  const counts: Record<OrderStatusFilter, number> = {
    [ORDER_STATUS_ALL]: list.length,
    [ORDER_STATUS_CANCELED]: 0,
    pending: 0,
    preparing: 0,
    holding: 0,
    waiting: 0,
    shipping: 0,
    delivered: 0,
    confirmed: 0,
  };
  for (const order of list) {
    if (isCanceled(order)) counts[ORDER_STATUS_CANCELED] += 1;
    else counts[order.status] += 1;
  }
  return counts;
}

/* ── 검색 · 정렬 ──────────────────────────────────────────────────────────── */

/**
 * 주문번호·주문자·상품명 검색(대소문자 무시).
 *
 * 상품명을 품목 전부에서 찾는 이유: 운영자는 '패딩 주문 어디 갔지' 로 찾는데, 첫 품목만 보면
 * 두 번째 줄에 담긴 상품으로는 영영 검색되지 않는다.
 */
export function searchOrders(list: readonly Order[], keyword: string): readonly Order[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (order) =>
      order.id.toLowerCase().includes(needle) ||
      order.customer.name.toLowerCase().includes(needle) ||
      order.lines.some((line) => line.productName.toLowerCase().includes(needle)),
  );
}

/** 주문 일시 내림차순(최근이 위). 같은 시각은 주문번호로 안정 정렬 */
export function sortOrders(list: readonly Order[]): readonly Order[] {
  return [...list].sort((a, b) => {
    if (a.orderedAt !== b.orderedAt) return a.orderedAt < b.orderedAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/* ── 표시 ─────────────────────────────────────────────────────────────────── */

/**
 * 상태 배지의 색.
 *
 * 취소는 여기서 다루지 않는다 — 취소는 상태가 아니므로 화면이 배지를 따로 하나 더 그린다.
 * `find(...) ?? 기본값` 대신 키를 다 적은 Record 를 쓴다: 상태가 하나 늘면 컴파일이 막아 준다.
 */
const STATUS_TONE: Readonly<Record<OrderStatus, StatusTone>> = {
  pending: 'warning',
  preparing: 'info',
  holding: 'danger',
  waiting: 'info',
  shipping: 'info',
  delivered: 'success',
  confirmed: 'neutral',
};

export function orderStatusTone(status: OrderStatus): StatusTone {
  return STATUS_TONE[status];
}

const EVENT_TONE: Readonly<Record<OrderEventKind, StatusTone>> = {
  order: 'neutral',
  payment: 'success',
  status: 'info',
  stock: 'warning',
  cancel: 'danger',
  note: 'neutral',
};

export function orderEventTone(kind: OrderEventKind): StatusTone {
  return EVENT_TONE[kind];
}

/**
 * 목록의 상품 열 — '루미엔 경량 패딩 점퍼 외 2건'.
 *
 * 첫 품목만 쓰고 나머지를 건수로 접는 이유: 열 하나에 상품명 다섯 개를 늘어놓으면 표가 밀려
 * 정작 중요한 금액·상태 열이 화면 밖으로 나간다. 전부는 상세가 보여 준다.
 */
export function orderLinesSummary(order: Pick<Order, 'lines'>): string {
  const [first] = order.lines;
  if (first === undefined) return '품목 없음';
  const rest = order.lines.length - 1;
  return rest === 0 ? first.productName : `${first.productName} 외 ${String(rest)}건`;
}

/** 부분배송 표기 — 부분배송이 아니면 null(붙일 배지가 없다) */
export function partialShipmentLabel(order: Pick<Order, 'lines'>): string | null {
  const progress = shipmentProgress(order);
  if (!progress.partial) return null;
  return `부분배송 ${String(progress.shipped)}/${String(progress.total)}`;
}

/** 목록이 쓰는 결제금액 — 계산의 정본은 도메인의 orderAmounts 하나다(화면은 더하지 않는다) */
export function orderTotal(order: Pick<Order, 'lines' | 'payment'>): number {
  return orderAmounts(order).total;
}

/* ── 일괄 상태 처리 ───────────────────────────────────────────────────────── */

/**
 * 목록 툴바가 제공하는 일괄 전이 대상.
 *
 * 7개 상태를 전부 열지 않는다: 입금전은 되돌아가는 방향이라 애초에 갈 수 없고, 구매확정은
 * 고객의 의사(또는 자동 확정)이지 운영자가 무더기로 찍을 일이 아니다. 카페24에서 운영자가 실제로
 * 여러 건을 한 번에 옮기는 단계는 준비·대기·발송·완료 넷이다.
 */
export const BULK_TRANSITIONS: readonly OrderStatus[] = [
  'preparing',
  'waiting',
  'shipping',
  'delivered',
];

/** 일괄 처리 버튼의 글자 — '배송준비중 처리' */
export function bulkTransitionLabel(status: OrderStatus): string {
  return `${ORDER_STATUS_LABEL[status]} 처리`;
}

/**
 * 선택한 주문 중 이 전이를 **실제로 받을 수 있는** 것들.
 *
 * 버튼의 활성 조건과 저장의 허용 조건이 같은 술어(canTransitionOrder)를 읽는다 — 30건을 골라
 * 눌렀는데 28건이 조용히 거절당하는 일을 만들지 않는다. 화면은 이 결과의 길이를 버튼에 그대로
 * 쓴다('선택 30건 중 28건 배송중 처리').
 */
export function eligibleForTransition(orders: readonly Order[], to: OrderStatus): readonly Order[] {
  return orders.filter((order) => canTransitionOrder(order, to));
}
