// 목록 상태의 단일 원천 = **URL** (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [IA-13 — 왜 useState 가 아니라 쿼리스트링인가]
//
// 감사 화면의 핵심 운영 루프는 이것이다: 조건을 좁히고 → 몇 페이지를 넘기고 → 한 건을 열어보고
// → **"이거 좀 봐주세요" 하며 링크를 붙여넣는다.** 상태가 컴포넌트의 useState 에만 있으면
//   · 새로고침(F5) 한 번에 30초짜리 셋업이 사라지고,
//   · 링크를 받은 사람은 **필터 없는 1페이지**를 보며 "안 보이는데요?" 라고 답한다.
// 감사는 혼자 하는 일이 아니다 — 공유되지 않는 조회 조건은 조회 조건이 아니다.
//
// 그래서 기간·필터·검색어·정렬·페이지·페이지 크기가 전부 URL 에 실린다. URL 이 곧 view 다.
//
// [기본값은 URL 에 쓰지 않는다] '최근 30일 · 전체 · 1페이지'는 URL 을 더럽히기만 하고
// 아무것도 복원하지 않는다. **기본과 다를 때만** 쿼리에 나타난다 — 그래서 붙여넣는 링크가 짧고,
// 링크에 남은 파라미터는 전부 '누군가 의도적으로 바꾼 것'이 된다.
//
// [push 와 replace 를 가른다]
//   · 필터·기간·정렬·페이지 = **의도적 조작** → history 에 쌓는다(push). 뒤로가기로 되돌린다.
//   · 검색어 = 타이핑의 부산물 → replace. 한 글자마다 history 항목이 쌓이면 뒤로가기가
//     '지웠다 썼다'를 되감는 기계가 된다.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { presetRange } from './period';
import {
  ALL_FILTER,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PERIOD,
  DEFAULT_SORT,
  isPageSize,
  isPeriodId,
  isSortDirection,
  TIME_COLUMN,
} from './types';
import type { LogFilterAxis, PageSize, PeriodId, SortState } from './types';
import type { CustomRangeDraft } from './validation';

/* ── 쿼리 파라미터 이름 ──────────────────────────────────────────────────── */

const PARAM = {
  period: 'period',
  from: 'from',
  to: 'to',
  keyword: 'q',
  page: 'page',
  size: 'size',
  sortKey: 'sort',
  sortDir: 'dir',
} as const;

/** 축 key 가 위 이름과 겹치면 조용히 덮어써진다 — 겹치지 않는 이름만 쓴다는 계약을 여기서 못 박는다 */
const RESERVED: ReadonlySet<string> = new Set<string>(Object.values(PARAM));

/* ── 읽기 (URL → 상태) ───────────────────────────────────────────────────── */

function readPeriod(params: URLSearchParams): PeriodId {
  const raw = params.get(PARAM.period);
  return raw !== null && isPeriodId(raw) ? raw : DEFAULT_PERIOD;
}

function readPage(params: URLSearchParams): number {
  const raw = Number(params.get(PARAM.page));
  return Number.isInteger(raw) && raw >= 1 ? raw : 1;
}

function readPageSize(params: URLSearchParams): PageSize {
  const raw = Number(params.get(PARAM.size));
  return isPageSize(raw) ? raw : DEFAULT_PAGE_SIZE;
}

function readSort(params: URLSearchParams, sortableKeys: readonly string[]): SortState {
  const key = params.get(PARAM.sortKey);
  const dir = params.get(PARAM.sortDir);
  if (key === null || !sortableKeys.includes(key)) return DEFAULT_SORT;
  return { key, direction: dir !== null && isSortDirection(dir) ? dir : 'desc' };
}

/** 축의 선택값 — 그 축이 실제로 가진 옵션만 통과시킨다 (URL 은 사용자가 손으로 고칠 수 있다) */
function readAxes(
  params: URLSearchParams,
  axes: readonly LogFilterAxis[],
): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const axis of axes) {
    const raw = params.get(axis.key);
    const known = raw !== null && axis.options.some((option) => option.id === raw);
    out[axis.key] = known ? raw : ALL_FILTER;
  }
  return out;
}

/* ── 상태 ────────────────────────────────────────────────────────────────── */

interface LogListState {
  readonly period: PeriodId;
  readonly draft: CustomRangeDraft;
  readonly keyword: string;
  readonly page: number;
  readonly pageSize: PageSize;
  readonly sort: SortState;
  readonly axes: Readonly<Record<string, string>>;
}

