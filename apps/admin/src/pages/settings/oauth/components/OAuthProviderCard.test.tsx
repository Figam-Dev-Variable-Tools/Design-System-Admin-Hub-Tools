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

import { ToastProvider } from '../../../../shared/ui';
import { OAuthProviderCard } from './OAuthProviderCard';
import type { OAuthProviderValues, OAuthSettingsValues } from '../validation';

const BASE: OAuthProviderValues = {
  provider: 'google',
  enabled: true,
  clientId: '000000000000-dummyadminhub.apps.googleusercontent.com',
  secret: '',
  hasSecret: false,
  nativeAppKey: '',
  redirectUri: 'https://admin.example.com/auth/google/callback',
};

/** Apple — 갈래가 다르다(시크릿 한 칸이 아니라 서명 재료 넷) */
const APPLE: OAuthProviderValues = {
  provider: 'apple',
  enabled: true,
  servicesId: 'com.example.web',
  teamId: 'ABCDE12345',
  keyId: 'VWXYZ67890',
  privateKeyFileName: '',
  hasPrivateKey: false,
  redirectUri: 'https://admin.example.com/auth/apple/callback',
};

/** register 는 진짜 RHF 것을 쓴다 — 스텁을 만들면 무엇이 렌더되는지가 아니라 스텁을 테스트하게 된다 */
function Harness({
  value,
  changingSecret = false,
}: {
  readonly value: OAuthProviderValues;
  readonly changingSecret?: boolean;
}) {
  const { register } = useForm<OAuthSettingsValues>({
    defaultValues: { providers: [value], display: { kakaoTalkInAppLoginOnly: false } },
  });
  // 카드가 '복사' 결과를 토스트로 알린다 — provider 없이는 useToast 가 throw 한다(의도된 계약)
  return (
    <ToastProvider>
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
        onPickPrivateKey={vi.fn()}
      />
    </ToastProvider>
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

describe('OAuthProviderCard — 저장된 시크릿은 화면으로 돌아오지 않는다', () => {
  it('저장돼 있으면 입력칸 자체가 없고 고정 길이 마스킹만 남는다', () => {
    const { container } = render(<Harness value={{ ...BASE, hasSecret: true }} />);

    // 입력칸이 없다 = value 로 평문이 들어갈 자리가 없다(가린 게 아니라 애초에 없다)
    expect(secretInput(container)).toBeNull();
    expect(container.textContent).toContain('••••••••••••');
  });

  it('마스킹은 길이를 흘리지 않는다 — 저장 여부와 무관하게 글리프 수가 같다', () => {
    const { container } = render(<Harness value={{ ...BASE, hasSecret: true }} />);
    const masked = /•+/.exec(container.textContent ?? '');

    expect(masked).not.toBeNull();
    // 12칸 고정 — 실제 시크릿 길이(제공자마다 다르다)와 무관하다
    expect(masked?.[0]).toBe('••••••••••••');
  });

  it('시크릿 입력은 password 타입이고 자동완성을 새 비밀번호로 잠근다', () => {
    const { container } = render(<Harness value={BASE} />);
    const input = secretInput(container);

    expect(input?.getAttribute('type')).toBe('password');
    expect(input?.getAttribute('autocomplete')).toBe('new-password');
  });
});

describe('OAuthProviderCard — iOS URL 스키마는 파생 표시다', () => {
  it('클라이언트 ID 에서 만든 값을 보여주되 입력 컨트롤로 두지 않는다', () => {
    const { container } = render(<Harness value={BASE} />);
    const scheme = container.querySelector('#oauth-google-ios-scheme');

    expect(scheme).not.toBeNull();
    // 편집 컨트롤이면 사람이 고칠 수 있고, 고치는 순간 클라이언트 ID 와 조용히 어긋난다.
    // (`<input readOnly>` 도 안 된다 — readOnly 는 언제든 지워질 수 있는 속성일 뿐이다.)
    expect(scheme?.matches('input, textarea, select')).toBe(false);
    // <output> 이라야 FormField 의 <label htmlFor> 가 고아가 되지 않는다(labelable 요소다)
    expect(scheme?.tagName).toBe('OUTPUT');
    expect(scheme?.textContent).toBe('com.googleusercontent.apps.000000000000-dummyadminhub');
  });

  it('라벨이 파생값을 실제로 가리킨다 — 고아 <label htmlFor> 를 남기지 않는다', () => {
    const { container } = render(<Harness value={BASE} />);

    for (const label of Array.from(container.querySelectorAll('label[for]'))) {
      const target = label.getAttribute('for') ?? '';
      // for 가 가리키는 id 가 실재해야 한다 — 없으면 스크린리더에 이름이 닿지 않는다
      expect(container.querySelector(`#${CSS.escape(target)}`)).not.toBeNull();
    }
  });

  it('클라이언트 ID 가 없으면 지어내지 않고 무엇을 해야 하는지 말한다', () => {
    const { container } = render(<Harness value={{ ...BASE, clientId: '' }} />);

    expect(container.querySelector('#oauth-google-ios-scheme')?.textContent).toContain(
      '클라이언트 ID를 먼저 입력',
    );
  });

  it('구글이 아닌 제공자에는 그리지 않는다 — 구글만의 규약이다', () => {
    const { container } = render(
      <Harness value={{ ...BASE, provider: 'naver', clientId: 'dummy-naver-client-id' }} />,
    );

    expect(container.querySelector('#oauth-naver-ios-scheme')).toBeNull();
    // 대신 네이버에는 네이티브 앱 키도 없다(카카오만)
    expect(container.querySelector('#oauth-naver-native-app-key')).toBeNull();
  });

  it('카카오에는 네이티브 앱 키를 그린다 — 비밀이 아니므로 평문 입력이다', () => {
    const { container } = render(
      <Harness value={{ ...BASE, provider: 'kakao', clientId: 'dummy-kakao-rest-api-key' }} />,
    );
    const nativeKey = container.querySelector('#oauth-kakao-native-app-key');

    expect(nativeKey).not.toBeNull();
    expect(nativeKey?.getAttribute('type')).toBe('text');
  });
});

describe('OAuthProviderCard — Apple 은 시크릿 한 칸이 아니라 서명 재료 넷이다', () => {
  it('네 개의 필드를 그린다 — client_secret 입력칸은 **없다**', () => {
    const { container } = render(<Harness value={APPLE} />);

    // 있어야 하는 넷
    expect(container.querySelector('#oauth-apple-services-id')).not.toBeNull();
    expect(container.querySelector('#oauth-apple-team-id')).not.toBeNull();
    expect(container.querySelector('#oauth-apple-key-id')).not.toBeNull();
    expect(container.querySelector('#oauth-apple-private-key')).not.toBeNull();

    // 없어야 하는 것 — Apple 에는 정적 시크릿이 없다. 한 칸으로 뭉뚱그리면 이 단언이 깨진다.
    expect(container.querySelector('#oauth-apple-secret')).toBeNull();
    expect(container.querySelector('#oauth-apple-client-id')).toBeNull();
  });

  it('개인키는 파일 입력이고 .p8 만 받는다', () => {
    const { container } = render(<Harness value={APPLE} />);
    const file = container.querySelector('#oauth-apple-private-key');

    expect(file?.getAttribute('type')).toBe('file');
    expect(file?.getAttribute('accept')).toBe('.p8');
  });

  it('공개 식별자 셋은 평문 텍스트다 — 비밀이 아닌 값을 비밀처럼 다루지 않는다', () => {
    const { container } = render(<Harness value={APPLE} />);

    for (const id of ['services-id', 'team-id', 'key-id']) {
      expect(container.querySelector(`#oauth-apple-${id}`)?.getAttribute('type')).toBe('text');
    }
  });

  it('저장된 키가 있으면 파일 입력을 렌더하지 않는다 — 마스킹만 남는다', () => {
    const { container } = render(<Harness value={{ ...APPLE, hasPrivateKey: true }} />);

    // 파일 입력이 아예 없다 = 실수로 덮어쓸 자리가 없다(가린 것이 아니다)
    expect(container.querySelector('#oauth-apple-private-key')).toBeNull();
    expect(container.textContent).toContain('••••••••••••');
  });

  it('변경 중이면 다시 파일 입력이 나온다', () => {
    const { container } = render(
      <Harness value={{ ...APPLE, hasPrivateKey: true }} changingSecret />,
    );

    expect(container.querySelector('#oauth-apple-private-key')).not.toBeNull();
  });

  it("'한 번만 받을 수 있다' 는 사실을 화면이 말한다 — 없으면 없는 버튼을 찾아 헤맨다", () => {
    const { container } = render(<Harness value={APPLE} />);

    expect(container.textContent).toContain('한 번만 내려받을 수 있고');
  });

  it('키를 잃어버렸을 때의 답이 재발급임을 말한다', () => {
    const { container } = render(<Harness value={{ ...APPLE, hasPrivateKey: true }} />);

    expect(container.textContent).toContain('새 키를 발급');
  });

  it('client_secret 이 JWT 라는 사실과 만료를 알린다 — 안 적으면 6개월 뒤 조용히 죽는다', () => {
    const { container } = render(<Harness value={APPLE} />);

    expect(container.textContent).toContain('client_secret(JWT)');
    expect(container.textContent).toContain('6개월');
  });

  it('업로드 통로가 아직 없다는 사실을 숨기지 않는다 — 다 됐다고 믿게 두지 않는다', () => {
    const { container } = render(<Harness value={APPLE} />);

    expect(container.textContent).toContain('이름만 저장돼요');
  });

  it('라벨이 전부 실재하는 컨트롤을 가리킨다 — 고아 <label htmlFor> 를 남기지 않는다', () => {
    const { container } = render(<Harness value={APPLE} />);

    for (const label of Array.from(container.querySelectorAll('label[for]'))) {
      const target = label.getAttribute('for') ?? '';
      expect(container.querySelector(`#${CSS.escape(target)}`)).not.toBeNull();
    }
  });

  it('Return URL 안내가 localhost 를 쓸 수 없다고 말한다', () => {
    const { container } = render(<Harness value={APPLE} />);

    expect(container.textContent).toContain('localhost');
  });
});

describe('OAuthProviderCard — 새 제공자도 자기 콘솔 용어로 말한다', () => {
  it('Facebook 은 앱 ID·앱 시크릿 코드로 라벨을 단다', () => {
    const { container } = render(
      <Harness value={{ ...BASE, provider: 'facebook', clientId: '000000000000000' }} />,
    );

    expect(container.textContent).toContain('앱 ID (client_id)');
    expect(container.textContent).toContain('앱 시크릿 코드 (client_secret)');
    // 구글 전용 파생값은 따라오지 않는다
    expect(container.querySelector('#oauth-facebook-ios-scheme')).toBeNull();
  });

  it('LINE 은 Channel ID·Channel secret 으로 라벨을 단다', () => {
    const { container } = render(
      <Harness value={{ ...BASE, provider: 'line', clientId: '2000000000' }} />,
    );

    expect(container.textContent).toContain('Channel ID (client_id)');
    expect(container.textContent).toContain('Channel secret (client_secret)');
  });

  it('자격증명이 아닌 콘솔 준비물을 알린다 — 값을 다 넣어도 안 되는 이유가 거기 있다', () => {
    const facebook = render(
      <Harness value={{ ...BASE, provider: 'facebook', clientId: '000000000000000' }} />,
    );
    expect(facebook.container.textContent).toContain('개발 모드');

    const line = render(<Harness value={{ ...BASE, provider: 'line', clientId: '2000000000' }} />);
    expect(line.container.textContent).toContain('Developing');
  });
});
