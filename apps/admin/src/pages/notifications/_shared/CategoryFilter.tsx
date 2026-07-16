// 이벤트 분류 좌측 필터 (apps/admin/src/pages/notifications/**)
//
// 세 화면(발송 규칙·이메일 템플릿·SMS 템플릿)이 같은 축(주문/배송/계정/보안)으로 거른다 — 한 벌만 둔다.
// 골격은 승격된 filterPanel/filterList/filterItem 스타일을 그대로 쓴다(ESG·FAQ 좌측 필터와 동일).
//
// [A11Y-12] 선택 상태는 **aria-pressed** 로만 표기한다. 이 버튼은 '토글 필터'이지 '현재 위치'가 아니므로
// aria-current 를 쓰지 않는다(스펙: 필터 목록의 aria-current grep = 0). 기존 EsgCategoryFilter 는
// aria-current 를 써서 스펙을 위반하는데, 그건 그 화면 소유라 이번 배치에서 건드리지 않는다.
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterPanelStyle,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { FILTER_ALL, TRIGGER_CATEGORY_OPTIONS } from './notification';
import type { CategoryFilter } from './notification';

interface CategoryFilterProps {
  readonly filter: CategoryFilter;
  readonly counts: Record<string, number>;
  readonly onChange: (filter: CategoryFilter) => void;
}

const OPTIONS: readonly { readonly id: CategoryFilter; readonly label: string }[] = [
  { id: FILTER_ALL, label: '전체' },
  ...TRIGGER_CATEGORY_OPTIONS,
];

export function CategoryFilter({ filter, counts, onChange }: CategoryFilterProps) {
  return (
    <div style={filterPanelStyle}>
      <nav style={filterNavStyle} aria-label="이벤트 분류 필터">
        <h2 style={filterHeadingStyle}>이벤트 분류</h2>
        <ul style={filterListStyle}>
          {OPTIONS.map((option) => {
            const active = filter === option.id;
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
