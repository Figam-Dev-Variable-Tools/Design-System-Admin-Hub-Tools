// 쿠폰 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 쿠폰은 카테고리 결합이 없어(포트폴리오 성공사례처럼) 프레임워크 createCrudAdapter 를 그대로 쓴다.
// 모델은 국내 커머스 어드민(카페24·아임웹·스마트스토어) 쿠폰 관례를 따른다:
//   발급 기준(트리거) · 발급 유형(정액/정률/무료배송) · 사용 대상 · 사용 조건(최소주문·최대할인·
//   중복사용) · 사용 기간(고정 / 발급일 기준 N일) · 발급 수량 · 상태.
//
// [왜 트리거가 별도 축인가] '누구에게 쓸 수 있나(target)' 와 '언제 손에 들어오나(trigger)' 는
// 다른 질문이다. VIP 등급 승급 시 발급되는 쿠폰이 전 상품에 쓰일 수 있고, 전 회원이 받아 가는
// 다운로드 쿠폰이 특정 카테고리에만 쓰일 수 있다. 두 축을 한 필드로 묶으면 그 조합이 표현되지 않는다.
import { formatNumber, objectParticle, shiftDays } from '../../../shared/format';
import type { StatusTone } from '../../../shared/ui';
import { TIER_LABEL } from '../../../shared/domain/member';
import type { MemberTier } from '../../../shared/domain/member';
import { productAllowsCoupon } from '../_shared/store';
import type { Product } from '../_shared/store';

/** 발급 유형 — 정액/정률/무료배송 */
export type CouponIssueType = 'amount' | 'percent' | 'free_shipping';
/** 사용 대상 — 전체/회원등급/카테고리/상품 */
export type CouponTarget = 'all' | 'member_grade' | 'category' | 'product';

/* ── 발급 기준(트리거) ────────────────────────────────────────────────────── */

/** 발급 기준의 종류 — 발급 이력의 '어디서 왔는가' 축이기도 하다 */
export type CouponTriggerType =
  'manual' | 'signup' | 'tier_up' | 'birthday' | 'first_order' | 'download';

/**
 * 발급 기준 — **종류마다 필요한 값이 다르므로 판별 유니온이다.**
 *
 * [왜 평평한 객체가 아닌가] `{ type, tier, daysBefore, from, to }` 로 두면 '가입 시 발급인데
 * 승급 등급이 VVIP' 같은 말이 안 되는 값이 타입상 만들어진다. 그런 값은 저장은 되고 동작만
 * 어긋나서, 나중에 '왜 이 쿠폰이 안 나가지' 로 되돌아온다. 여기서는 아예 만들 수 없다 —
 * 폼(문자열 칸들)에서 이 모양으로 올리는 유일한 통로가 buildCouponTrigger 다.
 */
export type CouponTrigger =
  | { readonly type: 'manual' }
  | { readonly type: 'signup' }
  /** 이 등급으로 **올라갔을 때** 발급된다 */
  | { readonly type: 'tier_up'; readonly tier: MemberTier }
  /** 생일 며칠 전에 발급할지 — 0 이면 생일 당일 */
  | { readonly type: 'birthday'; readonly daysBefore: number }
  | { readonly type: 'first_order' }
  /** 고객이 받아 가는 쿠폰 — 이 기간 안에만 다운로드된다 */
  | { readonly type: 'download'; readonly from: string; readonly to: string };

/** 생일 쿠폰의 선발급 상한 — 두 달을 넘기면 '생일 쿠폰' 이 아니라 상시 쿠폰이다 */
export const BIRTHDAY_DAYS_MAX = 60;

interface TriggerOption {
  readonly id: CouponTriggerType;
  readonly label: string;
  /** 폼 셀렉트 아래 한 줄 안내 — 이 기준이 실제로 언제 도는지 */
  readonly hint: string;
}

/**
 * 발급 시점 목록.
 *
 * [힌트는 조건 칸과 짝을 이룬다] 조건을 더 묻는 시점의 힌트는 **아래에 무엇이 뜨는지**를 말하고,
 * 묻지 않는 시점의 힌트는 **더 정할 것이 없다**고 못 박는다. 안 그러면 운영자는 조건 칸이 안 뜨는
 * 것을 화면 고장으로 읽고 같은 자리를 계속 눌러 본다.
 */