interface LogListStateApi {
  readonly state: LogListState;
  readonly setPeriod: (period: PeriodId) => void;
  readonly setDraft: (draft: CustomRangeDraft) => void;
  readonly setKeyword: (keyword: string) => void;
  readonly setPage: (page: number) => void;
  readonly setPageSize: (size: PageSize) => void;
  /** 같은 컬럼이면 방향을 뒤집고, 다른 컬럼이면 그 컬럼의 기본 방향으로 (ERP-04) */
  readonly toggleSort: (key: string) => void;
  readonly setAxis: (axisKey: string, value: string) => void;
  /** 검색어만 지운다 (STATE-05 (b) 검색 결과 없음의 복구 수단) */
  readonly clearSearch: () => void;
  /** 필터를 전부 기본값으로 (STATE-05 (c) 필터 결과 없음의 복구 수단) */
  readonly resetFilters: () => void;
  readonly hasQuery: boolean;
  readonly hasActiveFilters: boolean;
}

/**
 * 시각 컬럼은 **내림차순이 기본**이다 (최신이 위). 나머지는 오름차순으로 시작한다 —
 * 이름·경로를 정렬하는 사람은 'ㄱ 부터'를 기대한다.
 */
function defaultDirectionOf(key: string): SortState['direction'] {
  return key === TIME_COLUMN ? 'desc' : 'asc';
}

/**
 * @param axes         좌측 필터 축 — URL 파라미터 이름과 허용 값의 원천
 * @param sortableKeys 정렬 가능한 **컬럼** id 목록 (셸이 columns 에서 만들어 넘긴다).
 *                     URL 은 사용자가 손으로 고칠 수 있다 — 목록에 없는 sort 값은 기본 정렬로 떨어뜨린다.
 */
export function useLogListState(
  axes: readonly LogFilterAxis[],
  sortableKeys: readonly string[],
): LogListStateApi {
  const [params, setParams] = useSearchParams();

  const period = readPeriod(params);
  const page = readPage(params);
  const pageSize = readPageSize(params);
  const keyword = params.get(PARAM.keyword) ?? '';

  const sort = readSort(params, sortableKeys);

  const axisValues = useMemo(() => readAxes(params, axes), [params, axes]);

  // 직접 지정의 초기값 = 지금 보고 있던 프리셋 구간. '직접 지정'을 눌렀는데 입력이 비어
  // 결과가 사라지는 일이 없다 — 사용자는 좁히거나 넓히기만 하면 된다.
  const fallback = useMemo(() => presetRange('last-30d'), []);
  const draft: CustomRangeDraft = {
    from: params.get(PARAM.from) ?? fallback.from,
    to: params.get(PARAM.to) ?? fallback.to,
  };

  /**
   * URL 갱신의 유일한 통로.
   * `mutate` 가 받는 것은 **현재 파라미터의 사본**이다 — 함수형 갱신이라 연달아 호출해도
   * 앞의 변경을 잃지 않는다.
   */
  const update = useCallback(
    (mutate: (next: URLSearchParams) => void, options?: { readonly replace?: boolean }) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          mutate(next);
          return next;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setParams],
  );

  /** 조건이 바뀌면 1페이지부터 — 뒤쪽 페이지를 보다 필터를 바꾸면 빈 화면이 뜨는 걸 막는다 (STATE-04) */
  const resetPage = (next: URLSearchParams) => {
    next.delete(PARAM.page);
  };

  const setPeriod = useCallback(
    (value: PeriodId) => {
      update((next) => {
        if (value === DEFAULT_PERIOD) next.delete(PARAM.period);
        else next.set(PARAM.period, value);

        // 프리셋으로 돌아가면 직접 지정 값은 URL 에서 사라진다 — 쓰이지 않는 값을 남기지 않는다
        if (value !== 'custom') {
          next.delete(PARAM.from);
          next.delete(PARAM.to);
        }
        resetPage(next);
      });
    },
    [update],
  );

  const setDraft = useCallback(
    (value: CustomRangeDraft) => {
      update((next) => {
        next.set(PARAM.period, 'custom');
        next.set(PARAM.from, value.from);
        next.set(PARAM.to, value.to);
        resetPage(next);
      });
    },
    [update],
  );

  const setKeyword = useCallback(
    (value: string) => {
      update(
        (next) => {
          if (value === '') next.delete(PARAM.keyword);
          else next.set(PARAM.keyword, value);
          resetPage(next);
        },
        // 타이핑은 history 를 쌓지 않는다
        { replace: true },
      );
    },
    [update],
  );

  const setPage = useCallback(
    (value: number) => {
      update((next) => {
        if (value <= 1) next.delete(PARAM.page);
        else next.set(PARAM.page, String(value));
      });
    },
    [update],
  );

  const setPageSize = useCallback(
    (value: PageSize) => {
      update((next) => {
        if (value === DEFAULT_PAGE_SIZE) next.delete(PARAM.size);
        else next.set(PARAM.size, String(value));
        // 페이지 크기가 바뀌면 지금 페이지 번호는 다른 곳을 가리킨다 — 처음으로 돌린다
        resetPage(next);
      });
    },
    [update],
  );

  const toggleSort = useCallback(
    (key: string) => {
      update((next) => {
        const currentKey = next.get(PARAM.sortKey) ?? DEFAULT_SORT.key;
        const currentDir = next.get(PARAM.sortDir) ?? DEFAULT_SORT.direction;
        const direction =
          currentKey === key ? (currentDir === 'asc' ? 'desc' : 'asc') : defaultDirectionOf(key);

        if (key === DEFAULT_SORT.key && direction === DEFAULT_SORT.direction) {
          next.delete(PARAM.sortKey);
          next.delete(PARAM.sortDir);
        } else {
          next.set(PARAM.sortKey, key);
          next.set(PARAM.sortDir, direction);
        }
      });
    },
    [update],
  );

  const setAxis = useCallback(
    (axisKey: string, value: string) => {
      if (RESERVED.has(axisKey)) return;
      update((next) => {
        if (value === ALL_FILTER) next.delete(axisKey);
        else next.set(axisKey, value);
        resetPage(next);
      });
    },
    [update],
  );

  const clearSearch = useCallback(() => {
    update((next) => {
      next.delete(PARAM.keyword);
      resetPage(next);
    });
  }, [update]);

  const resetFilters = useCallback(() => {
    update((next) => {
      for (const axis of axes) next.delete(axis.key);
      next.delete(PARAM.period);
      next.delete(PARAM.from);
      next.delete(PARAM.to);
      resetPage(next);
    });
  }, [update, axes]);

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters =
    period !== DEFAULT_PERIOD || Object.values(axisValues).some((value) => value !== ALL_FILTER);

  return {
    state: { period, draft, keyword, page, pageSize, sort, axes: axisValues },
    setPeriod,
    setDraft,
    setKeyword,
    setPage,
    setPageSize,
    toggleSort,
    setAxis,
    clearSearch,
    resetFilters,
    hasQuery,
    hasActiveFilters,
  };
}

