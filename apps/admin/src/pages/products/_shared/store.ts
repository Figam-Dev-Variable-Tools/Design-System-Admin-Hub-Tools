// 상품 도메인 모델 · 픽스처 · 순수 규칙
//
// [왜 섹션 내부 _shared 인가] 상품 화면과 카테고리 화면이 같은 상태를 공유한다: 상품은 카테고리를
// 참조하고, 카테고리 삭제는 그 카테고리를 쓰는 상품이 있으면 막힌다(사용 중 차단 — 포트폴리오와 같은 결).
// 두 data-source 가 서로를 import 하면 순환이 되므로 픽스처와 순수 규칙을 이 잎 모듈 한 곳에 모은다.
// (pages/products 한 페이지 안이라 페이지 간 결합이 아니다 — page-coupling 은 pages/<첫 세그먼트> 단위다.)
//
// [엔터프라이즈 상품 모델 — 국내 커머스 어드민(카페24·고도몰·스마트스토어 셀러센터) 관례를 따른다]
//   기본정보(상품명·상품코드·카테고리·브랜드) · 판매/전시상태 · 가격·할인 · 옵션/SKU(조합형) ·
//   재고(옵션별) · 배송 · 이미지(대표+상세 다중) · 상세설명 · 검색태그. 옵션·가격정책은 확장 가능하게 열어 둔다.
//
// [백엔드 없음] 실제 네트워크 0건 — mutable 배열을 아래 쓰기 함수가 갱신한다. 연동 지점은 각 화면
// data-source.ts 의 // TODO(backend) 주석이다. 정본이 서버로 옮겨가면 이 배열이 서버 상태로 바뀐다.
//
// [가격 '표시' 는 상품이 갖지 않는다 — 이 모델에서 걷어낸 축]
// 예전에는 상품마다 `priceDisplay`('금액 노출' / '가격문의')와 `inquiryText` 를 저장했다. 운영 요구로
// 그 선택이 사라졌다 — 금액을 노출하는가는 **사이트 전역 결제 연동 상태의 결과**이고, 그 답은
// shared/commerce 의 resolvePriceDisplay 하나가 낸다. 저장 필드로 남겨 두면 아무도 설정할 수 없는
// 값이 연동 상태와 어긋난 채 남아, 어느 쪽이 진실인지 알 수 없게 된다(파생값은 저장하지 않는다).
// **판매가·할인·과세는 그대로 남는다** — 잠금은 입력만 막고 값은 보존한다.

/* ── 카테고리 ─────────────────────────────────────────────────────────────── */

/**
 * 상품 카테고리 — **최대 2단계**(대분류 → 중분류).
 *
 * `parentId === null` 이면 1Depth(대분류), 값이 있으면 그 대분류의 2Depth(중분류)다.
 * 3단계는 만들지 않는다 — 2Depth 를 부모로 지정하려는 시도는 저장소가 막는다(addProductCategory).
 */
export interface ProductCategory {
  readonly id: string;
  readonly label: string;
  /** 상위 카테고리 id. null 이면 최상위(1Depth) */
  readonly parentId: string | null;
}

/** 카테고리 + 사용 중 상품 수 — 삭제 차단 판단·목록 배지에 쓴다 */
export interface ProductCategoryUsage extends ProductCategory {
  readonly productCount: number;
  /** 하위(2Depth)를 가진 대분류인가 — 있으면 삭제를 막는다 */
  readonly hasChildren: boolean;
}

/* ── 가격 정책 (확장 가능하게 분리) ───────────────────────────────────────── */

/** 할인 방식 — 없음/정액/정률. 새 방식(쿠폰연동 등)이 붙어도 이 유니온만 넓힌다. */
export type DiscountType = 'none' | 'amount' | 'percent';

interface ProductPricing {
  /** 판매가(정가) — 원 */
  readonly price: number;
  readonly discountType: DiscountType;
  /** 할인 값 — amount 면 원, percent 면 % (none 이면 0) */
  readonly discountValue: number;
  /** 과세 여부 — 과세/면세 */
  readonly taxable: boolean;
}

/* ── 옵션 / SKU(변형) ─────────────────────────────────────────────────────── */

/** 옵션 그룹 — '색상: [블랙, 화이트]' 처럼 이름 + 값 목록. 조합형 옵션의 축이다. */
export interface ProductOptionGroup {
  readonly id: string;
  readonly name: string;
  readonly values: readonly string[];
}

/**
 * SKU(옵션 조합) — 옵션 그룹들의 데카르트 곱 한 칸.
 * optionValues 는 optionGroups 순서에 정렬된다(['블랙','M']). 옵션이 없으면 빈 배열(단일 SKU).
 */
