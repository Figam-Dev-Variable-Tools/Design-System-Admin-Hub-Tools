// 로고 목록 데이터 소스 어댑터 팩토리
//
// 파트너사·고객사가 같은 CRUD 규약을 쓴다. 각 화면의 data-source.ts 가 자기 시드로 이 팩토리를
// 호출하고, 실제 엔드포인트(// TODO(backend))는 그 data-source.ts 에 적는다.
//
// [백엔드 없음] 실제 네트워크 호출 0건 — 픽스처 배열을 mutable 로 들고 흉내 낸다.
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { nextLogoOrder, reorderLogosByIds } from './types';
import type { LogoInput, LogoItem } from './types';

export interface LogoAdapter {
  /** 목록 조회 — order 오름차순 */
  readonly fetchAll: (signal: AbortSignal) => Promise<readonly LogoItem[]>;
  readonly create: (input: LogoInput, signal?: AbortSignal) => Promise<void>;
  readonly update: (id: string, input: LogoInput, signal?: AbortSignal) => Promise<void>;
  readonly remove: (id: string, signal?: AbortSignal) => Promise<void>;
  readonly reorder: (orderedIds: readonly string[], signal?: AbortSignal) => Promise<void>;
  /** 노출 여부 토글 — 목록에서 바로 ON/OFF */
  readonly setActive: (id: string, active: boolean, signal?: AbortSignal) => Promise<void>;
}

const sortByOrder = (list: readonly LogoItem[]): LogoItem[] =>
  [...list].sort((a, b) => a.order - b.order);

/** 시드 배열을 들고 CRUD 를 흉내 내는 어댑터를 만든다(mutable — 쓰기가 이 배열을 갱신한다). */
export function createLogoAdapter(scope: string, seed: readonly LogoItem[]): LogoAdapter {
  let items = sortByOrder(seed);
  let seq = items.length;

  /**
   * [EXC-04] 없는 id 는 409 로 막는다 — 조용히 통과시키지 않는다.
   *
   * map/filter 는 **없는 id 를 그냥 지나치고 성공을 반환**한다. 그래서 다른 관리자가 방금 지운
   * 로고를 수정·삭제·토글하면 '변경했습니다'가 뜨지만 바뀐 것은 아무것도 없었다 — 유령 저장이다.
   * 공용 CRUD 프레임워크의 두 팩토리(createCrudAdapter·createStoreAdapter)가 같은 자리에서
   * 같은 판정을 한다. 이 팩토리만 뚫려 있을 이유가 없다.
   */
  const requireExisting = (id: string, message: string): void => {
    if (!items.some((item) => item.id === id)) {
      throw new HttpError(HTTP_STATUS.conflict, message);
    }
  };

  return {
    async fetchAll(signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'list');
      return sortByOrder(items);
    },
    async create(input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'save');
      seq += 1;
      const id = `${scope}-${String(seq)}`;
      // 신규 항목은 기본 노출(active: true) — 노출 여부는 목록에서 토글한다
      items = [...items, { id, order: nextLogoOrder(items), active: true, ...input }];
    },
    async update(id, input, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'save');
      requireExisting(id, '다른 사용자가 먼저 삭제한 항목입니다.');
      items = items.map((item) => (item.id === id ? { ...item, ...input } : item));
    },
    async remove(id, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'delete');
      requireExisting(id, '이미 삭제된 항목입니다.');
      items = items.filter((item) => item.id !== id);
    },
    async reorder(orderedIds, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'reorder');
      items = reorderLogosByIds(items, orderedIds);
    },
    async setActive(id, active, signal) {
      await wait(LATENCY_MS, signal);
      failIfRequested(scope, 'save');
      requireExisting(id, '다른 사용자가 먼저 삭제한 항목입니다.');
      items = items.map((item) => (item.id === id ? { ...item, active } : item));
    },
  };
}
