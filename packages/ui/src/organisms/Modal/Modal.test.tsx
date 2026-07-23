// Modal — 계약 검증 테스트 (contracts/Modal.contract.json@1.1.0)
//
//   a11y      role="dialog" + aria-modal + aria-labelledby(제목)
//   focus     열릴 때 첫 포커스 가능 요소(또는 initialFocusRef)로 이동, 닫히면 직전 요소로 복귀
//   keyboard  Esc 로 닫힘 · Tab/Shift+Tab 포커스 트랩 순환
//   lifecycle 열려 있는 동안 body 스크롤 잠금, 닫히면 복원
//   onSubmit  주면 본문/푸터를 <form> 으로 감싸 submit 이 동작한다
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

const Footer = (
  <>
    <button type="button">취소</button>
    <button type="button">확인</button>
  </>
);

/**
 * 배경 스크롤 잠금의 **관측 지점**.
 *
 * 잠금은 이제 Radix(react-remove-scroll)가 건다. 그것은 body 인라인 스타일을 만지지 않고
 * `<style>` 주입 + `data-scroll-locked` **카운터**로 동작한다 — 그래서 예전처럼
 * `document.body.style.overflow` 를 보면 잠겨 있어도 `''` 로 보인다(관측 지점이 옮겨간 것이지
 * 잠금이 사라진 게 아니다. 실브라우저 검증은 e2e/quality-bar/FS-000-motion.spec.ts).
 *
 * 카운터라는 점이 중요하다: 우리가 openModalCount 로 직접 세던 '중첩 시 마지막 하나가 닫힐 때만
 * 푼다' 는 성질을 라이브러리가 같은 방식으로 보장한다 — 아래 중첩 회귀 두 건이 그것을 고정한다.
 */
const scrollLockCount = (): string | null => document.body.getAttribute('data-scroll-locked');

/**
 * 폼 모달 위에 확인 다이얼로그가 겹치는 실제 구조 (LogoFormModal 의 `{discardDialog}` 와 같다).
 * 확인 다이얼로그는 폼 모달 **밖**에 둔다 — 안에 두면 폼 모달의 포커스 트랩이 그것을 가둔다.
 */
function Nested({ confirming }: { readonly confirming: boolean }) {
  return (
    <>
      <Modal title="폼 모달" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>
      {confirming && (
        <Modal title="확인 다이얼로그" footer={Footer} onClose={vi.fn()}>
          <p>정말 나갈까요?</p>
        </Modal>
      )}
    </>
  );
}

