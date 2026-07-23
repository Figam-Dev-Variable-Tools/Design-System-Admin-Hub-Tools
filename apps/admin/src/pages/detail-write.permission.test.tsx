// 상세 화면·팝업의 쓰기 게이팅 — 껍데기를 쓰지 않아 빠져 있던 자리들 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 목록은 CrudListShell 이, 폼 라우트는 FormPageShell/useCrudForm 이 게이팅을 물려준다. 그 둘
// **어느 쪽도 아닌 화면**이 남아 있었다: 자기 레이아웃으로 조립한 처리 상세(문의·1:1 문의)와,
// 부모의 판정만 믿던 팝업들이다.
//
//   · InquiryDetailPage / TicketDetailPage — 담당 배정·상태 전이·답변 작성이 한 update 로 나간다.
//     조회 권한만 가진 역할이 담당자를 바꾸고 고객답변을 남기고 문의를 **종결**(되돌릴 수 없다)까지
//     할 수 있었다.
//   · NewChatPage — 질문을 보내는 것이 곧 대화 생성이다. 입력줄에 판정이 하나도 없었다.
//   · ConversationsPage — 대화 삭제에 판정이 없었다.
//   · PasswordChangeModal / CarrierFormModal — 여는 버튼은 게이팅돼 있으나 **팝업 자신의 판정이
//     없었다.** 열려 있는 동안 다른 탭에서 강등되면 부모의 판정은 이미 지나간 과거다.
//
// [기본 세션이 전권이라 헛돌기 쉽다] 매번 활성 역할의 매트릭스를 직접 심고, 반대 방향(권한이
// 있으면 컨트롤이 있다 · 저장이 나간다)을 같은 파일에서 함께 단언한다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { createWidgets } from '../shared/permissions/feature-registry';
import { usePermissionStore } from '../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../shared/permissions/resources';
import type { PermissionAction } from '../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../shared/permissions/roles';
import { ToastProvider } from '../shared/ui';

const changePassword = vi.hoisted(() => vi.fn());
vi.mock('./members/data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./members/data-source')>()),
  changePassword,
}));

const { default: InquiryDetailPage } = await import('./sales/inquiries/InquiryDetailPage');
const { default: TicketDetailPage } = await import('./support/tickets/TicketDetailPage');
const { default: ConversationsPage } = await import('./ai/ConversationsPage');
const { default: NewChatPage } = await import('./ai/NewChatPage');
const { PasswordChangeModal } = await import('./members/components/PasswordChangeModal');
const { CarrierFormModal } = await import('./products/shipping/components/CarrierFormModal');

/** 활성 역할의 권한 — 전 권한 ON 에서 시작해 **그 라우트의** 지정한 액션만 끈다 */
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

function renderAt(path: string, routePath: string, element: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  changePassword.mockReset();
  changePassword.mockResolvedValue(undefined);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

/* ── 처리 상세 두 화면 ───────────────────────────────────────────────────── */

describe('InquiryDetailPage — 처리 저장은 update 를 탄다 (EXC-03)', () => {
  const ROUTE = '/sales/inquiries';

  it('update 가 없으면 담당·상태·답변 컨트롤과 저장 버튼이 사라지고 값만 남는다', async () => {
    seedPermissions(ROUTE, ['update']);
    renderAt(`${ROUTE}/inq-1`, `${ROUTE}/:id`, <InquiryDetailPage />);

    // 문의 자체는 읽을 수 있다 — 막는 것은 그 위에 얹힌 처리 액션뿐이다
    await waitFor(() => {
      expect(screen.getByText('문의번호')).not.toBeNull();
    });

    expect(screen.queryByRole('button', { name: '처리 저장' })).toBeNull();
    expect(screen.queryByLabelText(/담당 배정/)).toBeNull();
    expect(screen.queryByRole('button', { name: '고객답변' })).toBeNull();
    // 그러나 담당자·상태는 조회 사실이라 사라지지 않는다
    expect(screen.getByText('처리 상태')).not.toBeNull();
  });

  it('update 가 있으면 처리 컨트롤이 전부 보인다 — 위 단언이 헛돌지 않는다', async () => {
    seedPermissions(ROUTE, []);
    renderAt(`${ROUTE}/inq-1`, `${ROUTE}/:id`, <InquiryDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '처리 저장' })).not.toBeNull();
    });
    expect(screen.getByRole('button', { name: '고객답변' })).not.toBeNull();
  });
});

