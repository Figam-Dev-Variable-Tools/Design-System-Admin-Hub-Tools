// 승급 쿠폰 조회기 회귀 테스트 — '없다' 와 '모른다' 를 가르는 계약 + 등급별 색인(순수)
import { afterEach, describe, expect, it } from 'vitest';

import {
  registerTierUpCouponLookup,
  resetTierUpCouponLookup,
  tierUpCoupons,
  tierUpCouponsByTier,
} from './coupon-issuance';
import type { TierUpCoupon } from './coupon-issuance';

const COUPONS: readonly TierUpCoupon[] = [
  {
    tier: 'vip',
    couponId: 'cpn-2',
    couponName: 'VIP 승급 축하 5,000원',
    benefitLabel: '5,000원 할인',
    enabled: true,
  },
  {
    tier: 'vvip',
    couponId: 'cpn-7',
    couponName: 'VVIP 승급 20% 쿠폰',
    benefitLabel: '20% 할인',
    enabled: false,
  },
];

afterEach(() => {
  resetTierUpCouponLookup();
});

describe('tierUpCoupons — 배선 계약', () => {
  // 빈 배열로 뭉개면 정책 화면이 '걸린 쿠폰이 없다' 는 완결된 거짓 문장을 그린다
  it('배선되지 않았으면 null 이다 — 빈 배열이 아니다', () => {
    resetTierUpCouponLookup();
    expect(tierUpCoupons()).toBeNull();
  });

  it('배선하면 조회기의 목록을 그대로 준다', () => {
    registerTierUpCouponLookup(() => COUPONS);
    expect(tierUpCoupons()).toEqual(COUPONS);
  });

  it('여러 번 등록해도 마지막 것이 산다(멱등)', () => {
    registerTierUpCouponLookup(() => COUPONS);
    registerTierUpCouponLookup(() => COUPONS);
    expect(tierUpCoupons()).toHaveLength(2);
  });
});

describe('tierUpCouponsByTier — 등급별 색인(순수)', () => {
  it('세 등급의 키가 항상 있다 — 화면이 폴백을 적지 않는다', () => {
    const byTier = tierUpCouponsByTier(COUPONS);
    expect(Object.keys(byTier).sort()).toEqual(['normal', 'vip', 'vvip']);
    expect(byTier.normal).toEqual([]);
  });

  it('등급별로 갈라 담는다', () => {
    const byTier = tierUpCouponsByTier(COUPONS);
    expect(byTier.vip.map((coupon) => coupon.couponId)).toEqual(['cpn-2']);
    expect(byTier.vvip.map((coupon) => coupon.couponId)).toEqual(['cpn-7']);
  });

  // 중지된 채 걸려 있는 규칙을 숨기면 '왜 안 나가지' 를 영원히 못 찾는다
  it('중지된 쿠폰도 목록에 남는다 — enabled 로 드러난다', () => {
    expect(tierUpCouponsByTier(COUPONS).vvip[0]?.enabled).toBe(false);
  });
});
