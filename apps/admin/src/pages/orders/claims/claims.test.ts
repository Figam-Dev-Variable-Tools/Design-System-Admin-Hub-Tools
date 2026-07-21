// 클레임(취소·교환·반품) 회귀 테스트 — 전이 가드 · 환불 계산 · 복원 규칙(순수)
//   + 완료/환불완료의 부수효과(어댑터 — 재고와 적립금 원장까지 실제로 움직이는지)
//
// 예전 returns.test.ts 를 옮겨 왔다. 옮기면서 달라진 축이 셋이다: 유형에 취소가 생겼고, 상태 전이가
// 가드를 갖게 됐고, 환불이 별개의 축으로 섰다. 재고 규칙 테스트는 그대로 살아 있다 — 같은 규칙이
// 같은 이름으로 계속 지켜지는지가 이 파일의 일이다.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HTTP_STATUS, HttpError, isHttpError } from '../../../shared/errors/http-error';
import { registerOrderLookup, resetOrderLookup } from '../../../shared/domain/order-ref';
import type { OrderRef } from '../../../shared/domain/order-ref';
import {
  registerPointLedgerAppender,
  resetPointLedgerAppender,
  appendPointRestore,
} from '../../../shared/domain/point-ledger';
import type { PointRestore } from '../../../shared/domain/point-ledger';
import { registerStockApplier, resetStockApplier } from '../../../shared/domain/stock';
import { registerVariantLookup, resetVariantLookup } from '../../../shared/domain/variant-ref';
import type { VariantRef } from '../../../shared/domain/variant-ref';
import {
  policyReturnFee,
  registerReturnFeeLookup,
  resetReturnFeeLookup,
} from '../../../shared/domain/shipping-policy';
import { claimAdapter, findClaimOrder } from './data-source';
import {
  applyMovements,
  cancelBlock,
  canTransitionClaim,
  claimFlow,
  claimTransitionBlock,
  CLAIM_CANCEL_SHIPPED,
  CLAIM_NOTE_MAX,
  CLAIM_ORDER_UNKNOWN,
  CLAIM_TRANSITION_BACKWARD,
  CLAIM_TRANSITION_OFF_FLOW,
  CLAIM_TRANSITION_TERMINAL,
  CLAIM_WITHDRAW_REFUND,
  CLAIM_WITHDRAW_STOCK,
  filterByStatus,
  findVariant,
  hasInlineErrorSlot,
  isClaimStatus,
  isFieldRejection,
  isStockApplied,
  isTerminal,
  kindLabel,
  kindTone,
  movesStock,
  nextClaimStatuses,
  optionLabel,
  placeViolations,
  planStockMovements,
  searchClaims,
  sortClaims,
  statusLabel,
  statusMeta,
  stockIssueMessage,
  toClaimInput,
  validateStockPlan,
} from './types';
import type { Claim, StockMovement } from './types';
import {
  canTransitionRefund,
  defaultReturnFee,
  isRefundable,
  isRefundStatus,
  NO_REFUND,
  parseFeeInput,
  planRefundRestoration,
  refundActionBlock,
  refundBreakdown,
  refundCellMeta,
  refundStatusLabel,
  refundStatusTone,
  refundTransitionBlock,
  restoreReason,
  REFUND_CLAIM_CLOSED,
  REFUND_FEE_INVALID,
  REFUND_CLAIM_INCOMPLETE,
  REFUND_NOT_REFUNDABLE,
  REFUND_NO_MEMBER,
  REFUND_TRANSITION_BACKWARD,
  REFUND_TRANSITION_DONE,
  REFUND_UNSAVED_CLAIM,
} from './refund';
import type { ClaimRefund } from './refund';

const AT = '2026-07-16T00:00:00.000Z';

/** 색상×사이즈 2축 SKU — 상품 픽스처(prd-1)와 같은 모양 */
const variants: readonly VariantRef[] = [
  { id: 'v1', sku: 'P-블랙-M', optionValues: ['블랙', 'M'], stock: 8 },
  { id: 'v2', sku: 'P-블랙-L', optionValues: ['블랙', 'L'], stock: 3 },
  { id: 'v3', sku: 'P-베이지-M', optionValues: ['베이지', 'M'], stock: 0 },
];

function refundOf(overrides: Partial<ClaimRefund> = {}): ClaimRefund {
  return { ...NO_REFUND, ...overrides };
}

function claimOf(overrides: Partial<Claim> & { id: string }): Claim {
  return {
    orderId: 'ORD-1',
    productId: 'prd-1',
    productName: '상품',
    customer: '김**',
    memberId: 'mem-1',
    kind: 'exchange',
    optionValues: ['블랙', 'M'],
    exchangeOptionValues: [],
    reason: '사이즈 교환',
    reasonDetail: '',
    quantity: 1,
    requestedAt: '2026-07-12',
    status: 'requested',
    stockAppliedAt: '',
    stockMovements: [],
    refund: NO_REFUND,
    adminNote: '',
    ...overrides,
  };
}

function orderOf(overrides: Partial<OrderRef> = {}): OrderRef {
  return {
    id: 'ORD-1',
    orderedAt: '2026-07-10T00:00:00.000Z',
    status: 'preparing',
    customerName: '김서연',
    total: 79000,
    canceled: false,
    ...overrides,
  };
}

describe('유형 · 상태 어휘(순수)', () => {
  it('취소가 유형에 있다 — 예전 모델에는 없어서 대시보드의 취소관리가 갈 곳이 없었다', () => {
    expect(kindLabel('cancel')).toBe('취소');
    expect(kindLabel('exchange')).toBe('교환');
    expect(kindLabel('return')).toBe('반품');
  });
  it('유형마다 다른 배지 색을 준다', () => {
    expect(kindTone('cancel')).toBe('danger');
    expect(kindTone('exchange')).toBe('info');
    expect(kindTone('return')).toBe('warning');
  });
  it('취소 흐름에는 수거·검수가 없다 — 물건이 아직 창고에 있다', () => {
    expect(claimFlow('cancel')).toEqual(['requested', 'completed']);
    expect(claimFlow('return')).toEqual(['requested', 'collecting', 'inspecting', 'completed']);
  });
  it('완료·반려·철회는 종료 상태다', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('rejected')).toBe(true);
    expect(isTerminal('withdrawn')).toBe(true);
    expect(isTerminal('collecting')).toBe(false);
  });
  it('상태 타입가드는 모르는 문자열을 거른다(as 캐스팅 대신)', () => {
    expect(isClaimStatus('withdrawn')).toBe(true);
    expect(isClaimStatus('refunded')).toBe(false);
    expect(isClaimStatus(3)).toBe(false);
  });
  it('상태마다 라벨과 색을 갖는다', () => {
    expect(statusLabel('withdrawn')).toBe('철회');
    expect(statusMeta('completed').tone).toBe('success');
  });
});

