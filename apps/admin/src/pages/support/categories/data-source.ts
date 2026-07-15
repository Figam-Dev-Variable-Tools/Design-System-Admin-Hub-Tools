// 문의 유형 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/support/**)
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다. 목록 항목은
// '유형 + 사용 중 건수(티켓·템플릿)'라 삭제 차단(사용 중 409)을 store.removeCategory 가 강제한다.
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import type { CrudAdapter } from '../../../shared/crud';
import {
  addCategory,
  getCategoryUsage,
  listCategoryUsage,
  removeCategory,
  updateCategory,
} from '../_shared/store';
import type { SupportCategoryInput, SupportCategoryUsage } from '../_shared/domain';

export const CATEGORY_RESOURCE = 'support-categories';
const SCOPE = CATEGORY_RESOURCE;

// TODO(backend): GET/POST /api/support/categories · PUT/DELETE /api/support/categories/:id (사용 중이면 409)
export const supportCategoryAdapter: CrudAdapter<SupportCategoryUsage, SupportCategoryInput> = {
  async fetchAll(signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'list');
    return listCategoryUsage();
  },
  async fetchOne(id, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'detail');
    return getCategoryUsage(id);
  },
  async create(input, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'save');
    addCategory(input);
  },
  async update(id, input, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'save');
    updateCategory(id, input);
  },
  async remove(id, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'delete');
    removeCategory(id);
  },
};
