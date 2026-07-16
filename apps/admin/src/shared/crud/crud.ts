// 목록형 화면 공용 CRUD 키트 (A41 소유 — apps/admin/src/shared/crud/** · 앱 공용 선언적 CRUD 프레임워크)
//
// 목록 + 상세(등록/수정 폼) + 삭제팝업 을 갖는 기업 관리 화면(연혁·인증서·ESG·조직도)이 같은
// 조회/쓰기 배선을 쓴다. 각 화면이 useQuery/useMutation 을 복사하는 대신 여기 한 벌만 둔다.
//
// [백엔드 없음] createCrudAdapter 는 픽스처 배열을 mutable 로 들고 CRUD 를 흉내 낸다. 실제 연동 시
// 각 화면의 data-source.ts 의 // TODO(backend) 엔드포인트로 어댑터 본문만 바꾼다.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { wait } from '../async';
import { settleAll } from '../bulk';
import { HTTP_STATUS, HttpError } from '../errors/http-error';
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
      // 404 와 500 은 복구 수단이 다르다 — '목록으로' vs '다시 시도' (EXC-12). status 를 실어
      // 폼 셸이 그 둘을 구분할 수 있게 한다. 예전에는 generic Error 라 loadFailed 로 뭉개졌다.
      if (found === undefined) {
        throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없습니다.');
      }
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

      // [EXC-04] 예전에는 map 이 **없는 id 를 조용히 지나치고 성공을 반환**했다. 그래서 다른
      // 관리자가 방금 지운 항목을 편집하면 '저장했습니다' 토스트가 뜨고 목록으로 돌아가지만
      // 저장된 것은 아무것도 없었다 — 유령 저장(ghost saved)이다. 없으면 409 로 알린다.
      if (!items.some((item) => item.id === id)) {
        throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 항목입니다.');
      }

      items = order(items.map((item) => (item.id === id ? spec.patch(item, input) : item)));
    },
    async remove(id, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'delete');

      // 같은 이유로 filter 도 없는 id 를 조용히 통과시켰다 — 삭제되지 않았는데 삭제 성공이었다.
      if (!items.some((item) => item.id === id)) {
        throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 항목입니다.');
      }

      items = items.filter((item) => item.id !== id);
    },
  };
}

interface StoreAdapterSpec<T extends { id: string }, Input> {
  /** 실패 재현·엔드포인트 스코프 */
  readonly scope: string;
  readonly list: () => readonly T[];
  readonly getOne: (id: string) => T;
  readonly add: (input: Input) => void;
  readonly update: (id: string, input: Input) => void;
  readonly remove: (id: string) => void;
}

/**
 * 공유 store(SSOT) 위에 CrudAdapter 를 배선한다. createCrudAdapter 와 달리 **자체 상태를 갖지 않고**
 * 이미 존재하는 store 함수(목록·단건·추가·수정·삭제)에 위임한다 — 여러 화면이 같은 store 를 공유하는
 * 경우(상품·포트폴리오·카테고리·답변템플릿·고객센터 유형)에 쓴다. 지연·실패재현 보일러플레이트만
 * 여기서 한 벌로 감싼다(각 data-source 가 손복제하던 어댑터 골격 제거). 동작은 손복제본과 동일하다.
 */
export function createStoreAdapter<T extends { id: string }, Input>(
  spec: StoreAdapterSpec<T, Input>,
): CrudAdapter<T, Input> {
  return {
    async fetchAll(signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'list');
      return spec.list();
    },
    async fetchOne(id, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'detail');
      return spec.getOne(id);
    },
    async create(input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'save');
      spec.add(input);
    },
    async update(id, input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'save');
      spec.update(id, input);
    },
    async remove(id, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(spec.scope, 'delete');
      spec.remove(id);
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
