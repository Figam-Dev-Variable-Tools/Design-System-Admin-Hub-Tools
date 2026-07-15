// 개인정보 처리방침 화면의 동작 회귀 테스트 (A41)
import { describe, expect, it } from 'vitest';

import { sortVersions } from './data-source';
import { privacyVersionSchema } from './validation';
import type { PrivacyVersionFormValues } from './validation';
import { isCurrent } from './types';
import type { PrivacyVersion } from './types';

function versionOf(overrides: Partial<PrivacyVersion> & { id: string }): PrivacyVersion {
  return {
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    status: 'active',
    body: '처리방침 본문',
    ...overrides,
  };
}

describe('sortVersions — 시행일 내림차순', () => {
  it('최신 시행일이 맨 위로 온다', () => {
    const sorted = sortVersions([
      versionOf({ id: '1', effectiveDate: '2023-01-01' }),
      versionOf({ id: '2', effectiveDate: '2025-01-01' }),
      versionOf({ id: '3', effectiveDate: '2024-01-01' }),
    ]);
    expect(sorted.map((v) => v.id)).toEqual(['2', '3', '1']);
  });
});

describe('isCurrent — 현재 시행본', () => {
  it("상태가 '시행중'이면 현재 시행본이다", () => {
    expect(isCurrent(versionOf({ id: 'a', status: 'active' }))).toBe(true);
    expect(isCurrent(versionOf({ id: 'b', status: 'archived' }))).toBe(false);
  });
});

function valuesOf(overrides: Partial<PrivacyVersionFormValues> = {}): PrivacyVersionFormValues {
  return {
    version: 'v2.1',
    effectiveDate: '2027-01-01',
    status: 'scheduled',
    body: '본문',
    ...overrides,
  };
}

function messageFor(
  values: PrivacyVersionFormValues,
  field: keyof PrivacyVersionFormValues,
): string | undefined {
  const result = privacyVersionSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('privacyVersionSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(privacyVersionSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('버전이 비면 막는다', () => {
    expect(messageFor(valuesOf({ version: '' }), 'version')).toContain('버전을 입력');
  });

  it('시행일이 형식이 아니면 막는다', () => {
    expect(messageFor(valuesOf({ effectiveDate: '' }), 'effectiveDate')).toBe(
      '시행일을 입력하세요.',
    );
  });

  it('본문이 비면 막는다', () => {
    expect(messageFor(valuesOf({ body: '  ' }), 'body')).toBe('본문을 입력하세요.');
  });
});
