// 쿠폰 동작 회귀 테스트 — 할인 표기·소진율·상태·필터·발급 기준·사용 조건·충돌(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import {
  buildCouponTrigger,
  buildUsagePeriod,
  conditionSummary,
  conflictingProducts,
  COUPON_TRIGGER_OPTIONS,
  couponExpiryFor,
  couponSaveBlockReason,
  couponStatus,
  discountLabel,
  EMPTY_SCOPE,
  filterByTrigger,
  filterCoupons,
  filterIssuancesBySource,
  isAutoIssued,
  isBuiltInTier,
  issuancesByCoupon,
  productsInScope,
  scopeAddableId,
  scopeCategoryPath,
  sortCoupons,
  summarizeIssuances,
  toCouponInput,
  triggerCondition,
  triggerSummary,
  usagePeriodLabel,
  usageRate,
  withScopeChild,
  withScopeRoot,
} from './types';
import type {
  Coupon,
  CouponGuardInput,
  CouponIssuance,
  CouponScope,
  ScopeCategory,
  ScopeProduct,
} from './types';
import { couponSchema } from './validation';
import type { CouponFormValues } from './validation';
import type { Product, ProductCouponPolicy } from '../_shared/store';

function couponOf(overrides: Partial<Coupon> & { id: string }): Coupon {
  return {
    name: '쿠폰',
    code: 'CODE',
    issueType: 'amount',
    discountValue: 5000,
    maxDiscount: 0,
    minOrderAmount: 0,
    trigger: { type: 'manual' },
    target: 'all',
    targetIds: [],
    stackable: false,
    usagePeriod: { kind: 'fixed' },
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

  it('toCouponInput 은 대상 목록을 복사한다 — 원본 배열을 공유하지 않는다', () => {
    const coupon = couponOf({ id: 'a', target: 'product', targetIds: ['prd-1'] });
    const input = toCouponInput(coupon);
    expect(input.targetIds).toEqual(['prd-1']);
    expect(input.targetIds).not.toBe(coupon.targetIds);
  });
});

/* ── 발급 기준(트리거) ────────────────────────────────────────────────────── */

describe('buildCouponTrigger — 폼 → 판별 유니온(순수)', () => {
  const draft = {
    type: 'manual',
    tier: 'vvip',
    birthdayDays: 14,
    from: '2026-08-01',
    to: '2026-08-05',
  } as const;

  it('승급이면 등급만 싣는다', () => {
    expect(buildCouponTrigger({ ...draft, type: 'tier_up' })).toEqual({
      type: 'tier_up',
      tier: 'vvip',
    });
  });

  it('생일이면 일수만 싣는다', () => {
    expect(buildCouponTrigger({ ...draft, type: 'birthday' })).toEqual({
      type: 'birthday',
      daysBefore: 14,
    });
  });

  it('다운로드면 기간만 싣는다', () => {
    expect(buildCouponTrigger({ ...draft, type: 'download' })).toEqual({
      type: 'download',
      from: '2026-08-01',
      to: '2026-08-05',
    });
  });

  // [회귀] 종류를 바꿔도 예전 파라미터가 남으면 '가입 시 발급인데 승급 등급 VVIP' 같은 값이 저장된다
  it('파라미터 없는 종류는 다른 칸의 값을 버린다', () => {
    expect(buildCouponTrigger({ ...draft, type: 'signup' })).toEqual({ type: 'signup' });
    expect(buildCouponTrigger({ ...draft, type: 'first_order' })).toEqual({ type: 'first_order' });
    expect(buildCouponTrigger(draft)).toEqual({ type: 'manual' });
  });
});

describe('triggerSummary — 발급 기준 요약(순수)', () => {
  it('파라미터를 문구에 싣는다 — 등급이 다르면 다른 문장이다', () => {
    expect(triggerSummary({ type: 'tier_up', tier: 'vip' })).toBe('VIP 승급 시');
    expect(triggerSummary({ type: 'tier_up', tier: 'vvip' })).toBe('VVIP 승급 시');
  });

  it('생일 당일과 N일 전을 구분한다', () => {
    expect(triggerSummary({ type: 'birthday', daysBefore: 0 })).toBe('생일 당일');
    expect(triggerSummary({ type: 'birthday', daysBefore: 7 })).toBe('생일 7일 전');
  });

  it('다운로드는 기간을 보여 준다', () => {
    expect(triggerSummary({ type: 'download', from: '2026-08-01', to: '2026-08-05' })).toContain(
      '2026-08-01',
    );
  });

  it('나머지 셋', () => {
    expect(triggerSummary({ type: 'manual' })).toBe('운영자 직접 발급');
    expect(triggerSummary({ type: 'signup' })).toBe('회원 가입 시');
    expect(triggerSummary({ type: 'first_order' })).toBe('첫 구매 시');
  });
});

