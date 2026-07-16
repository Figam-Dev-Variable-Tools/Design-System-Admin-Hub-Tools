// 교환/반품 도메인 타입 · 순수 규칙 · 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/products/**)
//
// 국내 커머스 관례를 따른다: 유형(교환/반품)·사유·상태 흐름(접수→수거중→검수중→완료, 또는 반려).
// 요청은 감사 성격이라 목록에서 삭제하지 않고 상태만 진행한다.
//
// [재고 연동] 옵션(SKU)·재고의 정본은 상품 저장소(../_shared/store)다 — 여기서 옵션 매트릭스를
// 재정의하지 않고 ProductVariant 를 그대로 소비한다. 요청은 '어떤 SKU 를 몇 개' 움직이는지만 안다.
import type { StatusTone } from '../../../shared/ui';
import type { ProductVariant } from '../_shared/store';

/** 요청 유형 — 교환/반품 */
export type ReturnKind = 'exchange' | 'return';

/** 처리 상태 — 접수 → 수거중 → 검수중 → 완료 / 반려(off-flow 종료) */
export type ReturnStatus = 'requested' | 'collecting' | 'inspecting' | 'completed' | 'rejected';

/** 전체 상태 목록 — 타입가드의 단일 원천(파일 내부 전용) */
const RETURN_STATUSES = ['requested', 'collecting', 'inspecting', 'completed', 'rejected'] as const;

/** 상태 타입가드 — select 값(문자열)을 ReturnStatus 로 안전하게 좁힌다(as 캐스팅 대신) */
export function isReturnStatus(value: unknown): value is ReturnStatus {
  return typeof value === 'string' && (RETURN_STATUSES as readonly string[]).includes(value);
}

/** 재고 이동 방향 — 입고(회수분이 창고로) / 출고(교환 재발송분이 고객에게) */
type StockDirection = 'in' | 'out';

/**
 * 확정된 재고 이동 한 건 — 완료 처리 시점에 기록되어 요청에 남는다(감사 이력).
 * 어떤 SKU 가 몇 개 움직였는지를 상품 옵션이 나중에 바뀌어도 읽을 수 있게 스냅숏으로 들고 있다.
 */
export interface StockMovement {
  readonly id: string;
  /** 이동 시각 ISO */
  readonly at: string;
  readonly direction: StockDirection;
  readonly sku: string;
  /** 이동 시점의 옵션 표기 — '블랙 / M' */
  readonly optionLabel: string;
  readonly quantity: number;
}

export interface ReturnRequest {
  readonly id: string;
  /** 주문번호 — 요청 식별 */
  readonly orderNo: string;
  /** 대상 상품 id — 옵션·재고의 정본은 상품 저장소다 */
  readonly productId: string;
  readonly productName: string;
  /** 신청자 — 마스킹된 이름(실명 아님) */
  readonly customer: string;
  readonly kind: ReturnKind;
  /** 주문된 옵션 조합(상품 optionGroups 순서). 단일 상품이면 빈 배열 */
  readonly optionValues: readonly string[];
  /** 교환 희망 옵션 조합 — 교환 요청만 쓴다. 빈 배열이면 미선택 */
  readonly exchangeOptionValues: readonly string[];
  /** 사유(요약) */
  readonly reason: string;
  /** 사유 상세 */
  readonly reasonDetail: string;
  readonly quantity: number;
  /** 환불 예정 금액 — 반품 시(원). 교환은 0 */
  readonly refundAmount: number;
  /** 접수일 — 'YYYY-MM-DD' */
  readonly requestedAt: string;
  readonly status: ReturnStatus;
  /** 재고 반영 시각 ISO — '' 면 미반영. 재반영을 막는 멱등 키다 */
  readonly stockAppliedAt: string;
  /** 확정된 재고 이동 이력 */
  readonly stockMovements: readonly StockMovement[];
  /** 관리자 처리 메모 */
  readonly adminNote: string;
}

export type ReturnRequestInput = Omit<ReturnRequest, 'id'>;

export const RETURN_NOTE_MAX = 500;

