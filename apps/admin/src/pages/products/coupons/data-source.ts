// 쿠폰 데이터 소스 어댑터
//
// [백엔드 연동 지점] 카테고리 결합이 없어 프레임워크 createCrudAdapter 에 시드를 넣는다.
// 실제 연동 시 // TODO(backend) 로 어댑터 본문만 교체하고 화면은 그대로 둔다.
import { wait } from '../../../shared/async';
import { createCrudAdapter, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { conflictingProducts, discountLabel, sortCoupons } from './types';
import type { Coupon, CouponInput, CouponIssuance } from './types';
import type { CatalogCoupon } from '../../../shared/domain/coupon-catalog';
import type { TierUpCoupon } from '../../../shared/domain/coupon-issuance';
import { listProducts } from '../_shared/store';
import type { Product } from '../_shared/store';

const SCOPE = 'coupons';

// 픽스처는 전부 가상이다 — 실제 브랜드·회원 이름을 쓰지 않는다.
// 여섯 가지 발급 기준이 **모두 한 번씩** 등장하도록 짰다: 화면의 분기가 데이터에서 실제로 밟힌다.
const COUPON_SEED: readonly Coupon[] = [
  {
    id: 'cpn-1',
    name: '신규 가입 15% 할인',
    code: 'WELCOME15',
    issueType: 'percent',
    discountValue: 15,
    maxDiscount: 20000,
    minOrderAmount: 30000,
    trigger: { type: 'signup' },
    target: 'all',
    targetIds: [],
    stackable: false,
    // 가입 축하 쿠폰은 캠페인이 석 달이어도 한 장은 30일짜리다
    usagePeriod: { kind: 'days_from_issue', days: 30 },
    totalQuantity: 1000,
    issuedCount: 640,
    startAt: '2026-07-01',
    endAt: '2026-09-30',
    enabled: true,
  },
  {
    id: 'cpn-2',
    name: 'VIP 승급 축하 5,000원',
    code: 'VIPUP5000',
    issueType: 'amount',
    discountValue: 5000,
    maxDiscount: 0,
    minOrderAmount: 50000,
    trigger: { type: 'tier_up', tier: 'vip' },
    target: 'member_grade',
    targetIds: ['vip', 'vvip'],
    stackable: false,
    usagePeriod: { kind: 'days_from_issue', days: 60 },
    totalQuantity: 500,
    issuedCount: 500,
    startAt: '2026-06-01',
    endAt: '2026-08-31',
    enabled: true,
  },
  {
    id: 'cpn-3',
    name: '무료배송 데이',
    code: 'FREESHIP',
    issueType: 'free_shipping',
    discountValue: 0,
    maxDiscount: 0,
    minOrderAmount: 0,
    trigger: { type: 'download', from: '2026-08-01', to: '2026-08-05' },
    target: 'all',
    targetIds: [],
    // 배송비 쿠폰은 할인 쿠폰과 함께 쓰게 두는 것이 국내 관례다
    stackable: true,
    usagePeriod: { kind: 'fixed' },
    totalQuantity: 0,
    issuedCount: 3120,
    startAt: '2026-08-01',
    endAt: '2026-08-07',
    enabled: true,
  },
  {
    id: 'cpn-4',
    name: '아우터 카테고리 10% 쿠폰',
    code: 'OUTER10',
    issueType: 'percent',
    discountValue: 10,
    maxDiscount: 30000,
    minOrderAmount: 0,
    trigger: { type: 'first_order' },
    target: 'category',
    targetIds: ['outer'],
    stackable: false,
    usagePeriod: { kind: 'fixed' },
    totalQuantity: 300,
    issuedCount: 45,
    startAt: '2026-05-01',
    endAt: '2026-06-30',
    enabled: false,
  },
  {
    // [의도된 충돌 표본] 대상으로 지목한 prd-5(특가 크로스백)는 쿠폰 사용 불가 상품이다.
    // 목록의 '충돌' 배지와 폼 경고가 실제 데이터로 한 번은 떠야 그 경로가 살아 있다는 것을 안다.
    id: 'cpn-5',
    name: '크로스백 단독 3,000원',
    code: 'BAG3000',
    issueType: 'amount',
    discountValue: 3000,
    maxDiscount: 0,
    minOrderAmount: 20000,
    trigger: { type: 'manual' },
    target: 'product',
    targetIds: ['prd-5'],
    stackable: false,
    usagePeriod: { kind: 'fixed' },
    totalQuantity: 200,
    issuedCount: 18,
    startAt: '2026-07-10',
    endAt: '2026-08-20',
    enabled: true,
  },
  {
    id: 'cpn-6',
    name: '생일 축하 10% 쿠폰',
    code: 'BIRTH10',
    issueType: 'percent',
    discountValue: 10,
    maxDiscount: 15000,
    minOrderAmount: 20000,
    trigger: { type: 'birthday', daysBefore: 7 },
    target: 'all',
    targetIds: [],
    stackable: false,
    usagePeriod: { kind: 'days_from_issue', days: 30 },
    totalQuantity: 0,
    issuedCount: 212,
    startAt: '2026-01-01',
    endAt: '2026-12-31',
    enabled: true,
  },
  {
    id: 'cpn-7',
    name: 'VVIP 승급 20% 쿠폰',
    code: 'VVIPUP20',
    issueType: 'percent',
    discountValue: 20,
    maxDiscount: 50000,
    minOrderAmount: 100000,
    trigger: { type: 'tier_up', tier: 'vvip' },
    target: 'member_grade',
    targetIds: ['vvip'],
    stackable: true,
    usagePeriod: { kind: 'days_from_issue', days: 90 },
    totalQuantity: 100,
    issuedCount: 24,
    startAt: '2026-06-01',
    endAt: '2026-12-31',
    enabled: true,
  },
];

/**
 * 발급 이력 픽스처 — 회원 이름은 가상이다.
 *
 * [왜 쿠폰의 issuedCount 와 건수가 다른가] issuedCount 는 운영 누계(수천 건)이고 이 목록은
 * 최근 이력 표본이다. 픽스처가 수천 행을 지어내면 화면만 무거워지고 아무것도 더 증명하지 못한다.
 * 발급 현황 화면은 **이 목록에서 센 값**을 보여 주고, 소진율만 누계(issuedCount)를 쓴다 —
 * 두 숫자가 무엇을 세는지 화면이 각각 밝힌다.
 */
const ISSUANCE_SEED: readonly CouponIssuance[] = [
  {
    id: 'iss-1',
    couponId: 'cpn-1',
    source: 'signup',
    member: '초록달팽이',
    issuedAt: '2026-07-02',
    usedAt: '2026-07-05',
  },
  {
    id: 'iss-2',
    couponId: 'cpn-1',
    source: 'signup',
    member: '바다안개',
    issuedAt: '2026-07-04',
    usedAt: null,
  },
  {
    id: 'iss-3',
    couponId: 'cpn-1',
    source: 'manual',
    member: '느린우체통',
    issuedAt: '2026-07-06',
    usedAt: '2026-07-09',
  },
  {
    id: 'iss-4',
    couponId: 'cpn-2',
    source: 'tier_up',
    member: '노을그림자',
    issuedAt: '2026-06-11',
    usedAt: '2026-06-20',
  },
  {
    id: 'iss-5',
    couponId: 'cpn-2',
    source: 'tier_up',
    member: '겨울나무',
    issuedAt: '2026-06-18',
    usedAt: null,
  },
  {
    id: 'iss-6',
    couponId: 'cpn-3',
    source: 'download',
    member: '푸른새벽',
    issuedAt: '2026-08-01',
    usedAt: '2026-08-03',
  },
  {
    id: 'iss-7',
    couponId: 'cpn-3',
    source: 'download',
    member: '조약돌하나',
    issuedAt: '2026-08-02',
    usedAt: null,
  },
  {
    id: 'iss-8',
    couponId: 'cpn-4',
    source: 'first_order',
    member: '모래시계',
    issuedAt: '2026-05-14',
    usedAt: '2026-05-30',
  },
  {
    id: 'iss-9',
    couponId: 'cpn-5',
    source: 'manual',
    member: '고요한숲',
    issuedAt: '2026-07-12',
    usedAt: null,
  },
  {
    id: 'iss-10',
    couponId: 'cpn-6',
    source: 'birthday',
    member: '연둣빛오후',
    issuedAt: '2026-07-15',
    usedAt: '2026-07-19',
  },
  {
    id: 'iss-11',
    couponId: 'cpn-6',
    source: 'birthday',
    member: '작은등대',
    issuedAt: '2026-07-18',
    usedAt: null,
  },
  {
    id: 'iss-12',
    couponId: 'cpn-7',
    source: 'tier_up',
    member: '별헤는밤',
    issuedAt: '2026-06-25',
    usedAt: '2026-07-02',
  },
];

/**
 * 다른 도메인이 쿠폰을 **참조**할 때 보는 목록 (shared/domain/coupon-catalog 의 조회기 구현).
 *
 * [왜 여기서 내보내나] 프로모션의 쿠폰 연동, 회원 상세의 보유 쿠폰이 이 목록을 참조한다. 그들이
 * 이 모듈을 직접 import 하면 페이지 간 결합이라 방향을 뒤집었다 — '무엇을 참조할 수 있는가' 는
 * 정의하는 쪽이 답하는 질문이고, 꽂는 일은 `src/wiring.ts` 가 한다.
 *
 * [왜 어댑터가 아니라 시드인가] createCrudAdapter 는 현재 목록을 밖에 내주지 않는다(비공개 클로저).
 * 픽스처 단계에서는 시드가 곧 카탈로그다 — 이 화면에서 방금 만든 쿠폰이 프로모션 선택 목록에
 * 나타나지 않는 것은 그 한계다. TODO(backend): GET /api/coupons 응답으로 대체하면 사라진다.
 *
 * [왜 중지·만료된 쿠폰까지 주나] 카탈로그는 선택 목록이자 **표시값의 정본**이다. 걸러 내면 이미
 * 그 쿠폰을 발급받은 회원의 보유 쿠폰이 '삭제된 쿠폰' 으로 보인다 — 끝난 것과 없는 것은 다르다.
 */
export function listCatalogCoupons(): readonly CatalogCoupon[] {
  return COUPON_SEED.map((coupon) => ({
    id: coupon.id,
    name: coupon.name,
    code: coupon.code,
    benefitLabel: discountLabel(coupon),
    endAt: coupon.endAt,
  }));
}

/**
 * 등급 승급 시 발급되도록 걸려 있는 쿠폰 (shared/domain/coupon-issuance 의 조회기 구현).
 *
 * 판정 기준은 **트리거 하나**다 — 등급 정책 화면이 '어느 쿠폰이 승급 쿠폰인가' 를 따로 고르지
 * 않는다. 그렇게 두면 같은 사실을 두 화면이 각자 들고 있다가 갈라진다(coupon-issuance.ts 머리말).
 * 중지된 쿠폰도 걸러 내지 않고 enabled 로 실어 보낸다 — 이유는 그 계약에 적었다.
 */
export function listTierUpCoupons(): readonly TierUpCoupon[] {
  return COUPON_SEED.filter((coupon) => coupon.trigger.type === 'tier_up').map((coupon) => ({
    // 필터를 통과한 것만 오지만 타입은 그것을 모른다 — 트리거를 다시 좁혀 tier 를 꺼낸다
    tier: coupon.trigger.type === 'tier_up' ? coupon.trigger.tier : 'normal',
    couponId: coupon.id,
    couponName: coupon.name,
    benefitLabel: discountLabel(coupon),
    enabled: coupon.enabled,
  }));
}

/**
 * 이 상품을 **대상으로 지목한** 쿠폰들 — 상품 폼의 쿠폰 구획이 충돌 경고에 쓴다.
 *
 * 상품 화면이 쿠폰 시드를 직접 읽지 않게 여기서 답한다. 같은 섹션(pages/products) 안이라
 * 페이지 간 결합은 아니지만, '무엇이 이 상품을 지목했나' 는 쿠폰이 답할 질문이다.
 */
export function couponsTargetingProduct(
  product: Pick<Product, 'id' | 'categoryId'>,
): readonly Coupon[] {
  return COUPON_SEED.filter((coupon) => {
    if (coupon.target === 'product') return coupon.targetIds.includes(product.id);
    if (coupon.target === 'category') return coupon.targetIds.includes(product.categoryId);
    return false;
  });
}

/** 쿠폰 선택 목록 — 상품 폼의 '허용/제외할 쿠폰' 피커가 쓴다 */
// TODO(backend): GET /api/coupons (선택 목록)
export async function fetchCouponOptions(signal?: AbortSignal): Promise<readonly Coupon[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'list');
  return COUPON_SEED;
}

