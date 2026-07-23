/**
 * Design System/Templates/Content/Popup Form — 팝업 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/popups` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Popups"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 — 폼은 그 화면의 등록/수정 라우트다).
 *
 * 대응 실화면: apps/admin/src/pages/content/popups/PopupFormPage.tsx
 * (라우트 /content/popups/new · /content/popups/:id/edit). 하나의 폼이 등록과 수정을 겸한다(:id 유무).
 * 왼쪽 입력 / 오른쪽 **실시간 미리보기** 2단이고, 좁으면 세로로 쌓인다(auto-fit) — 팝업은 저장 전에
 * '사용자에게 어떻게 뜨는지' 를 봐야 하는 화면이라 미리보기가 폼의 절반을 차지한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)          → Card + 토큰만 쓴 <h2>(title.md) + aria-labelledby
 *   controlStyle(앱)       → 토큰만 쓴 인라인 컨트롤 스타일
 *   PopupPreview(앱)       → Card 안에 토큰 레이아웃 + Icon(close·image)
 *   useUnsavedChangesDialog → 템플릿에서는 재현하지 않는다(이탈 가드는 라우터의 일)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   제목(최대 100자)        → TextField (required · maxLength)
 *   이미지(필수)            → ImageUploadField
 *   링크 URL(선택)          → FormField + input[type=url]
 *   노출 위치               → FormField + SelectField (메인 홈 · 이벤트 페이지 · 전체 페이지)
 *   우선순위                → FormField + input[type=number] (작을수록 먼저)
 *   노출 기간(시작~종료)     → DateRangeField
 *   노출 ON                → Checkbox
 *   저장 실패 인라인 배너    → Alert(danger)
 *   상세 조회 스켈레톤       → Skeleton ×n (useCrudForm loadingDetail 미러)
 *   저장/취소               → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 * 미리보기 이미지는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  DateRangeField,
  FormField,
  formRowStyle,
  Icon,
  ImageUploadField,
  SelectField,
  Skeleton,
  TextField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Popup Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/popups/types.ts · validation.ts 미러) ────────────────────────── */

const TITLE_MAX_LENGTH = 100;

type PopupPosition = 'home' | 'event' | 'all';

const POSITION_LABEL: Record<PopupPosition, string> = {
  home: '메인 홈',
  event: '이벤트 페이지',
  all: '전체 페이지',
};

const POSITION_OPTIONS: readonly { readonly id: PopupPosition; readonly label: string }[] = [
  { id: 'home', label: '메인 홈' },
  { id: 'event', label: '이벤트 페이지' },
  { id: 'all', label: '전체 페이지' },
];

/* ── 데모 데이터(실화면 PopupFormValues 미러 — 등록은 빈 값, 수정은 픽스처 PU-002) ───────────── */

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="${hue}"/><text x="160" y="96" font-family="sans-serif" font-size="18" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_IMAGE = svgDataUri('시즌 프로모션', 'slateblue');

interface SeedValues {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly position: PopupPosition;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
  readonly priority: string;
}

const EMPTY_SEED: SeedValues = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  position: 'home',
  startAt: '',
  endAt: '',
  enabled: true,
  // 등록 화면은 '현재 최대 우선순위 + 1' 이 자동으로 채워진다(useNextPopupPriority 미러)
  priority: '6',
};

const EDIT_SEED: SeedValues = {
  title: '시즌 프로모션 (002)',
  imageUrl: EDIT_IMAGE,
  linkUrl: 'https://example.com/event/002',
  position: 'event',
  startAt: '2026-02-01',
  endAt: '2026-02-28',
  enabled: true,
  priority: '2',
};

