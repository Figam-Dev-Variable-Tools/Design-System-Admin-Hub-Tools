// ContentFormEditPage — 폼 등록/수정 (라우트: /content/forms/new · /content/forms/:id/edit)
//
// 공용 폼 키트(useCrudForm + FormPageShell)를 쓴다. 이 화면이 더 갖는 것은 **항목 편집기**다 —
// 항목 배열도 RHF 가 들고 있으므로 '저장하지 않고 나가기' 가드가 항목 편집까지 함께 지킨다.
//
// [발행은 문이다] 항목이 없거나, 수신 담당자가 없거나, 개인정보 동의 항목이 없으면 발행되지
// 않는다. 그 판정은 types.formPublishBlock 한 곳에 있고 스키마와 저장소가 함께 읽는다 —
// 저장 버튼이 통과시킨 것을 저장소가 거절하는 일이 생기지 않는다.
import type { CSSProperties } from 'react';

import { cssVar, SelectField } from '@tds/ui';

import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { controlStyle, errorIdOf, FormField, hintStyle, TextareaField } from '../../../shared/ui';
import { FormFieldEditor } from './components/FormFieldEditor';
import { contentFormAdapter, FORM_RESOURCE, stampNow } from './data-source';
import {
  FORM_DESCRIPTION_MAX,
  FORM_LIST_PATH,
  FORM_NAME_MAX,
  FORM_STATUS_LABEL,
  formatRecipients,
  parseRecipients,
} from './types';
import type { ContentForm, ContentFormInput, FormFieldDef } from './types';
import { contentFormSchema } from './validation';
import type { ContentFormValues } from './validation';

const ENTITY_LABEL = '폼';
const UNSAVED_MESSAGE =
  '폼에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용과 항목 구성이 사라집니다.';

const STATUS_OPTIONS = ['draft', 'published'] as const;

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 7), 1fr))`,
  gap: cssVar('space.4'),
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.title.md.font-size'),
  lineHeight: cssVar('typography.title.md.line-height'),
};

const errorTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.feedback.danger.text'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

const EMPTY: ContentFormValues = {
  name: '',
  description: '',
  status: 'draft',
  recipients: '',
  fields: [],
};

export default function ContentFormEditPage() {
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
  } = useCrudForm<ContentForm, ContentFormInput, ContentFormValues>({
    resource: FORM_RESOURCE,
    adapter: contentFormAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: FORM_LIST_PATH,
    schema: contentFormSchema,
    empty: EMPTY,
    toInput: (values) => ({
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
      // 나누는 규칙의 정본은 types.parseRecipients — 스키마도 같은 함수로 검증했다
      recipients: parseRecipients(values.recipients),
      fields: values.fields.map((field) => ({
        ...field,
        label: field.label.trim(),
        options: field.options.map((option) => option.trim()).filter((option) => option !== ''),
      })),
      updatedAt: stampNow(),
    }),
    toValues: (item) => ({
      name: item.name,
      description: item.description,
      status: item.status,
      recipients: formatRecipients(item.recipients),
      fields: item.fields.map((field) => ({ ...field, options: [...field.options] })),
    }),
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const description = watch('description');
  const status = watch('status');
  const fields = watch('fields');

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="폼 정보"
      description="별표(*) 항목은 필수입니다. 항목 구성은 아래에서 추가·정렬합니다."
      listPath={FORM_LIST_PATH}
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
      <FormField htmlFor="content-form-name" label="폼 이름" required error={errors.name?.message}>
        <input
          id="content-form-name"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.name !== undefined)}
          maxLength={FORM_NAME_MAX}
          placeholder="예: 사업 문의"
          disabled={disabled}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name !== undefined ? errorIdOf('content-form-name') : undefined}
          {...register('name')}
        />
      </FormField>

      <TextareaField
        label="설명"
        value={description}
        onChange={(value) =>
          setValue('description', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={FORM_DESCRIPTION_MAX}
        disabled={disabled}
        error={errors.description?.message}
        placeholder="이 폼이 어떤 문의를 받는지 적어 두면 운영자가 헷갈리지 않습니다."
        rows={2}
      />

      <div style={rowStyle}>
        <FormField
          htmlFor="content-form-status"
          label="상태"
          required
          error={errors.status?.message}
          hint="발행하려면 항목·수신 담당자·개인정보 동의 항목이 모두 있어야 합니다."
        >
          <SelectField
            id="content-form-status"
            isInvalid={errors.status !== undefined}
            disabled={disabled}
            {...register('status')}
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {FORM_STATUS_LABEL[value]}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>

      <TextareaField
        label="수신 담당자"
        required
        value={watch('recipients')}
        onChange={(value) =>
          setValue('recipients', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={500}
        disabled={disabled}
        error={errors.recipients?.message}
        hint="한 줄에 하나씩 이메일을 적습니다. 접수된 문의가 이 주소로 알림됩니다."
        placeholder={'sales@example.com\ncs@example.com'}
        rows={3}
      />

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>항목 구성</h2>
        <FormFieldEditor
          fields={fields as readonly FormFieldDef[]}
          status={status}
          disabled={disabled}
          // 폼 값은 가변 배열이고 도메인 타입은 readonly 다 — 경계에서 한 번만 복사해 넘긴다
          onChange={(next) =>
            setValue(
              'fields',
              next.map((item) => ({ ...item, options: [...item.options] })),
              { shouldValidate: false, shouldDirty: true },
            )
          }
        />
        {/* 항목 배열 전체에 대한 오류 — 어느 항목인지까지 문장이 말한다 */}
        {errors.fields?.message !== undefined && (
          <p role="alert" style={errorTextStyle}>
            {errors.fields.message}
          </p>
        )}
        <p style={hintStyle}>
          파일 첨부는 도면·사양서를 받는 자리입니다. 실제 업로드 저장은 백엔드가 붙은 뒤 연결됩니다.
        </p>
      </section>
    </FormPageShell>
  );
}