describe('isAutoIssued — 자동 발급 여부(순수)', () => {
  it('수동만 false', () => {
    expect(isAutoIssued({ type: 'manual' })).toBe(false);
    expect(isAutoIssued({ type: 'tier_up', tier: 'vip' })).toBe(true);
  });
});

describe('filterByTrigger — 발급 기준 필터(순수)', () => {
  const list = [
    couponOf({ id: 'a', trigger: { type: 'tier_up', tier: 'vip' } }),
    couponOf({ id: 'b', trigger: { type: 'signup' } }),
  ];

  it('종류로 거른다', () => {
    expect(filterByTrigger(list, 'tier_up').map((c) => c.id)).toEqual(['a']);
    expect(filterByTrigger(list, 'all')).toHaveLength(2);
  });
});

/* ── 사용 조건 ────────────────────────────────────────────────────────────── */

describe('usagePeriodLabel · couponExpiryFor — 사용 기간(순수)', () => {
  it('고정 기간은 캠페인 기간을 그대로 쓴다', () => {
    const coupon = couponOf({ id: 'a' });
    expect(usagePeriodLabel(coupon)).toBe('2026-07-01 ~ 2026-07-31');
    expect(couponExpiryFor(coupon, '2026-07-10')).toBe('2026-07-31');
  });

  it('발급일 기준이면 회원마다 만료일이 다르다', () => {
    const coupon = couponOf({ id: 'a', usagePeriod: { kind: 'days_from_issue', days: 10 } });
    expect(usagePeriodLabel(coupon)).toBe('발급일로부터 10일');
    expect(couponExpiryFor(coupon, '2026-07-05')).toBe('2026-07-15');
  });

  // [회귀] 캠페인 마지막 날 받은 30일 쿠폰이 캠페인 종료 뒤에도 살아 있으면 화면이 거짓말을 한다
  it('캠페인 종료일이 먼저 오면 그날 만료된다', () => {
    const coupon = couponOf({ id: 'a', usagePeriod: { kind: 'days_from_issue', days: 30 } });
    expect(couponExpiryFor(coupon, '2026-07-30')).toBe('2026-07-31');
  });

  it('buildUsagePeriod 는 고정 기간에서 일수를 버린다', () => {
    expect(buildUsagePeriod('fixed', 30)).toEqual({ kind: 'fixed' });
    expect(buildUsagePeriod('days_from_issue', 30)).toEqual({ kind: 'days_from_issue', days: 30 });
  });
});

describe('conditionSummary — 사용 조건 요약(순수)', () => {
  it('중복 사용 여부를 항상 말한다', () => {
    expect(
      conditionSummary({
        issueType: 'amount',
        minOrderAmount: 0,
        maxDiscount: 0,
        stackable: false,
      }),
    ).toBe('다른 쿠폰과 중복 사용 불가');
    expect(
      conditionSummary({ issueType: 'amount', minOrderAmount: 0, maxDiscount: 0, stackable: true }),
    ).toBe('다른 쿠폰과 중복 사용 가능');
  });

  it('최소주문·정률 상한을 앞에 붙인다', () => {
    expect(
      conditionSummary({
        issueType: 'percent',
        minOrderAmount: 30000,
        maxDiscount: 20000,
        stackable: false,
      }),
    ).toBe('30,000원 이상 구매 시 · 최대 20,000원 · 다른 쿠폰과 중복 사용 불가');
  });
});

/* ── 쿠폰 ↔ 상품 충돌 ─────────────────────────────────────────────────────── */

function productOf(id: string, categoryId: string, coupons: ProductCouponPolicy): Product {
  return {
    id,
    name: `상품 ${id}`,
    code: id.toUpperCase(),
    categoryId,
    categoryLabel: categoryId,
    brand: '노바',
    pricing: {
      price: 10000,
      discountType: 'none',
      discountValue: 0,
      taxable: true,
    },
    saleStatus: 'on_sale',
    displayed: true,
    optionGroups: [],
    variants: [],
    shipping: { method: 'courier', feeType: 'free', fee: 0, freeThreshold: 0 },
    points: { mode: 'none', rate: 0, amount: 0 },
    coupons,
    coverImageUrl: '',
    imageUrls: [],
    description: '',
    tags: [],
  };
}

