// 상품 문의 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 ./_shared/store 위에 배선한다.
// 목록/상세는 fetchAll/fetchOne, 답변·상태 전이 저장은 update 를 쓴다 — 문의를 만드는 것은
// 고객 채널이라 관리자 화면에는 생성 경로가 없다(add 는 어댑터 계약을 채우는 문일 뿐이다).
//
// 정렬을 list 에서 거는 이유: 목록 화면이 정렬을 맡으면 상세에서 돌아왔을 때·다른 화면이 같은
// 저장소를 읽을 때 순서가 갈린다. '최근 접수가 위' 는 이 도메인의 성질이지 화면의 취향이 아니다.
import { createStoreAdapter } from '../../../shared/crud';
import {
  addProductInquiry,
  getProductInquiry,
  listProductInquiries,
  removeProductInquiry,
  updateProductInquiry,
} from './_shared/store';
import type { ProductInquiry, ProductInquiryInput } from './_shared/store';
import { sortProductInquiries } from './types';

/** react-query 키 루트 겸 실패 스코프 */
export const PRODUCT_INQUIRY_RESOURCE = 'product-inquiries';

// TODO(backend): GET /api/products/inquiries · GET/PUT /api/products/inquiries/:id
//   · 답변 저장은 본문·답변시각·상태를 한 트랜잭션으로 옮긴다(applyAnswer 와 같은 규칙).
//   · 종결은 답변이 나간 문의에만 허용하고, 위반은 409 로 되돌린다.
export const productInquiryAdapter = createStoreAdapter<ProductInquiry, ProductInquiryInput>({
  scope: PRODUCT_INQUIRY_RESOURCE,
  list: () => sortProductInquiries(listProductInquiries()),
  getOne: getProductInquiry,
  add: addProductInquiry,
  update: updateProductInquiry,
  remove: removeProductInquiry,
});
