// FAQ 도메인 훅 (A41 — ADR-0008 §7.1 집행)
//
// 화면은 여기 도메인 훅만 부른다 — data-source.ts 의 본문이 fixture → HTTP 로 바뀌어도
// 화면에 도달하지 않는다. 연동 지점은 data-source.ts 의 // TODO(backend) 주석이다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { settleAll } from '../../../shared/bulk';
import {
  createFaq,
  createFaqCategory,
  deleteFaq,
  deleteFaqCategory,
  fetchFaq,
  fetchFaqCategories,
  fetchFaqCategoryUsage,
  fetchFaqs,
  fetchNextFaqOrder,
  reorderFaqs,
  setFaqVisibility,
  updateFaq,
} from './data-source';
import type { FaqCategoryInput, FaqInput, FaqQuery } from './data-source';
import type { Faq, FaqCategory, FaqCategoryUsage, FaqListResult, FaqSummary } from './types';

const faqKeys = {
  all: ['faqs'] as const,
  lists: () => [...faqKeys.all, 'list'] as const,
  list: (query: FaqQuery) => [...faqKeys.lists(), query] as const,
  detail: (id: string) => [...faqKeys.all, 'detail', id] as const,
  categories: () => [...faqKeys.all, 'categories'] as const,
  categoryUsage: () => [...faqKeys.all, 'category-usage'] as const,
} as const;

/* ── 조회 ────────────────────────────────────────────────────────────────── */

export function useFaqsQuery(query: FaqQuery): UseQueryResult<FaqListResult, Error> {
  return useQuery({
    queryKey: faqKeys.list(query),
    queryFn: ({ signal }) => fetchFaqs(query, signal),
    placeholderData: (previous) => previous,
  });
}

export function useFaqQuery(id: string): UseQueryResult<Faq, Error> {
  return useQuery({
    queryKey: faqKeys.detail(id),
    queryFn: ({ signal }) => fetchFaq(id, signal),
  });
}

export function useFaqCategoriesQuery(): UseQueryResult<readonly FaqCategory[], Error> {
  return useQuery({
    queryKey: faqKeys.categories(),
    queryFn: ({ signal }) => fetchFaqCategories(signal),
  });
}

export function useFaqCategoryUsageQuery(
  enabled: boolean,
): UseQueryResult<readonly FaqCategoryUsage[], Error> {
  return useQuery({
    queryKey: faqKeys.categoryUsage(),
    queryFn: ({ signal }) => fetchFaqCategoryUsage(signal),
    enabled,
  });
}

/* ── 쓰기 ────────────────────────────────────────────────────────────────── */

interface CreateCategoryVars {
  readonly input: FaqCategoryInput;
  readonly signal: AbortSignal;
}

export function useCreateFaqCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateCategoryVars) => createFaqCategory(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: faqKeys.categories() });
      void client.invalidateQueries({ queryKey: faqKeys.categoryUsage() });
    },
  });
}

interface DeleteCategoryVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useDeleteFaqCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteCategoryVars) => deleteFaqCategory(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: faqKeys.categories() });
      void client.invalidateQueries({ queryKey: faqKeys.categoryUsage() });
      void client.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}

interface CreateVars {
  readonly input: FaqInput;
  readonly signal: AbortSignal;
}

export function useCreateFaq() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars) => createFaq(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}

interface UpdateVars {
  readonly id: string;
  readonly input: FaqInput;
  readonly signal: AbortSignal;
}

export function useUpdateFaq() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars) => updateFaq(id, input, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: faqKeys.lists() });
      void client.invalidateQueries({ queryKey: faqKeys.detail(id) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useDeleteFaq() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, signal }: DeleteVars) => deleteFaq(id, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly signal: AbortSignal;
}

/** 일괄 삭제 — 선택된 FAQ 전원. 부분 실패도 건수(반환값)로 알린다 */
export function useBulkDeleteFaqs() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) => settleAll(ids, (id) => deleteFaq(id, signal)),
    onSuccess: (failed, { signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}

/** 새 FAQ 등록 폼의 정렬 순서 기본값 — 현재 최대 + 1 (자동 채움, 편집 가능) */
export function useNextFaqOrder(enabled: boolean): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: [...faqKeys.all, 'next-order'],
    queryFn: ({ signal }) => fetchNextFaqOrder(signal),
    enabled,
  });
}

interface SetVisibilityVars {
  readonly id: string;
  readonly visible: boolean;
}

/**
 * 목록에서 바로 노출 여부를 토글 — 낙관적 업데이트 후 실패 시 롤백(쓰기 액션 규칙).
 * 성공/실패 토스트는 호출부(FaqPage)가 띄운다.
 */
export function useSetFaqVisibility() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, visible }: SetVisibilityVars) => setFaqVisibility(id, visible),
    onMutate: async ({ id, visible }) => {
      await client.cancelQueries({ queryKey: faqKeys.lists() });
      const snapshot = client.getQueriesData<FaqListResult>({ queryKey: faqKeys.lists() });
      client.setQueriesData<FaqListResult>({ queryKey: faqKeys.lists() }, (old) =>
        old === undefined
          ? old
          : { ...old, faqs: old.faqs.map((faq) => (faq.id === id ? { ...faq, visible } : faq)) },
      );
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}

interface BulkSetVisibilityVars {
  readonly ids: readonly string[];
  readonly visible: boolean;
}

/** 일괄 노출/숨김 — 선택된 FAQ 전원. 부분 실패도 건수(반환값)로 알린다 */
export function useBulkSetFaqVisibility() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, visible }: BulkSetVisibilityVars) =>
      settleAll(ids, (id) => setFaqVisibility(id, visible)),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}

interface ReorderVars {
  /** 재정렬 대상(현재 페이지)의 새 순서 id 목록 */
  readonly orderedIds: readonly string[];
  readonly signal: AbortSignal;
}

/**
 * 드래그/키보드 재정렬 — 낙관적 업데이트 후 실패 시 롤백(쓰기 액션 결과 규칙).
 * onMutate 에서 현재 목록 캐시의 행을 즉시 새 순서로 바꿔 지연 없이 반영하고,
 * 실패하면 스냅샷으로 되돌린다. 성공/실패 토스트는 호출부(FaqPage)가 띄운다.
 */
export function useReorderFaqs() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds, signal }: ReorderVars) => reorderFaqs(orderedIds, signal),
    onMutate: async ({ orderedIds }) => {
      await client.cancelQueries({ queryKey: faqKeys.lists() });
      const snapshot = client.getQueriesData<FaqListResult>({ queryKey: faqKeys.lists() });
      client.setQueriesData<FaqListResult>({ queryKey: faqKeys.lists() }, (old) => {
        if (old === undefined) return old;
        const byId = new Map(old.faqs.map((faq) => [faq.id, faq]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((faq): faq is FaqSummary => faq !== undefined);
        // 페이지 구성과 정확히 일치할 때만 낙관적 반영한다(부분 집합이면 건드리지 않는다)
        if (reordered.length !== old.faqs.length) return old;
        // 이 페이지가 쥐고 있던 order 값들을 그대로 유지하되 새 행 순서에 다시 매긴다
        const orders = old.faqs.map((faq) => faq.order).sort((a, b) => a - b);
        return {
          ...old,
          faqs: reordered.map((faq, index) => ({ ...faq, order: orders[index] ?? faq.order })),
        };
      });
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}
