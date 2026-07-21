// 클레임(취소·교환·반품) 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 '교환/반품' 이 '클레임' 이 되었나 — 취소가 갈 곳이 없었다]
// 예전 유형은 `'exchange' | 'return'` 둘뿐이었다. 그런데 대시보드의 '취소관리' 는 갈 곳이 없어
// 반품 화면을 가리키고 있었고, 운영자는 취소 건을 '반품' 으로 접수해 놓고 메모에 '실은 취소' 라고
// 적었다. 카페24가 이 셋을 한 창구(클레임)에서 다루는 이유가 그것이다 — 셋은 **같은 사건의 세
// 시점**이다: 출고 전에 멈추면 취소, 나갔다 돌아오면 반품, 돌아오고 다시 나가면 교환.
//
// [왜 주문 아래로 옮겼나]
// 클레임이 가리키는 것은 상품이 아니라 **주문**이다(주문번호·결제액·적립금·쿠폰이 전부 주문의 것).
// 상품 관리 아래에 있는 동안 이 화면은 주문을 문자열로만 알았고, 그래서 '이 번호가 실재하는가'
// 조차 답하지 못했다. 지금은 orderId 로 주문을 가리키고(shared/domain/order-ref), 출고 여부 같은
// 주문의 사실을 그대로 읽어 규칙에 쓴다(취소는 출고 전에만 접수된다).
//
// [무엇이 여기 있고 무엇이 도메인에 있나]
// 주문의 상태 기계·금액·재고 차감 시점은 **도메인**(shared/domain/order.ts)의 것이다 — 통계·적립
// 원장도 같은 규칙을 읽는다. 이 파일은 그 위에 **클레임만의 것**을 얹는다: 유형·처리 흐름·전이
// 가드·재고 이동 계획. 환불 축(금액 계산·복원)은 부피가 있어 옆 파일로 갈랐다(./refund).
//
// [전이 가드는 사유 문자열을 돌려준다]
// 화면의 비활성 버튼 옆에 **왜 못 누르는지**를 그대로 쓸 수 있어야 하고, 저장소도 같은 함수로
// 막아야 한다. boolean 만 주면 화면이 사유를 다시 지어내고 그 순간 규칙이 두 벌이 된다
// (선례이자 정본: shared/domain/order.ts 의 orderTransitionBlock).
// ─────────────────────────────────────────────────────────────────────────────
import { hasLeftWarehouse } from '../../../shared/domain/order';
import { HTTP_STATUS, isHttpError } from '../../../shared/errors/http-error';
import type { FieldViolation } from '../../../shared/errors/http-error';
import type { OrderRef } from '../../../shared/domain/order-ref';
import type { StockMovement } from '../../../shared/domain/stock';
import type { StatusTone } from '../../../shared/ui';
import type { VariantRef } from '../../../shared/domain/variant-ref';
import type { ClaimRefund } from './refund';

/**
 * 재고 이동 기록과 그 적용 산술은 **공통 층이 소유한다**(shared/domain/stock.ts).
 *
 * 주문도 같은 이동을 기록하기 때문이다 — 두 벌로 적으면 같은 SKU 의 증감이 두 이야기가 된다.
 * 이름은 여기서 그대로 재수출하므로 이 모듈의 소비자(data-source·테스트·StockMovementTable)는
 * './types' 하나만 본다.
 */
export type { StockMovement } from '../../../shared/domain/stock';
export { applyMovements } from '../../../shared/domain/stock';

/* ── 유형 ─────────────────────────────────────────────────────────────────── */

/** 클레임 유형 — 취소/교환/반품. 셋을 가르는 것은 '출고' 시점이다(머리말) */
export type ClaimKind = 'cancel' | 'exchange' | 'return';

export const KIND_OPTIONS: readonly { readonly id: ClaimKind; readonly label: string }[] = [
  { id: 'cancel', label: '취소' },
  { id: 'exchange', label: '교환' },
  { id: 'return', label: '반품' },
];

