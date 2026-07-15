// ESG 화면의 동작 회귀 테스트 (A41) — 정렬·필터·건수(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import { countEsgByCategory, esgCategoryLabel, filterEsg, sortEsg } from './types';
import type { EsgItem } from './types';
import { esgSchema } from './validation';
import type { EsgFormValues } from './validation';

function itemOf(overrides: Partial<EsgItem> & { id: string }): EsgItem {
  return {
    category: 'environment',
    title: '제목',
    summary: '내용',
    date: '2023-01-01',
    ...overrides,
  };
}

const SAMPLE: readonly EsgItem[] = [
  itemOf({ id: 'a', category: 'environment', date: '2024-03-05' }),
  itemOf({ id: 'b', category: 'social', date: '2023-11-18' }),
  itemOf({ id: 'c', category: 'governance', date: '2023-07-02' }),
  itemOf({ id: 'd', category: 'environment', date: '2022-12-10' }),
];

describe('sortEsg — 일자 내림차순(순수)', () => {
  it('최근 일자가 위로 온다', () => {
    expect(sortEsg(SAMPLE).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('filterEsg — 분류 필터(순수)', () => {
  it('전체는 모두 돌려준다', () => {
    expect(filterEsg(SAMPLE, 'all').map((x) => x.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('환경만', () => {
    expect(filterEsg(SAMPLE, 'environment').map((x) => x.id)).toEqual(['a', 'd']);
  });

  it('지배구조만', () => {
    expect(filterEsg(SAMPLE, 'governance').map((x) => x.id)).toEqual(['c']);
  });
});

describe('countEsgByCategory — 분류별 건수(순수)', () => {
  it('전체 + 분류별 건수를 센다', () => {
    const counts = countEsgByCategory(SAMPLE);
    expect(counts['all']).toBe(4);
    expect(counts['environment']).toBe(2);
    expect(counts['social']).toBe(1);
    expect(counts['governance']).toBe(1);
  });
});

describe('esgCategoryLabel', () => {
  it('분류 라벨', () => {
    expect(esgCategoryLabel('environment')).toBe('환경');
    expect(esgCategoryLabel('social')).toBe('사회');
    expect(esgCategoryLabel('governance')).toBe('지배구조');
  });
});

function valuesOf(overrides: Partial<EsgFormValues> = {}): EsgFormValues {
  return {
    category: 'environment',
    title: '전력 전환',
    summary: '재생에너지 전환',
    date: '2024-03-05',
    ...overrides,
  };
}

function messageFor(values: EsgFormValues, field: keyof EsgFormValues): string | undefined {
  const result = esgSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('esgSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(esgSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('분류가 세 값이 아니면 막는다', () => {
    expect(
      messageFor(valuesOf({ category: 'other' as EsgFormValues['category'] }), 'category'),
    ).toContain('선택');
  });

  it('제목·내용이 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '' }), 'title')).toContain('입력');
    expect(messageFor(valuesOf({ summary: '  ' }), 'summary')).toContain('입력');
  });

  it('일자 형식이 틀리면 막는다', () => {
    expect(messageFor(valuesOf({ date: '2024.03.05' }), 'date')).toContain('형식');
  });
});
