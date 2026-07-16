// 통계 조회 훅 (A40 소유 — apps/admin/src/pages/stats/**)
//
// [ADR-0008 §7.1] 화면은 useQuery 를 직접 부르지 않는다. 6개 통계 화면이 같은 상태 머신을 쓰므로
// 훅도 한 벌이다.
//
// [STATE-01 — 네 상태를 섞지 않는다]
//   first-load          data === undefined && 조회 중  → 스켈레톤만
//   refetching-with-data 이전 data 가 있음             → **이전 값을 그대로 둔다**
//   empty               성공 · 0행                     → Empty 컴포넌트
//   error               조회 실패                       → 인라인 Alert
// isFetching 을 loading 으로 쓰면 재조회마다 표가 스켈레톤으로 번쩍여 운영자가 자리를 잃는다.
// 그래서 loading 은 **isFirstLoad** 이지 isFetching 이 아니다.
//
// [COMP-10 응답 경합] 검색어·기간·세그먼트가 전부 queryKey 에 들어간다. 늦게 도착한 이전
// 조건의 응답은 **다른 키의 캐시**로 들어갈 뿐 현재 화면을 덮지 못한다 — last-response-wins 가
// 구조적으로 불가능하다.
import { keepPreviousData, useQuery } from '@tanstack/react-query';

interface StatsQueryResult<T> {
  readonly data: T | undefined;
  /** 최초 로드 — 이때만 스켈레톤이다 (STATE-01) */
  readonly isFirstLoad: boolean;
  /** 조회 실패 문구. 빈 문자열이면 실패가 아니다 */
  readonly error: string;
  readonly refetch: () => void;
}

/**
 * @param key     조회 조건 전체가 들어가야 한다 — 조건이 바뀌면 다른 캐시다
 * @param fetcher AbortSignal 을 반드시 흘려보낸다 (화면 이탈 시 요청 취소)
 */
export function useStatsQuery<T>(
  key: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
): StatsQueryResult<T> {
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetcher(signal),
    // 조건을 바꾸는 동안 이전 결과를 유지한다 — 표가 빈칸으로 깜빡이지 않는다 (STATE-03)
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data,
    isFirstLoad: query.data === undefined && query.isFetching,
    // 원문 에러 메시지를 그대로 노출하지 않는다 — 서버 내부를 흘리지 않는다 (EXC-20)
    error: query.isError ? '통계를 불러오지 못했습니다.' : '',
    refetch: () => {
      void query.refetch();
    },
  };
}
