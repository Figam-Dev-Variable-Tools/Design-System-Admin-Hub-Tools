/**
 * Design System/Templates/Products/Coupon Form — 쿠폰 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Products"(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Products 그룹, `/products/coupons` → 화면 en = "Coupons" 에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/coupons/CouponFormPage.tsx
 * (라우트 /products/coupons/new · /:id/edit). 승격된 CRUD 프레임워크(useCrudForm) 위에 입력 카드 3장
 * (쿠폰 정보 · 발급 기준 · 사용 조건) + 우측 실시간 쿠폰 카드 미리보기 2단을 얹는다.
 * 검증의 정본은 zod 스키마(./validation)이고, 연쇄 선택·저장 가드의 정본은 순수 함수(./types)다.
 *
 * [한 줄에 입력 하나 — 실화면과 같은 규칙]
 *   입력 칸은 카드 안에서 세로로 쌓는다. 가로로 두는 것은 **한 쌍이 곧 하나의 값**인 날짜 범위
 *   (DateRangeField)뿐이다. 서로 무관한 두 질문을 한 줄에 묶으면 짝처럼 읽힌다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기·앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기                   → Button(ghost) + Icon(chevron-left)
 *   페이지 제목/설명           → 토큰만 쓴 <h1>(title.xl) + <p>
 *   카드 표면 · 카드 제목       → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   쿠폰명/코드/숫자 필드       → FormField + 토큰만 쓴 <input> (라벨·필수·힌트·오류는 FormField 소유)
 *   발급 유형/시점/대상        → FormField + SelectField
 *   연쇄 대상 선택(1차→2차→상품) → FormField + SelectField 3단 + Button(secondary) '추가' + 토큰 칩
 *   사용 기간 · 다운로드 기간   → DateRangeField
 *   발급 상태 · 중복 사용       → ToggleSwitch
 *   서버 오류 배너 · 저장 가드   → Alert(danger / warning)
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
type CouponTriggerType = 'manual' | 'signup' | 'tier_up' | 'birthday' | 'first_order' | 'download';

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

/**
 * 발급 시점 — **여섯 중 셋만 조건을 더 묻는다**(실화면 triggerCondition 미러).
 * 조건이 없는 시점의 힌트는 '더 정할 조건이 없습니다' 라고 못 박는다: 칸이 안 뜨는 것을
 * 화면 고장으로 읽지 않게 하기 위해서다.
 */
type TriggerCondition = 'tier' | 'birthday-days' | 'download-period' | null;

const TRIGGER_OPTIONS: readonly {
  readonly id: CouponTriggerType;
  readonly label: string;
  readonly hint: string;
  readonly condition: TriggerCondition;
}[] = [
  {
    id: 'manual',
    label: '운영자 직접 발급',
    hint: '운영자가 회원을 골라 발급해요. 받을 회원은 발급하는 순간 고르므로 여기서 더 정할 조건이 없어요.',
    condition: null,
  },
  {
    id: 'signup',
    label: '회원 가입 시',
    hint: '가입이 완료된 직후 모든 신규 회원에게 자동 발급돼요. 더 정할 조건이 없어요.',
    condition: null,
  },
  {
    id: 'tier_up',
    label: '회원 등급 승급 시',
    hint: '지정한 등급으로 올라간 회원에게 자동 발급돼요. 아래에서 승급 대상 등급을 고르세요.',
    condition: 'tier',
  },
  {
    id: 'birthday',
    label: '생일',
    hint: '생일 기준 지정한 일수 전에 자동 발급돼요. 아래에서 며칠 전에 보낼지 정하세요.',
    condition: 'birthday-days',
  },
  {
    id: 'first_order',
    label: '첫 구매',
    hint: '첫 주문이 결제 완료되면 자동 발급돼요. 첫 주문은 한 번뿐이라 더 정할 조건이 없어요.',
    condition: null,
  },
  {
    id: 'download',
    label: '고객 다운로드',
    hint: '고객이 직접 받아 가요. 아래에서 받아 갈 수 있는 기간을 정하세요.',
    condition: 'download-period',
  },
];