export interface ProductVariant {
  readonly id: string;
  /** 관리용 SKU 코드 */
  readonly sku: string;
  readonly optionValues: readonly string[];
  /** 옵션 추가금액 — 원(음수 가능: 할인 조합) */
  readonly addPrice: number;
  readonly stock: number;
  /** 개별 품절 처리 — 재고와 별개로 노출만 막는다 */
  readonly soldOut: boolean;
}

/* ── 상품 ─────────────────────────────────────────────────────────────────── */

/* ── 배송 (상품별 배송 설정 — 정책 화면과 별개의 개별 상품 오버라이드) ─────── */

/** 배송 방식 — 택배/직접배송/방문수령 */
type ShippingMethod = 'courier' | 'direct' | 'pickup';
/** 배송비 정책 — 무료/유료/조건부무료 */
type ShippingFeeType = 'free' | 'paid' | 'conditional';

interface ProductShipping {
  readonly method: ShippingMethod;
  readonly feeType: ShippingFeeType;
  /** 유료·조건부의 기본 배송비 — 원 */
  readonly fee: number;
  /** 조건부무료 기준 금액 — 이 금액 이상 주문 시 무료(원). feeType==='conditional' 에서만 의미 */
  readonly freeThreshold: number;
}

/* ── 적립금 (상품별 적립 설정 — 정책 화면과 별개의 개별 상품 오버라이드) ──── */

/**
 * 적립 방식 — 정률(%)/정액(원)/미적용.
 *
 * [왜 상품별인가] 적립률은 상품마다 다르다 — 마진이 낮은 특가 상품은 적립을 빼고(none), 밀어주는
 * 신상품은 정률을 올리며, 사은품 성격의 상품은 정액을 준다. 전역 정책 하나로는 표현되지 않는다.
 *
 * [전역 정책과의 관계 — 배송과 같은 결] `/products/points` 의 적립금 정책은 여전히 전역이다:
 * 기본 적립률(새 상품의 초기값 — DEFAULT_POINTS)과 **상품에 속하지 않는** 규칙(회원가입 적립금 ·
 * 사용 단위 · 최소 사용 · 1회 사용 한도 · 유효기간)을 소유한다. 여기 값은 그 기본 적립률을 상품
 * 단위로 덮어쓰는 오버라이드이며, 배송(ProductShipping ↔ /products/shipping)과 정확히 같은 관계다.
 */
export type PointsEarnMode = 'rate' | 'fixed' | 'none';

interface ProductPoints {
  readonly mode: PointsEarnMode;
  /** 적립률 — % (mode==='rate' 에서만 의미) */
  readonly rate: number;
  /** 정액 적립액 — 원 (mode==='fixed' 에서만 의미) */
  readonly amount: number;
}

/* ── 쿠폰 사용 설정 (상품별 — 쿠폰 화면의 '발급 대상' 과 짝을 이룬다) ─────── */

/**
 * 이 상품에 쿠폰을 어떻게 허용하는가.
 *
 * - `all`     : 사용 가능한 모든 쿠폰을 받는다(기본값)
 * - `include` : 여기 고른 쿠폰**만** 받는다 (기획전 전용 쿠폰 등)
 * - `exclude` : 여기 고른 쿠폰만 **못 받는다** (전 상품 쿠폰에서 이 상품만 빼는 흔한 운영)
 */
export type ProductCouponMode = 'all' | 'include' | 'exclude';

export interface ProductCouponPolicy {
  /**
   * 쿠폰 사용 가능 여부 — false 면 **어떤 쿠폰도** 이 상품에 붙지 않는다.
   *
   * [왜 이 축이 따로 있나] 쿠폰 불가 상품은 실재한다: 특가·공동구매·역마진 사은품은 마진이
   * 이미 0 이라 그 위에 할인이 얹히면 팔수록 손해다. 목록에서 쿠폰을 하나씩 빼는 것(exclude)으로는
   * 표현되지 않는다 — 내일 만드는 새 쿠폰까지 자동으로 막아야 하기 때문이다.
   */
  readonly usable: boolean;
  readonly mode: ProductCouponMode;
  /** mode 가 include/exclude 일 때 고른 쿠폰 id 들. all 이면 빈 배열 */
  readonly couponIds: readonly string[];
}

/** 새 상품의 쿠폰 기본값 — 받는 쪽으로 연다(막는 것은 명시적 결정이어야 한다) */
export const DEFAULT_COUPONS: ProductCouponPolicy = {
  usable: true,
  mode: 'all',
  couponIds: [],
};

