// 주문 취소 모달의 미저장 이탈 가드 (렌더)
//
// [무엇을 지키나] 취소 사유를 반쯤 쓰다 딤·Esc·×·닫기로 나가면 그 사유가 조용히 사라진다.
// 다른 입력 팝업 셋(useModalDirtyGuard)과 같은 관용구를 이 모달도 써야 한다는 것을 고정한다.
// 훅 자체의 판정은 useModalDirtyGuard.test.tsx 가 잡고, 여기서는 **그 훅이 이 화면에 배선됐는가**
// (onClose·닫기 버튼이 requestClose 를 지나고, discardDialog 가 렌더되는가)를 잡는다.
//
// 관용구는 claims/ClaimDetailPage.test.tsx 를 따른다(권한 시드 + 라우트 렌더).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { createWidgets } from '../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../shared/permissions/permission-store';
import { createMatrix } from '../../shared/permissions/resources';
import { ROLE_STATE_VERSION } from '../../shared/permissions/roles';
import { ToastProvider } from '../../shared/ui';
import OrderDetailPage from './OrderDetailPage';

/** pending 주문 — 취소 가능(취소되지 않음·미출고). 취소 트리거가 뜨는 픽스처다 */
const ORDER_ID = 'ORD-20260721-0001';
const ROUTE = '/orders/:id';

/** 취소 사유 입력칸 — 처리 메모와 구분되는 고유 placeholder */
const REASON_PLACEHOLDER = '고객 요청, 재고 소진 등 취소 사유를 남겨 주세요.';
/** 미저장 이탈 확인 다이얼로그의 제목(useModalDirtyGuard 의 기본값) */
const DISCARD_TITLE = '저장하지 않은 변경 사항이 있어요';

const WAIT = { timeout: 4000 } as const;

function seedFullPermissions(): void {
  usePermissionStore.setState({
    roleState: {
      version: ROLE_STATE_VERSION,
      roles: [
        {
          id: 'role-test',
          name: '테스트 역할',
          system: false,
          scope: 'all',
          permissions: createMatrix(true),
          widgets: createWidgets(true),
        },
      ],
      activeRoleId: 'role-test',
    },
    requestedRoleId: null,
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/orders/${ORDER_ID}`]}>
          <Routes>
            <Route path={ROUTE} element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 취소 모달을 연다 — 요약 줄의 '주문 취소' 트리거를 누른다 */
async function openCancelModal(): Promise<void> {
  const trigger = await screen.findByRole('button', { name: '주문 취소' }, WAIT);
  fireEvent.click(trigger);
  await screen.findByPlaceholderText(REASON_PLACEHOLDER, {}, WAIT);
}

/**
 * 모달 푸터의 '닫기' 를 누른다. DS Modal 은 헤더 × 도 aria-label="닫기" 라 이름이 겹치므로,
 * DOM 순서상 뒤에 오는 푸터 버튼(마지막 매치)을 고른다 — 내가 다시 배선한 경로가 그쪽이다.
 */
function clickFooterClose(): void {
  const closers = screen.getAllByRole('button', { name: '닫기' });
  const footer = closers[closers.length - 1];
  if (footer === undefined) throw new Error("'닫기' 버튼을 찾지 못했어요.");
  fireEvent.click(footer);
}

describe('주문 취소 모달 — 미저장 이탈 가드', () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedFullPermissions();
  });

  it('사유를 쓰지 않았으면 닫기가 확인 없이 곧바로 닫는다', async () => {
    renderPage();
    await openCancelModal();

    clickFooterClose();

    // 모달이 닫히고(사유칸이 사라지고), 확인 다이얼로그는 뜨지 않는다
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(REASON_PLACEHOLDER)).toBeNull();
    });
    expect(screen.queryByText(DISCARD_TITLE)).toBeNull();
  });

  it('사유를 쓴 뒤 닫으면 확인 다이얼로그가 서서 실수 이탈을 막는다', async () => {
    renderPage();
    await openCancelModal();

    fireEvent.change(screen.getByPlaceholderText(REASON_PLACEHOLDER), {
      target: { value: '고객이 다른 색상으로 재주문' },
    });
    clickFooterClose();

    // 미저장 변경이 있으므로 곧바로 닫지 않고 확인을 세운다 (findByText 는 없으면 throw 한다)
    await screen.findByText(DISCARD_TITLE, {}, WAIT);
    // 아직 모달을 떠나지 않았다 — 사유칸이 남아 있다
    expect(screen.queryByPlaceholderText(REASON_PLACEHOLDER)).not.toBeNull();
  });
});
