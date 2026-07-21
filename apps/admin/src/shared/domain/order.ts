// 주문 도메인 모델 — 상태 기계 · 금액 계산 · 재고 차감 시점
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 페이지 밖에 있는가] 주문은 주문 화면만의 것이 아니다.
//   · 통계(/stats/orders)        — 상태별 건수를 센다. 어휘의 원천이 여기다.
//   · 교환/반품(/products/returns) — orderNo 로 주문을 가리킨다.
//   · 회원 적립금 원장            — PointEntry.orderNo 가 같은 값을 가리킨다.
//   · 고객 설정의 등급 승급 정책   — recalcTrigger 'order-completed' 가 기다리는 사건이 여기서 난다.
// 이 넷이 주문 화면을 가로질러 import 하면 그 순간 페이지 간 결합(code-quality 축1 · blocker ·
// 임계값 0건)이다. 그래서 모델은 페이지 밖에 있고, 화면들은 서로를 모른 채 같은 낱말을 쓴다.
//
// [상태 어휘는 통계에서 승격한 것이다 — 새로 짓지 않았다]
// 7개 상태는 원래 pages/stats/orders/types.ts 에 선언되어 집계 행에만 쓰이고 있었다(카페24의 실제
// 주문 상태). 주문 모듈이 자기 어휘를 새로 지으면 같은 주문이 두 이름을 갖고, 통계의 '배송준비중
// 12건' 과 목록의 건수가 영원히 어긋난다. 그래서 **타입과 라벨을 여기로 올리고 통계가 재수출**한다.
//
// [취소·교환·반품은 상태가 아니다 — 통계 머리말이 이미 정해 둔 규칙]
// 카페24에서 이 셋은 상태 값이 아니라 별도의 CS 흐름이다. 같은 유니온에 끼워 넣으면 '배송중이면서
// 취소 접수된' 주문을 담을 자리가 사라진다 — 한 주문이 상태 하나만 갖는다는 전제가 깨지기 때문이다.
// 그래서 취소는 `canceledAt` 이라는 **나란한 사실**로 들고, 반품은 교환/반품 모듈이 자기 원장에 든다.
// 둘을 가르는 것은 '배송중' 시점이다: 배송중 이전에 멈추면 주문취소, 이후에 돌아오면 반품.
//
// [주문은 스냅숏을 든다 — 이 파일에서 가장 중요한 판단]
// 품목은 상품 id 만 가리키지 않고 **주문 시점의 상품명·옵션 표기·단가·적립률을 복사해** 든다.
// 참조만 들면 상품 가격을 고친 날 3개월 전 주문의 결제금액이 함께 바뀐다 — 이미 돈이 오간 거래가
// 사후에 다른 금액이 되는 것이고, 그 주문서를 근거로 한 환불·정산이 전부 어긋난다. 리포가
// categoryLabel·accountName 을 비정규화해 든 것과 같은 결이다. 상품 링크는 productId 로 남긴다:
// 그것은 '지금 이 상품을 보러 간다' 는 뜻이고, 표시값의 정본이 아니다.
// ─────────────────────────────────────────────────────────────────────────────
import type { PaymentMethod } from '../commerce/payment-settings';
import type { StockMovement } from './stock';

/* ── 상태 ────────────────────────────────────────────────────────────────── */

/** 카페24의 주문 상태 — 입금 전부터 구매확정까지 한 방향으로 흐른다 */
export type OrderStatus =
  'pending' | 'preparing' | 'holding' | 'waiting' | 'shipping' | 'delivered' | 'confirmed';

/**
 * 흐르는 순서 = 표시 순서. 전이 가능 여부를 **이 배열의 인덱스**로 판정하므로 순서가 곧 규칙이다.
 * 배송보류(holding)가 배송준비중과 배송대기 사이에 있는 것도 그래서다 — 보류는 준비 이후에
 * 걸리고, 풀리면 대기로 나간다.
 */