describe('TicketDetailPage — 처리 저장은 update 를 탄다 (종결은 되돌릴 수 없다)', () => {
  const ROUTE = '/support/tickets';

  it('update 가 없으면 담당·상태·답변 컨트롤과 저장 버튼이 사라진다', async () => {
    seedPermissions(ROUTE, ['update']);
    renderAt(`${ROUTE}/tkt-1`, `${ROUTE}/:id`, <TicketDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('문의번호')).not.toBeNull();
    });

    expect(screen.queryByRole('button', { name: '처리 저장' })).toBeNull();
    expect(screen.queryByLabelText(/담당 배정/)).toBeNull();
    expect(screen.queryByRole('button', { name: '내부메모' })).toBeNull();
    expect(screen.getByText('처리 상태')).not.toBeNull();
  });

  it('update 가 있으면 처리 컨트롤이 전부 보인다 — 반대 방향', async () => {
    seedPermissions(ROUTE, []);
    renderAt(`${ROUTE}/tkt-1`, `${ROUTE}/:id`, <TicketDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '처리 저장' })).not.toBeNull();
    });
    expect(screen.getByRole('button', { name: '내부메모' })).not.toBeNull();
  });
});

/* ── AI 두 화면 ──────────────────────────────────────────────────────────── */

describe('AI — 질문 전송은 create, 대화 삭제는 remove 를 탄다', () => {
  it('create 가 없으면 입력줄이 사라지고 사유가 그 자리에 선다', async () => {
    seedPermissions('/ai/chat', ['create']);
    renderAt('/ai/chat', '/ai/chat', <NewChatPage />);

    await waitFor(() => {
      expect(screen.getByText(/등록 권한이 없어요/)).not.toBeNull();
    });
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('create 가 있으면 입력줄이 보인다 — 위 단언이 헛돌지 않는다', async () => {
    seedPermissions('/ai/chat', []);
    renderAt('/ai/chat', '/ai/chat', <NewChatPage />);

    await waitFor(() => {
      expect(screen.queryByRole('combobox')).not.toBeNull();
    });
    expect(screen.queryByText(/등록 권한이 없어요/)).toBeNull();
  });

  it('remove 가 없으면 대화 목록의 삭제 버튼이 존재하지 않는다', async () => {
    seedPermissions('/ai/conversations', ['remove']);
    renderAt('/ai/conversations', '/ai/conversations', <ConversationsPage />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
    });
    // 새 채팅으로 가는 길은 그대로다 — remove 만 끈 것이지 화면을 닫은 것이 아니다
    expect(screen.getAllByRole('button', { name: /새 채팅/ }).length).toBeGreaterThan(0);
  });
});

/* ── 부모만 믿던 팝업 둘 ─────────────────────────────────────────────────── */

describe('PasswordChangeModal — 팝업 자신이 update 를 묻는다', () => {
  const ROUTE = '/users/members';

  function renderModal() {
    renderAt(
      `${ROUTE}/m1`,
      `${ROUTE}/:id`,
      <PasswordChangeModal memberId="m1" onClose={vi.fn()} onSaved={vi.fn()} />,
    );
  }

  it('update 가 없으면 저장 버튼이 사라진다 (부모가 버튼을 없앤 것과 같은 술어)', () => {
    seedPermissions(ROUTE, ['update']);
    renderModal();

    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    // 팝업은 열려 있다 — 닫을 길은 남는다
    expect(screen.getByRole('button', { name: '취소' })).not.toBeNull();
  });

  it('update 가 있으면 저장 버튼이 보인다 — 반대 방향', () => {
    seedPermissions(ROUTE, []);
    renderModal();

    expect(screen.getByRole('button', { name: '저장' })).not.toBeNull();
  });

  /**
   * 버튼이 사라졌으니 이 경로는 화면에서 닿을 수 없다 — 그래서 **폼을 채우고 submit 을 직접
   * 발화시킨다.** 다른 탭에서 방금 강등된 세션의 잔여 Enter 가 정확히 이 모양이고,
   * 버튼만 감추고 저장 경로가 열려 있으면 막은 것이 아니다.
   */
  it('update 가 없으면 제출해도 변경 요청이 나가지 않고 사유가 남는다', async () => {
    seedPermissions(ROUTE, ['update']);
    renderModal();

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'abcd1234' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'abcd1234' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByText(/수정 권한이 없어요/)).not.toBeNull();
    });
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('update 가 있으면 같은 제출이 변경 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions(ROUTE, []);
    renderModal();

    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'abcd1234' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'abcd1234' } });
    fireEvent.submit(screen.getByRole('dialog').querySelector('form') as HTMLFormElement);

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalled();
    });
  });
});

describe('CarrierFormModal — 팝업 자신이 create/update 를 묻는다', () => {
  const ROUTE = '/products/shipping';

  it('create 가 없으면 추가 팝업의 저장 버튼이 사라진다', () => {
    seedPermissions(ROUTE, ['create']);
    renderAt(ROUTE, ROUTE, <CarrierFormModal editing={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.queryByRole('button', { name: '추가' })).toBeNull();
    expect(screen.getByRole('button', { name: '취소' })).not.toBeNull();
  });

  it('create 가 있으면 저장 버튼이 보인다 — 반대 방향', () => {
    seedPermissions(ROUTE, []);
    renderAt(ROUTE, ROUTE, <CarrierFormModal editing={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByRole('button', { name: '추가' })).not.toBeNull();
  });
});
