/**
 * Design System/Templates/Products/Product Form — 상품 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Products"(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Products 그룹에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/items/ProductFormPage.tsx
 * (라우트 /products/new · /products/:id/edit). 실화면은 승격된 CRUD 프레임워크(useCrudForm) 위에
 * 좌측 구획 목차 레일 + 8개 섹션 카드(기본정보·가격/할인·적립금·쿠폰·옵션/재고·배송·이미지·상세설명) +
 * 우측 실시간 상품 카드 미리보기를 배치한다.
 *
 * [가격에는 축이 둘이다 — 결제(전역)와 가격 표시(상품별)] 축 A 는 '결제창을 열 수 있는가'(사이트
 * 전역 결제 설정), 축 B 는 '이 상품의 금액을 노출하는가'(가격 표시 라디오)다. 둘을 하나로 묶으면
 * "PG 는 쓰지만 이 상품만 가격문의" 라는 흔한 운영을 표현할 수 없다 — 주문 제작·B2B 납품·시공처럼
 * 견적이 있어야 값이 정해지는 상품은 결제를 켠 쇼핑몰에도 섞여 있다. **전역이 이긴다**: 결제창을
 * 열 수 없으면 상품이 '금액 노출' 이라고 말해도 금액을 그리지 않는다(살 수 없는 상품의 가격표는
 * "지금 결제된다" 는 거짓 신호다). 반대 방향은 성립하지 않는다.
 *
 * [미리보기의 버튼 글자는 이 화면이 정하지 않는다] '구매하기' 인가 '문의하기' 인가는 결제 설정의
 * 규칙(checkoutCta)이 정하고 프로그램 상세도 같은 규칙을 읽는다. 미리보기가 조건을 한 번 더 쓰면
 * 고객 화면과 다른 버튼을 보여 주게 된다.
 *
 * [잠금은 값을 지우지 않는다] 결제가 없으면 적립금·쿠폰·배송 구획이 잠기지만 저장된 적립률·쿠폰
 * 설정·배송비는 그대로 남고, 결제를 다시 켜면 살아난다. 지우는 구현은 되돌릴 수 없다 — 운영자는
 * 결제를 잠시 끄는 것과 정책을 폐기하는 것을 구분해서 하고 있다. 옵션 구성은 잠기지 않는다(문의로
 * 받은 요청의 품목 명세가 된다).
 *
 * [기본 정보의 카테고리는 2단계 연동 셀렉트다] 상품 카테고리가 2Depth(대분류 → 중분류)로 바뀌면서
 * 폼도 두 개의 셀렉트로 갈렸다. 저장되는 값(`categoryId`)은 여전히 **최종 선택 하나**다 — 중분류를
 * 고르면 그 id, 고르지 않으면 대분류 id 가 들어가고, 두 셀렉트는 그 값에서 되짚어 그린다. 대분류를
 * 바꾸면 다른 갈래의 중분류가 남지 않게 선택이 대분류 id 로 되돌아가며, 하위가 없는 대분류를 고르면
 * 중분류 셀렉트 자체가 잠긴다(고를 것이 없는 컨트롤을 열어 두지 않는다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 조각을 DS 표면으로 갈음한다:
 *   목록으로(FormPageShell)   → Button(ghost) + Icon(chevron-left)
 *   페이지 제목               → 토큰만 쓴 <h1>(title.xl)
 *   좌측 구획 목차(FormSectionNav) → aria-current 앵커 목록 + 오류 점(FilterRail 자리)
 *   카드 표면 · 카드 제목       → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   상품명/상품코드/브랜드/태그  → TextField / FormField+input
 *   카테고리(대분류·중분류)     → FormField + SelectField ×2 (2Depth 연동 · 하위 없으면 잠금)
 *   판매상태/할인/적립/배송     → FormField + SelectField
 *   전시·과세·품절 토글          → ToggleSwitch
 *   쿠폰 사용 가능 여부          → ToggleSwitch (상품별 오버라이드 · 상품이 이긴다)
 *   PG 잠금 안내(PgLockNotice)  → Alert(info) + 결제 설정·상품 문의 링크
 *   옵션 · SKU 매트릭스          → Table (조합형 재고 표)
 *   대표/상세 이미지             → ImageUploadField · ImageGalleryField
 *   상세설명(서식)               → RichTextField
 *   우측 미리보기(ProductCardPreview) → Card + StatusBadge + Icon + 버튼 시각 토큰 <span>(CTA)
 *   저장/취소                   → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * 이미지 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  formRowStyle,
  Icon,
  ImageGalleryField,
  ImageUploadField,
  RichTextField,
  SelectField,
  Skeleton,
  StatusBadge,
  Table,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Product Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 _shared/store · types 미러) ─────────────────────────────────────────── */

const PRODUCT_NAME_MAX = 100;
const PRODUCT_CODE_MAX = 40;
const PRODUCT_BRAND_MAX = 40;
const PRODUCT_DESCRIPTION_MAX = 2000;
const MAX_PRODUCT_IMAGES = 10;

type SaleStatus = 'on_sale' | 'sold_out' | 'stopped';
type DiscountType = 'none' | 'amount' | 'percent';
type PointsMode = 'rate' | 'fixed' | 'none';
type FeeType = 'free' | 'paid' | 'conditional';

interface DemoCategory {
  readonly id: string;
  readonly label: string;
  /** 상위 카테고리 id. null 이면 최상위(1Depth · 대분류) */
  readonly parentId: string | null;
}

/** 실화면 store 의 2Depth 카테고리 픽스처 미러 — 대분류 5개 + 중분류 6개('신발'·'액세서리'는 하위 없음) */
const CATEGORIES: readonly DemoCategory[] = [
  { id: 'outer', label: '아우터', parentId: null },
  { id: 'top', label: '상의', parentId: null },
  { id: 'bottom', label: '하의', parentId: null },
  { id: 'shoes', label: '신발', parentId: null },
  { id: 'acc', label: '액세서리', parentId: null },
  { id: 'outer-coat', label: '코트', parentId: 'outer' },
  { id: 'outer-jacket', label: '재킷', parentId: 'outer' },
  { id: 'top-tee', label: '티셔츠', parentId: 'top' },
  { id: 'top-shirt', label: '셔츠', parentId: 'top' },
  { id: 'bottom-pants', label: '팬츠', parentId: 'bottom' },
  { id: 'bottom-skirt', label: '스커트', parentId: 'bottom' },
];