/**
 * 이 상품에 이 쿠폰을 쓸 수 있는가 — **주문 시점 판정의 정본**.
 *
 * [상품이 이긴다 — 충돌의 승자를 여기서 정한다] 쿠폰이 자기 '발급 대상' 으로 이 상품을 지목해도
 * `usable === false` 면 false 다. 쿠폰은 **캠페인**(기간이 끝나면 사라진다)이고 쿠폰 불가는
 * **상품의 원가 사실**(마진이 없다)이라, 둘이 어긋날 때 손해를 보는 쪽은 언제나 상품이다.
 * 그래서 계산은 상품 편에서 끝내고, 어긋났다는 사실은 화면이 경고로 드러낸다(조용히 지지 않는다).
 */
export function productAllowsCoupon(policy: ProductCouponPolicy, couponId: string): boolean {
  if (!policy.usable) return false;
  if (policy.mode === 'include') return policy.couponIds.includes(couponId);
  if (policy.mode === 'exclude') return !policy.couponIds.includes(couponId);
  return true;
}

/** 판매상태(다중) — 판매중/품절/판매중지. 전시상태(displayed)는 이진 토글로 별도. */
export type ProductSaleStatus = 'on_sale' | 'sold_out' | 'stopped';

export interface Product {
  readonly id: string;
  readonly name: string;
  /** 상품코드(대표 SKU) — 관리·검색 키 */
  readonly code: string;
  readonly categoryId: string;
  /** 조회 시점의 카테고리 라벨(비정규화) — 목록에 바로 쓴다 */
  readonly categoryLabel: string;
  /** 브랜드 — 가상 표기(실명 아님) */
  readonly brand: string;
  readonly pricing: ProductPricing;
  readonly saleStatus: ProductSaleStatus;
  /** 전시상태 — 목록에서 바로 토글한다(전시중/숨김) */
  readonly displayed: boolean;
  readonly optionGroups: readonly ProductOptionGroup[];
  readonly variants: readonly ProductVariant[];
  readonly shipping: ProductShipping;
  /** 상품별 적립 설정 — 전역 적립금 정책의 기본 적립률을 이 상품에 한해 덮어쓴다 */
  readonly points: ProductPoints;
  /** 쿠폰 사용 설정 — 쿠폰 화면의 '발급 대상' 과 어긋나면 이쪽이 이긴다(productAllowsCoupon) */
  readonly coupons: ProductCouponPolicy;
  /** 대표 이미지 — 목록엔 넣지 않는다(상세/폼 전용) */
  readonly coverImageUrl: string;
  /** 상세 이미지 다중 */
  readonly imageUrls: readonly string[];
  /**
   * 상세설명 — **sanitize 된 HTML** 이다(평문 아님). 폼이 RichTextField(Tiptap)로 받고
   * 저장 지점에서 sanitizeRichText 를 지난 값만 여기 들어온다.
   *
   * textarea 시절의 평문 값이 남아 있을 수 있다 — 읽는 쪽은 ensureRichText 로 승격해서
   * 쓴다(toProductInput 이 그렇게 한다). 길이 상한(PRODUCT_DESCRIPTION_MAX)은 마크업이
   * 아니라 **평문 길이**에 건다 — richTextLength 참조.
   */
  readonly description: string;
  /** 검색 태그 */
  readonly tags: readonly string[];
}

export interface ProductInput {
  readonly name: string;
  readonly code: string;
  readonly categoryId: string;
  readonly brand: string;
  readonly pricing: ProductPricing;
  readonly saleStatus: ProductSaleStatus;
  readonly displayed: boolean;
  readonly optionGroups: readonly ProductOptionGroup[];
  readonly variants: readonly ProductVariant[];
  readonly shipping: ProductShipping;
  readonly points: ProductPoints;
  readonly coupons: ProductCouponPolicy;
  readonly coverImageUrl: string;
  readonly imageUrls: readonly string[];
  readonly description: string;
  readonly tags: readonly string[];
}

/** 새 상품의 배송 기본값 — 조건부 무료(5만원 이상 무료, 미만 3,000원) */
export const DEFAULT_SHIPPING: ProductShipping = {
  method: 'courier',
  feeType: 'conditional',
  fee: 3000,
  freeThreshold: 50000,
};

/**
 * 새 상품의 적립 기본값 — 전역 정책의 '기본 적립률'(1%)을 그대로 물려받는다.
 * DEFAULT_SHIPPING 과 같은 자리다: 정책 화면이 기본값을 정하고, 상품이 필요할 때만 덮어쓴다.
 */
export const DEFAULT_POINTS: ProductPoints = { mode: 'rate', rate: 1, amount: 0 };

export const PRODUCT_NAME_MAX = 100;
export const PRODUCT_CODE_MAX = 40;
export const PRODUCT_BRAND_MAX = 40;
export const PRODUCT_DESCRIPTION_MAX = 2000;
export const PRODUCT_PRICE_MAX = 100_000_000;
export const PRODUCT_STOCK_MAX = 999_999;
/** 상품별 적립률 상한 — % (전역 정책의 적립률과 같은 범위) */
export const PRODUCT_POINTS_RATE_MAX = 100;
export const MAX_PRODUCT_IMAGES = 10;
export const MAX_OPTION_GROUPS = 3;
export const MAX_TAGS = 20;

