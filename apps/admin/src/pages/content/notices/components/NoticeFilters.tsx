// 좌측 필터 — 분류 + 상태
//
// 두 축은 다른 필터이며, 함께 고르면 AND 로 걸린다. 골격은 shared/ui 의 FilterPanel/FilterRail
// 한 벌(회원 등급/그룹 필터와 같은 것)을 그대로 쓴다 — 여기서 다시 만들지 않는다.
import { FilterPanel, FilterRail } from '../../../../shared/ui';
import { CATEGORY_FILTERS, STATUS_FILTERS } from '../types';
import type { CategoryCounts, CategoryFilter, StatusCounts, StatusFilter } from '../types';

interface NoticeFiltersProps {
  readonly category: CategoryFilter;
  readonly status: StatusFilter;
  readonly categoryCounts: CategoryCounts | null;
  readonly statusCounts: StatusCounts | null;
  readonly onCategoryChange: (value: CategoryFilter) => void;
  readonly onStatusChange: (value: StatusFilter) => void;
}

export function NoticeFilters({
  category,
  status,
  categoryCounts,
  statusCounts,
  onCategoryChange,
  onStatusChange,
}: NoticeFiltersProps) {
  return (
    <FilterRail>
      <FilterPanel
        navLabel="공지 분류 필터"
        heading="분류"
        options={CATEGORY_FILTERS}
        value={category}
        counts={categoryCounts}
        onChange={onCategoryChange}
      />

      <FilterPanel
        navLabel="공지 상태 필터"
        heading="상태"
        options={STATUS_FILTERS}
        value={status}
        counts={statusCounts}
        onChange={onStatusChange}
      />
    </FilterRail>
  );
}
