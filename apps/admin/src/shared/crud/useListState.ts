// 목록 화면의 조회 상태 (A41 소유 — apps/admin/src/shared/crud/**)
//
// [IA-13 (P0)] page·filter·keyword·sort 의 **단일 원천을 URL 쿼리스트링**으로 옮긴다.
//
// 왜 이것이 P0 인가 — 핵심 운영 루프가 여기서 깨진다:
//   필터를 걸고 3페이지 45번째 행을 열고 브라우저 Back → **필터 없는 1페이지 최상단**에 착지한다.
//   10초의 셋업이 날아간다. F5 도 같다. 운영자는 '이 조건 좀 봐주세요' 하며 필터가 걸린 view 의
//   링크를 공유하는데, 상태가 컴포넌트 useState 에만 있으면 그 링크는 존재할 수 없다.
// 앱 전체에서 useSearchParams grep 이 0건이었다 — shared/crud 는 useNavigate/useParams 만 썼다.
//
// [STATE-04 (P0)] MembersPage 가 이미 옳게 하던 두 가지를 여기로 승격한다:
//   (a) total 이 줄어 현재 page 가 범위를 벗어나면 마지막 유효 page 로 보정한다.
//       다중 관리자 삭제는 일상이다 — 보정이 없으면 1페이지짜리 목록의 2페이지에서 false-empty 를 본다.
//   (b) page/filter/keyword 가 바뀌면 선택을 해제한다 — 보이지 않는 행이 선택된 채 남으면
//       '선택 3건 삭제' 가 화면에 없는 행을 지운다.
//
// [왜 replace 인가] 필터를 만질 때마다 history 항목을 쌓으면 검색어 한 줄 타이핑에 Back 이
// 열 번 필요해진다. replace 로 현재 목록 URL 을 늘 최신 상태로 유지하면, 상세에서 Back 했을 때
// 그 URL(= 필터+페이지)이 그대로 복원된다 — IA-13 이 요구하는 것은 그것뿐이다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompositionEvent, KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useDebouncedSearch } from './useDebouncedSearch';

const PAGE_PARAM = 'page';
const KEYWORD_PARAM = 'q';
const SORT_PARAM = 'sort';

export interface ListStateConfig {
  /**
   * 필터 파라미터의 기본값 — 예: `{ tier: 'all', group: 'all' }`.
   * 기본값과 같은 값은 URL 에서 **지운다**: 공유 링크가 짧아지고, '기본 상태' 의 URL 이 하나로
   * 정해진다(같은 화면이 두 개의 URL 을 갖지 않는다).
   */
  readonly filterDefaults?: Readonly<Record<string, string>>;
  readonly defaultSort?: string;
}

export interface ListState {
  readonly page: number;
  readonly setPage: (page: number) => void;

  /** 커밋된 검색어 — 쿼리 키에 넣는 값 */
  readonly keyword: string;
  /** 입력창에 묶는 값(조합 중 포함) — useDebouncedSearch 가 소유한다 */
  readonly searchInput: string;
  readonly setSearchInput: (value: string) => void;
  /** 검색 입력창에 스프레드한다 — IME 조합 판정과 Enter 차단이 여기 붙어 있다 (COMP-10) */
  readonly searchInputProps: {
    readonly onCompositionStart: (event: CompositionEvent<HTMLInputElement>) => void;
    readonly onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => void;
    readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  };

  readonly filters: Readonly<Record<string, string>>;
  readonly setFilter: (key: string, value: string) => void;

  readonly sort: string;
  readonly setSort: (sort: string) => void;

  /** STATE-05 의 empty 3분기 — 검색 때문인가, 필터 때문인가, 정말 비었나 */
  readonly hasQuery: boolean;
  readonly hasActiveFilters: boolean;
  readonly clearSearch: () => void;
  readonly resetFilters: () => void;

  readonly selectedIds: ReadonlySet<string>;
  readonly toggleOne: (id: string, checked: boolean) => void;
  readonly toggleAll: (ids: readonly string[], checked: boolean) => void;
  readonly clearSelection: () => void;

  /** 총 페이지 수를 알게 된 뒤 호출 — 범위를 벗어난 page 를 보정한다 (STATE-04) */
  readonly clampPage: (totalPages: number) => void;
}

