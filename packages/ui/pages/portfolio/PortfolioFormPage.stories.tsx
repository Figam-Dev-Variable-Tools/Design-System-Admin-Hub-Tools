/**
 * Design System/Templates/Portfolio/Portfolio Form — 포트폴리오 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Portfolio"(포트폴리오 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Portfolio 그룹에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/portfolio/items/PortfolioFormPage.tsx
 * (라우트 /portfolio/items/new · /:id/edit). 실화면은 승격된 CRUD 프레임워크(useCrudForm + FormPageShell)
 * 위에 분류·일자·제목·고객사·소개와 대표/본문 이미지·노출 토글을 얹는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기(FormPageShell)와 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(FormPageShell)   → Button(ghost) + Icon(chevron-left)
 *   페이지 제목(pageTitleStyle) → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목       → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   분류/일자 필드              → FormField + SelectField / 토큰만 쓴 <input type="date">
 *   제목/고객사                 → TextField (자체 라벨·필수·오류)
 *   소개                        → TextareaField (카운터·오류)
 *   대표 이미지                 → ImageUploadField
 *   본문 이미지(다중)           → ImageGalleryField
 *   노출 여부(PortfolioMediaFields) → ToggleSwitch
 *   저장/취소                   → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * 이미지 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  FormField,
  Icon,
  ImageGalleryField,
  ImageUploadField,
  SelectField,
  Skeleton,
  TextField,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Portfolio/Portfolio Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 _shared/store 미러) ────────────────────────────────────────────── */

const TITLE_MAX = 120;
const CLIENT_MAX = 60;
const SUMMARY_MAX = 500;
const MAX_IMAGES = 10;

interface Category {
  readonly id: string;
  readonly label: string;
}

const CATEGORIES: readonly Category[] = [
  { id: 'residential', label: '주거 공간' },
  { id: 'office', label: '오피스' },
  { id: 'commercial', label: '상업 공간' },
  { id: 'exhibition', label: '전시·문화' },
];

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="${hue}"/><text x="80" y="64" font-family="sans-serif" font-size="14" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_COVER = svgDataUri('대표 이미지', 'steelblue');
const EDIT_GALLERY: readonly string[] = [
  svgDataUri('현관 · 거실', 'seagreen'),
  svgDataUri('주방', 'peru'),
  svgDataUri('침실', 'mediumpurple'),
];

interface SeedValues {
  readonly title: string;
  readonly categoryId: string;
  readonly client: string;
  readonly summary: string;
  readonly date: string;
  readonly coverImageUrl: string;
  readonly imageUrls: readonly string[];
  readonly published: boolean;
}

const EMPTY_SEED: SeedValues = {
  title: '',
  categoryId: '',
  client: '',
  summary: '',
  date: '',
  coverImageUrl: '',
  imageUrls: [],
  published: true,
};

const EDIT_SEED: SeedValues = {
  title: '한빛 리버뷰 펜트하우스 리모델링',
  categoryId: 'residential',
  client: '한빛개발',
  summary: '한강 조망 펜트하우스의 생활 동선을 재구성하고 자연광을 끌어들였습니다.',
  date: '2024-05-20',
  coverImageUrl: EDIT_COVER,
  imageUrls: EDIT_GALLERY,
  published: true,
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly categoryId?: string;
  readonly date?: string;
  readonly title?: string;
  readonly client?: string;
  readonly summary?: string;
  readonly coverImageUrl?: string;
}

const DEMO_ERRORS: FieldErrors = {
  categoryId: '분류를 선택하세요.',
  date: '일자를 입력하세요.',
  title: '제목을 입력하세요.',
  client: '고객사를 입력하세요.',
  summary: '소개를 입력하세요.',
  coverImageUrl: '대표 이미지를 등록하세요.',
};

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

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

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 5), 1fr))`,
  gap: cssVar('space.4'),
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

const toggleFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
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

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ── */

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

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface PortfolioFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — FormPageShell loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function PortfolioFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: PortfolioFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [categoryId, setCategoryId] = useState(seed.categoryId);
  const [client, setClient] = useState(seed.client);
  const [summary, setSummary] = useState(seed.summary);
  const [date, setDate] = useState(seed.date);
  const [coverImageUrl, setCoverImageUrl] = useState(seed.coverImageUrl);
  const [imageUrls, setImageUrls] = useState<readonly string[]>(seed.imageUrls);
  const [published, setPublished] = useState(seed.published);

  const dateId = 'portfolio-date';

  return (
    <div style={pageStyle}>
      <a href="#portfolio-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '포트폴리오 수정' : '포트폴리오 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 분류·대표 이미지와 소개를 입력하세요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <FormCard title="포트폴리오 정보">
          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <>
              <div style={rowStyle}>
                <FormField
                  htmlFor="portfolio-category"
                  label="분류"
                  required
                  {...(errors.categoryId !== undefined && { error: errors.categoryId })}
                >
                  <SelectField
                    id="portfolio-category"
                    value={categoryId}
                    isInvalid={errors.categoryId !== undefined}
                    onChange={(event) => setCategoryId(event.target.value)}
                  >
                    <option value="">분류 선택</option>
                    {CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <FormField
                  htmlFor={dateId}
                  label="일자"
                  required
                  {...(errors.date !== undefined && { error: errors.date })}
                >
                  <input
                    id={dateId}
                    type="date"
                    style={dateControlStyle(errors.date !== undefined)}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </FormField>
              </div>

              <TextField
                id="portfolio-title"
                label="제목"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 한빛 리버뷰 펜트하우스 리모델링"
                error={errors.title ?? ''}
              />

              <TextField
                id="portfolio-client"
                label="고객사"
                required
                value={client}
                onChange={(event) => setClient(event.target.value)}
                placeholder="예: 한빛개발"
                error={errors.client ?? ''}
              />

              <TextareaField
                label="소개"
                required
                value={summary}
                onChange={setSummary}
                maxLength={SUMMARY_MAX}
                placeholder="프로젝트 개요와 성과를 입력하세요."
                rows={6}
                error={errors.summary ?? ''}
              />

              <ImageUploadField
                label="대표 이미지"
                required
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                hint="목록에는 노출되지 않습니다 — 상세/미리보기의 대표 이미지입니다."
                error={errors.coverImageUrl ?? ''}
              />

              <ImageGalleryField
                label="본문 이미지"
                values={imageUrls}
                onChange={setImageUrls}
                maxFiles={MAX_IMAGES}
                hint={`프로젝트를 보여줄 이미지를 여러 장 올릴 수 있습니다. 최대 ${String(MAX_IMAGES)}장.`}
              />

              <div style={toggleFieldStyle}>
                <span style={fieldLabelStyle}>노출 여부</span>
                <ToggleSwitch
                  checked={published}
                  onChange={setPublished}
                  label="포트폴리오 노출 여부"
                  onLabel="게시"
                  offLabel="숨김"
                />
              </div>
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

/** 정상(등록): 빈 폼 — 신규 포트폴리오 입력 */
export const Default: Story = {
  render: () => <PortfolioFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(대표/본문 이미지 미리보기 포함) */
export const Edit: Story = {
  render: () => <PortfolioFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(FormPageShell loadingDetail 미러) */
export const Loading: Story = {
  render: () => <PortfolioFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <PortfolioFormScreen errors={DEMO_ERRORS} />,
};
