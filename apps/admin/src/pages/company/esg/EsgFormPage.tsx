// EsgFormPage — ESG 활동 등록/수정 (라우트: /company/esg/new · /company/esg/:id/edit) · A41 소유
import type { CSSProperties } from 'react';

import {
  controlStyle,
  errorIdOf,
  FormField,
  ImageGalleryField,
  SelectField,
  TextareaField,
} from '../../../shared/ui';
import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { esgAdapter } from './data-source';
import {
  ESG_CATEGORY_OPTIONS,
  MAX_ESG_IMAGES,
  SUMMARY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from './types';
import type { EsgCategory, EsgInput, EsgItem } from './types';
import { esgSchema } from './validation';
import type { EsgFormValues } from './validation';

const ENTITY_LABEL = 'ESG 활동';
const LIST_PATH = '/company/esg';
const UNSAVED_MESSAGE =
  'ESG 활동에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

export default function EsgFormPage() {
  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<EsgItem, EsgInput, EsgFormValues>({
      resource: 'esg',
      adapter: esgAdapter,
      entityLabel: ENTITY_LABEL,
      listPath: LIST_PATH,
      schema: esgSchema,
      empty: { category: 'environment', title: '', summary: '', date: '', imageUrls: [] },
      toInput: (values) => ({
        category: values.category as EsgCategory,
        title: values.title.trim(),
        summary: values.summary.trim(),
        date: values.date.trim(),
        imageUrls: values.imageUrls,
      }),
      toValues: (item) => ({
        category: item.category,
        title: item.title,
        summary: item.summary,
        date: item.date,
        imageUrls: [...item.imageUrls],
      }),
    });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const summary = watch('summary');
  const imageUrls = watch('imageUrls');
  const imagesError = (errors.imageUrls as { message?: string } | undefined)?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="ESG 활동 정보"
      description="별표(*) 항목은 필수입니다. 분류(환경/사회/지배구조)와 활동 내용을 입력하세요."
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
      <div style={rowStyle}>
        <FormField htmlFor="esg-category" label="분류" required error={errors.category?.message}>
          <SelectField
            id="esg-category"
            isInvalid={errors.category !== undefined}
            disabled={disabled}
            aria-invalid={errors.category !== undefined}
            {...register('category')}
          >
            {ESG_CATEGORY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField htmlFor="esg-date" label="일자" required error={errors.date?.message}>
          <input
            id="esg-date"
            type="date"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.date !== undefined)}
            disabled={disabled}
            aria-invalid={errors.date !== undefined}
            {...register('date')}
          />
        </FormField>
      </div>

      <FormField htmlFor="esg-title" label="제목" required error={errors.title?.message}>
        <input
          id="esg-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="예: 사옥 전력 재생에너지 전환"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('esg-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <TextareaField
        label="내용"
        required
        value={summary}
        onChange={(value) =>
          setValue('summary', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={SUMMARY_MAX_LENGTH}
        disabled={disabled}
        error={errors.summary?.message}
        placeholder="활동 내용을 입력하세요."
        rows={6}
      />

      <ImageGalleryField
        label="본문 이미지"
        values={imageUrls}
        onChange={(next) => setValue('imageUrls', [...next], { shouldDirty: true })}
        disabled={disabled}
        error={imagesError}
        hint={`활동을 보여줄 이미지를 여러 장 올릴 수 있습니다. 최대 ${String(MAX_ESG_IMAGES)}장.`}
        maxFiles={MAX_ESG_IMAGES}
      />
    </FormPageShell>
  );
}
