// 연혁 화면의 동작 회귀 테스트 (A41) — 정렬(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import { sortHistory } from './types';
import type { HistoryItem } from './types';
import { historySchema } from './validation';
import type { HistoryFormValues } from './validation';

function itemOf(overrides: Partial<HistoryItem> & { id: string }): HistoryItem {
  return { year: 2020, month: 1, content: '내용', ...overrides };
}

describe('sortHistory — 연·월 내림차순(순수)', () => {
  it('최근 연도가 위로 온다', () => {
    const sorted = sortHistory([
      itemOf({ id: 'a', year: 2018, month: 3 }),
      itemOf({ id: 'b', year: 2024, month: 1 }),
      itemOf({ id: 'c', year: 2021, month: 12 }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('같은 연도는 월 내림차순', () => {
    const sorted = sortHistory([
      itemOf({ id: 'a', year: 2020, month: 3 }),
      itemOf({ id: 'b', year: 2020, month: 11 }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('원본을 변형하지 않는다', () => {
    const input = [itemOf({ id: 'a', year: 2018 }), itemOf({ id: 'b', year: 2024 })];
    sortHistory(input);
    expect(input.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

function valuesOf(overrides: Partial<HistoryFormValues> = {}): HistoryFormValues {
  return { year: '2024', month: '3', content: '연혁 내용', ...overrides };
}

function messageFor(values: HistoryFormValues, field: keyof HistoryFormValues): string | undefined {
  const result = historySchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('historySchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(historySchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('연도가 비면 막는다', () => {
    expect(messageFor(valuesOf({ year: '' }), 'year')).toContain('입력');
  });

  it('연도가 범위를 벗어나면 막는다', () => {
    expect(messageFor(valuesOf({ year: '1800' }), 'year')).toContain('범위');
  });

  it('월이 1~12 밖이면 막는다', () => {
    expect(messageFor(valuesOf({ month: '13' }), 'month')).toContain('범위');
    expect(messageFor(valuesOf({ month: '0' }), 'month')).toContain('범위');
  });

  it('내용이 비면 막는다', () => {
    expect(messageFor(valuesOf({ content: '   ' }), 'content')).toContain('입력');
  });
});
