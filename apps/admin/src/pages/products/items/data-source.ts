// 상품 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 저장소 위에 배선한다.
// 실제 연동 시 아래 함수 본문만 HTTP 로 바꾸고 화면 코드는 그대로 둔다.
import { wait } from '../../../shared/async';
import { createStoreAdapter, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import {
  addProduct,
  getProduct,
  listProductCategories,
  listProducts,
  removeProduct,
  updateProduct,
} from '../_shared/store';
import type { Product, ProductCategory, ProductInput } from '../_shared/store';

const SCOPE = 'products';

// TODO(backend): GET/POST /api/products · GET/PUT/DELETE /api/products/:id
export const productAdapter = createStoreAdapter<Product, ProductInput>({
  scope: SCOPE,
  list: listProducts,
  getOne: getProduct,
  add: addProduct,
  update: updateProduct,
  remove: removeProduct,
});

// TODO(backend): GET /api/products/categories  (폼·목록의 분류 선택지)
export async function fetchProductCategoryOptions(
  signal?: AbortSignal,
): Promise<readonly ProductCategory[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'list');
  return listProductCategories();
}