/** 유형 목록에 없는 값이 들어오면 그 자체를 보여 준다 — 라벨을 지어내 감추지 않는다 */
export function kindLabel(kind: ClaimKind): string {
  return KIND_OPTIONS.find((option) => option.id === kind)?.label ?? kind;
}

/** 키를 다 적은 Record — 유형이 하나 늘면 컴파일이 막아 준다(`find ?? 기본값` 을 쓰지 않는 이유) */
const KIND_TONE: Readonly<Record<ClaimKind, StatusTone>> = {
  cancel: 'danger',
  exchange: 'info',
  return: 'warning',
};

export function kindTone(kind: ClaimKind): StatusTone {
  return KIND_TONE[kind];
}

/* ── 처리 상태 ────────────────────────────────────────────────────────────── */

/**
 * 처리 상태 — 접수 → 수거중 → 검수중 → 완료, 그리고 흐름 밖 종료 둘(반려·철회).
 *
 * 철회(withdrawn)가 왜 상태인가: 접수를 되돌리는 유일한 역방향 전이라 '없던 일' 로 지울 수 없다.
 * 지우면 고객이 접수했다는 사실 자체가 사라지고, 같은 건이 다시 들어왔을 때 재접수인지 최초인지
 * 아무도 모른다. 요청은 감사 성격이라 목록에서 삭제하지 않고 상태만 진행한다(예전 규약 그대로).
 */
export type ClaimStatus =
  'requested' | 'collecting' | 'inspecting' | 'completed' | 'rejected' | 'withdrawn';

const CLAIM_STATUSES = [
  'requested',
  'collecting',
  'inspecting',
  'completed',
  'rejected',
  'withdrawn',
] as const;

/** 상태 타입가드 — select 값(문자열)을 ClaimStatus 로 안전하게 좁힌다(as 캐스팅 대신) */
export function isClaimStatus(value: unknown): value is ClaimStatus {
  return typeof value === 'string' && (CLAIM_STATUSES as readonly string[]).includes(value);
}

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