/** 재고 부족 경고 임계값 — 이 값 미만이면 목록에 '재고 부족' 경고를 띄운다 */
const LOW_STOCK_THRESHOLD = 10;

/** 카테고리 필터의 '전체' 값 */
export const PRODUCT_FILTER_ALL = 'all';

/* ── 순수 규칙 (재고 합산·상태 파생 — 테스트가 직접 부른다) ────────────────── */

/** 총 재고 — 옵션이 있으면 SKU 재고 합, 없으면 단일 SKU 재고 */
export function totalStock(product: Pick<Product, 'variants'>): number {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

/** 할인 계산에 필요한 가격 조각 — 과세 여부는 최종가에 영향을 주지 않는다 */
type PriceFields = Pick<ProductPricing, 'price' | 'discountType' | 'discountValue'>;

/** 최종 판매가(할인 반영) — 목록·미리보기·적립 계산이 함께 쓴다 */
export function finalPrice(pricing: PriceFields): number {
  if (pricing.discountType === 'amount') {
    return Math.max(0, pricing.price - pricing.discountValue);
  }
  if (pricing.discountType === 'percent') {
    return Math.round((pricing.price * (100 - pricing.discountValue)) / 100);
  }
  return pricing.price;
}

/** 할인율(%) — 정률이면 그대로, 정액이면 환산. 배지 표기에 쓴다. 0 이면 할인 없음 */
export function discountRate(pricing: ProductPricing): number {
  if (pricing.price <= 0) return 0;
  if (pricing.discountType === 'percent') return pricing.discountValue;
  if (pricing.discountType === 'amount') {
    return Math.round((pricing.discountValue / pricing.price) * 100);
  }
  return 0;
}

/**
 * 이 상품 1개를 살 때 쌓이는 적립 포인트(원 단위 절사).
 *
 * 기준은 **할인 반영 최종가**다 — 정가로 적립하면 할인 상품이 실결제액보다 많은 포인트를 준다.
 * (전역 정책의 '적립 기준'(실결제금액/주문금액)은 주문 단위 계산에 쓰이고, 여기 미리보기는
 * 상품 1개 기준의 실결제 근사값을 보여 준다.)
 * 미적용이면 0, 정액이면 금액 그대로, 정률이면 최종가 × 적립률.
 */
export function earnedPoints(pricing: PriceFields, points: ProductPoints): number {
  if (points.mode === 'none') return 0;
  if (points.mode === 'fixed') return Math.max(0, points.amount);
  return Math.floor((finalPrice(pricing) * points.rate) / 100);
}

/** 재고 부족(품절은 아니지만 임계값 미만) — 목록 경고 배지 판단 */
export function isLowStock(product: Pick<Product, 'variants' | 'saleStatus'>): boolean {
  if (product.saleStatus === 'stopped') return false;
  const stock = totalStock(product);
  return stock > 0 && stock < LOW_STOCK_THRESHOLD;
}

/**
 * 옵션 그룹들 → SKU 조합 매트릭스(데카르트 곱).
 * 기존 variants 와 옵션값이 일치하면 재고·추가금·품절·SKU 를 보존한다(옵션 편집 시 입력 유실 방지).
 * 옵션 그룹이 없으면 단일 SKU 한 칸을 돌려준다.
 */
export function buildVariantMatrix(
  optionGroups: readonly ProductOptionGroup[],
  existing: readonly ProductVariant[],
  code: string,
): readonly ProductVariant[] {
  const groups = optionGroups.filter((group) => group.values.length > 0);
  if (groups.length === 0) {
    const single = existing[0];
    return [
      {
        id: single?.id ?? 'variant-single',
        sku: single?.sku ?? code,
        optionValues: [],
        addPrice: single?.addPrice ?? 0,
        stock: single?.stock ?? 0,
        soldOut: single?.soldOut ?? false,
      },
    ];
  }

  const combos = groups.reduce<string[][]>(
    (acc, group) => acc.flatMap((prefix) => group.values.map((value) => [...prefix, value])),
    [[]],
  );

  return combos.map((optionValues, index) => {
    const match = existing.find(
      (variant) =>
        variant.optionValues.length === optionValues.length &&
        variant.optionValues.every((value, position) => value === optionValues[position]),
    );
    const suffix = optionValues.join('-');
    return {
      id: match?.id ?? `variant-${String(index + 1)}`,
      sku: match?.sku ?? `${code}-${suffix}`,
      optionValues,
      addPrice: match?.addPrice ?? 0,
      stock: match?.stock ?? 0,
      soldOut: match?.soldOut ?? false,
    };
  });
}

/** 카테고리 필터('전체'면 전체) */
export function filterProducts(list: readonly Product[], categoryId: string): readonly Product[] {
  if (categoryId === PRODUCT_FILTER_ALL) return list;
  return list.filter((product) => product.categoryId === categoryId);
}

/** 판매상태 필터('전체'면 전체) */
export function filterBySaleStatus(
  list: readonly Product[],
  status: ProductSaleStatus | typeof PRODUCT_FILTER_ALL,
): readonly Product[] {
  if (status === PRODUCT_FILTER_ALL) return list;
  return list.filter((product) => product.saleStatus === status);
}

/** 상품명·상품코드·브랜드 검색(대소문자 무시) */
export function searchProducts(list: readonly Product[], keyword: string): readonly Product[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (product) =>
      product.name.toLowerCase().includes(needle) ||
      product.code.toLowerCase().includes(needle) ||
      product.brand.toLowerCase().includes(needle),
  );
}

