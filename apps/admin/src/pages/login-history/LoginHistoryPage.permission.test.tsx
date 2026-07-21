// 내보내기 게이팅 (EXC-03) — apps/admin/src/pages/login-history/**
//
// 이 화면에는 삭제도 수정도 없다(감사 기록은 불변이다). 남은 쓰기성 액션은 **내보내기 하나**인데,
// 그 하나가 계정·이름·IP 가 담긴 파일을 뽑아낸다. 그럼에도 이 화면은 권한을 묻지 않아, 읽기만
// 허용된 역할도 버튼을 그대로 보고 누를 수 있었다 — 로그 화면(LogListShell)은 이미 막고 있던
// 구멍이 같은 성질의 화면에 남아 있던 것이다.
//
// 기준은 로그 화면과 같다: 권한이 없으면 **비활성이 아니라 부재**다.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from '../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../shared/permissions/resources';
import type { PermissionAction } from '../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../shared/permissions/roles';
import { ToastProvider } from '../../shared/ui';
import type { LoginHistoryResult } from './types';

const ROUTE = '/users/login-history';

const RESULT: LoginHistoryResult = {
  entries: [],
  outcomeCounts: { all: 0, success: 0, failure: 0 },
  kindCounts: { all: 0, member: 0, admin: 0 },
  total: 0,
};

const fetchLoginHistory = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchLoginHistory,
}));

const { default: LoginHistoryPage } = await import('./LoginHistoryPage');

/** 활성 역할의 권한을 심는다 — 전 권한 ON 에서 시작해 지정한 액션만 끈다 */
function seedPermissions(off: readonly PermissionAction[]): void {
  let permissions = createMatrix(true);
  for (const action of off) {
    permissions = withResourceAction(permissions, `page:${ROUTE}`, action, false);
  }

  usePermissionStore.setState({
    roleState: {
      version: ROLE_STATE_VERSION,
      roles: [
        {
          id: 'role-test',
          name: '테스트 역할',
          system: false,
          scope: 'all',
          permissions,
          widgets: createWidgets(true),
        },
      ],
      activeRoleId: 'role-test',
    },
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <Routes>
            <Route path={ROUTE} element={<LoginHistoryPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchLoginHistory.mockReset();
  fetchLoginHistory.mockResolvedValue(RESULT);
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('LoginHistoryPage — 내보내기는 export 권한을 요구한다 (EXC-03)', () => {
  it('export 권한이 없으면 내보내기 버튼이 존재하지 않는다', () => {
    seedPermissions(['export']);
    renderPage();

    expect(screen.queryByRole('button', { name: /내보내기/ })).toBeNull();
    // 조회는 그대로다 — 막는 것은 반출뿐이다
    expect(screen.getByPlaceholderText('계정 · 이름 · IP 검색')).not.toBeNull();
  });

  it('export 권한이 있으면 내보내기 버튼이 보인다', () => {
    seedPermissions([]);
    renderPage();

    expect(screen.getByRole('button', { name: /내보내기/ })).not.toBeNull();
  });
});
