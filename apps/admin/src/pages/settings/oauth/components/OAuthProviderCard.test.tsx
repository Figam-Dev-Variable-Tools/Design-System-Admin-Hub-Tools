// Client Secret 의 필수 여부가 AT 에 닿는다 (A11Y-11) · apps/admin/src/pages/settings/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// FormField 는 required 를 **단일 컨트롤 자식**의 aria-required 로 주입한다(withAriaRequired).
// 그런데 이 카드의 Client Secret 필드는 자식이 입력과 '변경/취소' 버튼을 나란히 놓는 <span> 래퍼라
// 주입 대상이 아니다 — 그리고 그것은 FormField 의 버그가 **아니다**. 래퍼에 aria-required 를 얹으면
// 거짓 시맨틱이 되므로 의도적으로 거부한다. 별표는 aria-hidden 이라, 이 필드가 필수임을 스크린리더
// 사용자에게 알리는 경로가 **0개**였다.
//
// 그래서 호출부인 이 카드가 **진짜 컨트롤인 <input> 에 직접** aria-required 를 준다.
//
// [required 의 조건이 이 파일의 계약이다] '켜져 있고(enabled) 저장된 시크릿이 없을 때'만 필수다 —
// 이미 저장돼 있으면 비워 둬도 기존 값이 유지되므로 필수가 아니다. 아래 세 대조가 그 경계를 고정한다.
// ─────────────────────────────────────────────────────────────────────────────
import { render } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { OAuthProviderCard } from './OAuthProviderCard';
import type { OAuthProviderValues, OAuthSettingsValues } from '../validation';

const BASE: OAuthProviderValues = {
  provider: 'google',
  enabled: true,
  clientId: 'client-abc',
  secret: '',
  hasSecret: false,
  redirectUri: 'https://admin.example.com/auth/google/callback',
};

/** register 는 진짜 RHF 것을 쓴다 — 스텁을 만들면 무엇이 렌더되는지가 아니라 스텁을 테스트하게 된다 */
function Harness({
  value,
  changingSecret = false,
}: {
  readonly value: OAuthProviderValues;
  readonly changingSecret?: boolean;
}) {
  const { register } = useForm<OAuthSettingsValues>({ defaultValues: { providers: [value] } });
  return (
    <OAuthProviderCard
      index={0}
      value={value}
      register={register}
      disabled={false}
      errors={{}}
      changingSecret={changingSecret}
      onToggleEnabled={vi.fn()}
      onChangeSecretStart={vi.fn()}
      onChangeSecretCancel={vi.fn()}
    />
  );
}

/** 시크릿 입력 — 마스킹 상태에서는 존재하지 않으므로 null 을 돌려준다 */
function secretInput(container: HTMLElement): HTMLInputElement | null {
  return container.querySelector('#oauth-google-secret');
}

describe('OAuthProviderCard — Client Secret 의 required 가 AT 에 닿는다 (A11Y-11)', () => {
  it('켜져 있고 저장된 시크릿이 없으면 입력이 aria-required 를 갖는다', () => {
    const { container } = render(<Harness value={BASE} />);
    const input = secretInput(container);
    expect(input).not.toBeNull();
    expect(input?.getAttribute('aria-required')).toBe('true');
  });

  it('꺼져 있으면 필수가 아니다 — 속성을 남기지 않는다 (대조)', () => {
    const { container } = render(<Harness value={{ ...BASE, enabled: false }} />);
    expect(secretInput(container)?.hasAttribute('aria-required')).toBe(false);
  });

  it('이미 저장돼 있으면 필수가 아니다 — 비워 두면 기존 값이 유지된다 (대조)', () => {
    // hasSecret 이면서 '변경 중' 이라야 입력칸이 나온다(마스킹 상태에는 입력이 없다)
    const { container } = render(<Harness value={{ ...BASE, hasSecret: true }} changingSecret />);
    const input = secretInput(container);
    expect(input).not.toBeNull();
    expect(input?.hasAttribute('aria-required')).toBe(false);
  });

  it('aria-required 는 컨트롤에만 붙는다 — 래퍼 <span> 에는 붙지 않는다 (거짓 시맨틱 방지)', () => {
    const { container } = render(<Harness value={BASE} />);
    const marked = Array.from(container.querySelectorAll('[aria-required]'));
    // enabled=true 이므로 필수는 셋(Client ID · Client Secret · Redirect URI)이다.
    // Client ID·Redirect URI 는 자식이 <input> 이라 FormField 가 주입하고, Client Secret 은
    // 자식이 <span> 래퍼라 이 카드가 직접 준다 — 경로는 달라도 **닿는 곳은 전부 컨트롤**이어야 한다.
    expect(marked.map((element) => element.id).sort()).toEqual([
      'oauth-google-client-id',
      'oauth-google-redirect',
      'oauth-google-secret',
    ]);
    expect(marked.every((element) => element.tagName === 'INPUT')).toBe(true);
    // 시크릿을 감싼 래퍼가 실재하는데도 표시되지 않았음을 명시한다 (주입이 래퍼를 삼키지 않았다)
    expect(container.querySelector('span[aria-required]')).toBeNull();
  });
});
