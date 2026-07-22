/**
 * Design System/Templates/Content/Site Page Form — 페이지 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/pages/new` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en =
 * "Pages" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/pages', '페이지 관리', 'Pages']`. 등록/수정은 그 목록의 하위 라우트다).
 *
 * 대응 실화면: apps/admin/src/pages/content/pages/SitePageFormPage.tsx
 * (라우트 /content/pages/new · /content/pages/:id/edit) 와 그 규칙(types.ts) ·
 * 공용 껍데기(shared/crud/FormPageShell · useCrudForm).
 *
 * [저장되는 것은 둘뿐이다 — 상태와 공개 일시] 폼의 상태 셀렉트에는 초안·발행·보관 **셋만** 있다.
 * '예약' 이 없는 것이 빠뜨린 것이 아니다: 예약은 고르는 값이 아니라 발행 + 미래 시각이 만드는
 * **파생값**이다. 셀렉트에 '예약' 을 넣으면 예약을 골라 놓고 시각을 비운 페이지가 생기고, 그
 * 페이지가 언제 공개되는지는 아무도 답할 수 없다.
 *
 * [슬러그 변경은 막지 않는다 — 경고한다] 발행된 적 있는 페이지의 주소를 바꾸면 외부 링크·북마크·
 * 검색 결과가 전부 끊긴다. 그래도 막지 않는 이유는 주소를 바꿔야 할 정당한 이유가 있기 때문이다
 * (오타·개편). 대신 **무엇을 잃는지 저장 전에 말하고**, 옛 주소를 버리지 않고 보관한다 —
 * 백엔드가 붙는 날 301 리다이렉트를 걸 근거가 그것뿐이다. 지금 버리면 영영 복구되지 않는다.
 *
 * [미리보기는 만들어 보관만 한다 — 열리지 않는다] 초안 미리보기 주소를 실제로 열어 주는 것은
 * 홈페이지(B2C)와 백엔드의 일이다. 그래서 이 화면은 **주소 문자열까지만 만들고 그 사실을 화면이
 * 그대로 말한다.** 열리는 척하는 '미리보기' 버튼을 두면 운영자는 공유한 링크가 죽었다는 사실을
 * 상대방에게 듣고서야 알게 된다.
 *
 * [되돌리기도 새 판을 만든다] 이력은 추가만 되는 원장이다. 판을 잘라 내면 '되돌렸는데 역시
 * 아니었다' 는 흔한 일이 복구 불가능해진다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 조각을 DS 표면으로 갈음한다:
 *   FormPageShell(목록으로·카드·저장 바) → Button(ghost) + Icon + Card + 토큰 레이아웃
 *   controlStyle(앱)                     → 토큰만 쓴 인라인 style
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                 → 토큰 <a> + Icon(chevron-left)
 *   제목 / 주소(슬러그)       → FormField + 토큰 <input>
 *   슬러그 변경 경고          → Alert(warning)
 *   보관 중인 옛 주소         → 토큰 <p>(hint)
 *   상태(초안·발행·보관)      → FormField + SelectField
 *   공개 일시                → FormField + <input type="datetime-local">
 *   지금 상태(파생)           → StatusBadge
 *   본문                     → TextareaField
 *   초안 미리보기 링크         → 토큰 <code> + Button(secondary) + Icon(eye)
 *   버전 이력 · 되돌리기       → 토큰 <ul>/<li> + Button(secondary · 막히면 사유를 title 에)
 *   상세 조회 스켈레톤        → Skeleton
 *   저장 / 취소              → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  Icon,
  SelectField,
  Skeleton,
  StatusBadge,
  TextareaField,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Site Page Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 types.ts · shared/domain/publish-schedule 미러) ─────────────────────── */

/** 저장되는 상태 — 셋뿐이다. 폼의 셀렉트도 이 셋만 보여 준다 */
type StoredPublishStatus = 'draft' | 'published' | 'archived';

type PublishStatus = StoredPublishStatus | 'scheduled';

