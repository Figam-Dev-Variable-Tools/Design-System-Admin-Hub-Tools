// 약관 도메인 훅 (A41 — ADR-0008 §7.1 집행)
//
// 화면은 여기 도메인 훅만 부른다 — data-source.ts 본문이 fixture → HTTP 로 바뀌어도 화면에
// 도달하지 않는다. 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import {
  createTermsVersion,
  deleteTermsVersion,
  fetchTermsTypes,
  fetchTermsVersions,
  updateTermsVersion,
} from './data-source';
import type { TermsVersionInput } from './data-source';
import type { TermsType, TermsVersion } from './types';

const termsKeys = {
  all: ['terms'] as const,
  types: () => [...termsKeys.all, 'types'] as const,
  versions: (typeId: string) => [...termsKeys.all, 'versions', typeId] as const,
} as const;

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
    onSuccess: (_result, { input }) => {
      void client.invalidateQueries({ queryKey: termsKeys.versions(input.typeId) });
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
