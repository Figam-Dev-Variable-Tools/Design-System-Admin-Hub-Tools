// 문의 유형 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다. 목록 항목은
// '유형 + 사용 중 건수(티켓·템플릿)'라 삭제 차단(사용 중 409)을 store.removeCategory 가 강제한다.
import { createStoreAdapter } from '../../../shared/crud';
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
export const supportCategoryAdapter = createStoreAdapter<
  SupportCategoryUsage,
  SupportCategoryInput
>({
  scope: SCOPE,
  list: listCategoryUsage,
  getOne: getCategoryUsage,
  add: addCategory,
  update: updateCategory,
  remove: removeCategory,
});
