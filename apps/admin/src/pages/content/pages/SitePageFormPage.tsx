// SitePageFormPage — 페이지 등록/수정 (라우트: /content/pages/new · /content/pages/:id/edit)
//
// 공용 폼 키트(useCrudForm + FormPageShell)를 쓴다. 이 화면이 더 갖는 것은 셋이다.
//   ① 슬러그 변경 경고 — 발행된 적 있는 주소를 바꾸면 무엇을 잃는지 **저장 전에** 말한다.
//   ② 초안 미리보기 링크 — 만들어 보관만 한다(백엔드가 열어 준다).
//   ③ 버전 이력 + 되돌리기 — 저장할 때마다 한 판이 쌓이고, 되돌리기도 새 판을 만든다.
//
// [왜 셋 다 폼 안에 있나] 셋은 전부 '이 페이지 한 건' 에 대한 조작이라 다른 화면으로 나누면
// 운영자가 같은 페이지를 두 곳에서 열게 된다. 다만 ②③ 은 폼 제출이 아니므로 버튼 타입을
// button 으로 못 박고(엔터 제출과 섞이지 않게) 도메인 훅으로 따로 나간다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, StatusBadge } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { PUBLISH_STATUS_LABEL, PUBLISH_STATUS_TONE } from '../../../shared/domain/publish-schedule';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  hintStyle,
  Icon,
  SelectField,
  TextareaField,
  useToast,
} from '../../../shared/ui';
import { PAGE_ACTOR, sitePageAdapter, SITE_PAGE_RESOURCE, stampNow } from './data-source';
import { useIssuePreviewToken, useRevertSitePage } from './queries';
import {
  BODY_MAX_LENGTH,
  previewPath,
  SITE_PAGE_LIST_PATH,
  revertBlock,
  sitePageStatus,
  slugChangeWarning,
  snapshotOf,
  STORED_STATUS_OPTIONS,
  TITLE_MAX_LENGTH,
  withRetiredSlug,
} from './types';
import type { SitePage, SitePageInput } from './types';
import type { SitePageFormValues } from './validation';
import { sitePageSchema } from './validation';

const ENTITY_LABEL = '페이지';
const UNSAVED_MESSAGE =
  '페이지에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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

const linkRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const codeStyle: CSSProperties = {
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  overflowWrap: 'anywhere',
};

