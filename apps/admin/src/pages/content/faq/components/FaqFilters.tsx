// 좌측 필터 — 카테고리 + 노출 여부
//
// 카테고리 목록은 서버(fetchFaqCategories)에서 오므로 props 로 받는다. 스타일은 shared/ui 로
// 승격된 좌측 패널 스타일(회원 등급/그룹 필터와 같은 한 벌)을 그대로 쓴다.
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
} from '../../../../shared/ui';
import { CATEGORY_ALL, VISIBILITY_FILTERS } from '../types';
import type { FaqCategory, VisibilityCounts, VisibilityFilter } from '../types';

const wrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  minWidth: 0,
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

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
  const categoryItems = [{ id: CATEGORY_ALL, label: '전체' }, ...categories];

  return (
    <aside style={wrapperStyle}>
      <nav style={groupStyle} aria-label="FAQ 카테고리 필터">
        <h2 style={filterHeadingStyle}>카테고리</h2>
        <ul style={filterListStyle}>
          {categoryItems.map((item) => {
            const active = item.id === categoryId;
            const count = categoryCounts === null ? null : (categoryCounts[item.id] ?? 0);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onCategoryChange(item.id)}
                >
                  <span>{item.label}</span>
                  <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav style={groupStyle} aria-label="FAQ 노출 여부 필터">
        <h2 style={filterHeadingStyle}>노출 여부</h2>
        <ul style={filterListStyle}>
          {VISIBILITY_FILTERS.map((filter) => {
            const active = filter.id === visibility;
            const count = visibilityCounts === null ? null : visibilityCounts[filter.id];
            return (
              <li key={filter.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onVisibilityChange(filter.id)}
                >
                  <span>{filter.label}</span>
                  <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
