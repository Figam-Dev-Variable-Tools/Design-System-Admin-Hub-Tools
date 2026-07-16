// ToastProvider — A11Y-01 persistent live region 검증 (apps/admin/src/shared/ui/**)
//
// 피드백이 토스트 전용이고 페이지는 인라인 state 를 안 가지므로, 라이브 영역이 **토스트보다 먼저**
// 지속적으로 존재해야 동적으로 삽입된 토스트가 NVDA/JAWS/VoiceOver 에서 신뢰성 있게 announce 된다.
// 동적으로 생성되는 Toast 자신의 aria-live 에만 의존하지 않는다 (A11Y-01).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ToastProvider, useToast } from './ToastProvider';

function SuccessTrigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.success('저장했습니다.')}>
      성공
    </button>
  );
}

describe('ToastProvider — A11Y-01 persistent live region', () => {
  it('ToastProvider: 토스트가 없어도 persistent live region(role=status · aria-live=polite)이 존재한다', () => {
    render(
      <ToastProvider>
        <div>본문</div>
      </ToastProvider>,
    );
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    // 비어 있어야 한다 — 미리 존재해야 이후 삽입되는 토스트가 announce 된다
    expect(region.textContent).toBe('');
  });

  it('ToastProvider: toast.success() 가 persistent 라이브 영역 안에 통지를 주입한다', async () => {
    render(
      <ToastProvider>
        <SuccessTrigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: '성공' }));
    expect(await screen.findByText('저장했습니다.')).not.toBeNull();
  });
});