export const COUPON_TRIGGER_OPTIONS: readonly TriggerOption[] = [
  {
    id: 'manual',
    label: '운영자 직접 발급',
    hint: '운영자가 회원을 골라 발급해요. 받을 회원은 발급하는 순간 고르므로 여기서 더 정할 조건이 없어요.',
  },
  {
    id: 'signup',
    label: '회원 가입 시',
    hint: '가입이 완료된 직후 모든 신규 회원에게 자동 발급돼요. 더 정할 조건이 없어요.',
  },
  {
    id: 'tier_up',
    label: '회원 등급 승급 시',
    hint: '지정한 등급으로 올라간 회원에게 자동 발급돼요. 아래에서 승급 대상 등급을 고르세요.',
  },
  {
    id: 'birthday',
    label: '생일',
    hint: '생일 기준 지정한 일수 전에 자동 발급돼요. 아래에서 며칠 전에 보낼지 정하세요.',
  },
  {
    id: 'first_order',
    label: '첫 구매',
    hint: '첫 주문이 결제 완료되면 자동 발급돼요. 첫 주문은 한 번뿐이라 더 정할 조건이 없어요.',
  },
  {
    id: 'download',
    label: '고객 다운로드',
    hint: '고객이 직접 받아 가요. 아래에서 받아 갈 수 있는 기간을 정하세요.',
  },
];

const TRIGGER_LABEL: Record<CouponTriggerType, string> = {
  manual: '운영자 직접 발급',
  signup: '회원 가입 시',
  tier_up: '회원 등급 승급 시',
  birthday: '생일',
  first_order: '첫 구매',
  download: '고객 다운로드',
};

export function triggerTypeLabel(type: CouponTriggerType): string {
  return TRIGGER_LABEL[type];
}

/**
 * 발급 기준 한 줄 요약 — 목록 열·미리보기·등급 정책 요약이 함께 쓴다.
 *
 * 파라미터를 문구에 실어야 규칙이 읽힌다: 'VIP 승급 시' 와 'VVIP 승급 시' 는 다른 정책인데
 * 둘 다 '회원 등급 승급 시' 로만 보이면 목록에서 구분할 수 없다.
 */
export function triggerSummary(trigger: CouponTrigger): string {
  switch (trigger.type) {
    case 'manual':
      return '운영자 직접 발급';
    case 'signup':
      return '회원 가입 시';
    case 'tier_up':
      return `${TIER_LABEL[trigger.tier]} 승급 시`;
    case 'birthday':
      return trigger.daysBefore === 0 ? '생일 당일' : `생일 ${String(trigger.daysBefore)}일 전`;
    case 'first_order':
      return '첫 구매 시';
    case 'download':
      return `고객 다운로드 (${trigger.from} ~ ${trigger.to})`;
  }
}

/** 운영자가 손으로 뿌리지 않아도 나가는가 — 발급 현황의 '자동/수동' 구분 */
export function isAutoIssued(trigger: CouponTrigger): boolean {
  return trigger.type !== 'manual';
}

/** 폼의 평평한 칸들 → 트리거 한 건을 만들 재료. 폼은 모든 칸을 늘 들고 있다(전환해도 값이 남는다) */
export interface CouponTriggerDraft {
  readonly type: CouponTriggerType;
  readonly tier: MemberTier;
  readonly birthdayDays: number;
  readonly from: string;
  readonly to: string;
}

/**
 * 초안 → 트리거(판별 유니온). **폼에서 도메인으로 가는 유일한 문**이다.
 *
 * 고르지 않은 종류의 칸은 여기서 **버려진다** — '승급 시' 로 저장한 뒤 종류만 '가입 시' 로 바꿨을 때
 * 예전 등급이 데이터에 남아 되살아나지 않게 한다(상품 폼의 적립 축을 0 으로 눕히는 것과 같은 이유).
 */
export function buildCouponTrigger(draft: CouponTriggerDraft): CouponTrigger {
  switch (draft.type) {
    case 'tier_up':
      return { type: 'tier_up', tier: draft.tier };
    case 'birthday':
      return { type: 'birthday', daysBefore: draft.birthdayDays };
    case 'download':
      return { type: 'download', from: draft.from, to: draft.to };
    case 'manual':
    case 'signup':
    case 'first_order':
      return { type: draft.type };
  }
}

