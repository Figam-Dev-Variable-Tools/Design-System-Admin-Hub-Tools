// 약관 관리 화면의 동작 회귀 테스트
import { describe, expect, it } from 'vitest';

import { fetchTermsVersion, sortVersions, TERMS_TYPES } from './data-source';
import { termsVersionSchema } from './validation';
import type { TermsVersionFormValues } from './validation';
import { isCurrent } from './types';
import type { TermsVersion } from './types';

function versionOf(overrides: Partial<TermsVersion> & { id: string }): TermsVersion {
  return {
    typeId: 'service',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    status: 'active',
    body: '약관 본문',
    ...overrides,
  };
}

describe('sortVersions — 시행일 내림차순', () => {
  it('최신 시행일이 맨 위로 온다', () => {
    const sorted = sortVersions([
      versionOf({ id: '1', effectiveDate: '2024-01-01' }),
      versionOf({ id: '2', effectiveDate: '2026-01-01' }),
      versionOf({ id: '3', effectiveDate: '2025-01-01' }),
    ]);
    expect(sorted.map((v) => v.id)).toEqual(['2', '3', '1']);
  });
});

describe('isCurrent — 현재 시행본', () => {
  it("상태가 '시행중'이면 현재 시행본이다", () => {
    expect(isCurrent(versionOf({ id: 'a', status: 'active' }))).toBe(true);
  });

  it('시행예정·만료는 현재 시행본이 아니다', () => {
    expect(isCurrent(versionOf({ id: 'b', status: 'scheduled' }))).toBe(false);
    expect(isCurrent(versionOf({ id: 'c', status: 'archived' }))).toBe(false);
  });
});

describe('TERMS_TYPES 픽스처', () => {
  it('약관 종류가 여러 개 있다', () => {
    expect(TERMS_TYPES.length).toBeGreaterThan(1);
  });
});

describe('fetchTermsVersion — 단건 조회(상세 페이지용)', () => {
  it('존재하는 id 는 그 버전을 돌려준다', async () => {
    const version = await fetchTermsVersion('service-v1.0', new AbortController().signal);
    expect(version.id).toBe('service-v1.0');
    expect(version.typeId).toBe('service');
  });

  it('없는 id 는 찾을 수 없다고 던진다', async () => {
    await expect(fetchTermsVersion('nope', new AbortController().signal)).rejects.toThrow(
      '찾을 수 없',
    );
  });
});

function valuesOf(overrides: Partial<TermsVersionFormValues> = {}): TermsVersionFormValues {
  return {
    version: 'v1.0',
    effectiveDate: '2026-01-01',
    status: 'scheduled',
    body: '본문',
    ...overrides,
  };
}

function messageFor(
  values: TermsVersionFormValues,
  field: keyof TermsVersionFormValues,
): string | undefined {
  const result = termsVersionSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('termsVersionSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(termsVersionSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('버전이 비면 막는다', () => {
    expect(messageFor(valuesOf({ version: '' }), 'version')).toContain('버전을 입력');
  });

  it('시행일이 형식이 아니면 막는다', () => {
    expect(messageFor(valuesOf({ effectiveDate: '2026/01/01' }), 'effectiveDate')).toContain(
      'YYYY-MM-DD',
    );
  });

  it('실재하지 않는 시행일(2026-02-31)을 막는다', () => {
    expect(messageFor(valuesOf({ effectiveDate: '2026-02-31' }), 'effectiveDate')).toContain(
      'YYYY-MM-DD',
    );
  });

  it('본문이 비면 막는다', () => {
    expect(messageFor(valuesOf({ body: '   ' }), 'body')).toBe('본문을 입력하세요.');
  });
});