/** 발급 이력 — 발급 현황 화면이 쓴다 */
// TODO(backend): GET /api/coupons/issuances?couponId=&source=
export async function fetchCouponIssuances(
  signal?: AbortSignal,
): Promise<readonly CouponIssuance[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'list');
  return ISSUANCE_SEED;
}

/** 발급 현황 화면이 쿠폰 이름·기준을 함께 그리려면 쿠폰 목록도 필요하다 */
// TODO(backend): GET /api/coupons
export async function fetchCouponsForIssuance(signal?: AbortSignal): Promise<readonly Coupon[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'list');
  return sortCoupons(COUPON_SEED);
}

/**
 * 이 쿠폰과 어긋나는 상품들 — 쿠폰이 지목했는데 그 상품이 쿠폰을 거부한다.
 *
 * 판정은 순수 규칙(conflictingProducts)이 한다. 여기서는 **지금** 상품 목록을 얹어 줄 뿐이다 —
 * 저장소는 mutable 바인딩이라 호출 시점에 읽어야 방금 바꾼 상품 설정이 반영된다.
 */
export function conflictingProductsOf(
  coupon: Pick<Coupon, 'id' | 'target' | 'targetIds'>,
): readonly Product[] {
  return conflictingProducts(coupon, listProducts());
}

let seq = COUPON_SEED.length;

// TODO(backend): GET/POST /api/coupons · GET/PUT/DELETE /api/coupons/:id
export const couponAdapter = createCrudAdapter<Coupon, CouponInput>({
  scope: SCOPE,
  seed: COUPON_SEED,
  build: (input) => {
    seq += 1;
    return { id: `cpn-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortCoupons,
});