const versionListStyle: CSSProperties = {
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

const versionRowStyle: CSSProperties = {
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

const versionMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const EMPTY: SitePageFormValues = {
  title: '',
  slug: '',
  status: 'draft',
  publishAt: '',
  body: '',
};

/**
 * 폼 값 + 저장된 원본 → 어댑터 입력.
 *
 * 원본이 필요한 이유는 셋이다: 옛 슬러그를 잇고, 첫 발행 시각을 잃지 않고, 이력에 한 판을
 * 덧붙이기 위해서다. 이 셋은 전부 **과거의 사실**이라 폼 값에서 되살릴 수 없다.
 */
function buildInput(values: SitePageFormValues, current: SitePage | null): SitePageInput {
  const at = stampNow();
  const title = values.title.trim();
  const slug = values.slug.trim();
  const publishAt = values.publishAt.trim();
  const becomesPublic = values.status === 'published';

  if (current === null) {
    return {
      title,
      slug,
      status: values.status,
      publishAt,
      body: values.body,
      // 예약(미래 시각)이면 아직 공개된 것이 아니다 — 첫 발행 시각을 미리 찍지 않는다
      firstPublishedAt: becomesPublic && publishAt === '' ? at : '',
      previousSlugs: [],
      previewToken: '',
      // 첫 판은 저장소가 찍는다(addSitePage) — 여기서 또 찍으면 v1 이 두 개가 된다
      versions: [],
      updatedAt: at,
    };
  }

  const next = { title, body: values.body, versions: current.versions };
  return {
    title,
    slug,
    status: values.status,
    publishAt,
    body: values.body,
    firstPublishedAt:
      current.firstPublishedAt !== ''
        ? current.firstPublishedAt
        : becomesPublic && publishAt === ''
          ? at
          : '',
    previousSlugs: withRetiredSlug(current.previousSlugs, current.slug, slug),
    previewToken: current.previewToken,
    versions: [snapshotOf(next, at, PAGE_ACTOR, '내용 수정'), ...current.versions],
    updatedAt: at,
  };
}

export default function SitePageFormPage() {
  const toast = useToast();
  /* toInput 은 config 로 먼저 넘겨야 하는데 원본(loaded)은 훅이 돌려준다 — ref 로 잇는다.
     제출은 렌더 이후에만 일어나므로 그때 ref 는 이미 최신이다. */
  const loadedRef = useRef<SitePage | null>(null);

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
    loaded,
  } = useCrudForm<SitePage, SitePageInput, SitePageFormValues>({
    resource: SITE_PAGE_RESOURCE,
    adapter: sitePageAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: SITE_PAGE_LIST_PATH,
    schema: sitePageSchema,
    empty: EMPTY,
    toInput: (values) => buildInput(values, loadedRef.current),
    toValues: (page) => ({
      title: page.title,
      slug: page.slug,
      status: page.status,
      publishAt: page.publishAt,
      body: page.body,
    }),
  });
  loadedRef.current = loaded ?? null;

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const body = watch('body');
  const slug = watch('slug');

  const slugWarning = loaded === undefined ? null : slugChangeWarning(loaded, slug);

  /* ── 미리보기 링크 · 되돌리기 (폼 제출이 아니다) ─────────────────────────── */

  const previewControllerRef = useRef<AbortController | null>(null);
  const issuePreview = useIssuePreviewToken();
  const revert = useRevertSitePage();
  const revertControllerRef = useRef<AbortController | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  const onIssuePreview = () => {
    if (loaded === undefined) return;
    previewControllerRef.current?.abort();
    const controller = new AbortController();
    previewControllerRef.current = controller;
    issuePreview.mutate(
      { id: loaded.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('미리보기 링크를 만들었습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('미리보기 링크를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const onRevert = (versionId: string) => {
    if (loaded === undefined) return;
    revertControllerRef.current?.abort();
    const controller = new AbortController();
    revertControllerRef.current = controller;
    setRevertingId(versionId);
    revert.mutate(
      { id: loaded.id, versionId, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('이전 판으로 되돌렸습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('되돌리지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
        onSettled: () => {
          if (!controller.signal.aborted) setRevertingId(null);
        },
      },
    );
  };

  const preview = loaded === undefined ? null : previewPath(loaded);

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="페이지 정보"
      description="별표(*) 항목은 필수입니다. 주소(슬러그)는 홈페이지에서 이 페이지를 여는 실제 경로가 됩니다."
      listPath={SITE_PAGE_LIST_PATH}
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
      <FormField htmlFor="page-title" label="제목" required error={errors.title?.message}>
        <input
          id="page-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="예: 사업영역"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('page-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <FormField
        htmlFor="page-slug"
        label="주소(슬러그)"
        required
        error={errors.slug?.message}
        hint="소문자·숫자·하이픈. 예: business-planning"
      >
        <input
          id="page-slug"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.slug !== undefined)}
          maxLength={60}
          placeholder="business-planning"
          disabled={disabled}
          aria-invalid={errors.slug !== undefined}
          aria-describedby={errors.slug !== undefined ? errorIdOf('page-slug') : undefined}
          {...register('slug')}
        />
      </FormField>

      {/* 막지 않는다 — 무엇을 잃는지 알린다. 판단은 운영자의 것이다(types.ts 머리말) */}
      {slugWarning !== null && <Alert tone="warning">{slugWarning}</Alert>}

      {loaded !== undefined && loaded.previousSlugs.length > 0 && (
        <p style={hintStyle}>
          {`보관 중인 옛 주소: ${loaded.previousSlugs.map((value) => `/${value}`).join(', ')}`}
        </p>
      )}

      <div style={rowStyle}>
        <FormField htmlFor="page-status" label="상태" required error={errors.status?.message}>
          <SelectField
            id="page-status"
            isInvalid={errors.status !== undefined}
            disabled={disabled}
            {...register('status')}
          >
            {STORED_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          htmlFor="page-publish-at"
          label="공개 일시"
          error={errors.publishAt?.message}
          hint="비우면 발행 즉시 공개됩니다. 미래 시각을 넣으면 그때까지 '예약' 입니다."
        >
          <input
            id="page-publish-at"
            type="datetime-local"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.publishAt !== undefined)}
            disabled={disabled}
            aria-invalid={errors.publishAt !== undefined}
            aria-describedby={
              errors.publishAt !== undefined ? errorIdOf('page-publish-at') : undefined
            }
            {...register('publishAt')}
          />
        </FormField>
      </div>

      {loaded !== undefined && (
        <p style={hintStyle}>
          {'지금 상태: '}
          <StatusBadge
            tone={PUBLISH_STATUS_TONE[sitePageStatus(loaded)]}
            label={PUBLISH_STATUS_LABEL[sitePageStatus(loaded)]}
          />
        </p>
      )}

      <TextareaField
        label="본문"
        required
        value={body}
        onChange={(value) => setValue('body', value, { shouldValidate: false, shouldDirty: true })}
        maxLength={BODY_MAX_LENGTH}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="페이지 본문을 입력하세요."
        rows={12}
      />

      {/* ── 초안 미리보기 ─────────────────────────────────────────────────── */}
      {isEdit && (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>초안 미리보기</h2>
          <p style={hintStyle}>
            발행하지 않은 내용을 확인용으로 공유하는 주소입니다. 지금은 주소만 만들어 보관합니다 —
            실제로 열어 주는 것은 홈페이지가 붙은 뒤입니다.
          </p>
          <div style={linkRowStyle}>
            {preview === null ? (
              <span style={hintStyle}>아직 만든 링크가 없습니다.</span>
            ) : (
              <code style={codeStyle}>{preview}</code>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={issuePreview.isPending || disabled}
              onClick={onIssuePreview}
            >
              <Icon name="eye" />
              {preview === null ? '미리보기 링크 만들기' : '링크 새로 만들기'}
            </Button>
          </div>
        </section>
      )}

      {/* ── 버전 이력 ─────────────────────────────────────────────────────── */}
      {isEdit && loaded !== undefined && (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>버전 이력</h2>
          <p style={hintStyle}>
            저장할 때마다 한 판이 쌓입니다. 되돌리기도 새 판을 만들어 이력이 잘리지 않습니다.
          </p>
          <ul style={versionListStyle}>
            {loaded.versions.map((version) => {
              const blocked = revertBlock(loaded, version.id);
              return (
                <li key={version.id} style={versionRowStyle}>
                  <span style={versionMetaStyle}>
                    <span>{`v${String(version.version)} · ${version.title}`}</span>
                    <span style={hintStyle}>
                      {`${version.savedAt.replace('T', ' ')} · ${version.actor} · ${version.note}`}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={blocked !== null || revertingId !== null || disabled}
                    // 못 누르는 이유를 그대로 말한다 — 사유를 화면이 다시 지어내지 않는다
                    {...(blocked !== null && { title: blocked })}
                    onClick={() => onRevert(version.id)}
                  >
                    {revertingId === version.id ? '되돌리는 중…' : '이 판으로 되돌리기'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </FormPageShell>
  );
}
