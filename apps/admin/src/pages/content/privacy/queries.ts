// 개인정보 처리방침 도메인 훅 (ADR-0008 §7.1 집행)
//
// 화면은 여기 도메인 훅만 부른다 — data-source.ts 본문이 fixture → HTTP 로 바뀌어도 화면에
// 도달하지 않는다. 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { settleAll } from '../../../shared/bulk';
import {
  createPrivacyVersion,
  deletePrivacyVersion,
  fetchPrivacyVersion,
  fetchPrivacyVersions,
  updatePrivacyVersion,
} from './data-source';
import type { PrivacyVersionInput } from './data-source';
import type { PrivacyVersion } from './types';

const privacyKeys = {
  all: ['privacy'] as const,
  versions: () => [...privacyKeys.all, 'versions'] as const,
  version: (id: string) => [...privacyKeys.all, 'version', id] as const,
} as const;

export function usePrivacyVersionsQuery(): UseQueryResult<readonly PrivacyVersion[], Error> {
  return useQuery({
    queryKey: privacyKeys.versions(),
    queryFn: ({ signal }) => fetchPrivacyVersions(signal),
    placeholderData: (previous) => previous,
  });
}

export function usePrivacyVersionQuery(id: string): UseQueryResult<PrivacyVersion, Error> {
  return useQuery({
    queryKey: privacyKeys.version(id),
    queryFn: ({ signal }) => fetchPrivacyVersion(id, signal),
    enabled: id !== '',
  });
}

interface CreateVars {
  readonly input: PrivacyVersionInput;
  readonly signal: AbortSignal;
}

export function useCreatePrivacyVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars) => createPrivacyVersion(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: privacyKeys.versions() });
    },
  });
}

interface UpdateVars {
  readonly id: string;
  readonly input: PrivacyVersionInput;
  readonly signal: AbortSignal;
}

export function useUpdatePrivacyVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars) => updatePrivacyVersion(id, input, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: privacyKeys.versions() });
      void client.invalidateQueries({ queryKey: privacyKeys.version(id) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useDeletePrivacyVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteVars) => deletePrivacyVersion(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: privacyKeys.versions() });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly signal: AbortSignal;
}

/** 일괄 삭제 — 선택된 버전 전원. 부분 실패도 건수(반환값)로 알린다 */
export function useBulkDeletePrivacyVersions() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) =>
      settleAll(ids, (id) => deletePrivacyVersion(id, signal)),
    onSuccess: (failed, { signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: privacyKeys.versions() });
    },
  });
}
