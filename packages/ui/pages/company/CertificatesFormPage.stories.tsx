/**
 * Design System/Templates/Company/Certificate Form — 인증서/특허 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/certificates` → 메뉴 en = "Company"(기업 관리),
 * 화면 en = "Certificates" (packages/ui/pages/_data/pages.ts 의 Company 그룹 인벤토리).
 *
 * 대응 실화면: apps/admin/src/pages/company/certificates/CertificatesFormPage.tsx
 * (라우트 /company/certificates/new · /company/certificates/:id/edit). 실화면은 승격된 CRUD
 * 프레임워크(useCrudForm + FormPageShell) 위에 한 장의 카드('인증서/특허 정보')만 얹는다 —
 * 필드가 다섯뿐이라 구획을 나누지 않는다. 명칭이 한 줄을 차지하고, 발급기관·발급일·구분이
 * 한 행에 3열로 접히며, 마지막이 증빙 이미지 업로드다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면 껍데기(FormPageShell)와 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(FormPageShell)     → Icon(chevron-left) + 토큰만 쓴 링크
 *   페이지 제목(pageTitleStyle)  → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목        → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   상세 조회 스켈레톤           → Skeleton ×4
 *   명칭 · 발급기관              → TextField (자체 라벨·필수·오류·maxLength)
 *   발급일                      → FormField + 토큰만 쓴 <input type="date">
 *   구분(인증서/특허)            → FormField + SelectField
 *   이미지                      → ImageUploadField (required · 드롭존 미리보기)
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
  Icon,
  ImageUploadField,
  SelectField,
  Skeleton,
  TextField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/Certificate Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 certificates/types.ts 미러) ─────────────────────────────────────────── */

const NAME_MAX_LENGTH = 100;
const ISSUER_MAX_LENGTH = 100;

type CertKind = 'certificate' | 'patent';

const KIND_OPTIONS: readonly { readonly id: CertKind; readonly label: string }[] = [
  { id: 'certificate', label: '인증서' },
  { id: 'patent', label: '특허' },
];

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="${hue}"/><text x="80" y="66" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_IMAGE = svgDataUri('인증서', 'steelblue');

/* ── 데모 데이터(실화면 data-source 시드 cert-1 을 폼 값으로 되돌린 형태) ──────────────────────── */

interface SeedValues {
  readonly name: string;
  readonly issuer: string;
  readonly issuedOn: string;
  readonly kind: CertKind;
  readonly imageUrl: string;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  issuer: '',
  issuedOn: '',
  kind: 'certificate',
  imageUrl: '',
};

const EDIT_SEED: SeedValues = {
  name: 'ISO 9001 품질경영시스템 인증',
  issuer: '예시인증원',
  issuedOn: '2023-04-12',
  kind: 'certificate',
  imageUrl: EDIT_IMAGE,
};

/** 검증 오류 데모 — 실화면 certSchema(zod)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly issuer?: string;
  readonly issuedOn?: string;
  readonly kind?: string;
  readonly imageUrl?: string;
}

const DEMO_ERRORS: FieldErrors = {
  name: '명칭을 입력하세요.',
  issuer: '발급기관을 입력하세요.',
  issuedOn: '발급일을 입력하세요.',
  imageUrl: '이미지를 등록하세요.',
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

interface CertificateFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function CertificateFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: CertificateFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [issuer, setIssuer] = useState(seed.issuer);
  const [issuedOn, setIssuedOn] = useState(seed.issuedOn);
  const [kind, setKind] = useState<CertKind>(seed.kind);
  const [imageUrl, setImageUrl] = useState(seed.imageUrl);

  return (
    <div style={pageStyle}>
      <a href="#certificate-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '인증서/특허 수정' : '인증서/특허 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 이미지 URL 로 인증서/특허 이미지를 등록해요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <FormCard title="인증서/특허 정보">
          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <>
              <TextField
                id="cert-name"
                label="명칭"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={NAME_MAX_LENGTH}
                placeholder="예: ISO 9001 품질경영시스템 인증"
                error={errors.name ?? ''}
              />

              <div style={rowStyle}>
                <TextField
                  id="cert-issuer"
                  label="발급기관"
                  required
                  value={issuer}
                  onChange={(event) => setIssuer(event.target.value)}
                  maxLength={ISSUER_MAX_LENGTH}
                  placeholder="예: 예시인증원"
                  error={errors.issuer ?? ''}
                />

                <FormField
                  htmlFor="cert-date"
                  label="발급일"
                  required
                  {...(errors.issuedOn !== undefined && { error: errors.issuedOn })}
                >
                  <input
                    id="cert-date"
                    type="date"
                    style={dateControlStyle(errors.issuedOn !== undefined)}
                    value={issuedOn}
                    onChange={(event) => setIssuedOn(event.target.value)}
                  />
                </FormField>

                <FormField
                  htmlFor="cert-kind"
                  label="구분"
                  required
                  {...(errors.kind !== undefined && { error: errors.kind })}
                >
                  <SelectField
                    id="cert-kind"
                    value={kind}
                    isInvalid={errors.kind !== undefined}
                    onChange={(event) => setKind(event.target.value as CertKind)}
                  >
                    {KIND_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <ImageUploadField
                label="이미지"
                required
                value={imageUrl}
                onChange={setImageUrl}
                hint="이미지를 끌어다 놓거나 클릭해 업로드해요."
                error={errors.imageUrl ?? ''}
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

/** 정상(등록): 빈 폼 — 신규 인증서/특허 입력 */
export const Default: Story = {
  render: () => <CertificateFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(증빙 이미지 미리보기 포함) */
export const Edit: Story = {
  render: () => <CertificateFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(FormPageShell loadingDetail 미러) */
export const Loading: Story = {
  render: () => <CertificateFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <CertificateFormScreen errors={DEMO_ERRORS} />,
};
