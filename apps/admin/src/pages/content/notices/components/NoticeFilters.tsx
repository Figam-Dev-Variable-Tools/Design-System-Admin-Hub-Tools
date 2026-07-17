// 좌측 필터 — 분류 + 상태
//
// 두 축은 다른 필터이며, 함께 고르면 AND 로 걸린다. 제목·목록·항목 스타일은 shared/ui 로 승격된
// 좌측 패널 스타일(회원 등급/그룹 필터와 같은 한 벌)을 그대로 쓴다.
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
} from '../../../../shared/ui';
import { CATEGORY_FILTERS, STATUS_FILTERS } from '../types';
import type { CategoryCounts, CategoryFilter, StatusCounts, StatusFilter } from '../types';

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
    <aside style={wrapperStyle}>
      <nav style={groupStyle} aria-label="공지 분류 필터">
        <h2 style={filterHeadingStyle}>분류</h2>
        <ul style={filterListStyle}>
          {CATEGORY_FILTERS.map((filter) => {
            const active = filter.id === category;
            const count = categoryCounts === null ? null : categoryCounts[filter.id];
            return (
              <li key={filter.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onCategoryChange(filter.id)}
                >
                  <span>{filter.label}</span>
                  <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav style={groupStyle} aria-label="공지 상태 필터">
        <h2 style={filterHeadingStyle}>상태</h2>
        <ul style={filterListStyle}>
          {STATUS_FILTERS.map((filter) => {
            const active = filter.id === status;
            const count = statusCounts === null ? null : statusCounts[filter.id];
            return (
              <li key={filter.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onStatusChange(filter.id)}
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