export const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  'pending',
  'preparing',
  'holding',
  'waiting',
  'shipping',
  'delivered',
  'confirmed',
];

/** 표시명 — **여기 한 벌만 둔다.** 통계와 주문 목록이 같은 이름을 말해야 같은 상태로 읽힌다 */
export const ORDER_STATUS_LABEL: Readonly<Record<OrderStatus, string>> = {
  pending: '입금전',
  preparing: '배송준비중',
  holding: '배송보류',
  waiting: '배송대기',
  shipping: '배송중',
  delivered: '배송완료',
  confirmed: '구매확정',
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && value in ORDER_STATUS_LABEL;
}

export function orderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABEL[status];
}

/**
 * 흐름 위의 위치. 모르는 값은 −1 이 아니라 **끝 다음**으로 본다 — 그러면 어떤 전이도 허용되지
 * 않는 쪽(fail-closed)으로 수렴한다. 다만 유니온이라 실제로는 언제나 찾힌다.
 */
function statusIndex(status: OrderStatus): number {
  const index = ORDER_STATUS_SEQUENCE.indexOf(status);
  return index === -1 ? ORDER_STATUS_SEQUENCE.length : index;
}

/** 배송이 이미 떠났는가 — 취소와 반품을 가르는 선(통계 머리말) */
export function hasLeftWarehouse(status: OrderStatus): boolean {
  return statusIndex(status) >= statusIndex('shipping');
}

/* ── 품목 · 결제 (스냅숏) ─────────────────────────────────────────────────── */

/**
 * 주문 품목 1건 — **주문 시점의 값이 못 박혀 있다**(머리말).
 *
 * productId 는 링크용 참조일 뿐 표시값의 정본이 아니다. 상품이 삭제돼도 이 행은 자기 이름과
 * 금액을 스스로 말할 수 있어야 한다 — 주문서는 상품 목록의 파생물이 아니라 거래의 기록이다.
 */
export interface OrderLine {
  readonly id: string;
  /** 상품 상세로 가는 참조 — 삭제된 상품이면 링크만 죽고 이 행의 값은 그대로다 */
  readonly productId: string;
  /** 주문 시점의 상품명(스냅숏) */
  readonly productName: string;
  /** 재고를 움직이는 단위 — 이 값으로 SKU 재고가 증감한다 */
  readonly sku: string;
  /** 주문 시점의 옵션 표기(스냅숏) — '블랙 / M', 옵션이 없으면 '단일 상품' */
  readonly optionLabel: string;
  /** 주문 시점의 판매가(원, 스냅숏) — 상품 가격을 고쳐도 이 값은 움직이지 않는다 */
  readonly unitPrice: number;
  readonly quantity: number;
  /**
   * 이미 출고된 수량 — quantity 보다 작으면 **부분배송**이다.
   * 부분배송을 상태로 만들지 않는 이유는 취소·반품을 상태로 만들지 않는 이유와 같다:
   * 한 주문이 상태 하나만 갖는다는 전제를 깨지 않으려는 것이다.
   */
  readonly shippedQuantity: number;
  /** 주문 시점의 적립률(%, 스냅숏) — 적립금 정책을 바꿔도 지난 주문의 적립액은 그대로다 */
  readonly pointRate: number;
}

/** 품목 1행의 금액 — 단가 × 수량 */
export function lineAmount(line: Pick<OrderLine, 'unitPrice' | 'quantity'>): number {
  return line.unitPrice * line.quantity;
}

/** 품목 1행의 적립 예정액 — 원 단위 미만은 버린다(지급하지 않는 소수점을 표시하지 않는다) */
export function linePoint(line: Pick<OrderLine, 'unitPrice' | 'quantity' | 'pointRate'>): number {
  return Math.floor((lineAmount(line) * line.pointRate) / 100);
}

