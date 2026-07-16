// TextareaField — 제어 textarea + 글자수 카운터 (molecule · contracts/TextareaField.contract.json@1.1.0)
//
// Props 타입은 계약에서 생성된 generated/types/TextareaField.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 계약 dependencies: FormField (molecule). 라벨/오류/힌트/필수 표식 + 우측 카운터('N/max')는 FormField 에
// 위임하고, 이 컴포넌트는 그 슬롯 안에 제어 <textarea> 를 넣어 htmlFor(useId)·aria-* 로 배선한다.
//
// [onChange 는 값 콜백] 네이티브 이벤트가 아니라 새 문자열(event.target.value)을 넘긴다 (호출부 계약 보존).
//   계약 events.onChange.blockedWhen[disabled] — disabled 에서는 발화 금지. 내부 가드로 차단하고
//   native disabled 로도 이중 차단한다 (PasswordField 선례 — 렌더만으로는 비발생을 증명하지 못한다).
//
// [exactOptionalPropertyTypes] 호출부는 error/hint/placeholder 에 string|undefined 를 그대로 넘긴다 —
//   계약 타입을 경계에서 넓혀 받고 정규화한다 (FormField 와 동일 처리, 호출부 30곳 무변경).
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import { useId } from 'react';

import { errorIdOf, FormField, hintIdOf } from '../FormField';
import type { TextareaFieldProps } from '../../../generated/types/TextareaField.types';
import './TextareaField.css';

/** exactOptionalPropertyTypes — 옵셔널 문자열 prop 을 경계에서 undefined 허용으로 넓힌다 */
type TextareaFieldComponentProps = Omit<TextareaFieldProps, 'error' | 'hint' | 'placeholder'> & {
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly placeholder?: string | undefined;
};

export function TextareaField({
  label,
  value,
  onChange,
  maxLength,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder,
  rows = 8,
}: TextareaFieldComponentProps) {
  const id = useId();
  const invalid = error !== undefined && error !== '';
  const controlClass = invalid
    ? 'tds-textarea__control tds-textarea__control--invalid'
    : 'tds-textarea__control';

  return (
    <FormField
      htmlFor={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
      counter={`${String(value.length)}/${String(maxLength)}`}
    >
      <textarea
        id={id}
        className={controlClass}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        // required 는 FormField 의 마커(aria-hidden 장식)로만 그려져 AT 에 닿지 않았다 —
        // 컨트롤 자신에게 native required + aria-required 로 잇는다 (A11Y-11)
        required={required}
        aria-required={required ? true : undefined}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined}
        onChange={(event) => {
          // 계약 events.onChange.blockedWhen — disabled 에서는 발화 금지
          if (disabled) return;
          onChange?.(event.target.value);
        }}
      />
    </FormField>
  );
}
