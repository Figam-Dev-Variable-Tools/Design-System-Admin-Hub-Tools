// 안읽음 배지가 벨 아이콘을 덮지 않는다 (shared/notifications/NotificationBell.tsx)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 재현 경로를 고정한다]
// 배지 앵커가 `top: 0; right: 0` 뿐이라 채워진 danger 배지가 **버튼 안쪽** 우상단에 앉았고,
// 벨이 stroke 만 있는 선 아이콘이라 그 위를 덮으면 아이콘이 사라진 것처럼 보였다.
//
// [이 테스트가 증명하지 못하는 것 — 정직하게 적는다]
// jsdom 에는 레이아웃이 없다. 그래서 '배지가 아이콘과 몇 px 겹치는가' 는 **여기서 잴 수 없다.**
// 대신 겹침을 만들던 형태가 돌아오면 깨지도록, 앵커가 **바깥으로 밀려 있다는 사실**을 인라인
// 스타일로 고정한다: 오프셋이 0 이 아니고 자기 크기만큼 밀어내는 transform 이 있다. 실제 '보인다'
// 는 시각 회귀(Storybook)의 몫이고, 그것을 이 파일이 대신하는 척하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePermissionStore } from '../permissions/permission-store';
import { OPERATOR_ROLE_ID } from '../permissions/roles';

import { NotificationBell } from './NotificationBell';
import { useNotificationReadState } from './store';

function renderBell(): HTMLElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const { container } = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return container;
}

/** 배지 요소 — 없으면 null. 감싼 앵커가 그 부모다 */
function badgeOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('.tds-badge');
}

beforeEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  // 읽음 상태는 모듈 싱글턴(zustand)이라 테스트 사이에 샌다
  useNotificationReadState.setState({ readIds: new Set<string>() });
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('알림 벨 — 배지가 아이콘을 가리지 않는다', () => {
  it('안읽음이 있으면 배지가 뜨고, 앵커가 버튼 밖으로 밀려 있다', async () => {
    const container = renderBell();

    const badge = await waitFor(() => {
      const found = badgeOf(container);
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });

    const anchor = badge.parentElement as HTMLElement;

    // 겹침을 만들던 형태(오프셋 0 · 변환 없음)가 돌아오면 여기서 깨진다.
    // 오프셋은 배지 토큰에서 계산하므로 `calc(` 로 시작한다 — 상수 0 이면 그 문자열이 사라진다
    expect(anchor.style.transform).toContain('translate(');
    expect(anchor.style.top).toContain('calc(');
    expect(anchor.style.right).toContain('calc(');

    // 밀려난 배지가 잘리지 않도록 앵커 상자가 그만큼의 여백을 갖는다
    const wrap = anchor.parentElement as HTMLElement;
    expect(wrap.style.paddingTop).not.toBe('');
    expect(wrap.style.paddingRight).not.toBe('');
  });

  it('접근 이름이 개수를 말한다 — 배지는 시각 보강일 뿐이라 aria-hidden 이다', async () => {
    const container = renderBell();

    await waitFor(() => {
      expect(badgeOf(container)).not.toBeNull();
    });

    expect(screen.getByRole('button', { name: /안읽음/ })).toBeTruthy();
    expect((badgeOf(container)?.parentElement as HTMLElement).getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('안읽음이 0이면 배지가 아예 없다 (기존 동작)', async () => {
    const container = renderBell();

    await waitFor(() => {
      expect(badgeOf(container)).not.toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: /알림/ }));
    fireEvent.click(screen.getByRole('button', { name: '모두 읽음' }));

    await waitFor(() => {
      expect(badgeOf(container)).toBeNull();
    });
  });
});
