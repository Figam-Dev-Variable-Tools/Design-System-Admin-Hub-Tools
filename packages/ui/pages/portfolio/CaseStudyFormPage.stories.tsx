/**
 * Design System/Templates/Portfolio/Case Study Form — 성공 사례 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/portfolio/case-studies` → 메뉴 en = "Portfolio"(포트폴리오 관리),
 * 화면 en = "Case Studies" (packages/ui/pages/_data/pages.ts 의 Business 섹션 Portfolio 그룹).
 *
 * 대응 실화면: apps/admin/src/pages/portfolio/case-studies/CaseStudyFormPage.tsx
 * (라우트 /portfolio/case-studies/new · /:id/edit). 실화면은 승격된 CRUD 프레임워크
 * (useCrudForm + FormPageShell) 위에 한 장의 카드('성공 사례 정보')를 얹는다.
 *
 * [왜 여러 줄 입력이 셋인가] 성공 사례는 **과제 → 해결 → 성과**의 서사가 본문이다. 하나의 긴
 * 본문으로 받으면 세 토막이 뒤섞이고, 목록의 '성과' 열이 무엇을 잘라 보여줄지도 정해지지 않는다.
 * 그래서 세 칸으로 나눠 받고, 그중 '성과'만 목록에 요약으로 올라간다. 하단부(대표 이미지 · 본문
 * 이미지 · 노출 토글)는 형제 화면(포트폴리오 폼)과 **같은 묶음**(_shared/PortfolioMediaFields)이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면 껍데기(FormPageShell)와 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(FormPageShell)          → Icon(chevron-left) + 토큰만 쓴 링크
 *   페이지 제목(pageTitleStyle)       → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목             → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   상세 조회 스켈레톤                → Skeleton ×4
 *   업종(고정 enum)                  → FormField + SelectField
 *   일자                             → FormField + 토큰만 쓴 <input type="date">
 *   제목 · 고객사                     → TextField (자체 라벨·필수·오류·maxLength)
 *   과제 · 해결 · 성과                → TextareaField ×3 (카운터·오류·rows=4)
 *   대표 이미지                       → ImageUploadField
 *   본문 이미지(다중)                 → ImageGalleryField (maxFiles=10)
 *   노출 여부(PortfolioMediaFields)   → ToggleSwitch
 *   저장/취소                        → Button(primary/secondary)
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
  title: 'Design System/Templates/Portfolio/Case Study Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 case-studies/types.ts 미러) ────────────────────────────────────────── */

const CASE_TITLE_MAX = 120;
const CASE_CLIENT_MAX = 60;
const CASE_TEXT_MAX = 500;
const MAX_CASE_IMAGES = 10;

type CaseIndustry = 'manufacturing' | 'retail' | 'finance' | 'public' | 'healthcare' | 'it';

const INDUSTRY_OPTIONS: readonly { readonly id: CaseIndustry; readonly label: string }[] = [
  { id: 'manufacturing', label: '제조' },
  { id: 'retail', label: '유통' },
  { id: 'finance', label: '금융' },
  { id: 'public', label: '공공' },
  { id: 'healthcare', label: '의료' },
  { id: 'it', label: 'IT·서비스' },
];

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="${hue}"/><text x="80" y="66" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_COVER = svgDataUri('대표 이미지', 'steelblue');
const EDIT_GALLERY: readonly string[] = [svgDataUri('검사 라인', 'seagreen')];

/* ── 데모 데이터(실화면 data-source 시드 cs-1 을 폼 값으로 되돌린 형태) ────────────────────────── */

interface SeedValues {
  readonly industry: CaseIndustry;
  readonly date: string;
  readonly title: string;
  readonly client: string;
  readonly challenge: string;
  readonly solution: string;
  readonly result: string;
  readonly coverImageUrl: string;
  readonly imageUrls: readonly string[];
  readonly published: boolean;
}

const EMPTY_SEED: SeedValues = {
  industry: 'manufacturing',
  date: '',
  title: '',
  client: '',
  challenge: '',
  solution: '',
  result: '',
  coverImageUrl: '',
  imageUrls: [],
  published: true,
};

const EDIT_SEED: SeedValues = {
  industry: 'manufacturing',
  date: '2024-04-30',
  title: '스마트팩토리 전환으로 불량률 절반 감축',
  client: '다온정밀',
  challenge: '수작업 검사로 불량 유출이 잦고 라인 정지가 반복됐어요.',
  solution: '비전 검사와 실시간 대시보드를 도입해 공정을 표준화했어요.',
  result: '6개월 만에 불량률을 52% 낮추고 라인 가동률을 18%p 끌어올렸어요.',
  coverImageUrl: EDIT_COVER,
  imageUrls: EDIT_GALLERY,
  published: true,
};

