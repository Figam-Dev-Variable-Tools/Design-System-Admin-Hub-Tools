/**
 * Design System/Templates/Company/ESG Form — ESG 활동 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/esg` → 메뉴 en = "Company"(기업 관리), 화면 en = "ESG"
 * (packages/ui/pages/_data/pages.ts 의 Company 그룹 인벤토리).
 *
 * 대응 실화면: apps/admin/src/pages/company/esg/EsgFormPage.tsx
 * (라우트 /company/esg/new · /company/esg/:id/edit). 실화면은 승격된 CRUD 프레임워크
 * (useCrudForm + FormPageShell) 위에 한 장의 카드('ESG 활동 정보')를 얹는다. 분류·일자가 한 행에
 * 나란히 서고(둘 다 짧은 값), 제목 한 줄, 여러 줄 내용, 마지막이 본문 이미지 갤러리다 —
 * 인증서/특허 폼과 달리 이미지가 **여러 장**이라 ImageUploadField 가 아니라 ImageGalleryField 다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면 껍데기(FormPageShell)와 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(FormPageShell)     → Icon(chevron-left) + 토큰만 쓴 링크
 *   페이지 제목(pageTitleStyle)  → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목        → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   상세 조회 스켈레톤           → Skeleton ×4
 *   분류(환경·사회·지배구조)      → FormField + SelectField
 *   일자                        → FormField + 토큰만 쓴 <input type="date">
 *   제목                        → TextField (자체 라벨·필수·오류·maxLength)
 *   내용                        → TextareaField (카운터·오류·rows=6)
 *   본문 이미지(다중)            → ImageGalleryField (maxFiles=10)
 *   저장/취소                   → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 * 이미지 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  FormField,
  formRowStyle,
  Icon,
  ImageGalleryField,
  SelectField,
  Skeleton,
  TextField,
  TextareaField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/ESG Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 esg/types.ts 미러) ───────────────────────────────────────────────── */

const TITLE_MAX_LENGTH = 120;
const SUMMARY_MAX_LENGTH = 1000;
const MAX_ESG_IMAGES = 10;

type EsgCategory = 'environment' | 'social' | 'governance';

const CATEGORY_OPTIONS: readonly { readonly id: EsgCategory; readonly label: string }[] = [
  { id: 'environment', label: '환경' },
  { id: 'social', label: '사회' },
  { id: 'governance', label: '지배구조' },
];

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="${hue}"/><text x="80" y="66" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_GALLERY: readonly string[] = [
  svgDataUri('태양광 패널', 'seagreen'),
  svgDataUri('사옥 전경', 'steelblue'),
];

/* ── 데모 데이터(실화면 data-source 시드 esg-1 을 폼 값으로 되돌린 형태) ───────────────────────── */

interface SeedValues {
  readonly category: EsgCategory;
  readonly title: string;
  readonly summary: string;
  readonly date: string;
  readonly imageUrls: readonly string[];
}

const EMPTY_SEED: SeedValues = {
  category: 'environment',
  title: '',
  summary: '',
  date: '',
  imageUrls: [],
};

const EDIT_SEED: SeedValues = {
  category: 'environment',
  title: '사옥 전력 재생에너지 전환',
  summary:
    '본사 사옥 전력의 60%를 재생에너지로 전환했습니다. 옥상 태양광 설비와 재생에너지 공급 계약을 함께 적용해 연간 온실가스 배출량을 크게 줄였습니다.',
  date: '2024-03-05',
  imageUrls: EDIT_GALLERY,
};

/** 검증 오류 데모 — 실화면 esgSchema(zod)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly category?: string;
  readonly title?: string;
  readonly summary?: string;
  readonly date?: string;
  readonly imageUrls?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  summary: '내용을 입력하세요.',
  date: '일자를 입력하세요.',
};

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.6'),
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

const controlBaseStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const dateControlStyle = (invalid: boolean): CSSProperties => ({
  ...controlBaseStyle,
  ...(invalid ? { borderColor: cssVar('color.feedback.danger.border') } : {}),
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

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

/* ── 제어형 화면(rules-of-hooks 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface EsgFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function EsgFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: EsgFormScreenProps) {
  const [category, setCategory] = useState<EsgCategory>(seed.category);
  const [date, setDate] = useState(seed.date);
  const [title, setTitle] = useState(seed.title);
  const [summary, setSummary] = useState(seed.summary);
  const [imageUrls, setImageUrls] = useState<readonly string[]>(seed.imageUrls);

  return (
    <div style={pageStyle}>
      <a href="#esg-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? 'ESG 활동 수정' : 'ESG 활동 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 분류(환경/사회/지배구조)와 활동 내용을 입력하세요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <FormCard title="ESG 활동 정보">
          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <>
              <div style={formRowStyle}>
                <FormField
                  htmlFor="esg-category"
                  label="분류"
                  required
                  {...(errors.category !== undefined && { error: errors.category })}
                >
                  <SelectField
                    id="esg-category"
                    value={category}
                    isInvalid={errors.category !== undefined}
                    onChange={(event) => setCategory(event.target.value as EsgCategory)}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <FormField
                  htmlFor="esg-date"
                  label="일자"
                  required
                  {...(errors.date !== undefined && { error: errors.date })}
                >
                  <input
                    id="esg-date"
                    type="date"
                    style={dateControlStyle(errors.date !== undefined)}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </FormField>
              </div>

              <TextField
                id="esg-title"
                label="제목"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="예: 사옥 전력 재생에너지 전환"
                error={errors.title ?? ''}
              />

              <TextareaField
                label="내용"
                required
                value={summary}
                onChange={setSummary}
                maxLength={SUMMARY_MAX_LENGTH}
                placeholder="활동 내용을 입력하세요."
                rows={6}
                error={errors.summary ?? ''}
              />

              <ImageGalleryField
                label="본문 이미지"
                values={imageUrls}
                onChange={setImageUrls}
                maxFiles={MAX_ESG_IMAGES}
                hint={`활동을 보여줄 이미지를 여러 장 올릴 수 있어요. 최대 ${String(MAX_ESG_IMAGES)}장.`}
                error={errors.imageUrls ?? ''}
              />
            </>
          )}

          <div style={actionsStyle}>
            <Button type="button" variant="secondary">
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              {isEdit ? '저장' : '등록'}
            </Button>
          </div>
        </FormCard>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 신규 ESG 활동 입력(분류 기본값 '환경') */
export const Default: Story = {
  render: () => <EsgFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(본문 이미지 2장 미리보기 포함) */
export const Edit: Story = {
  render: () => <EsgFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(FormPageShell loadingDetail 미러) */
export const Loading: Story = {
  render: () => <EsgFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <EsgFormScreen errors={DEMO_ERRORS} />,
};
