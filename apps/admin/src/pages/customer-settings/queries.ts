// 고객 설정(등급 정책) 도메인 훅 (ADR-0008 §7.1 집행)
//
// 화면은 useQuery/useMutation 을 직접 부르지 않는다 — 여기 도메인 훅만 부른다.
// 조회/저장 대상은 data-source.ts 의 fixture 어댑터다 (실제 HTTP 호출 0건).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchTierPolicy, saveTierPolicy } from './data-source';
import type { TierPolicy } from './types';

const tierPolicyKeys = {
  all: ['tier-policy'] as const,
  detail: () => [...tierPolicyKeys.all, 'detail'] as const,
} as const;

export function useTierPolicyQuery(): UseQueryResult<TierPolicy, Error> {
  return useQuery({
    queryKey: tierPolicyKeys.detail(),
    queryFn: ({ signal }) => fetchTierPolicy(signal),
  });
}

interface SaveTierPolicyVars {
  readonly policy: TierPolicy;
  /** 저장 다이얼로그를 닫으면 진행 중이던 저장을 취소한다 — 뮤테이션에는 signal 이 없어 화면이 넘긴다 */
  readonly signal: AbortSignal;
}

export function useSaveTierPolicy() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ policy, signal }: SaveTierPolicyVars) => saveTierPolicy(policy, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: tierPolicyKeys.all });
    },
  });
}
