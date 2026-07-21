// 클레임(취소·교환·반품) 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 목록/상세는 fetchAll/fetchOne,
// 상태 전이·환불 처리·메모 저장은 update 를 쓴다(생성·삭제 UI 는 없다 — 클레임은 고객이 만들고
// 관리자는 처리만 한다. 감사 성격이라 지우지도 않는다).
//
// [부수효과는 전부 patch 안에 있다] 완료 처리는 재고를 움직이고, 환불완료는 적립금 원장에 지급을
// 덧붙인다. 화면이 '클레임 저장' 과 '재고 갱신' 과 '원장 기입' 을 따로 호출하면 하나만 성공하는
// 창이 생긴다. 그래서 한 덩이로 묶는다 — 백엔드가 붙으면 이 덩이가 트랜잭션 엔드포인트 한 방이 된다.
//
// [규칙은 화면과 같은 함수로 막는다] 전이 가드(claimTransitionBlock · refundTransitionBlock)를
// 여기서도 그대로 부른다. 버튼의 disabled 와 저장의 거절이 다른 판단을 하면 '눌리는데 거부당하는
// 버튼' 이 생기고, 그 사유는 화면이 다시 지어내게 된다.
import { createCrudAdapter, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { wait } from '../../../shared/async';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import type { FieldViolation, HttpStatus } from '../../../shared/errors/http-error';
import { findOrderRef, orderCatalog } from '../../../shared/domain/order-ref';
import type { OrderRef } from '../../../shared/domain/order-ref';
import { appendPointRestore } from '../../../shared/domain/point-ledger';
import { applyStockMovements } from '../../../shared/domain/stock';
import { variantsOf } from '../../../shared/domain/variant-ref';
import type { VariantRef } from '../../../shared/domain/variant-ref';
import {
  claimTransitionBlock,
  CLAIM_NOTE_MAX,
  isStockApplied,
  movesStock,
  planStockMovements,
  sortClaims,
  stockIssueMessage,
  validateStockPlan,
} from './types';
import type { Claim, ClaimInput } from './types';
import {
  NO_REFUND,
  planRefundRestoration,
  refundTransitionBlock,
  REFUND_FEE_INVALID,
  restoreReason,
} from './refund';

const SCOPE = 'claims';

/* ── 픽스처 ───────────────────────────────────────────────────────────────── */
//
// 주문 픽스처(pages/orders/_shared/store)와 **같은 사건**을 가리킨다: 주문번호뿐 아니라 상품·옵션·
// 수량·결제금액·적립금·쿠폰까지 맞춰 두었다. 클레임 화면의 '76,000원 환불' 과 주문 상세의 결제금액이
// 어긋나면 둘 중 하나는 거짓말이고, 운영자는 어느 쪽이 사실인지 확인할 방법이 없다.
// 인물·연락처는 전부 가상이며 신청자 이름은 마스킹된 표기다.

const CLAIM_SEED: readonly Claim[] = [
  {
    id: 'clm-1',
    orderId: 'ORD-20260712-0031',
    productId: 'prd-1',
    productName: '루미엔 경량 패딩 점퍼',
    customer: '김**',
    memberId: 'mem-1',
    kind: 'exchange',
    optionValues: ['블랙', 'M'],
    exchangeOptionValues: [],
    reason: '사이즈 교환',
    reasonDetail: 'M 사이즈가 작아 L 로 교환 요청합니다.',
    quantity: 1,
    requestedAt: '2026-07-12',
    status: 'requested',
    stockAppliedAt: '',
    stockMovements: [],
    refund: NO_REFUND,
    adminNote: '',
  },
  {
    id: 'clm-2',
    orderId: 'ORD-20260710-0148',
    productId: 'prd-3',
    productName: '테라 스니커즈 데일리',
    customer: '박**',
    memberId: 'mem-3',
    kind: 'return',
    optionValues: ['260'],
    exchangeOptionValues: [],
    reason: '단순 변심',
    reasonDetail: '착용감이 기대와 달라 반품합니다.',
    quantity: 1,
    requestedAt: '2026-07-10',
    status: 'collecting',
    stockAppliedAt: '',
    stockMovements: [],
    // 단순 변심 — 반품배송비는 고객 부담이라 배송 정책 값(3,000원)을 그대로 뺀다.
    refund: {
      ...NO_REFUND,
      status: 'requested',
      paidAmount: 79000,
      returnShippingFee: 3000,
    },
    adminNote: '수거 택배 접수 완료(2026-07-11).',
  },
  {
    id: 'clm-3',
    orderId: 'ORD-20260708-0092',
    productId: 'prd-2',
    productName: '노바 베이직 코튼 티셔츠',
    customer: '이**',
    memberId: 'mem-6',
    kind: 'return',
    optionValues: ['화이트'],
    exchangeOptionValues: [],
    reason: '상품 불량',
    reasonDetail: '봉제 마감 불량으로 반품 및 환불 요청합니다.',
    quantity: 2,
    requestedAt: '2026-07-08',
    status: 'inspecting',
    stockAppliedAt: '',
    stockMovements: [],
    // 판매자 귀책(불량)이라 반품배송비를 받지 않는다 — 정책 기본값을 0으로 덮어쓴 자리다.
    refund: { ...NO_REFUND, paidAmount: 39800, returnShippingFee: 0 },
    adminNote: '입고 검수 중 — 불량 확인되면 전액 환불 예정.',
  },
  {
    id: 'clm-4',
    orderId: 'ORD-20260705-0210',
    productId: 'prd-5',
    productName: '오브제 미니멀 크로스백',
    customer: '최**',
    memberId: 'mem-7',
    kind: 'return',
    optionValues: [],
    exchangeOptionValues: [],
    reason: '단순 변심',
    reasonDetail: '색상이 화면과 달라 반품합니다.',
    quantity: 1,
    requestedAt: '2026-07-05',
    status: 'completed',
    stockAppliedAt: '2026-07-09T10:20:00.000Z',
    stockMovements: [
      {
        id: 'mv-clm4-in',
        at: '2026-07-09T10:20:00.000Z',
        direction: 'in',
        sku: 'OBJ-BAG-338',
        optionLabel: '단일 상품',
        quantity: 1,
      },
    ],
    // 이미 환불까지 끝난 건 — 주문 상세의 '환불 38,250원' 메모와 같은 금액이어야 한다.
    refund: {
      ...NO_REFUND,
      status: 'completed',
      paidAmount: 38250,
      completedAt: '2026-07-09T10:25:00.000Z',
    },
    adminNote: '환불 완료(2026-07-09).',
  },
  {
    id: 'clm-5',
    orderId: 'ORD-20260703-0177',
    productId: 'prd-4',
    productName: '카밀 워시드 데님 팬츠',
    customer: '정**',
    memberId: 'mem-8',
    kind: 'exchange',
    optionValues: ['30'],
    exchangeOptionValues: ['32'],
    reason: '변심 교환',
    reasonDetail: '착용 흔적이 있어 교환 규정에 맞지 않습니다.',
    quantity: 1,
    requestedAt: '2026-07-03',
    status: 'rejected',
    stockAppliedAt: '',
    stockMovements: [],
    refund: NO_REFUND,
    adminNote: '착용 흔적으로 교환 반려 안내함.',
  },
  {
    id: 'clm-6',
    orderId: 'ORD-20260716-0005',
    productId: 'prd-3',
    productName: '테라 스니커즈 데일리',
    customer: '서**',
    memberId: 'mem-5',
    kind: 'cancel',
    optionValues: ['250'],
    exchangeOptionValues: [],
    reason: '주문 실수',
    reasonDetail: '사이즈를 잘못 골라 취소하고 다시 주문하겠습니다.',
    quantity: 1,
    requestedAt: '2026-07-17',
    status: 'requested',
    stockAppliedAt: '',
    stockMovements: [],
    // 적립금 3,000원을 쓴 주문 — 환불완료 처리를 해야 그 3,000원이 원장으로 돌아간다.
    refund: {
      ...NO_REFUND,
      status: 'requested',
      paidAmount: 76000,
      pointUsed: 3000,
    },
    adminNote: '',
  },
  {
    id: 'clm-7',
    orderId: 'ORD-20260719-0003',
    productId: 'prd-1',
    productName: '루미엔 경량 패딩 점퍼',
    customer: '남**',
    memberId: '',
    kind: 'cancel',
    optionValues: ['베이지', 'M'],
    exchangeOptionValues: [],
    reason: '입금 전 취소',
    reasonDetail: '가상계좌 입금 전에 취소를 요청했습니다.',
    quantity: 1,
    requestedAt: '2026-07-19',
    status: 'requested',
    stockAppliedAt: '',
    stockMovements: [],
    // 비회원 주문이라 적립금 원장이 없다 — 쓴 적립금도 0이라 복원할 것도 없다.
    refund: { ...NO_REFUND, paidAmount: 103200 },
    adminNote: '',
  },
  {
    id: 'clm-8',
    orderId: 'ORD-20260720-0002',
    productId: 'prd-5',
    // 취소는 주문 단위라 대표 품목으로 적는다(목록의 '외 N건' 표기와 같은 규칙)
    productName: '오브제 미니멀 크로스백 외 1건',
    customer: '오**',
    memberId: 'mem-2',
    kind: 'cancel',
    optionValues: [],
    exchangeOptionValues: [],
    reason: '배송 지연',
    reasonDetail: '배송이 늦어져 주문 전체를 취소합니다.',
    quantity: 1,
    requestedAt: '2026-07-21',
    status: 'requested',
    stockAppliedAt: '',
    stockMovements: [],
    // 쿠폰(5,000원)과 적립금(1,000원)을 함께 쓴 주문 — 쿠폰을 복원하면 그 할인만큼을 환불에서
    // 회수한다(안 그러면 고객이 할인과 쿠폰을 둘 다 갖는다 — ./refund 머리말).
    refund: {
      ...NO_REFUND,
      status: 'requested',
      paidAmount: 52150,
      pointUsed: 1000,
      couponDiscount: 5000,
      couponName: '여름맞이 5천원 할인',
      couponRestored: true,
    },
    adminNote: '',
  },
];

let seq = CLAIM_SEED.length;

/* ── 참조 · 조회 ──────────────────────────────────────────────────────────── */

/**
 * 클레임이 가리키는 주문 — 모르면 null.
 *
 * 조회기가 배선되지 않았을 때 빈 배열로 조인하면 '주문이 삭제됐다' 는 결론이 나온다. 그래서
 * '없다' 와 '모른다' 를 가르고, 취소 가드는 모를 때 막는다(shared/domain/order-ref 머리말).
 */
export function findClaimOrder(orderId: string): OrderRef | null {
  const catalog = orderCatalog();
  if (catalog === null) return null;
  return findOrderRef(catalog, orderId);
}

/* ── 부수효과 ─────────────────────────────────────────────────────────────── */

function reject(message: string, field: string): never {
  throw new HttpError(HTTP_STATUS.unprocessable, message, {
    violations: [{ field, message }],
  });
}

/**
 * 모인 위반을 한 번에 거절한다 — **하나만 돌려주지 않는다**.
 *
 * [왜 첫 위반에서 멈추지 않나] 서버 계약(BE-044 §6.1)의 `error.fields` 는 필드→문구 **map** 이다.
 * 한 번의 저장이 여러 칸을 동시에 어길 수 있고, 그때 하나씩만 돌려주면 운영자는 고치고 저장하고
 * 또 거절당하기를 반복하며 **몇 번 남았는지 알 수 없는** 상태에 놓인다.
 *
 * `message`(응답 본문의 top-level 문구)는 호출부가 정한다. 전부를 보이는 일은 위반을 읽는 쪽,
 * 즉 화면의 `placeViolations` 가 한다.
 */
function rejectAll(
  status: HttpStatus,
  message: string,
  violations: readonly FieldViolation[],
): never {
  throw new HttpError(status, message, { violations });
}

/**
 * 400 응답의 top-level 문구 — **어느 칸인지는 `error.fields` 에만 있다**(BE-044 §6.1).
 *
 * 전이 위반(422)은 가드가 돌려준 한 문장이 곧 사유라 그것을 message 로 올리지만, 형식 위반은
 * 한 번에 여러 칸을 훑으므로 대표 문장이 없다. 그래서 여기는 일부러 일반 문구다 — 화면이
 * `violations` 를 읽지 않으면 **어느 칸이 틀렸는지 알 방법이 없다**(그게 결함 c 였다).
 */
const VALIDATION_FAILED = '입력값을 확인해 주세요.';

/**
 * 형식 위반 — 400 `VALIDATION_FAILED` (BE-044 §6.1 의 `error.fields`).
 *
 * [왜 화면이 이미 막는 것을 다시 보는가] 화면의 `maxLength`·select 선택지·`parseFeeInput` 은
 * **브라우저 입력만** 막는다. 프로그램적으로 채워진 값(자동입력·확장·구형 클라이언트)은 그대로
 * 나가고, 그것을 거르는 것은 서버의 일이다. 이 픽스처가 그 서버 자리에 있다.
 *
 * TODO(backend): 실제 응답의 `error.fields`(필드→문구 map) → `HttpError.violations` 변환은
 *   **응답 인터셉터 한 곳**의 일이다(shared/api/client.ts — status→HttpError 변환의 정본).
 *   여기서는 픽스처가 서버 역할을 하므로 같은 모양을 직접 싣는다 — 화면이 읽는 표면
 *   (`HttpError.violations`)은 백엔드가 붙어도 그대로다.
 */
function assertFormat(next: Claim): void {
  const fields: FieldViolation[] = [];

  if (next.adminNote.length > CLAIM_NOTE_MAX) {
    fields.push({
      field: 'adminNote',
      message: `처리 메모는 ${String(CLAIM_NOTE_MAX)}자를 넘을 수 없습니다.`,
    });
  }

  if (!Number.isSafeInteger(next.refund.returnShippingFee) || next.refund.returnShippingFee < 0) {
    fields.push({ field: 'returnShippingFee', message: REFUND_FEE_INVALID });
  }

  if (fields.length > 0) rejectAll(HTTP_STATUS.badRequest, VALIDATION_FAILED, fields);
}

/** 전이 합법성 — 화면의 버튼과 **같은 술어**를 읽는다(머리말) */
function assertTransitions(current: Claim, next: Claim): void {
  const order = findClaimOrder(current.orderId);
  const violations: FieldViolation[] = [];

  if (next.status !== current.status) {
    const blocked = claimTransitionBlock(current, next.status, order);
    if (blocked !== null) violations.push({ field: 'status', message: blocked });
  }

  if (next.refund.status !== current.refund.status) {
    // 환불 가드는 **저장 이후의 클레임 상태**로 판정한다 — 완료와 환불완료를 한 번에 저장하는
    // 경로가 있고, 그때 이전 상태로 판정하면 방금 완료한 클레임을 '아직 완료 전' 이라며 막는다.
    const gate = { ...current, status: next.status, refund: current.refund };
    const blocked = refundTransitionBlock(gate, next.refund.status);
    if (blocked !== null) violations.push({ field: 'refundStatus', message: blocked });
  }

  // 환불이 끝난 뒤에는 차감을 바꿀 수 없다 — 이미 나간 돈의 근거를 사후에 고치는 일이다.
  if (current.refund.completedAt !== '') {
    const frozen =
      next.refund.returnShippingFee !== current.refund.returnShippingFee ||
      next.refund.couponRestored !== current.refund.couponRestored ||
      next.refund.paidAmount !== current.refund.paidAmount;
    if (frozen) {
      violations.push({
        field: 'returnShippingFee',
        message: '환불이 완료되어 차감 내역을 바꿀 수 없습니다.',
      });
    }
  }

  // 422 의 top-level 문구는 첫 위반 그대로다 — 위반을 읽지 않는 소비자(토스트·로그)도 사람이
  // 읽는 한 문장을 받는다. 전이 가드가 돌려준 문장이 곧 사유라 대표로 세울 수 있다.
  const first = violations[0];
  if (first !== undefined) rejectAll(HTTP_STATUS.unprocessable, first.message, violations);
}

/** 옵션·재고를 읽는다 — 모르면 422 로 막는다(모르는 채로 재고를 움직이지 않는다) */
function variantsOrReject(productId: string): readonly VariantRef[] {
  const variants = variantsOf(productId);
  if (variants === null) {
    throw new HttpError(
      HTTP_STATUS.unprocessable,
      '연결된 상품의 옵션을 확인할 수 없어 재고를 반영할 수 없습니다.',
    );
  }
  return variants;
}

/**
 * 완료 처리의 재고 부수효과.
 *   · 완료가 아니면(진행·반려·철회) 재고를 건드리지 않는다.
 *   · 취소는 완료여도 재고를 건드리지 않는다 — 복원은 주문 취소가 한다(./types 의 movesStock).
 *   · 이미 반영된 클레임은 다시 반영하지 않는다(stockAppliedAt 이 멱등 키다).
 *   · 재고 부족·옵션 미선택은 422 로 막는다 — 화면이 필드 인라인 오류로 되돌린다.
 *   · 적용기가 배선되지 않았으면 멱등 키를 **찍지 않는다** — 재고는 그대로인데 원장만 '반영 완료'
 *     라고 말하는 상태를 만들지 않는다(shared/domain/stock.ts 머리말).
 */
function applyStockEffects(next: Claim): Claim {
  if (!movesStock(next) || isStockApplied(next)) return next;

  const variants = variantsOrReject(next.productId);
  const issue = validateStockPlan(next, variants);
  if (issue !== null) {
    reject(
      stockIssueMessage(issue),
      issue === 'unknown-origin' ? 'optionValues' : 'exchangeOptionValues',
    );
  }

  const at = new Date().toISOString();
  const movements = planStockMovements(next, variants, at);
  if (!applyStockMovements(movements)) return next;

  return {
    ...next,
    stockAppliedAt: at,
    stockMovements: [...next.stockMovements, ...movements],
  };
}

/**
 * 환불완료의 복원 부수효과 — 적립금은 **양수 1건**으로 원장에 덧붙는다(수정이 아니다).
 *
 * completedAt 이 멱등 키다: 이미 찍힌 클레임을 다시 저장해도 원장에 또 적히지 않는다. 원장은
 * append-only 라 두 번 적힌 지급은 되돌릴 수도 없다 — 가장 고치기 어려운 종류의 사고다.
 *
 * 원장이 배선되지 않았으면 **완료를 거절한다**(500). 여기서 조용히 통과시키면 멱등 키가 찍히고,
 * 적립금은 돌아오지 않은 채 화면만 '복원 완료' 라고 말하는 상태가 영구히 남는다.
 */
function applyRefundEffects(next: Claim): Claim {
  if (next.refund.status !== 'completed' || next.refund.completedAt !== '') return next;

  const plan = planRefundRestoration(next);
  const at = new Date().toISOString();
  const appended = appendPointRestore({
    memberId: next.memberId,
    orderNo: next.orderId,
    reason: restoreReason(next.kind),
    amount: plan.point,
    date: at.slice(0, 10),
  });
  if (!appended) {
    throw new HttpError(
      HTTP_STATUS.serverError,
      '적립금 원장에 연결되지 않아 환불을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
  }

  // TODO(backend): 쿠폰 복원은 발급 1건을 새로 만드는 일이다(사용 표시를 지우는 것이 아니다 —
  //   '언제 썼다' 는 사실은 남아야 한다). 지금은 복원 여부만 클레임에 기록하고, 재발급은 서버가
  //   POST /api/members/:id/coupons 로 처리한다. 화면은 그 사실을 복원 결과에 함께 밝힌다.
  return {
    ...next,
    refund: { ...next.refund, completedAt: at, restoredPoint: plan.point },
  };
}

/**
 * 저장 한 번의 부수효과 — 형식 검사 → 전이 검사 → 재고 → 환불 복원 순서로 한 덩이에서 일어난다.
 *
 * 형식(400)이 규칙(422)보다 먼저인 이유: 값이 형식조차 맞지 않으면 전이 판정이 무엇을 근거로
 * 했는지 말할 수 없다. 서버가 400 을 422 보다 먼저 내는 것과 같은 순서다(BE-044 §6.1).
 */
function patchClaim(current: Claim, input: ClaimInput): Claim {
  const next: Claim = { ...current, ...input, id: current.id };
  assertFormat(next);
  assertTransitions(current, next);
  return applyRefundEffects(applyStockEffects(next));
}

// TODO(backend): GET /api/claims · GET/PUT /api/claims/:id (상태 전이 · 환불 처리 · 처리 메모)
//   · 완료 전이는 재고 이동을, 환불완료는 적립금 원장 기입을 동반한다 — 서버는 클레임 갱신 +
//     SKU 재고 증감 + 원장 append 를 한 트랜잭션으로 처리하고, 재고 부족이면 422 로 거절한다.
//     멱등키는 stockAppliedAt · refund.completedAt 이다.
//   · POST 는 열지 않는다: 클레임을 만드는 것은 관리자가 아니라 고객의 접수다.
export const claimAdapter = createCrudAdapter<Claim, ClaimInput>({
  scope: SCOPE,
  seed: CLAIM_SEED,
  // 어댑터 계약이 요구해서 열어 둘 뿐, 이 문을 여는 버튼은 관리자 화면에 없다
  build: (input) => {
    seq += 1;
    return { id: `clm-${String(seq)}`, ...input };
  },
  patch: patchClaim,
  sort: sortClaims,
});

// TODO(backend): GET /api/products/:id/variants — 교환 옵션(SKU)·재고 조회. 옵션의 정본은 상품이라
//   클레임이 자기 사본을 들지 않는다(옵션이 바뀌면 화면이 바로 그 사실을 본다).
export async function fetchClaimVariants(
  productId: string,
  signal?: AbortSignal,
): Promise<readonly VariantRef[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'detail');
  const variants = variantsOf(productId);
  if (variants === null) {
    throw new HttpError(HTTP_STATUS.notFound, '연결된 상품의 옵션을 찾을 수 없습니다.');
  }
  return variants;
}
