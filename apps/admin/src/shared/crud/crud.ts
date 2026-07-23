// 목록형 화면 공용 CRUD 키트 (앱 공용 선언적 CRUD 프레임워크)
//
// 목록 + 상세(등록/수정 폼) + 삭제팝업 을 갖는 기업 관리 화면(연혁·인증서·ESG·조직도)이 같은
// 조회/쓰기 배선을 쓴다. 각 화면이 useQuery/useMutation 을 복사하는 대신 여기 한 벌만 둔다.
//
// [백엔드 없음] createCrudAdapter 는 픽스처 배열을 mutable 로 들고 CRUD 를 흉내 낸다. 실제 연동 시
// 각 화면의 data-source.ts 의 // TODO(backend) 엔드포인트로 어댑터 본문만 바꾼다.
//
// [전송은 shared/api/client.ts 를 지난다 — 실 HTTP 는 여전히 0건]
// 지연·취소·실패재현·멱등키는 이제 이 파일이 직접 하지 않고 `fixtureRequest` 에 태운다. 그 안에서
// axios 인스턴스의 요청/응답 인터셉터를 **실제로 통과**한 뒤, 네트워크 대신 픽스처 트랜스포트가
// 해소한다(자세한 구조는 shared/api/client.ts 헤더). 아래 `resolve` 콜백이 픽스처 본체이고,
// 그 인자로 오는 멱등키는 **요청 헤더에서 되읽은 값**이다 — 원장이 그 헤더를 소비한다(EXC-08).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fixtureRequest } from '../api/client';
import { settleAllDetailed } from '../bulk';
import { HTTP_STATUS, HttpError } from '../errors/http-error';

/**
 * 쓰기 1회의 실행 맥락 (EXC-08).
 *
 * [왜 signal 옆에 키가 앉는가]
 * 예전 시그니처는 `create(input, signal?)` 였다 — **키가 앉을 자리가 없었다.** 그래서
 * useCrudForm 은 제출 시도마다 멱등키를 만들고도 그것을 **버렸다**(반환값 미사용). 키를 만드는
 * 코드와 주석은 있는데 키가 어댑터에 도달하지 못하니, 'retry 가 같은 키를 재사용한다'는 EXC-08 의
 * 약속은 어디에서도 지켜지지 않았다. 자리를 만들어 실제로 전달한다.
 *
 * [export 하지 않는다] 이 타입의 이름을 import 하는 곳은 없다 — 어댑터 구현부(ticketAdapter 등)는
 * `CrudAdapter<T, Input>` 를 달고 파라미터 타입을 **구조적으로** 물려받는다. 이름을 export 하면
 * 소비자 0인 export 가 되어 dead-code(클린코드 점검 축5, 임계 0건) 가 한 건 늘 뿐이다.
 * (앱 tsconfig 는 `declaration: false` 라 공개 시그니처가 비공개 타입을 참조해도 문제가 없다.)
 */
interface WriteContext {
  readonly signal?: AbortSignal | undefined;
  /**
   * 제출 **시도** 단위 멱등키.
   *
   * 재시도가 같은 키를 재사용하면 서버는 최초 응답을 재생하고 두 번 처리하지 않는다.
   * 생략 가능하다 — 목록의 단건 삭제처럼 사용자가 매번 확인 다이얼로그를 거치는 조작은
   * 키 없이 온다. 그때 어댑터는 평소대로 처리한다.
   *
   * TODO(backend): 이 값은 `Idempotency-Key: <key>` 요청 헤더로 나간다 (BE-004-EP-03).
   */
  readonly idempotencyKey?: string | undefined;
}

export interface CrudAdapter<T extends { id: string }, Input> {
  readonly fetchAll: (signal: AbortSignal) => Promise<readonly T[]>;
  readonly fetchOne: (id: string, signal: AbortSignal) => Promise<T>;
  readonly create: (input: Input, context?: WriteContext) => Promise<void>;
  readonly update: (id: string, input: Input, context?: WriteContext) => Promise<void>;
  readonly remove: (id: string, context?: WriteContext) => Promise<void>;
}

/**
 * 픽스처의 멱등 처리 (EXC-08) — 서버가 `Idempotency-Key` 로 할 일을 흉내 낸다.
 *
 * [기록은 **성공한 뒤에만** 한다]
 * 키를 미리 기록하면, 실패한 첫 시도가 키를 태워 버려 **재시도가 영원히 no-op** 이 된다 —
 * 사용자는 '저장했습니다'를 보지만 아무것도 저장되지 않는다. 그래서 순서는 반드시
 * ① 이미 적용된 키인가? → 그렇다면 재적용 없이 최초 응답 재생
 * ② 아니면 적용하고, **적용에 성공한 뒤** 기록
 * 이다. 실패는 throw 로 나가므로 ②의 기록에 도달하지 않는다.
 */