/** 초안 → 사용 기간. 고정 기간이면 일수는 버린다(위와 같은 이유) */
export function buildUsagePeriod(kind: CouponUsagePeriod['kind'], days: number): CouponUsagePeriod {
  return kind === 'days_from_issue' ? { kind, days } : { kind: 'fixed' };
}

/* ── 사용 기간 ────────────────────────────────────────────────────────────── */

/**
 * 사용 기간의 두 방식.
 *
 * [왜 startAt/endAt 을 그대로 두나] 그 둘은 **캠페인 기간**이다 — 언제부터 언제까지 이 쿠폰이
 * 살아 있는가. 여기서 고르는 것은 그 안에서 **한 장의 쿠폰이 며칠짜리인가** 다. 가입 축하 쿠폰은
 * 캠페인이 3개월이어도 한 장은 발급일로부터 30일이다. 두 값을 한 축으로 합치면 그 흔한 운영이
 * 표현되지 않는다.
 */
export type CouponUsagePeriod =
  { readonly kind: 'fixed' } | { readonly kind: 'days_from_issue'; readonly days: number };

/** 발급일 기준 사용 기간의 상한(일) — 1년을 넘기면 기간이 아니라 무기한이다 */
export const USAGE_DAYS_MAX = 365;

export interface Coupon {
  readonly id: string;
  readonly name: string;
  /** 쿠폰 코드 — 고객이 입력하는 값 */
  readonly code: string;
  readonly issueType: CouponIssueType;
  /** 할인 값 — amount 면 원, percent 면 %, free_shipping 이면 0 */
  readonly discountValue: number;
  /** 최대 할인 금액 — 정률 상한(원). 0 이면 상한 없음 */
  readonly maxDiscount: number;
  /** 최소 주문 금액 — 원. 0 이면 조건 없음 */
  readonly minOrderAmount: number;
  /** 발급 기준 — 언제 누구에게 나가는가 */
  readonly trigger: CouponTrigger;
  readonly target: CouponTarget;
  /**
   * 사용 대상의 실제 id 들 — target 이 무엇이냐에 따라 의미가 달라진다.
   * member_grade → MemberTier · category → 상품 카테고리 id · product → 상품 id.
   * target === 'all' 이면 **항상 빈 배열**이다(스키마가 강제한다).
   */
  readonly targetIds: readonly string[];
  /** 다른 쿠폰과 함께 쓸 수 있는가 — 국내 커머스는 기본 불가(1주문 1쿠폰)다 */
  readonly stackable: boolean;
  readonly usagePeriod: CouponUsagePeriod;
  /** 발급 수량 — 0 이면 무제한 */
  readonly totalQuantity: number;
  /** 발급(다운로드)된 수량 */
  readonly issuedCount: number;
  /** 캠페인 기간 — 'YYYY-MM-DD' */
  readonly startAt: string;
  readonly endAt: string;
  /** 발급 상태 토글 — 끄면 기간 안이라도 발급되지 않는다 */
  readonly enabled: boolean;
}

export type CouponInput = Omit<Coupon, 'id'>;

export const COUPON_NAME_MAX = 60;
export const COUPON_CODE_MAX = 30;

export const COUPON_ISSUE_OPTIONS: readonly {
  readonly id: CouponIssueType;
  readonly label: string;
}[] = [
  { id: 'amount', label: '정액 할인(원)' },
  { id: 'percent', label: '정률 할인(%)' },
  { id: 'free_shipping', label: '무료배송' },
];

export const COUPON_TARGET_OPTIONS: readonly {
  readonly id: CouponTarget;
  readonly label: string;
}[] = [
  { id: 'all', label: '전체 회원' },
  { id: 'member_grade', label: '회원등급' },
  { id: 'category', label: '특정 카테고리' },
  { id: 'product', label: '특정 상품' },
];

/**
 * 쿠폰이 참조할 수 있는 **기본 제공 등급 3종**.
 *
 * [왜 이 목록이 선택지가 아닌가] 운영자는 등급을 더 만들 수 있고(고객 설정 화면), 그 목록의 정본은
 * `shared/domain/member-tier-catalog` 이음매다 — 선택지는 거기서 온다. 이 배열이 남는 이유는 하나:
 * `CouponTrigger.tier` 가 닫힌 유니온(MemberTier)이라 **발급 기준**은 여기 셋까지만 들 수 있다.
 * 그 사실은 숨기지 않고 화면이 말한다(등급 정책 화면의 TierUpCouponCard 가 반대편에서 같은 말을 한다).
 */
