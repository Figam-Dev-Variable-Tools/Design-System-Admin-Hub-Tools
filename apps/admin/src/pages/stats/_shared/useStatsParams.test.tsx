// 조회 조건의 URL 직렬화 단언 (IA-13 · P0)
//
// [무엇을 증명하나] '필터를 맞추고 → 3페이지로 가고 → 상세를 열고 → 뒤로' 했을 때 조건이
// 살아있는가. 그 루프의 핵심은 **조건이 URL 에 있는가** 하나다. URL 에 있으면 새로고침·뒤로가기·
// 링크 공유가 전부 공짜로 따라오고, 없으면 셋 다 불가능하다.
//
// 여기서는 URL ↔ 상태의 왕복(round-trip)을 직접 단언한다: URL 을 주면 그 상태가 나오는가,
// 상태를 바꾸면 그 URL 이 되는가.
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedSearch } from '../../../shared/crud';
import { useStatsParams } from './useStatsParams';
import type { StatsParamsApi } from './useStatsParams';
import type { SegmentOption } from './types';

const SEGMENTS: readonly SegmentOption[] = [
  { id: 'all', label: '전체' },
  { id: 'new', label: '신규' },
];

const VIEWS: readonly SegmentOption[] = [
  { id: 'daily', label: '일자별' },
  { id: 'hourly', label: '시간대별' },
];

const METRICS: readonly SegmentOption[] = [
  { id: 'visits', label: '방문' },
  { id: 'pv', label: '페이지뷰' },
];

/** 훅의 현재 값과 URL 을 함께 노출하는 하네스 */
let api: StatsParamsApi | null = null;

function Harness() {
  const params = useStatsParams({
    segments: SEGMENTS,
    views: VIEWS,
    metrics: METRICS,
    defaultSort: null,
  });
  const location = useLocation();
  api = params;
  return <output data-testid="search">{location.search}</output>;
}

function renderAt(search: string) {
  api = null;
  return render(
    <MemoryRouter initialEntries={[`/stats/visitors${search}`]}>
      <Harness />
    </MemoryRouter>,
  );
}

function currentApi(): StatsParamsApi {
  if (api === null) throw new Error('훅이 아직 렌더되지 않았다');
  return api;
}

function searchText(): string {
  return screen.getByTestId('search').textContent ?? '';
}

describe('useStatsParams — URL 이 조회 조건의 원천이다 (IA-13)', () => {
  it('파라미터가 없으면 기본값이다', () => {
    renderAt('');
    const params = currentApi();
    expect(params.preset).toBe('last7');
    expect(params.compare).toBe('previous');
    expect(params.segment).toBe('all');
    expect(params.view).toBe('daily');
    expect(params.metric).toBe('visits');
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(25);
    expect(params.keyword).toBe('');
    expect(params.hasActiveFilters).toBe(false);
  });

  it('URL 을 그대로 복원한다 — 링크를 새 탭에 붙여넣어도 같은 화면이다', () => {
    renderAt(
      '?preset=last30&compare=lastYear&segment=new&view=hourly&page=3&size=50&sort=visits&dir=asc&q=원피스',
    );
    const params = currentApi();
    expect(params.preset).toBe('last30');
    expect(params.compare).toBe('lastYear');
    expect(params.segment).toBe('new');
    expect(params.view).toBe('hourly');
    expect(params.page).toBe(3);
    expect(params.pageSize).toBe(50);
    expect(params.sort).toEqual({ key: 'visits', direction: 'asc' });
    expect(params.keyword).toBe('원피스');
    expect(params.hasActiveFilters).toBe(true);
  });

  it('모르는 값은 기본값으로 떨어진다 — URL 은 사용자가 손댈 수 있다', () => {
    renderAt('?preset=지어냄&compare=지어냄&segment=지어냄&size=999&page=0');
    const params = currentApi();
    expect(params.preset).toBe('last7');
    expect(params.compare).toBe('previous');
    expect(params.segment).toBe('all');
    expect(params.pageSize).toBe(25);
    expect(params.page).toBe(1);
  });

  it('직접 입력한 날짜는 URL 이 기억한다', () => {
    renderAt('?preset=custom&start=2026-01-01&end=2026-01-31');
    const params = currentApi();
    expect(params.period).toEqual({ start: '2026-01-01', end: '2026-01-31' });
  });

  it('말이 안 되는 날짜는 무시한다', () => {
    renderAt('?preset=custom&start=2026-02-31&end=nope');
    const params = currentApi();
    // 오늘로 안전하게 떨어진다 — 화면이 깨지지 않는다
    expect(params.period.start).toBe(params.today);
    expect(params.period.end).toBe(params.today);
  });

  it('조건을 바꾸면 URL 이 바뀐다', () => {
    renderAt('');
    act(() => {
      currentApi().setSegment('new');
    });
    expect(searchText()).toContain('segment=new');
  });

  it('기본값으로 되돌리면 파라미터를 지운다 — URL 이 정규화된다', () => {
    renderAt('?segment=new');
    act(() => {
      currentApi().setSegment('all');
    });
    expect(searchText()).not.toContain('segment');
  });

  it('조건이 바뀌면 페이지는 1로 돌아간다 (STATE-04)', () => {
    // 3페이지를 보다 조건을 좁혔는데 3페이지에 남으면 결과가 1페이지뿐일 때 false-empty 가 뜬다
    renderAt('?page=3');
    expect(currentApi().page).toBe(3);
    act(() => {
      currentApi().setSegment('new');
    });
    expect(searchText()).not.toContain('page');
  });

  it('페이지 이동은 페이지를 유지한다', () => {
    renderAt('');
    act(() => {
      currentApi().setPage(2);
    });
    expect(searchText()).toContain('page=2');
    // 1페이지는 기본값이라 URL 에서 사라진다
    act(() => {
      currentApi().setPage(1);
    });
    expect(searchText()).not.toContain('page');
  });

  it('차트 지표는 표의 페이지를 건드리지 않는다', () => {
    renderAt('?page=2');
    act(() => {
      currentApi().setMetric('pv');
    });
    expect(searchText()).toContain('page=2');
    expect(searchText()).toContain('metric=pv');
  });

  it('같은 컬럼을 다시 누르면 방향만 뒤집는다 (ERP-04)', () => {
    renderAt('');
    act(() => {
      currentApi().toggleSort('visits');
    });
    expect(currentApi().sort).toEqual({ key: 'visits', direction: 'desc' });

    act(() => {
      currentApi().toggleSort('visits');
    });
    expect(currentApi().sort).toEqual({ key: 'visits', direction: 'asc' });

    // 다른 컬럼으로 옮기면 다시 desc 부터 — 큰 값이 먼저가 통계의 기본 관심사다
    act(() => {
      currentApi().toggleSort('pv');
    });
    expect(currentApi().sort).toEqual({ key: 'pv', direction: 'desc' });
  });

  it('직접 입력 날짜를 고르면 프리셋이 custom 이 된다', () => {
    renderAt('');
    act(() => {
      currentApi().setPeriod({ start: '2026-01-01', end: '2026-01-31' });
    });
    expect(searchText()).toContain('preset=custom');
    expect(searchText()).toContain('start=2026-01-01');
  });

  it('프리셋으로 되돌아가면 죽은 날짜 파라미터를 지운다', () => {
    renderAt('?preset=custom&start=2026-01-01&end=2026-01-31');
    act(() => {
      currentApi().setPreset('last30');
    });
    expect(searchText()).not.toContain('start');
    expect(searchText()).not.toContain('end');
    expect(searchText()).toContain('preset=last30');
  });

  it('필터 초기화는 조건을 전부 지우되 보는 각도(view)는 남긴다', () => {
    renderAt('?segment=new&compare=none&q=원피스&view=hourly&sort=visits&dir=asc');
    act(() => {
      currentApi().resetFilters();
    });
    const search = searchText();
    expect(search).not.toContain('segment');
    expect(search).not.toContain('compare');
    expect(search).not.toContain('q=');
    expect(search).not.toContain('sort');
    // 시간대별을 보던 사람을 일자별로 튕기지 않는다
    expect(search).toContain('view=hourly');
  });
});

