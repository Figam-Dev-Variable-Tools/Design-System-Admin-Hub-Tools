// Modal — 계약 검증 테스트 (contracts/Modal.contract.json@1.1.0)
//
//   a11y      role="dialog" + aria-modal + aria-labelledby(제목)
//   focus     열릴 때 첫 포커스 가능 요소(또는 initialFocusRef)로 이동, 닫히면 직전 요소로 복귀
//   keyboard  Esc 로 닫힘 · Tab/Shift+Tab 포커스 트랩 순환
//   lifecycle 열려 있는 동안 body 스크롤 잠금, 닫히면 복원
//   onSubmit  주면 본문/푸터를 <form> 으로 감싸 submit 이 동작한다
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Modal } from './Modal';

const Footer = (
  <>
    <button type="button">취소</button>
    <button type="button">확인</button>
  </>
);

afterEach(() => {
  document.body.style.overflow = '';
});

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

  it('Modal: 열려 있는 동안 body 스크롤을 잠그고 닫히면 복원한다', () => {
    const { unmount } = render(
      <Modal title="제목" footer={Footer} onClose={vi.fn()}>
        <p>본문</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
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
