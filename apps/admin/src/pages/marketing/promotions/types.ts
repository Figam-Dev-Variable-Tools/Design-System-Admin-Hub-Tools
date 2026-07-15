// 프로모션 도메인 타입 · 순수 규칙 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// 프로모션: 할인 중심(정률/정액)의 판촉. 기간·상태(예정/진행/종료)·대상은 _shared/campaign 을 공유하고,
// 할인유형·할인값·최소주문금액·쿠폰 연동을 더한다.
import { formatNumber } from '../../../shared/format';
import type { CampaignPhase } from '../_shared/campaign';

type DiscountType = 'rate' | 'amount';

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const DISCOUNT_TYPE_OPTIONS: readonly Option<DiscountType>[] = [
  { id: 'rate', label: '정률(%)' },
  { id: 'amount', label: '정액(원)' },
] as const;

export interface Promotion {
  readonly id: string;
  readonly title: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly phase: CampaignPhase;
  readonly target: string;
  readonly discountType: DiscountType;
  /** 할인값 — 정률이면 %, 정액이면 원 */
  readonly discountValue: number;
  /** 최소 주문금액(원) — 0 이면 조건 없음 */
  readonly minOrderAmount: number;
  /** 쿠폰 연동 여부 */
  readonly couponLinked: boolean;
  /** 연동 쿠폰코드(연동 시) */
  readonly couponCode: string;
  readonly description: string;
}

export type PromotionInput = Omit<Promotion, 'id'>;

export const PROMOTION_TITLE_MAX = 80;
export const PROMOTION_DESC_MAX = 1000;
/** 정률 할인 상한(%) */
export const DISCOUNT_RATE_MAX = 100;

/** 할인 표기 — '20%' / '5,000원' */
export function discountLabel(type: DiscountType, value: number): string {
  return type === 'rate' ? `${String(value)}%` : `${formatNumber(value)}원`;
}

export const PROMOTION_FILTER_ALL = 'all';
export type PromotionPhaseFilter = typeof PROMOTION_FILTER_ALL | CampaignPhase;

export function filterPromotions(
  list: readonly Promotion[],
  phase: PromotionPhaseFilter,
): readonly Promotion[] {
  if (phase === PROMOTION_FILTER_ALL) return list;
  return list.filter((promotion) => promotion.phase === phase);
}

export function searchPromotions(
  list: readonly Promotion[],
  keyword: string,
): readonly Promotion[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (promotion) =>
      promotion.title.toLowerCase().includes(needle) ||
      promotion.target.toLowerCase().includes(needle),
  );
}

export function sortPromotions(list: readonly Promotion[]): readonly Promotion[] {
  return [...list].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt < b.startAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function toPromotionInput(promotion: Promotion): PromotionInput {
  return {
    title: promotion.title,
    startAt: promotion.startAt,
    endAt: promotion.endAt,
    phase: promotion.phase,
    target: promotion.target,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    minOrderAmount: promotion.minOrderAmount,
    couponLinked: promotion.couponLinked,
    couponCode: promotion.couponCode,
    description: promotion.description,
  };
}
