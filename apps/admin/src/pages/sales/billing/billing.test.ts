// 청구·입금 회귀 테스트 — 입금 누적/완료 판정 · 초과 입금 차단 · 생성 가드 · 견적 승계
//
// [무엇이 가장 쉽게 갈라지나] **입금 상태**다. 상태를 따로 저장하면 '입금 3건은 있는데 미입금'
// 인 순간이 생기고, 목록 배지와 잔액이 동시에 거짓말을 한다. 그래서 상태는 파생이고, 그 파생을
// 가장 먼저 고정한다.
import { describe, expect, it } from 'vitest';

import {
  applyNotice,
  applyPayment,
  BILLING_CREATE_DONE,
  BILLING_CREATE_NOT_ORDERED,
  BILLING_NOTICE_LOST,
  BILLING_PAYMENT_LOST,
  billingCreateBlock,
  billingPaymentState,
  buildBillingFromQuote,
  countBillingsByState,
  filterBillings,
  hasSentNotice,
  lastNoticeAt,
  ledgerLossBlock,
  makeBillNo,
  NOTICE_LINK_REQUIRED,
  outstandingAmount,
  paidAmount,
  paidOnDate,
  PAYMENT_ALREADY_PAID,
  PAYMENT_AMOUNT_POSITIVE,
  PAYMENT_DATE_REQUIRED,
  PAYMENT_OVER_OUTSTANDING,
  recordPaymentBlock,
  searchBillings,
  sendNoticeBlock,
  sortBillings,
  toBillingInput,
  totalOutstanding,
} from './types';
import type { Billing, BillingPayment } from './types';
import type { Quote } from '../quotes/types';

function billingOf(overrides: Partial<Billing> & { id: string }): Billing {
  return {
    billNo: 'BL-20260706-001',
    quoteId: 'qt-1',
    quoteNo: 'Q-20260705-001',
    accountId: 'acc-1',
    accountName: '(주)가상상사',
    method: 'bank_transfer',
    paymentLinkUrl: '',
    amount: 1000000,
    issuedAt: '2026-07-06',
    notices: [],
    payments: [],
    note: '',
    ...overrides,
  };
}

const paymentOf = (id: string, amount: number, paidOn: string): BillingPayment => ({
  id,
  paidOn,
  amount,
  memo: '',
});

/* ── 입금 누적 · 완료 판정 (가장 먼저 고정한다) ───────────────────────────── */

describe('입금은 누적 합으로 판정한다 — 마지막 한 건이 아니다', () => {
  it('입금이 없으면 미입금이고 잔액은 청구액 전부다', () => {
    const billing = billingOf({ id: 'a' });
    expect(billingPaymentState(billing)).toBe('unpaid');
    expect(paidAmount(billing)).toBe(0);
    expect(outstandingAmount(billing)).toBe(1000000);
  });

  it('일부만 들어오면 부분입금이다', () => {
    const billing = billingOf({ id: 'a', payments: [paymentOf('p1', 400000, '2026-07-08')] });
    expect(billingPaymentState(billing)).toBe('partial');
    expect(outstandingAmount(billing)).toBe(600000);
  });

  /* [핵심] 400000 + 600000 = 1000000. 어느 한 건도 청구액에 닿지 않지만 **합이 닿으면 완료**다.
     마지막 입금 한 건만 보고 판정하면 이 청구는 영원히 부분입금으로 남는다. */
  it('나눠 들어온 합이 청구액에 닿으면 입금완료다', () => {
    const billing = billingOf({
      id: 'a',
      payments: [paymentOf('p1', 400000, '2026-07-08'), paymentOf('p2', 600000, '2026-07-15')],
    });
    expect(paidAmount(billing)).toBe(1000000);
    expect(billingPaymentState(billing)).toBe('paid');
    expect(outstandingAmount(billing)).toBe(0);
  });

  it('완납일은 잔액을 0 으로 만든 그 입금의 날짜다', () => {
    const billing = billingOf({
      id: 'a',
      payments: [paymentOf('p1', 400000, '2026-07-08'), paymentOf('p2', 600000, '2026-07-15')],
    });
    expect(paidOnDate(billing)).toBe('2026-07-15');
  });

  it('아직 못 채웠으면 완납일이 없다 — 0일로 위장하지 않는다', () => {
    expect(paidOnDate(billingOf({ id: 'a', payments: [paymentOf('p1', 1, '2026-07-08')] }))).toBe(
      '',
    );
  });
});

