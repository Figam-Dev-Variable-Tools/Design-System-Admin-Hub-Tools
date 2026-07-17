// 운영자(관리자) 도메인 훅 (ADR-0008 §7.1 집행)
//
// 화면은 useQuery 를 직접 부르지 않는다 — 여기 도메인 훅만 부른다.
// 조회 대상은 data-source.ts 의 fixture 어댑터다 (실제 HTTP 호출 0건).
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchAdminGroups, fetchAdmins } from './data-source';
import type { AdminQuery } from './data-source';
import type { AdminGroup, AdminListResult } from './types';

const adminKeys = {
  all: ['admins'] as const,
  lists: () => [...adminKeys.all, 'list'] as const,
  list: (query: AdminQuery) => [...adminKeys.lists(), query] as const,
  groups: () => [...adminKeys.all, 'groups'] as const,
} as const;

export function useAdminsQuery(query: AdminQuery): UseQueryResult<AdminListResult, Error> {
  return useQuery({
    queryKey: adminKeys.list(query),
    queryFn: ({ signal }) => fetchAdmins(query, signal),
    // 필터/페이지 전환 중에도 이전 목록을 유지한다 — useAsyncData 는 재조회 중 data 를 비우지 않았다
    placeholderData: (previous) => previous,
  });
}

export function useAdminGroupsQuery(): UseQueryResult<readonly AdminGroup[], Error> {
  return useQuery({
    queryKey: adminKeys.groups(),
    queryFn: ({ signal }) => fetchAdminGroups(signal),
  });
}