describe('클레임 전이 가드(순수) — 버튼과 저장이 같은 술어를 읽는다', () => {
  const order = orderOf();

  it('접수 → 수거중은 흐른다', () => {
    expect(claimTransitionBlock(claimOf({ id: 'a' }), 'collecting', order)).toBeNull();
    expect(canTransitionClaim(claimOf({ id: 'a' }), 'collecting', order)).toBe(true);
  });
  it('되돌리는 전이는 사유와 함께 막는다', () => {
    const claim = claimOf({ id: 'a', status: 'inspecting' });
    expect(claimTransitionBlock(claim, 'collecting', order)).toBe(CLAIM_TRANSITION_BACKWARD);
  });
  it('종료된 클레임은 더 움직이지 않는다', () => {
    const claim = claimOf({ id: 'a', status: 'completed' });
    expect(claimTransitionBlock(claim, 'rejected', order)).toBe(CLAIM_TRANSITION_TERMINAL);
  });
  it('취소 클레임에는 수거·검수 단계가 없다', () => {
    const claim = claimOf({ id: 'a', kind: 'cancel' });
    expect(claimTransitionBlock(claim, 'collecting', order)).toBe(CLAIM_TRANSITION_OFF_FLOW);
  });
  it('반려는 어느 단계에서나 낼 수 있다 — 출고된 취소 건도 종료는 시켜야 한다', () => {
    const claim = claimOf({ id: 'a', kind: 'cancel' });
    expect(claimTransitionBlock(claim, 'rejected', orderOf({ status: 'shipping' }))).toBeNull();
  });
  it('지금 갈 수 있는 상태만 선택지로 연다', () => {
    expect(nextClaimStatuses(claimOf({ id: 'a', kind: 'cancel' }), order)).toEqual([
      'completed',
      'rejected',
      'withdrawn',
    ]);
  });
});

describe('취소는 출고 전에만 처리된다(순수)', () => {
  it('배송 전 주문은 취소할 수 있다', () => {
    expect(cancelBlock(orderOf({ status: 'waiting' }))).toBeNull();
  });
  it('배송이 시작되면 취소가 아니라 반품이다', () => {
    expect(cancelBlock(orderOf({ status: 'shipping' }))).toBe(CLAIM_CANCEL_SHIPPED);
    expect(cancelBlock(orderOf({ status: 'delivered' }))).toBe(CLAIM_CANCEL_SHIPPED);
  });
  it('주문을 모르면 막는다 — 모르는 채로 취소를 완료하지 않는다(fail-closed)', () => {
    expect(cancelBlock(null)).toBe(CLAIM_ORDER_UNKNOWN);
    const claim = claimOf({ id: 'a', kind: 'cancel' });
    expect(claimTransitionBlock(claim, 'completed', null)).toBe(CLAIM_ORDER_UNKNOWN);
  });
  it('출고된 주문의 취소 완료는 사유와 함께 막힌다', () => {
    const claim = claimOf({ id: 'a', kind: 'cancel' });
    expect(claimTransitionBlock(claim, 'completed', orderOf({ status: 'shipping' }))).toBe(
      CLAIM_CANCEL_SHIPPED,
    );
  });
});

describe('철회 — 접수를 되돌리는 유일한 역방향 전이(순수)', () => {
  const order = orderOf();

  it('아직 아무것도 일어나지 않았으면 철회할 수 있다', () => {
    expect(claimTransitionBlock(claimOf({ id: 'a' }), 'withdrawn', order)).toBeNull();
  });
  it('재고가 이미 반영됐으면 막고 이유를 말한다 — 반영된 재고는 되돌아가지 않는다', () => {
    const claim = claimOf({ id: 'a', status: 'inspecting', stockAppliedAt: AT });
    expect(claimTransitionBlock(claim, 'withdrawn', order)).toBe(CLAIM_WITHDRAW_STOCK);
  });
  it('환불이 접수됐으면 막는다', () => {
    const claim = claimOf({ id: 'a', kind: 'return', refund: refundOf({ status: 'requested' }) });
    expect(claimTransitionBlock(claim, 'withdrawn', order)).toBe(CLAIM_WITHDRAW_REFUND);
  });
});

describe('환불 상태 어휘(순수)', () => {
  it('환불 상태 타입가드', () => {
    expect(isRefundStatus('completed')).toBe(true);
    expect(isRefundStatus('refunded')).toBe(false);
  });
  it('교환은 환불 대상이 아니다', () => {
    expect(isRefundable('exchange')).toBe(false);
    expect(isRefundable('cancel')).toBe(true);
    expect(isRefundable('return')).toBe(true);
  });
  it('목록의 환불 열 — 교환은 없는 일과 안 한 일을 가른다', () => {
    expect(refundCellMeta(claimOf({ id: 'a', kind: 'exchange' })).label).toBe('해당 없음');
    expect(refundCellMeta(claimOf({ id: 'a', kind: 'return' })).label).toBe('환불 없음');
  });
  it('상태마다 라벨과 색을 갖는다', () => {
    expect(refundStatusLabel('requested')).toBe('환불 접수');
    expect(refundStatusTone('completed')).toBe('success');
  });
});

describe('환불액 계산(순수) — 결제액 − 반품배송비 − 회수 쿠폰분', () => {
  it('차감이 없으면 결제액 그대로다', () => {
    expect(refundBreakdown(refundOf({ paidAmount: 79000 })).total).toBe(79000);
  });
  it('반품배송비를 뺀다', () => {
    const breakdown = refundBreakdown(refundOf({ paidAmount: 79000, returnShippingFee: 3000 }));
    expect(breakdown.total).toBe(76000);
    expect(breakdown.returnShippingFee).toBe(3000);
  });
  it('쿠폰을 복원하면 그 할인액을 회수한다 — 안 그러면 고객이 할인과 쿠폰을 둘 다 갖는다', () => {
    const refund = refundOf({ paidAmount: 52150, couponDiscount: 5000, couponRestored: true });
    expect(refundBreakdown(refund).couponClawback).toBe(5000);
    expect(refundBreakdown(refund).total).toBe(47150);
  });
  it('쿠폰을 복원하지 않으면 회수하지 않는다', () => {
    const refund = refundOf({ paidAmount: 52150, couponDiscount: 5000, couponRestored: false });
    expect(refundBreakdown(refund).couponClawback).toBe(0);
    expect(refundBreakdown(refund).total).toBe(52150);
  });
  it('차감이 결제액을 넘겨도 0 아래로 내려가지 않는다 — 고객에게 청구하지는 않는다', () => {
    expect(refundBreakdown(refundOf({ paidAmount: 1000, returnShippingFee: 3000 })).total).toBe(0);
  });
});

describe('반품배송비 기본값(순수)', () => {
  it('취소는 언제나 0 — 되돌아오는 물건이 없다', () => {
    expect(defaultReturnFee('cancel', 3000)).toBe(0);
  });
  it('반품·교환은 배송 정책의 값을 쓴다', () => {
    expect(defaultReturnFee('return', 3000)).toBe(3000);
  });
  it('정책을 모르면 0이 아니라 모른다고 말한다 — 조용히 덜 빼는 쪽으로 틀리지 않는다', () => {
    expect(defaultReturnFee('return', null)).toBeNull();
  });
  it('차감 입력은 원 단위 정수만 받는다', () => {
    expect(parseFeeInput('3000')).toBe(3000);
    expect(parseFeeInput(' 0 ')).toBe(0);
    expect(parseFeeInput('')).toBeNull();
    expect(parseFeeInput('3,000')).toBeNull();
    expect(parseFeeInput('-100')).toBeNull();
    expect(parseFeeInput('2.5')).toBeNull();
  });
});

