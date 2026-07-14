// 상품 등록 화면 스타일 (SCR-003) — AppShell과 동일한 스타일 관례를 따른다.
//
// [스타일 규칙 — G6 체크리스트]
// - 모든 시각 값은 토큰 CSS 변수(var(--tds-*))만 사용 — 하드코딩 색상 hex / px 리터럴 0건.
// - 토큰에 없는 파생 치수(섬네일 크기·드롭존 높이 등)는 space 토큰의 calc 배수로 표현한다.
// - 보더 두께는 px 리터럴 대신 CSS 키워드(thin)를 사용한다.
//
// [토큰 공백 — A20/토큰 소유자에게 보고 대상]
// 현재 tokens.json에는 feedback(success/danger/warning) 색상 계열이 없다(blue·gray 뿐).
// 따라서 Alert/에러 텍스트를 색으로 구분할 수 없어, 색 대신 다음 수단으로 구분한다:
//   role="alert"/"status" + 굵기(font-weight) + 접두 라벨("오류", "완료", "안내") + 보더 강조.
// feedback 토큰이 추가되면 tone별 background/border/text만 교체하면 된다.
import type { CSSProperties } from 'react';

export const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  // 폼 가독 폭 제한 — space 토큰 파생 치수
  maxWidth: 'calc(var(--tds-space-6) * 36)',
};

export const pageTitleStyle: CSSProperties = {
  margin: 0,
};

export const pageDescriptionStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
};

export const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

export const fieldsetStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  margin: 0,
  padding: 'var(--tds-space-5)',
  border: 'thin solid var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-default)',
  minWidth: 0,
};

export const legendStyle: CSSProperties = {
  padding: 'var(--tds-space-1) var(--tds-space-2)',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  color: 'var(--tds-color-text-default)',
};

export const sectionDescriptionStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

export const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  minWidth: 0,
};

export const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
};

export const labelStyle: CSSProperties = {
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  color: 'var(--tds-color-text-default)',
};

export const requiredMarkStyle: CSSProperties = {
  marginLeft: 'var(--tds-space-1)',
  color: 'var(--tds-color-action-primary-default)',
};

export const counterStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

export const hintStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
};

/** 인라인 에러 — 토큰에 danger 색이 없어 굵기 + "오류:" 접두로 구분한다 */
export const errorTextStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

function controlBase(invalid: boolean): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: 'var(--tds-space-2) var(--tds-space-3)',
    borderRadius: 'var(--tds-radius-md)',
    border: 'thin solid',
    borderColor: invalid ? 'var(--tds-color-border-focus)' : 'var(--tds-color-border-default)',
    borderWidth: invalid ? 'medium' : 'thin',
    background: 'var(--tds-color-surface-default)',
    color: 'var(--tds-color-text-default)',
    fontFamily: 'var(--tds-typography-body-md-font-family)',
    fontSize: 'var(--tds-typography-body-md-font-size)',
    lineHeight: 'var(--tds-typography-body-md-line-height)',
    outlineColor: 'var(--tds-color-border-focus)',
  };
}

export function inputStyle(invalid: boolean): CSSProperties {
  return controlBase(invalid);
}

export function textareaStyle(invalid: boolean): CSSProperties {
  return {
    ...controlBase(invalid),
    // 최소 높이 = space 토큰 배수 (raw px 금지)
    minHeight: 'calc(var(--tds-space-6) * 5)',
    resize: 'vertical',
  };
}

export function selectStyle(invalid: boolean, disabled: boolean): CSSProperties {
  return {
    ...controlBase(invalid),
    color: disabled ? 'var(--tds-color-text-disabled)' : 'var(--tds-color-text-default)',
    background: disabled ? 'var(--tds-color-surface-raised)' : 'var(--tds-color-surface-default)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export type ButtonVariant = 'primary' | 'secondary' | 'text';

export function buttonStyle(variant: ButtonVariant, disabled: boolean): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--tds-component-button-gap)',
    padding: 'var(--tds-component-button-padding-y) var(--tds-component-button-padding-x)',
    borderRadius: 'var(--tds-component-button-radius)',
    border: 'thin solid transparent',
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    fontWeight: 'var(--tds-typography-label-md-font-weight)',
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color var(--tds-component-button-transition-duration)',
    outlineColor: 'var(--tds-component-button-focus-ring)',
  };

  if (variant === 'primary') {
    return {
      ...base,
      background: disabled
        ? 'var(--tds-component-button-background-disabled)'
        : 'var(--tds-component-button-background)',
      color: disabled ? 'var(--tds-color-text-disabled)' : 'var(--tds-component-button-text)',
    };
  }
  if (variant === 'secondary') {
    return {
      ...base,
      background: 'var(--tds-color-surface-default)',
      borderColor: disabled
        ? 'var(--tds-color-action-primary-disabled)'
        : 'var(--tds-color-border-default)',
      color: disabled ? 'var(--tds-color-text-disabled)' : 'var(--tds-color-text-default)',
    };
  }
  return {
    ...base,
    padding: 'var(--tds-space-1) var(--tds-space-2)',
    background: 'transparent',
    color: disabled ? 'var(--tds-color-text-disabled)' : 'var(--tds-color-action-primary-default)',
    textDecoration: 'underline',
  };
}

