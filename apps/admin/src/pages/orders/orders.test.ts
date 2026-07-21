// 주문 동작 회귀 테스트 — 상태 전이 가드 · 금액 계산 · 재고 차감 시점 · 멱등 · 필터/검색/집계
//   + 어댑터가 실제로 재고를 움직이는지(적용기 배선 경로) + 조회기 미배선의 '모른다'
//
// [왜 순수 규칙만 이렇게 촘촘히 보나] 이 도메인에서 사고는 전부 규칙이 두 벌이 될 때 난다 —
// 버튼과 저장이 다르게 판단하거나, 목록과 상세가 각자 금액을 더하거나, 차감이 두 번 일어나거나.
// 그 규칙들은 전부 순수 함수라 여기서 못 박을 수 있다.
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  applyOrderCancel,
  applyOrderPaid,
  applyOrderStatus,
  canCancelOrder,
  canTransitionOrder,
  hasLeftWarehouse,
  isOrderStockApplied,
  lineAmount,
  linePoint,
  nextOrderStatuses,
  orderAmounts,
  orderCancelBlock,
  orderTransitionBlock,
  planOrderDeduction,
  planOrderRestore,
  shipmentProgress,
  shouldDeductStock,
  shouldRestoreStock,
  toOrderInput,
  withStockApplied,
  withStockRestored,
  ORDER_CANCEL_SHIPPED,
  ORDER_STATUS_SEQUENCE,
  ORDER_TRANSITION_BACKWARD,
  ORDER_TRANSITION_CANCELED,
  ORDER_TRANSITION_CONFIRMED,
  ORDER_TRANSITION_UNPAID,
} from '../../shared/domain/order';
import type { Order, OrderLine, OrderStatus } from '../../shared/domain/order';
import {
  applyMovements,
  applyStockMovements,
  registerStockApplier,
  resetStockApplier,
} from '../../shared/domain/stock';
import type { StockMovement } from '../../shared/domain/stock';
import {
  findOrderRef,
  orderById,
  orderCatalog,
  orderDetailPath,
  registerOrderLookup,
  resetOrderLookup,
} from '../../shared/domain/order-ref';
import { listOrderRefs, orderAdapter } from './data-source';
import { readStockDeductAt, resetStockDeductAt, writeStockDeductAt } from './_shared/store';
import {
  bulkTransitionLabel,
  countOrdersByStatus,
  eligibleForTransition,
  filterOrdersByStatus,
  isCanceled,
  orderLinesSummary,
  orderTotal,
  partialShipmentLabel,
  searchOrders,
  sortOrders,
  ORDER_STATUS_ALL,
  ORDER_STATUS_CANCELED,
} from './types';
import { orderCancelReasonError, orderNoteError } from './validation';

const AT = '2026-07-22T00:00:00.000Z';

/** 기준 품목 한 줄 — 테스트가 이것을 복사해 수량·출고량만 바꾼다(비단언 접근을 위해 밖에 둔다) */
const LINE: OrderLine = {
  id: 'ln-1',
  productId: 'prd-1',
  productName: '루미엔 경량 패딩 점퍼',
  sku: 'P-블랙-M',
  optionLabel: '블랙 / M',
  unitPrice: 100000,
  quantity: 2,
  shippedQuantity: 0,
  pointRate: 2,
};

/** 최소 주문 한 건 — 테스트가 필요한 축만 덮어쓴다 */
function orderOf(overrides: Partial<Order> & { readonly id: string }): Order {
  return {
    orderedAt: '2026-07-20T00:00:00.000Z',
    status: 'pending',
    customer: { name: '한지우', phone: '010-0000-0000', email: 'a@example.com', memberId: '' },
    receiver: {
      name: '한지우',
      phone: '010-0000-0000',
      zipCode: '00000',
      address: '주소',
      addressDetail: '',
      request: '',
    },
    lines: [LINE],
    payment: {
      method: 'card',
      shippingFee: 3000,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '',
    },
    canceledAt: '',
    cancelReason: '',
    stockAppliedAt: '',
    stockRestoredAt: '',
    stockMovements: [],
    history: [],
    adminNote: '',
    ...overrides,
  };
}

const paid = (extra: Partial<Order> = {}): Order =>
  orderOf({
    id: 'ORD-1',
    payment: { ...orderOf({ id: 'x' }).payment, paidAt: '2026-07-20T01:00:00.000Z' },
    ...extra,
  });

/* ── 상태 전이 가드 ───────────────────────────────────────────────────────── */