describe('배송 정책 조회기(배선)', () => {
  afterEach(() => {
    resetReturnFeeLookup();
  });

  it('배선 전에는 모른다(null)', () => {
    expect(policyReturnFee()).toBeNull();
  });
  it('배선하면 정책값을 준다', () => {
    registerReturnFeeLookup(() => 3000);
    expect(policyReturnFee()).toBe(3000);
  });
  it('음수·NaN 같은 값은 흘려보내지 않는다 — 환불액이 결제액보다 커진다', () => {
    registerReturnFeeLookup(() => -1);
    expect(policyReturnFee()).toBeNull();
    registerReturnFeeLookup(() => Number.NaN);
    expect(policyReturnFee()).toBeNull();
  });
});

describe('환불 전이 가드(순수)', () => {
  it('접수 → 완료로 흐른다(클레임이 완료된 뒤)', () => {
    const claim = claimOf({
      id: 'a',
      kind: 'return',
      status: 'completed',
      refund: refundOf({ status: 'requested' }),
    });
    expect(refundTransitionBlock(claim, 'completed')).toBeNull();
    expect(canTransitionRefund(claim, 'completed')).toBe(true);
  });
  it('클레임이 완료되기 전에는 환불을 완료할 수 없다 — 두 축은 나란하되 순서가 있다', () => {
    const claim = claimOf({
      id: 'a',
      kind: 'return',
      status: 'inspecting',
      refund: refundOf({ status: 'requested' }),
    });
    expect(refundTransitionBlock(claim, 'completed')).toBe(REFUND_CLAIM_INCOMPLETE);
  });
  it('클레임 완료 ≠ 환불 완료 — 완료된 클레임의 환불이 아직 none 일 수 있다', () => {
    const claim = claimOf({ id: 'a', kind: 'return', status: 'completed' });
    expect(claim.refund.status).toBe('none');
    expect(refundTransitionBlock(claim, 'requested')).toBeNull();
  });
  it('교환은 환불 대상이 아니다', () => {
    const claim = claimOf({ id: 'a', kind: 'exchange' });
    expect(refundTransitionBlock(claim, 'requested')).toBe(REFUND_NOT_REFUNDABLE);
  });
  it('반려·철회된 클레임은 환불하지 않는다', () => {
    const claim = claimOf({ id: 'a', kind: 'return', status: 'rejected' });
    expect(refundTransitionBlock(claim, 'requested')).toBe(REFUND_CLAIM_CLOSED);
  });
  it('완료된 환불은 되돌릴 수 없다', () => {
    const claim = claimOf({
      id: 'a',
      kind: 'return',
      status: 'completed',
      refund: refundOf({ status: 'completed', completedAt: AT }),
    });
    expect(refundTransitionBlock(claim, 'requested')).toBe(REFUND_TRANSITION_DONE);
  });
  it('접수를 건너뛰어 되돌아가는 방향도 막는다', () => {
    const claim = claimOf({
      id: 'a',
      kind: 'return',
      status: 'completed',
      refund: refundOf({ status: 'requested' }),
    });
    expect(refundTransitionBlock(claim, 'none')).toBe(REFUND_TRANSITION_BACKWARD);
  });
  it('적립금을 쓴 비회원 주문은 복원할 원장이 없어 완료할 수 없다', () => {
    const claim = claimOf({
      id: 'a',
      kind: 'cancel',
      status: 'completed',
      memberId: '',
      refund: refundOf({ status: 'requested', pointUsed: 1000 }),
    });
    expect(refundTransitionBlock(claim, 'completed')).toBe(REFUND_NO_MEMBER);
  });
});

/**
 * [결함 1 회귀] 환불 버튼의 잠금 조건과 환불 저장의 거절 조건은 **같은 값**을 읽어야 한다.
 *
 * 예전에는 버튼이 폼의 드래프트 상태로 판정하고 저장은 저장된 상태를 보냈다 — 상태 select 만
 * '완료'로 바꿔 두면 버튼이 열리고 어댑터가 REFUND_CLAIM_INCOMPLETE 422 로 거절했다.
 * 이 describe 가 고정하는 것은 한 문장이다: **null 을 돌려준 경우에만 저장이 통과한다.**
 */
describe('환불 버튼의 잠금 = 저장의 거절(순수) — 결함 1 회귀', () => {
  const ready = claimOf({
    id: 'a',
    kind: 'return',
    status: 'completed',
    refund: refundOf({ status: 'requested', paidAmount: 79000 }),
  });

  it('저장하지 않은 처리 상태 변경으로는 열리지 않는다 — 저장은 저장된 상태를 보낸다', () => {
    const midway = claimOf({
      id: 'a',
      kind: 'return',
      status: 'inspecting',
      refund: refundOf({ status: 'requested' }),
    });
    // 화면에서 '완료'를 골랐지만 아직 저장하지 않은 상태 = claimDirty
    expect(refundActionBlock(midway, 'completed', true)).toBe(REFUND_UNSAVED_CLAIM);
    // 드래프트를 읽던 예전 판정(저장된 상태를 '완료'로 바꿔 물어보기)은 열려 있었다
    expect(refundTransitionBlock({ ...midway, status: 'completed' }, 'completed')).toBeNull();
  });

  it('편집이 없으면 저장된 상태의 진짜 사유를 그대로 말한다 — 안내를 지어내지 않는다', () => {
    const midway = claimOf({
      id: 'a',
      kind: 'return',
      status: 'inspecting',
      refund: refundOf({ status: 'requested' }),
    });
    expect(refundActionBlock(midway, 'completed', false)).toBe(REFUND_CLAIM_INCOMPLETE);
  });

  it('클레임이 완료돼 있고 편집이 없으면 열린다 — 게이팅이 정상 경로를 막지 않는다', () => {
    expect(refundActionBlock(ready, 'completed', false)).toBeNull();
  });

  it('완료할 수 있는 건이라도 저장되지 않은 편집이 남아 있으면 먼저 저장을 요구한다', () => {
    // 그 편집(메모·교환 옵션)은 환불 저장의 patch 에 실리지 않아 조용히 사라진다
    expect(refundActionBlock(ready, 'completed', true)).toBe(REFUND_UNSAVED_CLAIM);
  });

  it('환불 접수도 같은 규약을 따른다', () => {
    const fresh = claimOf({ id: 'a', kind: 'return', status: 'inspecting' });
    expect(refundActionBlock(fresh, 'requested', false)).toBeNull();
    expect(refundActionBlock(fresh, 'requested', true)).toBe(REFUND_UNSAVED_CLAIM);
  });

  it('영구적인 거절 사유는 미저장 안내로 덮이지 않는다 — 저장해도 열리지 않는다', () => {
    const closed = claimOf({ id: 'a', kind: 'return', status: 'rejected' });
    expect(refundActionBlock(closed, 'requested', true)).toBe(REFUND_CLAIM_CLOSED);

    const done = claimOf({
      id: 'a',
      kind: 'return',
      status: 'completed',
      refund: refundOf({ status: 'completed', completedAt: AT }),
    });
    expect(refundActionBlock(done, 'requested', true)).toBe(REFUND_TRANSITION_DONE);
  });
});

