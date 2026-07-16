// 모달 미저장 이탈 가드 (FEEDBACK-06)
//
// 감사 시점에 폼을 담은 모달 8개 **전부**가 dirty 를 추적조차 하지 않았다 — 빗나간 딤 클릭이나
// 반사적 Esc 하나가 반쯤 채운 폼을 조용히 지웠다. 이 계약을 여기서 못 박는다.
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from './ToastProvider';
import { useModalDirtyGuard } from './useModalDirtyGuard';

/**
 * DS Modal 의 4경로를 흉내 낸다: Esc·딤·× 는 모두 onClose 한 곳으로 모이므로 여기서는 그
 * 퍼널(requestClose)과 취소 버튼이 **같은 가드**를 지나는지만 본다.
 */
function Harness({ onClose }: { readonly onClose: () => void }) {
  const [text, setText] = useState('');
  const { requestClose, discardDialog } = useModalDirtyGuard(text !== '', onClose);

  return (
    <ToastProvider>
      <input aria-label="이름" value={text} onChange={(event) => setText(event.target.value)} />
      {/* Modal 의 onClose(=Esc·딤·×)와 취소 버튼이 같은 requestClose 를 쓴다 */}
      <button type="button" onClick={requestClose}>
        모달 닫기 요청
      </button>
      {discardDialog}
    </ToastProvider>
  );
}

async function close(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '모달 닫기 요청' }));
}

describe('useModalDirtyGuard', () => {
  /** 손대지 않은 모달까지 물으면 확인 피로가 쌓여 사용자가 아무거나 누르게 된다 */
  it('입력이 없으면 즉시 닫는다 (프롬프트 없음)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await close(user);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('입력이 있으면 닫지 않고 확인을 세운다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('이름'), '홍');
    await close(user);

    // 아직 닫히지 않았다 — 이것이 이 훅의 존재 이유다
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('저장하지 않은 변경 사항이 있습니다')).not.toBeNull();
  });

  it('확인하면 닫는다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('이름'), '홍');
    await close(user);
    await user.click(screen.getByRole('button', { name: '나가기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /** '취소' 는 '이 모달에 머무른다' 는 뜻이다 — 입력이 살아 있어야 한다 */
  it('취소하면 모달에 머무르고 입력이 보존된다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('이름'), '홍길동');
    await close(user);
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>('이름').value).toBe('홍길동');
  });

  it('취소 후 다시 닫으려 하면 확인이 다시 뜬다 (가드가 소모되지 않는다)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('이름'), '홍');
    await close(user);
    await user.click(screen.getByRole('button', { name: '취소' }));
    await close(user);

    expect(screen.getByText('저장하지 않은 변경 사항이 있습니다')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  /** 저장이 끝나 pristine 이 되면(또는 저장 중이면) 가드는 비켜서야 한다 */
  it('dirty 가 풀리면 다시 즉시 닫힌다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    const input = screen.getByLabelText('이름');
    await user.type(input, '홍');
    await user.clear(input);
    await close(user);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
