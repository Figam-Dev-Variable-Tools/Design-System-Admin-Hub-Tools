// 공용 CRUD 어댑터 팩토리의 쓰기 계약 — apps/admin/src/shared/crud/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 두 팩토리는 **같은 계약**이다]
// createCrudAdapter(자체 배열)와 createStoreAdapter(공유 store 위임)는 저장소만 다를 뿐 화면에는
// 같은 CrudAdapter 로 보인다. 그런데 예전에는 **없는 id 를 만났을 때 둘이 달랐다**:
//   - createCrudAdapter: 409 로 막았다
//   - createStoreAdapter: store 의 map/filter 에 그대로 위임 → **조용히 지나치고 성공을 반환**
// 후자는 유령 저장(ghost saved)이다 — 다른 관리자가 방금 지운 상품을 편집하면 '저장했습니다'
// 토스트가 뜨고 목록으로 돌아가지만 저장된 것은 아무것도 없다. 그래서 이 스위트는 두 팩토리를
// **같은 표로 함께 돌려** 비대칭이 다시 생기면 깨지게 한다.
//
// [왜 화면 코드가 0줄인가]
// useCrudForm 은 409(isConflict)를 받으면 이미 입력을 보존한 채 충돌 다이얼로그를 연다 (EXC-04).
// 어댑터가 409 를 주기만 하면 그 경로가 열린다 — 그래서 고칠 곳은 여기 한 곳뿐이었다.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';

import { HTTP_STATUS, isConflict, isHttpError, isNotFound } from '../errors/http-error';
import { createCrudAdapter, createStoreAdapter } from './crud';
import type { CrudAdapter } from './crud';

interface Row {
  readonly id: string;
  readonly name: string;
}
interface RowInput {
  readonly name: string;
}

const SEED: readonly Row[] = [{ id: 'a', name: '가' }];

/** 자체 배열 팩토리 */
function makeCrud(): CrudAdapter<Row, RowInput> {
  return createCrudAdapter<Row, RowInput>({
    scope: 'test-crud',
    seed: SEED,
    build: (input, existing) => ({ id: `n${String(existing.length)}`, name: input.name }),
    patch: (item, input) => ({ ...item, name: input.name }),
  });
}

/**
 * store 위임 팩토리 — **실제 store 들과 똑같이** map/filter 로 구현한다.
 * 즉 이 store 는 없는 id 를 조용히 지나치고, getOne 은 status 없는 generic Error 를 던진다.
 * (pages/products/_shared/store.ts 의 updateProduct/removeProduct/getProduct 를 그대로 본떴다.)
 */
function makeStore(): CrudAdapter<Row, RowInput> {
  let rows: readonly Row[] = SEED;
  return createStoreAdapter<Row, RowInput>({
    scope: 'test-store',
    list: () => rows,
    getOne: (id) => {
      const found = rows.find((row) => row.id === id);
      if (found === undefined) throw new Error('찾을 수 없어요');
      return found;
    },
    add: (input) => {
      rows = [...rows, { id: `n${String(rows.length)}`, name: input.name }];
    },
    update: (id, input) => {
      rows = rows.map((row) => (row.id === id ? { ...row, name: input.name } : row));
    },
    remove: (id) => {
      rows = rows.filter((row) => row.id !== id);
    },
  });
}

const FACTORIES: readonly (readonly [string, () => CrudAdapter<Row, RowInput>])[] = [
  ['createCrudAdapter', makeCrud],
  ['createStoreAdapter', makeStore],
] as const;

describe.each(FACTORIES)(
  '%s — 없는 id 의 쓰기는 조용히 성공하지 않는다 (EXC-04)',
  (_label, make) => {
    it('update 가 없는 id 를 409 로 막는다 — 유령 저장 금지', async () => {
      const adapter = make();
      // 고치기 전 createStoreAdapter 는 여기서 **resolve** 했다 — 그것이 유령 저장이다.
      await expect(adapter.update('ghost', { name: '나' })).rejects.toSatisfy(isConflict);
    });

    it('remove 가 없는 id 를 409 로 막는다 — 삭제되지 않았는데 삭제 성공 금지', async () => {
      const adapter = make();
      await expect(adapter.remove('ghost')).rejects.toSatisfy(isConflict);
    });

    it('존재하는 id 의 쓰기는 그대로 통과한다 — 게이트가 정상 경로를 막지 않는다', async () => {
      const adapter = make();
      await adapter.update('a', { name: '바뀜' });
      const list = await adapter.fetchAll(new AbortController().signal);
      expect(list.find((row) => row.id === 'a')?.name).toBe('바뀜');

      await adapter.remove('a');
      expect(await adapter.fetchAll(new AbortController().signal)).toHaveLength(0);
    });

    it('fetchOne 이 없는 id 를 **404 로** 알린다 — 404 분기가 발현된다 (EXC-12)', async () => {
      const adapter = make();
      /**
       * store 의 getOne 은 status 없는 generic Error 를 던진다. useCrudForm 의 404 분기는 status 를
       * 보고 판정하므로(isNotFound), 그 generic Error 는 언제나 'error' 로 떨어졌다 — 삭제된 :id 로
       * 폼에 들어와도 '다시 시도'(재시도해도 없다)를 권했다. 이제 status 가 실린다.
       */
      const cause: unknown = await adapter.fetchOne('ghost', new AbortController().signal).then(
        () => null,
        (error: unknown) => error,
      );
      expect(isNotFound(cause)).toBe(true);
      expect(isHttpError(cause) ? cause.status : null).toBe(HTTP_STATUS.notFound);
    });

    it('존재하는 id 의 fetchOne 은 그대로 항목을 준다', async () => {
      const adapter = make();
      expect((await adapter.fetchOne('a', new AbortController().signal)).name).toBe('가');
    });
  },
);

describe.each(FACTORIES)('%s — 멱등키를 실제로 지킨다 (EXC-08)', (_label, make) => {
  it('같은 키의 create 를 두 번 보내면 한 건만 만든다 — 재시도가 이중 생성이 되지 않는다', async () => {
    const adapter = make();
    const key = 'idem-1';

    // '확인'을 두 번 누른 셈 — useCrudForm 은 성공 전까지 **같은 키**를 재사용한다
    await adapter.create({ name: '새로' }, { idempotencyKey: key });
    await adapter.create({ name: '새로' }, { idempotencyKey: key });

    const list = await adapter.fetchAll(new AbortController().signal);
    // 키가 없던 시절에는 2건이 만들어졌다 — 그것이 이중 지급/이중 생성이다
    expect(list.filter((row) => row.name === '새로')).toHaveLength(1);
    expect(list).toHaveLength(SEED.length + 1);
  });

  it('키가 다르면 별개 거래다 — 진짜 두 번째 등록은 막지 않는다', async () => {
    const adapter = make();
    await adapter.create({ name: '하나' }, { idempotencyKey: 'k1' });
    await adapter.create({ name: '둘' }, { idempotencyKey: 'k2' });
    expect(await adapter.fetchAll(new AbortController().signal)).toHaveLength(SEED.length + 2);
  });

  it('키가 없으면 평소대로 처리한다 — 목록의 단건 삭제 같은 조작은 키 없이 온다', async () => {
    const adapter = make();
    await adapter.create({ name: '무키' });
    await adapter.create({ name: '무키' });
    expect(await adapter.fetchAll(new AbortController().signal)).toHaveLength(SEED.length + 2);
  });
});
