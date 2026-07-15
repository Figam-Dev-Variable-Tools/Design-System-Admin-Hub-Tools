// 수신자 세그먼트 선택 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// [왜 _shared 인가] SMS 발송·이메일 발송·뉴스레터 세 폼이 같은 '세그먼트 다중선택 + 대상 수 합계'를
// 쓴다. 한 벌만 둔다(marketing 한 페이지 안이라 결합이 아니다).
//
// [도메인을 모른다] 세그먼트 목록·선택 id·콜백만 받는다. 검증(빈 대상 금지)은 호출부 스키마가 한다.
import type { CSSProperties } from 'react';

import { checkboxStyle, errorTextStyle, fieldLabelStyle, hintStyle } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { totalRecipients } from './messaging';
import type { Segment } from './messaging';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
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
  gap: 'var(--tds-space-3)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  cursor: 'pointer',
};

const descStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const countStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const totalStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
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

      <ul style={listStyle}>
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
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : (
        <p style={hintStyle}>
          선택 대상 <span style={totalStyle}>{formatNumber(total)}명</span> — 중복 수신자는 발송 시
          1회로 합산됩니다.
        </p>
      )}
    </div>
  );
}