const BUILT_IN_TIER_IDS: readonly MemberTier[] = ['normal', 'vip', 'vvip'];

/** 이 등급 id 를 발급 기준이 들 수 있는가 — 운영자가 추가한 등급은 아직 들 수 없다 */
export function isBuiltInTier(id: string): id is MemberTier {
  return (BUILT_IN_TIER_IDS as readonly string[]).includes(id);
}

/** 기본 제공 등급의 라벨 — 등급 개념의 정본은 shared/domain/member 다 */
export function builtInTierLabel(tier: MemberTier): string {
  return TIER_LABEL[tier];
}

export const COUPON_FILTER_ALL = 'all';
export type CouponIssueFilter = typeof COUPON_FILTER_ALL | CouponIssueType;
export type CouponTriggerFilter = typeof COUPON_FILTER_ALL | CouponTriggerType;

export function targetLabel(target: CouponTarget): string {
  return COUPON_TARGET_OPTIONS.find((option) => option.id === target)?.label ?? target;
}

/** 이 대상은 id 를 골라야 하는가 — '전체 회원' 만 고르지 않는다 */
export function targetNeedsIds(target: CouponTarget): boolean {
  return target !== 'all';
}

/** 대상 유형별 선택 안내 문구 — 폼과 미리보기가 같은 말을 쓰게 한다 */
export function targetPickerLabel(target: CouponTarget): string {
  switch (target) {
    case 'member_grade':
      return '대상 회원등급';
    case 'category':
      return '대상 카테고리';
    case 'product':
      return '대상 상품';
    case 'all':
      return '대상';
  }
}

/* ── 사용 대상 연쇄 선택 (1차 카테고리 → 2차 카테고리 → 상품) ─────────────────
 *
 * 상품 등록 화면이 이미 쓰고 있는 관용구를 그대로 가져왔다(ProductFormPage 의 '카테고리(대분류)' +
 * '카테고리(중분류)' 두 셀렉트): **저장하는 값은 최종 선택 하나**이고 두 셀렉트는 그 값에서 되짚어
 * 그린다. 쿠폰은 대상이 여러 개일 수 있어(픽스처 cpn-2 의 ['vip','vvip']) 그 위에 '추가' 한 단을
 * 얹었을 뿐, 좁혀 가는 규칙은 같다.
 *
 * [초기화 규칙 — 이 종류 UI 의 가장 흔한 버그가 여기다]
 *   1차를 바꾸면 2차와 상품을 **버린다**. 다른 갈래의 2차가 조용히 남아 있으면 화면이 보여 주는
 *   선택과 실제로 더해질 값이 어긋난다. 2차를 바꾸면 상품을 버린다(같은 이유, 한 단 아래).
 *   되돌릴 값을 기억해 두지도 않는다 — '아까 고른 것' 을 되살리는 것이 바로 그 어긋남이다.
 */

/** 카테고리 최소 모양 — 컴포넌트가 상품 저장소 타입을 몰라도 되게 여기서 좁힌다 */
export interface ScopeCategory {
  readonly id: string;
  readonly label: string;
  readonly parentId: string | null;
}

/** 상품 최소 모양 — 위와 같은 이유 */
export interface ScopeProduct {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly categoryId: string;
}

/** 연쇄 선택의 현재 좌표 — **화면 상태**다. 저장되는 것은 여기서 뽑아낸 id 하나뿐이다 */
export interface CouponScope {
  readonly rootId: string;
  readonly childId: string;
  readonly productId: string;
}

export const EMPTY_SCOPE: CouponScope = { rootId: '', childId: '', productId: '' };

/** 1차를 고른다 — 2차·상품은 버린다 */
export function withScopeRoot(rootId: string): CouponScope {
  return { rootId, childId: '', productId: '' };
}

/** 2차를 고른다 — 상품은 버린다 */
export function withScopeChild(scope: CouponScope, childId: string): CouponScope {
  return { rootId: scope.rootId, childId, productId: '' };
}

export function withScopeProduct(scope: CouponScope, productId: string): CouponScope {
  return { ...scope, productId };
}

/** 카테고리 목록 중 1차(대분류)만 */
export function scopeRootOptions(categories: readonly ScopeCategory[]): readonly ScopeCategory[] {
  return categories.filter((category) => category.parentId === null);
}