const STATUS_META: Readonly<Record<ClaimStatus, StatusMeta>> = {
  requested: { label: '접수', tone: 'neutral' },
  collecting: { label: '수거중', tone: 'info' },
  inspecting: { label: '검수중', tone: 'warning' },
  completed: { label: '완료', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
  withdrawn: { label: '철회', tone: 'neutral' },
};

export function statusLabel(status: ClaimStatus): string {
  return STATUS_META[status].label;
}

export function statusMeta(status: ClaimStatus): StatusMeta {
  return STATUS_META[status];
}

/**
 * 유형별 정상 처리 흐름 — 상세의 진행 스텝퍼와 전이 가드가 **같은 배열**을 읽는다.
 *
 * 취소에 수거·검수가 없는 이유: 물건이 아직 창고에 있다. 없는 단계를 흐름에 남겨 두면 스텝퍼가
 * 영원히 채워지지 않는 칸 둘을 그리고, 운영자는 '무엇을 더 해야 하나' 를 계속 찾게 된다.
 * 반려·철회는 흐름 밖 종료라 여기 없다 — 화면이 배지로 따로 알린다.
 */
export function claimFlow(kind: ClaimKind): readonly ClaimStatus[] {
  if (kind === 'cancel') return ['requested', 'completed'];
  return ['requested', 'collecting', 'inspecting', 'completed'];
}

/** 흐름 밖 종료 — 어느 유형에서나 갈 수 있다(반려·철회) */
const OFF_FLOW: readonly ClaimStatus[] = ['rejected', 'withdrawn'];

/** 더 이상 움직이지 않는 상태 — 완료·반려·철회 */
export function isTerminal(status: ClaimStatus): boolean {
  return status === 'completed' || OFF_FLOW.includes(status);
}

/**
 * 흐름 위의 위치. 흐름에 없는 값은 −1 이 아니라 **끝 다음**으로 본다 — 그러면 어떤 전이도
 * 허용되지 않는 쪽(fail-closed)으로 수렴한다(order.ts 의 statusIndex 와 같은 규약).
 */
function flowIndex(kind: ClaimKind, status: ClaimStatus): number {
  const flow = claimFlow(kind);
  const index = flow.indexOf(status);
  return index === -1 ? flow.length : index;
}

/* ── 상태 필터 ────────────────────────────────────────────────────────────── */

export const STATUS_FILTER_ALL = 'all';
export type StatusFilter = typeof STATUS_FILTER_ALL | ClaimStatus;

export const STATUS_FILTER_OPTIONS: readonly {
  readonly id: StatusFilter;
  readonly label: string;
}[] = [
  { id: STATUS_FILTER_ALL, label: '전체 상태' },
  ...CLAIM_STATUSES.map((status) => ({ id: status, label: STATUS_META[status].label })),
];

/* ── 클레임 ───────────────────────────────────────────────────────────────── */

export interface Claim {
  readonly id: string;
  /**
   * 주문 참조 — 예전에는 `orderNo: string` 이라 실재하는 주문인지도 알 수 없었다.
   * 값은 주문번호를 겸하는 주문 id 이고, 푸는 것은 shared/domain/order-ref 의 조회기다.
   */
  readonly orderId: string;
  /** 대상 상품 id — 옵션·재고의 정본은 상품 관리다(shared/domain/variant-ref 로 읽는다) */
  readonly productId: string;
  /** 접수 시점의 상품명(스냅숏) — 상품이 지워져도 이 행은 자기 이름을 말할 수 있어야 한다 */
  readonly productName: string;
  /** 신청자 — 마스킹된 이름(실명 아님) */
  readonly customer: string;
  /** 회원 id — 적립금 원장의 주인. 비회원 주문이면 '' (되돌릴 원장이 없다) */
  readonly memberId: string;
  readonly kind: ClaimKind;
  /** 주문된 옵션 조합(상품 optionGroups 순서). 단일 상품이면 빈 배열 */
  readonly optionValues: readonly string[];
  /** 교환 희망 옵션 조합 — 교환만 쓴다. 빈 배열이면 미선택 */
  readonly exchangeOptionValues: readonly string[];
  readonly reason: string;
  readonly reasonDetail: string;
  readonly quantity: number;
  /** 접수일 — 'YYYY-MM-DD' */
  readonly requestedAt: string;
  readonly status: ClaimStatus;
  /** 재고 반영 시각 ISO — '' 면 미반영. **재반영을 막는 멱등 키다** */
  readonly stockAppliedAt: string;
  /** 확정된 재고 이동 이력 */
  readonly stockMovements: readonly StockMovement[];
  /** 환불 축 — 클레임 상태와 **나란한 별개의 축**이다(./refund 머리말) */
  readonly refund: ClaimRefund;
  readonly adminNote: string;
}

export type ClaimInput = Omit<Claim, 'id'>;

export const CLAIM_NOTE_MAX = 500;

/** 항목 → 쓰기 입력(id 제외). 상세 저장이 쓴다 */
export function toClaimInput(claim: Claim): ClaimInput {
  return {
    orderId: claim.orderId,
    productId: claim.productId,
    productName: claim.productName,
    customer: claim.customer,
    memberId: claim.memberId,
    kind: claim.kind,
    optionValues: [...claim.optionValues],
    exchangeOptionValues: [...claim.exchangeOptionValues],
    reason: claim.reason,
    reasonDetail: claim.reasonDetail,
    quantity: claim.quantity,
    requestedAt: claim.requestedAt,
    status: claim.status,
    stockAppliedAt: claim.stockAppliedAt,
    stockMovements: claim.stockMovements.map((movement) => ({ ...movement })),
    refund: { ...claim.refund },
    adminNote: claim.adminNote,
  };
}

/* ── 전이 규칙 (순수 술어 — 버튼과 저장이 **같은 것을** 읽는다) ──────────────── */

/** 배럴 밖 소비자가 없다 — 이 파일의 가드만 쓴다(죽은 공개 표면 0) */
const CLAIM_TRANSITION_SAME = '이미 그 상태입니다.';
export const CLAIM_TRANSITION_TERMINAL = '완료·반려·철회된 클레임은 상태를 바꿀 수 없습니다.';
export const CLAIM_TRANSITION_BACKWARD =
  '클레임 처리는 되돌릴 수 없습니다. 접수를 취소하려면 철회로 종료하세요.';
export const CLAIM_TRANSITION_OFF_FLOW = '이 유형에는 없는 처리 단계입니다.';
export const CLAIM_WITHDRAW_STOCK =
  '재고가 이미 반영되어 철회할 수 없습니다. 반영된 재고는 되돌아가지 않습니다.';
export const CLAIM_WITHDRAW_REFUND =
  '환불이 접수되어 철회할 수 없습니다. 환불 처리를 먼저 정리하세요.';
export const CLAIM_CANCEL_SHIPPED =
  '배송이 시작된 주문은 취소로 처리할 수 없습니다. 반품으로 접수해 주세요.';
export const CLAIM_ORDER_UNKNOWN =
  '연결된 주문을 확인할 수 없어 취소를 진행할 수 없습니다. 주문번호를 확인해 주세요.';

/** 전이 가드가 보는 최소 모양 — 목록의 일괄 처리도 이 조각만 들고 물어볼 수 있다 */
type ClaimGate = Pick<Claim, 'kind' | 'status' | 'stockAppliedAt' | 'refund'>;

/**
 * 취소로 **처리**할 수 없는 이유 — 처리할 수 있으면 null.
 *
 * 판정을 여기서 다시 만들지 않고 주문 도메인의 hasLeftWarehouse 를 읽는다: 배송이 떠났는가를
 * 두 곳에서 정하면, 주문 상세는 '취소 불가' 라 하고 클레임 화면은 취소를 받는 날이 온다.
 *
 * 주문을 모르면(null) 막는다 — 배선이 빠졌거나 지워진 주문이다. 모르는 채로 취소를 완료하면
 * 이미 나간 물건을 '출고 전' 으로 처리해 재고와 정산이 함께 어긋난다(fail-closed).
 */
export function cancelBlock(order: OrderRef | null): string | null {
  if (order === null) return CLAIM_ORDER_UNKNOWN;
  if (hasLeftWarehouse(order.status)) return CLAIM_CANCEL_SHIPPED;
  return null;
}

/**
 * 이 클레임을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null.
 *
 * 순서에 뜻이 있다: ① 같은 자리 ② 종료된 클레임 ③ 철회(유일한 역방향) ④ 흐름 밖 단계 ⑤ 역방향
 * ⑥ 취소의 출고 조건. 앞의 것이 더 근본적인 거절이라 사유가 더 정확해진다 — 종료된 클레임에
 * '되돌릴 수 없습니다' 라고 답하면 운영자는 순서를 바꿔 다시 시도한다.
 */
export function claimTransitionBlock(
  claim: ClaimGate,
  to: ClaimStatus,
  order: OrderRef | null,
): string | null {
  if (to === claim.status) return CLAIM_TRANSITION_SAME;
  if (isTerminal(claim.status)) return CLAIM_TRANSITION_TERMINAL;

  if (to === 'withdrawn') {
    // 철회는 접수를 되돌리는 유일한 역방향 전이다 — 되돌릴 수 없는 것이 이미 일어났으면 막는다.
    if (claim.stockAppliedAt !== '') return CLAIM_WITHDRAW_STOCK;
    if (claim.refund.status !== 'none') return CLAIM_WITHDRAW_REFUND;
    return null;
  }
  // 반려는 어느 단계에서나 낼 수 있다 — 출고된 취소 건이라도 종료는 시킬 수 있어야 한다.
  if (to === 'rejected') return null;

  const flow = claimFlow(claim.kind);
  if (!flow.includes(to)) return CLAIM_TRANSITION_OFF_FLOW;
  if (flowIndex(claim.kind, to) <= flowIndex(claim.kind, claim.status)) {
    return CLAIM_TRANSITION_BACKWARD;
  }
  if (claim.kind === 'cancel') return cancelBlock(order);
  return null;
}

export function canTransitionClaim(
  claim: ClaimGate,
  to: ClaimStatus,
  order: OrderRef | null,
): boolean {
  return claimTransitionBlock(claim, to, order) === null;
}

/** 지금 이 클레임이 갈 수 있는 상태들 — 상세의 상태 선택지가 이것만 연다 */
export function nextClaimStatuses(
  claim: ClaimGate,
  order: OrderRef | null,
): readonly ClaimStatus[] {
  return CLAIM_STATUSES.filter((status) => canTransitionClaim(claim, status, order));
}

/* ── 재고 연동 규칙(순수) ─────────────────────────────────────────────────── */

/** 옵션 조합 표기 — '블랙 / M'. 옵션이 없는 상품은 '단일 상품' */
export function optionLabel(values: readonly string[]): string {
  return values.length === 0 ? '단일 상품' : values.join(' / ');
}

/** 옵션 조합으로 SKU(변형)를 찾는다 — 값과 순서가 모두 같아야 한다 */
export function findVariant(
  variants: readonly VariantRef[],
  optionValues: readonly string[],
): VariantRef | undefined {
  return variants.find(
    (variant) =>
      variant.optionValues.length === optionValues.length &&
      variant.optionValues.every((value, index) => value === optionValues[index]),
  );
}

/** 재고가 이미 반영됐는가 — 완료 처리에서 딱 한 번만 움직인다(중복 반영 방지 키) */
export function isStockApplied(claim: Pick<Claim, 'stockAppliedAt'>): boolean {
  return claim.stockAppliedAt !== '';
}

/**
 * 이 클레임이 재고를 움직이는가.
 *
 * [취소는 재고를 움직이지 않는다 — 이 파일에서 가장 조심한 판단]
 * 취소된 주문의 재고를 되돌리는 주체는 **주문**이다(shared/domain/order.ts 의 shouldRestoreStock ·
 * stockRestoredAt). 클레임이 여기서 또 되돌리면 같은 수량이 두 번 들어오고, 두 원장 중 어느 쪽이
 * 거짓인지 나중에는 아무도 가리지 못한다. 그래서 취소 클레임은 '접수·심사·환불' 만 하고 재고
 * 복원은 주문 취소에 맡긴다 — 상세 화면이 그 사실과 주문으로 가는 링크를 함께 보여 준다.
 */
export function movesStock(claim: Pick<Claim, 'kind' | 'status'>): boolean {
  return claim.status === 'completed' && claim.kind !== 'cancel';
}

/** 재고 유효성 위반 — 각기 다른 복구 안내를 준다 */
type StockIssue = 'unknown-origin' | 'no-option' | 'unknown-option' | 'insufficient-stock';

const STOCK_ISSUE_MESSAGE: Readonly<Record<StockIssue, string>> = {
  'unknown-origin': '주문된 옵션을 상품에서 찾을 수 없어 재고를 반영할 수 없습니다.',
  'no-option': '교환할 옵션을 선택하세요.',
  'unknown-option': '선택한 교환 옵션을 상품에서 찾을 수 없습니다. 옵션을 다시 선택하세요.',
  'insufficient-stock': '교환할 옵션의 재고가 부족해 완료 처리할 수 없습니다.',
};

export function stockIssueMessage(issue: StockIssue): string {
  return STOCK_ISSUE_MESSAGE[issue];
}

/**
 * 완료 처리 전 재고 유효성 — null 이면 이동 가능하다.
 *   · 취소: 움직일 재고가 없다(위 movesStock) — 언제나 통과.
 *   · 반품: 주문 옵션(회수분 입고 대상)이 상품에 있어야 한다.
 *   · 교환: 위 + 교환 옵션이 선택돼 있고, 상품에 있고, 재고가 수량 이상이어야 한다.
 */
export function validateStockPlan(
  claim: Pick<Claim, 'kind' | 'quantity' | 'optionValues' | 'exchangeOptionValues'>,
  variants: readonly VariantRef[],
): StockIssue | null {
  if (claim.kind === 'cancel') return null;
  if (findVariant(variants, claim.optionValues) === undefined) return 'unknown-origin';
  if (claim.kind !== 'exchange') return null;
  if (claim.exchangeOptionValues.length === 0) return 'no-option';
  const target = findVariant(variants, claim.exchangeOptionValues);
  if (target === undefined) return 'unknown-option';
  if (target.stock < claim.quantity) return 'insufficient-stock';
  return null;
}

/**
 * 재고 이동 계획(순수) — 완료 처리 시 확정한다.
 *   · 취소: 없음(위 movesStock 의 머리말)
 *   · 반품: 회수분 입고(주문 옵션 +수량)
 *   · 교환: 회수분 입고 + 재발송분 출고(교환 옵션 −수량)
 * validateStockPlan 이 null 을 준 요청만 넘긴다 — 찾지 못한 옵션은 이동에서 빠진다.
 */
export function planStockMovements(
  claim: Pick<Claim, 'kind' | 'quantity' | 'optionValues' | 'exchangeOptionValues'>,
  variants: readonly VariantRef[],
  at: string,
): readonly StockMovement[] {
  if (claim.kind === 'cancel') return [];
  const movements: StockMovement[] = [];
  const origin = findVariant(variants, claim.optionValues);
  if (origin !== undefined) {
    movements.push({
      id: `mv-${at}-in`,
      at,
      direction: 'in',
      sku: origin.sku,
      optionLabel: optionLabel(origin.optionValues),
      quantity: claim.quantity,
    });
  }
  if (claim.kind === 'exchange') {
    const target = findVariant(variants, claim.exchangeOptionValues);
    if (target !== undefined) {
      movements.push({
        id: `mv-${at}-out`,
        at,
        direction: 'out',
        sku: target.sku,
        optionLabel: optionLabel(target.optionValues),
        quantity: claim.quantity,
      });
    }
  }
  return movements;
}

/* ── 필드 단위 거절을 어디에 그리는가(순수) ───────────────────────────────── */

/**
 * 필드 단위 거절을 인라인으로 받는 필드 — **이 화면에 인라인 자리는 이것 하나뿐이다.**
 * 어댑터가 내는 나머지 위반(status · refundStatus · returnShippingFee · optionValues · adminNote)에는
 * 그것을 그리는 입력이 없다.
 */
const INLINE_ERROR_FIELD = 'exchangeOptionValues';

/**
 * 이 422 를 인라인으로 그릴 수 있는가 — 그릴 수 없으면 화면은 배너로 돌린다.
 *
 * [왜 술어로 세우는가] 예전에는 화면이 422 를 무조건 setFieldError 로 보냈다. 그 값을 그리는 곳은
 * 교환 옵션 필드 하나뿐이고 그 필드는 **교환 클레임에만** 렌더되므로, 취소·반품에서 전이·환불·재고
 * 위반 422 가 나면 배너도 토스트도 인라인도 없이 버튼만 조용히 다시 활성화됐다(EXC-07). 실패는
 * 반드시 어딘가에 보여야 하고, '어디에 보일 수 있는가' 는 화면이 눈대중으로 정할 것이 아니다.
 *
 * @param visible 교환 옵션 필드가 **지금 화면에 떠 있는가**(교환 · 옵션 로드됨 · 재고 미반영 ·
 *                모달에 가리지 않음). 자리가 있어도 가려져 있으면 없는 것과 같다.
 */
export function hasInlineErrorSlot(field: string | undefined, visible: boolean): boolean {
  return visible && field === INLINE_ERROR_FIELD;
}

/**
 * 서버가 **어느 입력이 틀렸는지 지목한** 거절인가 — 400 과 422 를 한 갈래로 묶는다.
 *
 * [왜 둘을 같이 다루나] 원인은 다르다: 400 은 형식 위반(유니온 밖 값·길이 초과·비정수),
 * 422 는 규칙 위반(전이·재고·환불)이다. 그러나 **화면이 하는 일은 같다** — 위반을 그 입력으로
 * 되돌리고, 되돌릴 자리가 없는 것은 배너로 모은다. 예전에는 422 만 이 경로를 탔고 400 은
 * '저장하지 못했습니다' 계열의 마지막 가지로 떨어져, 서버가 `error.fields` 로 **어느 칸이
 * 틀렸는지 알려 주는데도** 운영자는 그것을 볼 수 없었다(BE-044 §7.12 #7).
 *
 * [왜 shared/errors 가 아니라 여기인가] `http-error.ts` 에 `isBadRequest` 가 없다 — 400 을
 * 404·5xx 와 다르게 그리는 화면이 지금 이 화면뿐이기 때문이다. 공용 표면을 늘리는 판단은 그
 * 파일의 소유자 몫이라, 400 을 세는 일만 여기서 한다.
 */
export function isFieldRejection(cause: unknown): boolean {
  return (
    isHttpError(cause) &&
    (cause.status === HTTP_STATUS.badRequest || cause.status === HTTP_STATUS.unprocessable)
  );
}

/** 위반 문구를 어느 표면에 그릴 것인가 — 둘 다 null 이 되는 경우는 없다 */
export interface ViolationPlacement {
  /** 교환 옵션 필드에 꽂을 문구 — 그 자리로 갈 위반이 없으면 null */
  readonly inline: string | null;
  /** 카드 배너(확인 다이얼로그가 떠 있으면 그 배너)로 모을 문구 — 없으면 null */
  readonly banner: string | null;
}

/** 문구 목록 → 한 문장. 빈 목록은 '그릴 것이 없다'(null) 다 */
function joinMessages(messages: readonly string[]): string | null {
  return messages.length === 0 ? null : messages.join(' ');
}

/**
 * 위반 전부를 **보이는 자리에** 배치한다 — 하나도 버리지 않는다.
 *
 * [무엇이 결함이었나] 화면은 `violations[0]` 만 읽었다. 어댑터·서버는 한 응답에 여러 위반을
 * 실을 수 있고(BE-044 §6.1 의 `error.fields` 는 필드→문구 **map** 이다), 그때 나머지는 조용히
 * 사라졌다. 운영자는 첫 번째를 고쳐 다시 저장하고, 또 실패하고, 또 하나를 고친다 — 몇 번을
 * 눌러야 끝나는지 아무도 모르는 상태가 된다.
 *
 * [규칙은 직전 수정의 것을 그대로 넓힌 것이다] 인라인 자리가 있는 위반은 인라인으로
 * (`hasInlineErrorSlot`), 나머지는 **전부** 배너로 수렴한다. 하나였을 때의 판정을 N 개로 편 것뿐,
 * 새 규칙이 아니다.
 *
 * @param fallback 필드를 하나도 지목하지 않은 거절의 문구(서버 message) — 그것이 유일한 설명이다
 */
export function placeViolations(
  violations: readonly FieldViolation[],
  fallback: string,
  slotOpen: boolean,
): ViolationPlacement {
  const inline: string[] = [];
  const banner: string[] = [];

  for (const violation of violations) {
    if (hasInlineErrorSlot(violation.field, slotOpen)) inline.push(violation.message);
    else banner.push(violation.message);
  }

  // 필드를 지목하지 않은 거절도 반드시 어딘가에 보인다 — 침묵하지 않는 것이 이 규칙의 목적이다.
  if (inline.length === 0 && banner.length === 0) banner.push(fallback);

  return { inline: joinMessages(inline), banner: joinMessages(banner) };
}

/* ── 목록 표시 규칙(순수) ─────────────────────────────────────────────────── */

/** 상태 필터('전체'면 전체) */
export function filterByStatus(list: readonly Claim[], filter: StatusFilter): readonly Claim[] {
  if (filter === STATUS_FILTER_ALL) return list;
  return list.filter((claim) => claim.status === filter);
}

/** 주문번호·상품·신청자 검색(대소문자 무시) */
export function searchClaims(list: readonly Claim[], keyword: string): readonly Claim[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (claim) =>
      claim.orderId.toLowerCase().includes(needle) ||
      claim.productName.toLowerCase().includes(needle) ||
      claim.customer.toLowerCase().includes(needle),
  );
}

/** 접수일 내림차순(최근이 위). 같은 날짜는 id 안정 정렬 */
export function sortClaims(list: readonly Claim[]): readonly Claim[] {
  return [...list].sort((a, b) => {
    if (a.requestedAt !== b.requestedAt) return a.requestedAt < b.requestedAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}