const SALE_STATUS_OPTIONS: readonly {
  readonly id: SaleStatus;
  readonly label: string;
  readonly tone: StatusBadgeTone;
}[] = [
  { id: 'on_sale', label: '판매중', tone: 'success' },
  { id: 'sold_out', label: '품절', tone: 'warning' },
  { id: 'stopped', label: '판매중지', tone: 'neutral' },
];

/** 판매상태 → 배지 라벨·톤(키 접근 안전) — 미리보기가 쓴다 */
const SALE_STATUS_META: Record<
  SaleStatus,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  on_sale: { label: '판매중', tone: 'success' },
  sold_out: { label: '품절', tone: 'warning' },
  stopped: { label: '판매중지', tone: 'neutral' },
};

const DISCOUNT_TYPE_OPTIONS: readonly { readonly id: DiscountType; readonly label: string }[] = [
  { id: 'none', label: '할인 없음' },
  { id: 'amount', label: '정액 할인(원)' },
  { id: 'percent', label: '정률 할인(%)' },
];

const POINTS_MODE_OPTIONS: readonly { readonly id: PointsMode; readonly label: string }[] = [
  { id: 'rate', label: '정률 적립(%)' },
  { id: 'fixed', label: '정액 적립(원)' },
  { id: 'none', label: '적립 미적용' },
];

const SHIPPING_METHOD_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'courier', label: '택배' },
  { id: 'direct', label: '직접배송' },
  { id: 'pickup', label: '방문수령' },
];

const SHIPPING_FEE_OPTIONS: readonly { readonly id: FeeType; readonly label: string }[] = [
  { id: 'free', label: '무료배송' },
  { id: 'paid', label: '유료배송' },
  { id: 'conditional', label: '조건부 무료' },
];

/* ── 가격 표시 (실화면 shared/commerce/price-display.ts 미러) ────────────────────────────────
 *
 * [축이 하나가 됐다] 예전에는 상품 폼에 '가격 표시' 라디오(금액 노출 / 가격문의로 대체)와 대체 문구
 * 입력이 있었다. 운영 요구로 그 선택이 사라졌다 — **금액을 노출하는가는 사이트 전역 결제 연동
 * 상태의 결과**다. 그래서 이 스토리에도 라디오가 없고, `pgSellable` 하나가 금액 칸의 운명을 정한다. */

/** 결제를 열 수 없을 때 금액 자리에 들어가는 문구 — 정본은 한 벌뿐이다 */
const DEFAULT_PRICE_INQUIRY_TEXT = '가격문의';

/* ── 축 A · 결제(PG) 설정 (실화면 shared/commerce/payment-settings · pg-lock 미러) ───────────── */

/** 버튼이 하는 일 — 결제로 가는가(purchase), 문의로 가는가(inquiry) */
type CheckoutCtaKind = 'purchase' | 'inquiry';

/**
 * 지금 그려야 할 상품 CTA — **파생값이다. 어디에도 저장하지 않는다.**
 *
 * 라벨을 상품마다 들고 있으면 설정 스위치를 내리는 순간 이미 등록된 수백 건이 낡은 값이 된다.
 * 사실은 하나(결제창을 열 수 있는가)이고 버튼은 그 결과다.
 */
function checkoutCta(pgSellable: boolean): {
  readonly kind: CheckoutCtaKind;
  readonly label: string;
  readonly reason: string;
} {
  if (pgSellable) {
    return { kind: 'purchase', label: '구매하기', reason: '결제창이 열려요.' };
  }
  return {
    kind: 'inquiry',
    label: '문의하기',
    reason: 'PG 결제를 쓰지 않도록 설정되어 있어 결제 대신 문의로 받아요.',
  };
}

/**
 * 지금 금액 칸에 무엇이 들어가는가 — **파생값이다. 상품에 저장하지 않는다.**
 *
 * `amountFieldsLocked` 는 `text !== ''` 와 언제나 같다(술어는 하나다). 두 이름을 함께 두는 이유는
 * 호출부가 '표시' 를 하는지 '입력' 을 막는지 이름으로 드러내기 위해서다.
 */
function resolvePriceDisplay(pgSellable: boolean): {
  readonly text: string;
  readonly reason: string;
  readonly amountFieldsLocked: boolean;
} {
  if (pgSellable) {
    return {
      text: '',
      reason: '결제 연동이 되어 있어 판매가와 할인가를 그대로 노출해요.',
      amountFieldsLocked: false,
    };
  }
  return {
    text: DEFAULT_PRICE_INQUIRY_TEXT,
    reason: 'PG 결제를 쓰지 않도록 설정되어 있어 모든 금액이 가격문의로 대체돼요.',
    amountFieldsLocked: true,
  };
}

/**
 * 결제가 없을 때 잠기는 구획과 그 사유 — **결과가 아니라 원인**을 적는다.
 * '사용할 수 없습니다' 는 아무것도 알려 주지 않는다. 알아야 할 것은 '결제가 없어서' 다.
 */
const PG_LOCK_REASON = {
  points: '결제가 없어 적립이 발생하지 않아요. 저장된 적립 설정은 그대로 보존돼요.',
  coupons: '결제가 없어 쿠폰을 사용할 시점이 없어요. 저장된 쿠폰 사용 설정은 그대로 보존돼요.',
  shipping:
    '배송비는 결제 금액의 일부라 결제가 없는 동안에는 계산되지 않아요. 저장된 배송 설정은 그대로 보존돼요.',
} as const;

/** 구획 정의 — 좌측 레일의 한 줄이자 본문의 한 앵커. fields 로 '어느 구획에 오류가 있는지' 를 센다 */
const SECTIONS: readonly {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly string[];
}[] = [
  { id: 'product-section-basic', label: '기본 정보', fields: ['name', 'code', 'categoryId'] },
  {
    id: 'product-section-pricing',
    label: '가격 · 할인',
    fields: ['price', 'discountValue'],
  },
  { id: 'product-section-points', label: '적립금', fields: ['pointsRate', 'pointsAmount'] },
  { id: 'product-section-coupons', label: '쿠폰 사용', fields: [] },
  { id: 'product-section-options', label: '옵션 · 재고', fields: ['variants'] },
  { id: 'product-section-shipping', label: '배송', fields: ['shippingFee', 'shippingThreshold'] },
  { id: 'product-section-images', label: '이미지', fields: ['coverImageUrl', 'imageUrls'] },
  { id: 'product-section-content', label: '상세설명 · 검색태그', fields: ['description', 'tags'] },
];

