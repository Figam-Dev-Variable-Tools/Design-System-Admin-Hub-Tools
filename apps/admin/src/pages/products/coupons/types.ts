// 쿠폰 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 쿠폰은 카테고리 결합이 없어(포트폴리오 성공사례처럼) 프레임워크 createCrudAdapter 를 그대로 쓴다.
// 모델은 국내 커머스 어드민(카페24·스마트스토어) 쿠폰 관례를 따른다: 발급유형(정액/정률/무료배송)·
// 대상·사용조건(최소주문·최대할인)·발급수량·사용기간·상태.
import { formatNumber } from '../../../shared/format';
import type { StatusTone } from '../../../shared/ui';

/** 발급 유형 — 정액/정률/무료배송 */
export type CouponIssueType = 'amount' | 'percent' | 'free_shipping';
/** 발급 대상 — 전체/회원등급/카테고리/상품 */
export type CouponTarget = 'all' | 'member_grade' | 'category' | 'product';

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
  readonly target: CouponTarget;
  /** 발급 수량 — 0 이면 무제한 */
  readonly totalQuantity: number;
  /** 발급(다운로드)된 수량 */
  readonly issuedCount: number;
  /** 사용 기간 — 'YYYY-MM-DD' */
  readonly startAt: string;
  readonly endAt: string;
  /** 발급 상태 토글 — 끄면 기간 안이라도 발급되지 않는다 */
  readonly enabled: boolean;
}

export interface CouponInput {
  readonly name: string;
  readonly code: string;
  readonly issueType: CouponIssueType;
  readonly discountValue: number;
  readonly maxDiscount: number;
  readonly minOrderAmount: number;
  readonly target: CouponTarget;
  readonly totalQuantity: number;
  readonly issuedCount: number;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
}

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

export const COUPON_FILTER_ALL = 'all';
export type CouponIssueFilter = typeof COUPON_FILTER_ALL | CouponIssueType;

export function targetLabel(target: CouponTarget): string {
  return COUPON_TARGET_OPTIONS.find((option) => option.id === target)?.label ?? target;
}

/** 할인 요약 문구 — 목록·미리보기가 함께 쓴다 */
export function discountLabel(coupon: Pick<Coupon, 'issueType' | 'discountValue'>): string {
  if (coupon.issueType === 'free_shipping') return '무료배송';
  if (coupon.issueType === 'percent') return `${String(coupon.discountValue)}% 할인`;
  return `${formatNumber(coupon.discountValue)}원 할인`;
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
    target: coupon.target,
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
