// 로그인 이력 도메인 훅 (A40 — A41 이 도입한 ADR-0008 §7.1 패턴을 따른다)
//
// **화면은 useQuery/useMutation 을 직접 부르지 않는다.** 여기 도메인 훅만 부른다 —
// 그래야 data-source.ts 의 본문이 fixture → HTTP 로 바뀌어도 화면에 도달하지 않는다.
// (손으로 만든 useAsyncData 는 삭제됐다. 쓰지 않는다.)
//
// [백엔드 없음] 아래 훅이 부르는 것은 전부 data-source.ts 의 **fixture 어댑터**다.
// 실제 네트워크 요청은 이 앱 어디에도 없다 — 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
//
// [무효화(invalidate)가 없다]
// 회원/운영자 훅에는 쓰기 뮤테이션의 onSuccess 마다 invalidateQueries 가 붙어 있다.
// **여기에는 없다. 무효화할 쓰기가 없기 때문이다.** 감사 로그는 이 앱이 바꾸지 않는다 —
// 오직 읽는다. 캐시를 더럽힐 주체가 존재하지 않는다.
import { useMutation, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchLoginHistory, fetchLoginHistoryForExport } from './data-source';
import type { LoginHistoryQuery } from './data-source';
import type { LoginHistoryEntry, LoginHistoryResult } from './types';

const loginHistoryKeys = {
  all: ['login-history'] as const,
  lists: () => [...loginHistoryKeys.all, 'list'] as const,
  list: (query: LoginHistoryQuery) => [...loginHistoryKeys.lists(), query] as const,
} as const;

/* ── 조회 ────────────────────────────────────────────────────────────────── */

interface LoginHistoryQueryOptions {
  /**
   * 기간 '직접 지정'의 입력이 유효하지 않으면 **조회를 걸지 않는다**.
   * 훅은 조건부로 부를 수 없으므로(Rules of Hooks) 화면이 훅을 끄는 스위치를 여기로 넘긴다.
   */
  readonly enabled: boolean;
}

export function useLoginHistoryQuery(
  query: LoginHistoryQuery,
  { enabled }: LoginHistoryQueryOptions,
): UseQueryResult<LoginHistoryResult, Error> {
  return useQuery({
    queryKey: loginHistoryKeys.list(query),
    queryFn: ({ signal }) => fetchLoginHistory(query, signal),
    enabled,
    // 필터/페이지가 바뀌는 동안 이전 목록을 계속 보여준다 — 표가 깜빡이며 비지 않는다
    placeholderData: (previous) => previous,
  });
}

/* ── 내보내기 ────────────────────────────────────────────────────────────── */
//
// **이 화면의 유일한 뮤테이션이다.** 그리고 이것도 서버의 상태를 바꾸지 않는다 —
// 조회 결과를 파일로 받을 뿐이다. 그럼에도 뮤테이션인 이유는 *사용자가 명시적으로 시작한 작업*이고,
// 성공/실패를 토스트로 알려야 하기 때문이다 (shared/ui/README.md 의 토스트 vs 인라인 기준).

interface ExportVars {
  readonly query: LoginHistoryQuery;
  /** 취소 경로 — react-query 는 뮤테이션에 signal 을 주지 않는다. 호출부가 만들어 싣는다 */
  readonly signal: AbortSignal;
}

export function useExportLoginHistory() {
  return useMutation({
    mutationFn: ({ query, signal }: ExportVars): Promise<readonly LoginHistoryEntry[]> =>
      fetchLoginHistoryForExport(query, signal),
  });
}