/**
 * [결함 2 회귀] 422 를 그리는 자리는 교환 옵션 필드 하나뿐이다 — 그 자리가 없으면 배너로 가야 한다.
 * 예전에는 화면이 무조건 인라인으로만 보내, 취소·반품에서는 실패가 어디에도 뜨지 않았다.
 */
describe('422 를 그리는 자리(순수) — 결함 2 회귀', () => {
  it('교환 옵션 위반은 그 필드가 화면에 떠 있을 때만 인라인이다', () => {
    expect(hasInlineErrorSlot('exchangeOptionValues', true)).toBe(true);
    // 재고 반영 완료·옵션 조회 실패·확인 다이얼로그 뒤 — 자리가 없거나 가려진 경우
    expect(hasInlineErrorSlot('exchangeOptionValues', false)).toBe(false);
  });

  it('어댑터가 내는 나머지 위반에는 인라인 자리가 없다 — 전부 배너로 간다', () => {
    for (const field of ['status', 'refundStatus', 'returnShippingFee', 'optionValues']) {
      expect(hasInlineErrorSlot(field, true)).toBe(false);
    }
  });

  it('필드를 지목하지 않는 422 도 배너로 간다 — 조용히 사라지지 않는다', () => {
    expect(hasInlineErrorSlot(undefined, true)).toBe(false);
  });
});

/**
 * [결함 b·c 회귀] 위반이 여럿이어도 하나도 버리지 않는다 · 400 도 422 와 같은 길로 간다.
 *
 * 예전 화면은 `violations[0]` 만 읽었다 — 나머지는 조용히 사라져, 하나를 고치고 다시 저장하면
 * 또 실패하는 경험이 됐다. 그리고 400 은 이 경로 자체를 타지 않아, 서버가 `error.fields` 로
 * 어느 칸이 틀렸는지 알려 주는데도 '요청이 올바르지 않습니다' 한 줄만 남았다.
 */
describe('위반 배치(순수) — 결함 b·c 회귀', () => {
  const violations = [
    { field: 'exchangeOptionValues', message: '교환 옵션 재고가 부족합니다.' },
    { field: 'status', message: '되돌리는 전이는 할 수 없습니다.' },
    { field: 'returnShippingFee', message: '차감을 바꿀 수 없습니다.' },
  ];

  it('인라인 자리가 열려 있으면 그 필드만 인라인, 나머지는 전부 배너로 간다', () => {
    const placed = placeViolations(violations, '폴백', true);
    expect(placed.inline).toBe('교환 옵션 재고가 부족합니다.');
    // 남은 둘이 **둘 다** 배너에 있다 — 예전에는 첫 위반 하나만 살아남았다
    expect(placed.banner).toBe('되돌리는 전이는 할 수 없습니다. 차감을 바꿀 수 없습니다.');
  });

  it('인라인 자리가 없으면(취소·반품·모달 뒤) 셋 다 배너로 수렴한다', () => {
    const placed = placeViolations(violations, '폴백', false);
    expect(placed.inline).toBeNull();
    for (const violation of violations) {
      expect(placed.banner).toContain(violation.message);
    }
  });

  it('필드를 지목하지 않은 거절은 서버 문구가 유일한 설명이다 — 침묵하지 않는다', () => {
    expect(placeViolations([], '요청이 올바르지 않습니다.', true)).toEqual({
      inline: null,
      banner: '요청이 올바르지 않습니다.',
    });
  });

  it('같은 필드에 위반이 둘이면 그 자리에 둘 다 쓴다 — 하나를 골라 버리지 않는다', () => {
    const placed = placeViolations(
      [
        { field: 'exchangeOptionValues', message: '옵션을 고르세요.' },
        { field: 'exchangeOptionValues', message: '재고가 부족합니다.' },
      ],
      '폴백',
      true,
    );
    expect(placed.inline).toBe('옵션을 고르세요. 재고가 부족합니다.');
    expect(placed.banner).toBeNull();
  });

  it('400 과 422 를 한 갈래로 센다 — 원인은 달라도 화면이 하는 일이 같다', () => {
    expect(isFieldRejection(new HttpError(HTTP_STATUS.badRequest, '형식 위반'))).toBe(true);
    expect(isFieldRejection(new HttpError(HTTP_STATUS.unprocessable, '규칙 위반'))).toBe(true);
    // 재시도·재인증·목록복귀로 푸는 실패는 이 길이 아니다
    expect(isFieldRejection(new HttpError(HTTP_STATUS.conflict, '충돌'))).toBe(false);
    expect(isFieldRejection(new HttpError(HTTP_STATUS.serverError, '장애'))).toBe(false);
    expect(isFieldRejection(new Error('status 없는 실패'))).toBe(false);
  });
});

describe('복원 계획(순수) — 환불완료에서만, 한 번만', () => {
  it('쓴 적립금만큼 양수로 복원한다', () => {
    const claim = claimOf({ id: 'a', kind: 'return', refund: refundOf({ pointUsed: 3000 }) });
    expect(planRefundRestoration(claim).point).toBe(3000);
  });
  it('이미 완료된 환불은 다시 복원하지 않는다(멱등 키) — 원장은 되돌릴 수 없다', () => {
    const claim = claimOf({
      id: 'a',
      kind: 'return',
      refund: refundOf({ pointUsed: 3000, status: 'completed', completedAt: AT }),
    });
    expect(planRefundRestoration(claim).point).toBe(0);
  });
  it('비회원은 복원할 원장이 없다', () => {
    const claim = claimOf({
      id: 'a',
      kind: 'cancel',
      memberId: '',
      refund: refundOf({ pointUsed: 1000 }),
    });
    expect(planRefundRestoration(claim).point).toBe(0);
  });
  it('쿠폰은 복원하기로 한 경우에만 되돌린다', () => {
    const restored = planRefundRestoration(
      claimOf({
        id: 'a',
        kind: 'cancel',
        refund: refundOf({ couponDiscount: 5000, couponName: '여름쿠폰', couponRestored: true }),
      }),
    );
    expect(restored).toMatchObject({ coupon: true, couponName: '여름쿠폰' });

    const kept = planRefundRestoration(
      claimOf({
        id: 'a',
        kind: 'cancel',
        refund: refundOf({ couponDiscount: 5000, couponName: '여름쿠폰' }),
      }),
    );
    expect(kept.coupon).toBe(false);
  });
  it('원장 사유는 유형을 밝힌다 — 원장만 보고도 무엇이 돌려준 것인지 안다', () => {
    expect(restoreReason('cancel')).toContain('주문 취소');
    expect(restoreReason('return')).toContain('반품');
  });
});

