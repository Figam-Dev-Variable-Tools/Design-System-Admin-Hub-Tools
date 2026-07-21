// 상품 카테고리 동작 회귀 테스트 — 사용량 문구 + 좌측 필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import { countCategoriesByUsage, filterCategoriesByUsage, usageLabel } from './types';
import { productCategorySchema } from './validation';
import {
  addProductCategory,
  listProductCategoryChildren,
  listProductCategoryRoots,
  listProductCategoryUsage,
  productCategoryPath,
  removeProductCategory,
} from '../_shared/store';
import type { ProductCategoryUsage } from '../_shared/store';

describe('usageLabel — 사용 여부 문구', () => {
  it('미사용 / N개 상품', () => {
    expect(usageLabel(0)).toBe('미사용');
    expect(usageLabel(3)).toBe('3개 상품');
  });
});

describe('사용 여부 필터(순수) — 좌측 필터', () => {
  const list: readonly ProductCategoryUsage[] = [
    { id: 'outer', label: '아우터', productCount: 2, parentId: null, hasChildren: true },
    { id: 'top', label: '상의', productCount: 0, parentId: null, hasChildren: false },
    { id: 'acc', label: '액세서리', productCount: 5, parentId: null, hasChildren: false },
  ];

  it('사용 중만 거른다', () => {
    expect(filterCategoriesByUsage(list, 'in-use').map((c) => c.id)).toEqual(['outer', 'acc']);
  });

  it('미사용만 거른다 — 지울 수 있는 것만 보기', () => {
    expect(filterCategoriesByUsage(list, 'unused').map((c) => c.id)).toEqual(['top']);
  });

  it('전체는 그대로', () => {
    expect(filterCategoriesByUsage(list, 'all')).toHaveLength(3);
  });

  it('사용 여부별 건수를 센다', () => {
    expect(countCategoriesByUsage(list)).toEqual({ all: 3, 'in-use': 2, unused: 1 });
  });
});

describe('productCategorySchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(productCategorySchema.safeParse({ name: '아우터', parentId: '' }).success).toBe(true);
  });

  it('상위를 고른 2Depth 입력도 통과한다', () => {
    expect(productCategorySchema.safeParse({ name: '코트', parentId: 'outer' }).success).toBe(true);
  });

  it('이름이 비면 막는다', () => {
    const result = productCategorySchema.safeParse({ name: '  ', parentId: '' });
    expect(result.success).toBe(false);
  });
});

describe('카테고리 2Depth 규칙 — 저장소', () => {
  it('대분류 아래 중분류를 만든다', () => {
    addProductCategory('머플러', 'acc');
    const created = listProductCategoryUsage().find((category) => category.label === '머플러');
    expect(created?.parentId).toBe('acc');
    expect(listProductCategoryChildren('acc').map((c) => c.label)).toContain('머플러');
  });

  it('3단계는 만들 수 없다 — 중분류를 부모로 지정하면 막는다', () => {
    expect(() => addProductCategory('경량패딩', 'outer-jacket')).toThrow(
      '카테고리는 2단계까지만 만들 수 있습니다.',
    );
  });

  it('하위가 있는 대분류는 삭제할 수 없다', () => {
    expect(() => removeProductCategory('outer')).toThrow();
  });

  it('경로 표기는 대분류 > 중분류', () => {
    expect(productCategoryPath('outer-coat')).toBe('아우터 > 코트');
    expect(productCategoryPath('outer')).toBe('아우터');
  });

  it('1Depth 목록에는 대분류만 나온다', () => {
    expect(listProductCategoryRoots().every((category) => category.parentId === null)).toBe(true);
  });
});
