// ESG 화면 전용 타입 + 순수 규칙 (A41 소유 — apps/admin/src/pages/company/esg/**)
import type { StatusTone } from '../../../shared/ui';

export type EsgCategory = 'environment' | 'social' | 'governance';

export interface EsgItem {
  readonly id: string;
  readonly category: EsgCategory;
  readonly title: string;
  readonly summary: string;
  /** 활동 일자 'YYYY-MM-DD' */
  readonly date: string;
}

export interface EsgInput {
  readonly category: EsgCategory;
  readonly title: string;
  readonly summary: string;
  readonly date: string;
}

interface CategoryOption {
  readonly id: EsgCategory;
  readonly label: string;
}

export const ESG_CATEGORY_OPTIONS: readonly CategoryOption[] = [
  { id: 'environment', label: '환경' },
  { id: 'social', label: '사회' },
  { id: 'governance', label: '지배구조' },
];

export function esgCategoryLabel(category: EsgCategory): string {
  const found = ESG_CATEGORY_OPTIONS.find((option) => option.id === category);
  return found?.label ?? category;
}

/** 분류의 색 의도 — 환경=success, 사회=info, 지배구조=neutral */
export function esgCategoryTone(category: EsgCategory): StatusTone {
  if (category === 'environment') return 'success';
  if (category === 'social') return 'info';
  return 'neutral';
}

/** 활동 일자 내림차순(최근이 위). 같은 날짜는 id 로 안정 정렬. **테스트가 직접 부른다.** */
export function sortEsg(list: readonly EsgItem[]): readonly EsgItem[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/* ── 분류 필터 ───────────────────────────────────────────────────────────── */

export const ESG_FILTER_ALL = 'all';
export type EsgFilter = typeof ESG_FILTER_ALL | EsgCategory;

/** 분류 필터 적용. **테스트가 이 순수 함수를 직접 부른다.** */
export function filterEsg(list: readonly EsgItem[], filter: EsgFilter): readonly EsgItem[] {
  if (filter === ESG_FILTER_ALL) return list;
  return list.filter((item) => item.category === filter);
}

/** 분류별 건수(+전체) — 좌측 필터 배지. **테스트가 이 순수 함수를 직접 부른다.** */
export function countEsgByCategory(list: readonly EsgItem[]): Record<string, number> {
  const counts: Record<string, number> = { [ESG_FILTER_ALL]: list.length };
  for (const option of ESG_CATEGORY_OPTIONS) counts[option.id] = 0;
  for (const item of list) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}

export const TITLE_MAX_LENGTH = 120;
export const SUMMARY_MAX_LENGTH = 1000;