/** 결제 정보 — 수단과 가감액. 최종 결제금액은 저장하지 않고 orderAmounts 가 낸다(규칙 6) */
export interface OrderPayment {
  /** 결제수단 — 어휘의 정본은 shared/commerce/payment-settings 다 */
  readonly method: PaymentMethod;
  readonly shippingFee: number;
  /** 상품 즉시할인 등 쿠폰이 아닌 할인(원) */
  readonly discount: number;
  /** 쿠폰 할인(원) */
  readonly couponDiscount: number;
  /** 쿠폰 이름 — 미사용이면 빈 문자열. 쿠폰이 삭제돼도 주문서는 이름을 말할 수 있어야 한다 */
  readonly couponName: string;
  /** 사용한 적립금(원) */
  readonly pointUsed: number;
  /** 입금·결제 확인 시각 ISO — '' 면 아직 돈이 들어오지 않았다 */
  readonly paidAt: string;
}

/** 주문서의 금액 한 벌 — 화면은 이 결과만 그린다 */
export interface OrderAmounts {
  readonly itemsTotal: number;
  readonly shippingFee: number;
  readonly discount: number;
  readonly couponDiscount: number;
  readonly pointUsed: number;
  /** 최종 결제금액 */
  readonly total: number;
  /** 적립 예정액 — 품목별 적립률 스냅숏의 합 */
  readonly point: number;
}

/**
 * 금액 계산의 **유일한 자리**(규칙 6).
 *
 * 스냅숏으로 든 것은 단가·적립률 같은 **입력**이고, 합계는 그 입력에서 매번 만든다. 합계까지
 * 저장하면 배송비를 정정한 순간 총액과 항목이 어긋난 주문서가 남는다 — 그때 어느 쪽이 사실인지
 * 아무도 답할 수 없다. 화면이 각자 더하는 것도 같은 이유로 막는다: 목록과 상세가 다른 금액을
 * 말하는 사고는 언제나 '두 곳에서 더했다' 에서 시작한다.
 *
 * 총액은 0 아래로 내려가지 않는다 — 할인·적립금이 상품금액을 넘겨도 돈을 돌려주지는 않는다.
 */
export function orderAmounts(order: Pick<Order, 'lines' | 'payment'>): OrderAmounts {
  const itemsTotal = order.lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const point = order.lines.reduce((sum, line) => sum + linePoint(line), 0);
  const { shippingFee, discount, couponDiscount, pointUsed } = order.payment;
  const total = Math.max(0, itemsTotal + shippingFee - discount - couponDiscount - pointUsed);
  return { itemsTotal, shippingFee, discount, couponDiscount, pointUsed, total, point };
}

/* ── 사람 ────────────────────────────────────────────────────────────────── */

/** 주문자 — 결제한 사람 */
export interface OrderCustomer {
  readonly name: string;
  /** 연락처(가상) */
  readonly phone: string;
  readonly email: string;
  /** 회원 id — 비회원 주문이면 '' (링크할 회원 상세가 없다) */
  readonly memberId: string;
}

/** 수령인 — 주문자와 다를 수 있다(선물·직장 배송) */
export interface OrderReceiver {
  readonly name: string;
  readonly phone: string;
  readonly zipCode: string;
  readonly address: string;
  readonly addressDetail: string;
  /** 배송 요청사항 — 없으면 '' */
  readonly request: string;
}

/* ── 처리 이력 ───────────────────────────────────────────────────────────── */

/** 이력 한 줄이 무엇에 관한 것인가 — 화면이 배지 색을 고르는 근거다 */
export type OrderEventKind = 'order' | 'payment' | 'status' | 'stock' | 'cancel' | 'note';

/** 처리 이력 1건 — 주문에 일어난 일을 시간순으로 남긴다(감사 성격이라 지우지 않는다) */
export interface OrderEvent {
  readonly id: string;
  readonly at: string;
  readonly kind: OrderEventKind;
  readonly label: string;
  /** 누가 했는가 — 고객이 만든 사건이면 '고객' */
  readonly actor: string;
  readonly note: string;
}

