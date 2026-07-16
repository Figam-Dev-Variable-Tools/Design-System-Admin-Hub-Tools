// TemplateFormPage — 발송 템플릿 등록/수정 (라우트: /marketing/templates/new · /:id/edit) · A41 소유
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 채널(SMS/이메일/알림톡)에
// 따라 필드가 갈린다: 이메일/알림톡은 제목, 알림톡은 승인상태·반려사유. 본문은 치환변수(#{...})를 지원한다.
import type { CSSProperties } from 'react';

import {
  controlStyle,
  errorIdOf,
  FormField,
  hintStyle,
  SelectField,
  StatusBadge,
  TextareaField,
} from '../../../shared/ui';
import { useCrudForm, FormPageShell } from '../../../shared/crud';
import { templateAdapter, TEMPLATE_RESOURCE } from './data-source';
import { templateSchema } from './validation';
import type { TemplateFormValues } from './validation';
import { VariableInsertBar } from '../_shared/VariableInsertBar';
import {
  APPROVAL_STATUS_OPTIONS,
  byteLengthOf,
  classifySms,
  MESSAGE_CHANNEL_OPTIONS,
  requiresApproval,
  smsByteLimit,
  smsKindLabel,
  TEMPLATE_BODY_MAX,
  TEMPLATE_NAME_MAX,
  TEMPLATE_TITLE_MAX,
  usesTitle,
} from '../_shared/messaging';
import type { MessageTemplate, MessageTemplateInput } from '../_shared/messaging';

const ENTITY_LABEL = '발송 템플릿';
const LIST_PATH = '/marketing/templates';
const UNSAVED_MESSAGE =
  '발송 템플릿에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const EMPTY: TemplateFormValues = {
  name: '',
  channel: 'sms',
  title: '',
  body: '',
  approvalStatus: 'draft',
  rejectReason: '',
};

const byteHintStyle: CSSProperties = { ...hintStyle };

function toInput(values: TemplateFormValues): MessageTemplateInput {
  return {
    name: values.name.trim(),
    channel: values.channel,
    title: usesTitle(values.channel) ? values.title.trim() : '',
    body: values.body.trim(),
    approvalStatus: values.approvalStatus,
    rejectReason: values.approvalStatus === 'rejected' ? values.rejectReason.trim() : '',
  };
}

function toValues(template: MessageTemplate): TemplateFormValues {
  return {
    name: template.name,
    channel: template.channel,
    title: template.title,
    body: template.body,
    approvalStatus: template.approvalStatus,
    rejectReason: template.rejectReason,
  };
}

export default function TemplateFormPage() {
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
  } = useCrudForm<MessageTemplate, MessageTemplateInput, TemplateFormValues>({
    resource: TEMPLATE_RESOURCE,
    adapter: templateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: templateSchema,
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

  const channel = watch('channel');
  const body = watch('body');
  const approvalStatus = watch('approvalStatus');

  const bytes = byteLengthOf(body);
  const smsKind = classifySms(bytes, false);
  const insertVariable = (token: string) =>
    setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true });

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="템플릿 내용"
      description="채널을 고르면 필요한 항목이 달라집니다. 알림톡은 승인된 템플릿만 발송에 쓸 수 있습니다."
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
      <FormField htmlFor="template-name" label="템플릿명" required error={errors.name?.message}>
        <input
          id="template-name"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.name !== undefined)}
          maxLength={TEMPLATE_NAME_MAX}
          placeholder="예: 주문 완료 안내(SMS)"
          disabled={disabled}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name !== undefined ? errorIdOf('template-name') : undefined}
          {...register('name')}
        />
      </FormField>

      <FormField htmlFor="template-channel" label="채널" required>
        <SelectField id="template-channel" disabled={disabled} {...register('channel')}>
          {MESSAGE_CHANNEL_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </FormField>

      {usesTitle(channel) && (
        <FormField
          htmlFor="template-title"
          label={channel === 'email' ? '이메일 제목' : '강조표기(제목)'}
          required
          error={errors.title?.message}
        >
          <input
            id="template-title"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.title !== undefined)}
            maxLength={TEMPLATE_TITLE_MAX}
            placeholder={
              channel === 'email' ? '예: [스페이스플래닝] 이달의 소식' : '예: 배송 출발 안내'
            }
            disabled={disabled}
            aria-invalid={errors.title !== undefined}
            aria-describedby={errors.title !== undefined ? errorIdOf('template-title') : undefined}
            {...register('title')}
          />
        </FormField>
      )}

      <TextareaField
        label="본문"
        required
        value={body}
        onChange={(value) => setValue('body', value, { shouldDirty: true, shouldValidate: true })}
        maxLength={TEMPLATE_BODY_MAX}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="발송할 문구를 입력하세요. #{이름} 등 치환변수를 넣을 수 있습니다."
        rows={6}
      />
      {channel === 'sms' && (
        <p style={byteHintStyle}>
          {`${String(bytes)} byte · ${smsKindLabel(smsKind)} (한도 ${String(smsByteLimit(smsKind))} byte)`}
          {smsKind === 'lms' && ' — 90 byte 초과로 LMS 로 발송됩니다.'}
        </p>
      )}

      <VariableInsertBar onInsert={insertVariable} disabled={disabled} />

      {requiresApproval(channel) && (
        <FormField
          htmlFor="template-approval"
          label="승인상태"
          hint="알림톡은 카카오 사전 심사(검수중→승인/반려)를 거칩니다. 승인된 템플릿만 발송에 쓸 수 있습니다."
        >
          <SelectField id="template-approval" disabled={disabled} {...register('approvalStatus')}>
            {APPROVAL_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
      )}

      {requiresApproval(channel) && approvalStatus === 'rejected' && (
        <>
          <StatusBadge tone="danger" label="반려됨 — 사유를 확인하고 재편집 후 다시 제출하세요." />
          <TextareaField
            label="반려 사유"
            value={watch('rejectReason')}
            onChange={(value) => setValue('rejectReason', value, { shouldDirty: true })}
            maxLength={200}
            disabled={disabled}
            placeholder="카카오 심사 반려 사유"
            rows={2}
          />
        </>
      )}
    </FormPageShell>
  );
}
