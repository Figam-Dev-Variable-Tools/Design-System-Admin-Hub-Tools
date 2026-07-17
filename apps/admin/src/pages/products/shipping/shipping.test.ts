// 배송 정책 폼 검증 회귀 테스트
import { describe, expect, it } from 'vitest';

import { DEFAULT_SHIPPING_POLICY } from './types';
import { shippingPolicySchema } from './validation';
import type { ShippingPolicyValues } from './validation';

function valuesOf(overrides: Partial<ShippingPolicyValues> = {}): ShippingPolicyValues {
  return { ...DEFAULT_SHIPPING_POLICY, ...overrides };
}

describe('shippingPolicySchema — 폼 검증', () => {
  it('기본값은 통과한다', () => {
    expect(shippingPolicySchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('택배사가 비면 막는다', () => {
    const result = shippingPolicySchema.safeParse(valuesOf({ carrier: '  ' }));
    expect(result.success).toBe(false);
  });

  it('기본 배송비가 숫자가 아니면 막는다', () => {
    const result = shippingPolicySchema.safeParse(valuesOf({ baseFee: '삼천원' }));
    expect(result.success).toBe(false);
  });

  it('조건부 무료인데 기준 금액이 없으면 막는다', () => {
    const result = shippingPolicySchema.safeParse(
      valuesOf({ feeType: 'conditional', freeThreshold: '' }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'freeThreshold')).toBe(
        true,
      );
    }
  });

  it('무료배송이면 기준 금액이 없어도 통과한다', () => {
    expect(
      shippingPolicySchema.safeParse(valuesOf({ feeType: 'free', freeThreshold: '' })).success,
    ).toBe(true);
  });
});
