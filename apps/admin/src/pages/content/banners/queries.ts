// 배너 도메인 훅 (A41 — ADR-0008 §7.1 집행)
//
// 화면은 여기 도메인 훅만 부른다 — data-source.ts 본문이 fixture → HTTP 로 바뀌어도 화면에
// 도달하지 않는다. 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { settleAll } from '../../../shared/bulk';
import {
  createBanner,
  deleteBanner,
  fetchBanner,
  fetchBanners,
  fetchNextBannerOrder,
  reorderBanners,
  setBannerEnabled,
  updateBanner,
} from './data-source';
import type { BannerInput, BannerQuery } from './data-source';
import type { Banner, BannerListResult } from './types';

const bannerKeys = {
  all: ['banners'] as const,
  lists: () => [...bannerKeys.all, 'list'] as const,
  list: (query: BannerQuery) => [...bannerKeys.lists(), query] as const,
  detail: (id: string) => [...bannerKeys.all, 'detail', id] as const,
} as const;

export function useBannersQuery(query: BannerQuery): UseQueryResult<BannerListResult, Error> {
  return useQuery({
    queryKey: bannerKeys.list(query),
    queryFn: ({ signal }) => fetchBanners(query, signal),
    placeholderData: (previous) => previous,
  });
}

export function useBannerQuery(id: string): UseQueryResult<Banner, Error> {
  return useQuery({
    queryKey: bannerKeys.detail(id),
    queryFn: ({ signal }) => fetchBanner(id, signal),
    enabled: id !== '',
  });
}

interface CreateVars {
  readonly input: BannerInput;
  readonly signal: AbortSignal;
}

export function useCreateBanner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars) => createBanner(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}

interface UpdateVars {
  readonly id: string;
  readonly input: BannerInput;
  readonly signal: AbortSignal;
}

export function useUpdateBanner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars) => updateBanner(id, input, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: bannerKeys.lists() });
      void client.invalidateQueries({ queryKey: bannerKeys.detail(id) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useDeleteBanner() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteVars) => deleteBanner(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly signal: AbortSignal;
}

/** 일괄 삭제 — 선택된 배너 전원. 부분 실패도 건수(반환값)로 알린다 */
export function useBulkDeleteBanners() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) =>
      settleAll(ids, (id) => deleteBanner(id, signal)),
    onSuccess: (failed, { signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}

/** 새 배너 등록 폼의 정렬 순서 기본값 — 현재 최대 + 1 (자동 채움, 편집 가능) */
export function useNextBannerOrder(enabled: boolean): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: [...bannerKeys.all, 'next-order'],
    queryFn: ({ signal }) => fetchNextBannerOrder(signal),
    enabled,
  });
}

interface SetEnabledVars {
  readonly id: string;
  readonly enabled: boolean;
}

/** 목록에서 바로 ON/OFF 토글 — 낙관적 업데이트 후 실패 시 롤백. 토스트는 호출부가 띄운다 */
export function useSetBannerEnabled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: SetEnabledVars) => setBannerEnabled(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await client.cancelQueries({ queryKey: bannerKeys.lists() });
      const snapshot = client.getQueriesData<BannerListResult>({ queryKey: bannerKeys.lists() });
      client.setQueriesData<BannerListResult>({ queryKey: bannerKeys.lists() }, (old) =>
        old === undefined
          ? old
          : {
              ...old,
              banners: old.banners.map((banner) =>
                banner.id === id ? { ...banner, enabled } : banner,
              ),
            },
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}

interface BulkSetEnabledVars {
  readonly ids: readonly string[];
  readonly enabled: boolean;
}

/** 일괄 ON/OFF — 선택된 배너 전원. 부분 실패도 건수(반환값)로 알린다 */
export function useBulkSetBannerEnabled() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, enabled }: BulkSetEnabledVars) =>
      settleAll(ids, (id) => setBannerEnabled(id, enabled)),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}

interface ReorderVars {
  readonly orderedIds: readonly string[];
  readonly signal: AbortSignal;
}

/**
 * 드래그/키보드 재정렬 — FAQ 와 동일: 낙관적 업데이트 후 실패 시 롤백.
 * 성공/실패 토스트는 호출부(BannersPage)가 띄운다.
 */
export function useReorderBanners() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds, signal }: ReorderVars) => reorderBanners(orderedIds, signal),
    onMutate: async ({ orderedIds }) => {
      await client.cancelQueries({ queryKey: bannerKeys.lists() });
      const snapshot = client.getQueriesData<BannerListResult>({ queryKey: bannerKeys.lists() });
      client.setQueriesData<BannerListResult>({ queryKey: bannerKeys.lists() }, (old) => {
        if (old === undefined) return old;
        const byId = new Map(old.banners.map((banner) => [banner.id, banner]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((banner): banner is Banner => banner !== undefined);
        if (reordered.length !== old.banners.length) return old;
        const orders = old.banners.map((banner) => banner.order).sort((a, b) => a - b);
        return {
          ...old,
          banners: reordered.map((banner, index) => ({
            ...banner,
            order: orders[index] ?? banner.order,
          })),
        };
      });
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: bannerKeys.lists() });
    },
  });
}