/* ── 입금 기록 가드 ───────────────────────────────────────────────────────── */

describe('입금확인 가드 — 버튼의 disabled 와 저장의 거절이 읽는 한 술어', () => {
  const half = billingOf({ id: 'a', payments: [paymentOf('p1', 400000, '2026-07-08')] });

  it('정상 입금은 통과한다', () => {
    expect(recordPaymentBlock(half, 600000, '2026-07-15')).toBeNull();
  });

  it('0 이하는 막는다', () => {
    expect(recordPaymentBlock(half, 0, '2026-07-15')).toBe(PAYMENT_AMOUNT_POSITIVE);
    expect(recordPaymentBlock(half, -1, '2026-07-15')).toBe(PAYMENT_AMOUNT_POSITIVE);
  });

  /* 청구액보다 많이 받았다면 그것은 입금 기록이 아니라 **과오납 처리**라는 다른 업무다.
     조용히 받아 두면 잔액이 음수가 되고 그 음수를 화면마다 다르게 그린다. */
  it('잔액을 넘는 입금은 막는다', () => {
    expect(recordPaymentBlock(half, 600001, '2026-07-15')).toBe(PAYMENT_OVER_OUTSTANDING);
  });

  it('입금일 형식이 아니면 막는다', () => {
    expect(recordPaymentBlock(half, 100000, '2026/07/15')).toBe(PAYMENT_DATE_REQUIRED);
    expect(recordPaymentBlock(half, 100000, '')).toBe(PAYMENT_DATE_REQUIRED);
  });

  it('이미 완료된 청구에는 더 기록하지 않는다', () => {
    const paid = billingOf({ id: 'a', payments: [paymentOf('p1', 1000000, '2026-07-08')] });
    expect(recordPaymentBlock(paid, 1, '2026-07-15')).toBe(PAYMENT_ALREADY_PAID);
  });
});

describe('applyPayment — 기록은 덧붙이기만 한다(되돌리는 전이 없음)', () => {
  it('입금을 덧붙이면 상태가 따라온다 — 상태를 따로 옮기지 않는다', () => {
    const next = applyPayment(billingOf({ id: 'a' }), paymentOf('p1', 1000000, '2026-07-08'));
    expect(next.payments).toHaveLength(1);
    expect(billingPaymentState(next)).toBe('paid');
  });

  it('원본을 바꾸지 않는다 — 이전 기록은 그대로 남는다', () => {
    const before = billingOf({ id: 'a' });
    applyPayment(before, paymentOf('p1', 500000, '2026-07-08'));
    expect(before.payments).toHaveLength(0);
  });

  it('막힌 기록은 던진다 — 술어가 먼저 걸러 주므로 여기 도달하면 버그다', () => {
    expect(() =>
      applyPayment(billingOf({ id: 'a' }), paymentOf('p1', 2000000, '2026-07-08')),
    ).toThrow(PAYMENT_OVER_OUTSTANDING);
  });
});

/* ── 동시 저장 (기록 소실) ────────────────────────────────────────────────── */

/**
 * [회귀] 저장이 문서 전체를 갈아 끼우므로, 내가 읽은 뒤 기록된 입금은 그대로 저장하면 **사라진다.**
 * 그 소실을 판정하는 술어를 여기서 고정한다 — 어댑터의 409 가 이것을 읽는다(./data-source).
 */