/** 고른 1차의 2차(중분류)들 — 1차를 고르지 않았으면 비어 있다 */
export function scopeChildOptions(
  categories: readonly ScopeCategory[],
  rootId: string,
): readonly ScopeCategory[] {
  if (rootId === '') return [];
  return categories.filter((category) => category.parentId === rootId);
}

/**
 * 지금 좌표 아래의 상품들.
 *
 * 2차를 골랐으면 그 2차의 상품만, 1차만 골랐으면 **그 1차와 그 아래 2차 전부**의 상품이다 —
 * 상품의 categoryId 는 1차일 수도 2차일 수도 있기 때문이다(store 의 카테고리는 2단계다).
 * 1차조차 고르지 않았으면 빈 목록이다: 전 상품을 한 셀렉트에 쏟아 놓는 것은 '고르게 해 준' 것이 아니다.
 */
export function productsInScope(
  products: readonly ScopeProduct[],
  categories: readonly ScopeCategory[],
  scope: CouponScope,
): readonly ScopeProduct[] {
  if (scope.childId !== '') {
    return products.filter((product) => product.categoryId === scope.childId);
  }
  if (scope.rootId === '') return [];
  const inRoot = new Set<string>([scope.rootId]);
  for (const category of categories) {
    if (category.parentId === scope.rootId) inRoot.add(category.id);
  }
  return products.filter((product) => inRoot.has(product.categoryId));
}

/** '아우터 > 코트' 표기 — 넘겨받은 목록만 보고 만든다(저장소를 모른다) */
export function scopeCategoryPath(categories: readonly ScopeCategory[], id: string): string {
  const found = categories.find((category) => category.id === id);
  if (found === undefined) return id;
  if (found.parentId === null) return found.label;
  const parent = categories.find((category) => category.id === found.parentId);
  return parent === undefined ? found.label : `${parent.label} > ${found.label}`;
}

/**
 * 지금 좌표에서 대상에 더할 수 있는 id — 아직 없으면 빈 문자열.
 *
 * 카테고리 대상이면 2차가 있으면 2차, 없으면 1차다('아우터' 전체를 대상으로 잡는 것은 정상 운영이다).
 * 상품 대상이면 상품을 고르기 전에는 더할 것이 없다 — 카테고리만으로는 상품 대상이 성립하지 않는다.
 */
export function scopeAddableId(target: CouponTarget, scope: CouponScope): string {
  if (target === 'product') return scope.productId;
  if (target === 'category') return scope.childId !== '' ? scope.childId : scope.rootId;
  return '';
}

/* ── 발급 시점별 조건 ─────────────────────────────────────────────────────────
 *
 * [조건이 없는 시점을 지어내지 않는다] 여섯 시점 중 셋만 더 묻는다.
 *   · manual      : 누구에게 줄지는 **발급을 실행하는 순간** 고른다 — 쿠폰 정의가 미리 담을 값이 없다.
 *   · signup      : 가입 이벤트에는 파라미터가 없다(이 리포의 회원 모델에 가입 경로·추천인 축이 없다).
 *                   없는 데이터를 묻는 셀렉트는 저장은 되고 동작하지 않는다.
 *   · first_order : 첫 주문은 정의상 한 번뿐이라 '몇 번째' 를 물을 것이 없다. 금액 조건은 이미
 *                   쿠폰 정보의 '최소 주문 금액' 이 갖고 있다 — 같은 질문을 두 곳에서 묻지 않는다.
 */

/** 이 시점이 더 물어야 하는 것 — 없으면 null */
export type CouponTriggerCondition = 'tier' | 'birthday-days' | 'download-period';

export function triggerCondition(type: CouponTriggerType): CouponTriggerCondition | null {
  switch (type) {
    case 'tier_up':
      return 'tier';
    case 'birthday':
      return 'birthday-days';
    case 'download':
      return 'download-period';
    case 'manual':
    case 'signup':
    case 'first_order':
      return null;
  }
}

/* ── 저장 가드 ────────────────────────────────────────────────────────────────
 *
 * [왜 zod 밖에 또 있나] zod 는 폼 값만 본다 — '선택지 목록을 읽지 못했다' 는 폼 값이 아니다.
 * 그런데 그 상태에서 저장을 열어 두면 운영자는 **고를 수 없었던 것을 고르지 않은 채로** 저장한다.
 * 그래서 술어를 한 벌 만들고, 버튼의 disabled 와 제출 거부가 **둘 다 이것을 읽는다**(하나만 읽으면
 * 키보드 Enter 나 URL 로 걸어 들어온 제출이 그대로 통과한다).
 */