/* ── 주문 ────────────────────────────────────────────────────────────────── */

export interface Order {
  /**
   * 주문번호를 겸한다 — 'ORD-YYYYMMDD-NNNN'.
   * 고객이 전화로 부르는 번호와 관리자가 여는 URL 이 같은 값이어야 서로를 지목할 수 있다.
   * 반품 요청의 orderNo · 적립금 원장의 orderNo 가 가리키는 것도 이 값이다.
   */
  readonly id: string;
  /** 주문 일시 ISO */
  readonly orderedAt: string;
  readonly status: OrderStatus;
  readonly customer: OrderCustomer;
  readonly receiver: OrderReceiver;
  readonly lines: readonly OrderLine[];
  readonly payment: OrderPayment;
  /**
   * 취소 시각 ISO — '' 면 취소되지 않았다. **상태가 아니라 나란한 사실이다**(머리말).
   * 배송중 이전에만 걸 수 있고, 그 이후에 되돌아오는 것은 반품 모듈이 받는다.
   */
  readonly canceledAt: string;
  readonly cancelReason: string;
  /** 재고 차감 시각 ISO — '' 면 미차감. **재차감을 막는 멱등 키다**(반품의 stockAppliedAt 과 같다) */
  readonly stockAppliedAt: string;
  /** 취소 복원 시각 ISO — '' 면 미복원. 복원을 두 번 하지 않게 하는 멱등 키 */
  readonly stockRestoredAt: string;
  /** 확정된 재고 이동 이력(차감 + 복원) */
  readonly stockMovements: readonly StockMovement[];
  readonly history: readonly OrderEvent[];
  readonly adminNote: string;
}

export type OrderInput = Omit<Order, 'id'>;

export const ORDER_NOTE_MAX = 500;
export const ORDER_CANCEL_REASON_MAX = 200;

/** 항목 → 쓰기 입력(id 제외). 상세·목록의 저장이 쓴다 */
export function toOrderInput(order: Order): OrderInput {
  return {
    orderedAt: order.orderedAt,
    status: order.status,
    customer: { ...order.customer },
    receiver: { ...order.receiver },
    lines: order.lines.map((line) => ({ ...line })),
    payment: { ...order.payment },
    canceledAt: order.canceledAt,
    cancelReason: order.cancelReason,
    stockAppliedAt: order.stockAppliedAt,
    stockRestoredAt: order.stockRestoredAt,
    stockMovements: order.stockMovements.map((movement) => ({ ...movement })),
    history: order.history.map((event) => ({ ...event })),
    adminNote: order.adminNote,
  };
}

/* ── 상태 전이 규칙 (순수 술어 — 버튼과 저장이 **같은 것을** 읽는다) ──────────
 *
 * 규칙을 화면이 아니라 여기에 두는 이유: 버튼의 disabled 와 저장의 허용 여부가 서로 다른 판단을
 * 하면 '눌리는데 거부당하는 버튼' 또는 '눌리지 않는데 서버는 허용하는 동작' 이 생긴다. 화면은
 * transitionBlock 을 읽어 버튼을 그리고(사유까지 그대로 보여준다), 저장소도 같은 함수로 막는다.
 * 선례: pages/products/inquiries/_shared/store.ts 의 canAnswer/canClose. */

export const ORDER_TRANSITION_BACKWARD = '주문 상태는 되돌릴 수 없습니다.';
export const ORDER_TRANSITION_CANCELED = '취소된 주문은 상태를 바꿀 수 없습니다.';
export const ORDER_TRANSITION_CONFIRMED = '구매확정된 주문은 더 이상 진행할 단계가 없습니다.';
export const ORDER_TRANSITION_UNPAID = '입금이 확인되지 않아 배송 단계로 넘길 수 없습니다.';
export const ORDER_CANCEL_SHIPPED =
  '배송이 시작된 주문은 취소할 수 없습니다. 교환/반품으로 접수해 주세요.';
