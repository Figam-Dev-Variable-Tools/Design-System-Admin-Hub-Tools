// 설정 폼 입력 조각 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [왜 있는가] 이 앱의 텍스트 입력 관례는 `FormField` + 맨 `<input className="tds-ui-input …">` 다
// (PointsPolicyPage·AccountFormPage 선례 — @tds/ui TextField 는 자체 라벨을 그려 이 골격과 맞지 않아
// 앱 배럴이 내보내지 않는다). 그 10줄 블록을 설정 화면 4개 × 필드 20여 개에 복사하는 대신 한 벌만 둔다.
//
// [A11Y-11 배선을 여기서 못 박는다] aria-invalid 를 켤 때는 **반드시** 오류 <p> 의 id 를
// aria-describedby 로 잇고(errorIdOf), 오류가 없고 힌트가 있을 때만 힌트 id 를 잇는다(hintIdOf).
// 호출부가 이 배선을 잊을 수 있는 자리를 없앤다 — 필드를 쓰면 계약이 따라온다.
import type { ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { controlStyle, errorIdOf, FormField, hintIdOf } from '../../../shared/ui';

/** aria-describedby 한 줄 — 오류가 이기고, 없으면 힌트, 둘 다 없으면 붙이지 않는다 (A11Y-11) */
function describedBy(
  id: string,
  error: string | undefined,
  hint: string | undefined,
): string | undefined {
  if (error !== undefined && error !== '') return errorIdOf(id);
  if (hint !== undefined && hint !== '') return hintIdOf(id);
  return undefined;
}

interface TextInputFieldProps {
  readonly id: string;
  readonly label: string;
  readonly registration: UseFormRegisterReturn;
  readonly disabled: boolean;
  readonly required?: boolean;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  /** '12/60' — 길이 제한이 있는 필드는 반드시 준다 (COMP-12) */
  readonly counter?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly type?: 'text' | 'email' | 'url' | 'password';
  readonly inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric';
  readonly help?: ReactNode;
  readonly maxLength?: number | undefined;
}

/** 한 줄 텍스트 입력 — 라벨·필수 표식·오류/힌트·카운터는 FormField 가 그린다 */
export function TextInputField({
  id,
  label,
  registration,
  disabled,
  required = false,
  error,
  hint,
  counter,
  placeholder,
  type = 'text',
  inputMode,
  help,
  maxLength,
}: TextInputFieldProps) {
  const invalid = error !== undefined && error !== '';

  return (
    <FormField
      htmlFor={id}
      label={label}
      required={required}
      error={error ?? ''}
      hint={hint ?? ''}
      counter={counter ?? ''}
      help={help ?? null}
    >
      <input
        id={id}
        type={type}
        className="tds-ui-input tds-ui-focusable"
        style={controlStyle(invalid)}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy(id, error, hint)}
        {...(placeholder === undefined ? {} : { placeholder })}
        {...(inputMode === undefined ? {} : { inputMode })}
        {...(maxLength === undefined ? {} : { maxLength })}
        {...registration}
      />
    </FormField>
  );
}