describe('상태 전이 가드', () => {
  it('되돌아가는 전이는 막는다 — 그 사이의 처리 시간이 사라진다', () => {
    const order = paid({ status: 'shipping' });
    expect(orderTransitionBlock(order, 'preparing')).toBe(ORDER_TRANSITION_BACKWARD);
    expect(canTransitionOrder(order, 'preparing')).toBe(false);
  });

  it('같은 상태로의 전이도 이동이 아니다', () => {
    const order = paid({ status: 'waiting' });
    expect(orderTransitionBlock(order, 'waiting')).toBe(ORDER_TRANSITION_BACKWARD);
  });

  it('입금이 확인되지 않은 주문은 배송 단계로 넘어가지 못한다', () => {
    const order = orderOf({ id: 'ORD-1', status: 'pending' });
    expect(orderTransitionBlock(order, 'preparing')).toBe(ORDER_TRANSITION_UNPAID);
    expect(nextOrderStatuses(order)).toEqual([]);
  });

  it('입금이 확인되면 다음 단계가 전부 열린다', () => {
    const order = paid({ status: 'pending' });
    expect(nextOrderStatuses(order)).toEqual([
      'preparing',
      'holding',
      'waiting',
      'shipping',
      'delivered',
      'confirmed',
    ]);
  });

  it('취소된 주문은 어떤 전이도 받지 않는다', () => {
    const order = paid({ status: 'preparing', canceledAt: AT, cancelReason: '고객 요청' });
    expect(orderTransitionBlock(order, 'waiting')).toBe(ORDER_TRANSITION_CANCELED);
    expect(nextOrderStatuses(order)).toEqual([]);
  });

  it('구매확정은 종점이다', () => {
    const order = paid({ status: 'confirmed' });
    expect(orderTransitionBlock(order, 'delivered')).toBe(ORDER_TRANSITION_CONFIRMED);
    expect(nextOrderStatuses(order)).toEqual([]);
  });

  it('버튼(nextOrderStatuses)과 저장(applyOrderStatus)이 같은 술어를 읽는다', () => {
    const order = paid({ status: 'preparing' });
    for (const target of ORDER_STATUS_SEQUENCE) {
      const allowed = nextOrderStatuses(order).includes(target);
      if (allowed) expect(applyOrderStatus(order, target, AT, '운영자').status).toBe(target);
      else expect(() => applyOrderStatus(order, target, AT, '운영자')).toThrow();
    }
  });

  it('전이는 상태와 이력을 함께 옮긴다 — 둘이 갈라진 주문을 만들지 않는다', () => {
    const next = applyOrderStatus(paid({ status: 'preparing' }), 'shipping', AT, '운영자');
    expect(next.status).toBe('shipping');
    expect(next.history.at(-1)?.label).toBe('배송준비중 → 배송중');
    expect(next.history.at(-1)?.kind).toBe('status');
  });

  it('입금 확인은 한 번만 기록된다(같은 값을 다시 확인해도 이력이 늘지 않는다)', () => {
    const once = applyOrderPaid(orderOf({ id: 'ORD-1' }), AT, '운영자');
    expect(once.payment.paidAt).toBe(AT);
    expect(applyOrderPaid(once, '2026-07-23T00:00:00.000Z', '운영자')).toBe(once);
  });
});

/* ── 취소 (상태가 아니라 나란한 사실) ─────────────────────────────────────── */

describe('취소', () => {
  it('배송이 떠나기 전에만 취소할 수 있다 — 그 이후는 반품이다', () => {
    expect(canCancelOrder(paid({ status: 'waiting' }))).toBe(true);
    expect(orderCancelBlock(paid({ status: 'shipping' }))).toBe(ORDER_CANCEL_SHIPPED);
    expect(orderCancelBlock(paid({ status: 'delivered' }))).toBe(ORDER_CANCEL_SHIPPED);
  });

  it("'배송중' 이 취소와 반품을 가르는 선이다", () => {
    expect(hasLeftWarehouse('waiting')).toBe(false);
    expect(hasLeftWarehouse('shipping')).toBe(true);
  });

  it('취소는 상태를 지우지 않고 나란히 얹힌다', () => {
    const next = applyOrderCancel(paid({ status: 'preparing' }), '재고 소진', AT, '운영자');
    expect(next.status).toBe('preparing');
    expect(next.canceledAt).toBe(AT);
    expect(isCanceled(next)).toBe(true);
    expect(next.history.at(-1)?.kind).toBe('cancel');
  });

  it('이미 취소된 주문은 다시 취소되지 않는다', () => {
    const canceled = applyOrderCancel(paid({ status: 'preparing' }), '재고 소진', AT, '운영자');
    expect(() => applyOrderCancel(canceled, '또 취소', AT, '운영자')).toThrow();
  });
});

