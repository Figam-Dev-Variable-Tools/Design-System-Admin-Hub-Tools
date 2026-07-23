// 카테고리 목록의 행 액션 — 연필과 휴지통은 각각 update/remove 를 탄다 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 목록은 2단계 트리라 표가 아니고, 그래서 `CrudListShell` 을 쓰지 않는다. 껍데기가 대신
// 해 주던 행 액션 게이팅(canUpdate/canRemove)이 여기엔 없었고, **등록만 걸린 채 수정·삭제는
// 조회 권한만으로 열려 있었다.** 껍데기를 쓰지 않는 목록이 게이팅에서 빠지는 이 모양은
// 프로그램 카테고리에도 똑같이 있었다(같은 파일 구조의 복제본이다).
//
// [왜 두 축을 따로 끄나] 연필은 update, 휴지통은 remove 다. 한 역할로 뭉뚱그려 단언하면
// '전부 read-only 면 전부 사라진다' 만 지킬 뿐 **어느 컨트롤이 어느 권한을 타는지**는
// 뒤바뀌어도 통과한다.
//
// [기본 세션이 전권이라 헛돌기 쉽다] 그래서 매번 활성 역할의 매트릭스를 직접 심고, 반대 방향
// (권한이 있으면 보인다)을 같은 파일에서 함께 단언한다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { createWidgets } from '../../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../../shared/permissions/resources';
import type { PermissionAction } from '../../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import ProductCategoriesPage from './ProductCategoriesPage';

const ROUTE = '/products/categories';

/** 활성 역할의 권한 — 전 권한 ON 에서 시작해 이 라우트의 지정한 액션만 끈다 */
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
            <Route path={ROUTE} element={<ProductCategoriesPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * 행이 실제로 섰는지 — '부재' 를 단언하기 전에 화면이 비어 있지 않음을 먼저 못 박는다.
 * 시드의 대분류 이름을 탐침으로 쓴다(`_shared/store` 의 카테고리 시드).
 */
async function waitForRows(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByText('아우터')).not.toBeNull();
  });
}

afterEach(() => {
  // 스토어는 모듈 싱글턴이라 다음 파일로 역할이 새지 않게 되돌린다
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('ProductCategoriesPage — 행 액션은 각자의 권한을 탄다 (EXC-03)', () => {
  it('update 권한이 없으면 수정(연필) 버튼이 하나도 존재하지 않는다', async () => {
    seedPermissions(['update']);
    renderPage();
    await waitForRows();

    expect(screen.queryAllByRole('button', { name: /수정$/ })).toHaveLength(0);
    // 삭제는 그대로다 — 두 컨트롤이 서로 다른 권한을 탄다는 증거
    expect(screen.queryAllByRole('button', { name: /삭제/ }).length).toBeGreaterThan(0);
  });

  it('remove 권한이 없으면 삭제(휴지통) 버튼이 하나도 존재하지 않는다', async () => {
    seedPermissions(['remove']);
    renderPage();
    await waitForRows();

    expect(screen.queryAllByRole('button', { name: /삭제/ })).toHaveLength(0);
    expect(screen.queryAllByRole('button', { name: /수정$/ }).length).toBeGreaterThan(0);
  });

  it('create 권한이 없으면 등록 CTA 와 하위 추가 버튼이 사라진다', async () => {
    seedPermissions(['create']);
    renderPage();
    await waitForRows();

    expect(screen.queryByRole('button', { name: '카테고리 추가' })).toBeNull();
    expect(screen.queryAllByRole('button', { name: /하위 카테고리 추가/ })).toHaveLength(0);
  });

  /** 반대 방향 — 이게 없으면 '버튼을 아예 지웠다' 로도 위 단언들이 통과한다 */
  it('권한이 다 있으면 추가·수정·삭제가 함께 보인다', async () => {
    seedPermissions([]);
    renderPage();
    await waitForRows();

    expect(screen.queryByRole('button', { name: '카테고리 추가' })).not.toBeNull();
    expect(screen.queryAllByRole('button', { name: /수정$/ }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole('button', { name: /삭제/ }).length).toBeGreaterThan(0);
  });
});
