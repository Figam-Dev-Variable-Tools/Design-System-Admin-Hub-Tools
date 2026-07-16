// 목록 조회 상태 — URL 직렬화 · 선택 해제 · 페이지 보정 (IA-13 · STATE-04)
//
// 이 훅이 틀리면 **모든 목록 화면이 조용히 틀린다**: Back 이 필터를 잃고, 보이지 않는 행이 선택된
// 채 남고, 줄어든 목록의 빈 페이지에 사용자가 남는다. e2e 는 회원 목록 한 화면만 덮으므로
// 계약 자체는 여기서 못 박는다.
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { useListState } from './useListState';

const FILTER_DEFAULTS = { tier: 'all' } as const;

/** 훅의 상태와 현재 URL 을 그대로 노출하는 최소 하니스 */
function Harness() {
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const location = useLocation();

  return (
    <div>
      <output data-testid="url">{`${location.pathname}${location.search}`}</output>
      <output data-testid="page">{list.page}</output>
      <output data-testid="keyword">{list.keyword}</output>
      <output data-testid="tier">{list.filters['tier']}</output>
      <output data-testid="selected">{[...list.selectedIds].join(',')}</output>
      <output data-testid="hasQuery">{String(list.hasQuery)}</output>
      <output data-testid="hasFilters">{String(list.hasActiveFilters)}</output>

      <button type="button" onClick={() => list.setPage(3)}>
        3페이지
      </button>
      <button type="button" onClick={() => list.setFilter('tier', 'vip')}>
        VIP
      </button>
      <button type="button" onClick={() => list.toggleOne('r1', true)}>
        r1 선택
      </button>
      <button type="button" onClick={() => list.clampPage(2)}>
        2페이지로 보정
      </button>
      <button type="button" onClick={() => list.resetFilters()}>
        필터 초기화
      </button>
    </div>
  );
}

function renderAt(initialUrl: string) {
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Harness />
    </MemoryRouter>,
  );
}

const valueOf = (id: string) => screen.getByTestId(id).textContent;

describe('useListState — URL 직렬화 (IA-13)', () => {
  it('URL 이 상태의 원천이다 — 쿼리스트링에서 page/keyword/filter 를 읽는다', () => {
    renderAt('/list?page=3&q=%ED%99%8D&tier=vip');

    expect(valueOf('page')).toBe('3');
    expect(valueOf('keyword')).toBe('홍');
    expect(valueOf('tier')).toBe('vip');
    expect(valueOf('hasQuery')).toBe('true');
    expect(valueOf('hasFilters')).toBe('true');
  });

  it('상태를 바꾸면 URL 에 쓴다 — 복사한 링크가 같은 view 를 재현한다', async () => {
    const user = userEvent.setup();
    renderAt('/list');

    await user.click(screen.getByRole('button', { name: '3페이지' }));
    expect(valueOf('url')).toBe('/list?page=3');
  });

  /** '?tier=all&page=1' 같은 URL 을 만들지 않는다 — 같은 화면이 두 개의 URL 을 갖게 된다 */
  it('기본값과 같은 값은 URL 에서 지운다', async () => {
    const user = userEvent.setup();
    renderAt('/list?tier=vip');

    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(valueOf('url')).toBe('/list');
    expect(valueOf('tier')).toBe('all');
  });

  it('조건이 바뀌면 1페이지로 돌아간다 — 3페이지에서 필터를 걸면 빈 화면이 뜬다', async () => {
    const user = userEvent.setup();
    renderAt('/list?page=3');

    await user.click(screen.getByRole('button', { name: 'VIP' }));
    expect(valueOf('page')).toBe('1');
    expect(valueOf('url')).toBe('/list?tier=vip');
  });

  /**
   * 손으로 고친 URL 이 목록을 깨지 않게 한다. `?page=0` 은 빈 목록을,
   * `?page=abc` 는 NaN 페이지를 만든다.
   */
  it('망가진 page 값은 1로 접는다', () => {
    renderAt('/list?page=abc');
    expect(valueOf('page')).toBe('1');
  });

  it('음수/0 page 도 1로 접는다', () => {
    renderAt('/list?page=-2');
    expect(valueOf('page')).toBe('1');
  });
});

describe('useListState — 선택 (STATE-04)', () => {
  it('page 가 바뀌면 선택이 해제된다 — 보이지 않는 행이 선택된 채 남지 않게', async () => {
    const user = userEvent.setup();
    renderAt('/list');

    await user.click(screen.getByRole('button', { name: 'r1 선택' }));
    expect(valueOf('selected')).toBe('r1');

    await user.click(screen.getByRole('button', { name: '3페이지' }));
    expect(valueOf('selected')).toBe('');
  });

  it('필터가 바뀌어도 선택이 해제된다', async () => {
    const user = userEvent.setup();
    renderAt('/list');

    await user.click(screen.getByRole('button', { name: 'r1 선택' }));
    await user.click(screen.getByRole('button', { name: 'VIP' }));
    expect(valueOf('selected')).toBe('');
  });

  /** 서명이 그대로면 지우지 않는다 — 매 렌더 초기화되면 선택 자체가 불가능해진다 */
  it('조건이 그대로면 선택을 유지한다', async () => {
    const user = userEvent.setup();
    renderAt('/list');

    await user.click(screen.getByRole('button', { name: 'r1 선택' }));
    // 같은 필터를 다시 고르는 것은 조건 변경이 아니다
    await user.click(screen.getByRole('button', { name: 'VIP' }));
    await user.click(screen.getByRole('button', { name: 'r1 선택' }));
    await user.click(screen.getByRole('button', { name: 'VIP' }));
    expect(valueOf('selected')).toBe('r1');
  });
});

describe('useListState — 페이지 보정 (STATE-04)', () => {
  /** 다중 관리자 삭제로 total 이 줄면 현재 page 가 범위를 벗어난다 — false-empty 를 막는다 */
  it('총 페이지 수보다 큰 page 는 마지막 페이지로 보정한다', async () => {
    const user = userEvent.setup();
    renderAt('/list?page=9');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '2페이지로 보정' }));
    });
    expect(valueOf('page')).toBe('2');
  });

  it('범위 안의 page 는 건드리지 않는다', async () => {
    const user = userEvent.setup();
    renderAt('/list?page=1');

    await user.click(screen.getByRole('button', { name: '2페이지로 보정' }));
    expect(valueOf('page')).toBe('1');
  });
});