/** 선택지 목록의 상태 — '모른다'(unknown)와 '비었다'는 다른 말이다 */
export type OptionsState = 'known' | 'loading' | 'unknown';

export interface CouponGuardInput {
  readonly target: CouponTarget;
  readonly targetIds: readonly string[];
  readonly triggerType: CouponTriggerType;
  /** 승급 대상 등급 — 고르지 않았으면 빈 문자열 */
  readonly triggerTier: string;
  /** 사용 대상 선택지를 아는가 */
  readonly targetOptions: OptionsState;
  /** 발급 시점 조건(등급) 선택지를 아는가 */
  readonly tierOptions: OptionsState;
}

/** 저장을 막아야 하는 이유 — 막을 것이 없으면 null. 문구가 곧 화면에 나가는 말이다 */
export function couponSaveBlockReason(input: CouponGuardInput): string | null {
  if (targetNeedsIds(input.target)) {
    const label = targetPickerLabel(input.target);
    if (input.targetOptions === 'loading') {
      return `${label} 선택지를 불러오는 중이에요. 목록이 뜬 뒤에 저장할 수 있어요.`;
    }
    if (input.targetOptions === 'unknown') {
      return `${label} 목록을 불러오지 못했어요. 고를 수 없는 채로 저장하지 않아요.`;
    }
    if (input.targetIds.length === 0) {
      return `${label}${objectParticle(label)} 한 개 이상 선택하세요.`;
    }
  }

  if (triggerCondition(input.triggerType) === 'tier') {
    if (input.tierOptions === 'loading') {
      return '회원 등급 목록을 불러오는 중이에요. 목록이 뜬 뒤에 저장할 수 있어요.';
    }
    if (input.tierOptions === 'unknown') {
      return '회원 등급 목록을 불러오지 못해 승급 대상 등급을 고를 수 없어요.';
    }
    if (!isBuiltInTier(input.triggerTier)) {
      return '승급 대상 등급을 선택하세요.';
    }
  }

  return null;
}

/** 할인 요약 문구 — 목록·미리보기가 함께 쓴다 */
export function discountLabel(coupon: Pick<Coupon, 'issueType' | 'discountValue'>): string {
  if (coupon.issueType === 'free_shipping') return '무료배송';
  if (coupon.issueType === 'percent') return `${String(coupon.discountValue)}% 할인`;
  return `${formatNumber(coupon.discountValue)}원 할인`;
}

/** 사용 조건 요약 — 최소주문·최대할인·중복사용을 한 줄로 (미리보기·목록 툴팁) */
export function conditionSummary(
  coupon: Pick<Coupon, 'issueType' | 'minOrderAmount' | 'maxDiscount' | 'stackable'>,
): string {
  const parts: string[] = [];
  if (coupon.minOrderAmount > 0) {
    parts.push(`${formatNumber(coupon.minOrderAmount)}원 이상 구매 시`);
  }
  if (coupon.issueType === 'percent' && coupon.maxDiscount > 0) {
    parts.push(`최대 ${formatNumber(coupon.maxDiscount)}원`);
  }
  parts.push(coupon.stackable ? '다른 쿠폰과 중복 사용 가능' : '다른 쿠폰과 중복 사용 불가');
  return parts.join(' · ');
}

/** 사용 기간 표기 — 고정 기간이면 캠페인 기간 그대로, 아니면 '발급일로부터 N일' */
export function usagePeriodLabel(
  coupon: Pick<Coupon, 'usagePeriod' | 'startAt' | 'endAt'>,
): string {
  if (coupon.usagePeriod.kind === 'days_from_issue') {
    return `발급일로부터 ${String(coupon.usagePeriod.days)}일`;
  }
  if (coupon.startAt === '' || coupon.endAt === '') return '사용 기간 미설정';
  return `${coupon.startAt} ~ ${coupon.endAt}`;
}