export const KIND_OPTIONS: readonly { readonly id: ReturnKind; readonly label: string }[] = [
  { id: 'exchange', label: '교환' },
  { id: 'return', label: '반품' },
];

export function kindLabel(kind: ReturnKind): string {
  return KIND_OPTIONS.find((option) => option.id === kind)?.label ?? kind;
}

export function kindTone(kind: ReturnKind): StatusTone {
  return kind === 'exchange' ? 'info' : 'warning';
}

/** 정상 처리 흐름(반려 제외) — 상세의 진행 스텝퍼가 쓴다 */
export const RETURN_FLOW: readonly ReturnStatus[] = [
  'requested',
  'collecting',
  'inspecting',
  'completed',
];

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

const STATUS_META: Record<ReturnStatus, StatusMeta> = {
  requested: { label: '접수', tone: 'neutral' },
  collecting: { label: '수거중', tone: 'info' },
  inspecting: { label: '검수중', tone: 'warning' },
  completed: { label: '완료', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
};

export function statusLabel(status: ReturnStatus): string {
  return STATUS_META[status].label;
}

export function statusMeta(status: ReturnStatus): StatusMeta {
  return STATUS_META[status];
}

export const STATUS_FILTER_ALL = 'all';
export type StatusFilter = typeof STATUS_FILTER_ALL | ReturnStatus;

export const STATUS_FILTER_OPTIONS: readonly {
  readonly id: StatusFilter;
  readonly label: string;
}[] = [
  { id: STATUS_FILTER_ALL, label: '전체 상태' },
  { id: 'requested', label: '접수' },
  { id: 'collecting', label: '수거중' },
  { id: 'inspecting', label: '검수중' },
  { id: 'completed', label: '완료' },
  { id: 'rejected', label: '반려' },
];

/** 상태 필터('전체'면 전체) */
export function filterByStatus(
  list: readonly ReturnRequest[],
  filter: StatusFilter,
): readonly ReturnRequest[] {
  if (filter === STATUS_FILTER_ALL) return list;
  return list.filter((request) => request.status === filter);
}

/** 주문번호·상품·신청자 검색(대소문자 무시) */
export function searchReturns(
  list: readonly ReturnRequest[],
  keyword: string,
): readonly ReturnRequest[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (request) =>
      request.orderNo.toLowerCase().includes(needle) ||
      request.productName.toLowerCase().includes(needle) ||
      request.customer.toLowerCase().includes(needle),
  );
}

