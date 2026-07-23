// ReplyFormPage — 답변 템플릿 등록/수정 (라우트: /support/replies/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm + FormPageShell)를 재사용한다. 필드만 주입한다:
// 제목·유형 태그·본문. 본문은 치환 변수({{고객명}}·{{문의번호}}·{{담당자}})를 지원한다 — 티켓 상세가
// 삽입 시 실제 값으로 채운다(조사: 변수 치환으로 로봇 같은 상용구를 피한다).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

import {
  controlStyle,
  errorIdOf,
  FormField,
  hintStyle,
  SelectField,
  TextareaField,
} from '../../../shared/ui';
import { useCrudForm, FormPageShell } from '../../../shared/crud';
import { replyTemplateAdapter, TEMPLATE_RESOURCE } from './data-source';
import { replyTemplateSchema } from './validation';
import type { ReplyTemplateFormValues } from './validation';
import { listCategoryUsage } from '../_shared/store';
import { TEMPLATE_ALL_LABEL, TEMPLATE_BODY_MAX, TEMPLATE_TITLE_MAX } from '../_shared/domain';
import type { ReplyTemplate, ReplyTemplateInput } from '../_shared/domain';

const RESOURCE = TEMPLATE_RESOURCE;
const ENTITY_LABEL = '답변 템플릿';
const LIST_PATH = '/support/replies';
const ALL_TAG = '';
const UNSAVED_MESSAGE =
  '답변 템플릿에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const EMPTY: ReplyTemplateFormValues = { title: '', categoryId: ALL_TAG, body: '' };

const varHintStyle: CSSProperties = { ...hintStyle };

function toInput(values: ReplyTemplateFormValues): ReplyTemplateInput {
  return { title: values.title.trim(), categoryId: values.categoryId, body: values.body.trim() };
}

function toValues(template: ReplyTemplate): ReplyTemplateFormValues {
  return { title: template.title, categoryId: template.categoryId, body: template.body };
}

export default function ReplyFormPage() {
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
  } = useCrudForm<ReplyTemplate, ReplyTemplateInput, ReplyTemplateFormValues>({
    resource: RESOURCE,
    adapter: replyTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: replyTemplateSchema,
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

  // 유형 태그 드롭다운 — 전체 유형(비활성 포함)을 담아 편집 중 값이 유실되지 않게 한다
  const categories = useMemo(() => listCategoryUsage(), []);

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="템플릿 내용"
      description="자주 쓰는 답변을 템플릿으로 저장해 두면 티켓 답변 작성 시 골라 삽입할 수 있어요."
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
      <FormField htmlFor="template-title" label="제목" required error={errors.title?.message}>
        <input
          id="template-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={TEMPLATE_TITLE_MAX}
          placeholder="예: 배송 지연 사과 안내"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('template-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <FormField
        htmlFor="template-category"
        label="유형 태그"
        hint="특정 유형 티켓에만 노출돼요. '전체'는 모든 유형에 노출돼요."
      >
        <SelectField id="template-category" disabled={disabled} {...register('categoryId')}>
          <option value={ALL_TAG}>{TEMPLATE_ALL_LABEL}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.active ? category.label : `${category.label} (미사용)`}
            </option>
          ))}
        </SelectField>
      </FormField>

      <TextareaField
        label="본문"
        value={watch('body')}
        onChange={(value) => setValue('body', value, { shouldDirty: true })}
        maxLength={TEMPLATE_BODY_MAX}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="고객에게 보낼 답변 문구를 입력하세요."
        rows={6}
      />
      <p style={varHintStyle}>
        치환 변수: <code>{'{{고객명}}'}</code> · <code>{'{{문의번호}}'}</code> ·{' '}
        <code>{'{{담당자}}'}</code> — 티켓에 삽입할 때 실제 값으로 바뀌어요.
      </p>
    </FormPageShell>
  );
}
