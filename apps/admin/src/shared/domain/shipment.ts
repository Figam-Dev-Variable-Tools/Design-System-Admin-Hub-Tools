// 배송 도메인 — 택배사 카탈로그 · 송장 검증 · 부분 발송 판정 · 배송 상태 전이
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 생겼나] 배송은 이 리포에 **정책 문서 1건**뿐이었다(products/shipping). 거기의
// `carrier` 는 택배사 이름을 담은 자유 텍스트 한 줄이라 '대한통운' 과 'CJ대한통운' 이 나란히
// 저장될 수 있었고, 그러면 추적 URL 을 만들 키가 없다. 송장번호·배송 건이라는 개념은 리포 전체에
// 0건이었다 — 주문이 들어와도 '이 건이 언제 어느 택배로 나갔는지' 를 적을 자리가 없었다는 뜻이다.
//
// [왜 페이지 밖에 있는가] 배송을 아는 화면이 둘이고 서로 다른 섹션에 산다.
//   · 배송 처리(/orders/shipments)      — 송장을 붙이고 발송처리한다. 배송 건의 원장.
//   · 배송 정책(/products/shipping)     — 택배사 목록을 관리한다. 택배사의 원장.
// 두 화면이 서로를 import 하면 그 순간 페이지 간 결합(code-quality 축1 · blocker · 임계값 0건)이다.
// 그래서 모델과 규칙은 여기 있고, **두 원장은 조회기로 서로에게 닿는다**(아래 등록 지점 2개).
//
// [주문 상태 기계를 다시 짓지 않는다] '배송대기 → 배송중' 은 주문 상태 흐름(ORDER_STATUS_SEQUENCE)에
// 이미 있다. 이 파일은 그 위에 **배송 축의 사유**만 얹고, 전이 가능 여부는 언제나
// order.ts 의 orderTransitionBlock 에게 먼저 묻는다 — 규칙이 두 벌이 되면 주문 목록의 버튼과
// 배송 처리 화면의 버튼이 같은 주문을 두고 다른 답을 하게 된다.
//
// [배송대기는 실제 상태다] 운송장은 입력됐지만 아직 창고를 떠나지 않은 구간이 국내 운영에는
// 반드시 있다(송장 출력 → 인수인계 사이). 그래서 송장 입력과 발송처리는 **다른 조작**이고,
// waiting → shipping 전이가 곧 '발송처리' 다. 고객 알림이 나갈 지점도 여기다(알림 자체는 아직 없다).
// ─────────────────────────────────────────────────────────────────────────────
import { orderTransitionBlock } from './order';
import type { Order, OrderLine, OrderStatus } from './order';

/* ── 택배사 ──────────────────────────────────────────────────────────────── */

/**
 * 등록된 택배사 1곳.
 *
 * 이름이 아니라 **code 가 식별자**다. 이름은 사람이 읽는 표기라 언제든 바뀌고(‘대한통운’ →
 * ‘CJ대한통운’), 바뀔 수 있는 값을 키로 쓰면 지난 배송 건이 어느 택배사였는지 영영 알 수 없다.
 */
export interface Carrier {
  readonly id: string;
  readonly name: string;
  /** 연동 키 — 영문 대문자·숫자·하이픈. 표기가 바뀌어도 이 값은 그대로다 */
  readonly code: string;
  /**
   * 추적 URL 템플릿 — `{{invoice}}` 자리에 송장번호가 들어간다.
   * 비워 두면 추적 링크를 만들지 않는다(없는 링크를 그리는 것보다 안 그리는 편이 정직하다).
   */
  readonly trackingUrlTemplate: string;
  /** 사용 여부 — 끄면 새 송장의 선택지에서 빠진다. 이미 나간 배송 건은 그대로 남는다 */
  readonly active: boolean;
}

export type CarrierInput = Omit<Carrier, 'id'>;

/** 추적 URL 템플릿의 치환 토큰 — 화면의 안내문과 검증이 같은 문자열을 읽는다 */
export const INVOICE_TOKEN = '{{invoice}}';

export const CARRIER_NAME_MAX = 40;
export const CARRIER_CODE_MAX = 20;