/** 접수일 내림차순(최근이 위). 같은 날짜는 id 안정 정렬. 테스트가 직접 부른다. */
export function sortReturns(list: readonly ReturnRequest[]): readonly ReturnRequest[] {
  return [...list].sort((a, b) => {
    if (a.requestedAt !== b.requestedAt) return a.requestedAt < b.requestedAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 항목 → 쓰기 입력(id 제외). 상세 저장이 쓴다. */
export function toReturnInput(request: ReturnRequest): ReturnRequestInput {
  return {
    orderNo: request.orderNo,
    productId: request.productId,
    productName: request.productName,
    customer: request.customer,
    kind: request.kind,
    optionValues: [...request.optionValues],
    exchangeOptionValues: [...request.exchangeOptionValues],
    reason: request.reason,
    reasonDetail: request.reasonDetail,
    quantity: request.quantity,
    refundAmount: request.refundAmount,
    requestedAt: request.requestedAt,
    status: request.status,
    stockAppliedAt: request.stockAppliedAt,
    stockMovements: request.stockMovements.map((movement) => ({ ...movement })),
    adminNote: request.adminNote,
  };
}

/* ── 재고 연동 규칙(순수) — 테스트가 직접 부른다 ──────────────────────────── */

/** 옵션 조합 표기 — '블랙 / M'. 옵션이 없는 상품은 '단일 상품' */
export function optionLabel(values: readonly string[]): string {
  return values.length === 0 ? '단일 상품' : values.join(' / ');
}

/** 옵션 조합으로 SKU(변형)를 찾는다 — 값과 순서가 모두 같아야 한다 */
export function findVariant(
  variants: readonly ProductVariant[],
  optionValues: readonly string[],
): ProductVariant | undefined {
  return variants.find(
    (variant) =>
      variant.optionValues.length === optionValues.length &&
      variant.optionValues.every((value, index) => value === optionValues[index]),
  );
}

/** 재고가 이미 반영됐는가 — 완료 처리에서 딱 한 번만 움직인다(중복 반영 방지) */
export function isStockApplied(request: Pick<ReturnRequest, 'stockAppliedAt'>): boolean {
  return request.stockAppliedAt !== '';
}

/** 완료 처리 시 재고를 움직이는 상태인가 — 반려·진행 중은 재고를 건드리지 않는다 */
export function movesStock(status: ReturnStatus): boolean {
  return status === 'completed';
}

/** 교환/반품 재고 유효성 위반 — 각기 다른 복구 안내를 준다 */
type StockIssue = 'unknown-origin' | 'no-option' | 'unknown-option' | 'insufficient-stock';

const STOCK_ISSUE_MESSAGE: Record<StockIssue, string> = {
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
 *   · 반품: 주문 옵션(회수분 입고 대상)이 상품에 있어야 한다.
 *   · 교환: 위 + 교환 옵션이 선택돼 있고, 상품에 있고, 재고가 수량 이상이어야 한다.
 */
export function validateStockPlan(
  request: Pick<ReturnRequest, 'kind' | 'quantity' | 'optionValues' | 'exchangeOptionValues'>,
  variants: readonly ProductVariant[],
): StockIssue | null {
  if (findVariant(variants, request.optionValues) === undefined) return 'unknown-origin';
  if (request.kind !== 'exchange') return null;
  if (request.exchangeOptionValues.length === 0) return 'no-option';
  const target = findVariant(variants, request.exchangeOptionValues);
  if (target === undefined) return 'unknown-option';
  if (target.stock < request.quantity) return 'insufficient-stock';
  return null;
}

/**
 * 재고 이동 계획(순수) — 완료 처리 시 확정한다.
 *   · 반품: 회수분 입고(주문 옵션 +수량)
 *   · 교환: 회수분 입고(주문 옵션 +수량) + 재발송분 출고(교환 옵션 −수량)
 * validateStockPlan 이 null 을 준 요청만 넘긴다 — 찾지 못한 옵션은 이동에서 빠진다.
 */
export function planStockMovements(
  request: Pick<ReturnRequest, 'kind' | 'quantity' | 'optionValues' | 'exchangeOptionValues'>,
  variants: readonly ProductVariant[],
  at: string,
): readonly StockMovement[] {
  const movements: StockMovement[] = [];
  const origin = findVariant(variants, request.optionValues);
  if (origin !== undefined) {
    movements.push({
      id: `mv-${at}-in`,
      at,
      direction: 'in',
      sku: origin.sku,
      optionLabel: optionLabel(origin.optionValues),
      quantity: request.quantity,
    });
  }
  if (request.kind === 'exchange') {
    const target = findVariant(variants, request.exchangeOptionValues);
    if (target !== undefined) {
      movements.push({
        id: `mv-${at}-out`,
        at,
        direction: 'out',
        sku: target.sku,
        optionLabel: optionLabel(target.optionValues),
        quantity: request.quantity,
      });
    }
  }
  return movements;
}

/** 재고 이동을 SKU 재고에 적용한다(순수) — 입고 +, 출고 −. 음수 재고는 만들지 않는다. */
export function applyMovements(
  variants: readonly ProductVariant[],
  movements: readonly StockMovement[],
): readonly ProductVariant[] {
  return variants.map((variant) => {
    const delta = movements.reduce(
      (sum, movement) =>
        movement.sku === variant.sku
          ? sum + (movement.direction === 'in' ? movement.quantity : -movement.quantity)
          : sum,
      0,
    );
    return delta === 0 ? variant : { ...variant, stock: Math.max(0, variant.stock + delta) };
  });
}
