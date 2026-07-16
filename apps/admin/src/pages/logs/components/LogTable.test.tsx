// 로그 표의 DOM 계약 (apps/admin/src/pages/logs/components/**)
//
// [무엇을 고정하는가]
//   · ERP-04  — 정렬 헤더가 aria-sort 를 내고 키보드로 눌린다
//   · STATE-01 — 최초 로드는 스켈레톤만 (빈 상태 문구가 번쩍이지 않는다)
//   · STATE-05 — 0행의 세 가지 사유가 **다른 문구와 다른 복구 수단**으로 갈린다
//   · A11Y-08 — 행 클릭에 키보드 등가물이 있다
//   · 불변성  — 체크박스도, 삭제 버튼도, ⋯ 메뉴도 렌더되지 않는다
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { LogColumn, LogEntryBase, SortState, SortValues } from '../types';
import { LogTable } from './LogTable';

interface Row extends LogEntryBase {
  readonly name: string;
  readonly size: number;
}

const ROWS: readonly Row[] = [
  { id: '1', occurredAtIso: '2026-07-14T02:31:09Z', name: '가나', size: 90 },
  { id: '2', occurredAtIso: '2026-07-14T03:31:09Z', name: '다라', size: 1400 },
];

const COLUMNS: readonly LogColumn<Row>[] = [
  { id: 'occurredAt', label: '시각', render: (entry) => entry.occurredAtIso },
  { id: 'name', label: '이름', render: (entry) => entry.name },
  // 정렬 키가 없는 컬럼 — 헤더가 버튼이 되면 안 된다
  { id: 'note', label: '비고', render: () => '—' },
];

const SORT_VALUES: SortValues<Row> = {
  occurredAt: (entry) => entry.occurredAtIso,
  name: (entry) => entry.name,
};

const DESC: SortState = { key: 'occurredAt', direction: 'desc' };

function renderTable(overrides: Partial<Parameters<typeof LogTable<Row>>[0]> = {}) {
  const props = {
    caption: '테스트 로그 — 읽기 전용입니다.',
    entries: ROWS,
    columns: COLUMNS,
    sortValues: SORT_VALUES,
    sort: DESC,
    loading: false,
    skeletonRows: 20,
    toneOf: () => 'neutral' as const,
    onOpen: vi.fn(),
    onToggleSort: vi.fn(),
    emptyLabel: '관리자 로그',
    hasQuery: false,
    hasActiveFilters: false,
    onClearSearch: vi.fn(),
    onResetFilters: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter>
      <LogTable {...props} />
    </MemoryRouter>,
  );

  return props;
}

/**
 * 그 컬럼의 aria-sort 값.
 *
 * [jest-dom 매처를 쓰지 않는 이유] `toHaveAttribute` 는 이 앱의 tsc 설정
 * (`types: ["vite/client"]` + `include: ["src"]`)에서 타입이 잡히지 않는다 — vitest.setup.ts 의
 * 전역 확장이 tsc 의 시야 밖이기 때문이다. 설정은 이 배치의 소유가 아니므로 표준 단언으로 쓴다.
 */
function sortOf(name: RegExp): string | null {
  return screen.getByRole('columnheader', { name }).getAttribute('aria-sort');
}

/* ── 정렬 (ERP-04) ───────────────────────────────────────────────────────── */

describe('정렬 헤더', () => {
  it('정렬 중인 컬럼이 aria-sort 로 방향을 알린다', () => {
    renderTable();
    expect(sortOf(/시각/)).toBe('descending');
  });

  it('오름차순이면 ascending 으로 뒤집힌다', () => {
    renderTable({ sort: { key: 'occurredAt', direction: 'asc' } });
    expect(sortOf(/시각/)).toBe('ascending');
  });

  it('정렬 중이 아닌 컬럼은 none 이다 — 표는 한 번에 한 축으로만 정렬된다', () => {
    renderTable();
    expect(sortOf(/이름/)).toBe('none');
  });

  it('정렬 키가 없는 컬럼은 버튼이 아니다 — 눌러도 아무 일도 없는 것을 누르게 하지 않는다', () => {
    renderTable();
    const header = screen.getByRole('columnheader', { name: '비고' });
    expect(within(header).queryByRole('button')).toBeNull();
    expect(header.getAttribute('aria-sort')).toBe('none');
  });

  it('**키보드로 정렬할 수 있다** — 헤더는 진짜 <button> 이다', async () => {
    const user = userEvent.setup();
    const props = renderTable();

    const header = screen.getByRole('columnheader', { name: /이름/ });
    const button = within(header).getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');

    expect(props.onToggleSort).toHaveBeenCalledWith('name');
  });
});

