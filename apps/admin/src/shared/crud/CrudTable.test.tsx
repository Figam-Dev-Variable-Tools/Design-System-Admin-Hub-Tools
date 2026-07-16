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

/**
 * STATE-01 — 네 상태 중 **정확히 하나**만 그린다.
 * 상태 혼동은 admin 의 대표 버그다: 로드 중 empty 가 번쩍이거나 error 를 '항목 없음' 으로 그리면
 * 운영자가 오판한다.
 */
describe('CrudTable — 상태 머신 (STATE-01)', () => {
  it('최초 로드 중에는 스켈레톤만 — empty 문구를 함께 그리지 않는다', () => {
    renderTable({ items: [], loading: true });

    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
    // 로드 중에 '없습니다' 가 보이면 운영자는 데이터가 없다고 오판한다
    expect(screen.queryByText(/없습니다/)).toBeNull();
  });

  it('성공했는데 0행일 때만 empty 를 그린다', () => {
    renderTable({ items: [], loading: false });
    expect(screen.getByText('등록된 항목이 없습니다')).not.toBeNull();
  });

  /**
   * 재조회 중 이전 행이 유지되는지 — react-query 를 도입한 이유 그 자체다(ADR-0008 §3.2).
   * 표 입장에서 그것은 'loading=false 면 items 를 그린다' 로 나타난다.
   */
  it('데이터가 있는 채로 재조회 중이면 행을 유지한다 (스켈레톤으로 덮지 않는다)', () => {
    renderTable({ items: ROWS, loading: false });
    expect(screen.getByText('첫 항목')).not.toBeNull();
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('false');
  });
});

/**
 * STATE-05 — 왜 비었는지에 따라 다른 copy·복구 수단.
 * 예전에는 26개 호출부가 '등록된 X이(가) 없습니다' 를 하드코딩해, 검색이 안 맞아 비었을 때도
 * '아직 없으니 등록하세요' 라고 말했다.
 */
describe('CrudTable — 빈 상태 3분기 (STATE-05)', () => {
  it('진짜 비어있음: 생성 CTA 를 보인다', () => {
    renderTable({
      items: [],
      empty: { createAction: <button type="button">항목 등록</button> },
    });

    expect(screen.getByText('등록된 항목이 없습니다')).not.toBeNull();
    expect(screen.getByRole('button', { name: '항목 등록' })).not.toBeNull();
  });

  it('검색 결과 없음: 다른 문구 + 검색 지우기 (생성 CTA 는 보이지 않는다)', async () => {
    const user = userEvent.setup();
    const onClearSearch = vi.fn();
    renderTable({
      items: [],
      empty: {
        hasQuery: true,
        onClearSearch,
        createAction: <button type="button">항목 등록</button>,
      },
    });

    expect(screen.getByText('조건에 맞는 항목이 없습니다')).not.toBeNull();
    // 검색 때문에 비었는데 등록을 권하면 사용자는 지우면 될 검색어를 그대로 둔다
    expect(screen.queryByRole('button', { name: '항목 등록' })).toBeNull();

    await user.click(screen.getByRole('button', { name: '검색 지우기' }));
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('필터 결과 없음: 필터 초기화를 권한다', async () => {
    const user = userEvent.setup();
    const onResetFilters = vi.fn();
    renderTable({ items: [], empty: { hasActiveFilters: true, onResetFilters } });

    expect(screen.getByText('필터에 맞는 항목이 없습니다')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  /** 검색과 필터가 함께 걸리면 검색이 이긴다 — 사용자가 방금 친 것이 검색어이기 때문 */
  it('검색과 필터가 함께 걸리면 검색 문구가 이긴다', () => {
    renderTable({ items: [], empty: { hasQuery: true, hasActiveFilters: true } });
    expect(screen.getByText('조건에 맞는 항목이 없습니다')).not.toBeNull();
  });
});
