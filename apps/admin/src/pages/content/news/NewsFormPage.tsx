// NewsFormPage — 뉴스 등록/수정 (라우트: /content/news/new · /content/news/:id/edit)
//
// 공용 폼 키트(useCrudForm + FormPageShell)를 쓴다. 이 화면이 더 갖는 것은 **첨부 선택**이다.
//
// [첨부는 라이브러리에서 고른다 — 여기서 올리지 않는다]
// 여기서 파일을 직접 올리면 그 파일은 라이브러리 밖에 남고, 그러면 '어디에 쓰였나' 를 물었을 때
// 답이 반쪽이 된다(그 답이 미디어 삭제 차단의 근거다). 그래서 고르기만 한다 — 목록은
// shared/domain/media-library 의 조회기가 준다. 배선 전이면 null('모른다')이고, 그때는 고를 수
// 없다는 사실을 **빈 목록이 아니라 문장으로** 알린다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, SelectField, StatusBadge } from '@tds/ui';

import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { MEDIA_LIBRARY_PATH, mediaCatalog } from '../../../shared/domain/media-library';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  hintStyle,
  Icon,
  TextareaField,
  ToggleSwitch,
} from '../../../shared/ui';
import { NEWS_CATEGORIES, NEWS_RESOURCE, newsPostAdapter, stampNow } from './data-source';
import {
  attachmentViews,
  attachmentWarning,
  NEWS_BODY_MAX,
  NEWS_LIST_PATH,
  NEWS_TITLE_MAX,
  withAttachment,
  withoutAttachment,
} from './types';
import type { NewsPost, NewsPostInput } from './types';
import { newsPostSchema } from './validation';
import type { NewsPostFormValues } from './validation';

const ENTITY_LABEL = '뉴스';
const UNSAVED_MESSAGE =
  '뉴스에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const STATUS_OPTIONS = [
  { id: 'draft', label: '초안' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
] as const;

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

const attachmentListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const attachmentRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const pickerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const pickerSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 8)`,
};

const EMPTY: NewsPostFormValues = {
  title: '',
  categoryId: 'press',
  pinned: false,
  status: 'draft',
  publishAt: '',
  body: '',
  attachmentIds: [],
};

export default function NewsFormPage() {
  const [picked, setPicked] = useState('');

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
      attachmentIds: [...values.attachmentIds],
      updatedAt: stampNow(),
    }),
    toValues: (post) => ({
      title: post.title,
      categoryId: post.categoryId,
      pinned: post.pinned,
      status: post.status,
      publishAt: post.publishAt,
      body: post.body,
      attachmentIds: [...post.attachmentIds],
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
  const attachmentIds = watch('attachmentIds');

  /** 조회기가 주는 것만 그린다 — 렌더마다 다시 묻지 않도록 한 번만 읽는다 */
  const catalog = useMemo(() => mediaCatalog(), []);
  const views = attachmentViews(attachmentIds, catalog);
  const warning = attachmentWarning(attachmentIds, catalog);

  const setAttachments = (next: readonly string[]) => {
    setValue('attachmentIds', [...next], { shouldValidate: false, shouldDirty: true });
  };

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="뉴스 정보"
      description="별표(*) 항목은 필수입니다. 첨부파일은 미디어 라이브러리에서 고릅니다."
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

      <div style={rowStyle}>
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
          hint="비우면 발행 즉시 공개됩니다. 미래 시각을 넣으면 그때까지 '예약' 입니다."
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
        <span style={hintStyle}>고정한 글은 발행일과 무관하게 목록 맨 위에 섭니다.</span>
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

      {/* ── 첨부파일 ─────────────────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>첨부파일</h2>

        {catalog === null ? (
          <Alert tone="warning">
            미디어 라이브러리를 불러올 수 없어 지금은 첨부를 고를 수 없습니다. 이미 붙어 있는 첨부는
            그대로 저장됩니다.
          </Alert>
        ) : (
          <div style={pickerRowStyle}>
            <span style={pickerSlotStyle}>
              <SelectField
                aria-label="첨부할 파일"
                value={picked}
                disabled={disabled}
                onChange={(event) => setPicked(event.target.value)}
              >
                <option value="">라이브러리에서 고르기</option>
                {catalog.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.fileName}
                  </option>
                ))}
              </SelectField>
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || picked === ''}
              onClick={() => {
                setAttachments(withAttachment(attachmentIds, picked));
                setPicked('');
              }}
            >
              <Icon name="plus-circle" />
              첨부 추가
            </Button>
            <a className="tds-ui-link tds-ui-focusable" href={MEDIA_LIBRARY_PATH}>
              미디어 라이브러리 열기
            </a>
          </div>
        )}

        {/* 끊긴 첨부는 저장 전에 눈에 띄어야 한다 — 발행하고 나서 알면 늦다 */}
        {warning !== null && <Alert tone="danger">{warning}</Alert>}

        {views.length === 0 ? (
          <p style={hintStyle}>첨부한 파일이 없습니다.</p>
        ) : (
          <ul style={attachmentListStyle}>
            {views.map((view) => (
              <li key={view.id} style={attachmentRowStyle}>
                <span>
                  {view.asset === null ? (
                    <StatusBadge
                      tone={catalog === null ? 'warning' : 'danger'}
                      label={catalog === null ? '확인 불가' : '삭제된 파일'}
                    />
                  ) : (
                    view.asset.fileName
                  )}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => setAttachments(withoutAttachment(attachmentIds, view.id))}
                >
                  제거
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </FormPageShell>
  );
}