/* ── 상태 (STATE-01) ─────────────────────────────────────────────────────── */

describe('로딩', () => {
  it('최초 로드는 **스켈레톤만** — 빈 상태 문구가 번쩍이지 않는다', () => {
    renderTable({ entries: [], loading: true, skeletonRows: 3 });

    // '없습니다' 가 보이면 운영자는 기록이 없다고 오판한다
    expect(screen.queryByText(/없습니다/)).toBeNull();
    expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
  });
});

/* ── 빈 상태 3분기 (STATE-05) ────────────────────────────────────────────── */

describe('빈 상태 — 왜 비었는지 구분한다', () => {
  it('(a) 진짜 비어있음 — 생성 CTA 가 **없다**. 감사 기록은 만들 수 없다', () => {
    renderTable({ entries: [] });

    expect(screen.getByText('기록된 관리자 로그가 없습니다')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '검색 지우기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '필터 초기화' })).toBeNull();
  });

  it('(b) 검색 결과 없음 — 다른 문구 + 검색 지우기', async () => {
    const user = userEvent.setup();
    const props = renderTable({ entries: [], hasQuery: true });

    expect(screen.getByText('조건에 맞는 관리자 로그가 없습니다')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: '검색 지우기' }));
    expect(props.onClearSearch).toHaveBeenCalled();
  });

  it('(c) 필터 결과 없음 — 또 다른 문구 + 필터 초기화', async () => {
    const user = userEvent.setup();
    const props = renderTable({ entries: [], hasActiveFilters: true });

    expect(screen.getByText('필터에 맞는 관리자 로그가 없습니다')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(props.onResetFilters).toHaveBeenCalled();
  });

  it('빈 상태는 스크린리더에 알려진다 (role=status)', () => {
    renderTable({ entries: [] });
    expect(screen.getByRole('status')).not.toBeNull();
  });
});

/* ── 상세 열기 (A11Y-08) ─────────────────────────────────────────────────── */

describe('상세 열기', () => {
  it('**첫 칸이 키보드로 닿는 버튼이다** — 행 클릭은 마우스 사용자를 위한 보조 수단일 뿐이다', async () => {
    const user = userEvent.setup();
    const props = renderTable();

    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;

    const openButton = within(row).getAllByRole('button')[0];
    expect(openButton).toBeDefined();
    if (openButton === undefined) return;

    openButton.focus();
    await user.keyboard('{Enter}');
    expect(props.onOpen).toHaveBeenCalledWith(ROWS[0]);
  });

  it('그 버튼이 실제로 Tab 순서 안에 있다 — 정렬 헤더 2개 다음이 첫 행이다', async () => {
    const user = userEvent.setup();
    renderTable();

    const row = screen.getAllByRole('row')[1];
    expect(row).toBeDefined();
    if (row === undefined) return;
    const openButton = within(row).getAllByRole('button')[0];

    // 시각 헤더 → 이름 헤더 → 첫 행의 열기 버튼 ('비고'는 정렬 키가 없어 버튼이 아니다)
    await user.tab();
    await user.tab();
    await user.tab();

    expect(document.activeElement).toBe(openButton);
  });

  it('행을 클릭해도 상세가 열린다', async () => {
    const user = userEvent.setup();
    const props = renderTable();

    await user.click(screen.getByText('가나'));
    expect(props.onOpen).toHaveBeenCalledWith(ROWS[0]);
  });
});

/* ── 불변성 ───────────────────────────────────────────────────────────────── */

describe('불변성 — 이 표에 없는 것', () => {
  it('체크박스가 없다 — 일괄 액션이 없으므로 선택할 이유가 없다', () => {
    renderTable();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('삭제·수정·⋯ 메뉴가 없다 — 감사 기록은 불변이다', () => {
    renderTable();

    for (const name of [/삭제/, /수정/, /더보기/]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('caption 이 읽기 전용임을 말한다 — 규칙은 화면에도 적혀야 한다', () => {
    renderTable();
    expect(screen.getByText(/읽기 전용/)).not.toBeNull();
  });
});
