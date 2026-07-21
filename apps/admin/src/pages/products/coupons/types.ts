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
import { formatNumber, shiftDays } from '../../../shared/format';
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

export const COUPON_TRIGGER_OPTIONS: readonly TriggerOption[] = [
  { id: 'manual', label: '운영자 직접 발급', hint: '운영자가 회원을 골라 발급합니다.' },
  { id: 'signup', label: '회원 가입 시', hint: '가입이 완료된 직후 자동 발급됩니다.' },
  {
    id: 'tier_up',
    label: '회원 등급 승급 시',
    hint: '지정한 등급으로 올라간 회원에게 자동 발급됩니다.',
  },
  { id: 'birthday', label: '생일', hint: '생일 기준 지정한 일수 전에 자동 발급됩니다.' },
  { id: 'first_order', label: '첫 구매', hint: '첫 주문이 결제 완료되면 자동 발급됩니다.' },
  { id: 'download', label: '고객 다운로드', hint: '지정한 기간 동안 고객이 직접 받아 갑니다.' },
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

/** 회원등급 대상의 선택지 — 등급 개념의 정본은 shared/domain/member 다 */
export const MEMBER_TIER_TARGETS: readonly { readonly id: MemberTier; readonly label: string }[] = [
  { id: 'normal', label: TIER_LABEL.normal },
  { id: 'vip', label: TIER_LABEL.vip },
  { id: 'vvip', label: TIER_LABEL.vvip },
];

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
