// NewsFormPage — 뉴스 등록/수정 (라우트: /content/news/new · /content/news/:id/edit)
//
// 공용 폼 키트(useCrudForm + FormPageShell)를 그대로 쓴다.
//
// [첨부 표면은 없다] 예전에는 미디어 라이브러리(/content/media)에서 자산을 골라 붙였다. 그 화면이
// IA 에서 빠지면서 첨부가 가리킬 정본이 사라졌고, 목록을 못 읽는 채로 표면만 남기면 화면이
// 영원히 '라이브러리를 불러올 수 없습니다' 를 말하게 된다 — 고칠 방법이 없는 안내는 안내가 아니다.
// 그래서 표면과 모델을 함께 걷었다.
import type { CSSProperties } from 'react';

import { cssVar, SelectField } from '@tds/ui';

import { FormPageShell, useCrudForm } from '../../../shared/crud';
import {
  controlStyle,
  errorIdOf,
  FormField,
  formRowStyle,
  hintStyle,
  TextareaField,
  ToggleSwitch,
} from '../../../shared/ui';
import { NEWS_CATEGORIES, NEWS_RESOURCE, newsPostAdapter, stampNow } from './data-source';
import { NEWS_BODY_MAX, NEWS_LIST_PATH, NEWS_TITLE_MAX } from './types';
import type { NewsPost, NewsPostInput } from './types';
import { newsPostSchema } from './validation';
import type { NewsPostFormValues } from './validation';

const ENTITY_LABEL = '뉴스';
const UNSAVED_MESSAGE =
  '뉴스에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const STATUS_OPTIONS = [
  { id: 'draft', label: '초안' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
] as const;

const pickerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const EMPTY: NewsPostFormValues = {
  title: '',
  categoryId: 'press',
  pinned: false,
  status: 'draft',
  publishAt: '',
  body: '',
};

export default function NewsFormPage() {
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
  } = useCrudForm<NewsPost, NewsPostInput, NewsPostFormValues>({
    resource: NEWS_RESOURCE,
    adapter: newsPostAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: NEWS_LIST_PATH,
    schema: newsPostSchema,
    empty: EMPTY,
    toInput: (values) => ({
      title: values.title.trim(),
      categoryId: values.categoryId,
      pinned: values.pinned,
      status: values.status,
      publishAt: values.publishAt.trim(),
      body: values.body,
      updatedAt: stampNow(),
    }),
    toValues: (post) => ({
      title: post.title,
      categoryId: post.categoryId,
      pinned: post.pinned,
      status: post.status,
      publishAt: post.publishAt,
      body: post.body,
    }),
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const body = watch('body');
  const pinned = watch('pinned');

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="뉴스 정보"
      description="별표(*) 항목은 필수예요."
      listPath={NEWS_LIST_PATH}
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
      <FormField htmlFor="news-title" label="제목" required error={errors.title?.message}>
        <input
          id="news-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={NEWS_TITLE_MAX}
          placeholder="예: 공간 데이터 분석 솔루션 정식 출시"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('news-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <div style={formRowStyle}>
        <FormField htmlFor="news-category" label="분류" required error={errors.categoryId?.message}>
          <SelectField
            id="news-category"
            isInvalid={errors.categoryId !== undefined}
            disabled={disabled}
            {...register('categoryId')}
          >
            {NEWS_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField htmlFor="news-status" label="상태" required error={errors.status?.message}>
          <SelectField
            id="news-status"
            isInvalid={errors.status !== undefined}
            disabled={disabled}
            {...register('status')}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          htmlFor="news-publish-at"
          label="공개 일시"
          error={errors.publishAt?.message}
          hint="비우면 발행 즉시 공개돼요. 미래 시각을 넣으면 그때까지 '예약' 예요."
        >
          <input
            id="news-publish-at"
            type="datetime-local"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.publishAt !== undefined)}
            disabled={disabled}
            aria-invalid={errors.publishAt !== undefined}
            aria-describedby={
              errors.publishAt !== undefined ? errorIdOf('news-publish-at') : undefined
            }
            {...register('publishAt')}
          />
        </FormField>
      </div>

      <div style={pickerRowStyle}>
        <ToggleSwitch
          label="상단 고정 여부"
          onLabel="상단 고정"
          offLabel="고정 안 함"
          checked={pinned}
          disabled={disabled}
          onChange={(next) => setValue('pinned', next, { shouldDirty: true })}
        />
        <span style={hintStyle}>고정한 글은 발행일과 무관하게 목록 맨 위에 서요.</span>
      </div>

      <TextareaField
        label="본문"
        required
        value={body}
        onChange={(value) => setValue('body', value, { shouldValidate: false, shouldDirty: true })}
        maxLength={NEWS_BODY_MAX}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="보도자료 본문을 입력하세요."
        rows={10}
      />
    </FormPageShell>
  );
}
