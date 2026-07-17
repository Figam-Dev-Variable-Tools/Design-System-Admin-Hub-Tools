// 템플릿 공통 머리 필드 — 템플릿명 + 이벤트 (apps/admin/src/pages/notifications/**)
//
// 이메일·SMS 템플릿 폼의 첫 두 필드는 완전히 같다(이름은 운영자용, 이벤트는 이 섹션의 정체성).
// 두 폼이 복사하면 힌트·조사·a11y 배선이 갈라진다(클린코드 점검 축3 중복) — 한 벌만 둔다. 아래 본문 필드만
// 폼마다 다르다(이메일=제목+본문, SMS=본문+바이트 카운터).
//
// [제네릭을 피한 이유] 두 폼의 Values 타입이 달라 UseFormRegister<T> 로 받으면 Path<T> 제약이 번진다.
// register() 의 **결과**(UseFormRegisterReturn)만 받으면 타입 파라미터 없이 같은 UI 를 공유할 수 있다.
import type { UseFormRegisterReturn } from 'react-hook-form';

import { controlStyle, errorIdOf, FormField, hintIdOf, SelectField } from '../../../shared/ui';
import {
  findTrigger,
  NOTIFICATION_TRIGGERS,
  TEMPLATE_NAME_MAX,
  triggerCategoryLabel,
} from './notification';
import type { TriggerId } from './notification';

interface TemplateIdentityFieldsProps {
  /** 필드 id 접두사 — 'email-template' / 'sms-template'. 한 화면에 두 폼이 없어도 id 는 고유해야 한다 */
  readonly idPrefix: string;
  /** register('name') 에서 ref 를 뺀 나머지 — ref 는 포커스 ref 와 합쳐 nameRef 로 따로 받는다 */
  readonly nameField: Omit<UseFormRegisterReturn, 'ref'>;
  readonly nameError: string | undefined;
  /** register 의 ref 와 진입 포커스 ref 를 함께 물린 콜백 (A11Y-13) */
  readonly nameRef: (element: HTMLInputElement | null) => void;
  readonly triggerField: UseFormRegisterReturn;
  /** 지금 고른 이벤트 — 힌트로 '언제 발생하는가'를 그린다 */
  readonly trigger: TriggerId;
  readonly namePlaceholder: string;
  readonly disabled: boolean;
}

export function TemplateIdentityFields({
  idPrefix,
  nameField,
  nameError,
  nameRef,
  triggerField,
  trigger,
  namePlaceholder,
  disabled,
}: TemplateIdentityFieldsProps) {
  const nameId = `${idPrefix}-name`;
  const triggerId = `${idPrefix}-trigger`;
  const triggerInfo = findTrigger(trigger);

  return (
    <>
      {/* A11Y-11 — aria-invalid 를 켤 때는 반드시 그 오류 <p> 의 id 를 describedby 로 잇고,
          유효할 때만 힌트를 잇는다(FormField 가 오류/힌트를 배타로 그린다). */}
      <FormField
        htmlFor={nameId}
        label="템플릿명"
        required
        error={nameError}
        hint="운영자만 보는 이름입니다. 수신자에게는 보이지 않습니다."
      >
        <input
          id={nameId}
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(nameError !== undefined)}
          maxLength={TEMPLATE_NAME_MAX}
          placeholder={namePlaceholder}
          disabled={disabled}
          required
          aria-invalid={nameError !== undefined}
          aria-describedby={nameError !== undefined ? errorIdOf(nameId) : hintIdOf(nameId)}
          {...nameField}
          ref={nameRef}
        />
      </FormField>

      <FormField
        htmlFor={triggerId}
        label="이벤트"
        required
        hint={
          triggerInfo === undefined
            ? '이 문구를 발송할 이벤트를 고릅니다.'
            : `${triggerCategoryLabel(triggerInfo.category)} · ${triggerInfo.description}`
        }
      >
        <SelectField
          id={triggerId}
          disabled={disabled}
          aria-describedby={hintIdOf(triggerId)}
          {...triggerField}
        >
          {NOTIFICATION_TRIGGERS.map((option) => (
            <option key={option.id} value={option.id}>
              {`${triggerCategoryLabel(option.category)} · ${option.label}`}
            </option>
          ))}
        </SelectField>
      </FormField>
    </>
  );
}
