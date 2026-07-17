// 좌측 분류 필터 패널
//
// [왜 이 파일이 있나 — 같은 것이 두 벌이었다]
// ESG 분류 필터와 알림 관리의 이벤트 분류 필터는 **구조가 글자까지 같았다**: 같은 골격
// (filterPanel > nav > h2 > ul > li > button), 같은 상태 표기(aria-pressed), 같은 배지(건수).
// 다른 것은 셋뿐이었다 — nav 의 aria-label, 제목, 그리고 항목 목록. 그건 데이터이지 구조가 아니다.
// (알림 관리 섹션은 shared/** 를 못 고치는 상태에서 ESG 것을 복제할 수밖에 없었다. clone 검출됨.)
//
// 두 벌이면 규칙이 갈라진다. 실제로 갈라져 있었다: 한쪽은 aria-current 를, 다른 쪽은
// aria-pressed 를 썼다(A11Y-12 위반 + 공유 hover 규칙이 비껴가던 시각 버그). 한 벌이면
// 그 질문에 답이 하나뿐이다.
//
// [A11Y-12] 선택 상태는 **aria-pressed** 하나로 말한다. 이 버튼은 '토글 필터'이지 '현재 위치'가
// 아니다 — aria-current 는 내비게이션의 것이다. 공유 hover 규칙
// `.tds-ui-listitem[aria-pressed='false']` 도 이 표기에 맞춰져 있다.
import { formatNumber } from '../format';
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterPanelStyle,
} from './styles';

/** 필터 항목 — id 는 화면이 정한 유니온이라 제네릭으로 열어 둔다('as' 없이 좁혀 돌려준다) */
interface FilterOption<T extends string> {
  readonly id: T;
  readonly label: string;
}

interface FilterPanelProps<T extends string> {
  /** nav 의 접근성 이름 — 한 화면에 패널이 둘 이상일 수 있어 각자 이름을 갖는다 */
  readonly navLabel: string;
  readonly heading: string;
  readonly options: readonly FilterOption<T>[];
  readonly value: T;
  /** 항목 id → 건수. 없는 항목은 0 으로 본다 */
  readonly counts: Readonly<Record<string, number>>;
  readonly onChange: (next: T) => void;
}

export function FilterPanel<T extends string>({
  navLabel,
  heading,
  options,
  value,
  counts,
  onChange,
}: FilterPanelProps<T>) {
  return (
    <div style={filterPanelStyle}>
      <nav style={filterNavStyle} aria-label={navLabel}>
        <h2 style={filterHeadingStyle}>{heading}</h2>
        <ul style={filterListStyle}>
          {options.map((option) => {
            const active = value === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => {
                    onChange(option.id);
                  }}
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