/** 검증 오류 데모 — 실화면 caseStudySchema(zod)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly industry?: string;
  readonly date?: string;
  readonly title?: string;
  readonly client?: string;
  readonly challenge?: string;
  readonly solution?: string;
  readonly result?: string;
  readonly coverImageUrl?: string;
  readonly imageUrls?: string;
}

const DEMO_ERRORS: FieldErrors = {
  date: '일자를 입력하세요.',
  title: '제목을 입력하세요.',
  client: '고객사를 입력하세요.',
  challenge: '과제를 입력하세요.',
  solution: '해결을 입력하세요.',
  result: '성과를 입력하세요.',
  coverImageUrl: '대표 이미지를 등록하세요.',
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

interface CaseStudyFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function CaseStudyFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: CaseStudyFormScreenProps) {
  const [industry, setIndustry] = useState<CaseIndustry>(seed.industry);
  const [date, setDate] = useState(seed.date);
  const [title, setTitle] = useState(seed.title);
  const [client, setClient] = useState(seed.client);
  const [challenge, setChallenge] = useState(seed.challenge);
  const [solution, setSolution] = useState(seed.solution);
  const [result, setResult] = useState(seed.result);
  const [coverImageUrl, setCoverImageUrl] = useState(seed.coverImageUrl);
  const [imageUrls, setImageUrls] = useState<readonly string[]>(seed.imageUrls);
  const [published, setPublished] = useState(seed.published);

  return (
    <div style={pageStyle}>
      <a href="#case-study-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '성공 사례 수정' : '성공 사례 등록'}</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수예요. 업종·과제·해결·성과를 입력하세요.</p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <FormCard title="성공 사례 정보">
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
                  htmlFor="case-industry"
                  label="업종"
                  required
                  {...(errors.industry !== undefined && { error: errors.industry })}
                >
                  <SelectField
                    id="case-industry"
                    value={industry}
                    isInvalid={errors.industry !== undefined}
                    onChange={(event) => setIndustry(event.target.value as CaseIndustry)}
                  >
                    {INDUSTRY_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <FormField
                  htmlFor="case-date"
                  label="일자"
                  required
                  {...(errors.date !== undefined && { error: errors.date })}
                >
                  <input
                    id="case-date"
                    type="date"
                    style={dateControlStyle(errors.date !== undefined)}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </FormField>
              </div>

              <TextField
                id="case-title"
                label="제목"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={CASE_TITLE_MAX}
                placeholder="예: 스마트팩토리 전환으로 불량률 절반 감축"
                error={errors.title ?? ''}
              />

              <TextField
                id="case-client"
                label="고객사"
                required
                value={client}
                onChange={(event) => setClient(event.target.value)}
                maxLength={CASE_CLIENT_MAX}
                placeholder="예: 다온정밀"
                error={errors.client ?? ''}
              />

              <TextareaField
                label="과제"
                required
                value={challenge}
                onChange={setChallenge}
                maxLength={CASE_TEXT_MAX}
                placeholder="고객이 마주한 문제를 입력하세요."
                rows={4}
                error={errors.challenge ?? ''}
              />

              <TextareaField
                label="해결"
                required
                value={solution}
                onChange={setSolution}
                maxLength={CASE_TEXT_MAX}
                placeholder="어떻게 해결했는지 입력하세요."
                rows={4}
                error={errors.solution ?? ''}
              />

              <TextareaField
                label="성과"
                required
                value={result}
                onChange={setResult}
                maxLength={CASE_TEXT_MAX}
                placeholder="정량·정성 성과를 입력하세요."
                rows={4}
                error={errors.result ?? ''}
              />

              <ImageUploadField
                label="대표 이미지"
                required
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                hint="목록에는 노출되지 않아요 — 상세/미리보기의 대표 이미지예요."
                error={errors.coverImageUrl ?? ''}
              />

              <ImageGalleryField
                label="본문 이미지"
                values={imageUrls}
                onChange={setImageUrls}
                maxFiles={MAX_CASE_IMAGES}
                hint={`사례를 보여줄 이미지를 여러 장 올릴 수 있어요. 최대 ${String(MAX_CASE_IMAGES)}장.`}
                error={errors.imageUrls ?? ''}
              />

              <div style={toggleFieldStyle}>
                <span style={fieldLabelStyle}>노출 여부</span>
                <ToggleSwitch
                  checked={published}
                  onChange={setPublished}
                  label="성공 사례 노출 여부"
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

/** 정상(등록): 빈 폼 — 신규 성공 사례 입력(업종 기본값 '제조' · 노출 기본 ON) */
export const Default: Story = {
  render: () => <CaseStudyFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(과제·해결·성과 3단 서사 + 대표/본문 이미지 미리보기) */
export const Edit: Story = {
  render: () => <CaseStudyFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(FormPageShell loadingDetail 미러) */
export const Loading: Story = {
  render: () => <CaseStudyFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <CaseStudyFormScreen errors={DEMO_ERRORS} />,
};
