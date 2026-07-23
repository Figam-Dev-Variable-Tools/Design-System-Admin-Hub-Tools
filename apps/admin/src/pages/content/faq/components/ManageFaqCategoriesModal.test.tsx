// FAQ 카테고리 관리 모달 — 미저장 이탈 가드 (FEEDBACK-06) · apps/admin/src/pages/content/faq/**
//
// [왜 이 파일이 생겼나] 폼을 담은 모달 9개 중 **이것만** dirty 가드가 없었다. 감사가 셈에서
// 빠뜨린 탓이다 — 목록·삭제가 주인공이라 '새 카테고리' 입력이 폼으로 보이지 않았다. 그래서
// 반쯤 친 카테고리 이름이 빗나간 딤 클릭·반사적 Esc 하나에 조용히 사라졌다.
// 다른 8개가 지키는 계약을 이 모달에서도 못 박는다.
//
// [진짜 Modal 로 태운다] Esc·딤·× 는 DS Modal 이 소유한 경로다. 가짜 껍데기로 세우면 그 경로가
// 사라져 가드가 실제로 배선됐는지 볼 수 없다 (MOTION-09 회귀가 정확히 그렇게 새어 나갔다).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../../shared/ui';
import { ManageFaqCategoriesModal } from './ManageFaqCategoriesModal';

vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>();
  return {
    ...actual,
    // 목록은 고정 — 이 파일의 관심사는 '닫기 제스처가 입력을 지키는가' 하나다
    useFaqCategoryUsageQuery: () => ({
      data: [{ id: 'account', label: '계정', faqCount: 0 }],
      isFetching: false,
    }),
  };
});

const ROUTE = '/content/faq';

function renderModal(onClose: () => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  /* 라우터 안에서 세운다 — 이 모달은 **자기 권한 판정**을 갖고(EXC-03), 그 판정의 리소스는
     지금 서 있는 라우트에서 파생된다(route-resource.ts). 기본 세션은 전권이라 컨트롤은 그대로다. */
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <Routes>
            <Route
              path={ROUTE}
              element={
                <ManageFaqCategoriesModal
                  onClose={onClose}
                  onCreated={vi.fn()}
                  onDeleted={vi.fn()}
                />
              }
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const DISCARD_TITLE = '저장하지 않은 변경 사항이 있어요';

/** 폼 모달 — 폐기 확인이 뜨면 다이얼로그가 2개가 되므로 제목으로 가른다 */
function formModal(): HTMLElement {
  const dialog = screen
    .getByRole('heading', { name: 'FAQ 카테고리 관리' })
    .closest('[role="dialog"]');
  if (!(dialog instanceof HTMLElement)) throw new Error('폼 모달을 찾지 못했다');
  return dialog;
}

function discardPrompt(): HTMLElement | null {
  const title = screen.queryByText(DISCARD_TITLE);
  return title === null ? null : title.closest('[role="dialog"]');
}

/**
 * 이 모달에는 '닫기' 라는 이름의 버튼이 **둘** 있다 — Modal 이 소유한 헤더 × (aria-label)와
 * 호출부가 만든 푸터 버튼. 둘은 서로 다른 경로라 반드시 갈라서 눌러야 한다.
 */
function headerCloseX(): HTMLElement {
  const x = formModal().querySelector('.tds-modal__close');
  if (!(x instanceof HTMLElement)) throw new Error('Modal 의 × 를 찾지 못했다');
  return x;
}

function footerCloseButton(): HTMLElement {
  const footer = formModal().querySelector('.tds-modal__footer');
  if (!(footer instanceof HTMLElement)) throw new Error('푸터를 찾지 못했다');
  return within(footer).getByRole('button', { name: '닫기' });
}

describe('ManageFaqCategoriesModal — 미저장 이탈 가드', () => {
  it('입력이 없으면 Esc 로 즉시 닫힌다 (프롬프트 없음)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    formModal().focus();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(discardPrompt()).toBeNull();
  });

  it('카테고리 이름을 치던 중 Esc 를 누르면 닫지 않고 확인을 세운다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.type(screen.getByLabelText('새 카테고리'), '결제');
    formModal().focus();
    await user.keyboard('{Escape}');

    // 닫히지 않았고 입력도 살아 있다 — 이 가드가 없던 시절엔 둘 다 사라졌다
    expect(onClose).not.toHaveBeenCalled();
    expect(discardPrompt()).not.toBeNull();
    expect(screen.getByLabelText<HTMLInputElement>('새 카테고리').value).toBe('결제');
  });

  it('× 와 푸터 닫기도 같은 가드를 지난다 (경로가 새지 않는다)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.type(screen.getByLabelText('새 카테고리'), '결제');

    // ① Modal 이 소유한 헤더 ×
    await user.click(headerCloseX());
    expect(discardPrompt()).not.toBeNull();
    await user.click(within(discardPrompt() as HTMLElement).getByRole('button', { name: '취소' }));
    await waitFor(() => {
      expect(discardPrompt()).toBeNull();
    });

    // ② 호출부가 만든 푸터 '닫기' — Modal 을 우회하는 경로라 따로 배선해야 한다
    await user.click(footerCloseButton());
    expect(discardPrompt()).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('폐기를 확인하면 닫는다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.type(screen.getByLabelText('새 카테고리'), '결제');
    formModal().focus();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: '나가기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
