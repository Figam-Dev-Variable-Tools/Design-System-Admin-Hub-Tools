// API Key 도메인 훅 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// 화면은 useQuery/useMutation 을 직접 부르지 않는다 — 여기 도메인 훅만 부른다
// (customer-settings/queries.ts 와 같은 규약).
//
// [발급 응답을 캐시에 넣지 않는다] createApiKey 는 평문을 돌려주지만 onSuccess 는 **목록만**
// 무효화한다. 평문이 react-query 캐시에 들어가면 devtools·다른 화면에서 읽을 수 있고, 그 순간
// '1회 노출' 이 거짓이 된다 — 평문은 호출부(모달)의 지역 state 로만 흐른다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { apiKeysKey, createApiKey, fetchApiKeys, revokeApiKey } from './data-source';
import type { ApiKey, ApiKeyDraft, ApiKeyIssued } from './types';

export function useApiKeysQuery(): UseQueryResult<readonly ApiKey[], Error> {
  return useQuery({
    queryKey: apiKeysKey,
    queryFn: ({ signal }) => fetchApiKeys(signal),
  });
}

interface CreateVars {
  readonly draft: ApiKeyDraft;
  readonly signal: AbortSignal;
}

export function useCreateApiKey(): UseMutationResult<ApiKeyIssued, Error, CreateVars> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ draft, signal }: CreateVars) => createApiKey(draft, signal),
    onSuccess: () => {
      // 목록만 다시 읽는다 — 평문은 여기서 끝이다(캐시에 남기지 않는다)
      void client.invalidateQueries({ queryKey: apiKeysKey });
    },
  });
}

interface RevokeVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useRevokeApiKey(): UseMutationResult<void, Error, RevokeVars> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: RevokeVars) => revokeApiKey(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: apiKeysKey });
    },
  });
}
