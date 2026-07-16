// 치환변수 삽입 바 (apps/admin/src/pages/notifications/**)
//
// [마케팅의 같은 이름 컴포넌트와 다른 점] 마케팅 것은 전 변수를 항상 보여준다(세그먼트 회원 속성이라
// 캠페인 무관하게 늘 쓸 수 있다). 이쪽은 **선택한 트리거가 주는 변수만** 보여준다 — '배송 출발' 이벤트는
// #{송장번호}를 주지만 #{인증번호}는 주지 않는다. 트리거를 바꾸면 칩 목록이 따라 바뀐다.
// (pages/marketing 의 것을 import 하지 않는다 — 페이지 간 결합은 code-quality 축1 blocker.)
//
// [도메인을 모른다] 어느 본문에 넣는지 알지 못한다 — onInsert(token) 콜백만 받는다. 호출부가 현재 본문
// 끝에 토큰을 이어 붙인다(커서 위치 삽입은 라이브러리 없이 과하다).
import type { CSSProperties } from 'react';

import { variablesFor } from './notification';
import type { TriggerId } from './notification';

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
};

interface VariableInsertBarProps {
  /** 지금 고른 트리거 — 이 이벤트가 주는 변수만 칩으로 낸다 */
  readonly trigger: TriggerId;
  readonly onInsert: (token: string) => void;
  readonly disabled?: boolean;
}

export function VariableInsertBar({ trigger, onInsert, disabled = false }: VariableInsertBarProps) {
  return (
    <div style={wrapStyle}>
      <span style={labelStyle}>
        치환변수 삽입 — 이 이벤트가 주는 값만 쓸 수 있습니다. 미리보기에서 표본값으로 치환됩니다.
      </span>
      <div style={rowStyle}>
        {variablesFor(trigger).map((variable) => (
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
