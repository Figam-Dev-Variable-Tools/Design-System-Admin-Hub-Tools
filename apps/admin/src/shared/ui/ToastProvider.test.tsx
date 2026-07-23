// ToastProvider — A11Y-01 persistent live regions 검증 (apps/admin/src/shared/ui/**)
//
// 피드백이 토스트 전용이고 페이지는 인라인 state 를 안 가지므로, 라이브 영역이 **토스트보다 먼저**
// 지속적으로 존재해야 동적으로 삽입된 토스트가 NVDA/JAWS/VoiceOver 에서 신뢰성 있게 announce 된다.
// Toast(1.1.0)는 role/aria-live 를 갖지 않는다 — 통지는 전적으로 이 두 영역이 소유한다.
//
//   polite    role=status · aria-live=polite   ← success · cancelled · info
//   assertive aria-live=assertive (role 없음)  ← error
//
// assertive 영역에 role="alert" 를 두지 않는 이유: role=alert 는 ARIA 상 aria-live=assertive 와
// 동치인데, 이 영역은 **항상 존재**하므로 role 을 붙이면 앱 전역의 getByRole('alert') 가 늘 이 빈
// 영역을 집어 인라인 Alert 배너와 구분되지 않는다. 동치인 aria-live 로 영역을 만든다.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ToastProvider, useToast } from './ToastProvider';

/** 큐에 토스트를 넣는 조작부 — useToast 는 Provider 안에서만 쓸 수 있다 */
function Triggers() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.success('저장했어요.')}>
        성공
      </button>
      <button type="button" onClick={() => toast.error('저장하지 못했어요.')}>
        실패
      </button>
    </>
  );
}

/** aria-live 값으로 라이브 영역을 집는다 (assertive 영역은 role 이 없으므로 role 로 못 집는다) */
function regionOf(container: HTMLElement, live: 'polite' | 'assertive'): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[aria-live="${live}"]`);
  if (el === null) throw new Error(`aria-live="${live}" 라이브 영역이 없어요`);
  return el;
}

describe('ToastProvider — A11Y-01 persistent live regions', () => {
  it('ToastProvider: 토스트가 없어도 polite/assertive 라이브 영역 2개가 이미 존재한다', () => {
    const { container } = render(
      <ToastProvider>
        <div>본문</div>
      </ToastProvider>,
    );

    const polite = regionOf(container, 'polite');
    const assertive = regionOf(container, 'assertive');

    // 비어 있어야 한다 — 미리 존재해야 이후 삽입되는 토스트가 announce 된다
    expect(polite.textContent).toBe('');
    expect(assertive.textContent).toBe('');
    // polite 영역은 role=status 로도 집힌다
    expect(screen.getByRole('status')).toBe(polite);
  });

  it('ToastProvider: 항상 존재하는 라이브 영역이 getByRole("alert") 를 오염시키지 않는다', () => {
    render(
      <ToastProvider>
        <div>본문</div>
      </ToastProvider>,
    );
    // 인라인 Alert 배너만이 alert 여야 한다 — 빈 assertive 영역이 배너 단언을 깨뜨리면 안 된다
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ToastProvider: toast.success() 는 polite 영역에 주입된다 (assertive 는 비어 있다)', async () => {
    const { container } = render(
      <ToastProvider>
        <Triggers />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '성공' }));

    expect(regionOf(container, 'polite').textContent).toContain('저장했어요.');
    expect(regionOf(container, 'assertive').textContent).toBe('');
  });

  it('ToastProvider: toast.error() 는 assertive 영역에 주입된다 (polite 는 비어 있다)', async () => {
    const { container } = render(
      <ToastProvider>
        <Triggers />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '실패' }));

    expect(regionOf(container, 'assertive').textContent).toContain('저장하지 못했어요.');
    expect(regionOf(container, 'polite').textContent).toBe('');
  });

  it('ToastProvider: 성공/실패가 함께 떠도 각자 제 영역으로 간다', async () => {
    const { container } = render(
      <ToastProvider>
        <Triggers />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '성공' }));
    await userEvent.click(screen.getByRole('button', { name: '실패' }));

    const polite = regionOf(container, 'polite');
    const assertive = regionOf(container, 'assertive');
    expect(polite.textContent).toContain('저장했어요.');
    expect(polite.textContent).not.toContain('저장하지 못했어요.');
    expect(assertive.textContent).toContain('저장하지 못했어요.');
    expect(assertive.textContent).not.toContain('저장했어요.');
  });
});