/* ── 마운트 커밋이 page 를 지우지 않는다 (IA-13) ──────────────────────────────
 *
 * [무엇을 재현하나] StatsFilterBar 는 검색 입력의 유무와 무관하게 늘 useDebouncedSearch 를
 * 건다(StatsFilterBar.tsx — 훅은 무조건, SearchField 만 조건부). 그 훅은 **마운트 직후에도**
 * 한 번 커밋한다(현재 입력값 = URL 의 q). 그 커밋이 그대로 통과하면 update 가 page 를 지워
 * `?page=3` 링크로 들어온 사용자가 250ms 뒤 1페이지로 튕긴다 — 통계 6화면 전부.
 *
 * F2 가 useListState 에서 같은 버그를 고친 방식이 정본이다: 값이 실제로 바뀔 때만 되돌린다. */

/** StatsFilterBar 의 배선을 그대로 재현한다 (StatsFilterBar.tsx 의 그 한 줄) */
function FilterBarHarness() {
  const params = useStatsParams({
    segments: SEGMENTS,
    views: VIEWS,
    metrics: METRICS,
    defaultSort: null,
  });
  useDebouncedSearch({ initial: params.keyword, onCommit: params.setKeyword });
  const location = useLocation();
  api = params;
  return <output data-testid="search">{location.search}</output>;
}

function renderBarAt(search: string) {
  api = null;
  return render(
    <MemoryRouter initialEntries={[`/stats/visitors${search}`]}>
      <FilterBarHarness />
    </MemoryRouter>,
  );
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
    renderBarAt('?page=3');
    expect(currentApi().page).toBe(3);

    await afterDebounce();

    expect(currentApi().page).toBe(3);
    expect(searchText()).toContain('page=3');
  });

  it('검색어가 있는 채로 ?page=3 으로 들어와도 page 가 그대로다', async () => {
    vi.useFakeTimers();
    renderBarAt('?q=원피스&page=3');

    await afterDebounce();

    expect(currentApi().page).toBe(3);
    expect(currentApi().keyword).toBe('원피스');
  });

  it('검색어가 **실제로 바뀌면** 1페이지로 되돌린다 — 가드가 과하지 않다', () => {
    renderAt('?q=원피스&page=3');
    act(() => {
      currentApi().setKeyword('바지');
    });
    expect(currentApi().page).toBe(1);
    expect(currentApi().keyword).toBe('바지');
  });

  it('검색어를 지우는 것도 조건 변경이다 — 1페이지로 되돌린다', () => {
    renderAt('?q=원피스&page=3');
    act(() => {
      currentApi().setKeyword('');
    });
    expect(currentApi().page).toBe(1);
    expect(searchText()).not.toContain('q=');
  });
});
