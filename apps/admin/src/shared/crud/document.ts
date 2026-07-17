// 단일 문서(회사당 1건) 저장소 + 도메인 훅 (앱 공용 선언적 CRUD 프레임워크)
//
// 단일 문서형 4종(회사 정보·CEO 인사말·비전·미션·오시는 길)이 같은 규약을 쓴다: 문서 1건을 불러오고
// 저장한다. 각 화면이 useQuery/useMutation 을 복사하는 대신 여기 한 벌만 둔다.
//
// [백엔드 연동 지점] 픽스처를 들고 있는 store 의 fetch/save 본문이 프론트 ↔ 백엔드 계약이다. 실제
// 엔드포인트(GET/PUT /api/company/*)는 각 화면의 data-source.ts 의 // TODO(backend) 주석에 적힌다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { wait } from '../async';
import { failIfRequested, LATENCY_MS } from './dev';

interface DocumentStore<T> {
  /** 문서 1건 조회 — 백엔드가 붙으면 GET 으로 바뀐다 */
  readonly fetch: (signal: AbortSignal) => Promise<T>;
  /** 문서 1건 저장(덮어쓰기) — 백엔드가 붙으면 PUT 으로 바뀐다 */
  readonly save: (input: T, signal?: AbortSignal) => Promise<void>;
}

/** 픽스처 1건을 들고 fetch/save 를 흉내 내는 저장소를 만든다(mutable — save 가 갱신한다). */
export function createDocumentStore<T>(scope: string, seed: T): DocumentStore<T> {
  let doc = seed;
  return {
    async fetch(signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'load');
      return doc;
    },
    async save(input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'save');
      doc = input;
    },
  };
}

export function useDocumentQuery<T>(
  key: readonly unknown[],
  store: DocumentStore<T>,
): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => store.fetch(signal),
  });
}

interface SaveVars<T> {
  readonly input: T;
  readonly signal: AbortSignal;
}

export function useSaveDocument<T>(
  key: readonly unknown[],
  store: DocumentStore<T>,
): UseMutationResult<void, Error, SaveVars<T>> {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: SaveVars<T>) => store.save(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
}