const STORED_STATUS_OPTIONS: readonly {
  readonly id: StoredPublishStatus;
  readonly label: string;
}[] = [
  { id: 'draft', label: '초안' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
];

const PUBLISH_STATUS_LABEL: Readonly<Record<PublishStatus, string>> = {
  draft: '초안',
  scheduled: '예약',
  published: '발행',
  archived: '보관',
};

const PUBLISH_STATUS_TONE: Readonly<Record<PublishStatus, StatusBadgeTone>> = {
  draft: 'neutral',
  scheduled: 'info',
  published: 'success',
  archived: 'neutral',
};

/** 판정 기준 시각 — 스토리가 날짜에 흔들리지 않도록 고정한다 */
const NOW = '2026-07-22T09:00';

function effectiveStatus(status: StoredPublishStatus, publishAt: string): PublishStatus {
  if (status !== 'published') return status;
  if (publishAt.trim() === '') return 'published';
  return publishAt > NOW ? 'scheduled' : 'published';
}

const TITLE_MAX_LENGTH = 100;
const SLUG_MAX_LENGTH = 60;
const BODY_MAX_LENGTH = 20_000;

const SLUG_CHANGE_WARNING =
  '이미 공개된 주소입니다. 바꾸면 기존 링크·북마크·검색 결과가 모두 끊깁니다. 옛 주소는 되돌릴 수 있도록 보관합니다.';

/**
 * 지금 이 변경을 경고해야 하는가 — 경고할 것이 없으면 null.
 * **막지 않는다.** 경고는 거절이 아니라 사실 통지다(실화면 slugChangeWarning 미러).
 */
function slugChangeWarning(seed: SeedValues, nextSlug: string): string | null {
  if (seed.firstPublishedAt === '') return null;
  if (nextSlug.trim() === seed.slug) return null;
  return SLUG_CHANGE_WARNING;
}

const REVERT_SAME = '지금 내용과 같은 판입니다. 되돌릴 것이 없습니다.';

/* ── 데모 데이터(실화면 픽스처를 폼 값으로 되돌린 형태) ────────────────────────────────────── */

interface DemoVersion {
  readonly id: string;
  readonly version: number;
  readonly savedAt: string;
  /** 누가 저장했나 — 운영 조직 역할명(실명 금지) */
  readonly actor: string;
  readonly title: string;
  readonly note: string;
  /** 지금 내용과 같은 판인가 — 같으면 되돌리기가 막힌다(실화면 revertBlock) */
  readonly sameAsCurrent: boolean;
}

interface SeedValues {
  readonly title: string;
  readonly slug: string;
  readonly status: StoredPublishStatus;
  readonly publishAt: string;
  readonly body: string;
  /** 처음 공개된 시각 — '' 면 한 번도 공개된 적이 없다(슬러그 경고의 근거) */
  readonly firstPublishedAt: string;
  readonly previousSlugs: readonly string[];
  /** 초안 미리보기 주소 — '' 면 아직 만들지 않았다 */
  readonly previewPath: string;
  readonly versions: readonly DemoVersion[];
}

const EMPTY_SEED: SeedValues = {
  title: '',
  slug: '',
  status: 'draft',
  publishAt: '',
  body: '',
  firstPublishedAt: '',
  previousSlugs: [],
  previewPath: '',
  versions: [],
};

const EDIT_SEED: SeedValues = {
  title: '사업영역',
  slug: 'business',
  status: 'published',
  publishAt: '',
  body: '<h2>사업영역</h2>\n<p>공간 기획부터 시공 감리까지, 저희가 맡는 일의 범위를 소개합니다.</p>',
  firstPublishedAt: '2026-03-02T10:00',
  previousSlugs: [],
  previewPath: '',
  versions: [
    {
      id: 'pv-3',
      version: 3,
      savedAt: '2026-07-18T14:20',
      actor: '콘텐츠 운영팀',
      title: '사업영역',
      note: '내용 수정',
      // 최신 판은 지금 내용과 같다 — 되돌릴 것이 없어 버튼이 잠긴다
      sameAsCurrent: true,
    },
    {
      id: 'pv-2',
      version: 2,
      savedAt: '2026-05-02T09:10',
      actor: '콘텐츠 운영팀',
      title: '사업 영역 안내',
      note: 'v1 내용으로 되돌림',
      sameAsCurrent: false,
    },
    {
      id: 'pv-1',
      version: 1,
      savedAt: '2026-03-02T10:00',
      actor: '콘텐츠 운영팀',
      title: '사업영역',
      note: '최초 등록',
      sameAsCurrent: false,
    },
  ],
};

/** 주소를 이미 한 번 바꾼 페이지 — 옛 주소가 보관돼 있고 미리보기 링크도 발급돼 있다 */
const RENAMED_SEED: SeedValues = {
  ...EDIT_SEED,
  title: '2025 브랜드 소개',
  slug: 'brand-2025',
  status: 'archived',
  previousSlugs: ['brand'],
  previewPath: '/preview/brand-2025?token=9f2c41ae-7b0d-4c31-8a55-0e1d2f3a4b5c',
};

/** 예약된 페이지 — 저장값은 '발행' 이지만 지금 상태 배지는 '예약' 이라고 말한다 */
const SCHEDULED_SEED: SeedValues = {
  ...EDIT_SEED,
  title: '데이터 분석',
  slug: 'business-analytics',
  status: 'published',
  publishAt: '2026-12-01T09:00',
  firstPublishedAt: '',
  versions: EDIT_SEED.versions.slice(1),
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly slug?: string;
  readonly publishAt?: string;
  readonly body?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  slug: '주소는 소문자·숫자·하이픈만 쓸 수 있습니다. 예: business-design',
  body: '본문을 입력하세요.',
};

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  alignSelf: 'flex-start',
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 7), 1fr))`,
  gap: cssVar('space.4'),
};

const controlStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
});

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const statusLineStyle: CSSProperties = {
  ...hintStyle,
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
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
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
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
  ...typography('typography.code.md'),
  overflowWrap: 'anywhere',
};

const versionListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  margin: 0,
  padding: 0,
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

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface SitePageFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
  /** 슬러그를 이미 고친 상태로 열어 경고 경로를 그대로 보여 준다 */
  readonly initialSlugOverride?: string;
}

function SitePageFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
  initialSlugOverride,
}: SitePageFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [slug, setSlug] = useState(initialSlugOverride ?? seed.slug);
  const [status, setStatus] = useState<StoredPublishStatus>(seed.status);
  const [publishAt, setPublishAt] = useState(seed.publishAt);
  const [body, setBody] = useState(seed.body);
  const [previewPath, setPreviewPath] = useState(seed.previewPath);

  const warning = isEdit ? slugChangeWarning(seed, slug) : null;
  const current = effectiveStatus(status, publishAt);

  return (
    <div style={pageStyle}>
      <a href="#site-page-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '페이지 수정' : '페이지 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 주소(슬러그)는 홈페이지에서 이 페이지를 여는 실제 경로가
          됩니다.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>페이지 정보</h2>

            {loadingDetail ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <>
                <FormField
                  htmlFor="site-page-title"
                  label="제목"
                  required
                  {...(errors.title !== undefined && { error: errors.title })}
                >
                  <input
                    id="site-page-title"
                    type="text"
                    style={controlStyle(errors.title !== undefined)}
                    maxLength={TITLE_MAX_LENGTH}
                    placeholder="예: 사업영역"
                    value={title}
                    aria-invalid={errors.title !== undefined}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </FormField>

                <FormField
                  htmlFor="site-page-slug"
                  label="주소(슬러그)"
                  required
                  hint="소문자·숫자·하이픈. 예: business-planning"
                  {...(errors.slug !== undefined && { error: errors.slug })}
                >
                  <input
                    id="site-page-slug"
                    type="text"
                    style={controlStyle(errors.slug !== undefined)}
                    maxLength={SLUG_MAX_LENGTH}
                    placeholder="business-planning"
                    value={slug}
                    aria-invalid={errors.slug !== undefined}
                    onChange={(event) => setSlug(event.target.value)}
                  />
                </FormField>

                {/* 막지 않는다 — 무엇을 잃는지 알린다. 판단은 운영자의 것이다 */}
                {warning !== null && <Alert tone="warning">{warning}</Alert>}

                {seed.previousSlugs.length > 0 && (
                  <p style={hintStyle}>
                    {`보관 중인 옛 주소: ${seed.previousSlugs.map((value) => `/${value}`).join(', ')}`}
                  </p>
                )}

                <div style={rowStyle}>
                  <FormField htmlFor="site-page-status" label="상태" required>
                    <SelectField
                      id="site-page-status"
                      value={status}
                      onChange={(event) => {
                        const next = STORED_STATUS_OPTIONS.find(
                          (option) => option.id === event.target.value,
                        );
                        if (next !== undefined) setStatus(next.id);
                      }}
                    >
                      {STORED_STATUS_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>

                  <FormField
                    htmlFor="site-page-publish-at"
                    label="공개 일시"
                    hint="비우면 발행 즉시 공개됩니다. 미래 시각을 넣으면 그때까지 '예약' 입니다."
                    {...(errors.publishAt !== undefined && { error: errors.publishAt })}
                  >
                    <input
                      id="site-page-publish-at"
                      type="datetime-local"
                      style={controlStyle(errors.publishAt !== undefined)}
                      value={publishAt}
                      aria-invalid={errors.publishAt !== undefined}
                      onChange={(event) => setPublishAt(event.target.value)}
                    />
                  </FormField>
                </div>

                {isEdit && (
                  <p style={statusLineStyle}>
                    <span>지금 상태:</span>
                    <StatusBadge
                      tone={PUBLISH_STATUS_TONE[current]}
                      label={PUBLISH_STATUS_LABEL[current]}
                    />
                  </p>
                )}

                <TextareaField
                  label="본문"
                  required
                  value={body}
                  onChange={setBody}
                  maxLength={BODY_MAX_LENGTH}
                  placeholder="페이지 본문을 입력하세요."
                  rows={12}
                  {...(errors.body !== undefined && { error: errors.body })}
                />

                {isEdit && (
                  <section style={sectionStyle}>
                    <h2 style={sectionTitleStyle}>초안 미리보기</h2>
                    <p style={hintStyle}>
                      발행하지 않은 내용을 확인용으로 공유하는 주소입니다. 지금은 주소만 만들어
                      보관합니다 — 실제로 열어 주는 것은 홈페이지가 붙은 뒤입니다.
                    </p>
                    <div style={linkRowStyle}>
                      {previewPath === '' ? (
                        <span style={hintStyle}>아직 만든 링크가 없습니다.</span>
                      ) : (
                        <code style={codeStyle}>{previewPath}</code>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        iconLeft={<Icon name="eye" />}
                        onClick={() =>
                          setPreviewPath(
                            `/preview/${slug}?token=3ca87d61-2f45-4bb9-9c07-8ad51e6f04b2`,
                          )
                        }
                      >
                        {previewPath === '' ? '미리보기 링크 만들기' : '링크 새로 만들기'}
                      </Button>
                    </div>
                  </section>
                )}

                {isEdit && seed.versions.length > 0 && (
                  <section style={sectionStyle}>
                    <h2 style={sectionTitleStyle}>버전 이력</h2>
                    <p style={hintStyle}>
                      저장할 때마다 한 판이 쌓입니다. 되돌리기도 새 판을 만들어 이력이 잘리지
                      않습니다.
                    </p>
                    <ul style={versionListStyle}>
                      {seed.versions.map((version) => (
                        <li key={version.id} style={versionRowStyle}>
                          <span style={versionMetaStyle}>
                            <span>{`v${String(version.version)} · ${version.title}`}</span>
                            <span style={hintStyle}>
                              {`${version.savedAt.replace('T', ' ')} · ${version.actor} · ${version.note}`}
                            </span>
                          </span>
                          {/* 못 누르는 이유를 그대로 말한다 — 사유를 화면이 다시 지어내지 않는다 */}
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={version.sameAsCurrent}
                            {...(version.sameAsCurrent && { title: REVERT_SAME })}
                          >
                            이 판으로 되돌리기
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            <div style={actionsStyle}>
              <Button variant="secondary" type="button">
                취소
              </Button>
              <Button variant="primary" type="submit" disabled={loadingDetail}>
                저장
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

/** 등록: 빈 폼 — 미리보기·버전 이력은 아직 존재할 수 없어 나오지 않는다 */
export const Default: Story = {
  render: () => <SitePageFormScreen />,
};

/** 수정: 발행된 페이지 — 지금 상태 배지 · 미리보기(미발급) · 버전 이력 셋이 함께 선다 */
export const Edit: Story = {
  render: () => <SitePageFormScreen isEdit seed={EDIT_SEED} />,
};

/**
 * 슬러그 변경 경고: 공개된 적 있는 주소를 고쳤다 — **막지 않고** 무엇을 잃는지 저장 전에 말한다.
 */
export const SlugChangeWarning: Story = {
  render: () => (
    <SitePageFormScreen isEdit seed={EDIT_SEED} initialSlugOverride="business-domain" />
  ),
};

/**
 * 예약 · 옛 주소 보관 · 미리보기 발급: 저장값은 '발행/보관' 인데 화면이 파생 상태를 말하고,
 * 발급된 미리보기 주소는 **보관될 뿐 열리지 않는다**는 사실을 그 자리에서 밝힌다.
 */
export const ScheduledWithHistory: Story = {
  render: () => <SitePageFormScreen isEdit seed={SCHEDULED_SEED} />,
};

/** 주소를 이미 한 번 바꾼 페이지: 옛 주소가 보관돼 있고 미리보기 링크도 이미 발급돼 있다 */
export const RetiredSlug: Story = {
  render: () => <SitePageFormScreen isEdit seed={RENAMED_SEED} />,
};

/** 검증 오류: 제출 실패 — 오류는 폼 상단 배너가 아니라 각 입력 칸에 인라인으로 붙는다 */
export const ValidationErrors: Story = {
  render: () => <SitePageFormScreen errors={DEMO_ERRORS} />,
};

/** 상세 조회 중: 폼 자리에 스켈레톤 — 저장 버튼은 그동안 눌리지 않는다 */
export const LoadingDetail: Story = {
  render: () => <SitePageFormScreen isEdit seed={EDIT_SEED} loadingDetail />,
};
