// 고객노출 FAQ 큐레이션 규칙 회귀 테스트 — 파생·정렬·재정렬·노출 집계(순수)
//
// [무엇을 지키나] 이 화면의 행은 콘텐츠 관리 FAQ 에서 온다. 예전에는 자기 픽스처를 들고 있어서
// 콘텐츠 관리에서 쓴 FAQ 가 여기 영영 뜨지 않았다 — 그 관계가 다시 끊어지지 않게 파생 규칙
// (curateFaqs)과 큐레이션 축의 쓰기 규칙(applyCurationOrder/Patch)을 순수 함수로 고정한다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  registerPublishedFaqLookup,
  resetPublishedFaqLookup,
} from '../../../shared/domain/faq-catalog';
import type { PublishedFaq } from '../../../shared/domain/faq-catalog';
import { fetchCustomerFaqs, reorderCustomerFaqs, setCustomerFaqVisible } from './data-source';
import {
  applyCurationOrder,
  applyCurationPatch,
  applyFaqOrder,
  countVisible,
  curateFaqs,
  sortCustomerFaqs,
  visibilityLabel,
} from './types';
import type { CustomerFaq, FaqCuration } from './types';

/* ── 표본 ─────────────────────────────────────────────────────────────────── */

/** 원본(콘텐츠 관리 FAQ) — 카테고리 어휘도 저쪽 것이다(계정·결제·배송·기타) */
const SOURCE: readonly PublishedFaq[] = [
  {
    id: 'FAQ-001',
    question: '비밀번호를 잊어버렸어요',
    categoryId: 'account',
    categoryLabel: '계정',
  },
  {
    id: 'FAQ-002',
    question: '결제 수단은 무엇이 있나요',
    categoryId: 'payment',
    categoryLabel: '결제',
  },
  {
    id: 'FAQ-003',
    question: '배송은 얼마나 걸리나요',
    categoryId: 'delivery',
    categoryLabel: '배송',
  },
];

function faqOf(overrides: Partial<CustomerFaq> & { id: string }): CustomerFaq {
  return {
    question: '질문',
    categoryId: 'etc',
    categoryLabel: '기타',
    visible: true,
    pinned: false,
    order: 1,
    ...overrides,
  };
}

/* ── 파생 ─────────────────────────────────────────────────────────────────── */

describe('curateFaqs — 행은 콘텐츠 FAQ 에서 온다', () => {
  it('큐레이션이 하나도 없어도 원본이 그대로 목록이 된다(기본 노출·순서 유지)', () => {
    const rows = curateFaqs(SOURCE, []);
    expect(rows.map((row) => row.id)).toEqual(['FAQ-001', 'FAQ-002', 'FAQ-003']);
    expect(rows.map((row) => row.order)).toEqual([1, 2, 3]);
    expect(rows.every((row) => row.visible)).toBe(true);
    expect(rows.every((row) => !row.pinned)).toBe(true);
  });

  it('질문·카테고리는 원본 값을 그대로 쓴다 — 이 화면은 자기 어휘를 갖지 않는다', () => {
    const rows = curateFaqs(SOURCE, [{ faqId: 'FAQ-003', pinned: true }]);
    const row = rows.find((item) => item.id === 'FAQ-003');
    expect(row?.question).toBe('배송은 얼마나 걸리나요');
    expect(row?.categoryId).toBe('delivery');
    expect(row?.categoryLabel).toBe('배송');
    expect(row?.pinned).toBe(true);
  });

  it('원본에 없는 큐레이션은 행을 만들지 않는다 — 콘텐츠에서 지워진 FAQ 가 남지 않는다', () => {
    const rows = curateFaqs(SOURCE, [{ faqId: 'FAQ-999', visible: true, order: 1 }]);
    expect(rows.map((row) => row.id)).toEqual(['FAQ-001', 'FAQ-002', 'FAQ-003']);
  });

  it('순서를 정한 FAQ 가 앞에, 손대지 않은 FAQ 는 콘텐츠 순서대로 뒤에 붙는다', () => {
    const rows = curateFaqs(SOURCE, [{ faqId: 'FAQ-003', order: 1 }]);
    expect(rows.map((row) => row.id)).toEqual(['FAQ-003', 'FAQ-001', 'FAQ-002']);
    // 원본 order 가 듬성듬성해도 화면 번호는 1..n 으로 이어진다
    expect(rows.map((row) => row.order)).toEqual([1, 2, 3]);
  });

  it('노출 여부는 큐레이션의 축 — 끈 FAQ 도 목록에는 남는다(다시 켤 수 있어야 한다)', () => {
    const rows = curateFaqs(SOURCE, [{ faqId: 'FAQ-002', visible: false }]);
    expect(rows.find((row) => row.id === 'FAQ-002')?.visible).toBe(false);
    expect(countVisible(rows)).toBe(2);
  });
});

