// 상품 동작 회귀 테스트 (A41) — 재고·가격·옵션 매트릭스·필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import {
  buildVariantMatrix,
  countProductsByCategory,
  countProductsBySaleStatus,
  countProductsUsingCategory,
  discountRate,
  earnedPoints,
  filterBySaleStatus,
  filterProducts,
  finalPrice,
  isLowStock,
  PRODUCT_DESCRIPTION_MAX,
  searchProducts,
  sortProducts,
  totalStock,
} from '../_shared/store';
import type { Product, ProductOptionGroup, ProductVariant } from '../_shared/store';
import { toProductInput } from './types';
import { productSchema } from './validation';
import type { ProductFormValues } from './validation';

function variantOf(overrides: Partial<ProductVariant> & { id: string }): ProductVariant {
  return { sku: 'SKU', optionValues: [], addPrice: 0, stock: 10, soldOut: false, ...overrides };
}

function productOf(overrides: Partial<Product> & { id: string }): Product {
  return {
    name: '상품',
    code: 'CODE',
    categoryId: 'top',
    categoryLabel: '상의',
    brand: '노바',
    pricing: { price: 10000, discountType: 'none', discountValue: 0, taxable: true },
    saleStatus: 'on_sale',
    displayed: true,
    optionGroups: [],
    variants: [variantOf({ id: 'v1', stock: 10 })],
    shipping: { method: 'courier', feeType: 'free', fee: 0, freeThreshold: 0 },
    points: { mode: 'rate', rate: 1, amount: 0 },
    coverImageUrl: 'blob:cover',
    imageUrls: [],
    description: '',
    tags: [],
    ...overrides,
  };
}

describe('totalStock — SKU 재고 합(순수)', () => {
  it('여러 SKU 재고를 더한다', () => {
    const product = productOf({
      id: 'a',
      variants: [variantOf({ id: 'v1', stock: 3 }), variantOf({ id: 'v2', stock: 4 })],
    });
    expect(totalStock(product)).toBe(7);
  });
});

describe('finalPrice · discountRate — 할인 반영(순수)', () => {
  it('정률 할인은 비율로 깎는다', () => {
    const pricing = {
      price: 100000,
      discountType: 'percent' as const,
      discountValue: 20,
      taxable: true,
    };
    expect(finalPrice(pricing)).toBe(80000);
    expect(discountRate(pricing)).toBe(20);
  });

  it('정액 할인은 금액을 뺀다', () => {
    const pricing = {
      price: 89000,
      discountType: 'amount' as const,
      discountValue: 10000,
      taxable: true,
    };
    expect(finalPrice(pricing)).toBe(79000);
  });

  it('할인 없음은 정가 그대로', () => {
    const pricing = {
      price: 19900,
      discountType: 'none' as const,
      discountValue: 0,
      taxable: true,
    };
    expect(finalPrice(pricing)).toBe(19900);
    expect(discountRate(pricing)).toBe(0);
  });
});

describe('earnedPoints — 상품별 적립(순수)', () => {
  const pricing = { price: 100000, discountType: 'percent' as const, discountValue: 20 };

  it('정률은 할인 반영 최종가 기준으로 적립한다', () => {
    // 정가 100,000 이 아니라 최종가 80,000 의 2% — 정가 기준이면 실결제액보다 많이 준다
    expect(earnedPoints(pricing, { mode: 'rate', rate: 2, amount: 0 })).toBe(1600);
  });

  it('정액은 가격과 무관하게 그 금액을 적립한다', () => {
    expect(earnedPoints(pricing, { mode: 'fixed', rate: 0, amount: 2000 })).toBe(2000);
  });

  it('미적용은 0P', () => {
    expect(earnedPoints(pricing, { mode: 'none', rate: 5, amount: 5000 })).toBe(0);
  });

  it('정률 적립은 원 단위로 절사한다', () => {
    const odd = { price: 19900, discountType: 'none' as const, discountValue: 0 };
    // 19,900 × 1% = 199 — 소수점이 남는 경우에도 정수 포인트만 준다
    expect(earnedPoints(odd, { mode: 'rate', rate: 1, amount: 0 })).toBe(199);
    expect(earnedPoints({ ...odd, price: 19999 }, { mode: 'rate', rate: 1, amount: 0 })).toBe(199);
  });
});

describe('countProductsByCategory · countProductsBySaleStatus — 좌측 필터 건수(순수)', () => {
  const list = [
    productOf({ id: 'a', categoryId: 'top', saleStatus: 'on_sale' }),
    productOf({ id: 'b', categoryId: 'top', saleStatus: 'stopped' }),
    productOf({ id: 'c', categoryId: 'bottom', saleStatus: 'on_sale' }),
  ];

  it('카테고리별 건수를 센다', () => {
    expect(countProductsByCategory(list)).toEqual({ top: 2, bottom: 1 });
  });

  it('판매상태별 건수를 센다 — 0건 상태도 키를 남긴다', () => {
    expect(countProductsBySaleStatus(list)).toEqual({ on_sale: 2, sold_out: 0, stopped: 1 });
  });
});

