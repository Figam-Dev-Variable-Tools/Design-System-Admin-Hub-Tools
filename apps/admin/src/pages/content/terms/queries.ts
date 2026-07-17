// 약관 도메인 훅 (ADR-0008 §7.1 집행)
//
// 화면은 여기 도메인 훅만 부른다 — data-source.ts 본문이 fixture → HTTP 로 바뀌어도 화면에
// 도달하지 않는다. 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { settleAll } from '../../../shared/bulk';
import {
  createTermsVersion,
  deleteTermsVersion,
  fetchTermsTypes,
  fetchTermsVersion,
  fetchTermsVersions,
  updateTermsVersion,
} from './data-source';
import type { TermsVersionInput } from './data-source';
import type { TermsType, TermsVersion } from './types';

const termsKeys = {
  all: ['terms'] as const,
  types: () => [...termsKeys.all, 'types'] as const,
  versions: (typeId: string) => [...termsKeys.all, 'versions', typeId] as const,
  version: (id: string) => [...termsKeys.all, 'version', id] as const,
} as const;

export function useTermsVersionQuery(id: string): UseQueryResult<TermsVersion, Error> {
  return useQuery({
    queryKey: termsKeys.version(id),
    queryFn: ({ signal }) => fetchTermsVersion(id, signal),
    enabled: id !== '',
  });
}

export function useTermsTypesQuery(): UseQueryResult<readonly TermsType[], Error> {
  return useQuery({
    queryKey: termsKeys.types(),
    queryFn: ({ signal }) => fetchTermsTypes(signal),
  });
}

export function useTermsVersionsQuery(
  typeId: string,
): UseQueryResult<readonly TermsVersion[], Error> {
  return useQuery({
    queryKey: termsKeys.versions(typeId),
    queryFn: ({ signal }) => fetchTermsVersions(typeId, signal),
    enabled: typeId !== '',
    placeholderData: (previous) => previous,
  });
}

interface CreateVars {
  readonly input: TermsVersionInput;
  readonly signal: AbortSignal;
}

export function useCreateTermsVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars) => createTermsVersion(input, signal),
    onSuccess: (_result, { input }) => {
      void client.invalidateQueries({ queryKey: termsKeys.versions(input.typeId) });
    },
  });
}

interface UpdateVars {
  readonly id: string;
  readonly input: TermsVersionInput;
  readonly signal: AbortSignal;
}

export function useUpdateTermsVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars) => updateTermsVersion(id, input, signal),
    onSuccess: (_result, { id, input }) => {
      void client.invalidateQueries({ queryKey: termsKeys.versions(input.typeId) });
      void client.invalidateQueries({ queryKey: termsKeys.version(id) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly typeId: string;
  readonly signal: AbortSignal;
}

export function useDeleteTermsVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteVars) => deleteTermsVersion(id, signal),
    onSuccess: (_result, { typeId }) => {
      void client.invalidateQueries({ queryKey: termsKeys.versions(typeId) });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly typeId: string;
  readonly signal: AbortSignal;
}

/** 일괄 삭제 — 선택된 버전 전원(같은 종류). 부분 실패도 건수(반환값)로 알린다 */
export function useBulkDeleteTermsVersions() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) =>
      settleAll(ids, (id) => deleteTermsVersion(id, signal)),
    onSuccess: (failed, { typeId, signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: termsKeys.versions(typeId) });
    },
  });
}
