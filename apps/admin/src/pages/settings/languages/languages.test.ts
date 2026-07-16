// 언어 설정 검증 회귀 테스트 (시스템 설정 섹션)
import { describe, expect, it } from 'vitest';

import { languageSettingsSchema } from './validation';
import type { LanguageSettingsValues } from './validation';

const BASE: LanguageSettingsValues = {
  defaultLanguage: 'ko',
  supported: ['ko'],
  fallback: 'ko',
};

function valuesOf(overrides: Partial<LanguageSettingsValues> = {}): LanguageSettingsValues {
  return { ...BASE, ...overrides };
}

describe('languageSettingsSchema', () => {
  it('한국어 단일 구성(현재 이 앱의 상태)은 통과한다', () => {
    expect(languageSettingsSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('지원 언어가 비면 막는다 — 사이트가 아무 언어로도 뜨지 않는다', () => {
    const result = languageSettingsSchema.safeParse(valuesOf({ supported: [] }));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === 'supported')).toBe(true);
  });

  it('기본 언어가 지원 목록에 없으면 막는다 — 첫 화면을 그릴 로케일이 없다', () => {
    const result = languageSettingsSchema.safeParse(
      valuesOf({ defaultLanguage: 'en', supported: ['ko'], fallback: 'ko' }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === 'defaultLanguage')).toBe(true);
  });

  it('폴백 언어가 지원 목록에 없으면 막는다 — 번역이 빠졌을 때 읽을 곳이 없다', () => {
    const result = languageSettingsSchema.safeParse(
      valuesOf({ defaultLanguage: 'ko', supported: ['ko'], fallback: 'ja' }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path[0] === 'fallback')).toBe(true);
  });

  it('여러 언어를 켜고 기본·폴백이 그 안에 있으면 통과한다', () => {
    expect(
      languageSettingsSchema.safeParse(
        valuesOf({ defaultLanguage: 'ko', supported: ['ko', 'en', 'ja'], fallback: 'en' }),
      ).success,
    ).toBe(true);
  });

  it('알 수 없는 로케일은 막는다', () => {
    expect(
      languageSettingsSchema.safeParse({
        defaultLanguage: 'fr',
        supported: ['fr'],
        fallback: 'fr',
      }).success,
    ).toBe(false);
  });
});
