// 회사 정보 화면의 폼 검증 회귀 테스트 (A41)
import { describe, expect, it } from 'vitest';

import { companyProfileSchema } from './validation';
import type { CompanyProfileFormValues } from './validation';

function valuesOf(overrides: Partial<CompanyProfileFormValues> = {}): CompanyProfileFormValues {
  return {
    companyName: '주식회사 예시플래닝',
    businessNumber: '123-45-67890',
    address: '서울특별시 예시구 가상대로 123',
    ceoName: '홍길동',
    contact: '02-0000-0000',
    logoUrl: 'https://cdn.example.com/logo.png',
    ...overrides,
  };
}

function messageFor(
  values: CompanyProfileFormValues,
  field: keyof CompanyProfileFormValues,
): string | undefined {
  const result = companyProfileSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('companyProfileSchema — 회사 정보 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(companyProfileSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('회사명이 비면 막는다', () => {
    expect(messageFor(valuesOf({ companyName: '  ' }), 'companyName')).toBe(
      '회사명을(를) 입력하세요.',
    );
  });

  it('사업자등록번호 형식이 틀리면 막는다', () => {
    expect(messageFor(valuesOf({ businessNumber: '1234567890' }), 'businessNumber')).toContain(
      '형식',
    );
    expect(messageFor(valuesOf({ businessNumber: '123-4-5678' }), 'businessNumber')).toContain(
      '형식',
    );
  });

  it('사업자등록번호가 비면 형식이 아니라 필수 문구로 막는다', () => {
    expect(messageFor(valuesOf({ businessNumber: '' }), 'businessNumber')).toBe(
      '사업자등록번호를 입력하세요.',
    );
  });

  it('대표자명·연락처·주소가 비면 막는다', () => {
    expect(messageFor(valuesOf({ ceoName: '' }), 'ceoName')).toContain('입력');
    expect(messageFor(valuesOf({ contact: '' }), 'contact')).toContain('입력');
    expect(messageFor(valuesOf({ address: '' }), 'address')).toContain('입력');
  });

  it('로고는 선택 — 비어 있어도 통과한다', () => {
    expect(companyProfileSchema.safeParse(valuesOf({ logoUrl: '' })).success).toBe(true);
  });

  it('로고 형식은 강제하지 않는다 — 업로드된 값(blob/data URL)을 허용한다', () => {
    expect(companyProfileSchema.safeParse(valuesOf({ logoUrl: 'blob:abc-123' })).success).toBe(
      true,
    );
  });
});