/**
 * 이 발급 1건의 실제 만료일.
 *
 * [왜 캠페인 종료일로 자르나] '발급일로부터 30일' 쿠폰을 캠페인 마지막 날에 받으면 산술로는
 * 캠페인이 끝난 뒤에도 30일이 남는다. 쿠폰이 끝났는데 쓸 수 있다고 말하는 화면이 되므로,
 * 둘 중 **빠른 날**이 만료다. 날짜 계산은 shared/format 의 shiftDays 한 벌만 쓴다.
 */
export function couponExpiryFor(
  coupon: Pick<Coupon, 'usagePeriod' | 'endAt'>,
  issuedAt: string,
): string {
  if (coupon.usagePeriod.kind === 'fixed') return coupon.endAt;
  const byDays = shiftDays(issuedAt, coupon.usagePeriod.days);
  return byDays < coupon.endAt ? byDays : coupon.endAt;
}

/** 소진율(%) — 발급수량 대비 발급된 수량. 무제한(0)이면 0 */
export function usageRate(coupon: Pick<Coupon, 'totalQuantity' | 'issuedCount'>): number {
  if (coupon.totalQuantity <= 0) return 0;
  return Math.min(100, Math.round((coupon.issuedCount / coupon.totalQuantity) * 100));
}

type CouponStatus = 'scheduled' | 'active' | 'expired' | 'disabled';

/** 상태 파생 — 끄면 중지, 기간 전이면 예정, 지나면 만료, 그 사이면 진행중. today 주입 가능(테스트). */
export function couponStatus(
  coupon: Pick<Coupon, 'enabled' | 'startAt' | 'endAt'>,
  today: string,
): CouponStatus {
  if (!coupon.enabled) return 'disabled';
  if (today < coupon.startAt) return 'scheduled';
  if (today > coupon.endAt) return 'expired';
  return 'active';
}

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

const STATUS_META: Record<CouponStatus, StatusMeta> = {
  scheduled: { label: '예정', tone: 'info' },
  active: { label: '진행중', tone: 'success' },
  expired: { label: '만료', tone: 'neutral' },
  disabled: { label: '중지', tone: 'neutral' },
};

export function couponStatusMeta(status: CouponStatus): StatusMeta {
  return STATUS_META[status];
}

/** 항목 → 폼/쓰기 입력(id 제외). 목록 인라인 토글과 폼이 함께 쓴다. */
export function toCouponInput(coupon: Coupon): CouponInput {
  return {
    name: coupon.name,
    code: coupon.code,
    issueType: coupon.issueType,
    discountValue: coupon.discountValue,
    maxDiscount: coupon.maxDiscount,
    minOrderAmount: coupon.minOrderAmount,
    trigger: coupon.trigger,
    target: coupon.target,
    targetIds: [...coupon.targetIds],
    stackable: coupon.stackable,
    usagePeriod: coupon.usagePeriod,
    totalQuantity: coupon.totalQuantity,
    issuedCount: coupon.issuedCount,
    startAt: coupon.startAt,
    endAt: coupon.endAt,
    enabled: coupon.enabled,
  };
}