/** 최초 활성 구획 id — 배열 인덱스 접근 대신 상수로 고정한다(noUncheckedIndexedAccess) */
const FIRST_SECTION_ID = 'product-section-basic';

/* ── 데모 데이터(실화면 store 픽스처 prd-1 을 폼 값으로 되돌린 형태) ─────────────────────────── */

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="${hue}"/><text x="80" y="64" font-family="sans-serif" font-size="14" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EDIT_COVER = svgDataUri('대표 이미지', 'steelblue');
const EDIT_GALLERY: readonly string[] = [
  svgDataUri('착용 컷', 'seagreen'),
  svgDataUri('디테일', 'peru'),
];

interface DemoVariant {
  readonly id: string;
  readonly optionValues: readonly string[];
  readonly sku: string;
  readonly addPrice: number;
  readonly stock: number;
  readonly soldOut: boolean;
}

interface SeedValues {
  readonly name: string;
  readonly code: string;
  readonly categoryId: string;
  readonly brand: string;
  readonly price: string;
  readonly discountType: DiscountType;
  readonly discountValue: string;
  readonly taxable: boolean;
  readonly saleStatus: SaleStatus;
  readonly displayed: boolean;
  /** 쿠폰 사용 가능 여부 — 상품별 오버라이드. 충돌하면 상품이 이긴다 */
  readonly couponsUsable: boolean;
  readonly pointsMode: PointsMode;
  readonly pointsRate: string;
  readonly pointsAmount: string;
  readonly shipMethod: string;
  readonly feeType: FeeType;
  readonly fee: string;
  readonly freeThreshold: string;
  readonly optionGroupNames: readonly string[];
  readonly variants: readonly DemoVariant[];
  readonly coverImageUrl: string;
  readonly imageUrls: readonly string[];
  readonly description: string;
  readonly tags: string;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  code: '',
  categoryId: '',
  brand: '',
  price: '',
  discountType: 'none',
  discountValue: '',
  taxable: true,
  saleStatus: 'on_sale',
  displayed: true,
  couponsUsable: true,
  pointsMode: 'rate',
  pointsRate: '1',
  pointsAmount: '',
  shipMethod: 'courier',
  feeType: 'conditional',
  fee: '3000',
  freeThreshold: '50000',
  optionGroupNames: [],
  variants: [
    { id: 'variant-single', optionValues: [], sku: '', addPrice: 0, stock: 0, soldOut: false },
  ],
  coverImageUrl: '',
  imageUrls: [],
  description: '',
  tags: '',
};

const EDIT_SEED: SeedValues = {
  name: '루미엔 경량 패딩 점퍼',
  code: 'LMN-PAD-001',
  categoryId: 'outer',
  brand: '루미엔',
  price: '129000',
  discountType: 'percent',
  discountValue: '20',
  taxable: true,
  saleStatus: 'on_sale',
  displayed: true,
  couponsUsable: true,
  pointsMode: 'rate',
  pointsRate: '2',
  pointsAmount: '',
  shipMethod: 'courier',
  feeType: 'conditional',
  fee: '3000',
  freeThreshold: '50000',
  optionGroupNames: ['색상', '사이즈'],
  variants: [
    {
      id: 'prd1-1',
      optionValues: ['블랙', 'S'],
      sku: 'LMN-PAD-001-블랙-S',
      addPrice: 0,
      stock: 12,
      soldOut: false,
    },
    {
      id: 'prd1-2',
      optionValues: ['블랙', 'M'],
      sku: 'LMN-PAD-001-블랙-M',
      addPrice: 0,
      stock: 8,
      soldOut: false,
    },
    {
      id: 'prd1-7',
      optionValues: ['베이지', 'S'],
      sku: 'LMN-PAD-001-베이지-S',
      addPrice: 3000,
      stock: 2,
      soldOut: false,
    },
    {
      id: 'prd1-8',
      optionValues: ['베이지', 'M'],
      sku: 'LMN-PAD-001-베이지-M',
      addPrice: 3000,
      stock: 0,
      soldOut: true,
    },
  ],
  coverImageUrl: EDIT_COVER,
  imageUrls: EDIT_GALLERY,
  description:
    '<p>가벼운 충전재로 <strong>보온성</strong>과 활동성을 모두 잡은 데일리 패딩이에요.</p><ul><li>초경량 충전재</li><li>발수 가공 원단</li></ul>',
  tags: '패딩, 겨울, 경량',
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly code?: string;
  readonly categoryId?: string;
  readonly price?: string;
  readonly discountValue?: string;
  readonly pointsRate?: string;
  readonly pointsAmount?: string;
  readonly shippingFee?: string;
  readonly shippingThreshold?: string;
  readonly coverImageUrl?: string;
  readonly description?: string;
}

const DEMO_ERRORS: FieldErrors = {
  name: '상품명을 입력하세요.',
  code: '상품코드(SKU)를 입력하세요.',
  categoryId: '카테고리를 선택하세요.',
  price: '판매가를 입력하세요.',
  coverImageUrl: '대표 이미지를 등록하세요.',
};

/* ── 순수 계산(실화면 store.finalPrice · earnedPoints 미러) ───────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');
const formatWon = (value: number): string => `${fmt(value)}원`;

/** 입력 중인 문자열 → 숫자(미리보기 전용) — '129,000' 에서 숫자만 건져낸다 */
const previewNumber = (raw: string): number => Number((raw.trim() || '0').replace(/\D/g, '')) || 0;

const finalPriceOf = (price: number, discountType: DiscountType, discountValue: number): number => {
  if (discountType === 'amount') return Math.max(0, price - discountValue);
  if (discountType === 'percent') return Math.round((price * (100 - discountValue)) / 100);
  return price;
};

