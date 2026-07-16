// 1회 노출 모달 회귀 테스트 (시스템 설정 섹션)
//
// 이 모달이 지키는 계약을 DOM 수준에서 못 박는다:
//   ① 평문을 실제로 보여준다(발급 순간에만)
//   ② 복사 없이 닫으려 하면 붙잡는다 — 닫으면 다시 볼 수 없기 때문이다
//   ③ 복사한 뒤에는 바로 닫힌다
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../../shared/ui';
import { RevealKeyModal } from './RevealKeyModal';

const PLAINTEXT = 'sk_test_DUMMYABCDEF0123456789';

function renderModal(onClose: () => void) {
  return render(
    <ToastProvider>
      <RevealKeyModal keyName="정산 배치" plaintext={PLAINTEXT} onClose={onClose} />
    </ToastProvider>,
  );
}

/** 클립보드는 jsdom 에 없다 — 테스트가 쓰는 표면만 심는다 */
function stubClipboard(): { readonly writeText: ReturnType<typeof vi.fn> } {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
  return { writeText };
}

describe('RevealKeyModal — 1회 노출', () => {
  it('발급된 평문을 화면에 보여준다', () => {
    renderModal(vi.fn());
    expect(screen.queryByText(PLAINTEXT)).not.toBeNull();
  });

  it('다시 볼 수 없다는 사실을 경고로 알린다', () => {
    renderModal(vi.fn());
    expect(screen.queryByText(/다시 확인할 수 없습니다/)).not.toBeNull();
  });

  it('복사 버튼이 평문을 클립보드에 넣는다', async () => {
    const user = userEvent.setup();
    const { writeText } = stubClipboard();
    renderModal(vi.fn());

    await user.click(screen.getByRole('button', { name: '키 복사' }));

    expect(writeText).toHaveBeenCalledWith(PLAINTEXT);
  });
});

describe('RevealKeyModal — 닫기 가드', () => {
  it('복사하지 않고 닫으려 하면 붙잡는다 — 닫으면 키를 잃는다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.click(screen.getByRole('button', { name: '완료' }));

    // 확인 다이얼로그가 뜨고, 아직 닫히지 않았다
    expect(screen.queryByText(/아직 키를 복사하지 않았습니다/)).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('헤더 × 로 닫으려 해도 같은 가드가 붙잡는다 — 네 경로가 한 판정을 쓴다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    const dialog = screen.getByRole('dialog', { name: 'API Key가 발급되었습니다' });
    await user.click(within(dialog).getByRole('button', { name: '닫기' }));

    expect(screen.queryByText(/아직 키를 복사하지 않았습니다/)).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("붙잡힌 상태에서 '키 보기'를 고르면 모달이 그대로 남는다", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.click(screen.getByRole('button', { name: '완료' }));
    await user.click(screen.getByRole('button', { name: '키 보기' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(PLAINTEXT)).not.toBeNull();
  });

  it('확인하면 닫힌다 — 사용자가 잃을 것을 알고 고른 경우', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.click(screen.getByRole('button', { name: '완료' }));
    await user.click(screen.getByRole('button', { name: '복사하지 않고 닫기' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('복사한 뒤에는 붙잡지 않고 바로 닫는다', async () => {
    const user = userEvent.setup();
    stubClipboard();
    const onClose = vi.fn();
    renderModal(onClose);

    await user.click(screen.getByRole('button', { name: '키 복사' }));
    await user.click(screen.getByRole('button', { name: '완료' }));

    expect(onClose).toHaveBeenCalled();
  });
});