describe('conflictingProducts — 쿠폰이 지목했는데 상품이 거부한다(순수)', () => {
  const blocked = productOf('prd-1', 'outer', { usable: false, mode: 'all', couponIds: [] });
  const open = productOf('prd-2', 'outer', { usable: true, mode: 'all', couponIds: [] });
  const excluded = productOf('prd-3', 'top', {
    usable: true,
    mode: 'exclude',
    couponIds: ['cpn-1'],
  });
  const products = [blocked, open, excluded];

  it('상품을 지목했고 그 상품이 쿠폰 불가면 충돌이다', () => {
    const conflicts = conflictingProducts(
      { id: 'cpn-1', target: 'product', targetIds: ['prd-1', 'prd-2'] },
      products,
    );
    expect(conflicts.map((p) => p.id)).toEqual(['prd-1']);
  });

  it('제외 목록에 든 쿠폰도 충돌이다 — 지목해 놓고 빼 둔 것이다', () => {
    const conflicts = conflictingProducts(
      { id: 'cpn-1', target: 'product', targetIds: ['prd-3'] },
      products,
    );
    expect(conflicts.map((p) => p.id)).toEqual(['prd-3']);
  });

  it('카테고리를 지목해도 그 안의 쿠폰 불가 상품을 잡는다', () => {
    const conflicts = conflictingProducts(
      { id: 'cpn-1', target: 'category', targetIds: ['outer'] },
      products,
    );
    expect(conflicts.map((p) => p.id)).toEqual(['prd-1']);
  });

  // '전체 회원' 쿠폰 아래 특가 상품이 섞여 있는 것은 정상 운영이지 실수가 아니다
  it('지목하지 않은 대상(전체·회원등급)은 충돌이 아니다', () => {
    expect(conflictingProducts({ id: 'cpn-1', target: 'all', targetIds: [] }, products)).toEqual(
      [],
    );
    expect(
      conflictingProducts({ id: 'cpn-1', target: 'member_grade', targetIds: ['vip'] }, products),
    ).toEqual([]);
  });
});

/* ── 발급 이력 ────────────────────────────────────────────────────────────── */

const ISSUANCES: readonly CouponIssuance[] = [
  {
    id: 'i1',
    couponId: 'cpn-1',
    source: 'signup',
    member: '초록달팽이',
    issuedAt: '2026-07-01',
    usedAt: '2026-07-03',
  },
  {
    id: 'i2',
    couponId: 'cpn-1',
    source: 'signup',
    member: '바다안개',
    issuedAt: '2026-07-02',
    usedAt: null,
  },
  {
    id: 'i3',
    couponId: 'cpn-1',
    source: 'manual',
    member: '느린우체통',
    issuedAt: '2026-07-03',
    usedAt: null,
  },
  {
    id: 'i4',
    couponId: 'cpn-2',
    source: 'tier_up',
    member: '노을그림자',
    issuedAt: '2026-06-11',
    usedAt: '2026-06-20',
  },
];

describe('summarizeIssuances — 발급/사용/사용률·트리거별(순수)', () => {
  it('발급 3건 중 1건 사용 = 33%', () => {
    const stats = summarizeIssuances(ISSUANCES.filter((entry) => entry.couponId === 'cpn-1'));
    expect(stats.issued).toBe(3);
    expect(stats.used).toBe(1);
    expect(stats.usedRate).toBe(33);
  });

  it('트리거별 건수는 여섯 키가 항상 있다 — 화면이 폴백을 적지 않는다', () => {
    const stats = summarizeIssuances(ISSUANCES);
    expect(stats.bySource).toEqual({
      manual: 1,
      signup: 2,
      tier_up: 1,
      birthday: 0,
      first_order: 0,
      download: 0,
    });
  });

  it('발급이 0 이면 사용률도 0 이다 (0 나눗셈 없음)', () => {
    expect(summarizeIssuances([]).usedRate).toBe(0);
  });
});