const earnedPointsOf = (
  finalPrice: number,
  mode: PointsMode,
  rate: number,
  amount: number,
): number => {
  if (mode === 'none') return 0;
  if (mode === 'fixed') return Math.max(0, amount);
  return Math.floor((finalPrice * rate) / 100);
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

/** 좌: 구획 목차 레일 / 우: 폼 본문 + 미리보기 */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const railStyle: CSSProperties = {
  position: 'sticky',
  top: cssVar('space.5'),
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const railNoticeStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const railHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const railListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const railLinkStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.text.default') : cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
});

const invalidDotStyle: CSSProperties = {
  display: 'inline-block',
  width: cssVar('space.2'),
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.feedback.danger.border'),
};

const bodyColumnStyle: CSSProperties = {
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

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const optionGroupRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) minmax(0, 1fr)`,
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

const lockRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

// info Alert(파란 surface) 안의 링크 — action.primary(blue.600)는 그 배경(blue.200) 위 3.64:1 로
// 미달(axe color-contrast)이다. 그 surface 와 짝지어진 feedback.info.text(blue.800, 6.02:1)로 바꾼다.
const lockLinkStyle: CSSProperties = {
  color: cssVar('color.feedback.info.text'),
  textDecoration: 'underline',
  whiteSpace: 'nowrap',
};

/* ── 미리보기 스타일 ──────────────────────────────────────────────────────────────────────── */

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

// 숨김(displayed=false)을 opacity 로 흐리지 않는다 — 컨테이너 opacity 는 안의 글자(상품명·가격·브랜드)를
// 배경으로 합성해 대비를 4.5:1 아래로 떨어뜨린다(axe color-contrast). 숨김 사실은 아래 캡션이 글자로 전한다.
const previewCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: `calc(${cssVar('space.6')} * 9)`,
  padding: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const thumbStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
};

const thumbImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const previewBrandStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const previewNameStyle: CSSProperties = {
  margin: 0,
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
};

const priceRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: cssVar('space.2'),
};

const rateStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.feedback.danger.text'),
};

const finalPriceStyle: CSSProperties = {
  ...typography('typography.title.md'),
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
};

const originalPriceStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  textDecorationLine: 'line-through',
  fontVariantNumeric: 'tabular-nums',
};

const previewCaptionStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
};

/**
 * 고객이 누르는 자리 — 미리보기라 **진짜 버튼이 아니다.** DS 버튼의 시각 토큰만 빌린 <span> 이다:
 * 누를 것이 없는 자리에 버튼을 두면 눌러 보고 아무 일도 없는 것을 확인하게 된다.
 *
 * 결제로 가는 버튼은 주 동작(primary), 문의로 가는 버튼은 보조(secondary) — 위계가 갈린다.
 */
const ctaChipStyle = (kind: CheckoutCtaKind): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  gap: cssVar('component.button.gap'),
  paddingTop: cssVar('component.button.padding-y'),
  paddingBottom: cssVar('component.button.padding-y'),
  paddingLeft: cssVar('component.button.padding-x'),
  paddingRight: cssVar('component.button.padding-x'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: kind === 'purchase' ? 'transparent' : cssVar('color.border.default'),
  borderRadius: cssVar('component.button.radius'),
  background:
    kind === 'purchase' ? cssVar('component.button.background') : cssVar('color.surface.default'),
  color: kind === 'purchase' ? cssVar('component.button.text') : cssVar('color.text.default'),
  ...typography('typography.label.md'),
  whiteSpace: 'nowrap',
});

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function FormCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section id={id} aria-labelledby={titleId}>
      <Card aria-labelledby={titleId}>
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

/* ── 잠금 안내(PgLockNotice 미러) ──────────────────────────────────────────────────────────
 *
 * 잠긴 구획이 **한 벌의 같은 모습**으로 말하게 한다: 사유 · 다음 행동(결제 설정) · 값 보존 약속
 * 셋은 언제나 같으므로 모양도 하나여야 한다. 톤은 info 다 — 잠금은 오류가 아니라 **설정의
 * 결과**이고, danger 로 칠하면 운영자는 고장으로 읽는다. */

function PgLockNotice({
  reason,
  children,
}: {
  readonly reason: string;
  /** 이 구획에서만 달라지는 한 줄 — 사유는 공용이고 결과만 구획마다 다르다 */
  readonly children?: ReactNode;
}) {
  return (
    <Alert tone="info">
      <div style={lockRowStyle}>
        <span>
          {reason}
          {children}
        </span>
        <a href="#payment-settings" style={lockLinkStyle}>
          결제 설정 열기
        </a>
        <a href="#product-inquiries" style={lockLinkStyle}>
          상품 문의 열기
        </a>
      </div>
    </Alert>
  );
}

/* ── 좌측 구획 목차(FormSectionNav 미러: aria-current + 오류 점) ───────────────────────────── */

function SectionNav({ activeId, errors }: { activeId: string; errors: FieldErrors }) {
  return (
    <aside style={railStyle}>
      <p style={railNoticeStyle}>
        구획을 누르면 해당 위치로 이동해요. 붉은 점이 붙은 구획에는 확인이 필요한 입력이 남아
        있어요.
      </p>
      <nav aria-label="상품 폼 구획 이동">
        <p style={railHeadingStyle}>구획</p>
        <ul style={railListStyle}>
          {SECTIONS.map((section) => {
            const active = section.id === activeId;
            const invalid = section.fields.some(
              (field) => errors[field as keyof FieldErrors] !== undefined,
            );
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  style={railLinkStyle(active)}
                  {...(active ? { 'aria-current': 'true' as const } : {})}
                >
                  <span>{section.label}</span>
                  {invalid && <span style={invalidDotStyle} aria-label="확인 필요" role="img" />}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/* ── 옵션 · SKU 매트릭스(Table 미러: 조합형 재고 표) ──────────────────────────────────────── */

function OptionMatrix({ seed }: { seed: SeedValues }) {
  const hasOptions = seed.optionGroupNames.length > 0;
  const totalStock = seed.variants.reduce((sum, variant) => sum + variant.stock, 0);

  const columns: TableProps['columns'] = [
    ...(hasOptions
      ? seed.optionGroupNames.map((name, index) => ({
          id: `opt-${String(index)}`,
          header: name,
          nowrap: true,
        }))
      : [{ id: 'kind', header: '구분', nowrap: true }]),
    { id: 'sku', header: 'SKU', nowrap: true },
    { id: 'addPrice', header: '추가금액(원)', align: 'end' as const },
    { id: 'stock', header: '재고', align: 'end' as const },
    { id: 'soldOut', header: '품절', nowrap: true },
  ];

  const rows: TableProps['rows'] = seed.variants.map((variant) => ({
    id: variant.id,
    cells: [
      ...(hasOptions
        ? variant.optionValues.map((value, index) => (
            <span key={`opt-${String(index)}`}>{value}</span>
          ))
        : [<span key="kind">단일 상품</span>]),
      <input
        key="sku"
        type="text"
        style={{ ...controlStyle(false), minWidth: `calc(${cssVar('space.6')} * 4)` }}
        defaultValue={variant.sku}
        aria-label={`${variant.optionValues.join(' ') || '단일'} SKU`}
      />,
      <span key="add-price">{fmt(variant.addPrice)}</span>,
      <span key="stock">{fmt(variant.stock)}</span>,
      <ToggleSwitch
        key="sold-out"
        checked={variant.soldOut}
        onChange={() => {
          /* 실화면: 개별 SKU 품절 처리 — 템플릿에서는 표시만 */
        }}
        label={`${variant.optionValues.join(' ') || '단일'} 품절 여부`}
        onLabel="품절"
        offLabel="판매"
      />,
    ],
  }));

  return (
    <div style={fieldStyle}>
      <span style={fieldLabelStyle}>옵션 · 재고(SKU)</span>
      <p style={hintStyle}>
        색상·사이즈 등 옵션을 추가하면 조합이 아래 표로 펼쳐져요. 옵션값은 쉼표(,)로 구분하세요.
        옵션이 없으면 단일 재고로 관리돼요. (최대 3개 옵션)
      </p>

      {hasOptions &&
        seed.optionGroupNames.map((name, index) => (
          <div key={name} style={optionGroupRowStyle}>
            <input
              type="text"
              style={controlStyle(false)}
              defaultValue={name}
              aria-label={`옵션 ${String(index + 1)} 이름`}
            />
            <input
              type="text"
              style={controlStyle(false)}
              defaultValue={index === 0 ? '블랙, 차콜, 베이지' : 'S, M, L'}
              aria-label={`옵션 ${String(index + 1)} 값`}
            />
          </div>
        ))}

      <span>
        <Button variant="secondary" size="md" iconLeft={<Icon name="plus-circle" />}>
          옵션 추가
        </Button>
      </span>

      <Table
        caption="옵션 조합별 SKU · 추가금액 · 재고 · 품절 여부를 관리하는 표예요."
        columns={columns}
        rows={rows}
      />

      <p style={hintStyle}>{`총 재고 ${fmt(totalStock)}개 · SKU ${fmt(seed.variants.length)}종`}</p>
    </div>
  );
}

/* ── 우측 실시간 미리보기(ProductCardPreview 미러) ───────────────────────────────────────── */

function ProductCardPreview({
  name,
  brand,
  coverImageUrl,
  price,
  discountType,
  discountValue,
  saleStatus,
  displayed,
  ctaLabel,
  ctaKind,
  priceText,
}: {
  readonly name: string;
  readonly brand: string;
  readonly coverImageUrl: string;
  readonly price: number;
  readonly discountType: DiscountType;
  readonly discountValue: number;
  readonly saleStatus: SaleStatus;
  readonly displayed: boolean;
  /**
   * 구매 버튼의 글자·성격 — **이 컴포넌트가 정하지 않는다.**
   * 결제 설정에 따라 '구매하기' 가 되기도 '문의하기' 가 되기도 한다(checkoutCta 하나가 정한다).
   */
  readonly ctaLabel: string;
  readonly ctaKind: CheckoutCtaKind;
  /**
   * 금액 자리에 넣을 문구 — 빈 문자열이면 금액을 그린다.
   * 두 축(결제 사용 여부 · 상품별 가격 표시)을 합치는 것은 resolvePriceText 하나뿐이다.
   */
  readonly priceText: string;
}) {
  const final = finalPriceOf(price, discountType, discountValue);
  const discounted = discountType !== 'none' && discountValue > 0 && final < price;
  const rate =
    discountType === 'percent'
      ? discountValue
      : price > 0
        ? Math.round((1 - final / price) * 100)
        : 0;
  const soldOut = saleStatus === 'sold_out';
  const statusMeta = SALE_STATUS_META[saleStatus];
  const trimmedImage = coverImageUrl.trim();

  return (
    <div>
      <div style={stageStyle}>
        <div style={previewCardStyle}>
          <div style={thumbStyle}>
            {trimmedImage !== '' ? (
              <img src={trimmedImage} alt="" style={thumbImageStyle} />
            ) : (
              <Icon name="image" />
            )}
          </div>
          <span style={previewBrandStyle}>{brand.trim() === '' ? '브랜드' : brand}</span>
          <p style={previewNameStyle}>{name.trim() === '' ? '상품명' : name}</p>
          {/* 금액 칸 — 문구로 대체된 상품은 할인율·정가까지 함께 감춘다.
              금액을 지우면서 '20% 할인' 만 남기면 고객은 무엇에서 20% 인지 알 수 없다. */}
          <div style={priceRowStyle}>
            {priceText === '' ? (
              <>
                {discounted && <span style={rateStyle}>{`${fmt(rate)}%`}</span>}
                <span style={finalPriceStyle}>{formatWon(final)}</span>
                {discounted && <span style={originalPriceStyle}>{formatWon(price)}</span>}
              </>
            ) : (
              <span style={finalPriceStyle}>{priceText}</span>
            )}
          </div>
          <div>
            <StatusBadge tone={soldOut ? 'warning' : statusMeta.tone} label={statusMeta.label} />
          </div>
          <span style={ctaChipStyle(ctaKind)}>{ctaLabel}</span>
        </div>
      </div>
      <p style={previewCaptionStyle}>
        {displayed
          ? '전시중 — 고객 스토어에 이 모습으로 노출돼요.'
          : '숨김 — 저장해도 고객에게 보이지 않아요.'}
      </p>
    </div>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface ProductFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
  /**
   * 축 A — 지금 이 사이트가 결제창을 열 수 있는가(전역 결제 설정의 결과).
   * false 면 미리보기 CTA 가 '문의하기' 로 수렴하고 적립·쿠폰·배송 구획이 잠긴다.
   */
  readonly pgSellable?: boolean;
}

function ProductFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
  pgSellable = true,
}: ProductFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [code, setCode] = useState(seed.code);
  const [brand, setBrand] = useState(seed.brand);
  const [categoryId, setCategoryId] = useState(seed.categoryId);
  const [saleStatus, setSaleStatus] = useState<SaleStatus>(seed.saleStatus);
  const [displayed, setDisplayed] = useState(seed.displayed);
  const [price, setPrice] = useState(seed.price);
  const [discountType, setDiscountType] = useState<DiscountType>(seed.discountType);
  const [discountValue, setDiscountValue] = useState(seed.discountValue);
  const [taxable, setTaxable] = useState(seed.taxable);
  const [couponsUsable, setCouponsUsable] = useState(seed.couponsUsable);
  const [pointsMode, setPointsMode] = useState<PointsMode>(seed.pointsMode);
  const [pointsRate, setPointsRate] = useState(seed.pointsRate);
  const [pointsAmount, setPointsAmount] = useState(seed.pointsAmount);
  const [shipMethod, setShipMethod] = useState(seed.shipMethod);
  const [feeType, setFeeType] = useState<FeeType>(seed.feeType);
  const [fee, setFee] = useState(seed.fee);
  const [freeThreshold, setFreeThreshold] = useState(seed.freeThreshold);
  const [coverImageUrl, setCoverImageUrl] = useState(seed.coverImageUrl);
  const [imageUrls, setImageUrls] = useState<readonly string[]>(seed.imageUrls);
  const [description, setDescription] = useState(seed.description);
  const [tags, setTags] = useState(seed.tags);

  /**
   * 카테고리는 2단계다 — 폼이 저장하는 값(categoryId)은 **최종 선택 하나**이고, 중분류를 고르면
   * 그 id, 고르지 않으면 대분류 id 가 들어간다. 두 셀렉트는 그 값에서 되짚어 그린다.
   */
  const selectedCategory = CATEGORIES.find((category) => category.id === categoryId);
  const categoryRootId =
    selectedCategory === undefined ? '' : (selectedCategory.parentId ?? selectedCategory.id);
  const categoryChildId =
    selectedCategory !== undefined && selectedCategory.parentId !== null ? selectedCategory.id : '';
  const categoryRootOptions = CATEGORIES.filter((category) => category.parentId === null);
  const categoryChildOptions =
    categoryRootId === ''
      ? []
      : CATEGORIES.filter((category) => category.parentId === categoryRootId);

  /* 결제 연동 상태 하나가 이 화면의 잠금 전부를 정한다 — 화면은 이 답만 그리고 조건을 다시 쓰지
     않는다. 잠금은 입력만 막는다: 저장된 판매가·할인율·과세·적립률·쿠폰·배송비는 그대로 남는다. */
  const cta = checkoutCta(pgSellable);
  const priceDisplay = resolvePriceDisplay(pgSellable);
  const priceText = priceDisplay.text;
  const amountFieldsLocked = priceDisplay.amountFieldsLocked;

  const isPercent = discountType === 'percent';
  const final = finalPriceOf(previewNumber(price), discountType, previewNumber(discountValue));
  const earned = earnedPointsOf(
    final,
    pointsMode,
    previewNumber(pointsRate),
    previewNumber(pointsAmount),
  );

  return (
    <div style={pageStyle}>
      <a href="#product-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '상품 수정' : '상품 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 목차로 구획을 오가고, 미리보기로 고객에게 보일 상품 카드를
          확인하세요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <div style={layoutStyle}>
          <SectionNav activeId={FIRST_SECTION_ID} errors={errors} />

          <div style={layoutStyle}>
            <div style={bodyColumnStyle}>
              {loadingDetail ? (
                <Card>
                  <div style={skeletonBodyStyle} aria-busy="true">
                    {[0, 1, 2, 3, 4, 5].map((row) => (
                      <Skeleton key={`row-${String(row)}`} />
                    ))}
                  </div>
                </Card>
              ) : (
                <>
                  {/* ── 기본 정보 ── */}
                  <FormCard id="product-section-basic" title="기본 정보">
                    <TextField
                      id="product-name"
                      label="상품명"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={PRODUCT_NAME_MAX}
                      placeholder="예: 루미엔 경량 패딩 점퍼"
                      error={errors.name ?? ''}
                    />

                    <div style={formRowStyle}>
                      <TextField
                        id="product-code"
                        label="상품코드(SKU)"
                        required
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        maxLength={PRODUCT_CODE_MAX}
                        placeholder="예: LMN-PAD-001"
                        error={errors.code ?? ''}
                      />
                      <TextField
                        id="product-brand"
                        label="브랜드"
                        value={brand}
                        onChange={(event) => setBrand(event.target.value)}
                        maxLength={PRODUCT_BRAND_MAX}
                        placeholder="예: 루미엔"
                      />
                    </div>

                    <div style={formRowStyle}>
                      <FormField
                        htmlFor="product-category"
                        label="카테고리 (대분류)"
                        required
                        {...(errors.categoryId !== undefined && { error: errors.categoryId })}
                      >
                        <SelectField
                          id="product-category"
                          value={categoryRootId}
                          isInvalid={errors.categoryId !== undefined}
                          onChange={(event) => setCategoryId(event.target.value)}
                        >
                          <option value="">대분류 선택</option>
                          {categoryRootOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>

                      {/* 2Depth — 고르지 않으면 대분류에 등록된다. 하위가 없는 대분류면 잠근다 */}
                      <FormField
                        htmlFor="product-category-child"
                        label="카테고리 (중분류)"
                        hint={
                          categoryRootId === ''
                            ? '대분류를 먼저 선택하세요.'
                            : categoryChildOptions.length === 0
                              ? '이 대분류에는 중분류가 없어요.'
                              : '선택하지 않으면 대분류에 등록돼요.'
                        }
                      >
                        <SelectField
                          id="product-category-child"
                          value={categoryChildId}
                          disabled={categoryChildOptions.length === 0}
                          onChange={(event) =>
                            setCategoryId(
                              event.target.value === '' ? categoryRootId : event.target.value,
                            )
                          }
                        >
                          <option value="">
                            {categoryChildOptions.length === 0 ? '없음' : '선택 안 함'}
                          </option>
                          {categoryChildOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>

                      <FormField htmlFor="product-sale-status" label="판매상태" required>
                        <SelectField
                          id="product-sale-status"
                          value={saleStatus}
                          onChange={(event) => setSaleStatus(event.target.value as SaleStatus)}
                        >
                          {SALE_STATUS_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>
                    </div>

                    <div style={fieldStyle}>
                      <span style={fieldLabelStyle}>전시상태</span>
                      <ToggleSwitch
                        checked={displayed}
                        onChange={setDisplayed}
                        label="상품 전시 여부"
                        onLabel="전시중"
                        offLabel="숨김"
                      />
                    </div>
                  </FormCard>

                  {/* ── 가격 · 할인 ── */}
                  <FormCard id="product-section-pricing" title="가격 · 할인">
                    {/* 금액 칸이 왜 잠겼는지 — 사유·다음 행동·값 보존 약속을 한 벌로 말한다.
                        상품마다 고르던 '가격 표시' 라디오는 사라졌다: 표시는 고르는 값이 아니라
                        결제 연동 상태의 결과다. */}
                    {amountFieldsLocked && (
                      <PgLockNotice reason={priceDisplay.reason}>
                        {' 입력한 판매가·할인·과세 구분은 지워지지 않고 그대로 보존돼요.'}
                      </PgLockNotice>
                    )}

                    <div style={formRowStyle}>
                      <TextField
                        id="product-price"
                        label="판매가 (원)"
                        required
                        inputMode="numeric"
                        value={price}
                        disabled={amountFieldsLocked}
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="예: 129000"
                        error={errors.price ?? ''}
                      />
                      {/* 할인·과세도 금액이 노출될 때만 의미가 있다 — 잠그되 값은 그대로 둔다 */}
                      <FormField htmlFor="product-discount-type" label="할인 방식">
                        <SelectField
                          id="product-discount-type"
                          value={discountType}
                          disabled={amountFieldsLocked}
                          onChange={(event) => setDiscountType(event.target.value as DiscountType)}
                        >
                          {DISCOUNT_TYPE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>
                      <TextField
                        id="product-discount-value"
                        label={isPercent ? '할인율 (%)' : '할인 금액 (원)'}
                        inputMode="numeric"
                        value={discountValue}
                        onChange={(event) => setDiscountValue(event.target.value)}
                        disabled={amountFieldsLocked || discountType === 'none'}
                        placeholder={isPercent ? '예: 20' : '예: 10000'}
                        error={errors.discountValue ?? ''}
                      />
                    </div>

                    <div style={fieldStyle}>
                      <span style={fieldLabelStyle}>과세 여부</span>
                      <ToggleSwitch
                        checked={taxable}
                        onChange={setTaxable}
                        disabled={amountFieldsLocked}
                        label="과세 상품 여부"
                        onLabel="과세"
                        offLabel="면세"
                      />
                    </div>
                  </FormCard>

                  {/* ── 적립금 ── */}
                  <FormCard id="product-section-points" title="적립금">
                    {!pgSellable && <PgLockNotice reason={PG_LOCK_REASON.points} />}
                    <div style={formRowStyle}>
                      <FormField htmlFor="product-points-mode" label="적립 방식">
                        <SelectField
                          id="product-points-mode"
                          value={pointsMode}
                          disabled={!pgSellable}
                          onChange={(event) => setPointsMode(event.target.value as PointsMode)}
                        >
                          {POINTS_MODE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>

                      {pointsMode === 'rate' && (
                        <FormField
                          htmlFor="product-points-rate"
                          label="적립률 (%)"
                          required
                          hint="전역 적립금 정책의 기본 적립률을 이 상품에 한해 덮어써요."
                          {...(errors.pointsRate !== undefined && { error: errors.pointsRate })}
                        >
                          <input
                            id="product-points-rate"
                            type="text"
                            inputMode="numeric"
                            style={controlStyle(errors.pointsRate !== undefined)}
                            value={pointsRate}
                            placeholder="예: 2"
                            disabled={!pgSellable}
                            onChange={(event) => setPointsRate(event.target.value)}
                          />
                        </FormField>
                      )}
                      {pointsMode === 'fixed' && (
                        <FormField
                          htmlFor="product-points-amount"
                          label="적립액 (원)"
                          required
                          hint="판매가와 무관하게 이 금액을 적립해요."
                          {...(errors.pointsAmount !== undefined && { error: errors.pointsAmount })}
                        >
                          <input
                            id="product-points-amount"
                            type="text"
                            inputMode="numeric"
                            style={controlStyle(errors.pointsAmount !== undefined)}
                            value={pointsAmount}
                            placeholder="예: 2000"
                            disabled={!pgSellable}
                            onChange={(event) => setPointsAmount(event.target.value)}
                          />
                        </FormField>
                      )}
                    </div>
                    <p style={hintStyle}>
                      {pointsMode === 'none'
                        ? '이 상품은 적립금을 지급하지 않아요.'
                        : `이 상품 1개 구매 시 ${fmt(earned)}P 적립돼요. (할인 반영 최종가 기준)`}
                    </p>
                  </FormCard>

                  {/* ── 쿠폰 사용 설정 ──
                      쿠폰 사용 가능 여부는 **상품의 원가 사실**이다 — 특가·역마진 상품은 마진이
                      이미 0 이라 그 위에 할인이 얹히면 팔수록 손해다. 쿠폰 화면에서 상품을 하나씩
                      빼는 것으로는 표현되지 않는다(내일 만드는 새 쿠폰까지 자동으로 막아야 한다). */}
                  <FormCard id="product-section-coupons" title="쿠폰 사용">
                    {!pgSellable && <PgLockNotice reason={PG_LOCK_REASON.coupons} />}
                    <div style={fieldStyle}>
                      <span style={fieldLabelStyle}>쿠폰 사용 가능 여부</span>
                      <ToggleSwitch
                        checked={couponsUsable}
                        onChange={setCouponsUsable}
                        disabled={!pgSellable}
                        label="이 상품에 쿠폰을 쓸 수 있는가"
                        onLabel="사용 가능"
                        offLabel="사용 불가"
                      />
                    </div>
                    <p style={hintStyle}>
                      쿠폰이 이 상품을 대상으로 지목해도 여기서 막아 두면{' '}
                      <strong>상품이 이겨요</strong>. 다만 조용히 이기지는 않아요 — 어느 쿠폰이
                      무력해지는지 저장 전에 경고해요.
                    </p>
                  </FormCard>

                  {/* ── 옵션 · 재고(SKU) ── */}
                  <FormCard id="product-section-options" title="옵션 · 재고">
                    <OptionMatrix seed={seed} />
                  </FormCard>

                  {/* ── 배송 ── */}
                  <FormCard id="product-section-shipping" title="배송">
                    {!pgSellable && <PgLockNotice reason={PG_LOCK_REASON.shipping} />}
                    <div style={formRowStyle}>
                      <FormField htmlFor="product-ship-method" label="배송 방식">
                        <SelectField
                          id="product-ship-method"
                          value={shipMethod}
                          disabled={!pgSellable}
                          onChange={(event) => setShipMethod(event.target.value)}
                        >
                          {SHIPPING_METHOD_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>
                      <FormField htmlFor="product-ship-fee-type" label="배송비 정책">
                        <SelectField
                          id="product-ship-fee-type"
                          value={feeType}
                          disabled={!pgSellable}
                          onChange={(event) => setFeeType(event.target.value as FeeType)}
                        >
                          {SHIPPING_FEE_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>
                    </div>

                    {feeType !== 'free' && (
                      <div style={formRowStyle}>
                        <TextField
                          id="product-ship-fee"
                          label="기본 배송비 (원)"
                          required
                          inputMode="numeric"
                          value={fee}
                          onChange={(event) => setFee(event.target.value)}
                          placeholder="예: 3000"
                          disabled={!pgSellable}
                          error={errors.shippingFee ?? ''}
                        />
                        {feeType === 'conditional' && (
                          <FormField
                            htmlFor="product-ship-threshold"
                            label="무료배송 기준 (원)"
                            required
                            hint="이 금액 이상 주문 시 무료배송"
                            {...(errors.shippingThreshold !== undefined && {
                              error: errors.shippingThreshold,
                            })}
                          >
                            <input
                              id="product-ship-threshold"
                              type="text"
                              inputMode="numeric"
                              style={controlStyle(errors.shippingThreshold !== undefined)}
                              value={freeThreshold}
                              placeholder="예: 50000"
                              disabled={!pgSellable}
                              onChange={(event) => setFreeThreshold(event.target.value)}
                            />
                          </FormField>
                        )}
                      </div>
                    )}
                  </FormCard>

                  {/* ── 이미지 ── */}
                  <FormCard id="product-section-images" title="이미지">
                    <ImageUploadField
                      label="대표 이미지"
                      required
                      value={coverImageUrl}
                      onChange={setCoverImageUrl}
                      hint="목록에는 노출되지 않아요 — 상세/미리보기의 대표 이미지예요."
                      error={errors.coverImageUrl ?? ''}
                    />
                    <ImageGalleryField
                      label="상세 이미지"
                      values={imageUrls}
                      onChange={setImageUrls}
                      maxFiles={MAX_PRODUCT_IMAGES}
                      hint={`상품 상세를 보여줄 이미지를 여러 장 올릴 수 있어요. 최대 ${String(MAX_PRODUCT_IMAGES)}장.`}
                    />
                  </FormCard>

                  {/* ── 상세설명 · 검색태그 ── */}
                  <FormCard id="product-section-content" title="상세설명 · 검색태그">
                    <RichTextField
                      label="상세설명"
                      value={description}
                      onChange={setDescription}
                      maxLength={PRODUCT_DESCRIPTION_MAX}
                      placeholder="상품의 소재·핏·관리법 등 상세 정보를 입력하세요."
                      rows={6}
                      hint="굵게·기울임·제목·목록·링크·이미지를 쓸 수 있어요. 글자 수를 셀 때 서식은 빼요."
                      error={errors.description ?? ''}
                    />
                    <FormField
                      htmlFor="product-tags"
                      label="검색 태그"
                      hint="쉼표(,)로 구분해 입력하세요. 예: 패딩, 겨울, 경량"
                    >
                      <input
                        id="product-tags"
                        type="text"
                        style={controlStyle(false)}
                        value={tags}
                        onChange={(event) => setTags(event.target.value)}
                      />
                    </FormField>
                  </FormCard>
                </>
              )}
            </div>

            {/* ── 우측 실시간 미리보기 ── */}
            <FormCard id="product-preview" title="고객 노출 미리보기">
              <ProductCardPreview
                name={name}
                brand={brand}
                coverImageUrl={coverImageUrl}
                price={previewNumber(price)}
                discountType={discountType}
                discountValue={previewNumber(discountValue)}
                saleStatus={saleStatus}
                displayed={displayed}
                ctaLabel={cta.label}
                ctaKind={cta.kind}
                priceText={priceText}
              />
              <p style={hintStyle}>{cta.reason}</p>
            </FormCard>
          </div>
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

/** 정상(등록): 빈 폼 — 신규 상품 입력 */
export const Default: Story = {
  render: () => <ProductFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(옵션 매트릭스 · 대표/상세 이미지 미리보기 포함) */
export const Edit: Story = {
  render: () => <ProductFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <ProductFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 + 좌측 구획 오류 점 노출 */
export const ValidationError: Story = {
  render: () => <ProductFormScreen errors={DEMO_ERRORS} />,
};

/**
 * 결제 미사용: **금액이 이미 설정돼 있어도** 전부 가격문의로 대체된다 — 상품마다 고르는 축은 없다.
 *
 * 판매가·할인·과세 입력이 잠기고 미리보기 CTA 가 '문의하기' 로 바뀌며, 적립금·쿠폰·배송 구획도
 * 함께 잠긴다(술어는 하나다). **값은 그대로 보존**된다 — 판매가 129,000원 · 할인 20% · 적립률 2% ·
 * 조건부 무료 3,000원이 칸에 그대로 남아 있고, 결제를 다시 켜면 그대로 살아난다.
 */
export const PgOff: Story = {
  render: () => <ProductFormScreen isEdit seed={EDIT_SEED} pgSellable={false} />,
};
