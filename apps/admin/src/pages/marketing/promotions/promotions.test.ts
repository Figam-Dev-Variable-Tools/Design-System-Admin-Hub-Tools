// 프로모션 회귀 테스트 — 할인표기·필터·정렬(순수) + 폼 검증(기간·할인값·정률상한·쿠폰 참조)
import { describe, expect, it } from 'vitest';

import {
  discountLabel,
  filterPromotions,
  hasLinkedCoupon,
  searchPromotions,
  sortPromotions,
  toPromotionInput,
} from './types';
import type { Promotion } from './types';
import { promotionSchema } from './validation';
import type { PromotionFormValues } from './validation';

function promotionOf(overrides: Partial<Promotion> & { id: string }): Promotion {
  return {
    title: '프로모션',
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    phase: 'ongoing',
    target: '전체 회원',
    discountType: 'rate',
    discountValue: 20,
    minOrderAmount: 0,
    couponId: '',
    couponName: '',
    description: '',
    ...overrides,
  };
}

describe('할인표기·필터·정렬·변환(순수)', () => {
  it('정률·정액 표기', () => {
    expect(discountLabel('rate', 20)).toBe('20%');
    expect(discountLabel('amount', 5000)).toBe('5,000원');
  });
  const list = [
    promotionOf({ id: 'a', title: '가프로모션', phase: 'ongoing', startAt: '2026-07-01' }),
    promotionOf({ id: 'b', title: '나프로모션', phase: 'ended', startAt: '2026-03-01' }),
  ];
  it('상태 필터·검색·정렬', () => {
    expect(filterPromotions(list, 'ended').map((p) => p.id)).toEqual(['b']);
    expect(searchPromotions(list, '나프로모션').map((p) => p.id)).toEqual(['b']);
    expect(sortPromotions(list).map((p) => p.id)).toEqual(['a', 'b']);
  });
  it('toPromotionInput 은 id 를 뺀다', () => {
    expect(toPromotionInput(promotionOf({ id: 'a' }))).not.toHaveProperty('id');
  });
  // [회귀] 연동 여부가 couponLinked 불리언으로 따로 저장되던 시절에는 '연동함 + 코드 없음' 이라는
  // 어긋난 상태가 만들어졌다. 이제 판정의 정본은 참조 하나다.
  it('연동 여부는 couponId 하나에서 파생한다', () => {
    expect(hasLinkedCoupon(promotionOf({ id: 'a', couponId: 'cpn-1' }))).toBe(true);
    expect(hasLinkedCoupon(promotionOf({ id: 'b', couponId: '' }))).toBe(false);
  });
  it('표시용 쿠폰명이 비어도 참조는 남는다 — 링크는 id 로 건다', () => {
    const promotion = promotionOf({ id: 'a', couponId: 'cpn-4', couponName: '' });
    expect(hasLinkedCoupon(promotion)).toBe(true);
    expect(toPromotionInput(promotion).couponId).toBe('cpn-4');
  });
});

function valuesOf(overrides: Partial<PromotionFormValues> = {}): PromotionFormValues {
  return {
    title: '여름 할인',
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    phase: 'ongoing',
    target: '전체 회원',
    discountType: 'rate',
    discountValue: '20',
    minOrderAmount: '30000',
    couponLinked: false,
    couponId: '',
    description: '',
    ...overrides,
  };
}

function messageFor(values: PromotionFormValues, path: string): string | undefined {
  const result = promotionSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('promotionSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(promotionSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('할인값이 0이면 막는다', () => {
    expect(messageFor(valuesOf({ discountValue: '0' }), 'discountValue')).toContain('0보다');
  });
  it('정률 100 초과는 막는다', () => {
    expect(
      messageFor(valuesOf({ discountType: 'rate', discountValue: '120' }), 'discountValue'),
    ).toContain('100');
  });
  it('정액은 100 초과여도 통과한다', () => {
    expect(
      promotionSchema.safeParse(valuesOf({ discountType: 'amount', discountValue: '5000' }))
        .success,
    ).toBe(true);
  });
  it('종료일이 시작일보다 빠르면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-07-31', endAt: '2026-07-01' }), 'endAt')).toContain(
      '빠를',
    );
  });
  it('쿠폰 연동인데 선택이 없으면 막는다', () => {
    expect(messageFor(valuesOf({ couponLinked: true, couponId: '' }), 'couponId')).toContain(
      '쿠폰',
    );
  });
  it('쿠폰을 고르면 통과한다 — 값은 카탈로그의 id 다', () => {
    expect(
      promotionSchema.safeParse(valuesOf({ couponLinked: true, couponId: 'cpn-1' })).success,
    ).toBe(true);
  });
  // [회귀] 여기 있던 사본 isRealDate 는 형식만 보고 실재 여부를 보지 않아 2026-02-31 을
  // 통과시켰다(Date 가 3/3 으로 굴린 뒤 !Number.isNaN 이 참). 정본 isCalendarDate 로 수렴해 막는다.
  it('달력에 없는 날짜(2026-02-31)를 주면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-02-31' }), 'startAt')).toContain('YYYY-MM-DD');
  });
});
