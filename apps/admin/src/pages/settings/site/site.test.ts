// 사이트 설정 검증 회귀 테스트 (시스템 설정 섹션)
import { describe, expect, it } from 'vitest';

import { normalizePhone } from '../_shared/validation';
import { siteSettingsSchema } from './validation';
import type { SiteSettingsValues } from './validation';

const BASE: SiteSettingsValues = {
  siteName: 'TDS 스페이스플래닝',
  siteDescription: '설명',
  baseUrl: 'https://example.com',
  contactEmail: 'help@example.com',
  contactPhone: '02-1234-5678',
  timezone: 'Asia/Seoul',
  signupEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
};

function valuesOf(overrides: Partial<SiteSettingsValues> = {}): SiteSettingsValues {
  return { ...BASE, ...overrides };
}

describe('siteSettingsSchema — 기본', () => {
  it('기본값은 통과한다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('사이트명이 비면 막는다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf({ siteName: '   ' })).success).toBe(false);
  });

  it('사이트명이 60자를 넘으면 막는다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf({ siteName: '가'.repeat(61) })).success).toBe(
      false,
    );
  });
});

describe('siteSettingsSchema — 기본 URL', () => {
  it('http 는 막는다 — 로그인 쿠키가 평문으로 흐른다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf({ baseUrl: 'http://example.com' })).success).toBe(
      false,
    );
  });

  it('스킴이 없으면 막는다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf({ baseUrl: 'example.com' })).success).toBe(false);
  });

  it('https 는 통과한다', () => {
    expect(
      siteSettingsSchema.safeParse(valuesOf({ baseUrl: 'https://a.example.com' })).success,
    ).toBe(true);
  });
});

describe('siteSettingsSchema — 연락처', () => {
  it('이메일 형식이 아니면 막는다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf({ contactEmail: 'help@' })).success).toBe(false);
  });

  it('전화번호 형식이 아니면 막는다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf({ contactPhone: '0212345678' })).success).toBe(
      false,
    );
  });

  it('휴대폰·대표번호 형식을 받는다', () => {
    expect(siteSettingsSchema.safeParse(valuesOf({ contactPhone: '010-1234-5678' })).success).toBe(
      true,
    );
    expect(siteSettingsSchema.safeParse(valuesOf({ contactPhone: '1588-0000' })).success).toBe(
      true,
    );
  });
});

describe('siteSettingsSchema — 유지보수 모드 (위험 설정)', () => {
  it('유지보수 모드를 켜면 안내 문구를 요구한다 — 방문자에게 빈 화면을 내보내지 않는다', () => {
    const result = siteSettingsSchema.safeParse(
      valuesOf({ maintenanceMode: true, maintenanceMessage: '   ' }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === 'maintenanceMessage')).toBe(true);
  });

  it('유지보수 모드를 켜고 문구가 있으면 통과한다', () => {
    expect(
      siteSettingsSchema.safeParse(
        valuesOf({ maintenanceMode: true, maintenanceMessage: '점검 중입니다.' }),
      ).success,
    ).toBe(true);
  });

  it('꺼져 있으면 문구가 비어도 통과한다 — 쓰지 않을 값을 요구하지 않는다', () => {
    expect(
      siteSettingsSchema.safeParse(valuesOf({ maintenanceMode: false, maintenanceMessage: '' }))
        .success,
    ).toBe(true);
  });
});

describe('normalizePhone — 붙여넣기 정규화', () => {
  it('국가번호와 공백이 섞인 값을 국내 표기로 되돌린다', () => {
    expect(normalizePhone('+82 2 1234 5678')).toBe('02-1234-5678');
  });

  it('숫자만 붙여넣어도 하이픈을 넣는다', () => {
    expect(normalizePhone('01012345678')).toBe('010-1234-5678');
  });

  it('대표번호 8자리를 처리한다', () => {
    expect(normalizePhone('15880000')).toBe('1588-0000');
  });

  it('이미 올바른 값은 그대로 둔다', () => {
    expect(normalizePhone('02-1234-5678')).toBe('02-1234-5678');
  });
});
