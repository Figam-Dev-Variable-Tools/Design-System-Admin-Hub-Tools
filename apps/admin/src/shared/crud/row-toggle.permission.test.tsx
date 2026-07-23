// 목록의 인라인 토글 — 버튼을 잠그는 술어와 저장을 거절하는 술어가 같은가 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// CrudListShell 은 행 액션(연필·휴지통)과 일괄 삭제를 스스로 게이팅한다. 그런데 **인라인 토글**은
// 화면이 `CrudColumn.render` 로 넘기는 ReactNode 라 껍데기가 붙잡을 손잡이가 없었다 — 등록 CTA 가
// 빠져나가던 것과 같은 구멍이다. 그래서 노출/판매 토글 7종(리뷰 노출·포트폴리오 게시·성공사례
// 게시·상품 전시·쿠폰 발급·거래처 거래·자료 노출)이 **조회 권한만으로 눌리고 저장까지 됐다.**
//
// [왜 여기서 단언하는가 — 화면 7곳이 아니라]
// 판정을 이제 훅(useCrudRowUpdate)이 갖고, 표현을 한 컴포넌트(RowToggle)가 갖는다. 두 곳이 **한
// 값**을 읽으므로 갈라질 수 없고, 그 사실은 화면 하나가 아니라 이 이음매에서 지켜야 한다.
// 화면별 단언을 7벌 복사하면 새 목록이 8번째로 추가될 때 아무도 지키지 않는다.
//
// [이 테스트가 헛돌지 않는 이유]
// 기본 세션은 전권이라(운영자 역할) '권한 축' 단언은 그냥 통과하기 쉽다. 그래서 매번 **읽기
// 전용 역할을 적용 중으로 세우고**, 반대 방향(권한이 있으면 저장이 나간다)을 같은 파일에서 함께
// 단언한다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from '../permissions/feature-registry';
import { usePermissionStore } from '../permissions/permission-store';
import { createMatrix, withResourceAction } from '../permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../permissions/roles';
import { ToastProvider } from '../ui';
import { RowToggle } from './RowToggle';
import { useCrudRowUpdate } from './useCrudRowUpdate';
import type { CrudAdapter } from './crud';

/** 이 훅이 서 있는 라우트 — 여기서 권한 리소스가 파생된다 (route-resource.ts) */
const ROUTE = '/products/reviews';
const RESOURCE = 'row-toggle-test';

interface Row {
  readonly id: string;
  readonly visible: boolean;
}

interface RowInput {
  readonly visible: boolean;
}

const ROW: Row = { id: 'r1', visible: false };

/** 어댑터는 진짜 계약을 그대로 만족한다 — 이 테스트가 보려는 것은 update 가 **불렸는가**다 */
const update = vi.fn<(id: string, input: RowInput) => Promise<void>>();

const adapter: CrudAdapter<Row, RowInput> = {
  fetchAll: () => Promise.resolve([ROW]),
  fetchOne: () => Promise.resolve(ROW),
  create: () => Promise.resolve(),
  update: (id, input) => update(id, input),
  remove: () => Promise.resolve(),
};

/** 훅과 컴포넌트를 실제로 이어 붙인 최소 화면 — 목록 7곳이 하는 것과 같은 배선이다 */
function Harness() {
  const rowUpdate = useCrudRowUpdate<Row, RowInput>(RESOURCE, adapter);
  return (
    <RowToggle
      checked={ROW.visible}
      busy={rowUpdate.pendingId === ROW.id}
      canUpdate={rowUpdate.canUpdate}
      label="리뷰 노출 여부"
      onLabel="노출"
      offLabel="숨김"
      onChange={(next) => rowUpdate.run(ROW.id, { visible: next })}
    />
  );
}

/** 활성 역할의 권한 — 전 권한 ON 에서 시작해 이 라우트의 지정한 액션만 끈다 */
function seedPermissions(updateOn: boolean): void {
  const permissions = updateOn
    ? createMatrix(true)
    : withResourceAction(createMatrix(true), `page:${ROUTE}`, 'update', false);

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

function renderHarness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <Routes>
            <Route path={ROUTE} element={<Harness />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  update.mockReset();
  update.mockResolvedValue(undefined);
});

afterEach(() => {
  // 스토어는 모듈 싱글턴이라 다음 파일로 역할이 새지 않게 되돌린다
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('인라인 토글은 수정 권한을 탄다 (EXC-03)', () => {
  it('update 권한이 없으면 스위치가 존재하지 않고 값만 남는다', () => {
    seedPermissions(false);
    renderHarness();

    // 컨트롤은 부재다 — disabled 스위치로 남기지 않는다 (B2 명세 §9.3)
    expect(screen.queryByRole('switch')).toBeNull();
    // 그러나 '지금 숨김이다' 라는 **조회 사실**은 사라지지 않는다
    expect(screen.getByText('숨김')).not.toBeNull();
  });

  it('update 권한이 있으면 스위치가 보인다 — 위 단언이 헛돌지 않는다는 증거', () => {
    seedPermissions(true);
    renderHarness();

    expect(screen.queryByRole('switch', { name: '리뷰 노출 여부' })).not.toBeNull();
  });

  /**
   * 컨트롤이 사라졌으니 이 경로는 화면에서 닿을 수 없다 — 그래서 **직접 부른다**.
   * 다른 탭에서 방금 강등된 세션의 잔여 클릭이 정확히 이 모양이고, 버튼만 감추고 저장 경로가
   * 열려 있으면 막은 것이 아니다.
   */
  it('권한이 없으면 run() 이 저장 요청을 내지 않는다 (사유를 토스트로 말한다)', async () => {
    seedPermissions(false);

    function DirectCall() {
      const rowUpdate = useCrudRowUpdate<Row, RowInput>(RESOURCE, adapter);
      return (
        <button type="button" onClick={() => rowUpdate.run(ROW.id, { visible: true })}>
          직접 호출
        </button>
      );
    }

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[ROUTE]}>
            <Routes>
              <Route path={ROUTE} element={<DirectCall />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '직접 호출' }));

    // 거절은 침묵이 아니다 — 왜 안 되는지가 화면에 남는다
    await waitFor(() => {
      expect(screen.getByText(/수정 권한이 없어요/)).not.toBeNull();
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('권한이 있으면 같은 호출이 저장 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions(true);
    renderHarness();

    fireEvent.click(screen.getByRole('switch', { name: '리뷰 노출 여부' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(ROW.id, { visible: true });
    });
  });
});
