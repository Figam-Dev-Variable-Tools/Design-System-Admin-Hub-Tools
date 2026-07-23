// 권한 게이팅 (EXC-03) — apps/admin/src/pages/logs/components/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이것이 P0 인가 — 로그는 민감하다]
//
// 사이드바에서 메뉴를 숨기는 것만으로는 **아무것도 막지 못한다.** 링크를 아는 사람은 주소창에
// 그대로 칠 수 있고, 그러면 숨긴 화면이 통째로 렌더된다. 감사 로그에는 회원의 이메일·IP·
// 주문 내역·요청 페이로드가 들어 있다 — 뷰어 권한만 받은 계정이 URL 하나로 그것을 전부 보는 것은
// 권한 모델이 없는 것과 같다.
//
// 그리고 **조회 자체를 걸지 않아야 한다.** 데이터를 받아 놓고 안 보여주는 것은 게이팅이 아니다 —
// 백엔드가 붙으면 그 요청은 실제로 서버에 도달하고, 응답은 브라우저 메모리에 남는다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequirePermission } from '../../../shared/permissions/RequirePermission';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../../shared/permissions/resources';
import type { PermissionAction } from '../../../shared/permissions/resources';
import { createWidgets } from '../../../shared/permissions/feature-registry';
import { ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import { ALL_FILTER, DEFAULT_SORT } from '../types';
import type { LogEntryBase, LogQuery, LogResult, LogScreenSpec } from '../types';
import { LogListShell } from './LogListShell';

interface Row extends LogEntryBase {
  readonly name: string;
}

const ROW: Row = { id: '1', occurredAtIso: '2026-07-14T02:31:09Z', name: '가나' };

/** 성공 응답 한 벌 — 조회가 되는 경우의 기본 픽스처 */
const ONE_ROW: LogResult<Row> = { entries: [ROW], axisCounts: {}, total: 1 };

const ROUTE = '/logs/admin';

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

function specOf(fetchPage: LogScreenSpec<Row>['fetchPage']): LogScreenSpec<Row> {
  return {
    scope: 'logs-test',
    route: ROUTE,
    entityLabel: '관리자 로그',
    retention: { label: '3년', basis: '테스트' },
    axes: [
      {
        key: 'outcome',
        heading: '결과',
        ariaLabel: '결과 필터',
        options: [
          { id: ALL_FILTER, label: '전체' },
          { id: 'failure', label: '실패' },
        ],
      },
    ],
    columns: [{ id: 'name', label: '이름', render: (entry) => entry.name }],
    sortValues: { name: (entry) => entry.name },
    caption: '테스트 로그 — 읽기 전용이에요.',
    searchLabel: '검색',
    searchPlaceholder: '검색',
    csvBaseName: 'test-log',
    toneOf: () => 'neutral',
    detailOf: (entry) => ({
      title: entry.name,
      fields: [],
      payload: null,
      payloadLabel: '페이로드',
    }),
    toCsv: () => '',
    fetchPage,
    fetchExport: () => Promise.resolve([]),
    highlightOf: () => null,
  };
}

function renderShell(spec: LogScreenSpec<Row>) {
  // retry:false — 테스트에서 실패를 재시도하며 기다리지 않는다
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          {/* 실제 앱에서 AppShell 이 <Outlet> 을 감싸는 그대로 — 403 은 공유 가드가 그린다 (EXC-03) */}
          <RequirePermission>
            <LogListShell spec={spec} />
          </RequirePermission>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('권한 게이팅', () => {
  it('조회 권한이 없으면 403 을 그린다 — URL 을 직접 쳐도 화면이 열리지 않는다', () => {
    seedPermissions(['read']);
    const fetchPage = vi.fn();
    renderShell(specOf(fetchPage));

    expect(screen.getByText('접근 권한이 없어요')).not.toBeNull();
    // 표는 아예 없다 — 숨기는 것이 아니라 그리지 않는다
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('**조회 권한이 없으면 요청 자체를 보내지 않는다** — 받아 놓고 안 보여주는 것은 게이팅이 아니다', () => {
    seedPermissions(['read']);
    const fetchPage = vi.fn();
    renderShell(specOf(fetchPage));

    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('내보내기 권한이 없으면 그 버튼을 렌더하지 않는다 (조회는 된다)', async () => {
    seedPermissions(['export']);
    renderShell(specOf(() => Promise.resolve(ONE_ROW)));

    expect(await screen.findByRole('table')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /내보내기/ })).toBeNull();
  });

  it('권한이 다 있으면 표와 내보내기가 함께 보인다', async () => {
    seedPermissions([]);

    // 어댑터에 실제로 무엇이 전달됐는지 붙잡는다
    let seen: LogQuery | null = null;
    renderShell(
      specOf((query) => {
        seen = query;
        return Promise.resolve(ONE_ROW);
      }),
    );

    expect(await screen.findByText('가나')).not.toBeNull();
    expect(screen.getByRole('button', { name: /내보내기/ })).not.toBeNull();
    // 기본 정렬은 최신순 — 조회 조건이 어댑터에 그대로 전달된다
    expect(seen).not.toBeNull();
    expect((seen as LogQuery | null)?.sort).toEqual(DEFAULT_SORT);
  });
});

describe('조회 실패 (STATE-02)', () => {
  it('read 실패는 **인라인 배너 + 다시 시도**다 — 토스트가 아니다', async () => {
    seedPermissions([]);
    const fetchPage = vi.fn(() => Promise.reject(new Error('요청을 처리하지 못했어요.')));
    renderShell(specOf(fetchPage));

    // 감사 로그가 '비어 있는 것'과 '못 불러온 것'은 다른 사건이다 — 사라지는 토스트로 알리면
    // 사라진 뒤 빈 화면만 남아 그 둘이 구분되지 않는다
    expect(await screen.findByText(/불러오지 못했어요/)).not.toBeNull();
    expect(screen.getByRole('button', { name: '다시 시도' })).not.toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