/* ── 검색 입력 (COMP-10 — 한글 IME) ──────────────────────────────────────── */

/** 타이핑 한 글자마다 조회하지 않는다 */
const SEARCH_DEBOUNCE_MS = 250;

export interface SearchInputApi {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onCompositionStart: () => void;
  readonly onCompositionEnd: (value: string) => void;
  /** 조합 중의 Enter 는 submit 이 아니다 — true 면 호출부가 그 키를 무시한다 */
  readonly shouldIgnoreKey: (isComposing: boolean) => boolean;
}

/**
 * 검색 입력의 상태 — **조합(composition)이 끝나야 조회한다.**
 *
 * [왜 필요한가 — COMP-10]
 * 한국 운영자는 전부 IME 로 입력한다. '홍길동' 을 치면 브라우저는 ㅎ → 호 → 홀 → 홍 …
 * 자모마다 change 이벤트를 쏜다. 그대로 조회하면
 *   · 완성된 단어 하나에 **10번 넘는 조회**가 나가고,
 *   · 그중 늦게 도착한 '홀' 의 응답이 '홍길동' 의 응답을 덮어쓴다(last-response-wins).
 * 그래서 **조합 중에는 아무것도 커밋하지 않는다.** 조합이 끝난 뒤 디바운스가 한 번 돈다.
 *
 * [조합이 끝난 것을 어떻게 아는가] `composing` 이 true → false 로 바뀌면 아래 effect 가
 * 다시 돌면서 타이머를 건다. 조합 중에는 early return 이라 타이머 자체가 존재하지 않는다 —
 * 즉 조합 중 발생한 자모 단위 입력은 **커밋 후보가 되지 못한다.**
 *
 * [순서 뒤바뀐 응답] 커밋된 검색어는 react-query 의 **쿼리 키**가 된다. 늦게 도착한 이전
 * 검색어의 응답은 자기 키의 캐시로 들어갈 뿐 화면이 보는 키(최신 검색어)를 건드리지 못한다 —
 * 최신 키의 결과가 언제나 이긴다.
 */
export function useSearchInput(
  committed: string,
  onCommit: (value: string) => void,
): SearchInputApi {
  const [value, setValue] = useState(committed);
  const [composing, setComposing] = useState(false);

  // URL 이 밖에서 바뀌면(뒤로가기·링크 진입·'검색 지우기') 입력칸이 따라온다.
  // 타이핑 중에는 URL 이 곧 이 입력에서 나온 값이므로 이 동기화는 무해하다.
  const committedRef = useRef(committed);
  useEffect(() => {
    if (committedRef.current === committed) return;
    committedRef.current = committed;
    setValue(committed);
  }, [committed]);

  useEffect(() => {
    // 조합 중에는 타이머를 걸지 않는다 — 자모 단위 입력은 커밋되지 않는다
    if (composing) return undefined;
    if (value === committedRef.current) return undefined;

    const timer = setTimeout(() => {
      committedRef.current = value;
      onCommit(value);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, composing, onCommit]);

  return {
    value,
    onChange: setValue,
    onCompositionStart: () => setComposing(true),
    onCompositionEnd: (next: string) => {
      setValue(next);
      setComposing(false);
    },
    shouldIgnoreKey: (isComposing: boolean) => isComposing,
  };
}
