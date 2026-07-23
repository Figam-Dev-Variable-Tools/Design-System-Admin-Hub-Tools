// 모달 미저장 이탈 가드 (FEEDBACK-06)
//
// 감사 시점에 폼을 담은 모달 8개 **전부**가 dirty 를 추적조차 하지 않았다 — 빗나간 딤 클릭이나
// 반사적 Esc 하나가 반쯤 채운 폼을 조용히 지웠다. 이 계약을 여기서 못 박는다.
//
// [왜 진짜 Modal 을 렌더하는가 — 이 하네스가 놓쳤던 회귀 (MOTION-09)]
// 예전 하네스는 Modal 을 `<button>` 하나로 **가짜로** 세우고 requestClose 만 눌렀다. 그래서
// "가드가 소모되지 않는다" 를 단언하면서도 **가드 바깥(Modal 안)의 latch 를 볼 수 없었다**:
// MOTION-01 이 넣은 Modal 의 `closing`/`closingRef` 는 한 번 서면 리셋되지 않았고, dirty 가드가
// 닫기를 거부하면 모달이 `opacity:0` + `pointer-events:none` 인 채 영구히 갇혔다. 가짜 버튼에는
// 그 상태가 없으니 테스트는 초록이었고 회귀는 그대로 출하됐다.
// 이제 **진짜 Modal 로 렌더하고 진짜 제스처(Esc·딤·×)로 닫는다** — 가드와 Modal 의 상호작용까지 덮는다.
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from '@tds/ui';

import { ToastProvider } from './ToastProvider';
import { useModalDirtyGuard } from './useModalDirtyGuard';

const DISCARD_TITLE = '저장하지 않은 변경 사항이 있어요';

/**
 * 실제 호출부(CategoryFormModal 등)와 같은 배선: requestClose 를 Modal.onClose(=Esc·딤·×)와
 * 푸터 '취소' 버튼에 **둘 다** 넘기고, discardDialog 는 모달 **밖**에 둔다.
 */
function Harness({ onClose }: { readonly onClose: () => void }) {
  const [text, setText] = useState('');
  const { requestClose, discardDialog } = useModalDirtyGuard(text !== '', onClose);

  return (
    <ToastProvider>
      <Modal
        title="유형 추가"
        onClose={requestClose}
        footer={
          <button type="button" onClick={requestClose}>
            닫기(푸터)
          </button>
        }
      >
        <input aria-label="이름" value={text} onChange={(event) => setText(event.target.value)} />
      </Modal>
      {discardDialog}
    </ToastProvider>
  );
}

/** 폼 모달 — 폐기 확인이 떠 있으면 다이얼로그가 2개가 되므로 제목으로 가른다 */
function formModal(): HTMLElement {
  const dialog = screen.getByRole('heading', { name: '유형 추가' }).closest('[role="dialog"]');
  if (!(dialog instanceof HTMLElement)) throw new Error('폼 모달을 찾지 못했다');
  return dialog;
}

/** 폐기 확인 다이얼로그 — 안 떠 있으면 null */
function discardPrompt(): HTMLElement | null {
  const title = screen.queryByText(DISCARD_TITLE);
  return title === null ? null : title.closest('[role="dialog"]');
}

/** Esc — Modal 이 소유한 닫기 경로. 다이얼로그 요소의 네이티브 리스너가 받는다 */
async function pressEscape(user: ReturnType<typeof userEvent.setup>) {
  formModal().focus();
  await user.keyboard('{Escape}');
}

/** 기본 닫기 제스처 — 푸터가 아니라 **Modal 이 소유한** × 를 누른다 */
async function close(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(formModal()).getByRole('button', { name: '닫기' }));
}

/** 폐기 확인에서 '머무르기'(취소) — 폼 모달 푸터의 버튼과 섞이지 않게 다이얼로그 안에서 찾는다 */
async function keepEditing(user: ReturnType<typeof userEvent.setup>) {
  const prompt = discardPrompt();
  if (prompt === null) throw new Error('폐기 확인이 떠 있지 않다');
  await user.click(within(prompt).getByRole('button', { name: '취소' }));
}

describe('useModalDirtyGuard', () => {
  /** 손대지 않은 모달까지 물으면 확인 피로가 쌓여 사용자가 아무거나 누르게 된다 */
  it('입력이 없으면 즉시 닫는다 (프롬프트 없음)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await close(user);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(discardPrompt()).toBeNull();
  });

  it('입력이 있으면 닫지 않고 확인을 세운다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('이름'), '홍');
    await close(user);

    // 아직 닫히지 않았다 — 이것이 이 훅의 존재 이유다
    expect(onClose).not.toHaveBeenCalled();
    expect(discardPrompt()).not.toBeNull();
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
    await keepEditing(user);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>('이름').value).toBe('홍길동');
  });

  it('취소 후 다시 닫으려 하면 확인이 다시 뜬다 (가드가 소모되지 않는다)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('이름'), '홍');
    await close(user);
    await keepEditing(user);
    await close(user);

    expect(discardPrompt()).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  /**
   * [회귀 — MOTION-09] 닫기가 **거부되면 Modal 의 latch 가 풀려야 한다.**
   *
   * MOTION-01 이 넣은 `closingRef` 는 한 번 서면 리셋되지 않았다. dirty 가드가 닫기를 거부해도
   * Modal 은 '퇴장 중' 인 채로 남았고, 그 뒤 Esc·딤·× 는 전부 조기 반환되어 **영구히 못 닫혔다**
   * (실제 앱에서는 opacity:0 + pointer-events:none 이라 화면에서 사라진 채 포커스만 갇혔다).
   * 취소 버튼은 Modal 을 우회하므로 이 축은 **Modal 소유 경로(Esc·×)** 로만 재현된다.
   */
  it('회귀: 거부된 뒤에도 Modal 소유 경로(Esc)가 계속 살아 있다', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    await user.type(screen.getByLabelText('이름'), '홍');

    // ① Esc → 가드가 거부(폐기 확인) → 머무르기
    await pressEscape(user);
    expect(discardPrompt()).not.toBeNull();
    await keepEditing(user);

    // ② 거부됐으니 Modal 은 '퇴장 중' 에서 빠져나와 있어야 한다
    expect(formModal().closest('.tds-modal__overlay')?.className).not.toContain(
      'tds-modal__overlay--closing',
    );

    // ③ 다시 Esc → 또 물어야 한다. latch 가 남아 있으면 여기서 아무 일도 일어나지 않는다
    await pressEscape(user);
    expect(discardPrompt()).not.toBeNull();

    // ④ 이번엔 나가기 → 실제로 닫힌다 (거부가 닫기 능력을 영구히 태우지 않았다)
    await user.click(screen.getByRole('button', { name: '나가기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
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
