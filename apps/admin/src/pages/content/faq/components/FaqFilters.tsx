// 좌측 필터 — 카테고리 + 노출 여부
//
// 카테고리 목록은 서버(fetchFaqCategories)에서 오므로 props 로 받는다. 골격은 shared/ui 의
// FilterPanel/FilterRail 한 벌(회원 등급/그룹 필터와 같은 것)을 그대로 쓴다.
import { useMemo } from 'react';

import { FilterPanel, FilterRail } from '../../../../shared/ui';
import type { FilterOption } from '../../../../shared/ui';
import { CATEGORY_ALL, VISIBILITY_FILTERS } from '../types';
import type { FaqCategory, VisibilityCounts, VisibilityFilter } from '../types';

interface FaqFiltersProps {
  readonly categoryId: string;
  readonly visibility: VisibilityFilter;
  readonly categories: readonly FaqCategory[];
  readonly categoryCounts: Record<string, number> | null;
  readonly visibilityCounts: VisibilityCounts | null;
  readonly onCategoryChange: (value: string) => void;
  readonly onVisibilityChange: (value: VisibilityFilter) => void;
}

export function FaqFilters({
  categoryId,
  visibility,
  categories,
  categoryCounts,
  visibilityCounts,
  onCategoryChange,
  onVisibilityChange,
}: FaqFiltersProps) {
  const categoryOptions = useMemo<readonly FilterOption<string>[]>(
    () => [
      { id: CATEGORY_ALL, label: '전체' },
      ...categories.map((item) => ({ id: item.id, label: item.label })),
    ],
    [categories],
  );

  return (
    <FilterRail>
      <FilterPanel
        navLabel="FAQ 카테고리 필터"
        heading="카테고리"
        options={categoryOptions}
        value={categoryId}
        counts={categoryCounts}
        onChange={onCategoryChange}
      />

      <FilterPanel
        navLabel="FAQ 노출 여부 필터"
        heading="노출 여부"
        options={VISIBILITY_FILTERS}
        value={visibility}
        counts={visibilityCounts}
        onChange={onVisibilityChange}
      />
    </FilterRail>
  );
}