describe('원장을 지우는 저장은 거절한다 — 덧붙이기만 통과한다', () => {
  const stored = billingOf({
    id: 'a',
    payments: [paymentOf('p1', 300000, '2026-07-08')],
    notices: [{ id: 'n1', at: '2026-07-06T01:20:00Z', channel: 'email', memo: '안내' }],
  });

  it('그대로 다시 저장하는 것은 소실이 아니다', () => {
    expect(ledgerLossBlock(stored, toBillingInput(stored))).toBeNull();
  });

  it('입금을 덧붙인 저장은 통과한다 — 이것이 정상 경로다', () => {
    const next = applyPayment(stored, paymentOf('p2', 200000, '2026-07-09'));
    expect(ledgerLossBlock(stored, toBillingInput(next))).toBeNull();
  });

  /* 두 운영자 시나리오의 핵심: 내 문서에는 방금 기록된 입금이 없다. */
  it('저장된 입금이 빠진 문서는 409 사유를 돌려준다', () => {
    const stale = billingOf({ id: 'a', payments: [], notices: stored.notices });
    expect(ledgerLossBlock(stored, toBillingInput(stale))).toBe(BILLING_PAYMENT_LOST);
  });

  /* 건수만 세면 '한 건 지우고 한 건 넣은' 저장이 통과한다 — 앞부분이 그대로여야 한다. */
  it('건수가 같아도 앞부분이 다르면 소실이다', () => {
    const swapped = billingOf({ id: 'a', payments: [paymentOf('p9', 300000, '2026-07-08')] });
    expect(ledgerLossBlock(stored, toBillingInput(swapped))).toBe(BILLING_PAYMENT_LOST);
  });

  it('안내 기록도 같은 규약이다 — 보낸 사실은 지워지지 않는다', () => {
    const stale = billingOf({ id: 'a', payments: stored.payments, notices: [] });
    expect(ledgerLossBlock(stored, toBillingInput(stale))).toBe(BILLING_NOTICE_LOST);
  });
});

/* ── 청구 안내 ────────────────────────────────────────────────────────────── */

describe('청구 안내', () => {
  it('계좌이체는 링크 없이도 안내할 수 있다', () => {
    expect(sendNoticeBlock(billingOf({ id: 'a' }))).toBeNull();
  });

  /* 개인결제창인데 링크가 없으면 고객은 '결제해 달라' 는 말만 받고 결제할 수단을 못 받는다. */
  it('개인결제창은 링크가 없으면 막는다', () => {
    expect(
      sendNoticeBlock(billingOf({ id: 'a', method: 'payment_link', paymentLinkUrl: '  ' })),
    ).toBe(NOTICE_LINK_REQUIRED);
    expect(
      sendNoticeBlock(
        billingOf({ id: 'a', method: 'payment_link', paymentLinkUrl: 'https://pay.example.com/x' }),
      ),
    ).toBeNull();
  });

  it('발송 기록이 쌓이고 마지막 시각을 읽을 수 있다', () => {
    const next = applyNotice(billingOf({ id: 'a' }), {
      id: 'n1',
      at: '2026-07-06T01:00:00Z',
      channel: 'email',
      memo: '',
    });
    expect(hasSentNotice(next)).toBe(true);
    expect(lastNoticeAt(next)).toBe('2026-07-06T01:00:00Z');
  });
});

/* ── 청구 생성 가드 · 견적 승계 ───────────────────────────────────────────── */

function quoteOf(status: Quote['status']): Quote {
  return {
    id: 'qt-9',
    quoteNo: 'Q-20260710-009',
    accountId: 'acc-1',
    accountName: '(주)가상상사',
    accountBizNo: '',
    accountCeo: '',
    contactName: '김담당',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    taxMode: 'standard',
    items: [{ id: 'li-1', name: '품목', spec: '', quantity: 2, unitPrice: 500000 }],
    status,
    note: '',
    sources: [],
  };
}

describe('청구는 수주 전환된 견적에서만 생성된다', () => {
  it('수주 전환된 견적이면 통과한다', () => {
    expect(billingCreateBlock('ordered', '')).toBeNull();
  });

  /* 승인만으로는 아직 거래가 확정되지 않았다 — 전환하지 않은 견적에 돈 이야기가 먼저 붙지 않게 한다. */
  it('승인·발송·작성중은 막는다', () => {
    for (const status of ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const) {
      expect(billingCreateBlock(status, '')).toBe(BILLING_CREATE_NOT_ORDERED);
    }
  });

  it('이미 청구가 있으면 막는다 — 견적 id 가 멱등키다', () => {
    expect(billingCreateBlock('ordered', 'bl-1')).toBe(BILLING_CREATE_DONE);
  });
});