export const ORDER_CANCEL_DONE = '이미 취소된 주문입니다.';

/**
 * 이 주문을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null.
 *
 * 문자열을 돌려주는 이유: 화면이 비활성 버튼 옆에 **왜 못 누르는지**를 그대로 쓸 수 있어야 한다.
 * boolean 만 주면 화면이 사유를 다시 지어내고, 그 순간 규칙이 두 벌이 된다.
 */
export function orderTransitionBlock(
  order: Pick<Order, 'status' | 'canceledAt' | 'payment'>,
  to: OrderStatus,
): string | null {
  if (order.canceledAt !== '') return ORDER_TRANSITION_CANCELED;
  if (order.status === 'confirmed') return ORDER_TRANSITION_CONFIRMED;
  if (statusIndex(to) <= statusIndex(order.status)) return ORDER_TRANSITION_BACKWARD;
  // 입금 전 주문이 배송 단계로 넘어가면, 돈을 받지 않은 물건이 재고에서 빠져 나간다.
  if (order.status === 'pending' && order.payment.paidAt === '') return ORDER_TRANSITION_UNPAID;
  return null;
}

export function canTransitionOrder(
  order: Pick<Order, 'status' | 'canceledAt' | 'payment'>,
  to: OrderStatus,
): boolean {
  return orderTransitionBlock(order, to) === null;
}

/** 지금 이 주문이 갈 수 있는 다음 상태들 — 상세의 전이 버튼과 목록의 일괄 처리가 함께 읽는다 */
export function nextOrderStatuses(
  order: Pick<Order, 'status' | 'canceledAt' | 'payment'>,
): readonly OrderStatus[] {
  return ORDER_STATUS_SEQUENCE.filter((status) => canTransitionOrder(order, status));
}

/** 취소할 수 없는 이유 — 취소할 수 있으면 null */
export function orderCancelBlock(order: Pick<Order, 'status' | 'canceledAt'>): string | null {
  if (order.canceledAt !== '') return ORDER_CANCEL_DONE;
  // 배송중 이후에 되돌아오는 것은 취소가 아니라 반품이다 — 처리 화면도 창구도 다르다.
  if (hasLeftWarehouse(order.status)) return ORDER_CANCEL_SHIPPED;
  return null;
}

export function canCancelOrder(order: Pick<Order, 'status' | 'canceledAt'>): boolean {
  return orderCancelBlock(order) === null;
}

/* ── 전이 적용 (이력이 함께 움직인다) ─────────────────────────────────────── */

/**
 * 이력 한 줄을 덧붙인다.
 *
 * id 에 시각과 종류를 함께 넣는 이유: 같은 밀리초에 두 사건이 붙어도 키가 겹치지 않아야 React 가
 * 행을 뒤섞지 않는다. 순번을 쓰지 않는 것은 이력이 **추가만 되는 원장**이라 길이가 곧 순번이기
 * 때문이다(중간 삽입이 없다).
 */
function withEvent(order: Order, event: Omit<OrderEvent, 'id'>): Order {
  const id = `evt-${event.at}-${event.kind}-${String(order.history.length + 1)}`;
  return { ...order, history: [...order.history, { id, ...event }] };
}

/**
 * 상태를 옮긴다 — 막힌 전이는 **던진다**(술어가 먼저 걸러 주므로 여기 도달하면 그것은 버그다).
 * 상태와 이력이 한 함수에서 함께 움직인다: 둘이 갈라지면 '배송중인데 이력에는 없는' 주문이 생긴다.
 */
export function applyOrderStatus(order: Order, to: OrderStatus, at: string, actor: string): Order {
  const blocked = orderTransitionBlock(order, to);
  if (blocked !== null) throw new Error(blocked);
  return withEvent(
    { ...order, status: to },
    {
      at,
      kind: 'status',
      label: `${ORDER_STATUS_LABEL[order.status]} → ${ORDER_STATUS_LABEL[to]}`,
      actor,
      note: '',
    },
  );
}

