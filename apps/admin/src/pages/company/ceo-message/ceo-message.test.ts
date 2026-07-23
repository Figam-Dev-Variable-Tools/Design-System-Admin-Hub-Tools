// CEO 인사말 화면의 폼 검증 회귀 테스트
import { describe, expect, it } from 'vitest';

import { ceoMessageSchema } from './validation';
import type { CeoMessageFormValues } from './validation';

function valuesOf(overrides: Partial<CeoMessageFormValues> = {}): CeoMessageFormValues {
  return {
    title: '고객과 함께 성장할게요',
    body: '안녕하십니까. 방문해 주셔서 감사합니다.',
    photoUrl: 'https://cdn.example.com/ceo.jpg',
    ...overrides,
  };
}

function messageFor(
  values: CeoMessageFormValues,
  field: keyof CeoMessageFormValues,
): string | undefined {
  const result = ceoMessageSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('ceoMessageSchema — CEO 인사말 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(ceoMessageSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('제목이 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '   ' }), 'title')).toBe('제목을 입력하세요.');
  });

  it('본문이 비면 막는다', () => {
    expect(messageFor(valuesOf({ body: '' }), 'body')).toBe('본문을 입력하세요.');
  });

  it('사진은 선택 — 비어 있어도 통과한다', () => {
    expect(ceoMessageSchema.safeParse(valuesOf({ photoUrl: '' })).success).toBe(true);
  });

  it('사진 형식은 강제하지 않는다 — 업로드된 값(blob/data URL)을 허용한다', () => {
    expect(
      ceoMessageSchema.safeParse(valuesOf({ photoUrl: 'data:image/png;base64,xx' })).success,
    ).toBe(true);
  });
});
