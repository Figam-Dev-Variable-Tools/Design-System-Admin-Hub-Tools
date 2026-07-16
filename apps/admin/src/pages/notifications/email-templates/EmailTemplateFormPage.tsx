// EmailTemplateFormPage — 이메일 템플릿 등록/수정 (라우트: /notifications/email-templates/new · /:id/edit)
//
// [IA-05] 등록·수정이 한 컴포넌트다 — useCrudForm 이 :id 유무로 갈린다. 레이아웃은 같고 제목·프리필만 다르다.
//
// [TODO(lib): Tiptap + DOMPurify] 본문은 지금 평문 textarea 다. 리치 HTML 편집(굵게/링크/이미지)과
//   저장 전 새니타이즈(XSS 차단)는 전용 단계에서 Tiptap + DOMPurify 로 올린다. 그때 이 TextareaField 를
//   에디터로 갈아끼우고, 서버 전송 직전 DOMPurify.sanitize(html) 를 toInput 에 물린다. 지금은 라이브러리를
//   새로 들이지 않는 것이 규칙이라(작업 지침) 평문으로 두고, 치환변수·미리보기만 먼저 완성해 둔다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

import { Alert, controlStyle, errorIdOf, FormField, TextareaField } from '../../../shared/ui';
import { useCrudForm, FormPageShell } from '../../../shared/crud';
import { emailTemplateAdapter, EMAIL_TEMPLATE_RESOURCE } from './data-source';
import { emailTemplateSchema } from './validation';
import type { EmailTemplateFormValues } from './validation';
import { VariableInsertBar } from '../_shared/VariableInsertBar';
import { TemplateIdentityFields } from '../_shared/TemplateIdentityFields';
import { useInitialFocus } from '../_shared/useInitialFocus';
import {
  applyVariableSamples,
  detectAdWords,
  EMAIL_BODY_MAX,
  EMAIL_SUBJECT_MAX,
} from '../_shared/notification';
import type { EmailTemplate, EmailTemplateInput } from '../_shared/notification';

const ENTITY_LABEL = '이메일 템플릿';
const LIST_PATH = '/notifications/email-templates';
const UNSAVED_MESSAGE =
  '이메일 템플릿에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const EMPTY: EmailTemplateFormValues = {
  name: '',
  trigger: 'order.placed',
  subject: '',
  body: '',
};

const previewSubjectStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 'var(--tds-space-2)',
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-title-sm-font-family)',
  fontSize: 'var(--tds-typography-title-sm-font-size)',
  fontWeight: 'var(--tds-typography-title-sm-font-weight)',
  lineHeight: 'var(--tds-typography-title-sm-line-height)',
};

const previewBodyStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const previewWrapStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-4)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

function toInput(values: EmailTemplateFormValues): EmailTemplateInput {
  // TODO(lib): Tiptap 도입 시 body 는 HTML 이 된다 — 여기서 DOMPurify.sanitize(values.body) 를 거쳐 보낸다.
  return {
    name: values.name.trim(),
    trigger: values.trigger,
    subject: values.subject.trim(),
    body: values.body.trim(),
  };
}

function toValues(template: EmailTemplate): EmailTemplateFormValues {
  return {
    name: template.name,
    trigger: template.trigger,
    subject: template.subject,
    body: template.body,
  };
}

export default function EmailTemplateFormPage() {
  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
  } = useCrudForm<EmailTemplate, EmailTemplateInput, EmailTemplateFormValues>({
    resource: EMAIL_TEMPLATE_RESOURCE,
    adapter: emailTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: emailTemplateSchema,
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
  const subject = watch('subject');
  const body = watch('body');

  const adWords = useMemo(() => detectAdWords(`${subject}\n${body}`), [subject, body]);

  const insertVariable = (token: string) =>
    setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true });

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="템플릿 내용"
      description="이벤트가 발생하면 시스템이 이 문구로 이메일을 자동 발송합니다. 이 화면에서 발송하지는 않습니다."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailure={loadFailure}
      onRetryLoad={retryLoad}
      errorReference={errorReference}
      conflict={conflict}
      serverError={serverError}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      {/* A11Y-13 — 폼 진입 시 첫 편집 필드 포커스. 검증 실패 시 첫 오류 필드 포커스는 react-hook-form 의
          shouldFocusError(기본 true)가 register 된 필드에 대해 처리한다. */}
      <TemplateIdentityFields
        idPrefix="email-template"
        nameField={nameField}
        nameError={errors.name?.message}
        nameRef={(element) => {
          nameRegisterRef(element);
          nameFocusRef.current = element;
        }}
        triggerField={register('trigger')}
        trigger={trigger}
        namePlaceholder="예: 주문 접수 안내"
        disabled={disabled}
      />

      {/* COMP-12 — 제목은 수신함에서 잘리는 자리라 실시간 글자수 카운터가 필수다.
          FormField 의 counter 슬롯이 'N/max' 를 그린다. */}
      <FormField
        htmlFor="email-template-subject"
        label="제목"
        required
        error={errors.subject?.message}
        counter={`${String(subject.length)}/${String(EMAIL_SUBJECT_MAX)}`}
      >
        <input
          id="email-template-subject"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.subject !== undefined)}
          maxLength={EMAIL_SUBJECT_MAX}
          placeholder="예: [스페이스플래닝] 주문이 접수되었습니다 (#{주문번호})"
          disabled={disabled}
          required
          aria-invalid={errors.subject !== undefined}
          aria-describedby={
            errors.subject !== undefined ? errorIdOf('email-template-subject') : undefined
          }
          {...register('subject')}
        />
      </FormField>

      <TextareaField
        label="본문"
        required
        value={body}
        onChange={(value) => setValue('body', value, { shouldDirty: true, shouldValidate: true })}
        maxLength={EMAIL_BODY_MAX}
        disabled={disabled}
        error={errors.body?.message}
        hint="지금은 평문입니다. 리치 편집(굵게·링크)은 이후 단계에서 열립니다."
        placeholder="예: #{이름}님, 주문이 정상 접수되었습니다."
        rows={10}
      />

      <VariableInsertBar trigger={trigger} onInsert={insertVariable} disabled={disabled} />

      {/* 정보성 vs 광고성 경계를 입력 중에 드러낸다 — 저장은 스키마가 막고, 이유는 여기서 말한다. */}
      {adWords.length > 0 && (
        <Alert tone="warning">
          {`광고성 문구(${adWords.join(', ')})가 있습니다. 정보성 알림에 광고를 섞으면 메시지 전체가 광고성 정보가 되어 (광고) 표기·야간 발송 제한·무료수신거부 안내 의무가 생깁니다. 광고성 발송은 마케팅 관리에서 해 주세요.`}
        </Alert>
      )}

      {(subject.trim() !== '' || body.trim() !== '') && (
        <FormField htmlFor="email-template-preview" label="미리보기(표본값 치환)">
          <div id="email-template-preview" style={previewWrapStyle}>
            <p style={previewSubjectStyle}>{applyVariableSamples(subject)}</p>
            <p style={previewBodyStyle}>{applyVariableSamples(body)}</p>
          </div>
        </FormField>
      )}
    </FormPageShell>
  );
}
