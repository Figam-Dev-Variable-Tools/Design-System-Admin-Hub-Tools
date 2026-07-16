// 상품 카테고리 화면 전용 타입 + 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/products/**)
//
// 카테고리 정본(픽스처·사용 중 판정)은 ../_shared/store 다. 여기는 입력 타입·사용량 문구와
// 좌측 필터의 순수 규칙(사용 여부로 거르기·건수)만 둔다.
import { formatNumber } from '../../../shared/format';
import type { ProductCategoryUsage } from '../_shared/store';

/** 카테고리 등록/수정 입력 */
export interface ProductCategoryInput {
  readonly name: string;
}

export const CATEGORY_NAME_MAX = 40;

/** 사용 여부 문구 — 사용 중이면 왜 못 지우는지 알린다(삭제 차단) */
export function usageLabel(productCount: number): string {
  return productCount === 0 ? '미사용' : `${formatNumber(productCount)}개 상품`;
}

/* ── 좌측 필터: 사용 여부 ─────────────────────────────────────────────────── */

/**
 * 사용 여부 필터.
 *
 * [왜 이 축인가] 이 화면의 핵심 제약이 '사용 중인 카테고리는 삭제할 수 없다' 이다. 정리하려는
 * 운영자가 가장 먼저 하려는 일은 **지울 수 있는 것(미사용)만 보기** 이고, 반대로 상품이 몰린
 * 카테고리를 찾는 일도 잦다. 그래서 사용 여부가 이 목록의 자연스러운 필터 축이다.
 */
export const CATEGORY_USAGE_ALL = 'all';

export type CategoryUsageFilter = typeof CATEGORY_USAGE_ALL | 'in-use' | 'unused';

export const CATEGORY_USAGE_FILTERS: readonly {
  readonly id: CategoryUsageFilter;
  readonly label: string;
}[] = [
  { id: CATEGORY_USAGE_ALL, label: '전체' },
  { id: 'in-use', label: '사용 중' },
  { id: 'unused', label: '미사용' },
];

export const CATEGORY_USAGE_FILTER_VALUES: readonly CategoryUsageFilter[] =
  CATEGORY_USAGE_FILTERS.map((option) => option.id);

/** 사용 여부로 거르기('전체'면 전체) */
export function filterCategoriesByUsage(
  list: readonly ProductCategoryUsage[],
  filter: CategoryUsageFilter,
): readonly ProductCategoryUsage[] {
  if (filter === CATEGORY_USAGE_ALL) return list;
  if (filter === 'in-use') return list.filter((category) => category.productCount > 0);
  return list.filter((category) => category.productCount === 0);
}

/** 사용 여부별 건수 — 좌측 필터의 배지 */
export function countCategoriesByUsage(
  list: readonly ProductCategoryUsage[],
): Readonly<Record<CategoryUsageFilter, number>> {
  const inUse = list.filter((category) => category.productCount > 0).length;
  return { all: list.length, 'in-use': inUse, unused: list.length - inUse };
}
