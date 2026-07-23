// 로고 목록(파트너사·고객사)의 쓰기 게이팅 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면도 CrudListShell 을 쓰지 않는다(정렬 드래그 때문에 자기 표를 갖는다). 그래서 껍데기가
// 대신 해 주던 게이팅을 받지 못했고 **추가 CTA · 연필 · 휴지통 · 일괄 삭제 · 노출 스위치 ·
// 순서 이동**이 전부 조회 권한만으로 열려 있었다.
//
// [한 컴포넌트가 두 라우트를 산다] `/company/partners` 와 `/company/clients` 가 같은
// LogoListPage 를 쓴다. 리소스는 라우트에서 파생되므로(route-resource.ts) 파트너사만 쓰기를 준
// 역할에게 고객사 화면이 열리면 안 된다 — 그 축을 마지막 케이스가 지킨다.
//
// [바깥 가드를 되돌려 저장 경로를 본다] 컨트롤을 없애면 저장 경로는 화면에서 닿을 수 없다.
// 그래서 표를 스텁으로 갈아끼워 컨트롤이 살아 있는 상태를 만들고, 그때도 어댑터가 불리지
// 않는지 본다(= 다른 탭에서 방금 강등된 세션의 잔여 클릭).
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from '../../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../../shared/permissions/resources';
import type { PermissionAction } from '../../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import type { LogoAdapter } from './adapter';
import type { LogoItem } from './types';

const PARTNERS_ROUTE = '/company/partners';
const CLIENTS_ROUTE = '/company/clients';

const ITEM: LogoItem = {
  id: 'lg-1',
  name: '스페이스플래닝',
  logoUrl: '',
  linkUrl: 'https://example.com',
  order: 1,
  active: true,
};

/** 스텁 표 — 화면이 넘긴 콜백을 권한과 무관하게 눌러 볼 수 있게 연다 */
vi.mock('./LogoListTable', () => ({
  LogoListTable: ({
    onDelete,
    onToggleActive,
  }: {
    readonly onDelete: (item: LogoItem) => void;
    readonly onToggleActive: (item: LogoItem, next: boolean) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => {
          onDelete(ITEM);
        }}
      >
        스텁 행 삭제
      </button>
      <button
        type="button"
        onClick={() => {
          onToggleActive(ITEM, false);
        }}
      >
        스텁 노출 토글
      </button>
    </>
  ),
}));

const { LogoListPage } = await import('./LogoListPage');

const remove = vi.fn<(id: string) => Promise<void>>();
const setActive = vi.fn<(id: string, active: boolean) => Promise<void>>();

/** 진짜 계약을 그대로 만족하는 어댑터 — 이 테스트가 보는 것은 쓰기가 **불렸는가**다 */
const adapter: LogoAdapter = {
  fetchAll: () => Promise.resolve([ITEM]),
  create: () => Promise.resolve(),
  update: () => Promise.resolve(),
  remove: (id) => remove(id),
  reorder: () => Promise.resolve(),
  setActive: (id, active) => setActive(id, active),
};

/** 활성 역할의 권한 — 전 권한 ON 에서 시작해 그 라우트의 지정한 액션만 끈다 */
function seedPermissions(route: string, off: readonly PermissionAction[]): void {
  let permissions = createMatrix(true);
  for (const action of off) {
    permissions = withResourceAction(permissions, `page:${route}`, action, false);
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

function renderAt(route: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route
              path={route}
              element={
                <LogoListPage
                  resource={route === PARTNERS_ROUTE ? 'partners' : 'clients'}
                  entityLabel={route === PARTNERS_ROUTE ? '파트너사' : '고객사'}
                  adapter={adapter}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  remove.mockReset();
  remove.mockResolvedValue(undefined);
  setActive.mockReset();
  setActive.mockResolvedValue(undefined);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('LogoListPage — 등록 CTA 는 create 를 탄다 (EXC-03)', () => {
  it('create 가 없으면 추가 버튼이 존재하지 않는다', async () => {
    seedPermissions(PARTNERS_ROUTE, ['create']);
    renderAt(PARTNERS_ROUTE);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /파트너사 추가/ })).toBeNull();
    });
  });

  it('create 가 있으면 추가 버튼이 보인다 — 위 단언이 헛돌지 않는다', async () => {
    seedPermissions(PARTNERS_ROUTE, []);
    renderAt(PARTNERS_ROUTE);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /파트너사 추가/ })).not.toBeNull();
    });
  });

  /**
   * 두 라우트가 같은 컴포넌트를 산다 — 파트너사의 권한을 끈 것이 고객사까지 끄면
   * 리소스가 라우트에서 파생된다는 전제가 깨진 것이다.
   */
  it('파트너사의 create 만 꺼도 고객사 화면의 추가 버튼은 남는다', async () => {
    seedPermissions(PARTNERS_ROUTE, ['create']);
    renderAt(CLIENTS_ROUTE);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /고객사 추가/ })).not.toBeNull();
    });
  });
});

describe('LogoListPage — 저장 경로도 같은 술어로 거절한다', () => {
  it('remove 가 없으면 확인을 눌러도 삭제 요청이 나가지 않는다', async () => {
    seedPermissions(PARTNERS_ROUTE, ['remove']);
    renderAt(PARTNERS_ROUTE);

    fireEvent.click(await screen.findByRole('button', { name: '스텁 행 삭제' }));
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(screen.getByText(/삭제 권한이 없어요/)).not.toBeNull();
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it('remove 가 있으면 같은 클릭이 삭제 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions(PARTNERS_ROUTE, []);
    renderAt(PARTNERS_ROUTE);

    fireEvent.click(await screen.findByRole('button', { name: '스텁 행 삭제' }));
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));

    await waitFor(() => {
      expect(remove).toHaveBeenCalledWith(ITEM.id);
    });
  });

  it('update 가 없으면 노출 토글이 저장 요청을 내지 않고 사유를 말한다', async () => {
    seedPermissions(PARTNERS_ROUTE, ['update']);
    renderAt(PARTNERS_ROUTE);

    fireEvent.click(await screen.findByRole('button', { name: '스텁 노출 토글' }));

    await waitFor(() => {
      expect(screen.getByText(/수정 권한이 없어요/)).not.toBeNull();
    });
    expect(setActive).not.toHaveBeenCalled();
  });

  it('update 가 있으면 같은 토글이 저장 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions(PARTNERS_ROUTE, []);
    renderAt(PARTNERS_ROUTE);

    fireEvent.click(await screen.findByRole('button', { name: '스텁 노출 토글' }));

    await waitFor(() => {
      expect(setActive).toHaveBeenCalledWith(ITEM.id, false);
    });
  });
});