/** 입금 확인 — 'pending' 을 벗어나기 위한 전제이자, 차감 시점이 'payment' 일 때의 방아쇠다 */
export function applyOrderPaid(order: Order, at: string, actor: string): Order {
  if (order.canceledAt !== '') throw new Error(ORDER_TRANSITION_CANCELED);
  if (order.payment.paidAt !== '') return order;
  return withEvent(
    { ...order, payment: { ...order.payment, paidAt: at } },
    {
      at,
      kind: 'payment',
      label: '입금 확인',
      actor,
      note: '',
    },
  );
}

/** 취소 — 막힌 취소는 던진다. 상태는 그대로 두고 취소 사실만 얹는다(머리말) */
export function applyOrderCancel(order: Order, reason: string, at: string, actor: string): Order {
  const blocked = orderCancelBlock(order);
  if (blocked !== null) throw new Error(blocked);
  return withEvent(
    { ...order, canceledAt: at, cancelReason: reason.trim() },
    {
      at,
      kind: 'cancel',
      label: '주문 취소',
      actor,
      note: reason.trim(),
    },
  );
}

/* ── 재고 차감 시점 (설정값) ──────────────────────────────────────────────── */

/**
 * 재고를 언제 빼는가 — 카페24가 실제로 갖는 스위치다.
 *   · 'order'   주문이 들어오는 즉시. 품절을 확실히 막지만, 입금하지 않을 주문이 재고를 잠근다.
 *   · 'payment' 입금이 확인된 뒤. 재고는 늦게 빠지지만 미입금 주문이 재고를 붙잡지 않는다.
 */
export type StockDeductAt = 'order' | 'payment';

export const STOCK_DEDUCT_LABEL: Readonly<Record<StockDeductAt, string>> = {
  order: '주문 즉시',
  payment: '입금 확인 시',
};

/** 옵션 목록 — 화면의 선택지와 설명이 같은 자리에서 나온다 */
export const STOCK_DEDUCT_OPTIONS: readonly {
  readonly id: StockDeductAt;
  readonly label: string;
  readonly hint: string;
}[] = [
  {
    id: 'order',
    label: STOCK_DEDUCT_LABEL.order,
    hint: '주문이 들어오는 즉시 재고가 빠집니다. 품절을 확실히 막지만 미입금 주문도 재고를 잡습니다.',
  },
  {
    id: 'payment',
    label: STOCK_DEDUCT_LABEL.payment,
    hint: '입금이 확인된 뒤 재고가 빠집니다. 미입금 주문이 재고를 붙잡지 않습니다.',
  },
];

export function isStockDeductAt(value: unknown): value is StockDeductAt {
  return value === 'order' || value === 'payment';
}

/** 재고가 이미 빠졌는가 — 멱등 키의 단일 정의(반품의 isStockApplied 와 같은 규약) */
export function isOrderStockApplied(order: Pick<Order, 'stockAppliedAt'>): boolean {
  return order.stockAppliedAt !== '';
}

/**
 * 지금 이 주문이 재고를 빼야 하는가.
 *
 * 세 조건이 모두 참일 때만 참이다: ① 취소되지 않았고 ② 아직 빼지 않았고(멱등) ③ 설정한 시점이
 * 지났다. 화면과 어댑터가 각자 판단하지 않도록 조건을 여기 한 곳에 모은다.
 */
export function shouldDeductStock(
  order: Pick<Order, 'canceledAt' | 'stockAppliedAt' | 'payment'>,
  deductAt: StockDeductAt,
): boolean {
  if (order.canceledAt !== '') return false;
  if (order.stockAppliedAt !== '') return false;
  return deductAt === 'order' ? true : order.payment.paidAt !== '';
}

