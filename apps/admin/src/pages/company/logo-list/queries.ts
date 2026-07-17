// 로고 목록 도메인 훅
//
// 화면은 여기 도메인 훅만 부른다. resource(쿼리 키 루트, 예: 'partners'/'clients')와 adapter 를
// 받아 파트너사·고객사가 같은 훅을 각자의 저장소로 쓴다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { settleAll } from '../../../shared/bulk';
import type { LogoAdapter } from './adapter';
import type { LogoInput, LogoItem } from './types';

const listKey = (resource: string) => [resource, 'list'] as const;

export function useLogosQuery(
  resource: string,
  adapter: LogoAdapter,
): UseQueryResult<readonly LogoItem[], Error> {
  return useQuery({
    queryKey: listKey(resource),
    queryFn: ({ signal }) => adapter.fetchAll(signal),
    placeholderData: (previous) => previous,
  });
}

interface CreateVars {
  readonly input: LogoInput;
  readonly signal: AbortSignal;
}

export function useCreateLogo(resource: string, adapter: LogoAdapter) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars) => adapter.create(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface UpdateVars {
  readonly id: string;
  readonly input: LogoInput;
  readonly signal: AbortSignal;
}

export function useUpdateLogo(resource: string, adapter: LogoAdapter) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars) => adapter.update(id, input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useDeleteLogo(resource: string, adapter: LogoAdapter) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteVars) => adapter.remove(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly signal: AbortSignal;
}

/** 일괄 삭제 — 부분 실패도 건수(반환값)로 알린다 */
export function useBulkDeleteLogos(resource: string, adapter: LogoAdapter) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) =>
      settleAll(ids, (id) => adapter.remove(id, signal)),
    onSuccess: (failed, { signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface SetActiveVars {
  readonly id: string;
  readonly active: boolean;
  readonly signal: AbortSignal;
}

/** 노출 여부 토글 — 낙관적 업데이트 후 실패 시 스냅샷으로 롤백(재정렬과 같은 규칙) */
export function useSetLogoActive(resource: string, adapter: LogoAdapter) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active, signal }: SetActiveVars) => adapter.setActive(id, active, signal),
    onMutate: async ({ id, active }) => {
      await client.cancelQueries({ queryKey: listKey(resource) });
      const snapshot = client.getQueryData<readonly LogoItem[]>(listKey(resource));
      client.setQueryData<readonly LogoItem[]>(listKey(resource), (old) =>
        old?.map((item) => (item.id === id ? { ...item, active } : item)),
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      if (context?.snapshot !== undefined) {
        client.setQueryData(listKey(resource), context.snapshot);
      }
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface ReorderVars {
  readonly orderedIds: readonly string[];
  readonly signal: AbortSignal;
}

/** 드래그/키보드 재정렬 — 낙관적 업데이트 후 실패 시 롤백(콘텐츠 목록과 같은 규칙) */
export function useReorderLogos(resource: string, adapter: LogoAdapter) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds, signal }: ReorderVars) => adapter.reorder(orderedIds, signal),
    onMutate: async ({ orderedIds }) => {
      await client.cancelQueries({ queryKey: listKey(resource) });
      const snapshot = client.getQueryData<readonly LogoItem[]>(listKey(resource));
      client.setQueryData<readonly LogoItem[]>(listKey(resource), (old) => {
        if (old === undefined) return old;
        const byId = new Map(old.map((item) => [item.id, item]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((item): item is LogoItem => item !== undefined);
        if (reordered.length !== old.length) return old;
        return reordered.map((item, index) => ({ ...item, order: index + 1 }));
      });
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      if (context?.snapshot !== undefined) {
        client.setQueryData(listKey(resource), context.snapshot);
      }
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}
