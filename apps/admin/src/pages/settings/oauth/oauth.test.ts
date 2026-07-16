// OAuth 설정 회귀 테스트 (시스템 설정 섹션)
//
// 지키는 것 둘: **Redirect URI 를 저장 시점에 막는다**(안 막으면 실패는 로그인 순간 사용자 앞에서 난다)
// 와 **저장 후 평문 시크릿이 화면에 남지 않는다**.
import { describe, expect, it } from 'vitest';

import { normalizeAfterSave } from './data-source';
import { oauthSettingsSchema, redirectUriError } from './validation';
import type { OAuthProviderValues, OAuthSettingsValues } from './validation';

function providerOf(overrides: Partial<OAuthProviderValues> = {}): OAuthProviderValues {
  return {
    provider: 'google',
    enabled: false,
    clientId: '',
    secret: '',
    hasSecret: false,
    redirectUri: 'https://example.com/auth/google/callback',
    ...overrides,
  };
}

function valuesOf(providers: readonly OAuthProviderValues[]): OAuthSettingsValues {
  return { providers: [...providers] };
}

describe('redirectUriError — Redirect URI 규칙', () => {
  it('https 를 통과시킨다', () => {
    expect(redirectUriError('https://example.com/auth/callback')).toBeNull();
  });

  it('http 운영 주소를 막는다 — 인가 코드가 평문으로 흐른다', () => {
    expect(redirectUriError('http://example.com/auth/callback')).not.toBeNull();
  });

  it('로컬 개발용 http 는 허용한다 — 제공자들도 이 예외만 허용한다', () => {
    expect(redirectUriError('http://localhost:5173/auth/callback')).toBeNull();
    expect(redirectUriError('http://127.0.0.1:5173/auth/callback')).toBeNull();
  });

  it('상대 경로를 막는다 — 제공자는 전체 주소를 요구한다', () => {
    expect(redirectUriError('/auth/callback')).not.toBeNull();
  });

  it('fragment(#)를 막는다 — 인가 코드가 붙을 자리를 차지한다', () => {
    expect(redirectUriError('https://example.com/auth#section')).not.toBeNull();
  });

  it('비면 막는다', () => {
    expect(redirectUriError('   ')).not.toBeNull();
  });
});

describe('oauthSettingsSchema — 켜진 제공자만 검증한다', () => {
  it('꺼진 제공자는 값이 비어도 통과한다 — 쓰지 않을 값을 요구하지 않는다', () => {
    expect(
      oauthSettingsSchema.safeParse(valuesOf([providerOf({ enabled: false, clientId: '' })]))
        .success,
    ).toBe(true);
  });

  it('켜면 Client ID 를 요구한다', () => {
    const result = oauthSettingsSchema.safeParse(
      valuesOf([providerOf({ enabled: true, clientId: '', secret: 'dummy-secret' })]),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.includes('clientId'))).toBe(true);
  });

  it('켜는데 저장된 시크릿도 새 시크릿도 없으면 막는다', () => {
    const result = oauthSettingsSchema.safeParse(
      valuesOf([
        providerOf({ enabled: true, clientId: 'dummy-client-id', hasSecret: false, secret: '' }),
      ]),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.includes('secret'))).toBe(true);
  });

  it('저장된 시크릿이 있으면 새로 넣지 않아도 통과한다 — 비워 두면 유지한다', () => {
    expect(
      oauthSettingsSchema.safeParse(
        valuesOf([
          providerOf({ enabled: true, clientId: 'dummy-client-id', hasSecret: true, secret: '' }),
        ]),
      ).success,
    ).toBe(true);
  });

  it('켜면 Redirect URI 규칙을 강제한다', () => {
    const result = oauthSettingsSchema.safeParse(
      valuesOf([
        providerOf({
          enabled: true,
          clientId: 'dummy-client-id',
          hasSecret: true,
          redirectUri: 'http://example.com/cb',
        }),
      ]),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.includes('redirectUri'))).toBe(true);
  });
});

describe('normalizeAfterSave — 저장은 시크릿을 화면에서 지운다', () => {
  it('새로 넣은 평문을 비우고 저장됨(hasSecret)으로 바꾼다', () => {
    const next = normalizeAfterSave(
      valuesOf([providerOf({ enabled: true, secret: 'brand-new-dummy-secret', hasSecret: false })]),
    );

    const provider = next.providers[0];
    expect(provider).toBeDefined();
    // 평문이 폼 상태에 남지 않는다 — 남으면 그것이 새 기준선이 되어 DOM 에 계속 산다
    expect(provider?.secret).toBe('');
    expect(provider?.hasSecret).toBe(true);
  });

  it('시크릿을 건드리지 않았으면 저장 여부가 그대로다', () => {
    const next = normalizeAfterSave(valuesOf([providerOf({ hasSecret: true, secret: '' })]));

    expect(next.providers[0]?.hasSecret).toBe(true);
    expect(next.providers[0]?.secret).toBe('');
  });

  it('저장된 적 없고 새로 넣지도 않았으면 여전히 없음이다', () => {
    const next = normalizeAfterSave(valuesOf([providerOf({ hasSecret: false, secret: '' })]));

    expect(next.providers[0]?.hasSecret).toBe(false);
  });
});
