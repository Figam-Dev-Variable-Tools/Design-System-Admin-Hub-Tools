/**
 * Design System/Templates/Content/Terms Form — 약관 버전 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/terms` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Terms"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 — 폼은 그 화면의 등록/수정 라우트다).
 *
 * 대응 실화면: apps/admin/src/pages/content/terms/TermsFormPage.tsx + components/VersionForm.tsx
 * (라우트 /content/terms/new?type= · /content/terms/:id/edit). 등록은 **쿼리스트링으로 약관 종류를
 * 받고**, 수정은 :id 로 기존 버전을 불러온다 — 그래서 이 폼에는 다른 폼에 없는 상태가 하나 더 있다:
 * 종류 없이 들어오면(직접 URL 진입) 입력 대신 경고를 띄우고 목록으로 돌려보낸다.
 * 미리보기가 없다 — 약관은 서식 없는 조문 텍스트라 입력한 것이 곧 보이는 것이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)      → Card + 토큰만 쓴 <h2>(title.md) + aria-labelledby
 *   controlStyle(앱)   → 토큰만 쓴 인라인 컨트롤 스타일
 *   목록으로 버튼(라우팅) → Button(secondary) + Icon(chevron-left)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                → Button(secondary) + Icon(chevron-left)
 *   약관 종류(등록 시 고정)  → 토큰만 쓴 요약 텍스트(쿼리스트링에서 온 값 — 폼에서 바꾸지 않는다)
 *   버전 표기(최대 20자)     → FormField + input[type=text]
 *   시행일                  → FormField + input[type=date]
 *   상태                    → FormField + SelectField (시행중 · 시행예정 · 만료)
 *   본문(최대 20,000자)      → TextareaField (rows=12 · 글자 수 카운터)
 *   저장 실패 인라인 배너     → Alert(danger)
 *   종류 없이 진입           → Alert(warning) + 목록으로 Button
 *   상세 조회 스켈레톤        → Card + Skeleton ×4
 *   저장/취소               → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  Skeleton,
  TextareaField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Terms Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/terms/types.ts · validation.ts 미러) ─────────────────────────── */

const VERSION_MAX_LENGTH = 20;
const BODY_MAX_LENGTH = 20000;

type TermsStatus = 'active' | 'scheduled' | 'archived';

const STATUS_OPTIONS: readonly { readonly id: TermsStatus; readonly label: string }[] = [
  { id: 'active', label: '시행중' },
  { id: 'scheduled', label: '시행예정' },
  { id: 'archived', label: '만료' },
];

/* ── 데모 데이터(실화면 TermsVersionFormValues 미러 — 등록은 빈 값, 수정은 픽스처 service-v1.1) ── */

interface SeedValues {
  readonly typeLabel: string;
  readonly version: string;
  readonly effectiveDate: string;
  readonly status: TermsStatus;
  readonly body: string;
}

const EDIT_BODY = [
  '이용약관 v1.1',
  '',
  '제1조(목적) 이 약관은 회사가 제공하는 서비스의 이용 조건 및 절차, 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.',
  '',
  '제2조(용어의 정의) 이 약관에서 사용하는 용어의 정의는 다음과 같습니다.',
  '  1. "회원"이란 이 약관에 동의하고 서비스 이용계약을 체결한 자를 말합니다.',
  '  2. "계정"이란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인한 문자와 숫자의 조합을 말합니다.',
].join('\n');

const EMPTY_SEED: SeedValues = {
  typeLabel: '이용약관',
  version: '',
  effectiveDate: '',
  status: 'scheduled',
  body: '',
};

const EDIT_SEED: SeedValues = {
  typeLabel: '이용약관',
  version: 'v1.1',
  effectiveDate: '2025-01-01',
  status: 'active',
  body: EDIT_BODY,
};

