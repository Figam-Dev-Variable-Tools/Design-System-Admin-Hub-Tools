// NoticesTable — 순번·선택 동작 단언
//
// 순번 열이 페이지 위치를 반영하는지(2페이지 11번째 = 11), 행/헤더 체크박스가 선택 콜백을 부르는지 단언한다.
// 6개 콘텐츠 목록이 같은 공통 프리미티브(RowSelectCell·SelectAllHeaderCell)를 쓰므로 대표로 공지 목록을 검증한다.
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NoticesTable } from './NoticesTable';
import type { NoticeSummary } from '../types';

const NOTICES: readonly NoticeSummary[] = [
  {
    id: 'n1',
    title: '첫 공지',
    category: 'notice',
    status: 'published',
    pinned: false,
    author: '콘텐츠 운영팀',
    publishedAtIso: '2026-01-01T09:00:00',
    views: 100,
  },
  {
    id: 'n2',
    title: '둘째 공지',
    category: 'event',
    status: 'draft',
    pinned: false,
    author: '콘텐츠 운영팀',
    publishedAtIso: '2026-01-02T09:00:00',
    views: 200,
  },
];

function renderTable(overrides: Partial<Parameters<typeof NoticesTable>[0]> = {}) {
  const onToggleOne = vi.fn();
  const onToggleAll = vi.fn();
  render(
    <MemoryRouter>
      <NoticesTable
        notices={NOTICES}
        loading={false}
        onDelete={vi.fn()}
        deletingId={null}
        selectedIds={new Set()}
        onToggleOne={onToggleOne}
        onToggleAll={onToggleAll}
        startIndex={10}
        canRemove
        {...overrides}
      />
    </MemoryRouter>,
  );
  return { onToggleOne, onToggleAll };
}

describe('NoticesTable — 순번·선택', () => {
  it('순번은 페이지 위치를 반영한다 (2페이지 startIndex=10 → 11, 12)', () => {
    renderTable();
    expect(screen.getByText('11')).not.toBeNull();
    expect(screen.getByText('12')).not.toBeNull();
  });

  it('행 체크박스는 그 행 id 로 onToggleOne 을 부른다', async () => {
    const user = userEvent.setup();
    const { onToggleOne } = renderTable();
    await user.click(screen.getByRole('checkbox', { name: '첫 공지 선택' }));
    expect(onToggleOne).toHaveBeenCalledWith('n1', true);
  });

  it('헤더 전체선택은 onToggleAll 을 부른다', async () => {
    const user = userEvent.setup();
    const { onToggleAll } = renderTable();
    await user.click(screen.getByRole('checkbox', { name: '이 페이지의 공지 전체 선택' }));
    expect(onToggleAll).toHaveBeenCalledWith(true);
  });

  it('선택된 행의 체크박스는 checked 다', () => {
    renderTable({ selectedIds: new Set(['n2']) });
    expect(
      (screen.getByRole('checkbox', { name: '둘째 공지 선택' }) as HTMLInputElement).checked,
    ).toBe(true);
  });
});
