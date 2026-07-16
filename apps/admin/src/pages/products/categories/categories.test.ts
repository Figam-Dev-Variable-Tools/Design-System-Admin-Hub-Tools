// 상품 카테고리 동작 회귀 테스트 (A41) — 사용량 문구 + 좌측 필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import { countCategoriesByUsage, filterCategoriesByUsage, usageLabel } from './types';
import { productCategorySchema } from './validation';
import type { ProductCategoryUsage } from '../_shared/store';

describe('usageLabel — 사용 여부 문구', () => {
  it('미사용 / N개 상품', () => {
    expect(usageLabel(0)).toBe('미사용');
    expect(usageLabel(3)).toBe('3개 상품');
  });
});

describe('사용 여부 필터(순수) — 좌측 필터', () => {
  const list: readonly ProductCategoryUsage[] = [
    { id: 'outer', label: '아우터', productCount: 2 },
    { id: 'top', label: '상의', productCount: 0 },
    { id: 'acc', label: '액세서리', productCount: 5 },
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
    expect(productCategorySchema.safeParse({ name: '아우터' }).success).toBe(true);
  });

  it('이름이 비면 막는다', () => {
    const result = productCategorySchema.safeParse({ name: '  ' });
    expect(result.success).toBe(false);
  });
});