const TIER_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'normal', label: '일반회원' },
  { id: 'vip', label: 'VIP' },
  { id: 'vvip', label: 'VVIP' },
];

/** 카테고리는 2단계다 — parentId 가 null 이면 1차(대분류) */
interface DemoCategory {
  readonly id: string;
  readonly label: string;
  readonly parentId: string | null;
}

const CATEGORIES: readonly DemoCategory[] = [
  { id: 'outer', label: '아우터', parentId: null },
  { id: 'top', label: '상의', parentId: null },
  { id: 'outer-coat', label: '코트', parentId: 'outer' },
  { id: 'outer-jacket', label: '재킷', parentId: 'outer' },
  { id: 'top-tee', label: '티셔츠', parentId: 'top' },
];

interface DemoProduct {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly categoryId: string;
}

const PRODUCTS: readonly DemoProduct[] = [
  { id: 'prd-1', name: '루미엔 경량 패딩 점퍼', code: 'LMN-PAD-001', categoryId: 'outer' },
  { id: 'prd-2', name: '아틀리에 울 코트', code: 'ATL-COAT-007', categoryId: 'outer-coat' },
  { id: 'prd-3', name: '노바 베이직 코튼 티셔츠', code: 'NVA-TEE-014', categoryId: 'top-tee' },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 발급 대상 라벨 — 실화면 targetLabel 미러 */
const targetLabel = (target: CouponTarget): string =>
  TARGET_OPTIONS.find((option) => option.id === target)?.label ?? target;

/** 대상 유형별 선택 안내 문구 — 실화면 targetPickerLabel 미러 */
const targetPickerLabel = (target: CouponTarget): string => {
  if (target === 'member_grade') return '대상 회원등급';
  if (target === 'category') return '대상 카테고리';
  if (target === 'product') return '대상 상품';
  return '대상';
};

/** 할인 요약 문구 — 목록·미리보기가 함께 쓴다. 실화면 discountLabel 미러 */
const discountLabel = (issueType: CouponIssueType, discountValue: number): string => {
  if (issueType === 'free_shipping') return '무료배송';
  if (issueType === 'percent') return `${String(discountValue)}% 할인`;
  return `${fmt(discountValue)}원 할인`;
};

/** 문자열 입력 → 정수(비숫자 제거). 실화면 toNum 미러 */
const toNum = (raw: string): number => Number((raw.trim() || '0').replace(/\D/g, '')) || 0;

/* ── 연쇄 선택 규칙(실화면 ./types 의 순수 함수 미러) ───────────────────────────────────────── */

interface Scope {
  readonly rootId: string;
  readonly childId: string;
  readonly productId: string;
}

const EMPTY_SCOPE: Scope = { rootId: '', childId: '', productId: '' };

/** 1차를 바꾸면 2차·상품을 버린다 — 남겨 두면 화면의 선택과 실제 값이 어긋난다 */
const withRoot = (rootId: string): Scope => ({ rootId, childId: '', productId: '' });
/** 2차를 바꾸면 상품만 버린다(한 단 아래) */
const withChild = (scope: Scope, childId: string): Scope => ({
  rootId: scope.rootId,
  childId,
  productId: '',
});

const rootOptionsOf = (categories: readonly DemoCategory[]) =>
  categories.filter((category) => category.parentId === null);

const childOptionsOf = (categories: readonly DemoCategory[], rootId: string) =>
  rootId === '' ? [] : categories.filter((category) => category.parentId === rootId);

/** 2차를 골랐으면 그 2차만, 1차만 골랐으면 그 1차와 그 아래 2차 전부. 1차 전에는 빈 목록 */
const productsInScope = (
  products: readonly DemoProduct[],
  categories: readonly DemoCategory[],
  scope: Scope,
): readonly DemoProduct[] => {
  if (scope.childId !== '') return products.filter((p) => p.categoryId === scope.childId);
  if (scope.rootId === '') return [];
  const inRoot = new Set<string>([scope.rootId]);
  for (const category of categories) {
    if (category.parentId === scope.rootId) inRoot.add(category.id);
  }
  return products.filter((product) => inRoot.has(product.categoryId));
};

const categoryPathOf = (categories: readonly DemoCategory[], id: string): string => {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) return id;
  if (found.parentId === null) return found.label;
  const parent = categories.find((category) => category.id === found.parentId);
  return parent === undefined ? found.label : `${parent.label} > ${found.label}`;
};