/* ── 택배사 카탈로그 (조회기 배선) ───────────────────────────────────────────
 *
 * 목록의 정본은 배송 정책 화면(pages/products/shipping)이고, 그것을 소비하는 곳은 배송 처리
 * 화면(pages/orders/shipments)이다. 소비자가 정본을 직접 import 하면 페이지 간 결합이라,
 * 공통 층이 **자리만** 만들고 두 도메인을 아는 src/wiring.ts 가 구현을 꽂는다
 * (선례: coupon-catalog · faq-catalog · supplier · order-ref). */

type CarrierCatalogLookup = () => readonly Carrier[];

let carrierCatalogLookup: CarrierCatalogLookup | null = null;

export function registerCarrierCatalogLookup(lookup: CarrierCatalogLookup): void {
  carrierCatalogLookup = lookup;
}

/** 테스트가 서로의 배선을 물려받지 않게 한다 */
export function resetCarrierCatalogLookup(): void {
  carrierCatalogLookup = null;
}

/**
 * 등록된 택배사 전체 — **배선 전에는 null('모른다')** 이다.
 *
 * 빈 배열로 뭉개지 않는 이유: 화면은 '등록된 택배사가 없습니다(등록하러 가기)' 와 '목록을 아직
 * 못 읽었습니다' 에 서로 다른 답을 해야 한다. 전자는 운영자가 할 일이 있고, 후자는 없다.
 */
export function carrierCatalog(): readonly Carrier[] | null {
  return carrierCatalogLookup === null ? null : carrierCatalogLookup();
}

/** 지금 고를 수 있는 택배사 — 사용 중인 것만. 배선 전에는 null */
export function activeCarriers(): readonly Carrier[] | null {
  const list = carrierCatalog();
  return list === null ? null : list.filter((carrier) => carrier.active);
}

/** id 로 택배사 한 곳 — 없거나 미배선이면 null(호출부가 '알 수 없음' 을 그린다) */
export function findCarrier(id: string): Carrier | null {
  const list = carrierCatalog();
  if (list === null) return null;
  return list.find((carrier) => carrier.id === id) ?? null;
}

/** 표에 쓰는 택배사 이름 — 삭제된 택배사를 가리키는 옛 배송 건도 무언가는 말해야 한다 */
export function carrierNameOf(id: string): string {
  return findCarrier(id)?.name ?? '알 수 없는 택배사';
}

/**
 * 추적 링크 — 만들 수 없으면 null.
 *
 * [규칙 5] 실시간 추적을 흉내 내지 않는다. 백엔드가 없으므로 여기서 하는 일은 템플릿에 송장번호를
 * 끼워 넣는 것뿐이고, 그 뒤는 택배사 사이트가 답한다. 상태를 지어내면 그것은 거짓말이 된다.
 */
export function trackingUrl(
  carrier: Pick<Carrier, 'trackingUrlTemplate'>,
  invoiceNo: string,
): string | null {
  const template = carrier.trackingUrlTemplate.trim();
  if (template === '' || !template.includes(INVOICE_TOKEN)) return null;
  const normalized = normalizeInvoiceNo(invoiceNo);
  if (!isValidInvoiceNo(normalized)) return null;
  return template.replaceAll(INVOICE_TOKEN, encodeURIComponent(normalized));
}

/* ── 택배사 사용 현황 (조회기 배선 — 삭제 차단) ─────────────────────────────
 *
 * 방향이 반대인 두 번째 조회기다: 택배사를 지우려는 쪽(배송 정책)이 '이 택배사로 나간 배송 건이
 * 있는가' 를 물어야 하는데, 그 답은 배송 원장(pages/orders/shipments)이 갖고 있다. */

type CarrierUsageLookup = (carrierId: string) => number;

let carrierUsageLookup: CarrierUsageLookup | null = null;

export function registerCarrierUsageLookup(lookup: CarrierUsageLookup): void {
  carrierUsageLookup = lookup;
}

export function resetCarrierUsageLookup(): void {
  carrierUsageLookup = null;
}

/** 이 택배사로 나간 배송 건수 — 배선 전에는 null('모른다') */
export function carrierUsageCount(carrierId: string): number | null {
  return carrierUsageLookup === null ? null : carrierUsageLookup(carrierId);
}

export const CARRIER_DELETE_UNKNOWN =
  '배송 건을 확인하지 못해 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.';

