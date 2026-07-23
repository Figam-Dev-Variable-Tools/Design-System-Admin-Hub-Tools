// 배송 도메인 회귀 테스트 — 송장 검증 · 중복 차단 · 부분 발송 판정 · 전이 · 택배사 조회기
//
// [무엇을 못 박는가] 이 도메인의 사고는 전부 '규칙이 두 벌이 될 때' 난다 — 화면이 커버리지를
// 따로 세거나, 주문 전이를 배송 쪽에서 다시 판정하거나, 미배선 조회기를 빈 목록으로 뭉개거나.
// 그 셋을 여기서 막는다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  activeCarriers,
  applyShipmentStatus,
  applyShippedQuantities,
  canDispatchShipment,
  carrierCatalog,
  carrierDeleteBlock,
  carrierNameOf,
  carrierUsageCount,
  duplicateInvoiceBlock,
  dispatchedShipments,
  findCarrier,
  invoiceNoBlock,
  isValidInvoiceNo,
  normalizeInvoiceNo,
  orderShipmentBlock,
  registerCarrierCatalogLookup,
  registerCarrierUsageLookup,
  resetCarrierCatalogLookup,
  resetCarrierUsageLookup,
  shipmentCoverage,
  shipmentStatusLabel,
  shipmentTransitionBlock,
  toShipmentInput,
  trackingUrl,
  uninvoicedLines,
  CARRIER_DELETE_UNKNOWN,
  INVOICE_NO_FORMAT,
  INVOICE_NO_MAX,
  INVOICE_NO_REQUIRED,
  INVOICE_NO_TOO_LONG,
  SHIPMENT_DISPATCH_NO_INVOICE,
  SHIPMENT_TRANSITION_BACKWARD,
} from './shipment';
import type { Carrier, Shipment, ShipmentStatus } from './shipment';
import { ORDER_TRANSITION_CANCELED, ORDER_TRANSITION_UNPAID } from './order';
import type { Order, OrderLine } from './order';

/* ── 픽스처 ──────────────────────────────────────────────────────────────── */

const VIRTUAL: Carrier = {
  id: 'car-1',
  name: '가상택배',
  code: 'VIRTUAL',
  trackingUrlTemplate: 'https://example.com/track?invoice={{invoice}}',
  active: true,
};

const LEGACY: Carrier = {
  id: 'car-2',
  name: '옛택배',
  code: 'LEGACY',
  trackingUrlTemplate: '',
  active: false,
};

const CARRIERS: readonly Carrier[] = [VIRTUAL, LEGACY];

function lineOf(overrides: Partial<OrderLine> = {}): OrderLine {
  return {
    id: 'ln-1',
    productId: 'prd-1',
    productName: '테스트 상품',
    sku: 'SKU-A',
    optionLabel: '단일 상품',
    unitPrice: 10000,
    quantity: 1,
    shippedQuantity: 0,
    pointRate: 0,
    ...overrides,
  };
}