/** 검증 오류 데모 — 실화면 popupSchema(zod/mini) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly imageUrl?: string;
  readonly linkUrl?: string;
  readonly priority?: string;
  readonly period?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  imageUrl: '이미지를 등록하세요.',
  linkUrl: 'http(s):// 로 시작하는 URL 을 입력하세요.',
  priority: '우선순위는 0 이상의 정수예요.',
  period: '노출 기간을 YYYY-MM-DD 형식으로 입력하세요.',
};

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
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

/** 2단 레이아웃 — 넓으면 좌(입력)/우(미리보기), 좁으면 세로 스택(auto-fit) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
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

/* ── 미리보기 스타일(실화면 PopupPreview 미러) ────────────────────────────────────────────── */

const stageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: `calc(${cssVar('space.6')} * 9)`,
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

// 노출 OFF 를 opacity 로 흐리지 않는다 — 컨테이너 opacity 는 안의 글자(제목 h3·링크)를 배경으로
// 합성해 대비를 4.5:1 아래로 떨어뜨린다(axe color-contrast). OFF 사실은 아래 상태 줄이 글자로 전한다.
const previewCardStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: `calc(${cssVar('space.6')} * 11)`,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const closeStyle: CSSProperties = {
  position: 'absolute',
  top: cssVar('space.2'),
  right: cssVar('space.2'),
  display: 'inline-flex',
  color: cssVar('color.text.muted'),
};

const previewImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxHeight: `calc(${cssVar('space.6')} * 7)`,
  objectFit: 'cover',
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const imagePlaceholderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  boxSizing: 'border-box',
  width: '100%',
  minHeight: `calc(${cssVar('space.6')} * 5)`,
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
  ...typography('typography.caption.md'),
};

const previewTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: cssVar('space.5'),
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
  ...typography('typography.title.md'),
};

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  alignSelf: 'flex-start',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderRadius: cssVar('component.button.radius'),
  background: cssVar('component.button.background'),
  color: cssVar('component.button.text'),
  overflowWrap: 'anywhere',
  ...typography('typography.label.md'),
};

const previewCaptionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  flexWrap: 'wrap',
  ...typography('typography.caption.md'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <Card>
        <div style={cardBodyStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            {title}
          </h2>
          {children}
        </div>
      </Card>
    </section>
  );
}

/* ── 실시간 미리보기(실화면 PopupPreview 미러) ────────────────────────────────────────────── */

