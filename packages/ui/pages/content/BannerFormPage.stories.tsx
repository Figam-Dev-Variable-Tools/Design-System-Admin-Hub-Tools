/**
 * Design System/Templates/Content/Banner Form — 배너 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/banners` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Banners"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 — 폼은 그 화면의 등록/수정 라우트다).
 *
 * 대응 실화면: apps/admin/src/pages/content/banners/BannerFormPage.tsx
 * (라우트 /content/banners/new · /content/banners/:id/edit). 팝업 폼과 같은 2단 구조다: 왼쪽 입력 /
 * 오른쪽 실시간 미리보기. 팝업이 '떠 있는 카드' 로 보이는 것과 달리 배너는 **가로로 넓은 띠**라
 * 미리보기 무대의 비율이 다르고, 우선순위 대신 '정렬 순서', 노출 위치가 메인/서브다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)          → Card + 토큰만 쓴 <h2>(title.md) + aria-labelledby
 *   controlStyle(앱)       → 토큰만 쓴 인라인 컨트롤 스타일
 *   BannerPreview(앱)      → Card 안에 토큰 레이아웃 + Icon(image)
 *   useUnsavedChangesDialog → 템플릿에서는 재현하지 않는다(이탈 가드는 라우터의 일)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   제목(최대 100자)        → TextField (required · maxLength)
 *   이미지(필수)            → ImageUploadField
 *   링크 URL(선택)          → FormField + input[type=url]
 *   노출 위치               → FormField + SelectField (메인 · 서브)
 *   정렬 순서               → FormField + input[type=number] (작을수록 앞)
 *   노출 기간(시작~종료)     → DateRangeField
 *   노출 ON                → Checkbox
 *   저장 실패 인라인 배너    → Alert(danger)
 *   상세 조회 스켈레톤       → Skeleton ×n
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
  title: 'Design System/Templates/Content/Banner Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/banners/types.ts · validation.ts 미러) ───────────────────────── */

const TITLE_MAX_LENGTH = 100;

type BannerPlacement = 'main' | 'sub';

const PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  main: '메인',
  sub: '서브',
};

const PLACEMENT_OPTIONS: readonly { readonly id: BannerPlacement; readonly label: string }[] = [
  { id: 'main', label: '메인' },
  { id: 'sub', label: '서브' },
];

/* ── 데모 데이터(실화면 BannerFormValues 미러 — 등록은 빈 값, 수정은 픽스처 BN-003) ──────────── */

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160"><rect width="640" height="160" fill="${hue}"/><text x="320" y="88" font-family="sans-serif" font-size="22" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_IMAGE = svgDataUri('무료배송 이벤트', 'teal');

interface SeedValues {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly placement: BannerPlacement;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
  readonly order: string;
}

const EMPTY_SEED: SeedValues = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  placement: 'main',
  startAt: '',
  endAt: '',
  enabled: true,
  // 등록 화면은 '현재 최대 정렬 순서 + 1' 이 자동으로 채워진다(useNextBannerOrder 미러)
  order: '13',
};

const EDIT_SEED: SeedValues = {
  title: '무료배송 이벤트 (003)',
  imageUrl: EDIT_IMAGE,
  linkUrl: 'https://example.com/promo/003',
  placement: 'main',
  startAt: '2026-03-01',
  endAt: '2026-03-28',
  enabled: true,
  order: '3',
};

/** 검증 오류 데모 — 실화면 bannerSchema(zod/mini) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly imageUrl?: string;
  readonly linkUrl?: string;
  readonly order?: string;
  readonly period?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  imageUrl: '이미지를 등록하세요.',
  linkUrl: 'http(s):// 로 시작하는 URL 을 입력하세요.',
  order: '정렬 순서는 0 이상의 정수예요.',
  period: '종료일은 시작일보다 빠를 수 없어요.',
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

/* ── 미리보기 스타일(실화면 BannerPreview 미러 — 가로로 넓은 띠) ──────────────────────────── */

const stageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  minHeight: `calc(${cssVar('space.6')} * 8)`,
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

const previewStripStyle = (enabled: boolean): CSSProperties => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  width: '100%',
  overflow: 'hidden',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  opacity: enabled ? 1 : 0.55,
});

const previewImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxHeight: `calc(${cssVar('space.6')} * 5)`,
  objectFit: 'cover',
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
  minHeight: `calc(${cssVar('space.6')} * 4)`,
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
  ...typography('typography.caption.md'),
};

const previewCopyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  flexWrap: 'wrap',
};

const previewTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
  ...typography('typography.title.md'),
};

const linkTextStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
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

/* ── 실시간 미리보기(실화면 BannerPreview 미러) ───────────────────────────────────────────── */