/* ── 금액 계산 (계산 함수 하나가 소유한다) ────────────────────────────────── */

describe('금액 계산', () => {
  it('상품금액 + 배송비 − 할인 − 쿠폰 − 적립금 = 최종 결제금액', () => {
    const order = orderOf({
      id: 'ORD-1',
      payment: {
        method: 'card',
        shippingFee: 3000,
        discount: 2000,
        couponDiscount: 5000,
        couponName: '여름맞이',
        pointUsed: 1000,
        paidAt: '',
      },
    });
    const amounts = orderAmounts(order);
    expect(amounts.itemsTotal).toBe(200000);
    expect(amounts.total).toBe(200000 + 3000 - 2000 - 5000 - 1000);
    expect(orderTotal(order)).toBe(amounts.total);
  });

  it('할인이 상품금액을 넘어도 음수가 되지 않는다 — 돈을 돌려주지는 않는다', () => {
    const order = orderOf({
      id: 'ORD-1',
      lines: [
        {
          id: 'ln-1',
          productId: 'prd-1',
          productName: '상품',
          sku: 'S-1',
          optionLabel: '단일 상품',
          unitPrice: 1000,
          quantity: 1,
          shippedQuantity: 0,
          pointRate: 0,
        },
      ],
      payment: {
        method: 'card',
        shippingFee: 0,
        discount: 0,
        couponDiscount: 5000,
        couponName: '과한 쿠폰',
        pointUsed: 0,
        paidAt: '',
      },
    });
    expect(orderAmounts(order).total).toBe(0);
  });

  it('품목 금액·적립은 주문 시점 스냅숏으로 계산한다(원 단위 미만은 버린다)', () => {
    const line = {
      unitPrice: 19900,
      quantity: 3,
      pointRate: 1,
    };
    expect(lineAmount(line)).toBe(59700);
    expect(linePoint(line)).toBe(597);
  });

  it('적립 예정액은 품목별 적립률의 합이다', () => {
    expect(orderAmounts(orderOf({ id: 'ORD-1' })).point).toBe(4000);
  });
});

/* ── 재고 차감 시점 · 멱등 ────────────────────────────────────────────────── */

describe('재고 차감 시점(설정값)', () => {
  it("'주문 즉시' 는 입금 전에도 차감한다", () => {
    expect(shouldDeductStock(orderOf({ id: 'ORD-1' }), 'order')).toBe(true);
  });

  it("'입금 확인 시' 는 입금 전에는 차감하지 않는다", () => {
    expect(shouldDeductStock(orderOf({ id: 'ORD-1' }), 'payment')).toBe(false);
    expect(shouldDeductStock(paid(), 'payment')).toBe(true);
  });

  it('취소된 주문은 어느 설정에서도 차감하지 않는다', () => {
    const canceled = paid({ canceledAt: AT });
    expect(shouldDeductStock(canceled, 'order')).toBe(false);
    expect(shouldDeductStock(canceled, 'payment')).toBe(false);
  });

  it('이미 차감된 주문은 다시 차감하지 않는다(멱등 키 = stockAppliedAt)', () => {
    const applied = withStockApplied(paid(), AT, planOrderDeduction(paid(), AT));
    expect(isOrderStockApplied(applied)).toBe(true);
    expect(shouldDeductStock(applied, 'order')).toBe(false);
    // 같은 주문에 다시 못 박아도 이동 이력이 늘지 않는다
    expect(withStockApplied(applied, '2026-07-23T00:00:00.000Z', [])).toBe(applied);
  });

  it('차감 계획은 품목마다 출고 1건이다', () => {
    const movements = planOrderDeduction(paid(), AT);
    expect(movements).toHaveLength(1);
    expect(movements[0]?.direction).toBe('out');
    expect(movements[0]?.sku).toBe('P-블랙-M');
    expect(movements[0]?.quantity).toBe(2);
  });

  it('취소 복원은 실제로 빠져나간 이동만 뒤집는다', () => {
    const applied = withStockApplied(paid(), AT, planOrderDeduction(paid(), AT));
    const canceled = { ...applied, canceledAt: AT };
    expect(shouldRestoreStock(canceled)).toBe(true);

    const restore = planOrderRestore(canceled, AT);
    expect(restore).toHaveLength(1);
    expect(restore[0]?.direction).toBe('in');
    expect(restore[0]?.quantity).toBe(2);

    const restored = withStockRestored(canceled, AT, restore);
    expect(shouldRestoreStock(restored)).toBe(false);
    // 두 번째 복원은 아무 일도 하지 않는다(멱등 키 = stockRestoredAt)
    expect(withStockRestored(restored, '2026-07-23T00:00:00.000Z', restore)).toBe(restored);
  });

  it('차감된 적이 없는 주문은 취소해도 복원할 것이 없다', () => {
    expect(shouldRestoreStock({ canceledAt: AT, stockAppliedAt: '', stockRestoredAt: '' })).toBe(
      false,
    );
  });
});

