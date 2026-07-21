// 쿠폰 참조 회귀 테스트 — 조회기 배선('모른다' vs '없다')·색인 조회·발급 쿠폰 조인(순수)
//
// [무엇을 지키나] 회원 보유 쿠폰은 예전에 자기 픽스처('00001-C1')를 지어냈고, 프로모션은 쿠폰코드를
// 자유 텍스트로 받았다. 그래서 회원 상세와 쿠폰 관리는 서로 다른 이야기를 했고 존재하지 않는 쿠폰이
// 조용히 저장됐다. 그 관계가 다시 끊어지지 않게 **참조 해소 규칙**을 순수 함수로 고정한다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  couponCatalog,
  couponEditPath,
  couponsById,
  findCatalogCoupon,
  registerCouponCatalogLookup,
  resetCouponCatalogLookup,
} from './coupon-catalog';
import type { CatalogCoupon } from './coupon-catalog';
import { joinIssuedCoupons } from './member';
import type { IssuedCoupon } from './member';

const CATALOG: readonly CatalogCoupon[] = [
  {
    id: 'cpn-1',
    name: '신규 가입 15% 할인',
    code: 'WELCOME15',
    benefitLabel: '15% 할인',
    endAt: '2026-09-30',
  },
  {
    id: 'cpn-2',
    name: '5,000원 재구매 쿠폰',
    code: 'AGAIN5000',
    benefitLabel: '5,000원 할인',
    endAt: '2026-08-31',
  },
];

afterEach(() => {
  resetCouponCatalogLookup();
});

describe('조회기 배선 — 모른다(null)와 없다([])는 다르다', () => {
  it('배선 전에는 null 이다 — 빈 배열이 아니다', () => {
    expect(couponCatalog()).toBeNull();
  });
  it('배선하면 조회기가 준 목록을 그대로 돌려준다', () => {
    registerCouponCatalogLookup(() => CATALOG);
    expect(couponCatalog()?.map((coupon) => coupon.id)).toEqual(['cpn-1', 'cpn-2']);
  });
  it('빈 카탈로그는 null 이 아니다 — 정말로 쿠폰이 하나도 없는 상태다', () => {
    registerCouponCatalogLookup(() => []);
    expect(couponCatalog()).toEqual([]);
  });
});

describe('참조 해소(순수)', () => {
  it('id 색인으로 찾는다 — 못 찾으면 null(아무거나 고르지 않는다)', () => {
    expect(findCatalogCoupon(CATALOG, 'cpn-2')?.code).toBe('AGAIN5000');
    expect(findCatalogCoupon(CATALOG, 'cpn-없음')).toBeNull();
  });
  it('색인은 id 를 키로 갖는다', () => {
    expect(Object.keys(couponsById(CATALOG))).toEqual(['cpn-1', 'cpn-2']);
  });
  it('상세 경로는 id 로 만든다 — 화면 사이를 잇는 유일한 실이다', () => {
    expect(couponEditPath('cpn-1')).toBe('/products/coupons/cpn-1/edit');
  });
});

describe('발급 쿠폰 조인 — 표시값은 카탈로그가 정본이다', () => {
  const issued: readonly IssuedCoupon[] = [
    { couponId: 'cpn-1', issuedAt: '2026-07-01', usedAt: null },
    { couponId: 'cpn-2', issuedAt: '2026-06-05', usedAt: '2026-06-20' },
  ];

  it('이름·혜택·만료일을 카탈로그에서 가져온다', () => {
    const [first] = joinIssuedCoupons(issued, CATALOG);
    expect(first).toEqual({
      couponId: 'cpn-1',
      name: '신규 가입 15% 할인',
      benefitLabel: '15% 할인',
      expiresAt: '2026-09-30',
      issuedAt: '2026-07-01',
      usedAt: null,
    });
  });
  it('발급/사용 시각은 발급 쪽 값이 그대로 남는다', () => {
    const joined = joinIssuedCoupons(issued, CATALOG);
    expect(joined.map((coupon) => coupon.usedAt)).toEqual([null, '2026-06-20']);
  });
  // [회귀] 카탈로그에서 사라진 쿠폰의 이름을 지어내면 화면은 없는 쿠폰을 있는 것처럼 말한다.
  it('카탈로그에 없는 참조는 표시값이 null 이다 — 이름을 지어내지 않는다', () => {
    const [orphan] = joinIssuedCoupons(
      [{ couponId: 'cpn-사라짐', issuedAt: '2026-07-01', usedAt: null }],
      CATALOG,
    );
    expect(orphan?.name).toBeNull();
    expect(orphan?.benefitLabel).toBeNull();
    expect(orphan?.expiresAt).toBeNull();
    // 참조 자체는 남는다 — 링크는 여전히 id 로 걸 수 있다
    expect(orphan?.couponId).toBe('cpn-사라짐');
  });
  it('발급이 없으면 빈 목록이다', () => {
    expect(joinIssuedCoupons([], CATALOG)).toEqual([]);
  });
});
