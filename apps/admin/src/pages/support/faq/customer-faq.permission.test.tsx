// 고객노출 FAQ 큐레이션의 쓰기 게이팅 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면의 액션은 **전부 update 다** — 고객센터 노출 · BEST 고정 · 표시 순서. 등록·삭제는
// 콘텐츠 관리 소관이라 여기에 없다. 그런데 손으로 만든 표라 게이팅을 하나도 받지 못했고,
// 조회 권한만 가진 역할이 고객센터에 실제로 노출되는 FAQ 를 켜고 끌 수 있었다.
//
// [낙관적 반영이라 더 위험했다] 이 화면은 응답을 기다리지 않고 먼저 화면을 바꾼다. 컨트롤만
// 열려 있고 저장이 막히면 '화면은 바뀌었는데 서버는 그대로' 인 유령 저장이 된다 — 그래서
// 컨트롤과 저장을 **한 값**으로 묶는 것이 특히 중요하다.
//
// [바깥 가드를 되돌려 확인한다] 컨트롤을 없앤 뒤 '저장이 안 나간다' 를 단언하면 바깥 가드가
// 막아서 통과하는 헛도는 검사가 된다. 그래서 표를 스텁으로 갈아끼워 컨트롤이 살아 있는 상태를
// 만들고 그때도 거절되는지를 본다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from '../../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import type { CustomerFaq } from './types';

const ROUTE = '/support/faq';

const FAQ: CustomerFaq = {
  id: 'FAQ-001',
  question: '배송은 얼마나 걸리나요?',
  categoryId: 'delivery',
  categoryLabel: '배송',
  visible: true,
  pinned: false,
  order: 1,
};

const fetchCustomerFaqs = vi.hoisted(() => vi.fn());
const setCustomerFaqVisible = vi.hoisted(() => vi.fn());
const setCustomerFaqPinned = vi.hoisted(() => vi.fn());
const reorderCustomerFaqs = vi.hoisted(() => vi.fn());

vi.mock('./data-source', () => ({
  fetchCustomerFaqs,
  setCustomerFaqVisible,
  setCustomerFaqPinned,
  reorderCustomerFaqs,
}));

/** 스텁 표 — 화면이 넘긴 세 콜백을 권한과 무관하게 눌러 볼 수 있게 연다 */
vi.mock('./components/CustomerFaqTable', () => ({
  CustomerFaqTable: ({
    onToggleVisible,
    onTogglePinned,
    onReorder,
  }: {
    readonly onToggleVisible: (faq: CustomerFaq, next: boolean) => void;
    readonly onTogglePinned: (faq: CustomerFaq, next: boolean) => void;
    readonly onReorder: (orderedIds: readonly string[]) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() => {
          onToggleVisible(FAQ, false);
        }}
      >
        스텁 노출 토글
      </button>
      <button
        type="button"
        onClick={() => {
          onTogglePinned(FAQ, true);
        }}
      >
        스텁 BEST 토글
      </button>
      <button
        type="button"
        onClick={() => {
          onReorder([FAQ.id]);
        }}
      >
        스텁 순서 변경
      </button>
    </>
  ),
}));

const { default: CustomerFaqPage } = await import('./CustomerFaqPage');

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

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <Routes>
            <Route path={ROUTE} element={<CustomerFaqPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchCustomerFaqs.mockReset();
  fetchCustomerFaqs.mockResolvedValue([FAQ]);
  setCustomerFaqVisible.mockReset();
  setCustomerFaqVisible.mockResolvedValue(undefined);
  setCustomerFaqPinned.mockReset();
  setCustomerFaqPinned.mockResolvedValue(undefined);
  reorderCustomerFaqs.mockReset();
  reorderCustomerFaqs.mockResolvedValue(undefined);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('CustomerFaqPage — 세 큐레이션 액션은 모두 update 를 탄다 (EXC-03)', () => {
  it('update 가 없으면 노출 토글이 저장 요청을 내지 않고 사유를 말한다', async () => {
    seedPermissions(false);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '스텁 노출 토글' }));

    await waitFor(() => {
      expect(screen.getByText(/수정 권한이 없어요/)).not.toBeNull();
    });
    expect(setCustomerFaqVisible).not.toHaveBeenCalled();
  });

  it('update 가 없으면 BEST 고정도 나가지 않는다', async () => {
    seedPermissions(false);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '스텁 BEST 토글' }));

    await waitFor(() => {
      expect(screen.getByText(/수정 권한이 없어요/)).not.toBeNull();
    });
    expect(setCustomerFaqPinned).not.toHaveBeenCalled();
  });

  it('update 가 없으면 순서 변경도 나가지 않는다 — 낙관적 반영이 서버와 갈라지지 않는다', async () => {
    seedPermissions(false);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '스텁 순서 변경' }));

    await waitFor(() => {
      expect(screen.getByText(/수정 권한이 없어요/)).not.toBeNull();
    });
    expect(reorderCustomerFaqs).not.toHaveBeenCalled();
  });

  /* 반대 방향 — 세 액션을 한 렌더에서 연달아 누르지 않는다: 두 토글은 같은 togglingIds 를
     공유해 첫 요청이 끝나기 전 두 번째가 스스로 멈춘다(권한과 무관한 중복 방어다). */
  it('update 가 있으면 노출 토글이 저장 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions(true);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '스텁 노출 토글' }));

    await waitFor(() => {
      expect(setCustomerFaqVisible).toHaveBeenCalledWith(FAQ.id, false);
    });
  });

  it('update 가 있으면 BEST 고정이 저장 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions(true);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '스텁 BEST 토글' }));

    await waitFor(() => {
      expect(setCustomerFaqPinned).toHaveBeenCalledWith(FAQ.id, true);
    });
  });

  it('update 가 있으면 순서 변경이 저장 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions(true);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '스텁 순서 변경' }));

    await waitFor(() => {
      expect(reorderCustomerFaqs).toHaveBeenCalled();
    });
  });
});