/** 검증 오류 데모 — 실화면 termsVersionSchema(zod/mini) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly version?: string;
  readonly effectiveDate?: string;
  readonly body?: string;
}

const DEMO_ERRORS: FieldErrors = {
  version: '버전을 입력하세요. (예: v1.2)',
  effectiveDate: '시행일을 YYYY-MM-DD 형식으로 입력하세요.',
  body: '본문을 입력하세요.',
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

const backRowStyle: CSSProperties = {
  display: 'flex',
  alignSelf: 'flex-start',
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

const typeSummaryStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

const alertBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface TermsFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — 실화면 loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** `?type=` 없이 등록 화면에 들어온 경우 — 입력 대신 경고를 띄운다 */
  readonly missingType?: boolean;
  /** 저장 실패 인라인 배너 — 실화면 serverError 미러 */
  readonly serverError?: string;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function TermsFormScreen({
  isEdit = false,
  loadingDetail = false,
  missingType = false,
  serverError = '',
  errors = {},
  seed = EMPTY_SEED,
}: TermsFormScreenProps) {
  const [version, setVersion] = useState(seed.version);
  const [effectiveDate, setEffectiveDate] = useState(seed.effectiveDate);
  const [status, setStatus] = useState<TermsStatus>(seed.status);
  const [body, setBody] = useState(seed.body);
  const titleId = useId();

  if (missingType) {
    return (
      <div style={pageStyle}>
        <Alert tone="warning">
          <div style={alertBodyStyle}>
            <span>약관 종류가 필요해요. 목록에서 종류를 고르고 다시 등록하세요.</span>
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={backRowStyle}>
        <Button variant="secondary" size="md" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </div>

      {loadingDetail ? (
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <section aria-labelledby={titleId}>
          <Card>
            <div style={cardBodyStyle}>
              <h2 id={titleId} style={cardTitleStyle}>
                {isEdit ? '약관 버전 수정' : '새 약관 버전 등록'}
              </h2>

              <p style={typeSummaryStyle}>{`약관 종류 · ${seed.typeLabel}`}</p>

              {serverError !== '' && <Alert tone="danger">{serverError}</Alert>}

              <form onSubmit={(event) => event.preventDefault()} noValidate style={cardBodyStyle}>
                <div style={formRowStyle}>
                  <FormField
                    htmlFor="terms-version"
                    label="버전"
                    required
                    {...(errors.version !== undefined && { error: errors.version })}
                  >
                    <input
                      id="terms-version"
                      type="text"
                      maxLength={VERSION_MAX_LENGTH}
                      placeholder="예: v1.2"
                      style={controlStyle(errors.version !== undefined)}
                      value={version}
                      aria-invalid={errors.version !== undefined}
                      onChange={(event) => setVersion(event.target.value)}
                    />
                  </FormField>

                  <FormField
                    htmlFor="terms-effective"
                    label="시행일"
                    required
                    {...(errors.effectiveDate !== undefined && { error: errors.effectiveDate })}
                  >
                    <input
                      id="terms-effective"
                      type="date"
                      style={controlStyle(errors.effectiveDate !== undefined)}
                      value={effectiveDate}
                      aria-invalid={errors.effectiveDate !== undefined}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                    />
                  </FormField>

                  <FormField htmlFor="terms-status" label="상태" required>
                    <SelectField
                      id="terms-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as TermsStatus)}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </div>

                <TextareaField
                  label="본문"
                  required
                  value={body}
                  onChange={setBody}
                  maxLength={BODY_MAX_LENGTH}
                  rows={12}
                  placeholder="약관 조문을 입력하세요."
                  error={errors.body ?? ''}
                />

                <div style={actionsStyle}>
                  <Button type="button" variant="secondary">
                    취소
                  </Button>
                  <Button type="submit" variant="primary">
                    {isEdit ? '저장' : '등록'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

/** 정상(등록): 빈 폼 — 종류는 목록에서 고른 값(`?type=service`)이 그대로 요약으로 붙는다 */
export const Default: Story = {
  render: () => <TermsFormScreen />,
};

/** 수정: 기존 버전(service-v1.1) 값이 채워진 폼 — 본문 조문이 그대로 들어온다 */
export const Edit: Story = {
  render: () => <TermsFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(useTermsVersionQuery 대기) */
export const Loading: Story = {
  render: () => <TermsFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출 — 각 필드 인라인 오류 + 저장 실패 배너 */
export const ValidationError: Story = {
  render: () => (
    <TermsFormScreen
      errors={DEMO_ERRORS}
      serverError="저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      seed={{ ...EMPTY_SEED, effectiveDate: '' }}
    />
  ),
};

/** 종류 없음: `?type=` 없이 등록 화면에 직접 들어온 경우 — 경고와 함께 목록으로 돌려보낸다 */
export const MissingType: Story = {
  render: () => <TermsFormScreen missingType />,
};
