/**
 * Design System/Templates/Marketing/Promotion Form — 프로모션 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Marketing"(마케팅 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Marketing 그룹에서 `['/marketing/promotions', '프로모션', 'Promotions']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/marketing/promotions/PromotionFormPage.tsx
 * (라우트 /marketing/promotions/new · /:id/edit). 실화면은 공용 CRUD 프레임워크(useCrudForm +
 * FormPageShell) 위에 **입력 카드 한 장**('프로모션 정보')을 얹는다. 이벤트 폼과 같은 뼈대(이름·기간·
 * 상태·대상·연동 토글·설명)에 **할인 3칸**(유형·값·최소주문금액)이 한 줄로 더 붙는다. 검증의 정본은
 * ./validation(zod)이다 — 할인값은 원값 보존을 위해 문자열로 받고 스키마가 숫자·상한을 판정한다.
 *
 * [할인값 라벨이 유형을 따라 바뀐다] 정률이면 '할인율 (%)', 정액이면 '할인액 (원)' 이다. 한 필드가
 * 두 단위를 오가므로 라벨이 단위의 유일한 표지다 — 실화면과 같은 3분기 규칙을 그대로 미러한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기와 앱 조각을 DS 표면으로 갈음한다:
 *   목록으로(FormPageShell)     → Button(ghost) + Icon(chevron-left)
 *   페이지 제목/설명            → 토큰만 쓴 <h1>(title.xl) + <p>
 *   카드 표면 · 카드 제목        → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   서버 오류(FormServerError)   → Alert(danger)
 *   상세 조회 스켈레톤          → Skeleton ×N
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   프로모션명 / 대상            → TextField (자체 라벨·필수·오류·maxLength)
 *   프로모션 기간(시작~종료)      → DateRangeField (종료≥시작 오류는 스키마가 판정해 error 로 내려온다)
 *   상태(예정/진행/종료)         → FormField + SelectField
 *   할인 유형(정률/정액)         → FormField + SelectField
 *   할인값 / 최소 주문금액        → TextField(inputMode=numeric · 힌트 '0 이면 조건 없음')
 *   쿠폰 연동                   → ToggleSwitch (연동/미연동)
 *   연동 쿠폰코드(조건부 필수)    → TextField — 쿠폰 연동이 켜졌을 때만 그린다
 *   설명                       → TextareaField (글자수 카운터 포함)
 *   저장/취소                   → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  DateRangeField,
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  Skeleton,
  TextField,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Promotion Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수 · 선택지(실화면 promotions/types.ts · _shared/campaign.ts 미러) ─────────────── */

type CampaignPhase = 'upcoming' | 'ongoing' | 'ended';
type DiscountType = 'rate' | 'amount';

const PROMOTION_TITLE_MAX = 80;
const PROMOTION_TARGET_MAX = 60;
const PROMOTION_DESC_MAX = 1000;

const CAMPAIGN_PHASE_OPTIONS: readonly { readonly id: CampaignPhase; readonly label: string }[] = [
  { id: 'upcoming', label: '예정' },
  { id: 'ongoing', label: '진행' },
  { id: 'ended', label: '종료' },
];

const DISCOUNT_TYPE_OPTIONS: readonly { readonly id: DiscountType; readonly label: string }[] = [
  { id: 'rate', label: '정률(%)' },
  { id: 'amount', label: '정액(원)' },
];

/* ── 폼 값 · 데모 시드(실화면 PromotionFormValues 미러 — 할인값·최소주문금액은 문자열) ─────────── */

interface FormValues {
  readonly title: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly phase: CampaignPhase;
  readonly target: string;
  readonly discountType: DiscountType;
  readonly discountValue: string;
  readonly minOrderAmount: string;
  readonly couponLinked: boolean;
  readonly couponCode: string;
  readonly description: string;
}

const EMPTY_SEED: FormValues = {
  title: '',
  startAt: '',
  endAt: '',
  phase: 'upcoming',
  target: '',
  discountType: 'rate',
  discountValue: '10',
  minOrderAmount: '0',
  couponLinked: false,
  couponCode: '',
  description: '',
};

/** 수정 시드 — 실화면 data-source 픽스처 pr-1 을 폼 값으로 되돌린 형태 */
const EDIT_SEED: FormValues = {
  title: '전 상품 20% 할인',
  startAt: '2026-07-10',
  endAt: '2026-07-20',
  phase: 'ongoing',
  target: '전체 회원',
  discountType: 'rate',
  discountValue: '20',
  minOrderAmount: '30000',
  couponLinked: true,
  couponCode: 'SUMMER20',
  description: '3만원 이상 구매 시 전 상품 20% 할인.',
};

/** 검증 오류 데모 — 실화면 zod 스키마(validation.ts)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly period?: string;
  readonly target?: string;
  readonly discountValue?: string;
  readonly minOrderAmount?: string;
  readonly couponCode?: string;
  readonly description?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '프로모션명을 입력하세요.',
  period: '프로모션 기간을 YYYY-MM-DD 형식으로 입력하세요.',
  target: '대상을 입력하세요.',
  discountValue: '정률 할인은 100%를 넘을 수 없어요.',
  couponCode: '연동할 쿠폰코드를 입력하세요.',
};

/** 검증 오류 화면의 시드 — 정률 120%(상한 초과) + 쿠폰 연동 ON 인데 코드가 비어 있다 */
const INVALID_SEED: FormValues = {
  ...EMPTY_SEED,
  startAt: '2026-08-01',
  endAt: '2026-07-01',
  discountValue: '120',
  couponLinked: true,
};

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = { alignSelf: 'flex-start' };

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
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

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

