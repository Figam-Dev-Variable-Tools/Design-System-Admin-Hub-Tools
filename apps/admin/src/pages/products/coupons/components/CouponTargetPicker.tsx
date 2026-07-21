// 쿠폰 사용 대상 다중 선택 (회원등급 · 카테고리 · 상품)
//
// [도메인을 모른다] 선택지 목록·선택된 id·콜백만 받는다. 무엇을 고르는 중인지는 라벨이 말하고,
// 검증(한 개 이상)은 호출부 스키마가 한다 — 이 컴포넌트는 입력을 막지 않는다.
//
// [required 를 AT 에 잇는다 — A11Y-11] 마커(*)는 aria-hidden 장식이라 스크린리더에 닿지 않고,
// 이 필드는 FormField 를 거치지 않아 주입도 받지 못한다. **개별 체크박스에 aria-required 를 붙이는
// 것은 거짓말이다** — 필수인 것은 '어느 한 대상' 이 아니라 '고르는 행위' 다. 그래서 묶음을
// role="group" 으로 세우고 그 묶음의 접근성 이름에 필수를 싣는다(marketing 의 SegmentPicker 선례).
import { useId } from 'react';
import type { CSSProperties } from 'react';

import { checkboxStyle, errorTextStyle, fieldLabelStyle, hintStyle } from '../../../../shared/ui';
import { cssVar } from '@tds/ui';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const listStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
  // 상품이 수백 건이 되면 카드가 세로로 무한히 늘어난다 — 선택 영역만 스크롤한다
  maxHeight: `calc(${cssVar('space.6')} * 6)`,
  overflowY: 'auto',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  minWidth: 0,
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
  cursor: 'pointer',
};

export interface CouponTargetOption {
  readonly id: string;
  readonly label: string;
  /** 두 번째 줄 — 상품이면 상품코드, 카테고리면 상위 경로 */
  readonly note?: string;
}

const noteStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  whiteSpace: 'nowrap',
};

interface CouponTargetPickerProps {
  readonly label: string;
  readonly options: readonly CouponTargetOption[];
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
  readonly disabled?: boolean;
  readonly error?: string | undefined;
  /** 선택지를 아직 불러오는 중인가 — 빈 목록과 '없다' 를 가른다 */
  readonly loading?: boolean;
}

export function CouponTargetPicker({
  label,
  options,
  selectedIds,
  onChange,
  disabled = false,
  error,
  loading = false,
}: CouponTargetPickerProps) {
  const noteId = useId();
  const selected = new Set(selectedIds);
  const invalid = error !== undefined && error !== '';

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, id]);
      return;
    }
    onChange(selectedIds.filter((value) => value !== id));
  };

  return (
    <div style={wrapStyle}>
      <span style={fieldLabelStyle}>
        {label}
        <span aria-hidden="true"> *</span>
      </span>

      {loading ? (
        <p style={hintStyle}>선택지를 불러오는 중입니다…</p>
      ) : options.length === 0 ? (
        // 빈 목록으로 뭉개지 않는다 — 고를 것이 없다는 사실과 이유를 함께 말한다
        <p style={hintStyle}>고를 수 있는 대상이 없습니다. 먼저 대상을 등록해 주세요.</p>
      ) : (
        <ul style={listStyle} role="group" aria-label={`${label} (필수)`} aria-describedby={noteId}>
          {options.map((option) => (
            <li key={option.id} style={itemStyle}>
              <label style={labelRowStyle}>
                <input
                  type="checkbox"
                  style={checkboxStyle}
                  checked={selected.has(option.id)}
                  disabled={disabled}
                  onChange={(event) => {
                    toggle(option.id, event.target.checked);
                  }}
                />
                {option.label}
                {option.note !== undefined && <span style={noteStyle}>{option.note}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}

      {/* 선택 수와 오류를 같은 자리에 둔다 — 묶음의 aria-describedby 가 이 한 줄을 가리킨다 */}
      <p id={noteId} style={invalid ? errorTextStyle : hintStyle}>
        {invalid ? error : `${String(selectedIds.length)}개 선택됨`}
      </p>
    </div>
  );
}
