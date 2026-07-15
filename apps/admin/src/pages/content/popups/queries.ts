// 팝업 도메인 훅 (A41 — ADR-0008 §7.1 집행)
//
// 화면은 여기 도메인 훅만 부른다 — data-source.ts 본문이 fixture → HTTP 로 바뀌어도 화면에
// 도달하지 않는다. 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { settleAll } from '../../../shared/bulk';
import {
  createPopup,
  deletePopup,
  fetchNextPopupPriority,
  fetchPopup,
  fetchPopups,
  setPopupEnabled,
  updatePopup,
} from './data-source';
import type { PopupInput, PopupQuery } from './data-source';
import type { Popup, PopupListResult } from './types';

const popupKeys = {
  all: ['popups'] as const,
  lists: () => [...popupKeys.all, 'list'] as const,
  list: (query: PopupQuery) => [...popupKeys.lists(), query] as const,
  detail: (id: string) => [...popupKeys.all, 'detail', id] as const,
} as const;

export function usePopupsQuery(query: PopupQuery): UseQueryResult<PopupListResult, Error> {
  return useQuery({
    queryKey: popupKeys.list(query),
    queryFn: ({ signal }) => fetchPopups(query, signal),
    placeholderData: (previous) => previous,
  });
}

export function usePopupQuery(id: string): UseQueryResult<Popup, Error> {
  return useQuery({
    queryKey: popupKeys.detail(id),
    queryFn: ({ signal }) => fetchPopup(id, signal),
    enabled: id !== '',
  });
}

interface CreateVars {
  readonly input: PopupInput;
  readonly signal: AbortSignal;
}

export function useCreatePopup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars) => createPopup(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: popupKeys.lists() });
    },
  });
}

interface UpdateVars {
  readonly id: string;
  readonly input: PopupInput;
  readonly signal: AbortSignal;
}

export function useUpdatePopup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars) => updatePopup(id, input, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: popupKeys.lists() });
      void client.invalidateQueries({ queryKey: popupKeys.detail(id) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useDeletePopup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteVars) => deletePopup(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: popupKeys.lists() });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly signal: AbortSignal;
}

/** 일괄 삭제 — 선택된 팝업 전원. 부분 실패도 건수(반환값)로 알린다 */
export function useBulkDeletePopups() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) =>
      settleAll(ids, (id) => deletePopup(id, signal)),
    onSuccess: (failed, { signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: popupKeys.lists() });
    },
  });
}

/** 새 팝업 등록 폼의 우선순위 기본값 — 현재 최대 + 1 (자동 채움, 편집 가능) */
export function useNextPopupPriority(enabled: boolean): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: [...popupKeys.all, 'next-priority'],
    queryFn: ({ signal }) => fetchNextPopupPriority(signal),
    enabled,
  });
}

interface SetEnabledVars {
  readonly id: string;
  readonly enabled: boolean;
}

/** 목록에서 바로 ON/OFF 토글 — 낙관적 업데이트 후 실패 시 롤백. 토스트는 호출부가 띄운다 */
export function useSetPopupEnabled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: SetEnabledVars) => setPopupEnabled(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await client.cancelQueries({ queryKey: popupKeys.lists() });
      const snapshot = client.getQueriesData<PopupListResult>({ queryKey: popupKeys.lists() });
      client.setQueriesData<PopupListResult>({ queryKey: popupKeys.lists() }, (old) =>
        old === undefined
          ? old
          : {
              ...old,
              popups: old.popups.map((popup) => (popup.id === id ? { ...popup, enabled } : popup)),
            },
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: popupKeys.lists() });
    },
  });
}

interface BulkSetEnabledVars {
  readonly ids: readonly string[];
  readonly enabled: boolean;
}

/** 일괄 ON/OFF — 선택된 팝업 전원. 부분 실패도 건수(반환값)로 알린다 */
export function useBulkSetPopupEnabled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, enabled }: BulkSetEnabledVars) =>
      settleAll(ids, (id) => setPopupEnabled(id, enabled)),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: popupKeys.lists() });
    },
  });
}
