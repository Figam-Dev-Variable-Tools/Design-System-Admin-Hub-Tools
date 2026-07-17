// SelectAllHeaderCell — 계약 검증 테스트 (contracts/SelectAllHeaderCell.contract.json@1.0.0)
//
//   states[]           default · focus-visible · checked · indeterminate
//   events.onToggleAll 전체선택/해제 발화
//   dependencies       TriStateCheckbox — off/on/mixed 를 selection 으로 전수 검증
//   + 동반 유틸 tableSelectionState (페이지 경계를 넘어 선택이 새지 않는다)
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SelectAllHeaderCell, tableSelectionState } from './SelectAllHeaderCell';

function renderInTable(ui: ReactElement) {
  return render(
    <table>
      <thead>
        <tr>{ui}</tr>
      </thead>
    </table>,
  );
}

describe('SelectAllHeaderCell — 계약 states[] (TriStateCheckbox 조립)', () => {
  it('SelectAllHeaderCell: default(off) — 숨긴 라벨로 접근 이름, aria-checked 는 내지 않는다', () => {
    renderInTable(
      <SelectAllHeaderCell
        label="이 페이지의 회원 전체 선택"
        labelId="sa"
        selection={{ allSelected: false, someSelected: false }}
        onToggleAll={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '이 페이지의 회원 전체 선택' });
    // off/on 에는 aria-checked 를 내지 않는다 — native checked 가 정본이다 (Checkbox 와 같은 규약).
    // 네이티브 체크박스에서 aria-checked 는 "mixed" 일 때만 허용된다 (axe aria-conditional-attr · ADR-0012).
    expect(box.getAttribute('aria-checked')).toBeNull();
    expect((box as HTMLInputElement).checked).toBe(false);
    expect(box.getAttribute('aria-labelledby')).toBe('sa');
  });

  it('SelectAllHeaderCell: checked(all) — native checked, aria-checked 는 내지 않는다', () => {
    renderInTable(
      <SelectAllHeaderCell
        label="전체 선택"
        labelId="sa"
        selection={{ allSelected: true, someSelected: false }}
        onToggleAll={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.getAttribute('aria-checked')).toBeNull();
  });

  it('SelectAllHeaderCell: indeterminate(some) — aria-checked="mixed"', () => {
    renderInTable(
      <SelectAllHeaderCell
        label="전체 선택"
        labelId="sa"
        selection={{ allSelected: false, someSelected: true }}
        onToggleAll={vi.fn()}
      />,
    );
    const box = screen.getByRole('checkbox', { name: '전체 선택' }) as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

  it('SelectAllHeaderCell: focus-visible — 키보드 포커스를 받는다', async () => {
    renderInTable(
      <SelectAllHeaderCell
        label="전체 선택"
        labelId="sa"
        selection={{ allSelected: false, someSelected: false }}
        onToggleAll={vi.fn()}
      />,
    );
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: '전체 선택' }));
  });
});

describe('SelectAllHeaderCell — 계약 events.onToggleAll', () => {
  it('SelectAllHeaderCell: 클릭이 다음 상태(boolean)로 발화한다', async () => {
    const onToggleAll = vi.fn();
    renderInTable(
      <SelectAllHeaderCell
        label="전체 선택"
        labelId="sa"
        selection={{ allSelected: false, someSelected: false }}
        onToggleAll={onToggleAll}
      />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: '전체 선택' }));
    expect(onToggleAll).toHaveBeenCalledWith(true);
  });
});

describe('tableSelectionState — 동반 유틸 (보이는 행만 센다)', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as const;

  it('아무것도 없으면 off', () => {
    expect(tableSelectionState(rows, new Set())).toEqual({
      allSelected: false,
      someSelected: false,
    });
  });

  it('전부 선택이면 allSelected', () => {
    expect(tableSelectionState(rows, new Set(['a', 'b', 'c']))).toEqual({
      allSelected: true,
      someSelected: false,
    });
  });

  it('일부만 선택이면 someSelected(mixed)', () => {
    expect(tableSelectionState(rows, new Set(['a']))).toEqual({
      allSelected: false,
      someSelected: true,
    });
  });

  it('보이지 않는 행(다른 페이지의 선택)은 세지 않는다 — 빈 페이지는 off', () => {
    // 선택 집합에 이 페이지에 없는 id 만 있으면 이 페이지는 off
    expect(tableSelectionState(rows, new Set(['z']))).toEqual({
      allSelected: false,
      someSelected: false,
    });
    // 행이 없으면 allSelected 는 false (0/0 을 전체 선택으로 보지 않는다)
    expect(tableSelectionState([], new Set(['a']))).toEqual({
      allSelected: false,
      someSelected: false,
    });
  });
});
