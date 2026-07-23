// 목록 → 상세는 **주소가 바뀌는 이동**이다 · apps/admin/src/pages/settings/oauth/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 예전 이 화면은 타일을 누르면 목록 **아래**에서 자격증명 폼이 펼쳐졌다(disclosure) — 주소는
// 그대로였다. 그래서 새 탭·주소 공유·뒤로가기·중간 클릭이 전부 없었고, 타일은 `aria-expanded`
// 로 '펼친다' 고 말했다. 지금은 진짜 라우팅이다.
//
// 그래서 '패널이 나타났다' 로 단언하면 **아무것도 지키지 못한다** — 그것은 옛 동작에서도 참이다.
// 여기서는 반드시 **URL 이 바뀌었는가**를 본다.
//
// [저장 범위] 화면이 둘로 갈리면서 '저장' 이 무엇을 쓰는지가 새 계약이 됐다:
//   · 목록  — 순서와 표시 정책만. 자격증명은 서버 문서에서 그대로 가져온다.
//   · 상세  — 그 제공자만. 다른 제공자와 표시 정책은 서버 값 그대로다.
// 이 둘이 무너지면 '보이지도 않는 값을 조용히 덮어쓰는 저장' 이 된다 — 순수 함수로 못박는다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import OAuthPage, { listSavePayload } from './OAuthPage';
import OAuthProviderPage, { providerSavePayload } from './OAuthProviderPage';
import { OAUTH_LIST_PATH, oauthProviderPath } from './paths';
import {
  isClientSecretProvider,
  isOAuthProviderId,
  oauthListSchema,
  oauthProviderScopedSchema,
} from './validation';
import type { OAuthProviderValues, OAuthSettingsValues } from './validation';

/** 지금 주소를 화면에 내놓는다 — 단언이 '패널' 이 아니라 **URL** 을 볼 수 있게 */
function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

