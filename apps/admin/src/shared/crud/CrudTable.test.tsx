// CrudTable — 행 클릭 이동 + 인터랙티브 가드 단언 (A41)
//
// 선언적 CRUD 프레임워크의 모든 목록 표가 이 골격을 쓴다. 여기서 검증하는 것:
//   1) 행의 값 셀을 누르면 onEdit(그 항목) 이 불린다 — 행 전체가 해당 항목으로 가는 링크가 된다.
//   2) 행 안의 인터랙티브 요소(체크박스·수정/삭제 버튼)를 누르면 행 이동이 **트리거되지 않는다**
//      (useRowNavigation 의 closest() 가드). 이걸 놓치면 체크박스를 누를 때마다 화면이 튄다.
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CrudTable } from './CrudTable';
import type { CrudColumn } from './CrudTable';

interface Row {
  readonly id: string;
  readonly name: string;
}

const ROWS: readonly Row[] = [
  { id: 'r1', name: '첫 항목' },
  { id: 'r2', name: '둘째 항목' },
];

const COLUMNS: readonly CrudColumn<Row>[] = [{ header: '이름', render: (row) => row.name }];

function renderTable(overrides: Partial<Parameters<typeof CrudTable<Row>>[0]> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onToggleOne = vi.fn();
  render(
    <MemoryRouter>
      <CrudTable<Row>
        items={ROWS}
        loading={false}
        entityLabel="항목"
        columns={COLUMNS}
        nameOf={(row) => row.name}
        selectedIds={new Set()}
        onToggleOne={onToggleOne}
        onToggleAll={vi.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
        deletingId={null}
        selectAllLabelId="crud-select-all"
        emptyLabel="항목이 없습니다."
        {...overrides}
      />
    </MemoryRouter>,
  );
  return { onEdit, onDelete, onToggleOne };
}

describe('CrudTable — 행 클릭 이동 + 인터랙티브 가드', () => {
  it('행의 값 셀을 누르면 onEdit 를 그 항목으로 부른다', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderTable();
    await user.click(screen.getByText('첫 항목'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(ROWS[0]);
  });

  it('행 체크박스를 누르면 선택만 되고 행 이동(onEdit)은 트리거되지 않는다', async () => {
    const user = userEvent.setup();
    const { onEdit, onToggleOne } = renderTable();
    await user.click(screen.getByRole('checkbox', { name: '첫 항목 선택' }));
    expect(onToggleOne).toHaveBeenCalledWith('r1', true);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('행의 삭제 버튼을 누르면 onDelete 만 불리고 onEdit 은 불리지 않는다', async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderTable();
    await user.click(screen.getByRole('button', { name: '첫 항목 삭제' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