describe('적립금 원장 기입기(배선)', () => {
  afterEach(() => {
    resetPointLedgerAppender();
  });

  const entry: PointRestore = {
    memberId: 'mem-1',
    orderNo: 'ORD-1',
    reason: '반품 환불 적립금 복원',
    amount: 3000,
    date: '2026-07-16',
  };

  it('배선 전에는 기입했다고 말하지 않는다 — 조용한 성공이 가장 위험하다', () => {
    expect(appendPointRestore(entry)).toBe(false);
  });
  it('0원은 기입할 것이 없으므로 성공이다 — 아무 일 없음과 실패는 다르다', () => {
    expect(appendPointRestore({ ...entry, amount: 0 })).toBe(true);
  });
  it('음수는 통로 자체가 없다 — 복원이 차감으로 둔갑하지 않는다', () => {
    expect(() => appendPointRestore({ ...entry, amount: -1 })).toThrow();
  });
  it('배선하면 원장에 그대로 덧붙는다', () => {
    const ledger: PointRestore[] = [];
    registerPointLedgerAppender((next) => ledger.push(next));
    expect(appendPointRestore(entry)).toBe(true);
    expect(ledger).toEqual([entry]);
  });
});

describe('옵션 표기 · SKU 조회(순수)', () => {
  it('옵션 조합은 슬래시로 잇는다', () => {
    expect(optionLabel(['블랙', 'M'])).toBe('블랙 / M');
  });
  it('옵션 없는 상품은 단일 상품으로 표기한다', () => {
    expect(optionLabel([])).toBe('단일 상품');
  });
  it('값과 순서가 모두 같아야 같은 SKU 다', () => {
    expect(findVariant(variants, ['블랙', 'M'])?.sku).toBe('P-블랙-M');
    expect(findVariant(variants, ['M', '블랙'])).toBeUndefined();
    expect(findVariant(variants, ['블랙'])).toBeUndefined();
  });
});

describe('재고 반영 판정(순수)', () => {
  it('완료 상태에서만 재고가 움직인다', () => {
    expect(movesStock({ kind: 'return', status: 'completed' })).toBe(true);
    expect(movesStock({ kind: 'return', status: 'inspecting' })).toBe(false);
    expect(movesStock({ kind: 'return', status: 'rejected' })).toBe(false);
  });
  it('취소는 완료여도 재고를 건드리지 않는다 — 복원은 주문 취소가 한다(두 번 되돌리지 않기 위해)', () => {
    expect(movesStock({ kind: 'cancel', status: 'completed' })).toBe(false);
    expect(planStockMovements(claimOf({ id: 'a', kind: 'cancel' }), variants, AT)).toEqual([]);
    expect(validateStockPlan(claimOf({ id: 'a', kind: 'cancel' }), variants)).toBeNull();
  });
  it('stockAppliedAt 이 있으면 이미 반영된 클레임이다(중복 반영 방지 키)', () => {
    expect(isStockApplied({ stockAppliedAt: '' })).toBe(false);
    expect(isStockApplied({ stockAppliedAt: AT })).toBe(true);
  });
});

describe('교환/반품 재고 유효성(순수)', () => {
  it('반품은 주문 옵션만 있으면 통과한다', () => {
    expect(validateStockPlan(claimOf({ id: 'a', kind: 'return' }), variants)).toBeNull();
  });
  it('주문 옵션이 상품에 없으면 입고 대상을 못 찾는다', () => {
    const claim = claimOf({ id: 'a', kind: 'return', optionValues: ['없는색', 'M'] });
    expect(validateStockPlan(claim, variants)).toBe('unknown-origin');
  });
  it('교환인데 옵션 미선택이면 막는다', () => {
    expect(validateStockPlan(claimOf({ id: 'a' }), variants)).toBe('no-option');
  });
  it('교환 옵션이 상품에 없으면 막는다', () => {
    const claim = claimOf({ id: 'a', exchangeOptionValues: ['없는색', 'L'] });
    expect(validateStockPlan(claim, variants)).toBe('unknown-option');
  });
  it('교환 옵션 재고가 수량보다 적으면 교환 불가다', () => {
    const claim = claimOf({ id: 'a', exchangeOptionValues: ['베이지', 'M'] });
    expect(validateStockPlan(claim, variants)).toBe('insufficient-stock');
  });
  it('재고가 수량과 같으면 통과한다(경계)', () => {
    const claim = claimOf({ id: 'a', exchangeOptionValues: ['블랙', 'L'], quantity: 3 });
    expect(validateStockPlan(claim, variants)).toBeNull();
  });
  it('재고가 수량보다 하나 모자라면 막는다(경계)', () => {
    const claim = claimOf({ id: 'a', exchangeOptionValues: ['블랙', 'L'], quantity: 4 });
    expect(validateStockPlan(claim, variants)).toBe('insufficient-stock');
  });
  it('위반마다 다른 복구 안내를 준다', () => {
    expect(stockIssueMessage('no-option')).toContain('선택');
    expect(stockIssueMessage('insufficient-stock')).toContain('재고');
  });
});

describe('재고 이동 계획(순수)', () => {
  it('반품은 회수분 입고 한 건이다', () => {
    const moves = planStockMovements(claimOf({ id: 'a', kind: 'return' }), variants, AT);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ direction: 'in', sku: 'P-블랙-M', quantity: 1 });
  });
  it('교환은 회수분 입고 + 재발송분 출고 두 건이다', () => {
    const claim = claimOf({ id: 'a', exchangeOptionValues: ['블랙', 'L'] });
    const moves = planStockMovements(claim, variants, AT);
    expect(moves.map((move) => [move.direction, move.sku, move.quantity])).toEqual([
      ['in', 'P-블랙-M', 1],
      ['out', 'P-블랙-L', 1],
    ]);
  });
  it('수량이 여러 개면 그만큼 움직인다', () => {
    const claim = claimOf({ id: 'a', kind: 'return', quantity: 2 });
    expect(planStockMovements(claim, variants, AT)[0]?.quantity).toBe(2);
  });
  it('이동에는 그 시점의 옵션 표기가 스냅숏으로 남는다', () => {
    const moves = planStockMovements(claimOf({ id: 'a', kind: 'return' }), variants, AT);
    expect(moves[0]?.optionLabel).toBe('블랙 / M');
    expect(moves[0]?.at).toBe(AT);
  });
});

describe('재고 이동 적용(순수)', () => {
  const moves: readonly StockMovement[] = [
    { id: 'm1', at: AT, direction: 'in', sku: 'P-블랙-M', optionLabel: '블랙 / M', quantity: 1 },
    { id: 'm2', at: AT, direction: 'out', sku: 'P-블랙-L', optionLabel: '블랙 / L', quantity: 1 },
  ];

  it('입고는 더하고 출고는 뺀다', () => {
    const next = applyMovements(variants, moves);
    expect(next.find((v) => v.sku === 'P-블랙-M')?.stock).toBe(9);
    expect(next.find((v) => v.sku === 'P-블랙-L')?.stock).toBe(2);
  });
  it('이동이 없는 SKU 는 그대로 둔다(참조까지 보존)', () => {
    const next = applyMovements(variants, moves);
    expect(next.find((v) => v.sku === 'P-베이지-M')).toBe(variants[2]);
  });
  it('같은 옵션으로의 교환은 입고·출고가 상쇄된다', () => {
    const claim = claimOf({ id: 'a', exchangeOptionValues: ['블랙', 'M'] });
    const next = applyMovements(variants, planStockMovements(claim, variants, AT));
    expect(next.find((v) => v.sku === 'P-블랙-M')?.stock).toBe(8);
  });
  it('재고를 음수로 만들지 않는다', () => {
    const over: readonly StockMovement[] = [
      {
        id: 'm3',
        at: AT,
        direction: 'out',
        sku: 'P-블랙-L',
        optionLabel: '블랙 / L',
        quantity: 99,
      },
    ];
    expect(applyMovements(variants, over).find((v) => v.sku === 'P-블랙-L')?.stock).toBe(0);
  });
});