function PopupPreview({
  title,
  imageUrl,
  linkUrl,
  positionLabel,
  enabled,
}: {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly positionLabel: string;
  readonly enabled: boolean;
}) {
  const trimmedImage = imageUrl.trim();
  const trimmedLink = linkUrl.trim();

  return (
    <div>
      <div style={stageStyle}>
        <div style={previewCardStyle}>
          <span style={closeStyle} aria-hidden="true">
            <Icon name="close" />
          </span>

          {trimmedImage !== '' ? (
            <img src={trimmedImage} alt="" style={previewImageStyle} />
          ) : (
            <div style={imagePlaceholderStyle}>
              <span aria-hidden="true">
                <Icon name="image" />
              </span>
              <span>이미지 미리보기</span>
            </div>
          )}

          <h3 style={previewTitleStyle}>{title.trim() === '' ? '팝업 제목' : title}</h3>

          {trimmedLink !== '' && <span style={linkButtonStyle}>자세히 보기</span>}
        </div>
      </div>

      <p style={previewCaptionStyle}>
        <span>{`${positionLabel} 에 노출`}</span>
        <span aria-hidden="true">·</span>
        <span>{enabled ? '노출 ON' : '노출 OFF (저장해도 사용자에게 보이지 않아요)'}</span>
      </p>
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ──────────────────────────── */

interface PopupFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — 실화면 loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 저장 실패 인라인 배너 — 실화면 serverError 미러 */
  readonly serverError?: string;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function PopupFormScreen({
  isEdit = false,
  loadingDetail = false,
  serverError = '',
  errors = {},
  seed = EMPTY_SEED,
}: PopupFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [imageUrl, setImageUrl] = useState(seed.imageUrl);
  const [linkUrl, setLinkUrl] = useState(seed.linkUrl);
  const [position, setPosition] = useState<PopupPosition>(seed.position);
  const [startAt, setStartAt] = useState(seed.startAt);
  const [endAt, setEndAt] = useState(seed.endAt);
  const [enabled, setEnabled] = useState(seed.enabled);
  const [priority, setPriority] = useState(seed.priority);

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '팝업 수정' : '팝업 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 오른쪽 미리보기로 사용자에게 보일 모습을 확인하세요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={pageStyle}>
        <div style={layoutStyle}>
          <FormCard title="팝업 정보">
            {serverError !== '' && <Alert tone="danger">{serverError}</Alert>}

            {loadingDetail ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3, 4, 5].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <>
                <TextField
                  id="popup-title"
                  label="제목"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={TITLE_MAX_LENGTH}
                  placeholder="예: 신규 가입 혜택"
                  error={errors.title ?? ''}
                />

                <ImageUploadField
                  label="이미지"
                  required
                  value={imageUrl}
                  onChange={setImageUrl}
                  hint="이미지를 끌어다 놓거나 클릭해 업로드해요."
                  error={errors.imageUrl ?? ''}
                />

                <FormField
                  htmlFor="popup-link"
                  label="링크 URL"
                  hint="클릭 시 이동할 주소 (선택)"
                  {...(errors.linkUrl !== undefined && { error: errors.linkUrl })}
                >
                  <input
                    id="popup-link"
                    type="url"
                    style={controlStyle(errors.linkUrl !== undefined)}
                    placeholder="https://example.com/event"
                    value={linkUrl}
                    aria-invalid={errors.linkUrl !== undefined}
                    onChange={(event) => setLinkUrl(event.target.value)}
                  />
                </FormField>

                <div style={formRowStyle}>
                  <FormField htmlFor="popup-position" label="노출 위치" required>
                    <SelectField
                      id="popup-position"
                      value={position}
                      onChange={(event) => setPosition(event.target.value as PopupPosition)}
                    >
                      {POSITION_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>

                  <FormField
                    htmlFor="popup-priority"
                    label="우선순위"
                    required
                    hint="작을수록 먼저 노출돼요."
                    {...(errors.priority !== undefined && { error: errors.priority })}
                  >
                    <input
                      id="popup-priority"
                      type="number"
                      min={0}
                      style={controlStyle(errors.priority !== undefined)}
                      value={priority}
                      aria-invalid={errors.priority !== undefined}
                      onChange={(event) => setPriority(event.target.value)}
                    />
                  </FormField>
                </div>

                <DateRangeField
                  label="노출 기간"
                  required
                  startValue={startAt}
                  endValue={endAt}
                  onStartChange={setStartAt}
                  onEndChange={setEndAt}
                  error={errors.period ?? ''}
                />

                <Checkbox
                  id="popup-enabled"
                  label="노출 ON"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
              </>
            )}
          </FormCard>

          <FormCard title="미리보기">
            <PopupPreview
              title={title}
              imageUrl={imageUrl}
              linkUrl={linkUrl}
              positionLabel={POSITION_LABEL[position]}
              enabled={enabled}
            />
          </FormCard>
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md">
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 우선순위는 '현재 최대 + 1' 로 미리 채워진다 */
export const Default: Story = {
  render: () => <PopupFormScreen />,
};

/** 수정: 기존 팝업(PU-002) 값이 채워진 폼 — 오른쪽 미리보기가 이미지·링크까지 그린다 */
export const Edit: Story = {
  render: () => <PopupFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(미리보기는 빈 상태로 함께 뜬다) */
export const Loading: Story = {
  render: () => <PopupFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출 — 각 필드 인라인 오류 + 저장 실패 배너 */
export const ValidationError: Story = {
  render: () => (
    <PopupFormScreen
      errors={DEMO_ERRORS}
      serverError="저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      seed={{ ...EMPTY_SEED, linkUrl: 'example.com/event', priority: '-1' }}
    />
  ),
};
