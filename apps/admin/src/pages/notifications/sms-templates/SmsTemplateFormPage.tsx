// SmsTemplateFormPage — SMS 템플릿 등록/수정 (라우트: /notifications/sms-templates/new · /:id/edit)
//
// [IA-05] 등록·수정이 한 컴포넌트다 — useCrudForm 이 :id 유무로 갈린다. 레이아웃은 같고 제목·프리필만 다르다.
// 데이터·저장·미저장 이탈 가드는 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 그대로 쓴다.
//
// [마케팅 SMS 폼과 다른 점] 저기엔 발신번호·세그먼트·예약시각·(광고) 표기 검사가 있다. 여긴 없다 —
// 수신자도 시점도 이벤트가 정한다. 대신 **이벤트 선택**과 그 이벤트가 주는 변수만 쓰게 하는 장치가 있다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

import { Alert, FormField, hintStyle, StatusBadge, TextareaField } from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { useCrudForm, FormPageShell } from '../../../shared/crud';
import { smsTemplateAdapter, SMS_TEMPLATE_RESOURCE } from './data-source';
import { smsTemplateSchema } from './validation';
import type { SmsTemplateFormValues } from './validation';
import { VariableInsertBar } from '../_shared/VariableInsertBar';
import { TemplateIdentityFields } from '../_shared/TemplateIdentityFields';
import { useInitialFocus } from '../_shared/useInitialFocus';
import {
  applyVariableSamples,
  byteLengthOf,
  classifySms,
  detectAdWords,
  SMS_BODY_MAX,
  SMS_MAX_BYTES,
  smsByteLimit,
  smsKindLabel,
} from '../_shared/notification';
import type { SmsTemplate, SmsTemplateInput } from '../_shared/notification';

const ENTITY_LABEL = 'SMS 템플릿';
const LIST_PATH = '/notifications/sms-templates';
const UNSAVED_MESSAGE =
  'SMS 템플릿에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const EMPTY: SmsTemplateFormValues = {
  name: '',
  trigger: 'order.placed',
  body: '',
};

const counterRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const previewStyle: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

function toInput(values: SmsTemplateFormValues): SmsTemplateInput {
  return {
    name: values.name.trim(),
    trigger: values.trigger,
    body: values.body.trim(),
  };
}

function toValues(template: SmsTemplate): SmsTemplateFormValues {
  return {
    name: template.name,
    trigger: template.trigger,
    body: template.body,
  };
}

export default function SmsTemplateFormPage() {
  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<SmsTemplate, SmsTemplateInput, SmsTemplateFormValues>({
      resource: SMS_TEMPLATE_RESOURCE,
      adapter: smsTemplateAdapter,
      entityLabel: ENTITY_LABEL,
      listPath: LIST_PATH,
      schema: smsTemplateSchema,
      empty: EMPTY,
      toInput,
      toValues,
    });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;

  // A11Y-13 — 상세 로딩이 끝나 필드가 실제로 그려진 뒤 첫 필드에 포커스한다.
  const nameFocusRef = useInitialFocus<HTMLInputElement>(!loadingDetail);
  const { ref: nameRegisterRef, ...nameField } = register('name');

  const trigger = watch('trigger');
  const body = watch('body');

  // COMP-12 — 글자수(TextareaField 의 N/max 카운터)와 **바이트**는 다른 축이다. 한글 1자 = 2byte 라
  // 45자에서 이미 SMS 한도(90byte)를 넘는다. 두 카운터를 모두 보여준다.
  const bytes = byteLengthOf(body);
  const kind = classifySms(bytes);
  const limit = smsByteLimit(kind);
  const overLimit = bytes > limit;

  const adWords = useMemo(() => detectAdWords(body), [body]);

  const insertVariable = (token: string) =>
    setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true });

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="템플릿 내용"
      description="이벤트가 발생하면 시스템이 이 문구로 SMS 를 자동 발송합니다. 이 화면에서 발송하지는 않습니다."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailed={loadFailed}
      serverError={serverError}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      {/* A11Y-13 — 폼에 들어오면 첫 편집 필드에 포커스한다. 검증 실패 시 첫 오류 필드로의 포커스 이동은
          react-hook-form 의 shouldFocusError(기본 true)가 register 된 필드에 대해 처리한다. */}
      <TemplateIdentityFields
        idPrefix="sms-template"
        nameField={nameField}
        nameError={errors.name?.message}
        nameRef={(element) => {
          nameRegisterRef(element);
          nameFocusRef.current = element;
        }}
        triggerField={register('trigger')}
        trigger={trigger}
        namePlaceholder="예: 주문 접수 안내(SMS)"
        disabled={disabled}
      />

      <TextareaField
        label="본문"
        required
        value={body}
        onChange={(value) => setValue('body', value, { shouldDirty: true, shouldValidate: true })}
        maxLength={SMS_BODY_MAX}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="예: [스페이스플래닝] #{이름}님, 주문(#{주문번호})이 접수되었습니다."
        rows={5}
      />

      {/* COMP-12 — 실시간 바이트 카운터 + 상한 근접/초과 경고. 90byte 를 넘는 순간 LMS 로 승격되어
          건당 단가가 오르므로 유형 배지를 함께 낸다. */}
      <div style={counterRowStyle}>
        <StatusBadge
          tone={overLimit ? 'danger' : kind === 'lms' ? 'warning' : 'neutral'}
          label={smsKindLabel(kind)}
        />
        <span style={hintStyle}>
          {`${formatNumber(bytes)} / ${formatNumber(limit)} byte`}
          {kind === 'lms' && !overLimit
            ? ` — ${formatNumber(SMS_MAX_BYTES)} byte 를 넘어 LMS 로 발송됩니다(건당 단가가 오릅니다).`
            : ''}
          {overLimit ? ' — 한도를 넘었습니다. 저장하려면 문구를 줄여 주세요.' : ''}
        </span>
      </div>

      <VariableInsertBar trigger={trigger} onInsert={insertVariable} disabled={disabled} />

      {/* 정보성 vs 광고성 경계를 입력 중에 드러낸다 — 저장은 스키마가 막고, 이유는 여기서 말한다. */}
      {adWords.length > 0 && (
        <Alert tone="warning">
          {`광고성 문구(${adWords.join(', ')})가 있습니다. 정보성 알림에 광고를 섞으면 메시지 전체가 광고성 정보가 되어 (광고) 표기·야간 발송 제한·무료수신거부 안내 의무가 생깁니다. 광고성 발송은 마케팅 관리에서 해 주세요.`}
        </Alert>
      )}

      {body.trim() !== '' && (
        <FormField htmlFor="sms-template-preview" label="미리보기(표본값 치환)">
          <p id="sms-template-preview" style={previewStyle}>
            {applyVariableSamples(body)}
          </p>
        </FormField>
      )}
    </FormPageShell>
  );
}