describe('필터 · 검색 · 정렬 · 입력 변환(순수)', () => {
  const list: readonly Claim[] = [
    claimOf({ id: 'a', status: 'requested', requestedAt: '2026-07-10', orderId: 'ORD-A' }),
    claimOf({ id: 'b', status: 'completed', requestedAt: '2026-07-12', productName: '가나다' }),
  ];

  it('상태 필터 — 전체면 그대로', () => {
    expect(filterByStatus(list, 'all')).toHaveLength(2);
    expect(filterByStatus(list, 'completed').map((c) => c.id)).toEqual(['b']);
  });
  it('주문번호·상품·신청자 검색', () => {
    expect(searchClaims(list, 'ord-a').map((c) => c.id)).toEqual(['a']);
    expect(searchClaims(list, '가나').map((c) => c.id)).toEqual(['b']);
  });
  it('접수일 내림차순 정렬', () => {
    expect(sortClaims(list).map((c) => c.id)).toEqual(['b', 'a']);
  });
  it('toClaimInput 은 id 를 뺀다', () => {
    expect(toClaimInput(claimOf({ id: 'a' }))).not.toHaveProperty('id');
  });
  it('toClaimInput 은 옵션·이동·환불을 복사한다(원본 공유 금지)', () => {
    const claim = claimOf({ id: 'a', optionValues: ['블랙', 'M'] });
    const input = toClaimInput(claim);
    expect(input.optionValues).not.toBe(claim.optionValues);
    expect(input.refund).not.toBe(claim.refund);
    expect(input.optionValues).toEqual(['블랙', 'M']);
  });
});

/**
 * 부수효과 (G) — 어댑터 경계에서 확인한다. 백엔드가 없으므로 어댑터가 이 전이들의 정본이고,
 * 재고 적용기와 적립금 원장이 **실제로** 움직여야 한다. 픽스처는 모듈 상태라 순서에 의존한다.
 *
 * 상품 재고와 회원 원장의 정본은 다른 도메인이다 — 여기서는 조회기/적용기 자리에 테스트용 구현을
 * 꽂아 그 경계까지만 확인한다(앱에서는 src/wiring.ts 가 진짜를 꽂는다).
 */
