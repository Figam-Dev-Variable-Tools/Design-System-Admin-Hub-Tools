// PortfolioFormPage — 포트폴리오 등록/수정 (라우트: /portfolio/items/new · /:id/edit) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudForm + FormPageShell) 위에 대표 이미지·본문 다중 이미지·노출 토글을
// 얹는다. 검증의 정본은 ./validation 의 zod 스키마다.
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';

import { controlStyle, errorIdOf, FormField, SelectField, TextareaField } from '../../../shared/ui';
import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { PortfolioMediaFields } from '../_shared/PortfolioMediaFields';
import { fetchPortfolioCategoryOptions, portfolioAdapter } from './data-source';
import { portfolioSchema } from './validation';
import type { PortfolioFormValues } from './validation';
import {
  MAX_PORTFOLIO_IMAGES,
  PORTFOLIO_CLIENT_MAX,
  PORTFOLIO_SUMMARY_MAX,
  PORTFOLIO_TITLE_MAX,
} from '../_shared/store';
import type { PortfolioItem, PortfolioItemInput } from '../_shared/store';

const RESOURCE = 'portfolio';
const ENTITY_LABEL = '포트폴리오';
const LIST_PATH = '/portfolio/items';
const UNSAVED_MESSAGE =
  '포트폴리오에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

export default function PortfolioFormPage() {
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
  } = useCrudForm<PortfolioItem, PortfolioItemInput, PortfolioFormValues>({
    resource: RESOURCE,
    adapter: portfolioAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: portfolioSchema,
    empty: {
      title: '',
      categoryId: '',
      client: '',
      summary: '',
      date: '',
      coverImageUrl: '',
      imageUrls: [],
      published: true,
    },
    toInput: (values) => ({
      title: values.title.trim(),
      categoryId: values.categoryId,
      client: values.client.trim(),
      summary: values.summary.trim(),
      date: values.date.trim(),
      coverImageUrl: values.coverImageUrl,
      imageUrls: values.imageUrls,
      published: values.published,
    }),
    toValues: (item) => ({
      title: item.title,
      categoryId: item.categoryId,
      client: item.client,
      summary: item.summary,
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

  const categoriesQuery = useQuery({
    queryKey: [RESOURCE, 'category-options'],
    queryFn: ({ signal }) => fetchPortfolioCategoryOptions(signal),
  });
  const categories = categoriesQuery.data ?? [];

  const summary = watch('summary');
  const coverImageUrl = watch('coverImageUrl');
  const imageUrls = watch('imageUrls');
  const published = watch('published');
  const imagesError = (errors.imageUrls as { message?: string } | undefined)?.message;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="포트폴리오 정보"
      description="별표(*) 항목은 필수입니다. 분류·대표 이미지와 소개를 입력하세요."
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
        <FormField
          htmlFor="portfolio-category"
          label="분류"
          required
          error={errors.categoryId?.message}
        >
          <SelectField
            id="portfolio-category"
            isInvalid={errors.categoryId !== undefined}
            disabled={disabled}
            aria-invalid={errors.categoryId !== undefined}
            aria-describedby={
              errors.categoryId !== undefined ? errorIdOf('portfolio-category') : undefined
            }
            {...register('categoryId')}
          >
            <option value="">분류 선택</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField htmlFor="portfolio-date" label="일자" required error={errors.date?.message}>
          <input
            id="portfolio-date"
            type="date"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.date !== undefined)}
            disabled={disabled}
            aria-invalid={errors.date !== undefined}
            aria-describedby={errors.date !== undefined ? errorIdOf('portfolio-date') : undefined}
            {...register('date')}
          />
        </FormField>
      </div>

      <FormField htmlFor="portfolio-title" label="제목" required error={errors.title?.message}>
        <input
          id="portfolio-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={PORTFOLIO_TITLE_MAX}
          placeholder="예: 한빛 리버뷰 펜트하우스 리모델링"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('portfolio-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <FormField htmlFor="portfolio-client" label="고객사" required error={errors.client?.message}>
        <input
          id="portfolio-client"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.client !== undefined)}
          maxLength={PORTFOLIO_CLIENT_MAX}
          placeholder="예: 한빛개발"
          disabled={disabled}
          aria-invalid={errors.client !== undefined}
          aria-describedby={errors.client !== undefined ? errorIdOf('portfolio-client') : undefined}
          {...register('client')}
        />
      </FormField>

      <TextareaField
        label="소개"
        required
        value={summary}
        onChange={(value) =>
          setValue('summary', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={PORTFOLIO_SUMMARY_MAX}
        disabled={disabled}
        error={errors.summary?.message}
        placeholder="프로젝트 개요와 성과를 입력하세요."
        rows={6}
      />

      <PortfolioMediaFields
        disabled={disabled}
        coverValue={coverImageUrl}
        onCoverChange={(value) => setValue('coverImageUrl', value, { shouldDirty: true })}
        coverError={errors.coverImageUrl?.message}
        galleryValues={imageUrls}
        onGalleryChange={(next) => setValue('imageUrls', [...next], { shouldDirty: true })}
        galleryError={imagesError}
        galleryHint={`프로젝트를 보여줄 이미지를 여러 장 올릴 수 있습니다. 최대 ${String(MAX_PORTFOLIO_IMAGES)}장.`}
        maxImages={MAX_PORTFOLIO_IMAGES}
        published={published}
        onPublishedChange={(next) => setValue('published', next, { shouldDirty: true })}
        publishedLabel="포트폴리오 노출 여부"
      />
    </FormPageShell>
  );
}
