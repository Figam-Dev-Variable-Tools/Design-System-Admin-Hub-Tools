// 오시는 길 화면의 폼 검증 회귀 테스트
import { describe, expect, it } from 'vitest';

import { directionsSchema } from './validation';
import type { DirectionsFormValues } from './validation';

function valuesOf(overrides: Partial<DirectionsFormValues> = {}): DirectionsFormValues {
  return {
    address: '서울특별시 예시구 가상대로 123',
    addressDetail: '예시타워 8층',
    latitude: '37.5',
    longitude: '127.03',
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

  it('위도가 숫자가 아니면 막는다', () => {
    expect(messageFor(valuesOf({ latitude: 'abc' }), 'latitude')).toContain('숫자');
  });

  it('위도가 범위를 벗어나면 막는다 (|위도| > 90)', () => {
    expect(messageFor(valuesOf({ latitude: '95' }), 'latitude')).toContain('범위');
  });

  it('경도가 범위를 벗어나면 막는다 (|경도| > 180)', () => {
    expect(messageFor(valuesOf({ longitude: '-190' }), 'longitude')).toContain('범위');
  });

  it('음수 좌표도 범위 안이면 통과한다', () => {
    expect(
      directionsSchema.safeParse(valuesOf({ latitude: '-33.86', longitude: '-70.5' })).success,
    ).toBe(true);
  });
});