/** 특정 카테고리를 쓰는 상품 수 — 카테고리 삭제 차단 판단 */
export function countProductsUsingCategory(categoryId: string, list: readonly Product[]): number {
  return list.filter((product) => product.categoryId === categoryId).length;
}

/**
 * 카테고리 id → 상품 수. 좌측 필터의 건수 배지가 쓴다.
 *
 * [건수는 다른 축의 필터를 반영하지 않는다] '아우터 12' 는 언제나 아우터 상품 전체 수다 —
 * 판매상태 필터를 걸었다고 이 숫자가 바뀌면, 운영자는 '지금 무엇을 걸러냈는지' 를 읽을 기준을
 * 잃는다(두 축이 서로의 건수를 흔든다). 회원 화면의 등급/그룹 건수와 같은 규칙이다.
 */
export function countProductsByCategory(
  list: readonly Product[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const product of list) {
    counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1;
  }
  return counts;
}

/** 판매상태 → 상품 수. 좌측 필터의 건수 배지가 쓴다 */
export function countProductsBySaleStatus(
  list: readonly Product[],
): Readonly<Record<ProductSaleStatus, number>> {
  const counts: Record<ProductSaleStatus, number> = { on_sale: 0, sold_out: 0, stopped: 0 };
  for (const product of list) {
    counts[product.saleStatus] += 1;
  }
  return counts;
}

/** 상품명 오름차순(가나다). 같은 이름은 id 로 안정 정렬. */
export function sortProducts(list: readonly Product[]): readonly Product[] {
  return [...list].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, 'ko-KR');
    if (byName !== 0) return byName;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/* ── 픽스처 (가상 데이터 — 실명 없음) ─────────────────────────────────────── */

let categories: ProductCategory[] = [
  // 1Depth (대분류)
  { id: 'outer', label: '아우터', parentId: null },
  { id: 'top', label: '상의', parentId: null },
  { id: 'bottom', label: '하의', parentId: null },
  { id: 'shoes', label: '신발', parentId: null },
  { id: 'acc', label: '액세서리', parentId: null },
  // 2Depth (중분류)
  { id: 'outer-coat', label: '코트', parentId: 'outer' },
  { id: 'outer-jacket', label: '재킷', parentId: 'outer' },
  { id: 'top-tee', label: '티셔츠', parentId: 'top' },
  { id: 'top-shirt', label: '셔츠', parentId: 'top' },
  { id: 'bottom-pants', label: '팬츠', parentId: 'bottom' },
  { id: 'bottom-skirt', label: '스커트', parentId: 'bottom' },
];

const labelOf = (categoryId: string): string =>
  categories.find((category) => category.id === categoryId)?.label ?? categoryId;

function singleVariant(sku: string, stock: number, soldOut = false): ProductVariant {
  return { id: `${sku}-v`, sku, optionValues: [], addPrice: 0, stock, soldOut };
}

