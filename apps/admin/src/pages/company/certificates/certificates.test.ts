// 인증서/특허 화면의 동작 회귀 테스트 (A41) — 정렬·필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import { certKindLabel, certKindTone, filterCertificates, sortCertificates } from './types';
import type { CertItem } from './types';
import { certSchema } from './validation';
import type { CertFormValues } from './validation';

function itemOf(overrides: Partial<CertItem> & { id: string }): CertItem {
  return {
    name: '인증',
    issuer: '기관',
    issuedOn: '2023-01-01',
    kind: 'certificate',
    imageUrl: 'https://cdn.example.com/x.png',
    ...overrides,
  };
}

const SAMPLE: readonly CertItem[] = [
  itemOf({ id: 'a', issuedOn: '2021-06-20', kind: 'certificate' }),
  itemOf({ id: 'b', issuedOn: '2023-04-12', kind: 'certificate' }),
  itemOf({ id: 'c', issuedOn: '2022-09-01', kind: 'patent' }),
];

describe('sortCertificates — 발급일 내림차순(순수)', () => {
  it('최근 발급일이 위로 온다', () => {
    expect(sortCertificates(SAMPLE).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('filterCertificates — 구분 필터(순수)', () => {
  it('전체는 모두 돌려준다', () => {
    expect(filterCertificates(SAMPLE, 'all').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('인증서만', () => {
    expect(filterCertificates(SAMPLE, 'certificate').map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('특허만', () => {
    expect(filterCertificates(SAMPLE, 'patent').map((x) => x.id)).toEqual(['c']);
  });
});

describe('certKind 라벨·톤', () => {
  it('구분 라벨', () => {
    expect(certKindLabel('certificate')).toBe('인증서');
    expect(certKindLabel('patent')).toBe('특허');
  });

  it('톤은 인증서=info, 특허=success', () => {
    expect(certKindTone('certificate')).toBe('info');
    expect(certKindTone('patent')).toBe('success');
  });
});

function valuesOf(overrides: Partial<CertFormValues> = {}): CertFormValues {
  return {
    name: 'ISO 9001',
    issuer: '예시인증원',
    issuedOn: '2023-04-12',
    kind: 'certificate',
    imageUrl: 'https://cdn.example.com/x.png',
    ...overrides,
  };
}

function messageFor(values: CertFormValues, field: keyof CertFormValues): string | undefined {
  const result = certSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('certSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(certSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('명칭·발급기관이 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
    expect(messageFor(valuesOf({ issuer: '' }), 'issuer')).toContain('입력');
  });

  it('발급일 형식이 틀리면 막는다', () => {
    expect(messageFor(valuesOf({ issuedOn: '2023/04/12' }), 'issuedOn')).toContain('형식');
  });

  it('구분이 두 값이 아니면 막는다', () => {
    expect(messageFor(valuesOf({ kind: 'award' }), 'kind')).toContain('선택');
  });

  it('이미지 URL 이 http(s) 가 아니면 막는다', () => {
    expect(messageFor(valuesOf({ imageUrl: '' }), 'imageUrl')).toContain('입력');
  });
});