/* ── 재고 산술 (승격된 공용 규칙) ─────────────────────────────────────────── */

describe('재고 적용(applyMovements)', () => {
  const units = [
    { sku: 'P-블랙-M', stock: 5, extra: '보존' },
    { sku: 'P-블랙-L', stock: 1, extra: '보존' },
  ];

  it('출고는 빼고 입고는 더한다 — 다른 필드는 그대로 통과한다', () => {
    const movements: readonly StockMovement[] = [
      { id: 'm1', at: AT, direction: 'out', sku: 'P-블랙-M', optionLabel: '블랙 / M', quantity: 2 },
      { id: 'm2', at: AT, direction: 'in', sku: 'P-블랙-L', optionLabel: '블랙 / L', quantity: 3 },
    ];
    const next = applyMovements(units, movements);
    expect(next[0]?.stock).toBe(3);
    expect(next[1]?.stock).toBe(4);
    expect(next[0]?.extra).toBe('보존');
  });

  it('음수 재고를 만들지 않는다', () => {
    const next = applyMovements(units, [
      { id: 'm1', at: AT, direction: 'out', sku: 'P-블랙-L', optionLabel: '블랙 / L', quantity: 9 },
    ]);
    expect(next[1]?.stock).toBe(0);
  });

  it('적용기가 배선되지 않았으면 false 다 — 조용히 성공하지 않는다', () => {
    resetStockApplier();
    expect(
      applyStockMovements([
        { id: 'm1', at: AT, direction: 'out', sku: 'S', optionLabel: '', quantity: 1 },
      ]),
    ).toBe(false);
    // 움직일 것이 없는 호출은 실패가 아니다
    expect(applyStockMovements([])).toBe(true);
  });
});

/* ── 부분배송 ─────────────────────────────────────────────────────────────── */

describe('부분배송', () => {
  it('일부만 나갔을 때만 부분배송이다', () => {
    const none = orderOf({ id: 'ORD-1' });
    expect(shipmentProgress(none).partial).toBe(false);
    expect(partialShipmentLabel(none)).toBeNull();

    const half = orderOf({
      id: 'ORD-1',
      lines: [
        { ...LINE, quantity: 2, shippedQuantity: 1 },
        { ...LINE, id: 'ln-2', quantity: 1, shippedQuantity: 0 },
      ],
    });
    expect(shipmentProgress(half)).toEqual({ shipped: 1, total: 3, partial: true });
    expect(partialShipmentLabel(half)).toBe('부분배송 1/3');

    const all = orderOf({
      id: 'ORD-1',
      lines: [{ ...LINE, quantity: 2, shippedQuantity: 2 }],
    });
    expect(partialShipmentLabel(all)).toBeNull();
  });
});

/* ── 필터 · 검색 · 집계 ───────────────────────────────────────────────────── */