let products: Product[] = [
  {
    id: 'prd-1',
    name: '루미엔 경량 패딩 점퍼',
    code: 'LMN-PAD-001',
    categoryId: 'outer',
    categoryLabel: '아우터',
    brand: '루미엔',
    pricing: {
      price: 129000,
      discountType: 'percent',
      discountValue: 20,
      taxable: true,
    },
    saleStatus: 'on_sale',
    displayed: true,
    optionGroups: [
      { id: 'og-color', name: '색상', values: ['블랙', '차콜', '베이지'] },
      { id: 'og-size', name: '사이즈', values: ['S', 'M', 'L'] },
    ],
    variants: [
      {
        id: 'prd1-1',
        sku: 'LMN-PAD-001-블랙-S',
        optionValues: ['블랙', 'S'],
        addPrice: 0,
        stock: 12,
        soldOut: false,
      },
      {
        id: 'prd1-2',
        sku: 'LMN-PAD-001-블랙-M',
        optionValues: ['블랙', 'M'],
        addPrice: 0,
        stock: 8,
        soldOut: false,
      },
      {
        id: 'prd1-3',
        sku: 'LMN-PAD-001-블랙-L',
        optionValues: ['블랙', 'L'],
        addPrice: 0,
        stock: 3,
        soldOut: false,
      },
      {
        id: 'prd1-4',
        sku: 'LMN-PAD-001-차콜-S',
        optionValues: ['차콜', 'S'],
        addPrice: 0,
        stock: 5,
        soldOut: false,
      },
      {
        id: 'prd1-5',
        sku: 'LMN-PAD-001-차콜-M',
        optionValues: ['차콜', 'M'],
        addPrice: 0,
        stock: 6,
        soldOut: false,
      },
      {
        id: 'prd1-6',
        sku: 'LMN-PAD-001-차콜-L',
        optionValues: ['차콜', 'L'],
        addPrice: 0,
        stock: 4,
        soldOut: false,
      },
      {
        id: 'prd1-7',
        sku: 'LMN-PAD-001-베이지-S',
        optionValues: ['베이지', 'S'],
        addPrice: 3000,
        stock: 2,
        soldOut: false,
      },
      {
        id: 'prd1-8',
        sku: 'LMN-PAD-001-베이지-M',
        optionValues: ['베이지', 'M'],
        addPrice: 3000,
        stock: 0,
        soldOut: true,
      },
      {
        id: 'prd1-9',
        sku: 'LMN-PAD-001-베이지-L',
        optionValues: ['베이지', 'L'],
        addPrice: 3000,
        stock: 1,
        soldOut: false,
      },
    ],
    shipping: { method: 'courier', feeType: 'conditional', fee: 3000, freeThreshold: 50000 },
    // 밀어주는 주력 상품 — 기본 적립률(1%)보다 높게 잡았다
    points: { mode: 'rate', rate: 2, amount: 0 },
    // 주력 상품이라 쿠폰을 가리지 않는다
    coupons: { usable: true, mode: 'all', couponIds: [] },
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: ['/fixtures/placeholder-image.svg'],
    description:
      '<p>가벼운 충전재로 <strong>보온성</strong>과 활동성을 모두 잡은 데일리 패딩이에요.</p><ul><li>초경량 충전재</li><li>발수 가공 원단</li></ul>',
    tags: ['패딩', '겨울', '경량'],
  },
  {
    id: 'prd-2',
    name: '노바 베이직 코튼 티셔츠',
    code: 'NVA-TEE-014',
    categoryId: 'top',
    categoryLabel: '상의',
    brand: '노바',
    pricing: {
      price: 19900,
      discountType: 'none',
      discountValue: 0,
      taxable: true,
    },
    saleStatus: 'on_sale',
    displayed: true,
    optionGroups: [{ id: 'og-color', name: '색상', values: ['화이트', '네이비'] }],
    variants: [
      {
        id: 'prd2-1',
        sku: 'NVA-TEE-014-화이트',
        optionValues: ['화이트'],
        addPrice: 0,
        stock: 120,
        soldOut: false,
      },
      {
        id: 'prd2-2',
        sku: 'NVA-TEE-014-네이비',
        optionValues: ['네이비'],
        addPrice: 0,
        stock: 84,
        soldOut: false,
      },
    ],
    shipping: { method: 'courier', feeType: 'paid', fee: 2500, freeThreshold: 0 },
    points: { mode: 'rate', rate: 1, amount: 0 },
    // 단가가 낮아 무료배송 쿠폰이 붙으면 배송비가 마진을 넘는다 — 그 쿠폰만 뺀다
    coupons: { usable: true, mode: 'exclude', couponIds: ['cpn-3'] },
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: [],
    description: '<p>두께감 있는 코튼 원단으로 사계절 입기 좋은 기본 티셔츠예요.</p>',
    tags: ['티셔츠', '베이직'],
  },
  {
    id: 'prd-3',
    name: '테라 스니커즈 데일리',
    code: 'TRA-SNK-207',
    categoryId: 'shoes',
    categoryLabel: '신발',
    brand: '테라',
    pricing: {
      price: 89000,
      discountType: 'amount',
      discountValue: 10000,
      taxable: true,
    },
    saleStatus: 'on_sale',
    displayed: true,
    optionGroups: [{ id: 'og-size', name: '사이즈', values: ['250', '260', '270'] }],
    variants: [
      {
        id: 'prd3-1',
        sku: 'TRA-SNK-207-250',
        optionValues: ['250'],
        addPrice: 0,
        stock: 4,
        soldOut: false,
      },
      {
        id: 'prd3-2',
        sku: 'TRA-SNK-207-260',
        optionValues: ['260'],
        addPrice: 0,
        stock: 2,
        soldOut: false,
      },
      {
        id: 'prd3-3',
        sku: 'TRA-SNK-207-270',
        optionValues: ['270'],
        addPrice: 0,
        stock: 1,
        soldOut: false,
      },
    ],
    shipping: { method: 'courier', feeType: 'free', fee: 0, freeThreshold: 0 },
    // 정액 적립 — 가격과 무관하게 2,000P 를 준다
    points: { mode: 'fixed', rate: 0, amount: 2000 },
    // 재구매 유도 상품 — 재구매 쿠폰 한 장만 받는다
    coupons: { usable: true, mode: 'include', couponIds: ['cpn-2'] },
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: [],
    description: '<p>가벼운 쿠셔닝으로 데일리 착화감이 좋은 스니커즈예요.</p>',
    tags: ['신발', '스니커즈'],
  },
  {
    id: 'prd-4',
    name: '카밀 워시드 데님 팬츠',
    code: 'CML-DNM-051',
    categoryId: 'bottom',
    categoryLabel: '하의',
    brand: '카밀',
    pricing: {
      price: 59000,
      discountType: 'none',
      discountValue: 0,
      taxable: true,
    },
    saleStatus: 'sold_out',
    displayed: true,
    optionGroups: [{ id: 'og-size', name: '사이즈', values: ['28', '30', '32'] }],
    variants: [
      {
        id: 'prd4-1',
        sku: 'CML-DNM-051-28',
        optionValues: ['28'],
        addPrice: 0,
        stock: 0,
        soldOut: true,
      },
      {
        id: 'prd4-2',
        sku: 'CML-DNM-051-30',
        optionValues: ['30'],
        addPrice: 0,
        stock: 0,
        soldOut: true,
      },
      {
        id: 'prd4-3',
        sku: 'CML-DNM-051-32',
        optionValues: ['32'],
        addPrice: 0,
        stock: 0,
        soldOut: true,
      },
    ],
    shipping: { method: 'courier', feeType: 'conditional', fee: 3000, freeThreshold: 70000 },
    points: { mode: 'rate', rate: 1, amount: 0 },
    coupons: { usable: true, mode: 'all', couponIds: [] },
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: [],
    description: '<p>자연스러운 워싱과 편안한 핏의 데님 팬츠예요.</p>',
    tags: ['데님', '팬츠'],
  },
  {
    id: 'prd-5',
    name: '오브제 미니멀 크로스백',
    code: 'OBJ-BAG-338',
    categoryId: 'acc',
    categoryLabel: '액세서리',
    brand: '오브제',
    // 값이 살아 있는 채로 잠기는 것을 보여 주는 한 건 — 결제 연동이 없으면 이 45,000원과 할인 15%
    // 는 화면에서 '가격문의' 로 대체되지만 **저장값은 그대로다**. 연동을 마치면 그대로 살아난다.
    pricing: {
      price: 45000,
      discountType: 'percent',
      discountValue: 15,
      taxable: true,
    },
    saleStatus: 'stopped',
    displayed: false,
    optionGroups: [],
    variants: [singleVariant('OBJ-BAG-338', 30)],
    shipping: { method: 'direct', feeType: 'paid', fee: 5000, freeThreshold: 0 },
    // 특가·판매중지 상품 — 적립을 빼 둔다(전역 정책 하나로는 표현되지 않는 바로 그 경우)
    points: { mode: 'none', rate: 0, amount: 0 },
    // 특가 상품 — 마진이 없어 쿠폰을 아예 막는다. 이 상품을 대상으로 지정한 쿠폰(cpn-5)이
    // 있어 화면이 충돌 경고를 띄운다 — 승자는 상품이다(productAllowsCoupon 머리말).
    coupons: { usable: false, mode: 'all', couponIds: [] },
    coverImageUrl: '/fixtures/placeholder-image.svg',
    imageUrls: [],
    description: '<p>가벼운 외출에 어울리는 미니멀한 크로스백이에요.</p>',
    tags: ['가방', '크로스백'],
  },
];

