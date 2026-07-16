// CaseStudyFormPage — 성공 사례 등록/수정 (라우트: /portfolio/case-studies/new · /:id/edit) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudForm + FormPageShell) 위에 업종·과제/해결/성과·대표/본문 이미지·노출을 얹는다.
import type { CSSProperties } from 'react';

import { controlStyle, errorIdOf, FormField, SelectField, TextareaField } from '../../../shared/ui';
import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { PortfolioMediaFields } from '../_shared/PortfolioMediaFields';
import { caseStudyAdapter } from './data-source';
import {
  CASE_CLIENT_MAX,
  CASE_INDUSTRY_OPTIONS,
  CASE_TEXT_MAX,
  CASE_TITLE_MAX,
  MAX_CASE_IMAGES,
} from './types';
import type { CaseIndustry, CaseStudy, CaseStudyInput } from './types';
import { caseStudySchema } from './validation';
import type { CaseStudyFormValues } from './validation';

const RESOURCE = 'case-studies';
const ENTITY_LABEL = '성공 사례';
const LIST_PATH = '/portfolio/case-studies';
const UNSAVED_MESSAGE =
  '성공 사례에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

export default function CaseStudyFormPage() {
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
  } = useCrudForm<CaseStudy, CaseStudyInput, CaseStudyFormValues>({
    resource: RESOURCE,
    adapter: caseStudyAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: caseStudySchema,
    empty: {
      title: '',
      industry: 'manufacturing',
      client: '',
      challenge: '',
      solution: '',
      result: '',
      date: '',
      coverImageUrl: '',
      imageUrls: [],
      published: true,
    },
    toInput: (values) => ({
      title: values.title.trim(),
      industry: values.industry as CaseIndustry,
      client: values.client.trim(),
      challenge: values.challenge.trim(),
      solution: values.solution.trim(),
      result: values.result.trim(),
      date: values.date.trim(),
      coverImageUrl: values.coverImageUrl,
      imageUrls: values.imageUrls,
      published: values.published,
    }),
    toValues: (item) => ({
      title: item.title,
      industry: item.industry,
      client: item.client,
      challenge: item.challenge,
      solution: item.solution,
      result: item.result,
      date: item.date,
      coverImageUrl: item.coverImageUrl,
      imageUrls: [...item.imageUrls],
      published: item.published,
    }),
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;

  const challenge = watch('challenge');
  const solution = watch('solution');
  const result = watch('result');
  const coverImageUrl = watch('coverImageUrl');
  const imageUrls = watch('imageUrls');
  const published = watch('published');
  const imagesError = (errors.imageUrls as { message?: string } | undefined)?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="성공 사례 정보"
      description="별표(*) 항목은 필수입니다. 업종·과제·해결·성과를 입력하세요."
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
      <div style={rowStyle}>
        <FormField htmlFor="case-industry" label="업종" required error={errors.industry?.message}>
          <SelectField
            id="case-industry"
            isInvalid={errors.industry !== undefined}
            disabled={disabled}
            aria-invalid={errors.industry !== undefined}
            aria-describedby={
              errors.industry !== undefined ? errorIdOf('case-industry') : undefined
            }
            {...register('industry')}
          >
            {CASE_INDUSTRY_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField htmlFor="case-date" label="일자" required error={errors.date?.message}>
          <input
            id="case-date"
            type="date"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.date !== undefined)}
            disabled={disabled}
            aria-invalid={errors.date !== undefined}
            aria-describedby={errors.date !== undefined ? errorIdOf('case-date') : undefined}
            {...register('date')}
          />
        </FormField>
      </div>

      <FormField htmlFor="case-title" label="제목" required error={errors.title?.message}>
        <input
          id="case-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={CASE_TITLE_MAX}
          placeholder="예: 스마트팩토리 전환으로 불량률 절반 감축"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('case-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <FormField htmlFor="case-client" label="고객사" required error={errors.client?.message}>
        <input
          id="case-client"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.client !== undefined)}
          maxLength={CASE_CLIENT_MAX}
          placeholder="예: 다온정밀"
          disabled={disabled}
          aria-invalid={errors.client !== undefined}
          aria-describedby={errors.client !== undefined ? errorIdOf('case-client') : undefined}
          {...register('client')}
        />
      </FormField>

      <TextareaField
        label="과제"
        required
        value={challenge}
        onChange={(value) =>
          setValue('challenge', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={CASE_TEXT_MAX}
        disabled={disabled}
        error={errors.challenge?.message}
        placeholder="고객이 마주한 문제를 입력하세요."
        rows={4}
      />

      <TextareaField
        label="해결"
        required
        value={solution}
        onChange={(value) =>
          setValue('solution', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={CASE_TEXT_MAX}
        disabled={disabled}
        error={errors.solution?.message}
        placeholder="어떻게 해결했는지 입력하세요."
        rows={4}
      />

      <TextareaField
        label="성과"
        required
        value={result}
        onChange={(value) =>
          setValue('result', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={CASE_TEXT_MAX}
        disabled={disabled}
        error={errors.result?.message}
        placeholder="정량·정성 성과를 입력하세요."
        rows={4}
      />

      <PortfolioMediaFields
        disabled={disabled}
        coverValue={coverImageUrl}
        onCoverChange={(value) => setValue('coverImageUrl', value, { shouldDirty: true })}
        coverError={errors.coverImageUrl?.message}
        galleryValues={imageUrls}
        onGalleryChange={(next) => setValue('imageUrls', [...next], { shouldDirty: true })}
        galleryError={imagesError}
        galleryHint={`사례를 보여줄 이미지를 여러 장 올릴 수 있습니다. 최대 ${String(MAX_CASE_IMAGES)}장.`}
        maxImages={MAX_CASE_IMAGES}
        published={published}
        onPublishedChange={(next) => setValue('published', next, { shouldDirty: true })}
        publishedLabel="성공 사례 노출 여부"
      />
    </FormPageShell>
  );
}
