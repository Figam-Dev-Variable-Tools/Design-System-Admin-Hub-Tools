// 상품 카테고리 좌측 필터
//
// 회원 화면(TierFilter/GroupFilter)의 좌측 필터가 정본이다 — 새 패턴을 만들지 않는다:
// 승격된 filterPanel/filterNav/filterList/filterItem 스타일(COMP-05) · 건수 배지 ·
// 선택 상태는 aria-pressed 하나로만 말한다(A11Y-12).
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterPanelStyle,
} from '../../../../shared/ui';
import { formatNumber } from '../../../../shared/format';
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
    <div style={filterPanelStyle}>
      <nav style={filterNavStyle} aria-label="카테고리 사용 여부 필터">
        <h2 style={filterHeadingStyle}>사용 여부</h2>

        <ul style={filterListStyle}>
          {CATEGORY_USAGE_FILTERS.map((option) => {
            const active = option.id === value;
            const count = counts === null ? null : counts[option.id];
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onChange(option.id)}
                >
                  <span>{option.label}</span>
                  <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