function createIdempotencyLedger() {
  const applied = new Set<string>();
  return {
    /** 이미 처리한 거래면 true — 호출자는 재적용 없이 성공을 반환한다 */
    isReplay: (key: string | undefined): boolean => key !== undefined && applied.has(key),
    /** 적용에 성공했다 — 같은 키의 다음 요청은 재생된다 */
    record: (key: string | undefined): void => {
      if (key !== undefined) applied.add(key);
    },
  };
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
  const ledger = createIdempotencyLedger();

  return {
    fetchAll: (signal) =>
      fixtureRequest({ scope: spec.scope, op: 'list', signal, resolve: () => order(items) }),

    fetchOne: (id, signal) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'detail',
        signal,
        resolve: () => {
          const found = items.find((item) => item.id === id);
          // 404 와 500 은 복구 수단이 다르다 — '목록으로' vs '다시 시도' (EXC-12). status 를 실어
          // 폼 셸이 그 둘을 구분할 수 있게 한다. 예전에는 generic Error 라 loadFailed 로 뭉개졌다.
          if (found === undefined) {
            throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없어요.');
          }
          return found;
        },
      }),

    create: (input, context) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'save',
        signal: context?.signal,
        idempotencyKey: context?.idempotencyKey,
        resolve: (key) => {
          // [EXC-08] 같은 키의 재시도는 두 번 만들지 않는다 — 최초 응답을 재생한다
          if (ledger.isReplay(key)) return;
          items = order([...items, spec.build(input, items)]);
          ledger.record(key);
        },
      }),

    update: (id, input, context) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'save',
        signal: context?.signal,
        idempotencyKey: context?.idempotencyKey,
        resolve: (key) => {
          if (ledger.isReplay(key)) return;

          // [EXC-04] 예전에는 map 이 **없는 id 를 조용히 지나치고 성공을 반환**했다. 그래서 다른
          // 관리자가 방금 지운 항목을 편집하면 '저장했습니다' 토스트가 뜨고 목록으로 돌아가지만
          // 저장된 것은 아무것도 없었다 — 유령 저장(ghost saved)이다. 없으면 409 로 알린다.
          if (!items.some((item) => item.id === id)) {
            throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 항목이에요.');
          }

          items = order(items.map((item) => (item.id === id ? spec.patch(item, input) : item)));
          ledger.record(key);
        },
      }),

    remove: (id, context) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'delete',
        signal: context?.signal,
        idempotencyKey: context?.idempotencyKey,
        resolve: (key) => {
          if (ledger.isReplay(key)) return;

          // 같은 이유로 filter 도 없는 id 를 조용히 통과시켰다 — 삭제되지 않았는데 삭제 성공이었다.
          if (!items.some((item) => item.id === id)) {
            throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 항목이에요.');
          }

          items = items.filter((item) => item.id !== id);
          ledger.record(key);
        },
      }),
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
  const ledger = createIdempotencyLedger();

  /** id 가 저장소에 아직 있는가 — store 의 map/filter 는 없는 id 를 조용히 지나친다 */
  const exists = (id: string): boolean => spec.list().some((item) => item.id === id);

  return {
    fetchAll: (signal) =>
      fixtureRequest({ scope: spec.scope, op: 'list', signal, resolve: () => spec.list() }),

    fetchOne: (id, signal) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'detail',
        signal,
        resolve: () => {
          /**
           * [EXC-12] 없는 id 는 **404 로** 알린다.
           *
           * store 의 getOne 류는 `throw new Error('상품을 찾을 수 없습니다')` 처럼 **status 없는
           * generic Error** 를 던진다. useCrudForm 의 404 분기(isNotFound)는 status 를 보고
           * 판정하므로, 그 generic Error 는 언제나 'error' 로 떨어졌다 — **404 분기가 영원히
           * 발현되지 않았다.** 삭제된 :id 로 폼에 들어와도 '다시 시도'를 권했다(재시도해도 없다).
           * 형제 팩토리 createCrudAdapter.fetchOne 이 같은 자리에서 이미 이렇게 한다.
           */
          if (!exists(id)) {
            throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없어요.');
          }
          return spec.getOne(id);
        },
      }),

    create: (input, context) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'save',
        signal: context?.signal,
        idempotencyKey: context?.idempotencyKey,
        resolve: (key) => {
          // [EXC-08] 같은 키의 재시도는 두 번 만들지 않는다 — 최초 응답을 재생한다
          if (ledger.isReplay(key)) return;
          spec.add(input);
          ledger.record(key);
        },
      }),

    update: (id, input, context) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'save',
        signal: context?.signal,
        idempotencyKey: context?.idempotencyKey,
        resolve: (key) => {
          if (ledger.isReplay(key)) return;

          /**
           * [EXC-04] 형제 팩토리(createCrudAdapter)는 같은 자리에서 409 로 막는데 여기만 뚫려 있었다.
           *
           * store 의 update 는 `map` 이다 — **없는 id 를 조용히 지나치고 아무것도 바꾸지 않은 채
           * 성공을 반환**했다. 그래서 다른 관리자가 방금 지운 상품을 편집하면 '저장했습니다' 토스트가
           * 뜨고 목록으로 돌아가지만 저장된 것은 아무것도 없다 — 유령 저장(ghost saved)이다.
           * 소비 화면들은 useCrudForm 의 409 충돌 다이얼로그를 이미 갖고 있다. 어댑터가 409 를
           * 주기만 하면 화면 코드 0 줄로 복구 경로가 열린다.
           */
          if (!exists(id)) {
            throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 삭제한 항목이에요.');
          }

          spec.update(id, input);
          ledger.record(key);
        },
      }),

    remove: (id, context) =>
      fixtureRequest({
        scope: spec.scope,
        op: 'delete',
        signal: context?.signal,
        idempotencyKey: context?.idempotencyKey,
        resolve: (key) => {
          if (ledger.isReplay(key)) return;

          // 같은 이유로 store 의 filter 도 없는 id 를 조용히 통과시켰다 — 삭제되지 않았는데 삭제 성공.
          if (!exists(id)) {
            throw new HttpError(HTTP_STATUS.conflict, '이미 삭제된 항목이에요.');
          }

          spec.remove(id);
          ledger.record(key);
        },
      }),
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
  /**
   * [EXC-08] 멱등키는 **variables 로** 온다 — mutationFn 안에서 만들지 않는다.
   * react-query 가 재시도하면 **같은 variables 로** mutationFn 을 다시 부르므로, 키가 여기 있어야
   * 재시도가 같은 키를 재사용한다. mutationFn 안에서 만들면 재시도마다 새 키가 생겨 서버가 두
   * 요청을 별개 거래로 본다 (queryClient.ts 의 mutations.retry 주석이 같은 것을 말한다).
   */
  readonly idempotencyKey?: string | undefined;
}