describe('Modal — 계약 a11y·라이프사이클', () => {
  it('Modal: open 상태 — role="dialog" + aria-modal + aria-labelledby 로 제목을 접근성 이름으로 연결한다', () => {
    render(
      <Modal title="모달 제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: '모달 제목' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby).not.toBeNull();
    expect(document.getElementById(labelledby ?? '')?.textContent).toBe('모달 제목');
  });

  it('Modal: 열릴 때 첫 포커스 가능 요소(닫기 버튼)로 포커스를 옮긴다', () => {
    render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '닫기' }));
  });

  it('Modal: initialFocusRef 를 주면 그 요소로 포커스를 옮긴다', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()} initialFocusRef={inputRef}>
        <input ref={inputRef} type="text" aria-label="이름" />
      </Modal>,
    );
    expect(document.activeElement).toBe(inputRef.current);
  });

  it('Modal: 닫히면 열기 직전 포커스 요소로 복귀한다', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    const { unmount } = render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('Modal: Esc 로 onClose 가 호출된다 (계약 keyboard: Escape)', () => {
    const onClose = vi.fn();
    render(
      <Modal title="제목" footer={Footer} onClose={onClose}>
        <p>본문</p>
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Modal: 닫기 버튼·딤 클릭이 onClose 를 호출한다', () => {
    const onClose = vi.fn();
    render(
      <Modal title="제목" footer={Footer} onClose={onClose}>
        <p>본문</p>
      </Modal>,
    );
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Modal: Tab 포커스 트랩 — 마지막 요소에서 Tab 은 첫 요소로 감긴다', () => {
    render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    const closeBtn = screen.getByRole('button', { name: '닫기' });
    const confirmBtn = screen.getByRole('button', { name: '확인' });

    confirmBtn.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);
  });

  it('Modal: 열려 있는 동안 배경 스크롤을 잠그고 닫히면 복원한다', () => {
    const { unmount } = render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );
    expect(scrollLockCount()).toBe('1');
    unmount();
    // 잠금이 완전히 걷혔다 — 속성 자체가 사라진다
    expect(scrollLockCount()).toBeNull();
  });

  /**
   * [회귀] 중첩 모달(폼 모달 위 ConfirmDialog)이 **함께** 닫힐 때 스크롤 잠금이 새면
   * 모달이 전부 사라진 뒤에도 배경 스크롤이 영구히 죽는다(실제로 출하됐던 회귀다 —
   * 폼을 폐기하고 나면 새로고침할 때까지 스크롤이 죽었다).
   *
   * [왜 순차로 여는가] 실제 흐름이 그렇다: 폼 모달이 먼저 열려 있고, dirty 가드가
   * **그 위에** 확인 다이얼로그를 세운다(LogoFormModal 의 `{discardDialog}` 참조).
   * 둘을 같은 커밋에 동시 마운트하는 것은 앱에 존재하지 않는 상황이고, 그 인위적 상황에서는
   * 두 다이얼로그가 서로를 aria-hidden 으로 가려 검증 자체가 성립하지 않는다.
   */
  it('Modal: 중첩된 모달이 함께 닫혀도 배경 스크롤 잠금이 남지 않는다', () => {
    const { rerender, unmount } = render(<Nested confirming={false} />);
    expect(scrollLockCount()).toBe('1');

    // 폼 모달 위에 확인 다이얼로그가 겹친다 — 잠금은 **겹친 수만큼** 센다
    rerender(<Nested confirming />);
    expect(scrollLockCount()).toBe('2');

    // 둘이 함께 사라진다
    unmount();
    expect(scrollLockCount()).toBeNull();
  });

  /** 위쪽 모달만 닫히면 아래 모달이 아직 열려 있으므로 잠금은 **유지**되어야 한다 */
  it('Modal: 중첩 중 위쪽 모달만 닫히면 배경 스크롤 잠금이 유지된다', () => {
    const { rerender } = render(<Nested confirming={false} />);
    rerender(<Nested confirming />);
    expect(scrollLockCount()).toBe('2');

    // 확인 다이얼로그만 닫는다 — 폼 모달은 그대로 열려 있다
    rerender(<Nested confirming={false} />);
    expect(scrollLockCount()).toBe('1');
  });

  /**
   * [회귀 — 결함3/4] 배경이 격리된다.
   * 손으로 짠 트랩 시절 배경은 inert 도 aria-hidden 도 아니었고(실앱 기준 배경에
   * **포커스 가능 요소 51개**가 그대로 노출됐다), 리스너가 dialogRef 에만 붙어 있어
   * 포커스가 일단 배경으로 나가면 **되돌아오지 못했다**.
   */
  it('Modal: 열려 있는 동안 배경이 보조기술에서 격리된다 (결함4)', () => {
    const bg = document.createElement('button');
    bg.textContent = '배경 버튼';
    document.body.appendChild(bg);

    const { unmount } = render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );

    // 배경 버튼은 AT 트리에서 사라진다 — role 조회가 그것을 관측한다
    expect(screen.queryByRole('button', { name: '배경 버튼' })).toBeNull();
    // 다이얼로그 안의 것들은 그대로 보인다
    expect(screen.getByRole('button', { name: '닫기' })).not.toBeNull();

    // 닫히면 배경이 되돌아온다 — 격리가 새지 않는다
    unmount();
    expect(screen.queryByRole('button', { name: '배경 버튼' })).not.toBeNull();
    bg.remove();
  });

  it('Modal: onSubmit 을 주면 <form> 으로 감싸고 submit 이 onSubmit 을 호출한다', () => {
    const onSubmit = vi.fn();
    render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()} onSubmit={onSubmit}>
        <input type="text" aria-label="이름" />
      </Modal>,
    );
    const form = screen.getByRole('dialog').querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Modal: onSubmit 이 없으면 <form> 이 없다', () => {
    render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog').querySelector('form')).toBeNull();
  });
});