/**
 * 택배사 삭제를 막아야 하는 이유 — 없으면 null.
 *
 * [미배선은 '삭제 가능' 이 아니다] 조회기가 없으면 fail-closed 로 막는다. 여기서 통과시키면
 * 배송 건이 가리키던 택배사가 사라져 송장 열의 이름과 추적 링크가 동시에 죽는다 — 그 배송 건은
 * 다시는 어느 택배로 나갔는지 말할 수 없게 된다(운영자 그룹 삭제 가드와 같은 판단).
 */
export function carrierDeleteBlock(
  carrier: Pick<Carrier, 'name'>,
  usage: number | null,
): string | null {
  if (usage === null) return CARRIER_DELETE_UNKNOWN;
  if (usage > 0) {
    return `'${carrier.name}' 으로 나간 배송 ${String(usage)}건이 있어 삭제할 수 없어요. 사용 여부를 끄면 새 송장의 선택지에서만 빠져요.`;
  }
  return null;
}

/* ── 배송 건 ─────────────────────────────────────────────────────────────── */

/**
 * 배송 상태 — 주문 상태의 배송 구간과 **같은 낱말**을 쓴다(ORDER_STATUS_LABEL 의 세 값).
 *
 * 이름을 새로 짓지 않는 이유: 같은 사건에 두 어휘가 생기면 주문 목록이 '배송중' 이라 부르는 것을
 * 배송 화면이 다른 말로 부르게 되고, 운영자는 둘이 같은 것인지 확인할 방법이 없다.
 */
export type ShipmentStatus = 'waiting' | 'shipping' | 'delivered';

/** 흐르는 순서 = 표시 순서. 전이 판정을 이 배열의 인덱스로 한다(order.ts 와 같은 어법) */
export const SHIPMENT_STATUS_SEQUENCE: readonly ShipmentStatus[] = [
  'waiting',
  'shipping',
  'delivered',
];

export const SHIPMENT_STATUS_LABEL: Readonly<Record<ShipmentStatus, string>> = {
  waiting: '배송대기',
  shipping: '배송중',
  delivered: '배송완료',
};

export function isShipmentStatus(value: unknown): value is ShipmentStatus {
  return typeof value === 'string' && value in SHIPMENT_STATUS_LABEL;
}

export function shipmentStatusLabel(status: ShipmentStatus): string {
  return SHIPMENT_STATUS_LABEL[status];
}

/** 배송 건이 실어 나르는 품목 1줄 — 재고를 움직이는 단위(SKU)와 수량만 든다 */
export interface ShipmentLine {
  readonly sku: string;
  readonly quantity: number;
}

/**
 * 배송 건 1건 = **송장 1장**.
 *
 * 주문 1건에 배송 건이 여럿일 수 있다 — 그것이 부분 발송이다(규칙 2). 그래서 이 원장의 키는
 * 주문번호가 아니라 자기 id 이고, orderId 는 참조로만 든다. 반대로 주문에 상태를 하나 더 만들어
 * '부분배송' 이라고 부르지는 않는다: 한 주문이 상태 하나만 갖는다는 order.ts 의 전제를 깨뜨린다.
 */
export interface Shipment {
  readonly id: string;
  /** 주문번호(= Order.id) — 주문 상세로 가는 참조 */
  readonly orderId: string;
  /** 택배사 id — 자유 입력이 아니라 등록된 목록에서 고른 값이다 */
  readonly carrierId: string;
  readonly invoiceNo: string;
  readonly lines: readonly ShipmentLine[];
  readonly status: ShipmentStatus;
  /** 발송처리 시각 ISO — '' 면 아직 창고에 있다(= 배송대기) */
  readonly shippedAt: string;
  /** 배송완료 시각 ISO — '' 면 아직 도착하지 않았다 */
  readonly deliveredAt: string;
}

export type ShipmentInput = Omit<Shipment, 'id'>;

/** 항목 → 쓰기 입력(id 제외) */
export function toShipmentInput(shipment: Shipment): ShipmentInput {
  return {
    orderId: shipment.orderId,
    carrierId: shipment.carrierId,
    invoiceNo: shipment.invoiceNo,
    lines: shipment.lines.map((line) => ({ ...line })),
    status: shipment.status,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
  };
}

/* ── 송장번호 검증 ───────────────────────────────────────────────────────── */

export const INVOICE_NO_MAX = 30;

