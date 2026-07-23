/**
 * Design System/Templates/Content/Privacy Form — 처리방침 버전 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/privacy` → 메뉴 en = "Content"(콘텐츠 관리),
 * 화면 en = "Privacy Policy" (packages/ui/pages/_data/pages.ts 의 Content 그룹 — 폼은 등록/수정 라우트).
 *
 * 대응 실화면: apps/admin/src/pages/content/privacy/PrivacyFormPage.tsx + components/VersionForm.tsx
 * (라우트 /content/privacy/new · /content/privacy/:id/edit). 약관 폼과 같은 구조이되 **단일 문서**라
 * 종류가 없다 — 그래서 약관 폼에 있는 '종류 없이 진입' 경고 상태가 이 화면에는 존재하지 않고,
 * 등록 화면은 언제나 바로 입력으로 들어간다. 미리보기가 없다 — 서식 없는 본문이라 입력한 것이 곧
 * 보이는 것이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)      → Card + 토큰만 쓴 <h2>(title.md) + aria-labelledby
 *   controlStyle(앱)   → 토큰만 쓴 인라인 컨트롤 스타일
 *   목록으로 버튼(라우팅) → Button(secondary) + Icon(chevron-left)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                → Button(secondary) + Icon(chevron-left)
 *   버전 표기(최대 20자)     → FormField + input[type=text]
 *   시행일                  → FormField + input[type=date]
 *   상태                    → FormField + SelectField (시행중 · 시행예정 · 만료)
 *   본문(최대 20,000자)      → TextareaField (rows=12 · 글자 수 카운터)
 *   저장 실패 인라인 배너     → Alert(danger)
 *   상세 조회 스켈레톤        → Card + Skeleton ×4
 *   조회 실패                → Alert(danger) + 목록으로 Button
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
  title: 'Design System/Templates/Content/Privacy Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/privacy/types.ts · validation.ts 미러) ───────────────────────── */

const VERSION_MAX_LENGTH = 20;
const BODY_MAX_LENGTH = 20000;

type PrivacyStatus = 'active' | 'scheduled' | 'archived';

const STATUS_OPTIONS: readonly { readonly id: PrivacyStatus; readonly label: string }[] = [
  { id: 'active', label: '시행중' },
  { id: 'scheduled', label: '시행예정' },
  { id: 'archived', label: '만료' },
];

/* ── 데모 데이터(실화면 PrivacyVersionFormValues 미러 — 수정은 픽스처 privacy-v2.1) ──────────── */

interface SeedValues {
  readonly version: string;
  readonly effectiveDate: string;
  readonly status: PrivacyStatus;
  readonly body: string;
}

const EDIT_BODY = [
  '개인정보 처리방침 v2.1',
  '',
  '1. 개인정보의 처리 목적: 회사는 회원 가입 및 관리, 서비스 제공, 고충처리 등의 목적으로 개인정보를 처리합니다.',
  '',
  '2. 개인정보의 처리 및 보유 기간: 법령에 따른 보유·이용 기간 내에서 처리하며, 목적이 달성되면 지체 없이 파기합니다.',
  '',
  '3. 개인정보의 제3자 제공: 정보주체의 동의가 있거나 법률에 특별한 규정이 있는 경우에만 제공합니다.',
].join('\n');

const EMPTY_SEED: SeedValues = {
  version: '',
  effectiveDate: '',
  status: 'scheduled',
  body: '',
};

const EDIT_SEED: SeedValues = {
  version: 'v2.1',
  effectiveDate: '2027-01-01',
  status: 'scheduled',
  body: EDIT_BODY,
};

/** 검증 오류 데모 — 실화면 privacyVersionSchema(zod/mini) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly version?: string;
  readonly effectiveDate?: string;
  readonly body?: string;
}

const DEMO_ERRORS: FieldErrors = {
  version: '버전을 입력하세요. (예: v2.1)',
  effectiveDate: '시행일을 입력하세요.',
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

interface PrivacyFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — 실화면 loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 수정 대상 조회 실패 — 입력 대신 배너를 띄운다 */
  readonly loadFailed?: boolean;
  /** 저장 실패 인라인 배너 — 실화면 serverError 미러 */
  readonly serverError?: string;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function PrivacyFormScreen({
  isEdit = false,
  loadingDetail = false,
  loadFailed = false,
  serverError = '',
  errors = {},
  seed = EMPTY_SEED,
}: PrivacyFormScreenProps) {
  const [version, setVersion] = useState(seed.version);
  const [effectiveDate, setEffectiveDate] = useState(seed.effectiveDate);
  const [status, setStatus] = useState<PrivacyStatus>(seed.status);
  const [body, setBody] = useState(seed.body);
  const titleId = useId();

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertBodyStyle}>
            <span>처리방침 버전을 불러오지 못했어요.</span>
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
                {isEdit ? '처리방침 버전 수정' : '새 처리방침 버전 등록'}
              </h2>

              {serverError !== '' && <Alert tone="danger">{serverError}</Alert>}

              <form onSubmit={(event) => event.preventDefault()} noValidate style={cardBodyStyle}>
                <div style={formRowStyle}>
                  <FormField
                    htmlFor="privacy-version"
                    label="버전"
                    required
                    {...(errors.version !== undefined && { error: errors.version })}
                  >
                    <input
                      id="privacy-version"
                      type="text"
                      maxLength={VERSION_MAX_LENGTH}
                      placeholder="예: v2.1"
                      style={controlStyle(errors.version !== undefined)}
                      value={version}
                      aria-invalid={errors.version !== undefined}
                      onChange={(event) => setVersion(event.target.value)}
                    />
                  </FormField>

                  <FormField
                    htmlFor="privacy-effective"
                    label="시행일"
                    required
                    {...(errors.effectiveDate !== undefined && { error: errors.effectiveDate })}
                  >
                    <input
                      id="privacy-effective"
                      type="date"
                      style={controlStyle(errors.effectiveDate !== undefined)}
                      value={effectiveDate}
                      aria-invalid={errors.effectiveDate !== undefined}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                    />
                  </FormField>

                  <FormField htmlFor="privacy-status" label="상태" required>
                    <SelectField
                      id="privacy-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as PrivacyStatus)}
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
                  placeholder="개인정보 처리방침 본문을 입력하세요."
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

/** 정상(등록): 빈 폼 — 단일 문서라 종류 선택 없이 바로 입력으로 들어간다 */
export const Default: Story = {
  render: () => <PrivacyFormScreen />,
};

/** 수정: 기존 버전(privacy-v2.1) 값이 채워진 폼 — 본문이 그대로 들어온다 */
export const Edit: Story = {
  render: () => <PrivacyFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(usePrivacyVersionQuery 대기) */
export const Loading: Story = {
  render: () => <PrivacyFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출 — 각 필드 인라인 오류 + 저장 실패 배너 */
export const ValidationError: Story = {
  render: () => (
    <PrivacyFormScreen
      errors={DEMO_ERRORS}
      serverError="저장하지 못했어요. 잠시 후 다시 시도해 주세요."
    />
  ),
};

/** 에러: 수정 대상 조회 실패 — 입력 대신 Alert(danger) + 목록으로 */
export const Error: Story = {
  render: () => <PrivacyFormScreen isEdit loadFailed />,
};