function parsePage(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? '1', 10);
  // 손으로 고친 URL(?page=0 · ?page=abc · ?page=-3)이 빈 목록을 만들지 않게 한다
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function useListState(config: ListStateConfig = {}): ListState {
  const filterDefaults = useMemo(() => config.filterDefaults ?? {}, [config.filterDefaults]);
  const defaultSort = config.defaultSort ?? '';

  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const keyword = searchParams.get(KEYWORD_PARAM) ?? '';
  const sort = searchParams.get(SORT_PARAM) ?? defaultSort;

  const filters = useMemo(() => {
    const entries = Object.keys(filterDefaults).map((key) => [
      key,
      searchParams.get(key) ?? filterDefaults[key] ?? '',
    ]);
    return Object.fromEntries(entries) as Readonly<Record<string, string>>;
  }, [filterDefaults, searchParams]);

  /**
   * URL 갱신의 단일 통로.
   *
   * 기본값과 같은 값은 지운다 — '?tier=all&group=all&page=1' 같은 무의미한 URL 을 만들지 않는다.
   * 함수형 업데이트(prev => next)를 쓰는 이유: 연속 호출(필터 두 개를 잇달아 바꿈)이 서로의
   * 결과를 덮지 않게 한다.
   */
  const patchParams = useCallback(
    (patch: Readonly<Record<string, string>>, options: { readonly resetPage?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          for (const [key, value] of Object.entries(patch)) {
            const fallback = key === PAGE_PARAM ? '1' : (filterDefaults[key] ?? '');
            if (value === '' || value === fallback) next.delete(key);
            else next.set(key, value);
          }

          // 조건이 바뀌면 1페이지부터 — 3페이지를 보다 검색하면 빈 화면이 뜨는 것을 막는다
          if (options.resetPage === true) next.delete(PAGE_PARAM);

          return next;
        },
        { replace: true },
      );
    },
    [filterDefaults, setSearchParams],
  );

  const setPage = useCallback(
    (next: number) => {
      patchParams({ [PAGE_PARAM]: String(next) });
    },
    [patchParams],
  );

  /**
   * 검색어 커밋.
   *
   * [값이 그대로면 아무것도 하지 않는다 — 이 가드가 없으면 IA-13 이 조용히 깨진다]
   * useDebouncedSearch 는 마운트 직후에도 한 번 커밋을 시도한다(현재 입력값 = URL 의 keyword).
   * 그 커밋이 그대로 통과하면 `resetPage` 가 **page 파라미터를 지운다** — `?page=3` 링크로 들어온
   * 사용자가 250ms 뒤 1페이지로 튕긴다. 검색어가 실제로 바뀔 때만 page 를 되돌리는 것이 옳다.
   */
  const commitKeyword = useCallback(
    (next: string) => {
      if (next === keyword) return;
      patchParams({ [KEYWORD_PARAM]: next }, { resetPage: true });
    },
    [keyword, patchParams],
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      // 같은 값을 다시 고르는 것은 이동이 아니다 — page 를 되돌리지 않는다 (commitKeyword 와 같은 이유)
      if (filters[key] === value) return;
      patchParams({ [key]: value }, { resetPage: true });
    },
    [filters, patchParams],
  );

  const setSort = useCallback(
    (next: string) => {
      patchParams({ [SORT_PARAM]: next });
    },
    [patchParams],
  );

  const clearSearch = useCallback(() => {
    commitKeyword('');
  }, [commitKeyword]);

  const resetFilters = useCallback(() => {
    const cleared = Object.fromEntries(Object.keys(filterDefaults).map((key) => [key, '']));
    patchParams(cleared, { resetPage: true });
  }, [filterDefaults, patchParams]);

  const hasQuery = keyword !== '';
  const hasActiveFilters = Object.keys(filterDefaults).some(
    (key) => filters[key] !== filterDefaults[key],
  );

  /* ── 선택 (STATE-04-b) ─────────────────────────────────────────────────── */

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: readonly string[], checked: boolean) => {
    setSelectedIds(checked ? new Set(ids) : new Set());
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다. 서명이 실제로 바뀔 때만 지운다 —
  // 매 렌더 setState 하면 무한 루프이고, StrictMode 의 effect 재실행에도 안전해야 한다.
  const viewSignature = `${String(page)}|${keyword}|${sort}|${JSON.stringify(filters)}`;
  const lastSignatureRef = useRef(viewSignature);
  useEffect(() => {
    if (lastSignatureRef.current === viewSignature) return;
    lastSignatureRef.current = viewSignature;
    setSelectedIds(new Set());
  }, [viewSignature]);

  /* ── 페이지 보정 (STATE-04-a) ──────────────────────────────────────────── */

  const clampPage = useCallback(
    (totalPages: number) => {
      const last = Math.max(1, totalPages);
      if (page > last) setPage(last);
    },
    [page, setPage],
  );

  /* ── 검색 입력 (COMP-10) ───────────────────────────────────────────────── */

  const { input, setInput, inputProps } = useDebouncedSearch({
    initial: keyword,
    onCommit: commitKeyword,
  });

  return {
    page,
    setPage,
    keyword,
    searchInput: input,
    setSearchInput: setInput,
    searchInputProps: inputProps,
    filters,
    setFilter,
    sort,
    setSort,
    hasQuery,
    hasActiveFilters,
    clearSearch,
    resetFilters,
    selectedIds,
    toggleOne,
    toggleAll,
    clearSelection,
    clampPage,
  };
}