function BannerPreview({
  title,
  imageUrl,
  linkUrl,
  placementLabel,
  enabled,
}: {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly placementLabel: string;
  readonly enabled: boolean;
}) {
  const trimmedImage = imageUrl.trim();
  const trimmedLink = linkUrl.trim();

  return (
    <div>
      <div style={stageStyle}>
        <div style={previewStripStyle(enabled)}>
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

          <div style={previewCopyStyle}>
            <h3 style={previewTitleStyle}>{title.trim() === '' ? '배너 제목' : title}</h3>
            {trimmedLink !== '' && <span style={linkTextStyle}>{trimmedLink}</span>}
          </div>
        </div>
      </div>

      <p style={previewCaptionStyle}>
        <span>{`${placementLabel} 영역에 노출`}</span>
        <span aria-hidden="true">·</span>
        <span>{enabled ? '노출 ON' : '노출 OFF (저장해도 사용자에게 보이지 않아요)'}</span>
      </p>
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ──────────────────────────── */

interface BannerFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — 실화면 loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 저장 실패 인라인 배너 — 실화면 serverError 미러 */
  readonly serverError?: string;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function BannerFormScreen({
  isEdit = false,
  loadingDetail = false,
  serverError = '',
  errors = {},
  seed = EMPTY_SEED,
}: BannerFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [imageUrl, setImageUrl] = useState(seed.imageUrl);
  const [linkUrl, setLinkUrl] = useState(seed.linkUrl);
  const [placement, setPlacement] = useState<BannerPlacement>(seed.placement);
  const [startAt, setStartAt] = useState(seed.startAt);
  const [endAt, setEndAt] = useState(seed.endAt);
  const [enabled, setEnabled] = useState(seed.enabled);
  const [order, setOrder] = useState(seed.order);

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '배너 수정' : '배너 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 오른쪽 미리보기로 사용자에게 보일 모습을 확인하세요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={pageStyle}>
        <div style={layoutStyle}>
          <FormCard title="배너 정보">
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
                  id="banner-title"
                  label="제목"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={TITLE_MAX_LENGTH}
                  placeholder="예: 봄 시즌 기획전"
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
                  htmlFor="banner-link"
                  label="링크 URL"
                  hint="클릭 시 이동할 주소 (선택)"
                  {...(errors.linkUrl !== undefined && { error: errors.linkUrl })}
                >
                  <input
                    id="banner-link"
                    type="url"
                    style={controlStyle(errors.linkUrl !== undefined)}
                    placeholder="https://example.com/promo"
                    value={linkUrl}
                    aria-invalid={errors.linkUrl !== undefined}
                    onChange={(event) => setLinkUrl(event.target.value)}
                  />
                </FormField>

                <div style={formRowStyle}>
                  <FormField htmlFor="banner-placement" label="노출 위치" required>
                    <SelectField
                      id="banner-placement"
                      value={placement}
                      onChange={(event) => setPlacement(event.target.value as BannerPlacement)}
                    >
                      {PLACEMENT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>

                  <FormField
                    htmlFor="banner-order"
                    label="정렬 순서"
                    required
                    hint="작을수록 앞에 노출돼요."
                    {...(errors.order !== undefined && { error: errors.order })}
                  >
                    <input
                      id="banner-order"
                      type="number"
                      min={0}
                      style={controlStyle(errors.order !== undefined)}
                      value={order}
                      aria-invalid={errors.order !== undefined}
                      onChange={(event) => setOrder(event.target.value)}
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
                  id="banner-enabled"
                  label="노출 ON"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
              </>
            )}
          </FormCard>

          <FormCard title="미리보기">
            <BannerPreview
              title={title}
              imageUrl={imageUrl}
              linkUrl={linkUrl}
              placementLabel={PLACEMENT_LABEL[placement]}
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

/** 정상(등록): 빈 폼 — 정렬 순서는 '현재 최대 + 1' 로 미리 채워진다 */
export const Default: Story = {
  render: () => <BannerFormScreen />,
};

/** 수정: 기존 배너(BN-003) 값이 채워진 폼 — 오른쪽 미리보기가 띠 형태로 그려진다 */
export const Edit: Story = {
  render: () => <BannerFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(미리보기는 빈 상태로 함께 뜬다) */
export const Loading: Story = {
  render: () => <BannerFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출 — 각 필드 인라인 오류 + 저장 실패 배너 */
export const ValidationError: Story = {
  render: () => (
    <BannerFormScreen
      errors={DEMO_ERRORS}
      serverError="저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      seed={{
        ...EMPTY_SEED,
        linkUrl: 'example.com/promo',
        order: '-1',
        startAt: '2026-03-28',
        endAt: '2026-03-01',
      }}
    />
  ),
};
