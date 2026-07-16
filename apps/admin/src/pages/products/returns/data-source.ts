// 교환/반품 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/products/**)
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 목록/상세는 fetchAll/fetchOne,
// 상태·메모 저장은 update 를 쓴다(생성·삭제 UI 는 없다 — 요청은 고객이 만들고 관리자는 처리만 한다).
//
// [재고 반영] 완료 처리는 요청 상태만 바꾸는 게 아니라 상품 재고를 움직인다. 그 부수효과를 어댑터의
// patch 안에 둔다 — 화면이 '요청 저장'과 '재고 갱신'을 두 번 호출하면 하나만 성공하는 창이 생기기
// 때문이다. 백엔드가 붙으면 이 한 덩이가 트랜잭션 엔드포인트 한 방으로 바뀐다.
import { createCrudAdapter, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { wait } from '../../../shared/async';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { getProduct, listProducts, updateProduct } from '../_shared/store';
import type { Product } from '../_shared/store';
import { toProductInput } from '../items/types';
import {
  applyMovements,
  isStockApplied,
  movesStock,
  planStockMovements,
  sortReturns,
  stockIssueMessage,
  validateStockPlan,
} from './types';
import type { ReturnRequest, ReturnRequestInput } from './types';

const SCOPE = 'returns';

const RETURN_SEED: readonly ReturnRequest[] = [
  {
    id: 'ret-1',
    orderNo: 'ORD-20260712-0031',
    productId: 'prd-1',
    productName: '루미엔 경량 패딩 점퍼',
    customer: '김**',
    kind: 'exchange',
    optionValues: ['블랙', 'M'],
    exchangeOptionValues: [],
    reason: '사이즈 교환',
    reasonDetail: 'M 사이즈가 작아 L 로 교환 요청합니다.',
    quantity: 1,
    refundAmount: 0,
    requestedAt: '2026-07-12',
    status: 'requested',
    stockAppliedAt: '',
    stockMovements: [],
    adminNote: '',
  },
  {
    id: 'ret-2',
    orderNo: 'ORD-20260710-0148',
    productId: 'prd-3',
    productName: '테라 스니커즈 데일리',
    customer: '박**',
    kind: 'return',
    optionValues: ['260'],
    exchangeOptionValues: [],
    reason: '단순 변심',
    reasonDetail: '착용감이 기대와 달라 반품합니다.',
    quantity: 1,
    refundAmount: 79000,
    requestedAt: '2026-07-10',
    status: 'collecting',
    stockAppliedAt: '',
    stockMovements: [],
    adminNote: '수거 택배 접수 완료(2026-07-11).',
  },
  {
    id: 'ret-3',
    orderNo: 'ORD-20260708-0092',
    productId: 'prd-2',
    productName: '노바 베이직 코튼 티셔츠',
    customer: '이**',
    kind: 'return',
    optionValues: ['화이트'],
    exchangeOptionValues: [],
    reason: '상품 불량',
    reasonDetail: '봉제 마감 불량으로 반품 및 환불 요청합니다.',
    quantity: 2,
    refundAmount: 39800,
    requestedAt: '2026-07-08',
    status: 'inspecting',
    stockAppliedAt: '',
    stockMovements: [],
    adminNote: '입고 검수 중 — 불량 확인되면 전액 환불 예정.',
  },
  {
    id: 'ret-4',
    orderNo: 'ORD-20260705-0210',
    productId: 'prd-5',
    productName: '오브제 미니멀 크로스백',
    customer: '최**',
    kind: 'return',
    optionValues: [],
    exchangeOptionValues: [],
    reason: '단순 변심',
    reasonDetail: '색상이 화면과 달라 반품합니다.',
    quantity: 1,
    refundAmount: 38250,
    requestedAt: '2026-07-05',
    status: 'completed',
    stockAppliedAt: '2026-07-09T10:20:00.000Z',
    stockMovements: [
      {
        id: 'mv-ret4-in',
        at: '2026-07-09T10:20:00.000Z',
        direction: 'in',
        sku: 'OBJ-BAG-338',
        optionLabel: '단일 상품',
        quantity: 1,
      },
    ],
    adminNote: '환불 완료(2026-07-09).',
  },
  {
    id: 'ret-5',
    orderNo: 'ORD-20260703-0177',
    productId: 'prd-4',
    productName: '카밀 워시드 데님 팬츠',
    customer: '정**',
    kind: 'exchange',
    optionValues: ['30'],
    exchangeOptionValues: ['32'],
    reason: '변심 교환',
    reasonDetail: '착용 흔적이 있어 교환 규정에 맞지 않습니다.',
    quantity: 1,
    refundAmount: 0,
    requestedAt: '2026-07-03',
    status: 'rejected',
    stockAppliedAt: '',
    stockMovements: [],
    adminNote: '착용 흔적으로 교환 반려 안내함.',
  },
];

let seq = RETURN_SEED.length;

/**
 * 완료 처리의 재고 부수효과 — 어댑터 update 안에서 요청 갱신과 한 덩이로 일어난다.
 *   · 완료가 아니면(진행·반려) 재고를 건드리지 않는다.
 *   · 이미 반영된 요청은 다시 반영하지 않는다(stockAppliedAt 이 멱등 키다).
 *   · 재고 부족·옵션 미선택은 422 로 막는다 — 화면이 필드 인라인 오류로 되돌린다.
 */
function applyStockOnComplete(current: ReturnRequest, input: ReturnRequestInput): ReturnRequest {
  const next: ReturnRequest = { ...current, ...input, id: current.id };
  if (!movesStock(input.status) || isStockApplied(current)) return next;

  const product = listProducts().find((item) => item.id === current.productId);
  if (product === undefined) {
    throw new HttpError(
      HTTP_STATUS.unprocessable,
      '연결된 상품을 찾을 수 없어 재고를 반영할 수 없습니다.',
    );
  }

  const issue = validateStockPlan(next, product.variants);
  if (issue !== null) {
    const message = stockIssueMessage(issue);
    throw new HttpError(HTTP_STATUS.unprocessable, message, {
      violations: [
        { field: issue === 'unknown-origin' ? 'optionValues' : 'exchangeOptionValues', message },
      ],
    });
  }

  const at = new Date().toISOString();
  const movements = planStockMovements(next, product.variants, at);
  updateProduct(product.id, {
    ...toProductInput(product),
    variants: applyMovements(product.variants, movements),
  });

  return {
    ...next,
    stockAppliedAt: at,
    stockMovements: [...current.stockMovements, ...movements],
  };
}

// TODO(backend): GET /api/returns · GET/PUT /api/returns/:id (상태 전이·처리 메모)
//   · 완료 전이는 재고 이동을 동반한다 — 서버는 요청 갱신 + SKU 재고 증감을 한 트랜잭션으로 처리하고
//     재고 부족이면 422(field: exchangeOptionValues)로 거절한다. 멱등키는 stockAppliedAt 이다.
export const returnAdapter = createCrudAdapter<ReturnRequest, ReturnRequestInput>({
  scope: SCOPE,
  seed: RETURN_SEED,
  build: (input) => {
    seq += 1;
    return { id: `ret-${String(seq)}`, ...input };
  },
  patch: applyStockOnComplete,
  sort: sortReturns,
});

// TODO(backend): GET /api/products/:id — 교환 옵션(SKU)·재고 조회. 옵션의 정본은 상품이라 요청이
//   자기 사본을 들지 않는다(옵션이 바뀌면 화면이 바로 그 사실을 본다).
export async function fetchReturnProduct(
  productId: string,
  signal?: AbortSignal,
): Promise<Product> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'detail');
  try {
    return getProduct(productId);
  } catch {
    throw new HttpError(HTTP_STATUS.notFound, '연결된 상품을 찾을 수 없습니다.');
  }
}