let productSeq = products.length;
let categorySeq = categories.length;

/* ── 상품 저장소 API (data-source 어댑터가 부른다) ────────────────────────── */

export function listProducts(): readonly Product[] {
  return sortProducts(products);
}

export function getProduct(id: string): Product {
  const found = products.find((product) => product.id === id);
  if (found === undefined) throw new Error('상품을 찾을 수 없어요');
  return found;
}

export function addProduct(input: ProductInput): void {
  productSeq += 1;
  products = [
    ...products,
    { id: `prd-${String(productSeq)}`, ...input, categoryLabel: labelOf(input.categoryId) },
  ];
}

export function updateProduct(id: string, input: ProductInput): void {
  products = products.map((product) =>
    product.id === id
      ? { ...product, ...input, categoryLabel: labelOf(input.categoryId) }
      : product,
  );
}

export function removeProduct(id: string): void {
  products = products.filter((product) => product.id !== id);
}

/* ── 카테고리 저장소 API ──────────────────────────────────────────────────── */

export function listProductCategories(): readonly ProductCategory[] {
  return categories;
}

/** 카테고리 + 사용 중 상품 수 — 목록/삭제 차단에 쓴다 */
export function listProductCategoryUsage(): readonly ProductCategoryUsage[] {
  return categories.map((category) => ({
    ...category,
    productCount: countProductsUsingCategory(category.id, products),
    hasChildren: categories.some((child) => child.parentId === category.id),
  }));
}

