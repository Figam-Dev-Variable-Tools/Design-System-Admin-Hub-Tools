// 치환변수 삽입 바
//
// [왜 _shared 인가] 발송 템플릿·SMS 발송·이메일 발송 세 폼이 같은 `#{변수}` 삽입 UI 를 쓴다. 각 폼이
// 변수 버튼 줄을 복사하면 문법·목록이 어긋난다 — 한 벌만 둔다(marketing 한 페이지 안이라 결합이 아니다).
//
// [도메인을 모른다] 어느 본문에 넣는지 알지 못한다 — onInsert(token) 콜백만 받는다. 호출부가 현재
// 본문 끝에 토큰을 이어 붙인다(커서 위치 삽입은 라이브러리 없이 과하다 — 끝에 덧붙인다).
import type { CSSProperties } from 'react';

import { MESSAGE_VARIABLES } from './messaging';

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
};

const labelStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--tds-space-2)',
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-surface-default)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
  cursor: 'pointer',
};

interface VariableInsertBarProps {
  readonly onInsert: (token: string) => void;
  readonly disabled?: boolean;
}

export function VariableInsertBar({ onInsert, disabled = false }: VariableInsertBarProps) {
  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>치환변수 삽입 — 미리보기에서 표본값으로 치환됩니다.</span>
      <div style={rowStyle}>
        {MESSAGE_VARIABLES.map((variable) => (
          <button
            key={variable.token}
            type="button"
            className="tds-ui-focusable"
            style={{ ...chipStyle, cursor: disabled ? 'not-allowed' : 'pointer' }}
            disabled={disabled}
            onClick={() => onInsert(variable.token)}
            aria-label={`${variable.label} 변수 삽입`}
          >
            {variable.token}
          </button>
        ))}
      </div>
    </div>
  );
}