/**
 * 숫자와 하이픈만. 양 끝은 숫자다.
 *
 * [왜 이렇게 좁히나 — 규칙 3] 국내 택배사 송장번호는 전부 숫자이고, 운영자는 그것을 엑셀에서
 * 복사해 붙여 넣는다. 한글·공백·따옴표가 섞이면 택배사 접수 파일이 그 행에서 깨지는데, 깨진 것을
 * 아는 시점은 이미 물건이 나간 뒤다. 그래서 저장 전에 막고, 왜 막았는지를 말한다.
 */
const INVOICE_NO_RE = /^\d(?:[\d-]*\d)?$/;

export const INVOICE_NO_REQUIRED = '송장번호를 입력하세요.';
export const INVOICE_NO_FORMAT =
  '송장번호는 숫자와 하이픈(-)만 입력할 수 있어요. 한글·공백이 섞이면 택배사 접수 파일이 깨져요.';
export const INVOICE_NO_TOO_LONG = `송장번호는 ${String(INVOICE_NO_MAX)}자를 넘을 수 없어요.`;

/** 앞뒤 공백만 떼어 낸다 — 가운데 공백은 오류이지 정리 대상이 아니다(조용히 고치지 않는다) */
export function normalizeInvoiceNo(value: string): string {
  return value.trim();
}

/** 이 송장번호를 쓸 수 없는 이유 — 쓸 수 있으면 null */
export function invoiceNoBlock(value: string): string | null {
  const normalized = normalizeInvoiceNo(value);
  if (normalized === '') return INVOICE_NO_REQUIRED;
  if (normalized.length > INVOICE_NO_MAX) return INVOICE_NO_TOO_LONG;
  if (!INVOICE_NO_RE.test(normalized)) return INVOICE_NO_FORMAT;
  return null;
}

export function isValidInvoiceNo(value: string): boolean {
  return invoiceNoBlock(value) === null;
}

/**
 * 같은 택배사에 같은 송장번호가 두 번 붙는 것을 막는다(규칙 4).
 *
 * 택배사를 함께 보는 이유: 송장번호 체계는 택배사마다 따로라 다른 택배사에서 같은 숫자가 나오는
 * 것은 정상이다. 같은 택배사 안에서 겹치는 것만이 오입력이고, 그것이 실제로 가장 흔한 사고다 —
 * 앞 주문의 송장을 복사한 채 다음 행에 붙여 넣는다.
 */
export function duplicateInvoiceBlock(
  existing: readonly Shipment[],
  candidate: Pick<Shipment, 'carrierId' | 'invoiceNo'>,
  ignoreShipmentId = '',
): string | null {
  const invoiceNo = normalizeInvoiceNo(candidate.invoiceNo);
  if (invoiceNo === '') return null;
  const clash = existing.find(
    (shipment) =>
      shipment.id !== ignoreShipmentId &&
      shipment.carrierId === candidate.carrierId &&
      normalizeInvoiceNo(shipment.invoiceNo) === invoiceNo,
  );
  if (clash === undefined) return null;
  return `이미 ${clash.orderId} 주문에 쓰인 송장번호예요. 같은 택배사에 같은 번호를 두 번 붙일 수 없어요.`;
}

/* ── 부분 발송 판정 (이 파일의 핵심 규칙) ────────────────────────────────────
 *
 * [규칙 2] 송장은 주문이 아니라 **품목**에 붙는다. 그러므로 '이 주문이 다 나갔는가' 는 배송 건
 * 개수로 답할 수 없고, 품목 수량을 SKU 단위로 맞춰 봐야만 답할 수 있다. 그 셈을 화면이 하면
 * 목록의 배지와 저장의 허용 여부가 갈라진다 — 그래서 **순수 함수 하나가 소유한다**. */

/**
 * 주문 품목마다 '송장이 덮은 수량' 을 배정한다.
 *
 * SKU 별로 모아 둔 배송 수량을 품목 순서대로 나눠 주고, 남지 않으면 0 이다. 품목 수량을 넘겨
 * 배정하지 않는 이유: 한 품목에 실수로 과다 입력된 수량이 다른 품목까지 '발송됨' 으로 만들면,
 * 실제로는 창고에 남아 있는 물건이 화면에서 사라진다.
 */
function allocateCovered(
  lines: readonly Pick<OrderLine, 'sku' | 'quantity'>[],
  shipments: readonly Shipment[],
): readonly number[] {
  const pool = new Map<string, number>();
  for (const shipment of shipments) {
    for (const line of shipment.lines) {
      pool.set(line.sku, (pool.get(line.sku) ?? 0) + line.quantity);
    }
  }
  return lines.map((line) => {
    const available = pool.get(line.sku) ?? 0;
    const taken = Math.min(line.quantity, available);
    pool.set(line.sku, available - taken);
    return taken;
  });
}

