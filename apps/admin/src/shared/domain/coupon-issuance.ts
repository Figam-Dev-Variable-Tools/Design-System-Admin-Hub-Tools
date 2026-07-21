// 등급 승급 → 쿠폰 발급 조회기 — **자리만** 만든다 (규칙의 정본은 상품 관리 쿠폰이 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 coupon-catalog 와 나누나]
// coupon-catalog 는 "연동 대상으로 고를 수 있는 쿠폰" 의 계약이고, 그 머리말이 못 박아 두었다 —
// 발급 조건은 그 계약에 넣지 않는다. 여기 필요한 것은 정확히 그 반대다: **'어느 등급으로
// 승급하면 어떤 쿠폰이 나가는가'** 라는 발급 규칙 한 줄. 둘을 한 계약에 섞으면 '쿠폰을 고르는
// 화면' 과 '정책을 읽는 화면' 이 같은 타입을 놓고 서로 다른 필드를 요구하게 된다.
//
// [왜 등급 정책 화면이 쿠폰을 직접 읽지 않나]
// `pages/customer-settings` → `pages/products` 는 페이지 간 결합이고 code-quality 축1
// (page-coupling, blocker, 임계값 0건)이 그대로 잡는다. 그리고 방향도 틀렸다 — '승급하면 무엇이
// 나가는가' 는 **쿠폰이 자기 발급 기준으로 선언한 사실**이지 등급 정책이 고르는 값이 아니다.
// 등급 정책 화면은 그 선언을 읽어 요약만 한다(읽기 전용). 꽂는 일은 두 도메인을 아는
// `src/wiring.ts` 가 한다 — coupon-catalog.ts 와 똑같은 이음매다.
//
// [왜 fail-closed 가 아니라 '모른다(null)' 인가]
// 배선되지 않았을 때 빈 배열을 주면 정책 화면은 '승급 시 발급되는 쿠폰이 없습니다' 라는 완결된
// 문장을 그린다 — 운영자는 그것을 사실로 읽고 멀쩡히 걸어 둔 쿠폰을 다시 만들러 간다.
// 배선 사고를 정책 사고처럼 보이게 만드는 화면이다. 그래서 '없다' 와 '모른다' 를 가른다.
// ─────────────────────────────────────────────────────────────────────────────
import type { MemberTier } from './member';

/**
 * 승급 시 발급되는 쿠폰 한 건 — **읽는 쪽이 그대로 그릴 수 있는 값만** 담는다.
 *
 * 할인값·최소주문·수량은 여기 없다. 등급 정책 화면이 답해야 하는 질문은 '무엇이 나가는가' 이지
 * '얼마나 깎이는가' 가 아니다 — 자세한 것은 링크를 눌러 쿠폰 원본에서 본다.
 */
export interface TierUpCoupon {
  /** 이 등급으로 **올라갔을 때** 발급된다 */
  readonly tier: MemberTier;
  /** 상품 관리 쿠폰의 id — 링크가 이 값을 쓴다(couponEditPath) */
  readonly couponId: string;
  readonly couponName: string;
  /** 할인 요약 문구('15% 할인') — 표기 규칙의 정본은 쿠폰 모듈의 discountLabel 이다 */
  readonly benefitLabel: string;
  /**
   * 발급 상태 — 꺼져 있으면 승급해도 나가지 않는다.
   *
   * 걸러 내지 않고 실어 보내는 이유: 정책 화면은 '중지된 채 걸려 있다' 는 사실을 보여 줘야 한다.
   * 목록에서 지우면 운영자는 규칙 자체가 없다고 읽고, 왜 쿠폰이 안 나가는지 영원히 못 찾는다.
   */
  readonly enabled: boolean;
}

type TierUpCouponLookup = () => readonly TierUpCoupon[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let lookup: TierUpCouponLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerTierUpCouponLookup(next: TierUpCouponLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetTierUpCouponLookup(): void {
  lookup = null;
}

/** 지금 승급 시 발급되도록 걸려 있는 쿠폰 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function tierUpCoupons(): readonly TierUpCoupon[] | null {
  if (lookup === null) return null;
  return lookup();
}

/**
 * 등급 → 그 등급 승급 시 발급되는 쿠폰들.
 *
 * `filter` 를 등급마다 다시 도는 대신 한 번에 갈라 담는다. 무엇보다 세 등급의 키가 **항상
 * 존재**하므로 화면이 `?? []` 같은 폴백을 손으로 적지 않는다 — 빈 등급은 빈 배열로 드러난다.
 */
export function tierUpCouponsByTier(
  list: readonly TierUpCoupon[],
): Readonly<Record<MemberTier, readonly TierUpCoupon[]>> {
  const byTier: Record<MemberTier, TierUpCoupon[]> = { normal: [], vip: [], vvip: [] };
  for (const entry of list) byTier[entry.tier].push(entry);
  return byTier;
}