/** FormField 슬롯에 직접 넣는 네이티브 컨트롤의 표면 — 실화면 shared/ui 의 controlStyle 미러 */
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

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ────── */

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

/* ── 제어형 화면(rules-of-hooks 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface PromotionFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: FormValues;
}

function PromotionFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: PromotionFormScreenProps) {
  const [values, setValues] = useState<FormValues>(seed);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const disabled = loadingDetail;
  const hasErrors = Object.keys(errors).length > 0;
  const isRate = values.discountType === 'rate';

  return (
    <div style={pageStyle}>
      <div style={backLinkStyle}>
        <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </div>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '프로모션 수정' : '프로모션 등록'}</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수예요. 기간·할인 조건을 확인하세요.</p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={formStyle}>
        {/* 서버 오류 배너 — 실화면 FormServerError 의 자리 */}
        {hasErrors && (
          <Alert tone="danger">
            입력한 내용을 다시 확인하세요. 표시된 항목을 수정해야 저장돼요.
          </Alert>
        )}

        <FormCard title="프로모션 정보">
          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <>
              <TextField
                id="promo-title"
                label="프로모션명"
                required
                value={values.title}
                onChange={(event) => set('title', event.target.value)}
                maxLength={PROMOTION_TITLE_MAX}
                placeholder="예: 전 상품 20% 할인"
                disabled={disabled}
                error={errors.title ?? ''}
              />

              <DateRangeField
                label="프로모션 기간"
                required
                startValue={values.startAt}
                endValue={values.endAt}
                onStartChange={(value) => set('startAt', value)}
                onEndChange={(value) => set('endAt', value)}
                disabled={disabled}
                error={errors.period ?? ''}
              />

              <div style={formRowStyle}>
                <FormField htmlFor="promo-phase" label="상태" required>
                  <SelectField
                    id="promo-phase"
                    value={values.phase}
                    disabled={disabled}
                    onChange={(event) => set('phase', event.target.value as CampaignPhase)}
                  >
                    {CAMPAIGN_PHASE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <TextField
                  id="promo-target"
                  label="대상"
                  required
                  value={values.target}
                  onChange={(event) => set('target', event.target.value)}
                  maxLength={PROMOTION_TARGET_MAX}
                  placeholder="예: 전체 회원 · 신규 가입 회원"
                  disabled={disabled}
                  error={errors.target ?? ''}
                />
              </div>

              <div style={formRowStyle}>
                <FormField htmlFor="promo-discount-type" label="할인 유형" required>
                  <SelectField
                    id="promo-discount-type"
                    value={values.discountType}
                    disabled={disabled}
                    onChange={(event) => set('discountType', event.target.value as DiscountType)}
                  >
                    {DISCOUNT_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <TextField
                  id="promo-discount-value"
                  label={isRate ? '할인율 (%)' : '할인액 (원)'}
                  required
                  inputMode="numeric"
                  value={values.discountValue}
                  onChange={(event) => set('discountValue', event.target.value)}
                  placeholder={isRate ? '예: 20' : '예: 5000'}
                  disabled={disabled}
                  error={errors.discountValue ?? ''}
                />
                <FormField
                  htmlFor="promo-min-order"
                  label="최소 주문금액 (원)"
                  hint="0 이면 조건 없음"
                  {...(errors.minOrderAmount !== undefined && { error: errors.minOrderAmount })}
                >
                  <input
                    id="promo-min-order"
                    type="text"
                    inputMode="numeric"
                    style={controlStyle(errors.minOrderAmount !== undefined)}
                    value={values.minOrderAmount}
                    onChange={(event) => set('minOrderAmount', event.target.value)}
                    placeholder="예: 30000"
                    disabled={disabled}
                  />
                </FormField>
              </div>

              <div style={fieldStyle}>
                <span style={fieldLabelStyle}>쿠폰 연동</span>
                <ToggleSwitch
                  checked={values.couponLinked}
                  onChange={(next) => set('couponLinked', next)}
                  disabled={disabled}
                  label="쿠폰 연동 여부"
                  onLabel="연동"
                  offLabel="미연동"
                />
              </div>

              {values.couponLinked && (
                <TextField
                  id="promo-coupon"
                  label="연동 쿠폰코드"
                  required
                  value={values.couponCode}
                  onChange={(event) => set('couponCode', event.target.value)}
                  placeholder="예: SUMMER20"
                  disabled={disabled}
                  error={errors.couponCode ?? ''}
                />
              )}

              <TextareaField
                label="설명"
                value={values.description}
                onChange={(value) => set('description', value)}
                maxLength={PROMOTION_DESC_MAX}
                disabled={disabled}
                placeholder="프로모션 조건·안내 문구를 입력하세요."
                rows={4}
                error={errors.description ?? ''}
              />
            </>
          )}
        </FormCard>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 정률 기본값 10%, 쿠폰 미연동이라 쿠폰코드 칸이 접혀 있다 */
export const Default: Story = {
  render: () => <PromotionFormScreen />,
};

/** 수정: 기존 값이 채워진 폼 — 쿠폰 연동이 켜져 연동 쿠폰코드가 펼쳐진 상태 */
export const Edit: Story = {
  render: () => <PromotionFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <PromotionFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 누락 + 기간 역전 + 정률 상한 초과 + 쿠폰코드 누락 → 배너 + 인라인 오류 */
export const ValidationError: Story = {
  render: () => <PromotionFormScreen errors={DEMO_ERRORS} seed={INVALID_SEED} />,
};
