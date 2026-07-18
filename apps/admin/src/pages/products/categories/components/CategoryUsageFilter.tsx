// 상품 카테고리 좌측 필터
//
// 좌측 필터의 골격은 shared/ui 의 FilterPanel/FilterRail 한 벌이다 — 여기서 다시 만들지 않는다:
// 제목 + 목록 + 건수 배지(COMP-05) · 선택 상태는 aria-pressed 하나로만 말한다(A11Y-12).
import { FilterPanel, FilterRail } from '../../../../shared/ui';
import { CATEGORY_USAGE_FILTERS } from '../types';
import type { CategoryUsageFilter as UsageFilter } from '../types';

interface CategoryUsageFilterProps {
  readonly value: UsageFilter;
  /** 아직 안 불러왔으면 null — 건수 자리에 '—' 를 둔다 (0 과 '모름' 은 다르다) */
  readonly counts: Readonly<Record<UsageFilter, number>> | null;
  readonly onChange: (filter: UsageFilter) => void;
}

export function CategoryUsageFilter({ value, counts, onChange }: CategoryUsageFilterProps) {
  return (
    <FilterRail>
      <FilterPanel
        navLabel="카테고리 사용 여부 필터"
        heading="사용 여부"
        options={CATEGORY_USAGE_FILTERS}
        value={value}
        counts={counts}
        onChange={onChange}
      />
    </FilterRail>
  );
}
