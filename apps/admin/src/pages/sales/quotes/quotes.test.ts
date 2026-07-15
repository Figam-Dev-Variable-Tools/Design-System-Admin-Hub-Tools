// 견적 동작 회귀 테스트 (A41) — 공급가액·부가세(라인별 반올림 합산)·수주전환·필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import {
  canConvertToOrder,
  computeTotals,
  filterQuotes,
  lineSupply,
  makeQuoteNo,
  searchQuotes,
  sortQuotes,
  toQuoteInput,
} from './types';
import type { Quote, QuoteLineItem } from './types';
import { quoteSchema } from './validation';
import type { QuoteFormValues } from './validation';

const items: readonly QuoteLineItem[] = [
  { id: 'a', name: '품목A', spec: '', quantity: 2, unitPrice: 1500 },
  { id: 'b', name: '품목B', spec: '', quantity: 1, unitPrice: 999 },
];

function quoteOf(overrides: Partial<Quote> & { id: string }): Quote {
  return {
    quoteNo: 'Q-20260710-001',
    accountName: '(주)테스트',
    accountBizNo: '124-81-00998',
    accountCeo: '김대표',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    taxMode: 'standard',
    items,
    status: 'draft',
    note: '',
    ...overrides,
  };
}

describe('금액 계산(순수)', () => {
  it('라인 공급가액 = 수량 × 단가', () => {
    expect(lineSupply({ quantity: 2, unitPrice: 1500 })).toBe(3000);
  });
  it('과세(10%) — 라인별 반올림 후 합산', () => {
    // 라인A 공급 3000 → 세액 300, 라인B 공급 999 → 세액 round(99.9)=100. 합 세액 400.
    const totals = computeTotals(items, 'standard');
    expect(totals.supply).toBe(3999);
    expect(totals.vat).toBe(400);
    expect(totals.total).toBe(4399);
  });
  it('영세율·면세는 세액 0', () => {
    expect(computeTotals(items, 'zero_rated').vat).toBe(0);
    expect(computeTotals(items, 'exempt').vat).toBe(0);
  });
  it('품목이 없으면 0', () => {
    expect(computeTotals([], 'standard')).toEqual({ supply: 0, vat: 0, total: 0 });
  });
});

describe('수주 전환 가능 여부(순수)', () => {
  it('승인된 견적만 전환 가능', () => {
    expect(canConvertToOrder('accepted')).toBe(true);
    expect(canConvertToOrder('sent')).toBe(false);
    expect(canConvertToOrder('ordered')).toBe(false);
  });
});

describe('견적번호 생성(순수)', () => {
  it("'Q-YYYYMMDD-NNN' 형식", () => {
    expect(makeQuoteNo('2026-07-16', 7)).toBe('Q-20260716-007');
  });
});

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    quoteOf({ id: 'a', quoteNo: 'Q-1', status: 'sent', issueDate: '2026-07-01' }),
    quoteOf({
      id: 'b',
      quoteNo: 'Q-2',
      accountName: '가나상사',
      status: 'accepted',
      issueDate: '2026-07-05',
    }),
  ];
  it('상태 필터', () => {
    expect(filterQuotes(list, 'accepted').map((q) => q.id)).toEqual(['b']);
    expect(filterQuotes(list, 'all')).toHaveLength(2);
  });
  it('거래처 검색', () => {
    expect(searchQuotes(list, '가나').map((q) => q.id)).toEqual(['b']);
  });
  it('견적일 내림차순 정렬', () => {
    expect(sortQuotes(list).map((q) => q.id)).toEqual(['b', 'a']);
  });
  it('toQuoteInput 은 id 를 뺀다', () => {
    expect(toQuoteInput(quoteOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});

function valuesOf(overrides: Partial<QuoteFormValues> = {}): QuoteFormValues {
  return {
    quoteNo: 'Q-20260710-001',
    accountName: '(주)테스트',
    accountBizNo: '124-81-00998',
    accountCeo: '김대표',
    issueDate: '2026-07-10',
    validUntil: '2026-08-09',
    taxMode: 'standard',
    items: [{ id: 'a', name: '품목A', spec: '', quantity: 2, unitPrice: 1500 }],
    status: 'draft',
    note: '',
    ...overrides,
  };
}

function messageFor(values: QuoteFormValues, path: string): string | undefined {
  const result = quoteSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('quoteSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(quoteSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('거래처가 비면 막는다', () => {
    expect(messageFor(valuesOf({ accountName: '' }), 'accountName')).toContain('입력');
  });
  it('품목이 없으면 막는다', () => {
    expect(messageFor(valuesOf({ items: [] }), 'items')).toContain('한 개');
  });
  it('수량이 0이면 막는다', () => {
    expect(
      messageFor(
        valuesOf({ items: [{ id: 'a', name: '품목', spec: '', quantity: 0, unitPrice: 100 }] }),
        'items',
      ),
    ).toContain('수량');
  });
  it('유효기간이 견적일보다 빠르면 막는다', () => {
    expect(
      messageFor(valuesOf({ issueDate: '2026-08-09', validUntil: '2026-07-10' }), 'validUntil'),
    ).toContain('빠를');
  });
});
