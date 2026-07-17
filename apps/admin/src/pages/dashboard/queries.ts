// 대시보드 도메인 훅 (ADR-0008 §7.1 집행)
//
// 화면은 useQuery 를 직접 부르지 않는다 — 여기 도메인 훅만 부른다.
// 조회 대상은 api.ts / stats-api.ts 의 fixture 어댑터다 (실제 HTTP 호출 0건).
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchTabData } from './api';
import { fetchStats } from './stats-api';
import type { StatsData, StatsRange } from './stats-types';
import type { TabData, TabId } from './types';

const dashboardKeys = {
  all: ['dashboard'] as const,
  tab: (tab: TabId) => [...dashboardKeys.all, 'tab', tab] as const,
  stats: (range: StatsRange) => [...dashboardKeys.all, 'stats', range] as const,
} as const;

/**
 * @param enabled 권한이 꺼진 위젯은 조회하지 않는다.
 *   `enabled: false` 면 react-query 는 요청을 만들지 않고 `isFetching` 이 false 로 남는다 —
 *   `useAsyncData(fetcher, deps, enabled=false)` 가 `{data:null, loading:false, error:null}` 이던 것과 같다.
 */
export function useTabDataQuery(tab: TabId, enabled: boolean): UseQueryResult<TabData, Error> {
  return useQuery({
    queryKey: dashboardKeys.tab(tab),
    queryFn: ({ signal }) => fetchTabData(tab, signal),
    enabled,
    // 탭을 바꾸는 동안 이전 탭 데이터를 유지한다 — useAsyncData 는 재조회 중 data 를 비우지 않았다
    placeholderData: (previous) => previous,
  });
}

export function useStatsQuery(
  range: StatsRange,
  enabled: boolean,
): UseQueryResult<StatsData, Error> {
  return useQuery({
    queryKey: dashboardKeys.stats(range),
    queryFn: ({ signal }) => fetchStats(range, signal),
    enabled,
    placeholderData: (previous) => previous,
  });
}