export function getProductCategoryUsage(id: string): ProductCategoryUsage {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) throw new Error('카테고리를 찾을 수 없어요');
  return {
    ...found,
    productCount: countProductsUsingCategory(found.id, products),
    hasChildren: categories.some((child) => child.parentId === found.id),
  };
}

/** 1Depth(대분류)만 — 상위 선택지·상품 폼의 첫 번째 셀렉트가 쓴다 */
export function listProductCategoryRoots(): readonly ProductCategory[] {
  return categories.filter((category) => category.parentId === null);
}

/** 특정 대분류의 2Depth(중분류) 목록 — 상품 폼의 두 번째 셀렉트가 쓴다 */
export function listProductCategoryChildren(parentId: string): readonly ProductCategory[] {
  return categories.filter((category) => category.parentId === parentId);
}

/** 하위(2Depth)를 가진 대분류인가 — 삭제 차단·부모 재지정 차단에 쓴다 */
export function hasProductCategoryChildren(id: string): boolean {
  return categories.some((category) => category.parentId === id);
}

/** '아우터 > 코트' 표기 — 목록·상품 폼에서 어느 갈래인지 한눈에 보이게 한다 */
export function productCategoryPath(id: string): string {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) return id;
  if (found.parentId === null) return found.label;
  const parent = categories.find((category) => category.id === found.parentId);
  return parent === undefined ? found.label : `${parent.label} > ${found.label}`;
}

/** 부모로 지정할 수 있는가 — 없음(최상위)이거나, **1Depth 인 카테고리**만 부모가 된다(3단계 금지) */
function assertAssignableParent(parentId: string | null, selfId?: string): void {
  if (parentId === null) return;
  if (selfId !== undefined && parentId === selfId) {
    throw new Error('자기 자신을 상위 카테고리로 지정할 수 없어요.');
  }
  const parent = categories.find((category) => category.id === parentId);
  if (parent === undefined) throw new Error('상위 카테고리를 찾을 수 없어요.');
  if (parent.parentId !== null) {
    throw new Error('카테고리는 2단계까지만 만들 수 있어요.');
  }
}

export function addProductCategory(label: string, parentId: string | null = null): void {
  assertAssignableParent(parentId);
  categorySeq += 1;
  categories = [
    ...categories,
    { id: `prd-cat-${String(categorySeq)}`, label: label.trim(), parentId },
  ];
}

export function updateProductCategory(
  id: string,
  label: string,
  parentId: string | null = null,
): void {
  assertAssignableParent(parentId, id);
  // 하위를 가진 대분류를 다른 대분류 밑으로 넣으면 3단계가 된다 — 막는다
  if (parentId !== null && hasProductCategoryChildren(id)) {
    throw new Error('하위 카테고리가 있는 카테고리는 다른 카테고리 밑으로 옮길 수 없어요.');
  }

  const trimmed = label.trim();
  categories = categories.map((category) =>
    category.id === id ? { ...category, label: trimmed, parentId } : category,
  );
  // 라벨 변경을 상품의 비정규화 라벨에도 반영한다(백엔드가 붙으면 서버가 정합성을 맡는다)
  products = products.map((product) =>
    product.categoryId === id ? { ...product, categoryLabel: trimmed } : product,
  );
}

/** 사용 중이거나 하위가 있으면 삭제하지 않는다(서버는 409 로 막는다). 프론트도 버튼을 잠근다. */
export function removeProductCategory(id: string): void {
  if (countProductsUsingCategory(id, products) > 0) {
    throw new Error('사용 중인 카테고리는 삭제할 수 없어요.');
  }
  if (hasProductCategoryChildren(id)) {
    throw new Error('하위 카테고리가 있는 카테고리는 삭제할 수 없어요.');
  }
  categories = categories.filter((category) => category.id !== id);
}
