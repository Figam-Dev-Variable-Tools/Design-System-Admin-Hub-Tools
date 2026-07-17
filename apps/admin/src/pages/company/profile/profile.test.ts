// 회사 정보 화면의 폼 검증 회귀 테스트
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
    expect(messageFor(valuesOf({ companyName: '  ' }), 'companyName')).toBe('회사명을 입력하세요.');
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

  /**
   * [알려진 빚 — 계약이 아니다]
   * ImageUploadField 는 아직 업로드하지 않는다 — 낼 수 있는 값이 `blob:…` 과 `''` 뿐이라
   * (URL 을 칠 입력이 없다) 여기서 http(s) 를 요구하면 로고를 영영 바꿀 수 없게 된다.
   * blob: 값은 언마운트 시 revoke 되어 죽으므로 이대로 저장하면 로고가 깨진다 — 그것을 아는 채로
   * 남긴 빚이지 바람직한 성질이 아니다.
   * TODO(backend): POST /api/uploads 가 붙으면 이 단언은 뒤집힌다(blob: 거절).
   * 근거 전문은 shared/crud/validation.ts 의 requiredImage 주석에 있다.
   */
  it('업로드 이음매가 없어 blob: 이 통과한다 — TODO(backend): POST /api/uploads 후 거절로 바뀐다', () => {
    expect(companyProfileSchema.safeParse(valuesOf({ logoUrl: 'blob:abc-123' })).success).toBe(
      true,
    );
  });
});