/** 사용기간 내림차순(최근 시작이 위). 같은 날짜는 id 안정 정렬. 테스트가 직접 부른다. */
export function sortCoupons(list: readonly Coupon[]): readonly Coupon[] {
  return [...list].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt < b.startAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 발급유형 필터('전체'면 전체) */
export function filterCoupons(
  list: readonly Coupon[],
  filter: CouponIssueFilter,
): readonly Coupon[] {
  if (filter === COUPON_FILTER_ALL) return list;
  return list.filter((coupon) => coupon.issueType === filter);
}

/** 발급 기준 필터('전체'면 전체) */
export function filterByTrigger(
  list: readonly Coupon[],
  filter: CouponTriggerFilter,
): readonly Coupon[] {
  if (filter === COUPON_FILTER_ALL) return list;
  return list.filter((coupon) => coupon.trigger.type === filter);
}

/* ── 쿠폰 ↔ 상품 충돌 ─────────────────────────────────────────────────────── */

/**
 * 이 쿠폰이 **대상으로 지목했는데 그 상품이 쿠폰을 거부하는** 상품들.
 *
 * [왜 지목한 경우만 충돌인가] '전체 회원' 쿠폰 아래에 쿠폰 불가 상품이 섞여 있는 것은 정상이다 —
 * 특가 한 건만 빼 두는 것이 바로 그 설정의 목적이다. 반대로 운영자가 **이 상품에 쓰라고 콕
 * 집어 만든 쿠폰**이 그 상품에서 거절당하는 것은 언제나 실수다. 그 경우만 화면에 올린다.
 *
 * [승자는 상품이다] 판정은 productAllowsCoupon 한 벌이 한다(그 머리말에 이유를 적었다).
 * 여기서 하는 일은 '어긋난 사실을 드러내는 것' 뿐이고, 계산을 뒤집지 않는다.
 */
export function conflictingProducts(
  coupon: Pick<Coupon, 'id' | 'target' | 'targetIds'>,
  products: readonly Product[],
): readonly Product[] {
  if (coupon.target !== 'product' && coupon.target !== 'category') return [];
  const targeted = new Set(coupon.targetIds);
  const key = (product: Product) => (coupon.target === 'product' ? product.id : product.categoryId);
  return products.filter(
    (product) => targeted.has(key(product)) && !productAllowsCoupon(product.coupons, coupon.id),
  );
}

/** 충돌 배지 문구 — 목록 열과 폼 경고가 같은 말을 쓴다 */
export function conflictLabel(count: number): string {
  return `쿠폰 불가 상품 ${formatNumber(count)}건`;
}

/* ── 발급 이력 ────────────────────────────────────────────────────────────── */

/**
 * 발급 1건 — 회원이 들고 있는 쿠폰의 **관리자 쪽 기록**.
 *
 * 회원 상세의 보유 쿠폰(shared/domain/member 의 IssuedCoupon)과 같은 사건을 반대편에서 본 것이다.
 * 그쪽은 '이 회원이 무엇을 들고 있나' 를, 이쪽은 '이 쿠폰이 어디로 얼마나 나갔나' 를 답한다.
 */
export interface CouponIssuance {
  readonly id: string;
  readonly couponId: string;
  /** 어느 발급 기준이 이 건을 냈는가 — 트리거별 집계의 축 */
  readonly source: CouponTriggerType;
  /** 받은 회원 표시명 — 픽스처는 가상 닉네임이다 */
  readonly member: string;
  readonly issuedAt: string;
  /** 사용일 — 미사용이면 null */
  readonly usedAt: string | null;
}

export interface CouponIssuanceStats {
  readonly issued: number;
  readonly used: number;
  /** 사용률(%) — 발급 대비 사용. 발급이 0 이면 0 */
  readonly usedRate: number;
  /** 트리거별 발급 건수 — 여섯 키가 **항상** 있어 화면이 폴백을 적지 않는다 */
  readonly bySource: Readonly<Record<CouponTriggerType, number>>;
}

function emptySourceCounts(): Record<CouponTriggerType, number> {
  return { manual: 0, signup: 0, tier_up: 0, birthday: 0, first_order: 0, download: 0 };
}

/** 발급 이력 → 발급/사용/사용률 + 트리거별 건수 (순수) */
export function summarizeIssuances(list: readonly CouponIssuance[]): CouponIssuanceStats {
  const bySource = emptySourceCounts();
  let used = 0;
  for (const entry of list) {
    bySource[entry.source] += 1;
    if (entry.usedAt !== null) used += 1;
  }
  const issued = list.length;
  return {
    issued,
    used,
    usedRate: issued === 0 ? 0 : Math.round((used / issued) * 100),
    bySource,
  };
}

/**
 * 쿠폰 id → 그 쿠폰의 발급 이력.
 *
 * `find` 로 매번 훑지 않는다 — 쿠폰 수 × 발급 수만큼 도는 것을 피하고, 무엇보다
 * '못 찾으면 아무거나' 실수가 구조적으로 불가능해진다(coupon-catalog.couponsById 와 같은 결).
 */
export function issuancesByCoupon(
  list: readonly CouponIssuance[],
): Readonly<Record<string, readonly CouponIssuance[]>> {
  const byCoupon: Record<string, CouponIssuance[]> = {};
  for (const entry of list) {
    const bucket = byCoupon[entry.couponId];
    if (bucket === undefined) byCoupon[entry.couponId] = [entry];
    else bucket.push(entry);
  }
  return byCoupon;
}

/** 트리거 필터('전체'면 전체) — 발급 이력 화면이 쓴다 */
export function filterIssuancesBySource(
  list: readonly CouponIssuance[],
  filter: CouponTriggerFilter,
): readonly CouponIssuance[] {
  if (filter === COUPON_FILTER_ALL) return list;
  return list.filter((entry) => entry.source === filter);
}
