// FormField — 라벨 붙은 폼 필드 껍데기 (molecule · contracts/FormField.contract.json@1.1.0)
//
// Props 타입은 계약에서 생성된 generated/types/FormField.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 계약 dependencies: HelpTip · SelectField (atom). 라벨 옆 ⓘ 도움말은 HelpTip 을 조립해 그리고,
// SelectField 는 aria-required 주입 대상 판별에만 쓴다(렌더하지 않는다 — withAriaRequired 참조).
//
// [도메인을 모른다] 무슨 필드인지 알지 못한다 — 라벨/오류/힌트 문자열과 자식 컨트롤(children)만 받는다.
//   컨트롤 자체(input/select/textarea)는 호출부가 넣고, 이 껍데기는 label 의 htmlFor 로만 잇는다.
//
// [오류·힌트 id 파생 — 헬퍼] 오류/힌트 <p> 의 id 를 htmlFor 에서 파생해 노출한다(errorIdOf·hintIdOf).
//   호출부가 이 id 를 자식 컨트롤의 aria-describedby 에 물린다 (TextField 의 textFieldErrorId 선례).
//
// [exactOptionalPropertyTypes] 호출부는 error={errors.x?.message}(string|undefined)를 그대로 넘긴다.
//   계약 타입(error?: string)을 그 경계에서 undefined 허용으로 넓혀 받고, 빈 문자열/undefined 를
//   '오류 없음' 으로 정규화한다 (TriStateCheckbox.describedBy 의 '' 정규화 선례 — 호출부 45곳 무변경).
//
// [required 를 AT 에 잇는다 — A11Y-11]
//   마커(*)는 aria-hidden 장식이라 스크린리더에 필수 여부가 닿지 않는다. 호출부가 이미 넘기고 있는
//   required 를 **자식 컨트롤의 aria-required 로 주입**해 그 경로를 만든다 (withAriaRequired).
//   주입 대상은 '단일 폼 컨트롤 자식' 뿐이다 — 래퍼 <div>/표시 전용 <p> 에 aria-required 를 얹으면
//   거짓 시맨틱이 된다. 호출부가 aria-required 를 직접 주면 그 값이 우선한다(네이티브 override 선례).
//   마커의 시각 표현은 그대로 둔다 — AT 경로만 더한다.
import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { SelectField } from '../../atoms/SelectField';
import { HelpTip } from '../../atoms/HelpTip';
import type { FormFieldProps } from '../../../generated/types/FormField.types';
import './FormField.css';

/**
 * aria-required 를 주입해도 참인 시맨틱이 되는 자식 — 네이티브 폼 컨트롤과, 그것을 그대로 렌더하는
 * DS 컨트롤(SelectField 는 native 속성을 <select> 로 패스스루한다) 뿐이다.
 * 래퍼 <div>·표시 전용 <p>·비-컨트롤 컴포넌트는 대상이 아니다 (거짓 시맨틱 방지).
 */
const REQUIRABLE_TAGS = ['input', 'select', 'textarea'] as const;

function isRequirableChild(type: ReactElement['type']): boolean {
  if (typeof type === 'string') return REQUIRABLE_TAGS.some((tag) => tag === type);
  return type === SelectField;
}

/** 자식 element 의 props 를 읽기 위한 좁힘 — ReactNode 는 any 를 거치지 않고 여기서만 넓힌다 */
function propsOf(element: ReactElement): Record<string, unknown> {
  const { props } = element;
  return typeof props === 'object' && props !== null ? (props as Record<string, unknown>) : {};
}

/** required=true 를 단일 컨트롤 자식의 aria-required 로 잇는다 (A11Y-11) */
function withAriaRequired(children: ReactNode, required: boolean): ReactNode {
  if (!required || !isValidElement(children)) return children;
  if (!isRequirableChild(children.type)) return children;
  // 호출부가 aria-required 를 명시했으면 그 값을 존중한다 (override)
  if ('aria-required' in propsOf(children)) return children;
  return cloneElement(children, { 'aria-required': true } as Record<string, unknown>);
}

/** 힌트 <p> 의 id — 호출부가 자식 컨트롤의 aria-describedby 에 물린다 (계약 a11y) */
export function hintIdOf(htmlFor: string): string {
  return `${htmlFor}-hint`;
}

/** 오류 <p> 의 id — 호출부가 자식 컨트롤의 aria-describedby 에 물린다 (계약 a11y) */
export function errorIdOf(htmlFor: string): string {
  return `${htmlFor}-error`;
}

/**
 * 계약의 옵셔널 문자열 prop 을 경계에서 undefined 허용으로 넓힌 컴포넌트 props.
 * (exactOptionalPropertyTypes 하에서 호출부의 string|undefined 를 그대로 받기 위함 — 값은 '' 로 정규화)
 */
type FormFieldComponentProps = Omit<FormFieldProps, 'error' | 'hint' | 'counter'> & {
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly counter?: string | undefined;
};

export function FormField({
  htmlFor,
  label,
  required = false,
  error,
  hint,
  counter,
  help,
  children,
}: FormFieldComponentProps) {
  const invalid = error !== undefined && error !== '';

  return (
    <div className="tds-formfield">
      <div className="tds-formfield__row">
        <span className="tds-formfield__labelgroup">
          <label htmlFor={htmlFor} className="tds-formfield__label">
            {label}
            {required && (
              <span className="tds-formfield__required" aria-hidden="true">
                {' *'}
              </span>
            )}
          </label>
          {help !== undefined && <HelpTip label={`${label} 설명`}>{help}</HelpTip>}
        </span>
        {counter !== undefined && <span className="tds-formfield__counter">{counter}</span>}
      </div>

      {withAriaRequired(children, required)}

      {invalid ? (
        <p id={errorIdOf(htmlFor)} role="alert" className="tds-formfield__error">
          {error}
        </p>
      ) : (
        hint !== undefined && (
          <p id={hintIdOf(htmlFor)} className="tds-formfield__hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