export function useCrudCreate<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, signal, idempotencyKey }: CreateVars<Input>) =>
      adapter.create(input, { signal, idempotencyKey }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface UpdateVars<Input> {
  readonly id: string;
  readonly input: Input;
  readonly signal: AbortSignal;
  /** [EXC-08] 제출 시도 단위 멱등키 — CreateVars 의 같은 필드를 보라 */
  readonly idempotencyKey?: string | undefined;
}

export function useCrudUpdate<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, signal, idempotencyKey }: UpdateVars<Input>) =>
      adapter.update(id, input, { signal, idempotencyKey }),
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
    mutationFn: ({ id, signal }: DeleteVars) => adapter.remove(id, { signal }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}

interface BulkDeleteVars {
  readonly ids: readonly string[];
  readonly signal: AbortSignal;
}

/**
 * 일괄 삭제 — 부분 실패를 **건수와 사유로** 알린다.
 *
 * 사유를 함께 주는 이유는 409 때문이다. 409 는 재시도가 푸는 실패가 아니라 참조를 먼저 떼어내야
 * 풀리는 실패이고, 어댑터는 그 이유를 이미 문장으로 들고 온다. 건수만 반환하면 호출부는 그것을
 * 구분할 수단 자체가 없어 잘못된 복구 수단을 권하게 된다 — deleteErrorMessage(단건)가 피하려고
 * 만들어진 바로 그 함정이다.
 */
export function useCrudBulkDelete<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, signal }: BulkDeleteVars) =>
      settleAllDetailed(ids, (id) => adapter.remove(id, { signal })),
    onSuccess: ({ failed }, { signal }) => {
      if (signal.aborted) return;
      if (failed === 0) void client.invalidateQueries({ queryKey: listKey(resource) });
    },
  });
}
