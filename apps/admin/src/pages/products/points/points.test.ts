// 적립금 정책 폼 검증 회귀 테스트
import { describe, expect, it } from 'vitest';

import { DEFAULT_POINTS_POLICY } from './types';
import { pointsPolicySchema } from './validation';
import type { PointsPolicyValues } from './validation';

function valuesOf(overrides: Partial<PointsPolicyValues> = {}): PointsPolicyValues {
  return { ...DEFAULT_POINTS_POLICY, ...overrides };
}

describe('pointsPolicySchema — 폼 검증', () => {
  it('기본값은 통과한다', () => {
    expect(pointsPolicySchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('적립률이 100%를 넘으면 막는다', () => {
    const result = pointsPolicySchema.safeParse(valuesOf({ earnRate: '150' }));
    expect(result.success).toBe(false);
  });

  it('사용 단위가 0이면 막는다', () => {
    const result = pointsPolicySchema.safeParse(valuesOf({ useUnit: '0' }));
    expect(result.success).toBe(false);
  });

  it('유효기간이 비면 막는다', () => {
    const result = pointsPolicySchema.safeParse(valuesOf({ expireMonths: '' }));
    expect(result.success).toBe(false);
  });

  it('최소 사용 포인트가 숫자가 아니면 막는다', () => {
    const result = pointsPolicySchema.safeParse(valuesOf({ minUseAmount: '오천' }));
    expect(result.success).toBe(false);
  });
});
