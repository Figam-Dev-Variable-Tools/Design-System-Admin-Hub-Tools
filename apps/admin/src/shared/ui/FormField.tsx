// 라벨 붙은 폼 필드 껍데기 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [왜 공통인가] 콘텐츠 폼(공지 등록·FAQ 등록·팝업/배너·약관/개인정보)이 전부 같은 필드 골격을 쓴다:
//   라벨(+필수 표식/도움말) · 컨트롤 · 우측 글자수 카운터 · 인라인 오류 · 힌트.
//   이 골격을 페이지마다 손으로 그리면 오류 문구 자리·필수 표식이 화면마다 어긋난다.
//
// [도메인을 모른다] 무슨 필드인지 알지 못한다 — 라벨/오류/힌트 문자열과 자식 컨트롤만 받는다.
//   컨트롤 자체(input/select/textarea)는 호출부가 넣는다 — 이 껍데기는 htmlFor 로만 라벨과 잇는다.
//
// [접근성] 오류는 role="alert" + errorTextStyle 로 색·시맨틱 이중 전달. 힌트/오류 id 를 만들어
//   호출부가 컨트롤의 aria-describedby 에 물릴 수 있게 helpers 로 돌려준다.
import type { CSSProperties, ReactNode } from 'react';

import { HelpTip } from '@tds/ui';

import { errorTextStyle, fieldLabelStyle, fieldStyle, hintStyle } from './styles';

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
};

const labelGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const requiredMarkStyle: CSSProperties = {
  color: 'var(--tds-color-feedback-danger-text)',
};

const counterStyle: CSSProperties = {
  ...hintStyle,
  fontVariantNumeric: 'tabular-nums',
};

interface FormFieldProps {
  /** 컨트롤의 id — label 의 htmlFor 와 잇는다. 힌트/오류 id 는 여기서 파생한다 */
  readonly htmlFor: string;
  readonly label: string;
  readonly required?: boolean;
  /** 있으면 인라인 오류를 그리고, 없으면 힌트만 그린다 */
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  /** 우측 상단 글자수 카운터 ('12/500' 등) */
  readonly counter?: string | undefined;
  /** 라벨 옆 ⓘ 도움말 — 열면 설명이 펼쳐진다 */
  readonly help?: ReactNode;
  readonly children: ReactNode;
}

/** 힌트 id — 호출부가 컨트롤의 aria-describedby 에 물린다 */
export function hintIdOf(htmlFor: string): string {
  return `${htmlFor}-hint`;
}

/** 오류 id — 호출부가 컨트롤의 aria-describedby 에 물린다 */
export function errorIdOf(htmlFor: string): string {
  return `${htmlFor}-error`;
}

export function FormField({
  htmlFor,
  label,
  required = false,
  error,
  hint,
  counter,
  help,
  children,
}: FormFieldProps) {
  const invalid = error !== undefined && error !== '';

  return (
    <div style={fieldStyle}>
      <div style={labelRowStyle}>
        <span style={labelGroupStyle}>
          <label htmlFor={htmlFor} style={fieldLabelStyle}>
            {label}
            {required && (
              <span style={requiredMarkStyle} aria-hidden="true">
                {' *'}
              </span>
            )}
          </label>
          {help !== undefined && <HelpTip label={`${label} 설명`}>{help}</HelpTip>}
        </span>
        {counter !== undefined && <span style={counterStyle}>{counter}</span>}
      </div>

      {children}

      {invalid ? (
        <p id={errorIdOf(htmlFor)} role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : (
        hint !== undefined && (
          <p id={hintIdOf(htmlFor)} style={hintStyle}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