export const actionsRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

/** Alert — tone별 색 구분 토큰 부재로 보더 강조 + role로 구분(파일 상단 주석 참조) */
export const alertStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  padding: 'var(--tds-space-3) var(--tds-space-4)',
  borderRadius: 'var(--tds-radius-md)',
  border: 'thin solid var(--tds-color-border-default)',
  borderLeft: 'medium solid var(--tds-color-action-primary-default)',
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-default)',
};

export const alertMessageStyle: CSSProperties = {
  margin: 0,
  display: 'flex',
  gap: 'var(--tds-space-2)',
  alignItems: 'baseline',
};

export const alertLabelStyle: CSSProperties = {
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  whiteSpace: 'nowrap',
};

export const alertActionsStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

export function dropzoneStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--tds-space-2)',
    padding: 'var(--tds-space-6)',
    borderRadius: 'var(--tds-radius-lg)',
    border: 'medium dashed',
    borderColor: active ? 'var(--tds-color-border-focus)' : 'var(--tds-color-border-default)',
    background: active ? 'var(--tds-color-surface-raised)' : 'var(--tds-color-surface-default)',
    color: disabled ? 'var(--tds-color-text-disabled)' : 'var(--tds-color-text-default)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'center',
    outlineColor: 'var(--tds-color-border-focus)',
    transition: 'background-color var(--tds-motion-duration-fast)',
  };
}

export const imageListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

export const imageRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  padding: 'var(--tds-space-2)',
  border: 'thin solid var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-default)',
};

/** 섬네일 — 정사각 크기는 space 토큰 배수로 파생 */
export const thumbnailStyle: CSSProperties = {
  width: 'calc(var(--tds-space-6) * 2.5)',
  height: 'calc(var(--tds-space-6) * 2.5)',
  flexShrink: 0,
  objectFit: 'cover',
  borderRadius: 'var(--tds-radius-sm)',
  border: 'thin solid var(--tds-color-border-default)',
  background: 'var(--tds-color-surface-raised)',
};

export const thumbnailFallbackStyle: CSSProperties = {
  ...thumbnailStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
};

export const imageMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  flexGrow: 1,
  minWidth: 0,
};

export const imageNameStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 'var(--tds-typography-label-md-font-size)',
};

export const imageActionsStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--tds-space-1)',
  flexShrink: 0,
};

export const progressTrackStyle: CSSProperties = {
  width: '100%',
  height: 'var(--tds-space-1)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-surface-raised)',
  overflow: 'hidden',
};

export function progressBarStyle(percent: number): CSSProperties {
  return {
    width: `${String(percent)}%`,
    height: '100%',
    background: 'var(--tds-color-action-primary-default)',
    transition: 'width var(--tds-motion-duration-fast)',
  };
}

/** '대표' Badge (§5.3 규칙 6) */
export const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: 'var(--tds-space-1) var(--tds-space-2)',
  borderRadius: 'var(--tds-radius-full)',
  background: 'var(--tds-color-action-primary-default)',
  color: 'var(--tds-color-text-on-primary)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  whiteSpace: 'nowrap',
};

export const emptyStateStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  padding: 'var(--tds-space-6)',
  border: 'thin dashed var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-raised)',
  textAlign: 'center',
};

export const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: 'var(--tds-space-1)',
  height: 'var(--tds-space-1)',
  padding: 0,
  margin: 'calc(var(--tds-space-1) * -1)',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * 인라인 style로 표현할 수 없는 상태(:focus-visible, ::placeholder, keyframes 스피너)만
 * 스코프 클래스로 정의한다. 값은 전부 토큰 변수 — 하드코딩 색상/px 0건.
 */
export const SCOPED_CSS = `
.tds-pr-spinner {
  display: inline-block;
  width: var(--tds-space-3);
  height: var(--tds-space-3);
  border: thin solid currentColor;
  border-top-color: transparent;
  border-radius: var(--tds-radius-full);
  animation: tds-pr-spin var(--tds-motion-duration-slow) linear infinite;
}
@keyframes tds-pr-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .tds-pr-spinner { animation: none; }
}
.tds-pr-input::placeholder {
  color: var(--tds-color-text-muted);
}
.tds-pr-focusable:focus-visible {
  outline: medium solid var(--tds-color-border-focus);
  outline-offset: var(--tds-space-1);
}
`;
