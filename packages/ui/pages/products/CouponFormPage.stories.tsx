/**
 * Design System/Templates/Products/Coupon Form — 쿠폰 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Products"(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Products 그룹, `/products/coupons` → 화면 en = "Coupons" 에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/coupons/CouponFormPage.tsx
 * (라우트 /products/coupons/new · /:id/edit). 승격된 CRUD 프레임워크(useCrudForm) 위에 입력 카드 +
 * 우측 실시간 쿠폰 카드 미리보기 2단을 얹는다. 검증의 정본은 zod 스키마(./validation)다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기·앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기                   → Button(ghost) + Icon(chevron-left)
 *   페이지 제목/설명           → 토큰만 쓴 <h1>(title.xl) + <p>
 *   카드 표면 · 카드 제목       → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   쿠폰명/코드/숫자 필드       → FormField + 토큰만 쓴 <input> (라벨·필수·힌트·오류는 FormField 소유)
 *   발급 대상/유형             → FormField + SelectField
 *   사용 기간                  → DateRangeField
 *   발급 상태                  → ToggleSwitch
 *   서버 오류 배너             → Alert(danger)
 *   실시간 쿠폰 카드 미리보기   → 토큰만 쓴 레이아웃(앱 전용 CouponCardPreview 미러)
 *   저장/취소                  → Button(primary/secondary)
 *   로드 실패(EXC-12)          → Alert(danger) + Button(secondary) (404 는 '다시 시도' 없이 '목록으로'만)
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
  Icon,
  SelectField,
  Skeleton,
  ToggleSwitch,
  cssVar,
  errorIdOf,
  hintIdOf,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Coupon Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 coupons/types + validation 미러) ────────────────────────────────── */

const COUPON_NAME_MAX = 60;
const COUPON_CODE_MAX = 30;

type CouponIssueType = 'amount' | 'percent' | 'free_shipping';
type CouponTarget = 'all' | 'member_grade' | 'category' | 'product';

const ISSUE_OPTIONS: readonly { readonly id: CouponIssueType; readonly label: string }[] = [
  { id: 'amount', label: '정액 할인(원)' },
  { id: 'percent', label: '정률 할인(%)' },
  { id: 'free_shipping', label: '무료배송' },
];

const TARGET_OPTIONS: readonly { readonly id: CouponTarget; readonly label: string }[] = [
  { id: 'all', label: '전체 회원' },
  { id: 'member_grade', label: '회원등급' },
  { id: 'category', label: '특정 카테고리' },
  { id: 'product', label: '특정 상품' },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 발급 대상 라벨 — 실화면 targetLabel 미러 */
const targetLabel = (target: CouponTarget): string =>
  TARGET_OPTIONS.find((option) => option.id === target)?.label ?? target;

/** 할인 요약 문구 — 목록·미리보기가 함께 쓴다. 실화면 discountLabel 미러 */
const discountLabel = (issueType: CouponIssueType, discountValue: number): string => {
  if (issueType === 'free_shipping') return '무료배송';
  if (issueType === 'percent') return `${String(discountValue)}% 할인`;
  return `${fmt(discountValue)}원 할인`;
};

/** 문자열 입력 → 정수(비숫자 제거). 실화면 toNum 미러 */
const toNum = (raw: string): number => Number((raw.trim() || '0').replace(/\D/g, '')) || 0;

interface SeedValues {
  readonly name: string;
  readonly code: string;
  readonly issueType: CouponIssueType;
  readonly discountValue: string;
  readonly maxDiscount: string;
  readonly minOrderAmount: string;
  readonly target: CouponTarget;
  readonly totalQuantity: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  code: '',
  issueType: 'amount',
  discountValue: '',
  maxDiscount: '0',
  minOrderAmount: '0',
  target: 'all',
  totalQuantity: '0',
  startAt: '',
  endAt: '',
  enabled: true,
};

const EDIT_SEED: SeedValues = {
  name: '신규 가입 15% 할인',
  code: 'WELCOME15',
  issueType: 'percent',
  discountValue: '15',
  maxDiscount: '20000',
  minOrderAmount: '30000',
  target: 'member_grade',
  totalQuantity: '1000',
  startAt: '2026-07-01',
  endAt: '2026-08-31',
  enabled: true,
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly code?: string;
  readonly discountValue?: string;
  readonly minOrderAmount?: string;
  readonly totalQuantity?: string;
  readonly period?: string;
}

const DEMO_ERRORS: FieldErrors = {
  name: '쿠폰명을 입력하세요.',
  code: '쿠폰 코드를 입력하세요.',
  discountValue: '할인율은 1% 이상 100% 이하로 입력하세요.',
  minOrderAmount: '최소 주문 금액은 숫자만 입력할 수 있습니다.',
  totalQuantity: '발급 수량을 입력하세요.',
  period: '사용 기간을 YYYY-MM-DD 형식으로 입력하세요.',
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

const controlStyle = (invalid: boolean): CSSProperties => ({
  ...controlBaseStyle,
  ...(invalid ? { borderColor: cssVar('color.feedback.danger.border') } : {}),
});

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const toggleFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
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

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 실시간 쿠폰 카드 미리보기(앱 전용 CouponCardPreview 미러 — 토큰만) ─────────────────────────── */

const stageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
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

const cardChipStyle = (enabled: boolean): CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.action.primary.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  opacity: enabled ? 1 : 0.55,
});

const chipLeftStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const chipDiscountStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  ...typography('typography.title.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const chipNameStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  overflowWrap: 'anywhere',
};

const chipMetaStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const chipDividerStyle: CSSProperties = {
  borderLeftStyle: 'dashed',
  borderLeftWidth: cssVar('border-width.thin'),
  borderLeftColor: cssVar('color.border.default'),
  paddingLeft: cssVar('space.3'),
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const chipCaptionStyle: CSSProperties = {
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

interface PreviewProps {
  readonly name: string;
  readonly issueType: CouponIssueType;
  readonly discountValue: number;
  readonly minOrderAmount: number;
  readonly maxDiscount: number;
  readonly target: CouponTarget;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
}

function CouponCardPreview({
  name,
  issueType,
  discountValue,
  minOrderAmount,
  maxDiscount,
  target,
  startAt,
  endAt,
  enabled,
}: PreviewProps) {
  const conditions: string[] = [];
  if (minOrderAmount > 0) conditions.push(`${fmt(minOrderAmount)}원 이상 구매 시`);
  if (issueType === 'percent' && maxDiscount > 0) conditions.push(`최대 ${fmt(maxDiscount)}원`);
  conditions.push(targetLabel(target));

  const period = startAt !== '' && endAt !== '' ? `${startAt} ~ ${endAt}` : '사용 기간 미설정';

  return (
    <div>
      <div style={stageStyle}>
        <div style={cardChipStyle(enabled)}>
          <div style={chipLeftStyle}>
            <span style={chipDiscountStyle}>{discountLabel(issueType, discountValue)}</span>
            <span style={chipNameStyle}>{name.trim() === '' ? '쿠폰명' : name}</span>
            <span style={chipMetaStyle}>{conditions.join(' · ')}</span>
            <span style={chipMetaStyle}>{period}</span>
          </div>
          <span style={chipDividerStyle}>COUPON</span>
        </div>
      </div>

      <p style={chipCaptionStyle}>
        {enabled
          ? '발급중 — 고객 쿠폰함에 이 모습으로 노출됩니다.'
          : '중지 — 저장해도 고객에게 발급되지 않습니다.'}
      </p>
    </div>
  );
}

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ── */

function FormCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
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

/** 토큰만 쓴 텍스트/숫자 입력 — FormField 가 라벨·필수·힌트·오류를 소유한다 */
interface TextControlProps {
  readonly id: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly numeric?: boolean;
  readonly required?: boolean;
  readonly invalid: boolean;
  readonly hasHint: boolean;
}

// FormField 는 래퍼 컴포넌트 자식에는 aria-required 를 주입하지 않는다(단일 네이티브 컨트롤만
// 대상). 그래서 required 를 여기로 받아 필수 여부를 AT 에 직접 잇는다 (A11Y-11).
function TextControl({
  id,
  value,
  onChange,
  placeholder,
  maxLength,
  numeric = false,
  required = false,
  invalid,
  hasHint,
}: TextControlProps) {
  const describedBy = invalid ? errorIdOf(id) : hasHint ? hintIdOf(id) : undefined;
  return (
    <input
      id={id}
      type="text"
      style={controlStyle(invalid)}
      value={value}
      placeholder={placeholder}
      required={required}
      aria-required={required || undefined}
      {...(maxLength !== undefined && { maxLength })}
      {...(numeric && { inputMode: 'numeric' as const })}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface CouponFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
  /** 로드 실패(EXC-12) — 404 는 '다시 시도' 없이 '목록으로'만 */
  readonly loadFailure?: 'not-found' | 'error';
}

function CouponFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
  loadFailure,
}: CouponFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [code, setCode] = useState(seed.code);
  const [issueType, setIssueType] = useState<CouponIssueType>(seed.issueType);
  const [discountValue, setDiscountValue] = useState(seed.discountValue);
  const [maxDiscount, setMaxDiscount] = useState(seed.maxDiscount);
  const [minOrderAmount, setMinOrderAmount] = useState(seed.minOrderAmount);
  const [target, setTarget] = useState<CouponTarget>(seed.target);
  const [totalQuantity, setTotalQuantity] = useState(seed.totalQuantity);
  const [startAt, setStartAt] = useState(seed.startAt);
  const [endAt, setEndAt] = useState(seed.endAt);
  const [enabled, setEnabled] = useState(seed.enabled);

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== undefined) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '쿠폰을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '쿠폰을 불러오지 못했습니다.'}
            </span>
            {loadFailure === 'error' && <Button variant="secondary">다시 시도</Button>}
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const isFree = issueType === 'free_shipping';

  return (
    <div style={pageStyle}>
      <a href="#coupon-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '쿠폰 수정' : '쿠폰 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 오른쪽 미리보기로 고객 쿠폰함에 보일 모습을 확인하세요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={pageStyle}>
        <div style={layoutStyle}>
          <FormCard title="쿠폰 정보">
            {loadingDetail ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <>
                <FormField
                  htmlFor="coupon-name"
                  label="쿠폰명"
                  required
                  {...(errors.name !== undefined && { error: errors.name })}
                >
                  <TextControl
                    id="coupon-name"
                    value={name}
                    onChange={setName}
                    placeholder="예: 신규 가입 15% 할인"
                    maxLength={COUPON_NAME_MAX}
                    required
                    invalid={errors.name !== undefined}
                    hasHint={false}
                  />
                </FormField>

                <div style={rowStyle}>
                  <FormField
                    htmlFor="coupon-code"
                    label="쿠폰 코드"
                    required
                    {...(errors.code !== undefined && { error: errors.code })}
                  >
                    <TextControl
                      id="coupon-code"
                      value={code}
                      onChange={setCode}
                      placeholder="예: WELCOME15"
                      maxLength={COUPON_CODE_MAX}
                      required
                      invalid={errors.code !== undefined}
                      hasHint={false}
                    />
                  </FormField>

                  <FormField htmlFor="coupon-target" label="발급 대상" required>
                    <SelectField
                      id="coupon-target"
                      value={target}
                      onChange={(event) => setTarget(event.target.value as CouponTarget)}
                    >
                      {TARGET_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </div>

                <div style={rowStyle}>
                  <FormField htmlFor="coupon-issue-type" label="발급 유형" required>
                    <SelectField
                      id="coupon-issue-type"
                      value={issueType}
                      onChange={(event) => setIssueType(event.target.value as CouponIssueType)}
                    >
                      {ISSUE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>

                  {!isFree && (
                    <FormField
                      htmlFor="coupon-discount-value"
                      label={issueType === 'percent' ? '할인율 (%)' : '할인 금액 (원)'}
                      required
                      {...(errors.discountValue !== undefined && { error: errors.discountValue })}
                    >
                      <TextControl
                        id="coupon-discount-value"
                        value={discountValue}
                        onChange={setDiscountValue}
                        placeholder={issueType === 'percent' ? '예: 15' : '예: 5000'}
                        numeric
                        required
                        invalid={errors.discountValue !== undefined}
                        hasHint={false}
                      />
                    </FormField>
                  )}

                  {issueType === 'percent' && (
                    <FormField
                      htmlFor="coupon-max-discount"
                      label="최대 할인 (원)"
                      hint="0 이면 상한 없음"
                    >
                      <TextControl
                        id="coupon-max-discount"
                        value={maxDiscount}
                        onChange={setMaxDiscount}
                        placeholder="예: 20000"
                        numeric
                        invalid={false}
                        hasHint
                      />
                    </FormField>
                  )}
                </div>

                <div style={rowStyle}>
                  <FormField
                    htmlFor="coupon-min-order"
                    label="최소 주문 금액 (원)"
                    required
                    hint="0 이면 조건 없음"
                    {...(errors.minOrderAmount !== undefined && { error: errors.minOrderAmount })}
                  >
                    <TextControl
                      id="coupon-min-order"
                      value={minOrderAmount}
                      onChange={setMinOrderAmount}
                      placeholder="예: 30000"
                      numeric
                      required
                      invalid={errors.minOrderAmount !== undefined}
                      hasHint
                    />
                  </FormField>

                  <FormField
                    htmlFor="coupon-quantity"
                    label="발급 수량"
                    required
                    hint="0 이면 무제한"
                    {...(errors.totalQuantity !== undefined && { error: errors.totalQuantity })}
                  >
                    <TextControl
                      id="coupon-quantity"
                      value={totalQuantity}
                      onChange={setTotalQuantity}
                      placeholder="예: 1000"
                      numeric
                      required
                      invalid={errors.totalQuantity !== undefined}
                      hasHint
                    />
                  </FormField>
                </div>

                <DateRangeField
                  label="사용 기간"
                  required
                  startValue={startAt}
                  endValue={endAt}
                  onStartChange={setStartAt}
                  onEndChange={setEndAt}
                  {...(errors.period !== undefined && { error: errors.period })}
                />

                <div style={toggleFieldStyle}>
                  <span style={fieldLabelStyle}>발급 상태</span>
                  <ToggleSwitch
                    checked={enabled}
                    onChange={setEnabled}
                    label="쿠폰 발급 여부"
                    onLabel="발급중"
                    offLabel="중지"
                  />
                </div>
              </>
            )}
          </FormCard>

          <FormCard title="미리보기">
            <CouponCardPreview
              name={name}
              issueType={issueType}
              discountValue={toNum(discountValue)}
              minOrderAmount={toNum(minOrderAmount)}
              maxDiscount={toNum(maxDiscount)}
              target={target}
              startAt={startAt}
              endAt={endAt}
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

/** 정상(등록): 빈 폼 + 우측 실시간 미리보기 */
export const Default: Story = {
  render: () => <CouponFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(정률 → 최대 할인 칸 노출) */
export const Edit: Story = {
  render: () => <CouponFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 입력 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <CouponFormScreen isEdit loadingDetail seed={EDIT_SEED} />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => (
    <CouponFormScreen
      seed={{ ...EMPTY_SEED, issueType: 'percent', discountValue: '150' }}
      errors={DEMO_ERRORS}
    />
  ),
};

/** 로드 실패: 서버 오류 — '다시 시도' + '목록으로' (EXC-12) */
export const LoadError: Story = {
  render: () => <CouponFormScreen isEdit loadFailure="error" />,
};

/** 로드 실패: 404 — 이미 삭제된 쿠폰. '다시 시도' 없이 '목록으로'만 (EXC-12) */
export const NotFound: Story = {
  render: () => <CouponFormScreen isEdit loadFailure="not-found" />,
};
