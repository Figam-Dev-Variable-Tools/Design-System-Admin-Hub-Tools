// 프로모션 도메인 타입 · 순수 규칙
//
// 프로모션: 할인 중심(정률/정액)의 판촉. 기간·상태(예정/진행/종료)·대상은 _shared/campaign 을 공유하고,
// 할인유형·할인값·최소주문금액·쿠폰 연동을 더한다.
//
// [쿠폰 연동은 참조다] 연동 대상 목록은 상품 관리 쿠폰이 갖는다. 이 모듈은 그 모듈을 import 하지
// 않고(페이지 간 결합) shared/domain/coupon-catalog 조회기가 주는 것만 고른다.
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
  /**
   * 연동 쿠폰 id — **'' 면 미연동**. 정본은 상품 관리 쿠폰이다(shared/domain/coupon-catalog).
   *
   * [예전엔 쿠폰코드 자유 텍스트였다] 'SUMMER20' 을 손으로 적었고, 그런 쿠폰이 없어도 조용히
   * 저장됐다. 오타는 아무도 막지 못했고 프로모션에서 쿠폰으로 건너뛸 길도 없었다.
   * 이제 선택 목록이 카탈로그에서 오므로 존재하지 않는 쿠폰은 애초에 고를 수 없다.
   *
   * [couponLinked 불리언은 사라졌다] '연동함' 과 '연동 쿠폰이 있음' 이 따로 저장되면 둘이
   * 어긋나는 상태(연동함 + 코드 없음)가 만들어진다. 연동 여부는 이 값 하나에서 파생한다.
   */
  readonly couponId: string;
  /**
   * 조회 시점 쿠폰명(비정규화) — 목록이 카탈로그 조인 없이 바로 그린다.
   *
   * 이 저장소가 쓰는 관례다(고객센터 티켓의 categoryLabel, 영업 정산의 accountName 과 같은 결):
   * 표시용 사본은 서버 응답에 실어 목록 렌더가 N건의 조인을 하지 않게 한다. **정본은 id 쪽**이라
   * 이름이 바뀌면 다음 조회에서 새 값으로 덮인다 — 판단(중복·링크)은 언제나 id 로 한다.
   */
  readonly couponName: string;
  readonly description: string;
}

/** 쿠폰이 연동된 프로모션인가 — 상태값 리터럴('')을 화면마다 흩뿌리지 않는다 */
export function hasLinkedCoupon(promotion: Pick<Promotion, 'couponId'>): boolean {
  return promotion.couponId !== '';
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
    couponId: promotion.couponId,
    couponName: promotion.couponName,
    description: promotion.description,
  };
}