describe('필터 · 검색 · 집계', () => {
  const list: readonly Order[] = [
    orderOf({ id: 'ORD-A', status: 'pending', orderedAt: '2026-07-21T00:00:00.000Z' }),
    orderOf({ id: 'ORD-B', status: 'preparing', orderedAt: '2026-07-20T00:00:00.000Z' }),
    orderOf({
      id: 'ORD-C',
      status: 'preparing',
      canceledAt: AT,
      orderedAt: '2026-07-19T00:00:00.000Z',
    }),
    orderOf({
      id: 'ORD-D',
      status: 'delivered',
      orderedAt: '2026-07-18T00:00:00.000Z',
      customer: {
        name: '박지훈',
        phone: '010-0000-0000',
        email: 'b@example.com',
        memberId: 'mem-3',
      },
    }),
  ];

  it('전체는 취소까지 포함한다', () => {
    expect(filterOrdersByStatus(list, ORDER_STATUS_ALL)).toHaveLength(4);
  });

  it('상태 필터는 취소된 주문을 빼고 센다 — 그 목록의 건수가 곧 할 일의 양이다', () => {
    expect(filterOrdersByStatus(list, 'preparing').map((order) => order.id)).toEqual(['ORD-B']);
  });

  it('취소는 자기 항목에서만 보인다', () => {
    expect(filterOrdersByStatus(list, ORDER_STATUS_CANCELED).map((order) => order.id)).toEqual([
      'ORD-C',
    ]);
  });

  it('건수 배지는 모든 키를 갖는다(집계에서 상태가 조용히 빠지지 않는다)', () => {
    const counts = countOrdersByStatus(list);
    expect(counts[ORDER_STATUS_ALL]).toBe(4);
    expect(counts.pending).toBe(1);
    expect(counts.preparing).toBe(1);
    expect(counts[ORDER_STATUS_CANCELED]).toBe(1);
    expect(counts.holding).toBe(0);
    // 상태별 합 + 취소 = 전체
    const sum = ORDER_STATUS_SEQUENCE.reduce((acc, status) => acc + counts[status], 0);
    expect(sum + counts[ORDER_STATUS_CANCELED]).toBe(counts[ORDER_STATUS_ALL]);
  });

  it('검색은 주문번호·주문자·상품명을 함께 본다', () => {
    expect(searchOrders(list, 'ORD-A').map((order) => order.id)).toEqual(['ORD-A']);
    expect(searchOrders(list, '박지훈').map((order) => order.id)).toEqual(['ORD-D']);
    expect(searchOrders(list, '패딩')).toHaveLength(4);
    expect(searchOrders(list, '   ')).toHaveLength(4);
  });

  it('두 번째 품목의 상품명으로도 찾힌다 — 첫 줄만 보면 영영 검색되지 않는다', () => {
    const two = orderOf({
      id: 'ORD-E',
      lines: [{ ...LINE }, { ...LINE, id: 'ln-2', productName: '테라 스니커즈 데일리' }],
    });
    expect(searchOrders([two], '스니커즈')).toHaveLength(1);
    expect(orderLinesSummary(two)).toBe('루미엔 경량 패딩 점퍼 외 1건');
  });

  it('최근 주문이 위다', () => {
    expect(sortOrders(list).map((order) => order.id)).toEqual(['ORD-A', 'ORD-B', 'ORD-C', 'ORD-D']);
  });

  it('일괄 처리 대상은 술어를 통과한 것만이다', () => {
    const selected = [paid({ status: 'pending' }), paid({ status: 'shipping' })];
    expect(eligibleForTransition(selected, 'preparing')).toHaveLength(1);
    expect(bulkTransitionLabel('preparing')).toBe('배송준비중 처리');
  });
});

/* ── 검증 ─────────────────────────────────────────────────────────────────── */

describe('입력 검증', () => {
  it('취소 사유는 비워 둘 수 없다', () => {
    expect(orderCancelReasonError('   ')).toBe('취소 사유를 입력하세요.');
    expect(orderCancelReasonError('고객 요청')).toBeNull();
  });

  it('처리 메모는 길이 상한을 넘지 못한다', () => {
    expect(orderNoteError('메모')).toBeNull();
    expect(orderNoteError('가'.repeat(501))).not.toBeNull();
  });
});

/* ── 주문 조회기(다른 도메인이 주문번호를 푸는 이음매) ────────────────────── */

describe('주문 조회기', () => {
  afterEach(() => {
    resetOrderLookup();
  });

  it('배선되지 않으면 null 이다 — 빈 배열이 아니다(없다 ≠ 모른다)', () => {
    resetOrderLookup();
    expect(orderCatalog()).toBeNull();
  });

  it('배선되면 주문번호로 찾을 수 있다', () => {
    registerOrderLookup(listOrderRefs);
    const catalog = orderCatalog();
    expect(catalog).not.toBeNull();
    const found = findOrderRef(catalog ?? [], 'ORD-20260712-0031');
    expect(found?.customerName).toBe('김서연');
    expect(found?.status).toBe('shipping');
    // 반품 픽스처의 orderNo 가 실재하는 주문을 가리킨다(두 모듈이 같은 사건을 말한다)
    for (const orderNo of [
      'ORD-20260712-0031',
      'ORD-20260710-0148',
      'ORD-20260708-0092',
      'ORD-20260705-0210',
      'ORD-20260703-0177',
    ]) {
      expect(orderById(catalog ?? [])[orderNo]).toBeDefined();
    }
  });

  it('모르는 번호는 null 이다 — 못 찾으면 아무거나 주지 않는다', () => {
    registerOrderLookup(listOrderRefs);
    expect(findOrderRef(orderCatalog() ?? [], 'ORD-없음')).toBeNull();
  });

  it('상세 경로는 한 곳에서만 만든다', () => {
    expect(orderDetailPath('ORD-20260712-0031')).toBe('/orders/ORD-20260712-0031');
  });
});