/** 지금 좌표에서 더할 수 있는 id — 카테고리는 2차 없으면 1차, 상품은 상품을 골라야 한다 */
const addableIdOf = (target: CouponTarget, scope: Scope): string => {
  if (target === 'product') return scope.productId;
  if (target === 'category') return scope.childId !== '' ? scope.childId : scope.rootId;
  return '';
};

/**
 * 저장을 막아야 하는 이유 — 없으면 null (실화면 couponSaveBlockReason 미러).
 * 버튼의 disabled 와 제출 거부가 **같은 이 값**을 읽는다.
 */
const saveBlockReason = (
  target: CouponTarget,
  targetIds: readonly string[],
  optionsKnown: boolean,
): string | null => {
  if (target === 'all') return null;
  const label = targetPickerLabel(target);
  if (!optionsKnown) return `${label} 목록을 불러오지 못했어요. 고를 수 없는 채로 저장하지 않아요.`;
  if (targetIds.length === 0) return `${label}을 한 개 이상 선택하세요.`;
  return null;
};

interface SeedValues {
  readonly name: string;
  readonly code: string;
  readonly issueType: CouponIssueType;
  readonly discountValue: string;
  readonly maxDiscount: string;
  readonly minOrderAmount: string;
  readonly totalQuantity: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
  readonly triggerType: CouponTriggerType;
  readonly triggerTier: string;
  readonly triggerBirthdayDays: string;
  readonly target: CouponTarget;
  readonly targetIds: readonly string[];
  readonly stackable: boolean;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  code: '',
  issueType: 'amount',
  discountValue: '',
  maxDiscount: '0',
  minOrderAmount: '0',
  totalQuantity: '0',
  startAt: '',
  endAt: '',
  enabled: true,
  triggerType: 'manual',
  triggerTier: 'vip',
  triggerBirthdayDays: '7',
  target: 'all',
  targetIds: [],
  stackable: false,
};

const EDIT_SEED: SeedValues = {
  ...EMPTY_SEED,
  name: 'VIP 승급 축하 15% 할인',
  code: 'VIPUP15',
  issueType: 'percent',
  discountValue: '15',
  maxDiscount: '20000',
  minOrderAmount: '30000',
  totalQuantity: '1000',
  startAt: '2026-07-01',
  endAt: '2026-08-31',
  // 조건을 요구하는 시점 — '승급 대상 등급' 칸이 아래에 함께 뜬다
  triggerType: 'tier_up',
  target: 'member_grade',
  targetIds: ['vip', 'vvip'],
};

const PRODUCT_SEED: SeedValues = {
  ...EMPTY_SEED,
  name: '아우터 단독 10% 쿠폰',
  code: 'OUTER10',
  issueType: 'percent',
  discountValue: '10',
  maxDiscount: '30000',
  totalQuantity: '300',
  startAt: '2026-08-01',
  endAt: '2026-08-31',
  target: 'product',
  targetIds: ['prd-1'],
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
  minOrderAmount: '최소 주문 금액은 숫자만 입력할 수 있어요.',
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

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
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

const controlStyle = (invalid: boolean): CSSProperties => ({
  ...controlBaseStyle,
  ...(invalid ? { borderColor: cssVar('color.feedback.danger.border') } : {}),
});

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const hintTextStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const errorTextStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.feedback.danger.text'),
  ...typography('typography.caption.md'),
};

const toggleFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const chainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const stepStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const addRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};

const chipListStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.full'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
  overflowWrap: 'anywhere',
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

// 중지(enabled=false)를 opacity 로 흐리지 않는다 — 컨테이너 opacity 는 안의 글자(할인·쿠폰명·조건)를
// 배경으로 합성해 대비를 4.5:1 아래로 떨어뜨린다(axe color-contrast). 중지 사실은 아래 캡션이 글자로 전한다.
const cardChipStyle: CSSProperties = {
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
};

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
        <div style={cardChipStyle}>
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
          ? '발급중 — 고객 쿠폰함에 이 모습으로 노출돼요.'
          : '중지 — 저장해도 고객에게 발급되지 않아요.'}
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

/* ── 연쇄 대상 선택 (1차 → 2차 → 상품) ────────────────────────────────────────────────────── */

interface ScopePickerProps {
  readonly target: CouponTarget;
  readonly selectedIds: readonly string[];
  readonly onChange: (ids: readonly string[]) => void;
  /** false 면 목록을 **모른다** — 빈 셀렉트('없다')로 뭉개지 않고 이유를 말한다 */
  readonly optionsKnown: boolean;
}

function ScopePicker({ target, selectedIds, onChange, optionsKnown }: ScopePickerProps) {
  const [scope, setScope] = useState<Scope>(EMPTY_SCOPE);

  const label = targetPickerLabel(target);
  const needsProducts = target === 'product';

  if (!optionsKnown) {
    return (
      <div style={chainStyle}>
        <span style={fieldLabelStyle}>
          {label}
          <span aria-hidden="true"> *</span>
        </span>
        <p style={errorTextStyle}>
          카테고리 목록을 불러오지 못해 지금은 대상을 고를 수 없어요. 잠시 후 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  const childOptions = childOptionsOf(CATEGORIES, scope.rootId);
  const productOptions = needsProducts ? productsInScope(PRODUCTS, CATEGORIES, scope) : [];
  const addableId = addableIdOf(target, scope);
  const alreadyAdded = addableId !== '' && selectedIds.includes(addableId);

  const labelFor = (id: string): string => {
    if (needsProducts) {
      const product = PRODUCTS.find((item) => item.id === id);
      return product === undefined ? id : `${product.name} (${product.code})`;
    }
    return categoryPathOf(CATEGORIES, id);
  };

  return (
    <div style={chainStyle}>
      <span style={fieldLabelStyle}>
        {label}
        <span aria-hidden="true"> *</span>
      </span>

      <div style={stepStyle}>
        <label style={fieldLabelStyle} htmlFor="coupon-scope-root">
          1차 카테고리
        </label>
        <SelectField
          id="coupon-scope-root"
          value={scope.rootId}
          onChange={(event) => setScope(withRoot(event.target.value))}
        >
          <option value="">1차 카테고리 선택</option>
          {rootOptionsOf(CATEGORIES).map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div style={stepStyle}>
        <label style={fieldLabelStyle} htmlFor="coupon-scope-child">
          2차 카테고리
        </label>
        <SelectField
          id="coupon-scope-child"
          disabled={childOptions.length === 0}
          value={scope.childId}
          onChange={(event) => setScope(withChild(scope, event.target.value))}
        >
          <option value="">
            {scope.rootId === ''
              ? '1차를 먼저 선택하세요'
              : childOptions.length === 0
                ? '이 1차에는 2차가 없어요'
                : '2차 전체'}
          </option>
          {childOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </SelectField>
      </div>

      {needsProducts && (
        <div style={stepStyle}>
          <label style={fieldLabelStyle} htmlFor="coupon-scope-product">
            상품
          </label>
          <SelectField
            id="coupon-scope-product"
            disabled={productOptions.length === 0}
            value={scope.productId}
            onChange={(event) => setScope({ ...scope, productId: event.target.value })}
          >
            <option value="">
              {scope.rootId === ''
                ? '1차 카테고리를 먼저 선택하세요'
                : productOptions.length === 0
                  ? '이 분류에 등록된 상품이 없어요'
                  : '상품 선택'}
            </option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.code})
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <div style={addRowStyle}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={addableId === '' || alreadyAdded}
          onClick={() => onChange([...selectedIds, addableId])}
        >
          추가
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <ul style={chipListStyle}>
          {selectedIds.map((id) => (
            <li key={id} style={chipStyle}>
              {labelFor(id)}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`${labelFor(id)} 제외`}
                onClick={() => onChange(selectedIds.filter((value) => value !== id))}
              >
                <Icon name="close" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p style={hintTextStyle}>{selectedIds.length}개 선택됨</p>
    </div>
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
  /** 선택지 목록을 아는가 — false 면 '모른다' 경로(저장이 잠긴다) */
  readonly optionsKnown?: boolean;
}

function CouponFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
  loadFailure,
  optionsKnown = true,
}: CouponFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [code, setCode] = useState(seed.code);
  const [issueType, setIssueType] = useState<CouponIssueType>(seed.issueType);
  const [discountValue, setDiscountValue] = useState(seed.discountValue);
  const [maxDiscount, setMaxDiscount] = useState(seed.maxDiscount);
  const [minOrderAmount, setMinOrderAmount] = useState(seed.minOrderAmount);
  const [totalQuantity, setTotalQuantity] = useState(seed.totalQuantity);
  const [startAt, setStartAt] = useState(seed.startAt);
  const [endAt, setEndAt] = useState(seed.endAt);
  const [enabled, setEnabled] = useState(seed.enabled);
  const [triggerType, setTriggerType] = useState<CouponTriggerType>(seed.triggerType);
  const [triggerTier, setTriggerTier] = useState(seed.triggerTier);
  const [triggerBirthdayDays, setTriggerBirthdayDays] = useState(seed.triggerBirthdayDays);
  const [downloadFrom, setDownloadFrom] = useState('');
  const [downloadTo, setDownloadTo] = useState('');
  const [target, setTarget] = useState<CouponTarget>(seed.target);
  const [targetIds, setTargetIds] = useState<readonly string[]>(seed.targetIds);
  const [stackable, setStackable] = useState(seed.stackable);

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== undefined) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '쿠폰을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '쿠폰을 불러오지 못했어요.'}
            </span>
            {loadFailure === 'error' && <Button variant="secondary">다시 시도</Button>}
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const isFree = issueType === 'free_shipping';
  const trigger = TRIGGER_OPTIONS.find((option) => option.id === triggerType);
  const condition: TriggerCondition = trigger?.condition ?? null;
  const blockReason = saveBlockReason(target, targetIds, optionsKnown);

  /** 사용 대상을 바꾸면 이전에 고른 id 를 함께 버린다 — 보이지 않는 값이 저장되지 않게 */
  const changeTarget = (next: CouponTarget) => {
    setTarget(next);
    setTargetIds([]);
  };

  return (
    <div style={pageStyle}>
      <a href="#coupon-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '쿠폰 수정' : '쿠폰 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 발급 기준은 쿠폰이 언제 나가는지를, 사용 조건은 어디에 쓸 수
          있는지를 정해요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={pageStyle}>
        <div style={layoutStyle}>
          <div style={columnStyle}>
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

                  {/*
                    최소 주문 금액은 '얼마나 깎아 주는가' 와 한 문장으로 읽힌다:
                    "3만원 이상 사면 15%, 최대 2만원." 그래서 할인 칸 바로 뒤, 수량·기간 앞이다.
                  */}
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

                  {/* 날짜 한 쌍만 가로다 — 시작일·종료일은 따로 읽을 수 없는 한 값이다 */}
                  <DateRangeField
                    label="쿠폰 사용 기간"
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

            <FormCard title="발급 기준">
              <FormField
                htmlFor="coupon-trigger-type"
                label="발급 시점"
                required
                hint={trigger?.hint ?? ''}
              >
                <SelectField
                  id="coupon-trigger-type"
                  value={triggerType}
                  onChange={(event) => setTriggerType(event.target.value as CouponTriggerType)}
                >
                  {TRIGGER_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              {/* 조건 칸은 시점이 요구할 때만 뜬다 — 셋은 아무것도 더 묻지 않는다 */}
              {condition === 'tier' && (
                <FormField
                  htmlFor="coupon-trigger-tier"
                  label="승급 대상 등급"
                  required
                  hint="이 등급으로 올라간 회원에게 발급돼요."
                >
                  <SelectField
                    id="coupon-trigger-tier"
                    value={triggerTier}
                    onChange={(event) => setTriggerTier(event.target.value)}
                  >
                    {TIER_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              )}

              {condition === 'birthday-days' && (
                <FormField
                  htmlFor="coupon-trigger-birthday"
                  label="생일 며칠 전 발급"
                  required
                  hint="0 이면 생일 당일. 최대 60일 전까지."
                >
                  <TextControl
                    id="coupon-trigger-birthday"
                    value={triggerBirthdayDays}
                    onChange={setTriggerBirthdayDays}
                    placeholder="예: 7"
                    numeric
                    required
                    invalid={false}
                    hasHint
                  />
                </FormField>
              )}

              {condition === 'download-period' && (
                <DateRangeField
                  label="다운로드 기간"
                  required
                  startValue={downloadFrom}
                  endValue={downloadTo}
                  onStartChange={setDownloadFrom}
                  onEndChange={setDownloadTo}
                />
              )}
            </FormCard>

            <FormCard title="사용 조건">
              <FormField htmlFor="coupon-target" label="사용 대상" required>
                <SelectField
                  id="coupon-target"
                  value={target}
                  onChange={(event) => changeTarget(event.target.value as CouponTarget)}
                >
                  {TARGET_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              {target === 'member_grade' && (
                <FormField htmlFor="coupon-grade" label="대상 회원등급" required>
                  <SelectField
                    id="coupon-grade"
                    value={targetIds[0] ?? ''}
                    onChange={(event) => setTargetIds([event.target.value])}
                  >
                    <option value="">회원등급 선택</option>
                    {TIER_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              )}

              {(target === 'category' || target === 'product') && (
                <ScopePicker
                  key={target}
                  target={target}
                  selectedIds={targetIds}
                  onChange={setTargetIds}
                  optionsKnown={optionsKnown}
                />
              )}

              <div style={toggleFieldStyle}>
                <span style={fieldLabelStyle}>중복 사용</span>
                <ToggleSwitch
                  checked={stackable}
                  onChange={setStackable}
                  label="다른 쿠폰과 중복 사용 여부"
                  onLabel="중복 사용 가능"
                  offLabel="1주문 1쿠폰"
                />
              </div>
            </FormCard>
          </div>

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

        {/* 잠긴 버튼은 이유를 달고 있어야 한다 — 아래 disabled 와 같은 값을 읽는다 */}
        {blockReason !== null && <Alert tone="warning">{blockReason}</Alert>}

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={blockReason !== null}>
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 + 우측 실시간 미리보기. 입력은 한 줄에 하나씩 쌓인다 */
export const Default: Story = {
  render: () => <CouponFormScreen />,
};

/** 수정: 등급 승급 시점 — 조건 칸('승급 대상 등급')이 함께 뜬다 */
export const Edit: Story = {
  render: () => <CouponFormScreen isEdit seed={EDIT_SEED} />,
};

/** 특정 상품: 1차 → 2차 → 상품 연쇄 선택 + 고른 대상 칩. 1차를 바꾸면 아래가 비워진다 */
export const TargetProduct: Story = {
  render: () => <CouponFormScreen isEdit seed={PRODUCT_SEED} />,
};

/** 선택지 미확보: 목록을 못 읽으면 빈 셀렉트가 아니라 이유를 말하고 저장이 잠긴다 */
export const OptionsUnavailable: Story = {
  render: () => <CouponFormScreen seed={PRODUCT_SEED} optionsKnown={false} />,
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