function renderAt(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <LocationProbe />
          <Routes>
            <Route path={OAUTH_LIST_PATH} element={<OAuthPage />} />
            <Route path={`${OAUTH_LIST_PATH}/:provider`} element={<OAuthProviderPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function currentPath(): string {
  return screen.getByTestId('pathname').textContent ?? '';
}

/** 타일 = 제공자로 가는 링크. 접근 이름에 상태가 실려 있으므로 그것으로 찾는다 */
function tile(title: string): HTMLElement {
  return screen.getByRole('link', { name: new RegExp(`^${title},`) });
}

describe('제공자 목록 — 타일은 disclosure 버튼이 아니라 링크다', () => {
  it('타일이 그 제공자의 상세 주소를 가리키는 링크로 그려진다', async () => {
    renderAt(OAUTH_LIST_PATH);

    const kakao = await screen.findByRole('link', { name: /^카카오 로그인 · 싱크,/ });
    expect(kakao.getAttribute('href')).toBe('/settings/oauth/kakao');
  });

  it('타일에 aria-expanded · aria-controls 가 없다 — 여는 것이 아니라 이동한다', async () => {
    renderAt(OAUTH_LIST_PATH);

    const google = await screen.findByRole('link', { name: /^구글 로그인,/ });
    expect(google.getAttribute('aria-expanded')).toBeNull();
    expect(google.getAttribute('aria-controls')).toBeNull();
  });

  it("'사용 중' 상태가 접근 이름에 남아 있다 — 알약 색만으로 말하지 않는다", async () => {
    renderAt(OAUTH_LIST_PATH);

    const google = await screen.findByRole('link', { name: /^구글 로그인,/ });
    expect(google.getAttribute('aria-label')).toContain('사용 안 함');
  });

  it('타일을 누르면 **URL 이 상세 라우트로 바뀐다** (패널이 열리는 것이 아니다)', async () => {
    const user = userEvent.setup();
    renderAt(OAUTH_LIST_PATH);

    await screen.findByRole('link', { name: /^네이버 로그인,/ });
    expect(currentPath()).toBe('/settings/oauth');

    await user.click(tile('네이버 로그인'));

    await waitFor(() => {
      expect(currentPath()).toBe('/settings/oauth/naver');
    });
  });

  it('자격증명 폼은 목록 화면에 더 이상 없다 — 상세로 옮겨졌다', async () => {
    renderAt(OAUTH_LIST_PATH);

    await screen.findByRole('link', { name: /^구글 로그인,/ });
    expect(document.querySelector('#oauth-google-client-id')).toBeNull();
    // 옛 disclosure 영역도 사라졌다 — 남아 있으면 끊긴 aria-controls 의 흔적이다
    expect(document.querySelector('#oauth-provider-detail')).toBeNull();
  });
});

describe('제공자 상세 — /settings/oauth/:provider', () => {
  it('그 제공자의 이름과 자격증명 입력칸을 그린다', async () => {
    renderAt(oauthProviderPath('google'));

    expect(await screen.findByRole('heading', { name: '구글 로그인' })).not.toBeNull();
    await waitFor(() => {
      expect(document.querySelector('#oauth-google-client-id')).not.toBeNull();
    });
    // 켜고 끄는 토글도 여기 있다(목록에는 없다)
    expect(screen.getByLabelText('구글 로그인 사용')).not.toBeNull();
  });

  it('파생 iOS URL 스키마는 여전히 <output> 이다 — 편집 컨트롤로 바뀌지 않았다', async () => {
    renderAt(oauthProviderPath('google'));

    await waitFor(() => {
      expect(document.querySelector('#oauth-google-ios-scheme')).not.toBeNull();
    });
    expect(document.querySelector('#oauth-google-ios-scheme')?.tagName).toBe('OUTPUT');
  });

  it('카카오는 네이티브 앱 키와 카카오싱크 버튼을 그대로 갖는다', async () => {
    renderAt(oauthProviderPath('kakao'));

    await waitFor(() => {
      expect(document.querySelector('#oauth-kakao-native-app-key')).not.toBeNull();
    });
    expect(screen.getByRole('button', { name: '카카오싱크 간편 설정' })).not.toBeNull();
  });

  it('Apple 은 시크릿 한 칸이 아니라 서명 재료 넷을 그린다', async () => {
    renderAt(oauthProviderPath('apple'));

    await waitFor(() => {
      expect(document.querySelector('#oauth-apple-services-id')).not.toBeNull();
    });
    expect(document.querySelector('#oauth-apple-team-id')).not.toBeNull();
    expect(document.querySelector('#oauth-apple-key-id')).not.toBeNull();
    expect(document.querySelector('#oauth-apple-private-key')).not.toBeNull();
    // Apple 에는 정적 시크릿 칸이 없다
    expect(document.querySelector('#oauth-apple-secret')).toBeNull();
  });

  it("'목록으로' 는 링크다 — 미저장 가드가 앵커 클릭을 가로챌 수 있어야 한다", async () => {
    renderAt(oauthProviderPath('google'));

    const back = await screen.findByRole('link', { name: '목록으로' });
    expect(back.getAttribute('href')).toBe('/settings/oauth');
  });

  it("'목록으로' 를 누르면 목록 주소로 돌아간다", async () => {
    const user = userEvent.setup();
    renderAt(oauthProviderPath('google'));

    const back = await screen.findByRole('link', { name: '목록으로' });
    await user.click(back);

    await waitFor(() => {
      expect(currentPath()).toBe('/settings/oauth');
    });
  });
});

describe('알 수 없는 제공자 — 빈 화면을 내놓지 않는다', () => {
  it('없는 제공자 id 면 사실과 돌아갈 길을 함께 보여준다', async () => {
    renderAt('/settings/oauth/myspace');

    expect(await screen.findByText(/이 화면이 아는 소셜 로그인 제공자가 아니에요/)).not.toBeNull();
    expect(
      screen.getByRole('link', { name: '소셜 로그인 목록으로 돌아가기' }).getAttribute('href'),
    ).toBe('/settings/oauth');
  });

  it('없는 제공자면 자격증명 폼을 아예 그리지 않는다', async () => {
    renderAt('/settings/oauth/myspace');

    await screen.findByText(/이 화면이 아는 소셜 로그인 제공자가 아니에요/);
    expect(document.querySelector('input')).toBeNull();
  });

  it('isOAuthProviderId 는 메타 표에서 파생된다 — 아는 여섯만 통과한다', () => {
    for (const id of ['google', 'kakao', 'naver', 'facebook', 'apple', 'line']) {
      expect(isOAuthProviderId(id)).toBe(true);
    }
    for (const id of ['myspace', '', 'Google', 'toString', 'constructor']) {
      expect(isOAuthProviderId(id)).toBe(false);
    }
  });
});

/* ── 저장 범위 — 화면이 쓰지 않는 값을 조용히 덮어쓰지 않는다 ──────────────── */

/** 서버에 이미 있는 문서 — 자격증명이 채워져 있다 */
const GOOGLE: OAuthProviderValues = {
  provider: 'google',
  enabled: true,
  clientId: '111.apps.googleusercontent.com',
  secret: '',
  hasSecret: true,
  nativeAppKey: '',
  redirectUri: 'https://admin.example.com/auth/google/callback',
};

const KAKAO: OAuthProviderValues = {
  provider: 'kakao',
  enabled: true,
  clientId: 'kakao-rest-key',
  secret: '',
  hasSecret: true,
  nativeAppKey: 'kakao-native',
  redirectUri: 'https://admin.example.com/auth/kakao/callback',
};

const SERVER: OAuthSettingsValues = {
  providers: [GOOGLE, KAKAO],
  display: { kakaoTalkInAppLoginOnly: true },
};

/**
 * 문서에서 client_id 를 꺼낸다 — 갈래를 **좁혀서** 읽는다.
 * providers[] 는 합집합이라 Apple 갈래에는 clientId 가 없다(./validation.ts). 캐스트로 뭉개면
 * 갈래가 늘 때 이 단언이 조용히 엉뚱한 것을 보게 된다.
 */
function clientIdAt(values: OAuthSettingsValues, position: number): string | null {
  const provider = values.providers[position];
  if (provider === undefined || !isClientSecretProvider(provider)) return null;
  return provider.clientId;
}

describe('목록 저장 — 순서와 표시 정책만 쓴다', () => {
  it('폼이 들고 있던 낡은 자격증명은 보내지 않는다 — 서버 값이 이긴다', () => {
    const staleForm: OAuthSettingsValues = {
      providers: [{ ...GOOGLE, clientId: '낡은-값', hasSecret: false }, KAKAO],
      display: { kakaoTalkInAppLoginOnly: true },
    };

    const payload = listSavePayload(SERVER, staleForm);

    expect(payload.providers[0]).toEqual(GOOGLE);
    expect(clientIdAt(payload, 0)).toBe('111.apps.googleusercontent.com');
  });

  it('순서는 폼이 정한다 — 자리를 바꾸면 그대로 실린다', () => {
    const reordered: OAuthSettingsValues = { ...SERVER, providers: [KAKAO, GOOGLE] };

    const payload = listSavePayload(SERVER, reordered);

    expect(payload.providers.map((provider) => provider.provider)).toEqual(['kakao', 'google']);
    // 순서만 바뀌고 내용은 서버 값 그대로다
    expect(payload.providers[0]).toEqual(KAKAO);
  });

  it('표시 정책은 폼이 정한다 — 이 화면이 그리는 유일한 값이다', () => {
    const payload = listSavePayload(SERVER, {
      ...SERVER,
      display: { kakaoTalkInAppLoginOnly: false },
    });

    expect(payload.display.kakaoTalkInAppLoginOnly).toBe(false);
  });
});

describe('상세 저장 — 그 제공자만 쓴다', () => {
  it('편집한 제공자만 갈아 끼우고 나머지는 서버 값 그대로다', () => {
    const edited: OAuthProviderValues = {
      ...GOOGLE,
      clientId: '222.apps.googleusercontent.com',
    };

    const payload = providerSavePayload(SERVER, 'google', edited);

    expect(clientIdAt(payload, 0)).toBe('222.apps.googleusercontent.com');
    expect(payload.providers[1]).toEqual(KAKAO);
  });

  it('표시 정책은 손대지 않는다 — 상세 화면은 그리지도 저장하지도 않는다', () => {
    const payload = providerSavePayload(SERVER, 'google', GOOGLE);
    expect(payload.display).toEqual(SERVER.display);
  });

  it('순서를 흔들지 않는다 — 이 화면에는 순서를 바꿀 컨트롤이 없다', () => {
    const payload = providerSavePayload(SERVER, 'kakao', KAKAO);
    expect(payload.providers.map((provider) => provider.provider)).toEqual(['google', 'kakao']);
  });
});

describe('상세 검증 범위 — 보이지 않는 오류가 저장을 막지 않는다', () => {
  /** 카카오가 켜져 있는데 자격증명이 비었다 — 카카오 화면에서만 보이는 오류다 */
  const BROKEN_KAKAO: OAuthSettingsValues = {
    providers: [GOOGLE, { ...KAKAO, clientId: '', hasSecret: false, secret: '' }],
    display: { kakaoTalkInAppLoginOnly: false },
  };

  it('구글 화면은 카카오의 결함을 이유로 막히지 않는다', () => {
    expect(oauthProviderScopedSchema('google').safeParse(BROKEN_KAKAO).success).toBe(true);
  });

  it('카카오 화면은 카카오의 결함을 잡는다 — 규칙이 사라진 것이 아니다', () => {
    expect(oauthProviderScopedSchema('kakao').safeParse(BROKEN_KAKAO).success).toBe(false);
  });

  it('표시 정책의 교차 규칙은 상세에서 보지 않는다 — 그 값을 그리지 않기 때문이다', () => {
    const kakaoOff: OAuthSettingsValues = {
      providers: [GOOGLE, { ...KAKAO, enabled: false }],
      display: { kakaoTalkInAppLoginOnly: true },
    };

    expect(oauthProviderScopedSchema('google').safeParse(kakaoOff).success).toBe(true);
  });

  it('목록 스키마는 자격증명을 보지 않고 표시 정책의 교차 규칙만 본다', () => {
    // 카카오 자격증명이 비었어도 목록에서는 그것을 고칠 수 없다 — 막지 않는다
    expect(oauthListSchema.safeParse(BROKEN_KAKAO).success).toBe(true);

    // 그러나 카카오가 꺼진 채 인앱 전용 정책을 켜면 막는다 — 둘 다 목록에서 보이는 값이다
    const kakaoOffPolicyOn: OAuthSettingsValues = {
      providers: [GOOGLE, { ...KAKAO, enabled: false }],
      display: { kakaoTalkInAppLoginOnly: true },
    };
    expect(oauthListSchema.safeParse(kakaoOffPolicyOn).success).toBe(false);
  });
});