describe('issuancesByCoupon · filterIssuancesBySource — 이력 색인·필터(순수)', () => {
  it('쿠폰별로 갈라 담는다', () => {
    const byCoupon = issuancesByCoupon(ISSUANCES);
    expect(byCoupon['cpn-1']).toHaveLength(3);
    expect(byCoupon['cpn-2']).toHaveLength(1);
    // 없는 쿠폰은 undefined 로 드러난다 — '못 찾으면 아무거나' 가 불가능하다
    expect(byCoupon['cpn-9']).toBeUndefined();
  });

  it('트리거로 거른다', () => {
    expect(filterIssuancesBySource(ISSUANCES, 'signup')).toHaveLength(2);
    expect(filterIssuancesBySource(ISSUANCES, 'all')).toHaveLength(4);
  });
});

/* ── 폼 검증 ──────────────────────────────────────────────────────────────── */

function valuesOf(overrides: Partial<CouponFormValues> = {}): CouponFormValues {
  return {
    name: '신규 15% 할인',
    code: 'WELCOME15',
    issueType: 'percent',
    discountValue: '15',
    maxDiscount: '20000',
    minOrderAmount: '30000',
    triggerType: 'manual',
    triggerTier: 'vip',
    triggerBirthdayDays: '7',
    triggerFrom: '',
    triggerTo: '',
    target: 'all',
    targetIds: [],
    stackable: false,
    usageKind: 'fixed',
    usageDays: '30',
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

describe('couponSchema — 발급 기준', () => {
  it('승급 발급은 등급만 있으면 통과한다', () => {
    expect(couponSchema.safeParse(valuesOf({ triggerType: 'tier_up' })).success).toBe(true);
  });

  it('생일 일수가 상한을 넘으면 무엇을 고칠지 말해 준다', () => {
    expect(
      messageFor(
        valuesOf({ triggerType: 'birthday', triggerBirthdayDays: '400' }),
        'triggerBirthdayDays',
      ),
    ).toContain('60일');
  });

  it('생일 당일(0)은 통과한다', () => {
    expect(
      couponSchema.safeParse(valuesOf({ triggerType: 'birthday', triggerBirthdayDays: '0' }))
        .success,
    ).toBe(true);
  });

  it('다운로드 기간이 비면 막는다', () => {
    expect(messageFor(valuesOf({ triggerType: 'download' }), 'triggerFrom')).toContain(
      'YYYY-MM-DD',
    );
  });

  // 받을 수는 있는데 쓸 수 없는 쿠폰을 만들지 않는다
  it('다운로드 종료일이 쿠폰 사용 종료일보다 늦으면 막는다', () => {
    expect(
      messageFor(
        valuesOf({
          triggerType: 'download',
          triggerFrom: '2026-07-01',
          triggerTo: '2026-12-31',
        }),
        'triggerTo',
      ),
    ).toContain('사용 종료일');
  });

  it('다운로드 기간이 캠페인 안이면 통과한다', () => {
    expect(
      couponSchema.safeParse(
        valuesOf({ triggerType: 'download', triggerFrom: '2026-07-01', triggerTo: '2026-07-10' }),
      ).success,
    ).toBe(true);
  });

  // 고르지 않은 종류의 칸은 저장될 때 버려지므로 검사하지 않는다
  it('수동 발급이면 생일·다운로드 칸이 비어도 통과한다', () => {
    expect(
      couponSchema.safeParse(valuesOf({ triggerType: 'manual', triggerBirthdayDays: '' })).success,
    ).toBe(true);
  });
});

describe('couponSchema — 사용 조건', () => {
  it('전체 회원이 아니면 대상을 골라야 한다', () => {
    expect(messageFor(valuesOf({ target: 'member_grade' }), 'targetIds')).toContain('선택');
    expect(
      couponSchema.safeParse(valuesOf({ target: 'member_grade', targetIds: ['vip'] })).success,
    ).toBe(true);
  });

  it('전체 회원이면 대상이 비어 있어도 통과한다', () => {
    expect(couponSchema.safeParse(valuesOf({ target: 'all', targetIds: [] })).success).toBe(true);
  });

  it('발급일 기준을 고르면 일수가 필요하다', () => {
    expect(
      messageFor(valuesOf({ usageKind: 'days_from_issue', usageDays: '' }), 'usageDays'),
    ).toContain('일수');
    expect(
      messageFor(valuesOf({ usageKind: 'days_from_issue', usageDays: '400' }), 'usageDays'),
    ).toContain('365');
  });

  it('고정 기간이면 일수가 비어도 통과한다', () => {
    expect(couponSchema.safeParse(valuesOf({ usageKind: 'fixed', usageDays: '' })).success).toBe(
      true,
    );
  });
});

/* ── 사용 대상 연쇄 선택 (1차 → 2차 → 상품) ─────────────────────────────────── */

const CATEGORIES: readonly ScopeCategory[] = [
  { id: 'outer', label: '아우터', parentId: null },
  { id: 'top', label: '상의', parentId: null },
  { id: 'outer-coat', label: '코트', parentId: 'outer' },
  { id: 'outer-jacket', label: '재킷', parentId: 'outer' },
];

const SCOPE_PRODUCTS: readonly ScopeProduct[] = [
  { id: 'p-outer', name: '패딩', code: 'PAD', categoryId: 'outer' },
  { id: 'p-coat', name: '롱코트', code: 'COAT', categoryId: 'outer-coat' },
  { id: 'p-top', name: '티셔츠', code: 'TEE', categoryId: 'top' },
];

describe('연쇄 선택의 초기화 규칙(순수)', () => {
  // 이것이 이 종류 UI 의 가장 흔한 버그다 — 남아 있는 하위 선택이 화면과 값을 어긋나게 한다
  it('1차를 바꾸면 2차와 상품을 버린다', () => {
    const before: CouponScope = { rootId: 'outer', childId: 'outer-coat', productId: 'p-coat' };
    expect(withScopeRoot('top')).toEqual({ rootId: 'top', childId: '', productId: '' });
    expect(withScopeRoot('top').childId).not.toBe(before.childId);
  });

  it('2차를 바꾸면 상품만 버리고 1차는 남긴다', () => {
    const before: CouponScope = { rootId: 'outer', childId: 'outer-coat', productId: 'p-coat' };
    expect(withScopeChild(before, 'outer-jacket')).toEqual({
      rootId: 'outer',
      childId: 'outer-jacket',
      productId: '',
    });
  });

  it('같은 1차를 다시 골라도 하위는 버린다 — 되살리지 않는다', () => {
    expect(withScopeRoot('outer').productId).toBe('');
  });
});

describe('productsInScope — 좌표 아래의 상품(순수)', () => {
  it('2차를 골랐으면 그 2차의 상품만', () => {
    const list = productsInScope(SCOPE_PRODUCTS, CATEGORIES, {
      rootId: 'outer',
      childId: 'outer-coat',
      productId: '',
    });
    expect(list.map((product) => product.id)).toEqual(['p-coat']);
  });

  it('1차만 골랐으면 그 1차와 그 아래 2차의 상품을 함께 준다', () => {
    const list = productsInScope(SCOPE_PRODUCTS, CATEGORIES, {
      rootId: 'outer',
      childId: '',
      productId: '',
    });
    expect(list.map((product) => product.id).sort()).toEqual(['p-coat', 'p-outer']);
  });

  it('1차조차 고르지 않았으면 비어 있다 — 전 상품을 쏟아 놓지 않는다', () => {
    expect(productsInScope(SCOPE_PRODUCTS, CATEGORIES, EMPTY_SCOPE)).toEqual([]);
  });
});

describe('scopeAddableId — 지금 더할 수 있는 id(순수)', () => {
  it('카테고리 대상: 2차가 있으면 2차, 없으면 1차', () => {
    expect(scopeAddableId('category', { rootId: 'outer', childId: '', productId: '' })).toBe(
      'outer',
    );
    expect(
      scopeAddableId('category', { rootId: 'outer', childId: 'outer-coat', productId: '' }),
    ).toBe('outer-coat');
  });

  it('상품 대상: 상품을 고르기 전에는 더할 것이 없다 — 카테고리만으로 성립하지 않는다', () => {
    expect(
      scopeAddableId('product', { rootId: 'outer', childId: 'outer-coat', productId: '' }),
    ).toBe('');
    expect(
      scopeAddableId('product', { rootId: 'outer', childId: 'outer-coat', productId: 'p-coat' }),
    ).toBe('p-coat');
  });
});

describe('scopeCategoryPath — 경로 표기(순수)', () => {
  it('2차는 부모를 앞에 붙인다', () => {
    expect(scopeCategoryPath(CATEGORIES, 'outer-coat')).toBe('아우터 > 코트');
    expect(scopeCategoryPath(CATEGORIES, 'outer')).toBe('아우터');
  });
});

/* ── 발급 시점별 조건 ─────────────────────────────────────────────────────── */

describe('triggerCondition — 시점이 더 묻는 것(순수)', () => {
  it('셋만 조건을 갖는다', () => {
    expect(triggerCondition('tier_up')).toBe('tier');
    expect(triggerCondition('birthday')).toBe('birthday-days');
    expect(triggerCondition('download')).toBe('download-period');
  });

  // 조건이 없는 시점에 셀렉트를 붙이면 저장되고 아무 데도 쓰이지 않는 값이 생긴다
  it('운영자 직접·가입·첫 구매는 조건이 없다', () => {
    expect(triggerCondition('manual')).toBeNull();
    expect(triggerCondition('signup')).toBeNull();
    expect(triggerCondition('first_order')).toBeNull();
  });

  it('여섯 시점의 힌트가 서로 다르고, 조건이 있는 시점은 그 칸을 가리킨다', () => {
    const hints = COUPON_TRIGGER_OPTIONS.map((option) => option.hint);
    expect(new Set(hints).size).toBe(hints.length);
    for (const option of COUPON_TRIGGER_OPTIONS) {
      const needsCondition = triggerCondition(option.id) !== null;
      expect(option.hint.includes('아래에서')).toBe(needsCondition);
      expect(option.hint.includes('조건이 없어요')).toBe(!needsCondition);
    }
  });
});

/* ── 저장 가드 ─────────────────────────────────────────────────────────────── */

function guardOf(overrides: Partial<CouponGuardInput> = {}): CouponGuardInput {
  return {
    target: 'all',
    targetIds: [],
    triggerType: 'manual',
    triggerTier: 'vip',
    targetOptions: 'known',
    tierOptions: 'known',
    ...overrides,
  };
}

describe('couponSaveBlockReason — 거부 사유(순수)', () => {
  it('막을 것이 없으면 null', () => {
    expect(couponSaveBlockReason(guardOf())).toBeNull();
  });

  it('특정 상품인데 아무것도 고르지 않았으면 사유를 돌려준다', () => {
    expect(couponSaveBlockReason(guardOf({ target: 'product' }))).toContain('대상 상품');
    expect(couponSaveBlockReason(guardOf({ target: 'product', targetIds: ['prd-1'] }))).toBeNull();
  });

  // '모른다' 는 '비었다' 가 아니다 — 고를 수 없었던 것을 고르지 않은 채로 저장시키지 않는다
  it('선택지를 모르면 고른 것이 있어도 저장을 막는다', () => {
    const reason = couponSaveBlockReason(
      guardOf({ target: 'category', targetIds: ['outer'], targetOptions: 'unknown' }),
    );
    expect(reason).toContain('불러오지 못했');
  });

  it('불러오는 중과 못 불러온 것은 다른 말을 한다', () => {
    expect(
      couponSaveBlockReason(guardOf({ target: 'category', targetOptions: 'loading' })),
    ).toContain('불러오는 중');
  });

  it('등급 승급 시점인데 등급 목록을 모르면 막는다', () => {
    expect(
      couponSaveBlockReason(guardOf({ triggerType: 'tier_up', tierOptions: 'unknown' })),
    ).toContain('회원 등급');
    expect(couponSaveBlockReason(guardOf({ triggerType: 'tier_up' }))).toBeNull();
  });

  it('등급 목록을 몰라도 승급 시점이 아니면 막지 않는다 — 필요 없는 조건으로 잠그지 않는다', () => {
    expect(
      couponSaveBlockReason(guardOf({ triggerType: 'signup', tierOptions: 'unknown' })),
    ).toBeNull();
  });

  it('발급 기준이 들 수 없는 등급(운영자 추가분)이면 막는다', () => {
    expect(
      couponSaveBlockReason(guardOf({ triggerType: 'tier_up', triggerTier: 'tier-gold' })),
    ).toContain('승급 대상 등급');
  });
});

describe('isBuiltInTier — 발급 기준이 들 수 있는 등급(순수)', () => {
  it('기본 제공 3종만 참이다', () => {
    expect(isBuiltInTier('vip')).toBe(true);
    expect(isBuiltInTier('normal')).toBe(true);
    expect(isBuiltInTier('vvip')).toBe(true);
    expect(isBuiltInTier('tier-gold')).toBe(false);
  });
});
