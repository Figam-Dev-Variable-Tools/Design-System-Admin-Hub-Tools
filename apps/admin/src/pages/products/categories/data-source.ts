// 상품 카테고리 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 저장소 위에 배선한다.
// 목록 항목은 '카테고리 + 사용 중 상품 수'라 삭제 차단(사용 중 409)을 store.removeProductCategory 가 강제한다.
import { createStoreAdapter } from '../../../shared/crud';
import {
  addProductCategory,
  getProductCategoryUsage,
  listProductCategoryUsage,
  removeProductCategory,
  updateProductCategory,
} from '../_shared/store';
import type { ProductCategoryUsage } from '../_shared/store';
import type { ProductCategoryInput } from './types';

/** react-query 키 루트 겸 실패 스코프 — 페이지와 모달이 같은 키를 쓴다 */
export const CATEGORY_RESOURCE = 'product-categories';
const SCOPE = CATEGORY_RESOURCE;

// TODO(backend): GET/POST /api/products/categories · PUT/DELETE /api/products/categories/:id (사용 중이면 409)
export const productCategoryAdapter = createStoreAdapter<
  ProductCategoryUsage,
  ProductCategoryInput
>({
  scope: SCOPE,
  list: listProductCategoryUsage,
  getOne: getProductCategoryUsage,
  add: (input) => addProductCategory(input.name),
  update: (id, input) => updateProductCategory(id, input.name),
  remove: removeProductCategory,
});
