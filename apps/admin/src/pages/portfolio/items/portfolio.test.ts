// 포트폴리오 항목 동작 회귀 테스트 (A41) — 정렬·필터·건수(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import {
  countItemsUsingCategory,
  countPortfolioByCategory,
  filterPortfolioItems,
  MAX_PORTFOLIO_IMAGES,
  sortPortfolioItems,
} from '../_shared/store';
import type { PortfolioItem } from '../_shared/store';
import { toPortfolioInput } from './types';
import { portfolioSchema } from './validation';
import type { PortfolioFormValues } from './validation';

function itemOf(overrides: Partial<PortfolioItem> & { id: string }): PortfolioItem {
  return {
    title: '제목',
    categoryId: 'office',
    categoryLabel: '오피스',
    client: '가온테크',
    summary: '소개',
    coverImageUrl: 'blob:cover',
    imageUrls: [],
    published: true,
    date: '2023-01-01',
    ...overrides,
  };
}

const SAMPLE: readonly PortfolioItem[] = [
  itemOf({ id: 'a', categoryId: 'residential', date: '2024-05-20' }),
  itemOf({ id: 'b', categoryId: 'office', date: '2024-02-11' }),
  itemOf({ id: 'c', categoryId: 'residential', date: '2023-11-03' }),
];

describe('sortPortfolioItems — 일자 내림차순(순수)', () => {
  it('최근 일자가 위로 온다', () => {
    expect(sortPortfolioItems(SAMPLE).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('filterPortfolioItems — 분류 필터(순수)', () => {
  it('전체는 모두 돌려준다', () => {
    expect(filterPortfolioItems(SAMPLE, 'all').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('주거 공간만', () => {
    expect(filterPortfolioItems(SAMPLE, 'residential').map((x) => x.id)).toEqual(['a', 'c']);
  });
});

describe('countPortfolioByCategory · countItemsUsingCategory — 건수(순수)', () => {
  it('전체 + 분류별 건수를 센다', () => {
    const counts = countPortfolioByCategory(SAMPLE);
    expect(counts['all']).toBe(3);
    expect(counts['residential']).toBe(2);
    expect(counts['office']).toBe(1);
  });

  it('특정 분류를 쓰는 항목 수 — 삭제 차단 판단', () => {
    expect(countItemsUsingCategory('residential', SAMPLE)).toBe(2);
    expect(countItemsUsingCategory('commercial', SAMPLE)).toBe(0);
  });
});

describe('toPortfolioInput — 항목 → 폼 입력', () => {
  it('id·비정규화 라벨을 뺀 입력을 만든다', () => {
    const input = toPortfolioInput(itemOf({ id: 'a', title: '리모델링' }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('categoryLabel');
    expect(input.title).toBe('리모델링');
  });
});

function valuesOf(overrides: Partial<PortfolioFormValues> = {}): PortfolioFormValues {
  return {
    title: '리버뷰 리모델링',
    categoryId: 'residential',
    client: '한빛개발',
    summary: '펜트하우스 리모델링',
    date: '2024-05-20',
    coverImageUrl: 'blob:cover',
    imageUrls: [],
    published: true,
    ...overrides,
  };
}

function messageFor(
  values: PortfolioFormValues,
  field: keyof PortfolioFormValues,
): string | undefined {
  const result = portfolioSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('portfolioSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(portfolioSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('제목·고객사·소개가 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '' }), 'title')).toContain('입력');
    expect(messageFor(valuesOf({ client: '  ' }), 'client')).toContain('입력');
    expect(messageFor(valuesOf({ summary: '' }), 'summary')).toContain('입력');
  });

  it('분류를 고르지 않으면 막는다', () => {
    expect(messageFor(valuesOf({ categoryId: '' }), 'categoryId')).toContain('선택');
  });

  it('대표 이미지가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ coverImageUrl: '' }), 'coverImageUrl')).toContain('등록');
  });

  it('일자 형식이 틀리면 막는다', () => {
    expect(messageFor(valuesOf({ date: '2024.05.20' }), 'date')).toContain('형식');
  });

  it('본문 이미지가 최대 장수를 넘으면 막는다', () => {
    const many = Array.from({ length: MAX_PORTFOLIO_IMAGES + 1 }, (_, i) => `blob:${String(i)}`);
    expect(messageFor(valuesOf({ imageUrls: many }), 'imageUrls')).toContain('최대');
  });
});