/* ── 큐레이션 쓰기(순수) ──────────────────────────────────────────────────── */

describe('applyCurationOrder — 순서는 레코드에 저장된다', () => {
  it('목록의 모든 FAQ 가 order 를 갖는다', () => {
    const next = applyCurationOrder([], ['FAQ-003', 'FAQ-001', 'FAQ-002']);
    expect(next.map((curation) => [curation.faqId, curation.order])).toEqual([
      ['FAQ-003', 1],
      ['FAQ-001', 2],
      ['FAQ-002', 3],
    ]);
  });

  it('노출·BEST 값은 건드리지 않는다 — 다른 축이다', () => {
    const before: readonly FaqCuration[] = [{ faqId: 'FAQ-002', visible: false, pinned: true }];
    const next = applyCurationOrder(before, ['FAQ-002', 'FAQ-001']);
    expect(next[0]).toEqual({ faqId: 'FAQ-002', visible: false, pinned: true, order: 1 });
  });

  it('목록 밖의 레코드는 남는다 — 콘텐츠에서 잠시 내린 FAQ 의 큐레이션이 사라지지 않는다', () => {
    const before: readonly FaqCuration[] = [{ faqId: 'FAQ-900', pinned: true }];
    const next = applyCurationOrder(before, ['FAQ-001']);
    expect(next.find((curation) => curation.faqId === 'FAQ-900')?.pinned).toBe(true);
  });
});

describe('applyCurationPatch — 토글은 레코드를 만들거나 덮는다', () => {
  it('레코드가 없으면 만든다', () => {
    const next = applyCurationPatch([], 'FAQ-001', { visible: false });
    expect(next).toEqual([{ faqId: 'FAQ-001', visible: false }]);
  });

  it('있으면 그 값만 덮는다(순서·다른 축은 보존)', () => {
    const before: readonly FaqCuration[] = [{ faqId: 'FAQ-001', order: 2, visible: false }];
    const next = applyCurationPatch(before, 'FAQ-001', { pinned: true });
    expect(next[0]).toEqual({ faqId: 'FAQ-001', order: 2, visible: false, pinned: true });
  });
});

/* ── 화면 쪽 순수 규칙 ────────────────────────────────────────────────────── */

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

describe('applyFaqOrder(순수 · 낙관적 반영)', () => {
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

/* ── 데이터 소스 — 조회기 배선 위에서 (콘텐츠 화면을 import 하지 않는다) ─────────
 *
 * [왜 진짜 콘텐츠 모듈을 부르지 않나] pages/support → pages/content 는 페이지 간 결합이라
 * 테스트 파일에서도 금지다(code-quality 축1 은 테스트를 예외로 두지 않는다). 이 화면이 지켜야 할
 * 계약은 '조회기가 주는 목록을 큐레이션한다' 이므로 조회기 자리에 표본을 꽂아 그 계약만 검증한다.
 * 실제 콘텐츠 픽스처가 그 자리에 흘러드는지는 콘텐츠 쪽 테스트(content/faq/faq.test.ts)가 맡는다. */

afterEach(() => {
  resetPublishedFaqLookup();
});

describe('data-source — 조회기 위에서 큐레이션한다', () => {
  it('배선되지 않으면 빈 목록이 아니라 오류다 — 배선 사고를 데이터 사고로 보이게 하지 않는다', async () => {
    resetPublishedFaqLookup();
    await expect(fetchCustomerFaqs(new AbortController().signal)).rejects.toThrow(/콘텐츠 관리/);
  });

  it('조회기가 주는 FAQ 가 그대로 목록이 되고, 토글·재정렬이 그 위에 얹힌다', async () => {
    registerPublishedFaqLookup(() => SOURCE);

    const before = await fetchCustomerFaqs(new AbortController().signal);
    expect(before.map((row) => row.question)).toContain('비밀번호를 잊어버렸어요');

    await reorderCustomerFaqs(['FAQ-003', 'FAQ-002', 'FAQ-001'], new AbortController().signal);
    await setCustomerFaqVisible('FAQ-003', false);

    const after = await fetchCustomerFaqs(new AbortController().signal);
    expect(after.map((row) => row.id)).toEqual(['FAQ-003', 'FAQ-002', 'FAQ-001']);
    expect(after[0]?.visible).toBe(false);
    // 질문·카테고리는 여전히 원본 것이다 — 큐레이션이 원본을 덮어쓰지 않는다
    expect(after[0]?.categoryLabel).toBe('배송');
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
