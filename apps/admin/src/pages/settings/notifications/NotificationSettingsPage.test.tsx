// 읽지 못한 설정은 저장되지 않는다 (pages/settings/notifications/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 재현 경로를 고정한다]
// `normalizePrefs` 가 빠진 키를 **켜짐**으로 채우는 것은 의도다(새 종류가 조용히 꺼지지 않게).
// 그런데 조회가 실패하면 8키가 전부 빠진 것과 같아 화면이 '전부 받음' 을 그렸고, 그 상태에서
// 토글 하나를 만지고 저장하면 문서가 「기본값 + 그 하나」로 치환됐다 — 운영자가 예전에 꺼 둔
// 종류가 조용히 켜진다. 읽기 실패가 쓰기 사고로 번지는 경로다.
//
// [왜 순수 테스트만으로는 부족한가] `prefsSaveBlock` 자체는 notifications.test.ts 가 덮는다.
// 그러나 **화면이 그 술어를 실제로 소비해 저장 표면을 잠그는지**는 렌더해야만 보인다 — 예전
// 버그는 규칙이 아니라 소비처의 부재였다.
//
// [실패를 어떻게 만드나] 픽스처 저장소의 `?fail=` 규약을 그대로 쓴다(shared/crud/dev.ts).
// 스위치는 `window.location.search` 를 읽으므로 라우터가 아니라 history 로 심는다 — 화면이
// 실제 운영에서 밟는 것과 같은 경로다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { OPERATOR_ROLE_ID } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';

import NotificationSettingsPage from './NotificationSettingsPage';

const ROUTE = '/settings/notifications';

function renderPage(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <NotificationSettingsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** `?fail=` 은 window.location 을 읽는다 — 스위치를 심고 되돌린다(모듈 싱글턴처럼 샌다) */
function setSearch(search: string): void {
  window.history.replaceState({}, '', `${ROUTE}${search}`);
}

beforeEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  setSearch('');
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('알림 설정 — 모르는 값을 켜짐으로 덮어쓰지 않는다', () => {
  it('조회에 실패하면 저장 표면이 잠기고 무엇을 덮게 되는지 말한다', async () => {
    setSearch('?fail=notification-prefs:load');
    renderPage();

    // 실패 사실만이 아니라 그 상태의 저장이 무엇을 되살리는지까지 말한다
    await screen.findByText(/꺼 둔 종류가 다시 켜져요/, undefined, { timeout: 3_000 });

    expect(screen.getByRole('button', { name: '저장' }).hasAttribute('disabled')).toBe(true);
    // 토글도 함께 잠근다 — '내가 방금 껐다' 는 기억만 남고 저장이 막히면 그것도 거짓말이다
    for (const toggle of screen.getAllByRole('switch')) {
      expect(toggle.hasAttribute('disabled')).toBe(true);
    }
  });

  it('정상 조회에서는 잠기지 않는다 — 저장을 통째로 막은 것이 아니다', async () => {
    renderPage();

    const toggles = await waitFor(() => screen.getAllByRole('switch'), { timeout: 3_000 });
    for (const toggle of toggles) {
      expect(toggle.hasAttribute('disabled')).toBe(false);
    }
    // 아직 바꾼 것이 없으니 저장은 dirty 축으로 잠겨 있어야 한다(이유가 다른 잠금이다)
    expect(screen.getByText('변경 사항이 없어요.')).toBeTruthy();
  });
});