describe('견적 → 청구 승계(순수)', () => {
  const built = () => buildBillingFromQuote(quoteOf('ordered'), '2026-07-20');

  it('청구액은 견적 합계(공급가액 + 세액)의 스냅숏이다', () => {
    // 1,000,000 + 부가세 100,000
    expect(built().amount).toBe(1100000);
  });

  it('견적번호·거래처를 승계하고 청구번호는 자동 채번에 맡긴다', () => {
    const billing = built();
    expect(billing.quoteId).toBe('qt-9');
    expect(billing.quoteNo).toBe('Q-20260710-009');
    expect(billing.accountId).toBe('acc-1');
    expect(billing.billNo).toBe('');
  });

  /* 개인결제창은 링크를 먼저 만들어야 성립하는데 이 시점에 링크는 아직 없다. */
  it('청구 방식은 계좌이체로 시작하고 기록은 비어 있다', () => {
    const billing = built();
    expect(billing.method).toBe('bank_transfer');
    expect(billing.paymentLinkUrl).toBe('');
    expect(billing.payments).toHaveLength(0);
    expect(billing.notices).toHaveLength(0);
  });

  it('청구번호는 청구일 + 순번이다', () => {
    expect(makeBillNo('2026-07-20', 4)).toBe('BL-20260720-004');
  });
});

/* ── 목록 조회(순수) ──────────────────────────────────────────────────────── */

describe('목록 필터·집계·검색·정렬(순수)', () => {
  const list = [
    billingOf({ id: 'a', billNo: 'BL-20260706-001', issuedAt: '2026-07-06' }),
    billingOf({
      id: 'b',
      billNo: 'BL-20260702-001',
      issuedAt: '2026-07-02',
      accountName: '미래테크놀로지',
      payments: [paymentOf('p1', 400000, '2026-07-08')],
    }),
    billingOf({
      id: 'c',
      billNo: 'BL-20260620-001',
      issuedAt: '2026-06-20',
      quoteNo: 'Q-20260619-001',
      payments: [paymentOf('p2', 1000000, '2026-06-25')],
    }),
  ];

  it('입금 상태로 거른다', () => {
    expect(filterBillings(list, 'unpaid').map((b) => b.id)).toEqual(['a']);
    expect(filterBillings(list, 'partial').map((b) => b.id)).toEqual(['b']);
    expect(filterBillings(list, 'paid').map((b) => b.id)).toEqual(['c']);
    expect(filterBillings(list, 'all')).toHaveLength(3);
  });

  it('건수는 필터 이전 전체 집합에서 센다', () => {
    const counts = countBillingsByState(list);
    expect(counts.all).toBe(3);
    expect(counts.unpaid).toBe(1);
    expect(counts.partial).toBe(1);
    expect(counts.paid).toBe(1);
  });

  it('미수금은 잔액의 합이다 — 완납 건은 0 으로 들어간다', () => {
    expect(totalOutstanding(list)).toBe(1000000 + 600000);
  });

  it('청구번호·견적번호·거래처로 찾는다', () => {
    expect(searchBillings(list, 'BL-20260702').map((b) => b.id)).toEqual(['b']);
    expect(searchBillings(list, 'Q-20260619').map((b) => b.id)).toEqual(['c']);
    expect(searchBillings(list, '미래').map((b) => b.id)).toEqual(['b']);
  });

  it('청구일 내림차순 정렬', () => {
    expect(sortBillings(list).map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('toBillingInput 은 id 를 빼고 견적 참조를 보존한다', () => {
    const input = toBillingInput(billingOf({ id: 'a' }));
    expect(input).not.toHaveProperty('id');
    expect(input.quoteId).toBe('qt-1');
  });
});
