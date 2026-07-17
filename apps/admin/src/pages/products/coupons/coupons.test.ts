// 쿠폰 동작 회귀 테스트 (A41) — 할인 표기·소진율·상태·필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import {
  couponStatus,
  discountLabel,
  filterCoupons,
  sortCoupons,
  toCouponInput,
  usageRate,
} from './types';
import type { Coupon } from './types';
import { couponSchema } from './validation';
import type { CouponFormValues } from './validation';

function couponOf(overrides: Partial<Coupon> & { id: string }): Coupon {
  return {
    name: '쿠폰',
    code: 'CODE',
    issueType: 'amount',
    discountValue: 5000,
    maxDiscount: 0,
    minOrderAmount: 0,
    target: 'all',
    totalQuantity: 100,
    issuedCount: 25,
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    enabled: true,
    ...overrides,
  };
}

describe('discountLabel — 할인 표기(순수)', () => {
  it('정액/정률/무료배송', () => {
    expect(discountLabel({ issueType: 'amount', discountValue: 5000 })).toBe('5,000원 할인');
    expect(discountLabel({ issueType: 'percent', discountValue: 15 })).toBe('15% 할인');
    expect(discountLabel({ issueType: 'free_shipping', discountValue: 0 })).toBe('무료배송');
  });
});

describe('usageRate — 소진율(순수)', () => {
  it('발급 수량 대비 발급 수', () => {
    expect(usageRate({ totalQuantity: 100, issuedCount: 25 })).toBe(25);
  });
  it('무제한(0)은 0', () => {
    expect(usageRate({ totalQuantity: 0, issuedCount: 999 })).toBe(0);
  });
});

describe('couponStatus — 상태 파생(순수)', () => {
  it('끄면 중지', () => {
    expect(couponStatus(couponOf({ id: 'a', enabled: false }), '2026-07-10')).toBe('disabled');
  });
  it('기간 전이면 예정', () => {
    expect(couponStatus(couponOf({ id: 'a' }), '2026-06-01')).toBe('scheduled');
  });
  it('기간 후면 만료', () => {
    expect(couponStatus(couponOf({ id: 'a' }), '2026-08-01')).toBe('expired');
  });
  it('기간 내면 진행중', () => {
    expect(couponStatus(couponOf({ id: 'a' }), '2026-07-10')).toBe('active');
  });
});

describe('필터·정렬·변환(순수)', () => {
  const list = [
    couponOf({ id: 'a', issueType: 'percent', startAt: '2026-07-01' }),
    couponOf({ id: 'b', issueType: 'amount', startAt: '2026-08-01' }),
  ];

  it('발급유형 필터', () => {
    expect(filterCoupons(list, 'percent').map((c) => c.id)).toEqual(['a']);
    expect(filterCoupons(list, 'all')).toHaveLength(2);
  });

  it('시작일 내림차순 정렬', () => {
    expect(sortCoupons(list).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('toCouponInput 은 id 를 뺀다', () => {
    expect(toCouponInput(couponOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});

function valuesOf(overrides: Partial<CouponFormValues> = {}): CouponFormValues {
  return {
    name: '신규 15% 할인',
    code: 'WELCOME15',
    issueType: 'percent',
    discountValue: '15',
    maxDiscount: '20000',
    minOrderAmount: '30000',
    target: 'all',
    totalQuantity: '1000',
    startAt: '2026-07-01',
    endAt: '2026-09-30',
    enabled: true,
    issuedCount: 0,
    ...overrides,
  };
}

function messageFor(values: CouponFormValues, path: string): string | undefined {
  const result = couponSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('couponSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(couponSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('쿠폰명·코드가 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
    expect(messageFor(valuesOf({ code: '' }), 'code')).toContain('입력');
  });

  it('코드에 허용되지 않은 문자가 있으면 막는다', () => {
    expect(messageFor(valuesOf({ code: '할인!' }), 'code')).toContain('영문');
  });

  it('정률 할인율이 100%를 넘으면 막는다', () => {
    expect(messageFor(valuesOf({ discountValue: '150' }), 'discountValue')).toContain('100%');
  });

  it('종료일이 시작일보다 빠르면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-09-30', endAt: '2026-07-01' }), 'endAt')).toContain(
      '빠를',
    );
  });

  it('무료배송은 할인값 없이도 통과한다', () => {
    expect(
      couponSchema.safeParse(valuesOf({ issueType: 'free_shipping', discountValue: '' })).success,
    ).toBe(true);
  });
  // [회귀] 여기 있던 사본 isRealDate 는 형식만 보고 실재 여부를 보지 않아 2026-02-31 을
  // 통과시켰다(Date 가 3/3 으로 굴린 뒤 !Number.isNaN 이 참). 정본 isCalendarDate 로 수렴해 막는다.
  it('달력에 없는 날짜(2026-02-31)를 주면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-02-31' }), 'startAt')).toContain('YYYY-MM-DD');
  });
});
