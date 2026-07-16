// 도메인 훅 (apps/admin/src/pages/logs/** — ADR-0008 §7.1 패턴)
//
// **화면은 useQuery/useMutation 을 직접 부르지 않는다.** 여기 도메인 훅만 부른다 —
// 그래야 data-source.ts 의 본문이 fixture → HTTP 로 바뀌어도 화면에 도달하지 않는다.
//
// [무효화(invalidate)가 없다]
// 회원/운영자 훅에는 쓰기 뮤테이션의 onSuccess 마다 invalidateQueries 가 붙어 있다.
// **여기에는 없다. 무효화할 쓰기가 없기 때문이다.** 감사 로그는 이 앱이 바꾸지 않는다 —
// 오직 읽는다. 캐시를 더럽힐 주체가 존재하지 않는다.
//
// [4화면이 훅을 공유한다] 화면마다 다른 것은 항목 타입과 어댑터 함수뿐이다 — 제네릭으로 연다.
// 훅을 4벌 만들면 캐시 키 규약과 placeholderData 설정이 화면마다 어긋난다.
import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { LogEntryBase, LogQuery, LogResult } from './types';

/** 캐시 키 — 스코프(화면)마다 갈라지고, 조회 조건 전체가 키의 일부다 */
const logKeys = {
  all: ['logs'] as const,
  list: (scope: string, query: LogQuery) => [...logKeys.all, scope, 'list', query] as const,
} as const;

/* ── 조회 ────────────────────────────────────────────────────────────────── */

interface LogQueryOptions {
  /**
   * 기간 '직접 지정'의 입력이 유효하지 않으면 **조회를 걸지 않는다**.
   * 훅은 조건부로 부를 수 없으므로(Rules of Hooks) 화면이 훅을 끄는 스위치를 여기로 넘긴다.
   */
  readonly enabled: boolean;
}

/**
 * 목록 조회.
 *
 * [검색어 경쟁 조건 — COMP-10] 검색어는 `query` 의 일부이므로 **쿼리 키의 일부**다.
 * 늦게 도착한 이전 검색어의 응답은 자기 키의 캐시에 담길 뿐, 화면이 구독하는 키(최신 검색어)를
 * 덮어쓰지 못한다. last-response-wins 경쟁이 구조적으로 성립하지 않는다.
 */
export function useLogQuery<E extends LogEntryBase>(
  scope: string,
  query: LogQuery,
  fetcher: (query: LogQuery, signal: AbortSignal) => Promise<LogResult<E>>,
  { enabled }: LogQueryOptions,
): UseQueryResult<LogResult<E>, Error> {
  return useQuery({
    queryKey: logKeys.list(scope, query),
    queryFn: ({ signal }) => fetcher(query, signal),
    enabled,
    // 필터/페이지가 바뀌는 동안 이전 목록을 계속 보여준다 — 표가 깜빡이며 비지 않는다 (STATE-03)
    placeholderData: (previous) => previous,
  });
}

/* ── 내보내기 ────────────────────────────────────────────────────────────── */
//
// **이 섹션의 유일한 뮤테이션이다.** 그리고 이것도 서버의 상태를 바꾸지 않는다 —
// 조회 결과를 파일로 받을 뿐이다. 그럼에도 뮤테이션인 이유는 *사용자가 명시적으로 시작한 작업*이고,
// 성공/실패를 토스트로 알려야 하기 때문이다 (shared/ui/README.md 의 토스트 vs 인라인 기준).

interface ExportVars {
  readonly query: LogQuery;
  /** 취소 경로 — react-query 는 뮤테이션에 signal 을 주지 않는다. 호출부가 만들어 싣는다 */
  readonly signal: AbortSignal;
}

export function useLogExport<E extends LogEntryBase>(
  fetcher: (query: LogQuery, signal: AbortSignal) => Promise<readonly E[]>,
): UseMutationResult<readonly E[], Error, ExportVars> {
  return useMutation({
    mutationFn: ({ query, signal }: ExportVars): Promise<readonly E[]> => fetcher(query, signal),
  });
}
