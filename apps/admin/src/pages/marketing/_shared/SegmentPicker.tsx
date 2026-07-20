// 수신자 세그먼트 선택
//
// [왜 _shared 인가] SMS 발송·이메일 발송·뉴스레터 세 폼이 같은 '세그먼트 다중선택 + 대상 수 합계'를
// 쓴다. 한 벌만 둔다(marketing 한 페이지 안이라 결합이 아니다).
//
// [도메인을 모른다] 세그먼트 목록·선택 id·콜백만 받는다. 검증(빈 대상 금지)은 호출부 스키마가 한다.
//
// [required 를 AT 에 잇는다 — A11Y-11]
//   마커(*)는 aria-hidden 장식이라 스크린리더에 필수 여부가 닿지 않았다. 이 필드는 FormField 를
//   거치지 않으므로 withAriaRequired 주입도 받지 못한다.
//   ⚠ **각 체크박스에 aria-required 를 붙이는 것은 거짓말이다** — 이 필드의 required 는 '최소 한 개를
//   고르라'는 **묶음 단위** 요구이지, 어느 한 세그먼트가 필수라는 뜻이 아니다. 그렇게 붙이면 AT 는
//   '이 세그먼트를 반드시 체크해야 한다'고 읽는다.
//   그래서 묶음을 role="group" 으로 세우고 **그 묶음의 접근성 이름**에 필수를 싣는다. aria-required 는
//   role=group 이 지원하는 속성이 아니므로(ARIA 1.2) 이름이 유일하게 정직한 경로다.
//   대상 수 안내/오류도 그 묶음의 aria-describedby 로 잇는다 — 짝 없는 설명을 남기지 않는다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import { checkboxStyle, errorTextStyle, fieldLabelStyle, hintStyle } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { totalRecipients } from './messaging';
import type { Segment } from './messaging';
import { cssVar } from '@tds/ui';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  cursor: 'pointer',
};

const descStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const countStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const totalStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  fontVariantNumeric: 'tabular-nums',
};

interface SegmentPickerProps {
  readonly label: string;
  readonly segments: readonly Segment[];
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly error?: string | undefined;
}

export function SegmentPicker({
  label,
  segments,
  selectedIds,
  onChange,
  disabled = false,
  required = false,
  error,
}: SegmentPickerProps) {
  const noteId = useId();
  const selected = new Set(selectedIds);
  const invalid = error !== undefined && error !== '';
  const total = totalRecipients(segments, selectedIds);

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
        {required && <span aria-hidden="true"> *</span>}
      </span>

      {/* 묶음 이름이 필수를 싣는다 — 개별 체크박스가 아니라 '고르는 행위' 가 필수다 (A11Y-11) */}
      <ul
        style={listStyle}
        role="group"
        aria-label={`${label}${required ? ' (필수)' : ''}`}
        aria-describedby={noteId}
      >
        {segments.map((segment) => (
          <li key={segment.id} style={itemStyle}>
            <label style={labelRowStyle}>
              <input
                type="checkbox"
                style={checkboxStyle}
                checked={selected.has(segment.id)}
                disabled={disabled}
                onChange={(event) => toggle(segment.id, event.target.checked)}
              />
              <span>
                {segment.label}
                {segment.description !== '' && (
                  <span style={descStyle}> · {segment.description}</span>
                )}
              </span>
            </label>
            <span style={countStyle}>{`${formatNumber(segment.recipientCount)}명`}</span>
          </li>
        ))}
      </ul>

      {invalid ? (
        <p id={noteId} role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : (
        <p id={noteId} style={hintStyle}>
          선택 대상 <span style={totalStyle}>{formatNumber(total)}명</span> — 중복 수신자는 발송 시
          1회로 합산됩니다.
        </p>
      )}
    </div>
  );
}