/** 취소가 재고를 되돌려야 하는가 — 뺀 적이 있고, 아직 되돌리지 않았고, 취소된 주문만 */
export function shouldRestoreStock(
  order: Pick<Order, 'canceledAt' | 'stockAppliedAt' | 'stockRestoredAt'>,
): boolean {
  return order.canceledAt !== '' && order.stockAppliedAt !== '' && order.stockRestoredAt === '';
}

/** 차감 이동 계획(순수) — 품목마다 출고 1건. 수량 0 인 품목은 움직일 것이 없어 빠진다 */
export function planOrderDeduction(
  order: Pick<Order, 'lines'>,
  at: string,
): readonly StockMovement[] {
  return order.lines
    .filter((line) => line.quantity > 0)
    .map((line) => ({
      id: `mv-${at}-out-${line.id}`,
      at,
      direction: 'out' as const,
      sku: line.sku,
      optionLabel: line.optionLabel,
      quantity: line.quantity,
    }));
}

/**
 * 취소 복원 계획(순수) — **실제로 빠져나간 만큼만** 되돌린다.
 *
 * 품목에서 다시 만들지 않고 기록된 출고 이동을 뒤집는 이유: 주문서를 나중에 정정해 수량이 바뀌면
 * 빠진 양과 되돌린 양이 어긋나고, 그 차이는 아무도 눈치채지 못한 채 재고에 남는다.
 */
export function planOrderRestore(
  order: Pick<Order, 'stockMovements'>,
  at: string,
): readonly StockMovement[] {
  return order.stockMovements
    .filter((movement) => movement.direction === 'out')
    .map((movement) => ({
      id: `mv-${at}-in-${movement.id}`,
      at,
      direction: 'in' as const,
      sku: movement.sku,
      optionLabel: movement.optionLabel,
      quantity: movement.quantity,
    }));
}

/** 차감을 주문에 못 박는다 — 멱등 키(stockAppliedAt)와 이동 이력이 함께 붙는다 */
export function withStockApplied(
  order: Order,
  at: string,
  movements: readonly StockMovement[],
): Order {
  if (isOrderStockApplied(order)) return order;
  return withEvent(
    {
      ...order,
      stockAppliedAt: at,
      stockMovements: [...order.stockMovements, ...movements],
    },
    {
      at,
      kind: 'stock',
      label: '재고 차감',
      actor: '시스템',
      note: movements
        .map((movement) => `${movement.sku} ${String(movement.quantity)}개`)
        .join(', '),
    },
  );
}

/** 복원을 주문에 못 박는다 — 같은 멱등 규약(stockRestoredAt) */
export function withStockRestored(
  order: Order,
  at: string,
  movements: readonly StockMovement[],
): Order {
  if (order.stockRestoredAt !== '') return order;
  return withEvent(
    {
      ...order,
      stockRestoredAt: at,
      stockMovements: [...order.stockMovements, ...movements],
    },
    {
      at,
      kind: 'stock',
      label: '재고 복원',
      actor: '시스템',
      note: movements
        .map((movement) => `${movement.sku} ${String(movement.quantity)}개`)
        .join(', '),
    },
  );
}

/* ── 배송 진행 (부분배송) ─────────────────────────────────────────────────── */

export interface ShipmentProgress {
  readonly shipped: number;
  readonly total: number;
  /** 일부만 나갔는가 — 하나도 안 나갔거나 전부 나간 것은 부분배송이 아니다 */
  readonly partial: boolean;
}

/** 주문 전체의 출고 진행 — 상태 배지 옆에 '부분배송' 을 붙일지 정한다 */
export function shipmentProgress(order: Pick<Order, 'lines'>): ShipmentProgress {
  const shipped = order.lines.reduce((sum, line) => sum + line.shippedQuantity, 0);
  const total = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  return { shipped, total, partial: shipped > 0 && shipped < total };
}
