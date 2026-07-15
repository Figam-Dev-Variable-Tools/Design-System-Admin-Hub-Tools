// ESG 분류 좌측 필터 (A41 소유 — apps/admin/src/pages/company/esg/**)
//
// 콘텐츠 목록(FAQ)의 좌측 필터와 같은 골격 — 승격된 filterPanel/filterList/filterItem 스타일을 쓴다.
// 도메인(환경/사회/지배구조)만 이 파일이 안다. 선택 항목과 건수(배지)를 보여준다.
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterPanelStyle,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { ESG_CATEGORY_OPTIONS, ESG_FILTER_ALL } from './types';
import type { EsgFilter } from './types';

interface EsgCategoryFilterProps {
  readonly filter: EsgFilter;
  readonly counts: Record<string, number>;
  readonly onChange: (filter: EsgFilter) => void;
}

const OPTIONS: readonly { readonly id: EsgFilter; readonly label: string }[] = [
  { id: ESG_FILTER_ALL, label: '전체' },
  ...ESG_CATEGORY_OPTIONS,
];

export function EsgCategoryFilter({ filter, counts, onChange }: EsgCategoryFilterProps) {
  return (
    <div style={filterPanelStyle}>
      <nav style={filterNavStyle} aria-label="ESG 분류 필터">
        <h2 style={filterHeadingStyle}>분류</h2>
        <ul style={filterListStyle}>
          {OPTIONS.map((option) => {
            const active = filter === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-current={active}
                  onClick={() => onChange(option.id)}
                >
                  <span>{option.label}</span>
                  <span style={badgeStyle}>{formatNumber(counts[option.id] ?? 0)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