describe('isLowStock — 재고 부족 경고(순수)', () => {
  it('임계값 미만이면 부족', () => {
    expect(isLowStock(productOf({ id: 'a', variants: [variantOf({ id: 'v', stock: 3 })] }))).toBe(
      true,
    );
  });

  it('재고 0은 부족이 아니다(품절로 따로 표기)', () => {
    expect(isLowStock(productOf({ id: 'a', variants: [variantOf({ id: 'v', stock: 0 })] }))).toBe(
      false,
    );
  });

  it('판매중지는 경고하지 않는다', () => {
    const product = productOf({
      id: 'a',
      saleStatus: 'stopped',
      variants: [variantOf({ id: 'v', stock: 2 })],
    });
    expect(isLowStock(product)).toBe(false);
  });
});

describe('buildVariantMatrix — 옵션 조합 매트릭스(순수)', () => {
  const groups: readonly ProductOptionGroup[] = [
    { id: 'g1', name: '색상', values: ['블랙', '화이트'] },
    { id: 'g2', name: '사이즈', values: ['S', 'M'] },
  ];

  it('데카르트 곱만큼 SKU 를 만든다', () => {
    const matrix = buildVariantMatrix(groups, [], 'CODE');
    expect(matrix).toHaveLength(4);
    expect(matrix.map((v) => v.optionValues)).toEqual([
      ['블랙', 'S'],
      ['블랙', 'M'],
      ['화이트', 'S'],
      ['화이트', 'M'],
    ]);
  });

  it('기존 조합의 재고·추가금을 보존한다', () => {
    const existing = [
      variantOf({ id: 'keep', optionValues: ['블랙', 'S'], stock: 99, addPrice: 500 }),
    ];
    const matrix = buildVariantMatrix(groups, existing, 'CODE');
    const kept = matrix.find((v) => v.optionValues.join() === '블랙,S');
    expect(kept?.stock).toBe(99);
    expect(kept?.addPrice).toBe(500);
  });

  it('옵션이 없으면 단일 SKU 한 줄', () => {
    expect(buildVariantMatrix([], [], 'CODE')).toHaveLength(1);
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    productOf({ id: 'a', name: '가디건', categoryId: 'top', saleStatus: 'on_sale', code: 'AAA' }),
    productOf({
      id: 'b',
      name: '청바지',
      categoryId: 'bottom',
      saleStatus: 'sold_out',
      code: 'BBB',
    }),
    productOf({ id: 'c', name: '자켓', categoryId: 'top', saleStatus: 'stopped', code: 'CCC' }),
  ];

  it('카테고리 필터', () => {
    expect(filterProducts(list, 'top').map((p) => p.id)).toEqual(['a', 'c']);
    expect(filterProducts(list, 'all')).toHaveLength(3);
  });

  it('판매상태 필터', () => {
    expect(filterBySaleStatus(list, 'sold_out').map((p) => p.id)).toEqual(['b']);
  });

  it('상품명·SKU 검색(대소문자 무시)', () => {
    expect(searchProducts(list, 'bbb').map((p) => p.id)).toEqual(['b']);
    expect(searchProducts(list, '자켓').map((p) => p.id)).toEqual(['c']);
  });

  it('상품명 가나다 정렬', () => {
    expect(sortProducts(list).map((p) => p.name)).toEqual(['가디건', '자켓', '청바지']);
  });

  it('카테고리 사용 수 — 삭제 차단 판단', () => {
    expect(countProductsUsingCategory('top', list)).toBe(2);
    expect(countProductsUsingCategory('shoes', list)).toBe(0);
  });
});

describe('toProductInput — 항목 → 폼 입력', () => {
  it('id·비정규화 라벨을 뺀 입력을 만든다', () => {
    const input = toProductInput(productOf({ id: 'a', name: '패딩' }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('categoryLabel');
    expect(input.name).toBe('패딩');
  });

  // [상세설명 마이그레이션] description 은 이제 HTML 이다(RichTextField). textarea 시절에 저장된
  // 평문이 남아 있어도 폼이 그대로 먹으면 서식이 없는 한 덩어리가 되므로 여기서 승격한다.
  it('상세설명이 평문이면(textarea 시절 값) <p> 로 승격한다', () => {
    const input = toProductInput(productOf({ id: 'a', description: '가벼운 패딩입니다.' }));
    expect(input.description).toBe('<p>가벼운 패딩입니다.</p>');
  });

  it('상세설명이 이미 HTML 이면 그대로 둔다 — 읽을 때마다 불러도 안전하다(멱등)', () => {
    const html = '<p>이미 <strong>서식</strong>이 있는 본문</p>';
    expect(toProductInput(productOf({ id: 'a', description: html })).description).toBe(html);
  });

  it('상세설명에 섞인 script 는 승격 과정에서 지워진다', () => {
    const input = toProductInput(
      productOf({ id: 'a', description: '<p>본문</p><script>alert(1)</script>' }),
    );
    expect(input.description).not.toContain('script');
    expect(input.description).toContain('본문');
  });
});

function valuesOf(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    name: '루미엔 패딩',
    code: 'LMN-001',
    categoryId: 'outer',
    brand: '루미엔',
    price: '129000',
    discountType: 'percent',
    discountValue: '20',
    taxable: true,
    saleStatus: 'on_sale',
    displayed: true,
    shipping: { method: 'courier', feeType: 'conditional', fee: '3000', freeThreshold: '50000' },
    points: { mode: 'rate', rate: '1', amount: '' },
    optionGroups: [],
    variants: [
      { id: 'v', sku: 'LMN-001', optionValues: [], addPrice: 0, stock: 10, soldOut: false },
    ],
    coverImageUrl: 'blob:cover',
    imageUrls: [],
    description: '',
    tags: [],
    ...overrides,
  };
}

function messageFor(values: ProductFormValues, path: string): string | undefined {
  const result = productSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('productSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(productSchema.safeParse(valuesOf()).success).toBe(true);
  });

  // [상세설명 상한은 평문 길이다] value.length 로 재면 '굵게' 한 번에 <strong></strong> 17자가
  // 붙어 사용자가 쓰지도 않은 글자수로 제출이 막힌다 — 화면 카운터('N/2000')와도 어긋난다.
  it('상세설명 상한은 마크업이 아니라 평문 길이로 판정한다', () => {
    // 평문 2000자를 서식으로 감싸 마크업 길이는 상한을 한참 넘긴 값
    const wrapped = `<p><strong>${'가'.repeat(PRODUCT_DESCRIPTION_MAX)}</strong></p>`;
    expect(wrapped.length).toBeGreaterThan(PRODUCT_DESCRIPTION_MAX);
    expect(productSchema.safeParse(valuesOf({ description: wrapped })).success).toBe(true);
  });

  it('상세설명 평문이 상한을 넘으면 막는다', () => {
    const tooLong = `<p>${'가'.repeat(PRODUCT_DESCRIPTION_MAX + 1)}</p>`;
    expect(messageFor(valuesOf({ description: tooLong }), 'description')).toContain(
      String(PRODUCT_DESCRIPTION_MAX),
    );
  });

  it('상품명·상품코드가 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
    expect(messageFor(valuesOf({ code: '  ' }), 'code')).toContain('입력');
  });

  it('카테고리를 고르지 않으면 막는다', () => {
    expect(messageFor(valuesOf({ categoryId: '' }), 'categoryId')).toContain('선택');
  });

  it('대표 이미지가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ coverImageUrl: '' }), 'coverImageUrl')).toContain('등록');
  });

  it('정률 할인율이 범위를 벗어나면 막는다', () => {
    expect(
      messageFor(valuesOf({ discountType: 'percent', discountValue: '120' }), 'discountValue'),
    ).toContain('100%');
  });

  it('정액 할인이 판매가 이상이면 막는다', () => {
    expect(
      messageFor(
        valuesOf({ discountType: 'amount', discountValue: '200000', price: '129000' }),
        'discountValue',
      ),
    ).toContain('미만');
  });

  it('정률 적립인데 적립률이 비거나 범위를 벗어나면 막는다', () => {
    expect(
      messageFor(valuesOf({ points: { mode: 'rate', rate: '', amount: '' } }), 'points.rate'),
    ).toContain('적립률');
    expect(
      messageFor(valuesOf({ points: { mode: 'rate', rate: '150', amount: '' } }), 'points.rate'),
    ).toContain('100%');
  });

  it('정액 적립인데 적립액이 없으면 막는다', () => {
    expect(
      messageFor(valuesOf({ points: { mode: 'fixed', rate: '', amount: '' } }), 'points.amount'),
    ).toContain('적립액');
  });

  it('적립 미적용이면 적립률·적립액이 비어도 통과한다', () => {
    const values = valuesOf({ points: { mode: 'none', rate: '', amount: '' } });
    expect(productSchema.safeParse(values).success).toBe(true);
  });

  it('정액 적립이면 적립률이 비어도 통과한다 — 쓰이지 않는 축은 묻지 않는다', () => {
    const values = valuesOf({ points: { mode: 'fixed', rate: '', amount: '2000' } });
    expect(productSchema.safeParse(values).success).toBe(true);
  });

  it('조건부 무료배송인데 기준 금액이 없으면 막는다', () => {
    expect(
      messageFor(
        valuesOf({
          shipping: { method: 'courier', feeType: 'conditional', fee: '3000', freeThreshold: '' },
        }),
        'shipping.freeThreshold',
      ),
    ).toContain('기준');
  });
});
