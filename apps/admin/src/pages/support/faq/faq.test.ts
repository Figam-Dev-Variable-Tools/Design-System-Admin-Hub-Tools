// 고객노출 FAQ 큐레이션 규칙 회귀 테스트 — 정렬·재정렬·노출 집계(순수)
import { describe, expect, it } from 'vitest';

import { applyFaqOrder, countVisible, sortCustomerFaqs, visibilityLabel } from './types';
import type { CustomerFaq } from './types';

function faqOf(overrides: Partial<CustomerFaq> & { id: string }): CustomerFaq {
  return {
    question: '질문',
    categoryLabel: '주문/결제',
    visible: true,
    pinned: false,
    order: 1,
    ...overrides,
  };
}

describe('정렬(순수)', () => {
  it('표시 순서 오름차순, 같은 순서는 id 안정 정렬', () => {
    const list = [
      faqOf({ id: 'b', order: 2 }),
      faqOf({ id: 'a', order: 1 }),
      faqOf({ id: 'c', order: 2 }),
    ];
    expect(sortCustomerFaqs(list).map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('applyFaqOrder(순수)', () => {
  const list = [
    faqOf({ id: 'a', order: 1 }),
    faqOf({ id: 'b', order: 2 }),
    faqOf({ id: 'c', order: 3 }),
  ];

  it('새 순서로 재배열하고 order 를 1..n 으로 다시 매긴다', () => {
    const next = applyFaqOrder(list, ['c', 'a', 'b']);
    expect(next.map((f) => f.id)).toEqual(['c', 'a', 'b']);
    expect(next.map((f) => f.order)).toEqual([1, 2, 3]);
  });

  it('부분 집합/불일치면 원본을 정렬해 돌려준다', () => {
    expect(applyFaqOrder(list, ['a', 'b']).map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(applyFaqOrder(list, ['a', 'b', 'z']).map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('집계·라벨(순수)', () => {
  it('노출 건수', () => {
    const list = [faqOf({ id: 'a', visible: true }), faqOf({ id: 'b', visible: false })];
    expect(countVisible(list)).toBe(1);
  });

  it('노출 라벨', () => {
    expect(visibilityLabel(true)).toBe('노출');
    expect(visibilityLabel(false)).toBe('숨김');
  });
});
