// Button — 기본 액션 버튼 (atom · contracts/Button.contract.json@1.1.0)
//
// Props 타입은 계약에서 생성된 generated/types/Button.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 시각 값은 전부 component.button.* / semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건 (G5/G6).
// 상태(hover/active/focus-visible/disabled)는 Button.css 의 의사 클래스가 소유한다.
//
// [네이티브 속성 패스스루 — Card 선례(Card.tsx:14)]
//   계약 props 외의 표준 HTML/ARIA 속성(aria-label · aria-describedby · title …)은 <button> 으로
//   그대로 전달한다. className/style 은 토큰 규칙 보호를 위해 차단한다.
//   **native 를 마지막에 spread 한다** — 호출부가 명시한 aria-busy 가 loading 파생값을 덮게 하기
//   위해서다 (계약 a11y.aria.native-passthrough: ConfirmDialog 는 스피너 없이 aria-busy 만 쓴다).
//   계약이 소유한 표면(type · onClick · children)은 native 슬라이스에서 제외한다 — ButtonProps 가
//   이미 선언했고, 두 선언이 교차하면 계약 타입(type: string)이 DOM 의 3값 유니온으로 좁아져
//   "그 외 값은 button 으로 좁힌다"는 계약의 런타임 규칙을 타입이 먼저 막아버린다.
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';

import type { ButtonProps } from '../../../generated/types/Button.types';
import './Button.css';

type ButtonNativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'style' | 'className' | 'children' | 'type' | 'onClick'
>;

/** DOM 이 받는 button type — 계약: submit · reset 은 그대로, 그 외 값은 button 으로 좁힌다 */
type NativeButtonType = 'button' | 'submit' | 'reset';

/**
 * 계약 props.type 의 좁힘 규칙.
 *
 * **type 을 하드코딩하면 폼이 조용히 죽는다** (계약 a11y.aria.type-submit) — type="submit" 은 폼 제출
 * 시맨틱이고, 이 버튼이 <form> 안에 있으면 Enter 키 제출도 함께 살아난다. 기본값이 'button' 인 것은
 * HTML 기본값(submit)을 의도적으로 뒤집은 DS 결정이다 (폼 안의 보조 버튼이 실수로 제출하지 않게).
 */
function nativeType(type: string): NativeButtonType {
  return type === 'submit' || type === 'reset' ? type : 'button';
}

/** 로딩 스피너 — 텍스트 색(currentColor) 기준 1em 원. 장식이므로 aria-hidden */
function Spinner() {
  return <span className="tds-button__spinner" aria-hidden="true" />;
}

/** 좌측 아이콘 슬롯 래퍼 — loading 중에는 스피너로 대체되어 렌더되지 않는다 (계약 hiddenWhen) */
function IconSlot({ children }: { readonly children: ReactNode }) {
  return (
    <span className="tds-button__icon" aria-hidden="true">
      {children}
    </span>
  );
}

export function Button({
  variant = 'primary',
  type = 'button',
  size = 'md',
  loading = false,
  disabled = false,
  isFullWidth = false,
  iconLeft = null,
  children,
  onClick,
  ...native
}: ButtonProps & ButtonNativeProps) {
  // 계약 events.onClick.blockedWhen — disabled/loading 에서는 발화 금지
  const blocked = disabled || loading;
  const hasIcon = iconLeft !== null && iconLeft !== undefined && iconLeft !== false;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (blocked) return;
    onClick?.(event);
  };

  const className = [
    'tds-button',
    `tds-button--${variant}`,
    `tds-button--${size}`,
    isFullWidth ? 'tds-button--full-width' : '',
  ]
    .filter((token) => token !== '')
    .join(' ');

  return (
    <button
      type={nativeType(type)}
      className={className}
      disabled={disabled}
      aria-disabled={disabled ? true : undefined}
      aria-busy={loading ? true : undefined}
      onClick={handleClick}
      // native 가 마지막이다 — 호출부의 aria-busy 가 loading 파생값을 덮는다 (계약 a11y)
      {...native}
    >
      {loading ? <Spinner /> : hasIcon ? <IconSlot>{iconLeft}</IconSlot> : null}
      <span className="tds-button__label">{children}</span>
    </button>
  );
}
