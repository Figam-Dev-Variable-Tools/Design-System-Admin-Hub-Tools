// ConfirmDialog — 계약 검증 테스트 (contracts/ConfirmDialog.contract.json@1.0.0)
//
//   intent   톤·기본 라벨·아이콘을 정한다 (create/update=primary · delete/discard=danger)
//   default  확인/취소 버튼 · 기본 라벨 · aria-busy 없음
//   loading  busy → 확인 버튼 disabled + aria-busy + '처리 중…' (계약 onConfirm.blockedWhen: busy)
//   error    비어 있지 않으면 danger 배너(Alert) · 확인 버튼은 되살아난다
//   onCancel 취소·Esc 는 busy 중에도 살아 있다
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  document.body.style.overflow = '';
});

import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog — 계약 intent·states', () => {
  it('ConfirmDialog: default — 제목/문구/취소·확인 버튼을 렌더하고 확인 버튼에 aria-busy 가 없다', () => {
    render(
      <ConfirmDialog
        intent="delete"
        title="삭제할까요?"
        message="되돌릴 수 없어요."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog', { name: '삭제할까요?' })).not.toBeNull();
    expect(screen.getByText('되돌릴 수 없어요.')).not.toBeNull();
    const confirm = screen.getByRole('button', { name: '삭제' }) as HTMLButtonElement;
    expect(confirm.getAttribute('aria-busy')).not.toBe('true');
    expect(confirm.disabled).toBe(false);
    expect(screen.getByRole('button', { name: '취소' })).not.toBeNull();
  });

  it('ConfirmDialog: A11Y-02 — dialog 의 aria-describedby 가 message 요소 id 로 해석된다 (open 시 목적까지 announce)', () => {
    render(
      <ConfirmDialog
        intent="delete"
        title="삭제할까요?"
        message="정말 삭제할까요? 되돌릴 수 없어요."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: '삭제할까요?' });
    const describedby = dialog.getAttribute('aria-describedby');
    expect(describedby).not.toBeNull();
    const messageEl = document.getElementById(describedby ?? '');
    expect(messageEl).not.toBeNull();
    expect(messageEl?.textContent).toBe('정말 삭제할까요? 되돌릴 수 없어요.');
  });

  it('ConfirmDialog: intent 가 기본 확인 라벨을 정한다 (create=만들기 · update=저장 · discard=나가기)', () => {
    const cases: readonly ['create' | 'update' | 'discard', string][] = [
      ['create', '만들기'],
      ['update', '저장'],
      ['discard', '나가기'],
    ];
    for (const [intent, label] of cases) {
      const { unmount } = render(
        <ConfirmDialog
          intent={intent}
          title="t"
          message="m"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: label })).not.toBeNull();
      unmount();
    }
  });

  it('ConfirmDialog: confirmLabel 을 주면 intent 기본 라벨을 덮어쓴다', () => {
    render(
      <ConfirmDialog
        intent="delete"
        title="t"
        message="m"
        confirmLabel="회원 삭제"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '회원 삭제' })).not.toBeNull();
  });

  it('ConfirmDialog: loading(busy) — 확인 버튼 disabled + aria-busy + "처리 중…" (onConfirm 발화 차단)', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        intent="delete"
        title="t"
        message="m"
        busy
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const confirm = screen.getByRole('button', { name: '처리 중…' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(confirm.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ConfirmDialog: error — danger 배너(role=alert)를 띄우고 확인 버튼은 계속 눌린다', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        intent="delete"
        title="t"
        message="m"
        error="삭제에 실패했어요."
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('삭제에 실패했어요.');
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ConfirmDialog: 확인 버튼 클릭이 onConfirm 을 호출한다', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        intent="delete"
        title="t"
        message="m"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ConfirmDialog: 취소는 busy 중에도 살아 있다 — 취소 버튼·Esc 가 onCancel 을 호출한다', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        intent="delete"
        title="t"
        message="m"
        busy
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
