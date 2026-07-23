// 오시는 길 화면의 폼 검증 회귀 테스트
import { describe, expect, it } from 'vitest';

import { directionsSchema } from './validation';
import type { DirectionsFormValues } from './validation';

function valuesOf(overrides: Partial<DirectionsFormValues> = {}): DirectionsFormValues {
  return {
    address: '서울특별시 예시구 가상대로 123',
    addressDetail: '예시타워 8층',
    transit: '2호선 예시역 도보 5분',
    ...overrides,
  };
}

function messageFor(
  values: DirectionsFormValues,
  field: keyof DirectionsFormValues,
): string | undefined {
  const result = directionsSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('directionsSchema — 오시는 길 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(directionsSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('주소가 비면 막는다', () => {
    expect(messageFor(valuesOf({ address: '' }), 'address')).toContain('입력');
  });

  it('상세주소·교통편은 선택 — 비어 있어도 통과한다', () => {
    expect(directionsSchema.safeParse(valuesOf({ addressDetail: '', transit: '' })).success).toBe(
      true,
    );
  });

  it('상세주소가 최대 길이를 넘으면 막는다', () => {
    expect(messageFor(valuesOf({ addressDetail: 'ㄱ'.repeat(101) }), 'addressDetail')).toContain(
      '100자',
    );
  });

  it('교통편이 최대 길이를 넘으면 막는다', () => {
    expect(messageFor(valuesOf({ transit: 'ㄱ'.repeat(1001) }), 'transit')).toContain('1000자');
  });

  /**
   * 좌표는 **모델에서 사라졌다.** 스키마가 위도·경도를 요구하지 않는다는 사실을 여기서 못 박는다 —
   * 누가 되살리면(필수 필드로) 주소만 채운 저장이 다시 막히고, 이 단언이 먼저 실패한다.
   */
  it('위도·경도는 요구하지 않는다 — 주소·상세주소·교통편만으로 저장할 수 있다', () => {
    const parsed = directionsSchema.safeParse(valuesOf());

    expect(parsed.success).toBe(true);
    expect(Object.keys(parsed.success ? parsed.data : {})).toEqual([
      'address',
      'addressDetail',
      'transit',
    ]);
  });
});
