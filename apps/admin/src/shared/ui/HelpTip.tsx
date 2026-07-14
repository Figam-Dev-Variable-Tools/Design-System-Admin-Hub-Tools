// ⓘ 도움말 (A40 소유 — apps/admin/src/shared/ui/**)
//
// hover 전용 툴팁은 키보드/터치에서 열리지 않는다 — 버튼을 눌러 여닫는 disclosure 로 만든다.
// aria-expanded 로 상태를, aria-controls 로 설명 문단을 연결한다.
import { useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { InfoCircleIcon } from './icons';

const wrapperStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
};

const triggerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: 'var(--tds-radius-full)',
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const panelStyle: CSSProperties = {
  // 라벨 줄을 밀어내지 않도록 아래로 띄운다
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 1,
  boxSizing: 'border-box',
  width: 'calc(var(--tds-space-6) * 12)',
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-feedback-info-border)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-feedback-info-surface)',
  color: 'var(--tds-color-feedback-info-text)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface HelpTipProps {
  /** 스크린 리더용 트리거 이름 — '그룹 유형 설명' 처럼 무엇에 대한 도움말인지 밝힌다 */
  readonly label: string;
  readonly children: ReactNode;
}

export function HelpTip({ label, children }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <span style={wrapperStyle}>
      <button
        type="button"
        className="tds-ui-btn-ghost tds-ui-focusable"
        style={triggerStyle}
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <InfoCircleIcon />
      </button>

      {/* 열렸을 때만 렌더하면 aria-controls 가 가리키는 요소가 사라진다 — hidden 으로 감춘다 */}
      <p id={panelId} hidden={!open} style={panelStyle}>
        {children}
      </p>
    </span>
  );
}