export interface ShipmentCoverage {
  /** 송장이 덮은 수량 */
  readonly covered: number;
  /** 주문의 총 수량 */
  readonly total: number;
  /** 전 품목이 덮였는가 — 주문을 다음 단계로 넘길 수 있는 유일한 조건이다 */
  readonly complete: boolean;
  /** 일부만 덮였는가 — 하나도 없거나 전부인 것은 부분이 아니다 */
  readonly partial: boolean;
}

/**
 * 이 주문이 얼마나 덮였는가.
 *
 * 무엇을 넘기느냐로 두 질문에 답한다 — 배송 건 전부를 넘기면 '송장이 다 붙었는가', 발송된 것만
 * 넘기면 '실제로 다 나갔는가'. 규칙이 하나라 두 답이 어긋날 수 없다.
 */
export function shipmentCoverage(
  lines: readonly Pick<OrderLine, 'sku' | 'quantity'>[],
  shipments: readonly Shipment[],
): ShipmentCoverage {
  const taken = allocateCovered(lines, shipments);
  const covered = taken.reduce((sum, value) => sum + value, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  // 품목이 없는 주문은 '전 품목 발송' 이라고 말할 대상이 없다 — 완료로 통과시키지 않는다.
  return {
    covered,
    total,
    complete: total > 0 && covered >= total,
    partial: covered > 0 && covered < total,
  };
}

/** 이 배송 건이 창고를 떠났는가 — '배송대기' 는 송장만 붙은 상태라 아직 나간 것이 아니다(규칙 1) */
export function hasShipmentLeft(shipment: Pick<Shipment, 'status'>): boolean {
  return shipment.status !== 'waiting';
}

/** 실제로 나간 배송 건만 — 주문을 '배송중' 으로 넘길지 판정할 때 쓴다 */
export function dispatchedShipments(shipments: readonly Shipment[]): readonly Shipment[] {
  return shipments.filter((shipment) => hasShipmentLeft(shipment));
}

/**
 * 아직 송장이 붙지 않은 잔량 — 송장 입력 다이얼로그가 만들 배송 건의 품목이 된다.
 *
 * 남은 것이 없으면 빈 배열이고, 그때는 새 송장을 만들 이유가 없다(화면이 그 건을 제외한다).
 */
export function uninvoicedLines(
  lines: readonly Pick<OrderLine, 'sku' | 'quantity'>[],
  shipments: readonly Shipment[],
): readonly ShipmentLine[] {
  const taken = allocateCovered(lines, shipments);
  return lines
    .map((line, index) => ({ sku: line.sku, quantity: line.quantity - (taken[index] ?? 0) }))
    .filter((line) => line.quantity > 0);
}

/**
 * 발송된 수량을 주문 품목에 반영한다 — 주문 원장의 shippedQuantity 는 이 계산의 **결과**다.
 *
 * 화면이 직접 더해 넣지 않게 하는 이유: 주문 목록의 '부분배송 1/3' 배지와 배송 화면의 판정이
 * 다른 셈에서 나오면, 같은 주문을 두 화면이 다르게 설명하는 순간이 반드시 온다.
 */
export function applyShippedQuantities(
  lines: readonly OrderLine[],
  shipments: readonly Shipment[],
): readonly OrderLine[] {
  const taken = allocateCovered(lines, dispatchedShipments(shipments));
  return lines.map((line, index) => ({ ...line, shippedQuantity: taken[index] ?? 0 }));
}

/* ── 주문 상태와의 다리 ──────────────────────────────────────────────────── */

/** 배송 축이 요청할 수 있는 주문 상태 — 송장 입력은 배송대기로, 발송처리는 배송중으로 민다 */
export type ShipmentDrivenStatus = Extract<OrderStatus, 'waiting' | 'shipping'>;

/**
 * 이 주문을 배송 축의 사유로 `to` 까지 밀 수 없는 이유 — 밀 수 있으면 null.
 *
 * **주문 축을 먼저 묻는다**(orderTransitionBlock): 취소됐거나, 입금 전이거나, 이미 지난 단계라면
 * 배송이 무엇을 하든 그 주문은 움직이지 않는다. 그 판정을 여기서 다시 쓰면 규칙이 두 벌이 된다.
 * 배송 축이 얹는 것은 한 가지뿐이다 — **전 품목이 덮였는가**(규칙 2).
 */
export function orderShipmentBlock(
  order: Pick<Order, 'status' | 'canceledAt' | 'payment' | 'lines'>,
  shipments: readonly Shipment[],
  to: ShipmentDrivenStatus,
): string | null {
  const blocked = orderTransitionBlock(order, to);
  if (blocked !== null) return blocked;

  // 배송대기는 '송장이 다 붙었는가', 배송중은 '실제로 다 나갔는가' 를 묻는다.
  const relevant = to === 'waiting' ? shipments : dispatchedShipments(shipments);
  const coverage = shipmentCoverage(order.lines, relevant);
  if (coverage.complete) return null;

  const progress = `${String(coverage.covered)}/${String(coverage.total)}`;
  return to === 'waiting'
    ? `송장이 붙지 않은 품목이 있어 배송대기로 넘길 수 없어요 (${progress}).`
    : `전 품목이 발송되어야 배송중으로 넘어가요 (${progress}).`;
}

/* ── 배송 건 전이 ────────────────────────────────────────────────────────── */

export const SHIPMENT_TRANSITION_BACKWARD = '배송 상태는 되돌릴 수 없어요.';
export const SHIPMENT_DISPATCH_NO_INVOICE = '송장번호가 없어 발송처리할 수 없어요.';

function shipmentStatusIndex(status: ShipmentStatus): number {
  const index = SHIPMENT_STATUS_SEQUENCE.indexOf(status);
  // 모르는 값은 끝 다음으로 본다 — 어떤 전이도 허용되지 않는 쪽(fail-closed)으로 수렴한다.
  return index === -1 ? SHIPMENT_STATUS_SEQUENCE.length : index;
}

/**
 * 이 배송 건을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null.
 *
 * 사유를 문자열로 돌려주는 것은 order.ts 의 orderTransitionBlock 과 같은 규약이다: 화면이
 * 비활성 버튼 옆에 **왜 못 누르는지**를 그대로 쓸 수 있어야 한다.
 */
export function shipmentTransitionBlock(
  shipment: Pick<Shipment, 'status' | 'invoiceNo'>,
  to: ShipmentStatus,
): string | null {
  if (shipmentStatusIndex(to) <= shipmentStatusIndex(shipment.status)) {
    return SHIPMENT_TRANSITION_BACKWARD;
  }
  // 송장 없이 발송처리하면 고객에게 알릴 번호도, 추적할 링크도 없는 '배송중' 이 남는다.
  if (to === 'shipping' && !isValidInvoiceNo(shipment.invoiceNo))
    return SHIPMENT_DISPATCH_NO_INVOICE;
  return null;
}

export function canTransitionShipment(
  shipment: Pick<Shipment, 'status' | 'invoiceNo'>,
  to: ShipmentStatus,
): boolean {
  return shipmentTransitionBlock(shipment, to) === null;
}

/** 지금 발송처리할 수 있는 배송 건인가 — 일괄 처리 버튼의 건수가 이것을 센다 */
export function canDispatchShipment(shipment: Pick<Shipment, 'status' | 'invoiceNo'>): boolean {
  return canTransitionShipment(shipment, 'shipping');
}

/**
 * 배송 건의 상태를 옮긴다 — 막힌 전이는 **던진다**(술어가 먼저 걸러 주므로 여기 도달하면 버그다).
 * 시각 도장이 상태와 함께 찍힌다: 둘이 갈라지면 '배송중인데 언제 나갔는지 모르는' 건이 생긴다.
 */
export function applyShipmentStatus(shipment: Shipment, to: ShipmentStatus, at: string): Shipment {
  const blocked = shipmentTransitionBlock(shipment, to);
  if (blocked !== null) throw new Error(blocked);
  return {
    ...shipment,
    status: to,
    // 이미 찍힌 시각은 덮지 않는다 — 대기 → 완료로 건너뛴 건도 자기 발송 시각을 갖는다.
    shippedAt: shipment.shippedAt === '' ? at : shipment.shippedAt,
    deliveredAt:
      to === 'delivered'
        ? shipment.deliveredAt === ''
          ? at
          : shipment.deliveredAt
        : shipment.deliveredAt,
  };
}