/* ── 어댑터 (저장 한 번이 재고까지 함께 움직인다) ─────────────────────────── */

describe('어댑터의 재고 부수효과', () => {
  const signal = new AbortController().signal;
  /** 배선된 적용기가 받은 이동을 그대로 쌓는다 — '실제로 움직였는가' 를 관찰하는 자리 */
  let moved: StockMovement[] = [];

  beforeEach(() => {
    moved = [];
    registerStockApplier((movements) => {
      moved = [...moved, ...movements];
    });
  });

  afterEach(() => {
    resetStockApplier();
    resetStockDeductAt();
  });

  it('설정 기본값은 입금 확인 시 차감이다', () => {
    expect(readStockDeductAt()).toBe('payment');
  });

  it('입금 확인 저장이 재고를 빼고 멱등 키를 못 박는다', async () => {
    const before = await orderAdapter.fetchOne('ORD-20260721-0001', signal);
    expect(before.stockAppliedAt).toBe('');

    await orderAdapter.update(before.id, toOrderInput(applyOrderPaid(before, AT, '운영자')), {
      signal,
    });

    const after = await orderAdapter.fetchOne(before.id, signal);
    expect(after.stockAppliedAt).not.toBe('');
    expect(moved.map((movement) => movement.sku)).toEqual(['CML-DNM-051-30']);
    expect(after.stockMovements).toHaveLength(1);
  });

  it('같은 주문을 다시 저장해도 재고가 또 움직이지 않는다(중복 차감 방지)', async () => {
    const applied = await orderAdapter.fetchOne('ORD-20260721-0001', signal);
    moved = [];

    await orderAdapter.update(
      applied.id,
      toOrderInput({ ...applied, adminNote: '메모만 바꾼다' }),
      { signal },
    );

    expect(moved).toHaveLength(0);
    const after = await orderAdapter.fetchOne(applied.id, signal);
    expect(after.stockMovements).toHaveLength(1);
  });

  it('취소는 이미 빠진 재고를 되돌린다', async () => {
    const target = await orderAdapter.fetchOne('ORD-20260718-0004', signal);
    moved = [];

    await orderAdapter.update(
      target.id,
      toOrderInput(applyOrderCancel(target, '재고 소진', AT, '운영자')),
      { signal },
    );

    const after = await orderAdapter.fetchOne(target.id, signal);
    expect(after.stockRestoredAt).not.toBe('');
    expect(moved.map((movement) => movement.direction)).toEqual(['in']);
    expect(moved[0]?.sku).toBe('LMN-PAD-001-차콜-L');
  });

  it("차감 시점이 '주문 즉시' 면 입금 전에도 저장이 재고를 뺀다", async () => {
    writeStockDeductAt('order');
    const target = await orderAdapter.fetchOne('ORD-20260719-0003', signal);
    moved = [];

    // 취소된 주문이라 여전히 차감하지 않는다 — 시점 설정보다 취소가 먼저다
    await orderAdapter.update(target.id, toOrderInput({ ...target, adminNote: '확인' }), {
      signal,
    });
    expect(moved).toHaveLength(0);

    const fresh = await orderAdapter.fetchOne('ORD-20260716-0005', signal);
    expect(fresh.stockAppliedAt).not.toBe('');
  });
});

/** 상태 어휘가 통계와 갈라지지 않는다 — 두 모듈이 같은 배열을 읽는다 */
describe('어휘 승격', () => {
  it('주문 상태는 7개이고 흐르는 순서대로다', () => {
    const expected: readonly OrderStatus[] = [
      'pending',
      'preparing',
      'holding',
      'waiting',
      'shipping',
      'delivered',
      'confirmed',
    ];
    expect(ORDER_STATUS_SEQUENCE).toEqual(expected);
  });
});
