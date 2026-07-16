// TextField — 라벨 + 단일행 입력 + 인라인 에러 (atom · contracts/TextField.contract.json@1.1.0)
//
// 값과 콜백만 받는 제어 컴포넌트 — 유효성 규칙·상태 머신·API 는 소유하지 않는다.
// 에러는 색상만으로 전달하지 않는다(WCAG 1.4.1) — 메시지 텍스트를 함께 렌더하고
// aria-invalid + aria-describedby={`${id}-error`} 로 연결한다.
//
// [라벨에 마커(*)를 주입하지 않는다 — 계약 props.required]
//   <label> 의 textContent 가 곧 input 의 접근 가능한 이름이다. 마커를 넣으면 이름이 "이메일*" 이 되어
//   getByLabelText('이메일') 정확일치가 깨진다 (E2E FS-001). required 는 native required 속성으로만
//   노출한다 (→ aria-required). aria-hidden 을 붙여도 소용없다 — Testing Library/Playwright 의 라벨
//   텍스트 수집은 textContent 기반이라 이름이 그대로 오염된다.
//
// [ref · 네이티브 속성 패스스루]
//   input 참조는 계약 prop 이 아니라 forwardRef 로 노출한다 (제출 실패 시 첫 오류 필드로 포커스 이동).
//   계약 props 외의 표준 input 속성(maxLength · readOnly · aria-* …)은 <input> 으로 전달한다.
//   계약이 소유한 표면은 native 슬라이스에서 제외한다 — 계약 타입(name/autoComplete/inputMode: string)이
//   DOM 의 좁은 유니온으로 교차되지 않게 한다.
import { forwardRef } from 'react';
import type { ChangeEvent, FocusEvent, InputHTMLAttributes } from 'react';

import type { TextFieldProps } from '../../../generated/types/TextField.types';
import './TextField.css';

type TextFieldNativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'style'
  | 'className'
  | 'children'
  | 'id'
  | 'type'
  | 'value'
  | 'disabled'
  | 'required'
  | 'placeholder'
  | 'name'
  | 'autoComplete'
  | 'inputMode'
  | 'onChange'
  | 'onBlur'
>;

/** DOM 이 받는 inputmode 열거값 — 계약은 string 이지만 DOM 은 이 목록만 받는다 */
const INPUT_MODES = [
  'none',
  'text',
  'decimal',
  'numeric',
  'tel',
  'search',
  'email',
  'url',
] as const;

type NativeInputMode = (typeof INPUT_MODES)[number];

/** 계약값(string) → DOM 열거값. 빈 문자열/미지원 값이면 속성을 부여하지 않는다 */
function nativeInputMode(value: string): NativeInputMode | undefined {
  return INPUT_MODES.find((mode) => mode === value);
}

/** 빈 문자열이면 속성을 부여하지 않는다 (계약: name · autoComplete · placeholder) */
function attr(value: string): string | undefined {
  return value === '' ? undefined : value;
}

/** 에러 메시지 요소의 id — aria-describedby 연결 기준 (계약 a11y) */
export function textFieldErrorId(id: string): string {
  return `${id}-error`;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps & TextFieldNativeProps>(
  function TextField(
    {
      id,
      label,
      value,
      type = 'text',
      error = '',
      disabled = false,
      required = false,
      placeholder = '',
      name = '',
      autoComplete = '',
      inputMode = '',
      trailing = null,
      onChange,
      onBlur,
      ...native
    },
    ref,
  ) {
    const invalid = error !== '';
    const errorId = textFieldErrorId(id);
    const hasTrailing = trailing !== null && trailing !== undefined && trailing !== false;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      // 계약 events.onBlur.blockedWhen — disabled 에서는 발화 금지
      if (disabled) return;
      onBlur?.(event);
    };

    const input = (
      <input
        ref={ref}
        id={id}
        className={`tds-textfield__input${hasTrailing ? ' tds-textfield__input--trailing' : ''}`}
        type={type}
        value={value}
        name={attr(name)}
        autoComplete={attr(autoComplete)}
        inputMode={nativeInputMode(inputMode)}
        placeholder={attr(placeholder)}
        required={required}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? errorId : undefined}
        onChange={handleChange}
        onBlur={handleBlur}
        {...native}
      />
    );

    return (
      <div className={`tds-textfield${invalid ? ' tds-textfield--error' : ''}`}>
        {/* 라벨 텍스트 = 접근 가능한 이름. 마커·배지·카운터를 넣지 않는다 (계약 a11y.accessible-name) */}
        <label htmlFor={id} className="tds-textfield__label">
          {label}
        </label>

        {hasTrailing ? (
          <span className="tds-textfield__wrap">
            {input}
            <span className="tds-textfield__trailing">{trailing}</span>
          </span>
        ) : (
          input
        )}

        {invalid ? (
          // role="alert" — 이미 포커스된 필드에 on-blur/변경으로 나타나는 에러도 announce 되게 한다
          // (FormField/ImageUploadField 와 일치, aria-describedby 연결에 더해서 — A11Y-10)
          <p id={errorId} className="tds-textfield__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
