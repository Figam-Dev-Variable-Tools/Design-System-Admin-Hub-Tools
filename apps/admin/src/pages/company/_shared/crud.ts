// 목록형 화면 공용 CRUD 키트 (A41 소유 — apps/admin/src/pages/company/**)
//
// 목록 + 상세(등록/수정 폼) + 삭제팝업 을 갖는 기업 관리 화면(연혁·인증서·ESG·조직도)이 같은
// 조회/쓰기 배선을 쓴다. 각 화면이 useQuery/useMutation 을 복사하는 대신 여기 한 벌만 둔다.
//
// [백엔드 없음] createCrudAdapter 는 픽스처 배열을 mutable 로 들고 CRUD 를 흉내 낸다. 실제 연동 시
// 각 화면의 data-source.ts 의 // TODO(backend) 엔드포인트로 어댑터 본문만 바꾼다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { wait } from '../../../shared/async';
import { settleAll } from '../../../shared/bulk';
import { failIfRequested, LATENCY_MS } from './dev';

export interface CrudAdapter<T extends { id: string }, Input> {
  readonly fetchAll: (signal: AbortSignal) => Promise<readonly T[]>;
  readonly fetchOne: (id: string, signal: AbortSignal) => Promise<T>;
  readonly create: (input: Input, signal?: AbortSignal) => Promise<void>;
  readonly update: (id: string, input: Input, signal?: AbortSignal) => Promise<void>;
  readonly remove: (id: string, signal?: AbortSignal) => Promise<void>;
}

interface CrudSpec<T extends { id: string }, Input> {
  /** 실패 재현·엔드포인트 스코프 ('history'/'certificates'/'esg'/'org-chart') */
  readonly scope: string;
  readonly seed: readonly T[];
  /** Input + 현재 목록 → 새 항목(id·order 배정은 여기서 정한다) */
  readonly build: (input: Input, existing: readonly T[]) => T;
  /** 기존 항목 + Input → 갱신본 */
  readonly patch: (item: T, input: Input) => T;
  /** 조회 시 정렬(선택) */
  readonly sort?: (list: readonly T[]) => readonly T[];
}

export function createCrudAdapter<T extends { id: string }, Input>(
  spec: CrudSpec<T, Input>,
): CrudAdapter<T, Input> {
  const order = (list: readonly T[]): readonly T[] => (spec.sort ? spec.sort(list) : list);
  let items: readonly T[] = order(spec.seed);

  return {
    async fetchAll(signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'list');
      return order(items);
    },
    async fetchOne(id, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'detail');
      const found = items.find((item) => item.id === id);
      if (found === undefined) throw new Error('항목을 찾을 수 없습니다');
      return found;
    },
    async create(input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'save');
      items = order([...items, spec.build(input, items)]);
    },
    async update(id, input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'save');
      items = order(items.map((item) => (item.id === id ? spec.patch(item, input) : item)));
    },
    async remove(id, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'delete');
      items = items.filter((item) => item.id !== id);
    },
  };
}

/* ── 도메인 훅 ───────────────────────────────────────────────────────────── */

const listKey = (resource: string) => [resource, 'list'] as const;
const detailKey = (resource: string, id: string) => [resource, 'detail', id] as const;

export function useCrudListQuery<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
): UseQueryResult<readonly T[], Error> {
  return useQuery({
    queryKey: listKey(resource),
    queryFn: ({ signal }) => adapter.fetchAll(signal),
    placeholderData: (previous) => previous,
  });
}

export function useCrudItem<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
  id: string,
): UseQueryResult<T, Error> {
  return useQuery({
    queryKey: detailKey(resource, id),
    queryFn: ({ signal }) => adapter.fetchOne(id, signal),
    enabled: id !== '',
  });
}

interface CreateVars<Input> {
  readonly input: Input;
  readonly signal: AbortSignal;
}

export function useCrudCreate<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal }: CreateVars<Input>) => adapter.create(input, signal),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface UpdateVars<Input> {
  readonly id: string;
  readonly input: Input;
  readonly signal: AbortSignal;
}

export function useCrudUpdate<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal }: UpdateVars<Input>) => adapter.update(id, input, signal),
    onSuccess: (_result, { id }) => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
      void client.invalidateQueries({ queryKey: detailKey(resource, id) });
    },
  });
}

interface DeleteVars {
  readonly id: string;
  readonly signal: AbortSignal;
}

export function useCrudDelete<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
) {
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
export function useCrudBulkDelete<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
) {
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
