// 로그 목록 조회 조건의 URL 왕복 (IA-13)
//
// [무엇을 증명하나] 로그는 조사 도구다. '기간을 좁히고 → 3페이지에서 이상한 줄을 찾고 →
// 그 링크를 동료에게 붙여넣는' 것이 이 화면의 쓰임이다. 그 링크가 열었을 때 다른 페이지를
// 보여주면 조사는 처음부터 다시다 — 그래서 조건은 URL 에 있어야 하고, **URL 에 있는 것이
// 조용히 사라지지 않아야** 한다.
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedSearch } from '../../shared/crud';
import { useLogListState } from './list-state';
import type { LogFilterAxis } from './types';

const AXES: readonly LogFilterAxis[] = [
  {
    key: 'severity',
    heading: '심각도',
    ariaLabel: '심각도 필터',
    options: [
      { id: 'error', label: '오류' },
      { id: 'warn', label: '경고' },
    ],
  },
];

const SORTABLE = ['occurredAt', 'code'] as const;

/**
 * LogListShell 의 배선을 그대로 재현한다 — 셸은 검색 입력의 유무와 무관하게 늘
 * useDebouncedSearch 를 걸고 setKeyword 를 커밋 콜백으로 준다.
 */
function Harness() {
  const api = useLogListState(AXES, SORTABLE);
  useDebouncedSearch({ initial: api.state.keyword, onCommit: api.setKeyword });
  const location = useLocation();
  return (
    <output data-testid="url">{`${location.search}|page=${String(api.state.page)}|q=${api.state.keyword}`}</output>
  );
}

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/logs/errors${search}`]}>
      <Harness />
    </MemoryRouter>,
  );
}

function urlText(): string {
  return screen.getByTestId('url').textContent ?? '';
}

/** 디바운스(250ms)를 넘긴다 — 마운트 커밋이 터지는 시점 */
async function afterDebounce(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

describe('디바운스 검색의 마운트 커밋 — ?page=N 이 살아남는다', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('검색어 없이 ?page=3 으로 들어와도 250ms 뒤 page 가 그대로다', async () => {
    vi.useFakeTimers();
    renderAt('?page=3');
    expect(urlText()).toContain('|page=3|');

    await afterDebounce();

    // 마운트 커밋은 '검색어가 그대로'라는 뜻이다 — 이동이 아니므로 page 를 되돌리지 않는다
    expect(urlText()).toContain('|page=3|');
  });

  it('검색어가 있는 채로 ?page=3 으로 들어와도 page 가 그대로다', async () => {
    vi.useFakeTimers();
    renderAt('?q=TIMEOUT&page=3');

    await afterDebounce();

    expect(urlText()).toContain('|page=3|');
    expect(urlText()).toContain('|q=TIMEOUT');
  });
});