function orderOf(lines: readonly OrderLine[], overrides: Partial<Order> = {}): Order {
  return {
    id: 'ORD-20260721-0001',
    orderedAt: '2026-07-21T00:00:00.000Z',
    status: 'preparing',
    customer: { name: '홍길동', phone: '010-0000-0000', email: 'a@example.com', memberId: '' },
    receiver: {
      name: '홍길동',
      phone: '010-0000-0000',
      zipCode: '00000',
      address: '서울',
      addressDetail: '',
      request: '',
    },
    lines,
    payment: {
      method: 'card',
      shippingFee: 0,
      discount: 0,
      couponDiscount: 0,
      couponName: '',
      pointUsed: 0,
      paidAt: '2026-07-21T00:01:00.000Z',
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

function shipmentOf(overrides: Partial<Shipment> = {}): Shipment {
  return {
    id: 'shp-1',
    orderId: 'ORD-20260721-0001',
    carrierId: 'car-1',
    invoiceNo: '1234567890',
    lines: [{ sku: 'SKU-A', quantity: 1 }],
    status: 'waiting',
    shippedAt: '',
    deliveredAt: '',
    ...overrides,
  };
}

afterEach(() => {
  resetCarrierCatalogLookup();
  resetCarrierUsageLookup();
});

/* ── 택배사 카탈로그 ─────────────────────────────────────────────────────── */

describe('택배사 카탈로그 — 배선 전에는 빈 목록이 아니라 null 이다', () => {
  it('미배선이면 null 을 준다 (0개와 모름은 다른 사실이다)', () => {
    expect(carrierCatalog()).toBeNull();
    expect(activeCarriers()).toBeNull();
    expect(findCarrier('car-1')).toBeNull();
  });

  it('배선되면 목록을 주고, 사용 중인 것만 고를 수 있다', () => {
    registerCarrierCatalogLookup(() => CARRIERS);
    expect(carrierCatalog()).toHaveLength(2);
    expect(activeCarriers()?.map((carrier) => carrier.id)).toEqual(['car-1']);
    expect(findCarrier('car-1')?.name).toBe('가상택배');
  });

  it('없는 택배사도 이름을 말한다 — 옛 배송 건의 열이 비지 않는다', () => {
    registerCarrierCatalogLookup(() => CARRIERS);
    expect(carrierNameOf('car-9')).toBe('알 수 없는 택배사');
  });
});

describe('추적 링크 — 링크까지만, 실시간 추적을 흉내 내지 않는다', () => {
  it('템플릿의 {{invoice}} 를 송장번호로 바꾼다', () => {
    expect(trackingUrl(VIRTUAL, ' 1234-5678 ')).toBe('https://example.com/track?invoice=1234-5678');
  });

  it('템플릿이 없으면 링크를 만들지 않는다 (죽은 링크를 그리지 않는다)', () => {
    expect(trackingUrl({ trackingUrlTemplate: '' }, '1234')).toBeNull();
  });

  it('토큰이 없는 템플릿도 링크가 아니다 — 송장을 끼울 자리가 없다', () => {
    expect(trackingUrl({ trackingUrlTemplate: 'https://example.com/track' }, '1234')).toBeNull();
  });

  it('형식이 틀린 송장번호로는 링크를 만들지 않는다', () => {
    expect(
      trackingUrl({ trackingUrlTemplate: 'https://e.com/{{invoice}}' }, '일이삼사'),
    ).toBeNull();
  });
});

describe('택배사 삭제 차단 — 배송 건이 있으면 막고, 모르면 더 막는다', () => {
  it('사용 건이 있으면 사유와 함께 막는다', () => {
    const reason = carrierDeleteBlock({ name: '가상택배' }, 3);
    expect(reason).toContain('배송 3건');
    expect(reason).toContain('삭제할 수 없어요');
  });

  it('사용 건이 없으면 통과한다 — 가드가 모든 삭제를 막아 버리지 않는다', () => {
    expect(carrierDeleteBlock({ name: '가상택배' }, 0)).toBeNull();
  });

  it('조회기가 없으면 fail-closed 로 막는다', () => {
    expect(carrierUsageCount('car-1')).toBeNull();
    expect(carrierDeleteBlock({ name: '가상택배' }, carrierUsageCount('car-1'))).toBe(
      CARRIER_DELETE_UNKNOWN,
    );
  });

  it('배선되면 실제 건수를 센다', () => {
    registerCarrierUsageLookup((carrierId) => (carrierId === 'car-1' ? 2 : 0));
    expect(carrierUsageCount('car-1')).toBe(2);
    expect(carrierUsageCount('car-2')).toBe(0);
  });
});

/* ── 송장번호 ────────────────────────────────────────────────────────────── */

describe('송장번호 검증 — 숫자·하이픈만 (규칙 3)', () => {
  it('빈 값은 사유를 말한다', () => {
    expect(invoiceNoBlock('   ')).toBe(INVOICE_NO_REQUIRED);
  });

  it('숫자와 하이픈은 통과한다', () => {
    expect(isValidInvoiceNo('1234567890')).toBe(true);
    expect(isValidInvoiceNo('1234-5678-90')).toBe(true);
  });

  it('한글·영문·공백이 섞이면 막고 이유를 말한다', () => {
    expect(invoiceNoBlock('1234 5678')).toBe(INVOICE_NO_FORMAT);
    expect(invoiceNoBlock('CJ1234')).toBe(INVOICE_NO_FORMAT);
    expect(invoiceNoBlock('일이삼')).toBe(INVOICE_NO_FORMAT);
  });

  it('하이픈으로 시작하거나 끝나면 막는다', () => {
    expect(invoiceNoBlock('-1234')).toBe(INVOICE_NO_FORMAT);
    expect(invoiceNoBlock('1234-')).toBe(INVOICE_NO_FORMAT);
  });

  it('앞뒤 공백은 떼어 내고 본다 — 붙여넣기가 가장 흔한 입력 경로다', () => {
    expect(normalizeInvoiceNo('  1234  ')).toBe('1234');
    expect(isValidInvoiceNo('  1234  ')).toBe(true);
  });

  it('상한을 넘으면 막는다', () => {
    expect(invoiceNoBlock('1'.repeat(INVOICE_NO_MAX + 1))).toBe(INVOICE_NO_TOO_LONG);
  });
});

describe('송장번호 중복 — 같은 택배사 안에서만 오입력이다 (규칙 4)', () => {
  const existing = [shipmentOf({ id: 'shp-1', orderId: 'ORD-A', invoiceNo: '1234' })];

  it('같은 택배사에 같은 번호면 막고, 어느 주문이 쓰고 있는지 말한다', () => {
    const reason = duplicateInvoiceBlock(existing, { carrierId: 'car-1', invoiceNo: '1234' });
    expect(reason).toContain('ORD-A');
  });

  it('택배사가 다르면 같은 번호를 허용한다 — 번호 체계가 택배사마다 따로다', () => {
    expect(duplicateInvoiceBlock(existing, { carrierId: 'car-2', invoiceNo: '1234' })).toBeNull();
  });

  it('자기 자신은 중복이 아니다 (수정 시 자기 번호에 걸리지 않는다)', () => {
    expect(
      duplicateInvoiceBlock(existing, { carrierId: 'car-1', invoiceNo: '1234' }, 'shp-1'),
    ).toBeNull();
  });

  it('빈 번호는 중복 판정 대상이 아니다 — 형식 검증이 먼저 잡는다', () => {
    expect(duplicateInvoiceBlock(existing, { carrierId: 'car-1', invoiceNo: '' })).toBeNull();
  });
});

/* ── 부분 발송 ───────────────────────────────────────────────────────────── */

describe('부분 발송 판정 — 전 품목이 덮여야 완료다 (규칙 2)', () => {
  const lines = [
    lineOf({ id: 'ln-1', sku: 'SKU-A', quantity: 1 }),
    lineOf({ id: 'ln-2', sku: 'SKU-B', quantity: 2 }),
  ];

  it('송장이 하나도 없으면 0/3 이고 부분도 아니다', () => {
    const coverage = shipmentCoverage(lines, []);
    expect(coverage).toMatchObject({ covered: 0, total: 3, complete: false, partial: false });
  });

  it('한 품목만 덮이면 부분이다', () => {
    const coverage = shipmentCoverage(lines, [
      shipmentOf({ lines: [{ sku: 'SKU-A', quantity: 1 }] }),
    ]);
    expect(coverage).toMatchObject({ covered: 1, total: 3, complete: false, partial: true });
  });

  it('전 품목이 덮이면 완료이고 부분이 아니다', () => {
    const coverage = shipmentCoverage(lines, [
      shipmentOf({ id: 'shp-1', lines: [{ sku: 'SKU-A', quantity: 1 }] }),
      shipmentOf({ id: 'shp-2', lines: [{ sku: 'SKU-B', quantity: 2 }] }),
    ]);
    expect(coverage).toMatchObject({ covered: 3, total: 3, complete: true, partial: false });
  });

  it('한 SKU 를 과다 입력해도 다른 품목까지 덮지 않는다', () => {
    const coverage = shipmentCoverage(lines, [
      shipmentOf({ lines: [{ sku: 'SKU-A', quantity: 99 }] }),
    ]);
    expect(coverage.covered).toBe(1);
    expect(coverage.complete).toBe(false);
  });

  it('품목이 없는 주문은 완료라고 말하지 않는다', () => {
    expect(shipmentCoverage([], []).complete).toBe(false);
  });

  it('남은 잔량만 새 송장의 대상이 된다', () => {
    const remaining = uninvoicedLines(lines, [
      shipmentOf({ lines: [{ sku: 'SKU-B', quantity: 1 }] }),
    ]);
    expect(remaining).toEqual([
      { sku: 'SKU-A', quantity: 1 },
      { sku: 'SKU-B', quantity: 1 },
    ]);
  });

  it('발송된 배송 건만 주문 품목의 출고 수량이 된다 — 배송대기는 아직 나간 것이 아니다', () => {
    const waiting = shipmentOf({ lines: [{ sku: 'SKU-A', quantity: 1 }], status: 'waiting' });
    const shipped = shipmentOf({
      id: 'shp-2',
      lines: [{ sku: 'SKU-B', quantity: 2 }],
      status: 'shipping',
      shippedAt: '2026-07-21T01:00:00.000Z',
    });
    expect(dispatchedShipments([waiting, shipped])).toHaveLength(1);
    const applied = applyShippedQuantities(lines, [waiting, shipped]);
    expect(applied.map((line) => line.shippedQuantity)).toEqual([0, 2]);
  });
});

/* ── 주문과의 다리 ───────────────────────────────────────────────────────── */

describe('주문 전이 요청 — 주문 축을 먼저 묻는다', () => {
  const lines = [lineOf({ sku: 'SKU-A', quantity: 1 })];

  it('취소된 주문은 배송이 무엇을 하든 움직이지 않는다', () => {
    const order = orderOf(lines, { canceledAt: '2026-07-21T02:00:00.000Z' });
    expect(orderShipmentBlock(order, [shipmentOf()], 'waiting')).toBe(ORDER_TRANSITION_CANCELED);
  });

  it('입금 전 주문은 송장이 붙어도 넘길 수 없다', () => {
    const order = orderOf(lines, {
      status: 'pending',
      payment: {
        method: 'vbank',
        shippingFee: 0,
        discount: 0,
        couponDiscount: 0,
        couponName: '',
        pointUsed: 0,
        paidAt: '',
      },
    });
    expect(orderShipmentBlock(order, [shipmentOf()], 'waiting')).toBe(ORDER_TRANSITION_UNPAID);
  });

  it('전 품목에 송장이 붙으면 배송대기로 넘어간다', () => {
    expect(orderShipmentBlock(orderOf(lines), [shipmentOf()], 'waiting')).toBeNull();
  });

  it('송장만 붙고 아직 안 나갔으면 배송중으로 넘어가지 못한다 (규칙 1)', () => {
    const reason = orderShipmentBlock(orderOf(lines), [shipmentOf()], 'shipping');
    expect(reason).toContain('전 품목이 발송되어야');
    expect(reason).toContain('0/1');
  });

  it('발송처리를 지나면 배송중으로 넘어간다', () => {
    const dispatched = shipmentOf({ status: 'shipping', shippedAt: '2026-07-21T01:00:00.000Z' });
    const order = orderOf(lines, { status: 'waiting' });
    expect(orderShipmentBlock(order, [dispatched], 'shipping')).toBeNull();
  });

  it('일부만 발송된 주문은 배송중이 아니다 — 부분 발송은 주문을 밀지 않는다', () => {
    const twoLines = [
      lineOf({ id: 'ln-1', sku: 'SKU-A', quantity: 1 }),
      lineOf({ id: 'ln-2', sku: 'SKU-B', quantity: 1 }),
    ];
    const dispatched = shipmentOf({
      lines: [{ sku: 'SKU-A', quantity: 1 }],
      status: 'shipping',
      shippedAt: '2026-07-21T01:00:00.000Z',
    });
    const reason = orderShipmentBlock(
      orderOf(twoLines, { status: 'waiting' }),
      [dispatched],
      'shipping',
    );
    expect(reason).toContain('1/2');
  });
});

/* ── 배송 건 전이 ────────────────────────────────────────────────────────── */

describe('배송 건 전이 — 되돌릴 수 없고, 송장 없이 나가지 않는다', () => {
  it('뒤로 가는 전이는 사유와 함께 막는다', () => {
    const shipping = shipmentOf({ status: 'shipping' });
    expect(shipmentTransitionBlock(shipping, 'waiting')).toBe(SHIPMENT_TRANSITION_BACKWARD);
    expect(shipmentTransitionBlock(shipping, 'shipping')).toBe(SHIPMENT_TRANSITION_BACKWARD);
  });

  it('송장이 없으면 발송처리할 수 없다', () => {
    const noInvoice = shipmentOf({ invoiceNo: '' });
    expect(shipmentTransitionBlock(noInvoice, 'shipping')).toBe(SHIPMENT_DISPATCH_NO_INVOICE);
    expect(canDispatchShipment(noInvoice)).toBe(false);
  });

  it('송장이 붙은 배송대기 건은 발송처리할 수 있다', () => {
    expect(canDispatchShipment(shipmentOf())).toBe(true);
  });

  it('발송처리는 상태와 시각을 함께 찍는다', () => {
    const at = '2026-07-21T05:00:00.000Z';
    const next = applyShipmentStatus(shipmentOf(), 'shipping', at);
    expect(next.status).toBe('shipping');
    expect(next.shippedAt).toBe(at);
    expect(next.deliveredAt).toBe('');
  });

  it('배송완료는 발송 시각을 덮어쓰지 않는다', () => {
    const shipped = shipmentOf({ status: 'shipping', shippedAt: '2026-07-21T05:00:00.000Z' });
    const next = applyShipmentStatus(shipped, 'delivered', '2026-07-22T05:00:00.000Z');
    expect(next.shippedAt).toBe('2026-07-21T05:00:00.000Z');
    expect(next.deliveredAt).toBe('2026-07-22T05:00:00.000Z');
  });

  it('막힌 전이를 그대로 적용하면 던진다 — 술어를 지나치지 않았다는 뜻이다', () => {
    expect(() => applyShipmentStatus(shipmentOf({ invoiceNo: '' }), 'shipping', 'now')).toThrow(
      SHIPMENT_DISPATCH_NO_INVOICE,
    );
  });

  it('상태 라벨은 주문 어휘와 같은 낱말이다', () => {
    const labels = (['waiting', 'shipping', 'delivered'] satisfies ShipmentStatus[]).map(
      shipmentStatusLabel,
    );
    expect(labels).toEqual(['배송대기', '배송중', '배송완료']);
  });

  it('쓰기 입력은 id 를 뺀 나머지를 그대로 복사한다', () => {
    const input = toShipmentInput(shipmentOf());
    expect(input).not.toHaveProperty('id');
    expect(input.lines).toEqual([{ sku: 'SKU-A', quantity: 1 }]);
  });
});