describe('완료 · 환불완료의 부수효과(어댑터)', () => {
  const signal = new AbortController().signal;

  /** 상품 픽스처의 SKU 구성 — 재고 수치는 아래 stock 이 들고 매 테스트마다 초기화된다 */
  const PRODUCT_SKUS: Readonly<
    Record<
      string,
      readonly {
        readonly id: string;
        readonly sku: string;
        readonly optionValues: readonly string[];
      }[]
    >
  > = {
    'prd-1': [
      { id: 'p1-a', sku: 'LMN-PAD-001-블랙-M', optionValues: ['블랙', 'M'] },
      { id: 'p1-b', sku: 'LMN-PAD-001-블랙-L', optionValues: ['블랙', 'L'] },
      { id: 'p1-c', sku: 'LMN-PAD-001-베이지-M', optionValues: ['베이지', 'M'] },
    ],
    'prd-2': [{ id: 'p2-a', sku: 'NVA-TEE-014-화이트', optionValues: ['화이트'] }],
    'prd-3': [
      { id: 'p3-a', sku: 'TRA-SNK-207-260', optionValues: ['260'] },
      { id: 'p3-b', sku: 'TRA-SNK-207-250', optionValues: ['250'] },
    ],
    'prd-5': [{ id: 'p5-a', sku: 'OBJ-BAG-338', optionValues: [] }],
  };

  const BASE_STOCK: Readonly<Record<string, number>> = {
    'LMN-PAD-001-블랙-M': 5,
    'LMN-PAD-001-블랙-L': 4,
    // 베이지/M 은 품절 — 재고 부족으로 완료가 막히는 경로를 밟는다
    'LMN-PAD-001-베이지-M': 0,
    'NVA-TEE-014-화이트': 7,
    'TRA-SNK-207-260': 3,
    'TRA-SNK-207-250': 1,
    'OBJ-BAG-338': 1,
  };

  const stock: Record<string, number> = { ...BASE_STOCK };
  let ledger: PointRestore[] = [];

  const stockOf = (sku: string): number => stock[sku] ?? -1;

  const ORDERS: readonly OrderRef[] = [
    orderOf({ id: 'ORD-20260712-0031', status: 'shipping' }),
    orderOf({ id: 'ORD-20260710-0148', status: 'delivered' }),
    orderOf({ id: 'ORD-20260708-0092', status: 'confirmed' }),
    orderOf({ id: 'ORD-20260705-0210', status: 'delivered' }),
    orderOf({ id: 'ORD-20260703-0177', status: 'confirmed' }),
    orderOf({ id: 'ORD-20260716-0005', status: 'waiting' }),
    orderOf({ id: 'ORD-20260719-0003', status: 'pending' }),
    orderOf({ id: 'ORD-20260720-0002', status: 'preparing' }),
  ];

  beforeEach(() => {
    ledger = [];
    registerVariantLookup((productId) => {
      const defs = PRODUCT_SKUS[productId];
      if (defs === undefined) return null;
      return defs.map((def) => ({ ...def, stock: stock[def.sku] ?? 0 }));
    });
    registerStockApplier((movements) => {
      for (const movement of movements) {
        const current = stock[movement.sku] ?? 0;
        const delta = movement.direction === 'in' ? movement.quantity : -movement.quantity;
        stock[movement.sku] = Math.max(0, current + delta);
      }
    });
    registerPointLedgerAppender((entry) => ledger.push(entry));
    registerOrderLookup(() => ORDERS);
  });

  afterEach(() => {
    resetVariantLookup();
    resetStockApplier();
    resetPointLedgerAppender();
    resetOrderLookup();
  });

  it('클레임은 자기 주문을 가리킨다 — 예전 orderNo 문자열은 아무것도 가리키지 못했다', () => {
    expect(findClaimOrder('ORD-20260716-0005')?.status).toBe('waiting');
    expect(findClaimOrder('ORD-없는번호')).toBeNull();
  });

  it('되돌리는 전이는 어댑터도 화면과 같은 사유로 거절한다(422)', async () => {
    const claim = await claimAdapter.fetchOne('clm-2', signal);
    await expect(
      claimAdapter.update('clm-2', { ...toClaimInput(claim), status: 'requested' }),
    ).rejects.toMatchObject({ status: 422, message: CLAIM_TRANSITION_BACKWARD });
  });

  it('재고가 부족한 옵션으로는 완료할 수 없다 — 422 로 막고 재고를 건드리지 않는다', async () => {
    // clm-1: 루미엔 패딩(prd-1) 블랙/M 교환 요청 → 완료 직전까지 진행한다
    const requested = await claimAdapter.fetchOne('clm-1', signal);
    await claimAdapter.update('clm-1', { ...toClaimInput(requested), status: 'collecting' });
    const collecting = await claimAdapter.fetchOne('clm-1', signal);
    await claimAdapter.update('clm-1', { ...toClaimInput(collecting), status: 'inspecting' });

    const inspecting = await claimAdapter.fetchOne('clm-1', signal);
    const before = stockOf('LMN-PAD-001-블랙-M');
    await expect(
      claimAdapter.update('clm-1', {
        ...toClaimInput(inspecting),
        exchangeOptionValues: ['베이지', 'M'],
        status: 'completed',
      }),
    ).rejects.toMatchObject({ status: 422 });

    expect(stockOf('LMN-PAD-001-블랙-M')).toBe(before);
    expect(isStockApplied(await claimAdapter.fetchOne('clm-1', signal))).toBe(false);
  });

  it('교환 완료는 원래 옵션을 입고하고 새 옵션을 출고한다', async () => {
    const inspecting = await claimAdapter.fetchOne('clm-1', signal);
    const inBefore = stockOf('LMN-PAD-001-블랙-M');
    const outBefore = stockOf('LMN-PAD-001-블랙-L');

    await claimAdapter.update('clm-1', {
      ...toClaimInput(inspecting),
      exchangeOptionValues: ['블랙', 'L'],
      status: 'completed',
    });

    expect(stockOf('LMN-PAD-001-블랙-M')).toBe(inBefore + 1);
    expect(stockOf('LMN-PAD-001-블랙-L')).toBe(outBefore - 1);

    const after = await claimAdapter.fetchOne('clm-1', signal);
    expect(isStockApplied(after)).toBe(true);
    expect(after.stockMovements.map((move) => move.direction)).toEqual(['in', 'out']);
  });

  it('이미 반영된 클레임을 다시 저장해도 재고가 또 움직이지 않는다(중복 반영 방지)', async () => {
    const applied = await claimAdapter.fetchOne('clm-1', signal);
    const inStock = stockOf('LMN-PAD-001-블랙-M');

    await claimAdapter.update('clm-1', { ...toClaimInput(applied), adminNote: '메모 1' });
    await claimAdapter.update('clm-1', { ...toClaimInput(applied), adminNote: '메모 2' });

    expect(stockOf('LMN-PAD-001-블랙-M')).toBe(inStock);
    expect((await claimAdapter.fetchOne('clm-1', signal)).stockMovements).toHaveLength(2);
  });

  it('반품 완료는 회수분만 입고한다', async () => {
    const claim = await claimAdapter.fetchOne('clm-3', signal);
    const before = stockOf('NVA-TEE-014-화이트');

    await claimAdapter.update('clm-3', { ...toClaimInput(claim), status: 'completed' });

    // 수량 2건 반품 → 화이트 재고 +2, 이동은 입고 한 건
    expect(stockOf('NVA-TEE-014-화이트')).toBe(before + 2);
    const after = await claimAdapter.fetchOne('clm-3', signal);
    expect(after.stockMovements).toHaveLength(1);
    expect(after.stockMovements[0]).toMatchObject({ direction: 'in', quantity: 2 });
  });

  it('출고된 주문의 취소 완료는 거절한다 — 화면의 버튼과 같은 술어를 읽는다', async () => {
    registerOrderLookup(() => [orderOf({ id: 'ORD-20260716-0005', status: 'shipping' })]);
    const claim = await claimAdapter.fetchOne('clm-6', signal);
    await expect(
      claimAdapter.update('clm-6', { ...toClaimInput(claim), status: 'completed' }),
    ).rejects.toMatchObject({ status: 422, message: CLAIM_CANCEL_SHIPPED });
  });

  it('취소 완료는 재고를 움직이지 않는다 — 복원은 주문 취소가 한다', async () => {
    const claim = await claimAdapter.fetchOne('clm-6', signal);
    const before = stockOf('TRA-SNK-207-250');

    await claimAdapter.update('clm-6', { ...toClaimInput(claim), status: 'completed' });

    const after = await claimAdapter.fetchOne('clm-6', signal);
    expect(stockOf('TRA-SNK-207-250')).toBe(before);
    expect(after.stockMovements).toHaveLength(0);
    expect(isStockApplied(after)).toBe(false);
  });

  /**
   * [결함 1 회귀 — 경계까지] 화면이 보내는 것과 똑같은 patch 로 확인한다.
   * saveRefund 의 patch 에는 `refund` 뿐이라 상태는 **저장된 값**으로 나간다 — 버튼이 드래프트를
   * 읽던 시절에는 이 요청이 열린 버튼에서 출발해 422 로 되돌아왔다.
   */
  it('환불만 보내는 patch 는 저장된 상태로 판정된다 — 버튼도 같은 값을 읽어야 한다', async () => {
    const claim = await claimAdapter.fetchOne('clm-2', signal);
    expect(claim.status).toBe('collecting');

    // 화면에서 '완료'를 골라 두었을 뿐 저장하지 않았다 → 버튼은 잠긴다
    expect(refundActionBlock(claim, 'completed', true)).toBe(REFUND_UNSAVED_CLAIM);

    // 그때 saveRefund 가 보냈을 patch — 상태는 저장된 'collecting' 그대로다
    await expect(
      claimAdapter.update('clm-2', {
        ...toClaimInput(claim),
        refund: { ...claim.refund, status: 'completed' },
      }),
    ).rejects.toMatchObject({ status: 422, message: REFUND_CLAIM_INCOMPLETE });
  });

  /** [결함 2 회귀 — 경계까지] 반품에서 나는 422 는 인라인 자리가 없는 필드를 지목한다 */
  it('반품의 422 는 인라인 자리가 없다 — 배너로 보내지 않으면 사라진다', async () => {
    const claim = await claimAdapter.fetchOne('clm-2', signal);
    const failure: unknown = await claimAdapter
      .update('clm-2', { ...toClaimInput(claim), status: 'requested' })
      .then(() => null)
      .catch((cause: unknown) => cause);

    expect(isHttpError(failure)).toBe(true);
    if (!isHttpError(failure)) return;
    expect(failure.status).toBe(422);
    // 교환 옵션 필드는 반품 화면에 없다 — 그리는 자리가 없으므로 인라인으로 보내면 침묵이다
    expect(hasInlineErrorSlot(failure.violations[0]?.field, true)).toBe(false);
    expect(failure.message).toBe(CLAIM_TRANSITION_BACKWARD);
  });

  /**
   * [결함 b 회귀 — 경계까지] 한 저장이 여러 규칙을 동시에 어기면 **전부** 실어 보낸다.
   *
   * 화면은 자기 가드로 이 조합을 만들지 못한다(버튼이 먼저 잠긴다 — 그게 설계다). 그래서 여러
   * 위반이 한꺼번에 오는 것은 **서버 쪽 사실**이고, 그 사실을 여기서 고정한다. 예전 어댑터는
   * 첫 위반에서 throw 해 나머지를 아예 만들지 않았다 — 화면이 다 읽어도 볼 것이 없었다.
   */
  it('한 번에 어긴 규칙을 전부 싣는다 — 첫 위반에서 멈추지 않는다', async () => {
    // clm-4: 반품 · 완료 · 환불완료(completedAt 이 찍혀 차감이 얼어 있다)
    const done = await claimAdapter.fetchOne('clm-4', signal);
    const failure: unknown = await claimAdapter
      .update('clm-4', {
        ...toClaimInput(done),
        status: 'requested', // 역방향 전이
        refund: { ...done.refund, status: 'requested', returnShippingFee: 5000 }, // 완료 후 되돌리기 + 차감 변경
      })
      .then(() => null)
      .catch((cause: unknown) => cause);

    expect(isHttpError(failure)).toBe(true);
    if (!isHttpError(failure)) return;
    expect(failure.status).toBe(422);
    expect(failure.violations.map((violation) => violation.field)).toEqual([
      'status',
      'refundStatus',
      'returnShippingFee',
    ]);
    // message 는 첫 위반 그대로다 — 위반을 읽지 않는 소비자도 사람이 읽는 문장을 받는다
    expect(failure.message).toBe(CLAIM_TRANSITION_TERMINAL);
    // 화면은 이제 셋을 전부 그린다(반품이라 인라인 자리가 없어 배너로 수렴)
    expect(placeViolations(failure.violations, failure.message, false).banner).toContain(
      REFUND_TRANSITION_DONE,
    );
  });

  /**
   * [결함 c 회귀 — 경계까지] 형식 위반은 400 `VALIDATION_FAILED` 로, `error.fields` 를 그대로 싣는다.
   *
   * 화면의 `maxLength`·`parseFeeInput` 은 브라우저 입력만 막는다 — 값이 그 밖에서 들어오면
   * 거르는 것은 서버의 일이다(BE-044 §6.1). 예전에는 이 검사가 없어 500자를 넘긴 메모가 그대로
   * 저장됐고, 400 이 오더라도 화면이 `error.fields` 를 읽지 않아 '요청이 올바르지 않습니다'
   * 한 줄로 뭉개졌다.
   */
  it('형식 위반은 400 으로 거절하고 어느 칸인지 지목한다', async () => {
    const claim = await claimAdapter.fetchOne('clm-3', signal);
    const failure: unknown = await claimAdapter
      .update('clm-3', {
        ...toClaimInput(claim),
        adminNote: 'ㄱ'.repeat(CLAIM_NOTE_MAX + 1),
        refund: { ...claim.refund, returnShippingFee: -1 },
      })
      .then(() => null)
      .catch((cause: unknown) => cause);

    expect(isHttpError(failure)).toBe(true);
    if (!isHttpError(failure)) return;
    expect(failure.status).toBe(HTTP_STATUS.badRequest);
    expect(failure.violations.map((violation) => violation.field)).toEqual([
      'adminNote',
      'returnShippingFee',
    ]);
    // 화면은 400 도 422 와 같은 길로 보낸다 — 둘 다 어느 칸이 틀렸는지 아는 실패다
    expect(isFieldRejection(failure)).toBe(true);
    const placed = placeViolations(failure.violations, failure.message, false);
    expect(placed.banner).toContain(REFUND_FEE_INVALID);
    expect(placed.banner).toContain(String(CLAIM_NOTE_MAX));

    // 거절이므로 아무것도 저장되지 않는다
    expect((await claimAdapter.fetchOne('clm-3', signal)).adminNote).toBe(claim.adminNote);
  });

  it('경계값은 통과한다 — 규칙이 정상 저장을 막지 않는다', async () => {
    const claim = await claimAdapter.fetchOne('clm-3', signal);
    const note = 'ㄴ'.repeat(CLAIM_NOTE_MAX);
    await claimAdapter.update('clm-3', { ...toClaimInput(claim), adminNote: note });
    expect((await claimAdapter.fetchOne('clm-3', signal)).adminNote).toBe(note);
  });

  it('클레임을 완료하지 않은 채 환불만 완료할 수는 없다', async () => {
    const claim = await claimAdapter.fetchOne('clm-2', signal);
    await expect(
      claimAdapter.update('clm-2', {
        ...toClaimInput(claim),
        refund: { ...claim.refund, status: 'completed' },
      }),
    ).rejects.toMatchObject({ status: 422, message: REFUND_CLAIM_INCOMPLETE });
  });

  it('환불완료가 사용한 적립금을 원장에 양수로 복원한다', async () => {
    const claim = await claimAdapter.fetchOne('clm-6', signal);
    expect(claim.refund.completedAt).toBe('');
    expect(ledger).toHaveLength(0);

    await claimAdapter.update('clm-6', {
      ...toClaimInput(claim),
      refund: { ...claim.refund, status: 'completed' },
    });

    const after = await claimAdapter.fetchOne('clm-6', signal);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ memberId: 'mem-5', amount: 3000, orderNo: claim.orderId });
    expect(after.refund.restoredPoint).toBe(3000);
    expect(after.refund.completedAt).not.toBe('');
  });

  it('환불을 다시 저장해도 원장에 두 번 적히지 않고 재고도 다시 움직이지 않는다(멱등)', async () => {
    const done = await claimAdapter.fetchOne('clm-6', signal);
    const before = stockOf('TRA-SNK-207-250');

    await claimAdapter.update('clm-6', { ...toClaimInput(done), adminNote: '환불 재시도' });

    expect(ledger).toHaveLength(0); // beforeEach 가 원장을 비웠다 — 두 번째 저장은 아무것도 적지 않는다
    expect(stockOf('TRA-SNK-207-250')).toBe(before);
    expect((await claimAdapter.fetchOne('clm-6', signal)).stockMovements).toHaveLength(0);
  });

  it('완료된 환불의 차감은 사후에 고칠 수 없다 — 이미 나간 돈의 근거다', async () => {
    const done = await claimAdapter.fetchOne('clm-6', signal);
    await expect(
      claimAdapter.update('clm-6', {
        ...toClaimInput(done),
        refund: { ...done.refund, returnShippingFee: 9999 },
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('쿠폰을 복원하는 취소는 회수분을 뺀 금액이 환불액이다', async () => {
    const claim = await claimAdapter.fetchOne('clm-8', signal);
    expect(refundBreakdown(claim.refund).total).toBe(47150);
  });

  it('원장이 배선되지 않았으면 환불을 완료하지 않는다 — 멱등키를 조용히 찍지 않는다', async () => {
    resetPointLedgerAppender();
    const claim = await claimAdapter.fetchOne('clm-8', signal);

    await expect(
      claimAdapter.update('clm-8', {
        ...toClaimInput(claim),
        status: 'completed',
        refund: { ...claim.refund, status: 'completed' },
      }),
    ).rejects.toMatchObject({ status: 500 });

    const after = await claimAdapter.fetchOne('clm-8', signal);
    expect(after.refund.completedAt).toBe('');
    expect(after.refund.status).toBe('requested');
    expect(after.status).toBe('requested');
  });
});
