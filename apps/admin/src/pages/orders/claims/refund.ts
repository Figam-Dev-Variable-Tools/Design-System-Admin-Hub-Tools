// 환불 축 — 상태·금액 계산·복원 규칙 (순수)
//
// ─────────────────────────────────────────────────────────────────────────────
// [환불은 클레임 상태가 아니다 — 이 파일이 존재하는 이유]
// 예전 모델에는 `refundAmount` 숫자 하나만 있었다. 화면은 그것을 '환불 예정액' 이라 써 두고,
// 반품이 '완료' 가 되면 환불도 끝난 것처럼 보였다. 실제로는 아무 일도 일어나지 않았다 — 돈을
// 보냈다는 기록도, 고객이 쓴 적립금을 되돌린 흔적도 없었다.
//
// 클레임 완료와 환불 완료는 **다른 사건**이다. 물건을 받아 검수까지 끝났어도(클레임 완료) 정산일에
// 맞춰 며칠 뒤 송금하는 일이 흔하고, 반대로 불량이 확실해 돈부터 보내고 회수는 나중인 경우도 있다.
// 한 축에 눌러 담으면 그 사이 며칠을 표현할 자리가 없어지고, 운영자는 메모에 '환불은 아직' 이라고
// 적기 시작한다 — 규칙이 데이터에서 빠져나가 텍스트가 되는 순간이다. 그래서 나란한 축으로 둔다
// (주문에서 '취소' 를 상태가 아닌 나란한 사실로 둔 것과 같은 판단 — shared/domain/order.ts 머리말).
//
// [적립금·쿠폰은 '환불완료' 에서만 복원된다 — 카페24의 실제 규칙]
// 접수나 수거 시점에 미리 되돌리면, 반려되거나 철회된 클레임의 고객이 적립금을 그대로 챙긴다.
// 그래서 복원의 방아쇠는 **환불완료 하나**이고, 그 시각(completedAt)이 곧 재실행을 막는 멱등 키다
// (클레임 재고의 stockAppliedAt 과 같은 규약).
//
// [환불액 = 결제액 − 반품배송비 − 회수 쿠폰분]
// 쿠폰을 복원하면(재발급) 고객은 그 할인만큼을 **두 번** 받게 된다 — 한 번은 지난 결제의 할인으로,
// 한 번은 돌아온 쿠폰으로. 그래서 쿠폰을 복원하는 환불은 그 할인액을 환불에서 회수한다. 복원하지
// 않기로 하면 회수하지 않는다. 둘은 언제나 같이 움직여야 하는 한 쌍이라 한 함수가 함께 계산한다.
// ─────────────────────────────────────────────────────────────────────────────
import type { StatusTone } from '../../../shared/ui';
import type { Claim, ClaimKind } from './types';

/* ── 환불 상태 ────────────────────────────────────────────────────────────── */

/** 환불 진행 — 없음 → 접수 → 완료. 클레임 상태와 나란한 별개의 축이다(머리말) */
export type RefundStatus = 'none' | 'requested' | 'completed';

/** 흐르는 순서 = 표시 순서. 전이 가능 여부를 **이 배열의 인덱스**로 판정한다 */
const REFUND_SEQUENCE: readonly RefundStatus[] = ['none', 'requested', 'completed'];

const REFUND_META: Readonly<
  Record<RefundStatus, { readonly label: string; readonly tone: StatusTone }>
> = {
  none: { label: '환불 없음', tone: 'neutral' },
  requested: { label: '환불 접수', tone: 'warning' },
  completed: { label: '환불 완료', tone: 'success' },
};

export function refundStatusLabel(status: RefundStatus): string {
  return REFUND_META[status].label;
}

export function refundStatusTone(status: RefundStatus): StatusTone {
  return REFUND_META[status].tone;
}

export function isRefundStatus(value: unknown): value is RefundStatus {
  return value === 'none' || value === 'requested' || value === 'completed';
}

/** 환불 대상 유형인가 — 교환은 물건을 바꿔 줄 뿐 돈이 오가지 않는다 */
export function isRefundable(kind: ClaimKind): boolean {
  return kind !== 'exchange';
}

/**
 * 목록의 환불 열이 그리는 것 — 교환은 '해당 없음' 이라고 말한다.
 *
 * 교환에 '환불 없음' 배지를 달면 '아직 환불하지 않았다' 로 읽혀 할 일처럼 보인다. 없는 일과
 * 안 한 일은 다르다(빈 상태를 셋으로 가르는 STATE-05 와 같은 결).
 */
export function refundCellMeta(claim: Pick<Claim, 'kind' | 'refund'>): {
  readonly label: string;
  readonly tone: StatusTone;
} {
  if (!isRefundable(claim.kind)) return { label: '해당 없음', tone: 'neutral' };
  return REFUND_META[claim.refund.status];
}

/* ── 환불 정보 ────────────────────────────────────────────────────────────── */

/**
 * 클레임의 환불 한 벌.
 *
 * 결제액·적립금·쿠폰은 **접수 시점의 스냅숏**이다. 주문을 참조만 하면 나중에 주문서가 정정될 때
 * 지난 환불의 근거 금액이 함께 바뀐다 — 이미 돈이 오간 거래가 사후에 다른 금액이 되는 것이다
 * (주문 품목이 단가·적립률을 복사해 드는 것과 같은 판단 — shared/domain/order.ts 머리말).
 */
export interface ClaimRefund {
  readonly status: RefundStatus;
  /** 이 클레임 대상분의 결제액(원, 스냅숏) — 환불 계산의 출발점 */
  readonly paidAmount: number;
  /** 주문에서 쓴 적립금(원, 스냅숏) — 환불완료가 되돌릴 대상 */
  readonly pointUsed: number;
  /** 주문에 쓴 쿠폰 할인(원, 스냅숏) */
  readonly couponDiscount: number;
  /** 쿠폰 이름(스냅숏) — 미사용이면 '' */
  readonly couponName: string;
  /** 반품배송비 차감(원) — 기본값은 배송 정책이 주고 운영자가 그 자리에서 덮어쓴다 */
  readonly returnShippingFee: number;
  /** 쿠폰을 복원(재발급)하는가 — 복원하면 그 할인액을 환불에서 회수한다(머리말) */
  readonly couponRestored: boolean;
  /** 환불 완료 시각 ISO — '' 면 미완료. **복원을 두 번 하지 않게 하는 멱등 키다** */
  readonly completedAt: string;
  /** 복원된 적립금(원) — 완료 시점에 확정된 스냅숏(원장에 실제로 기입한 금액) */
  readonly restoredPoint: number;
}

/** 환불이 없는 클레임(교환)의 기본값 — 픽스처와 신규 접수가 같은 자리에서 만든다 */
export const NO_REFUND: ClaimRefund = {
  status: 'none',
  paidAmount: 0,
  pointUsed: 0,
  couponDiscount: 0,
  couponName: '',
  returnShippingFee: 0,
  couponRestored: false,
  completedAt: '',
  restoredPoint: 0,
};

/* ── 금액 계산 (계산의 유일한 자리) ───────────────────────────────────────── */

interface RefundBreakdown {
  readonly paid: number;
  readonly returnShippingFee: number;
  /** 회수 쿠폰분 — 쿠폰을 복원하지 않으면 0 */
  readonly couponClawback: number;
  /** 실제로 돌려줄 금액 */
  readonly total: number;
}

/**
 * 환불 내역(순수) — 화면은 이 결과만 그리고 스스로 빼지 않는다.
 *
 * 총액을 저장하지 않는 이유는 주문의 orderAmounts 와 같다: 차감을 정정한 순간 총액과 항목이
 * 어긋난 환불서가 남고, 그때 어느 쪽이 사실인지 아무도 답할 수 없다.
 * 0 아래로는 내려가지 않는다 — 차감이 결제액을 넘겨도 고객에게 돈을 청구하지는 않는다.
 */
export function refundBreakdown(refund: ClaimRefund): RefundBreakdown {
  const couponClawback = refund.couponRestored ? refund.couponDiscount : 0;
  const total = Math.max(0, refund.paidAmount - refund.returnShippingFee - couponClawback);
  return {
    paid: refund.paidAmount,
    returnShippingFee: refund.returnShippingFee,
    couponClawback,
    total,
  };
}

/**
 * 반품배송비의 기본값 — 취소는 언제나 0이다.
 *
 * 취소는 출고 전이라 되돌아오는 물건이 없다. 회수하지 않은 배송을 청구하면 그건 위약금이지
 * 반품배송비가 아니다. 반품·교환은 배송 정책의 값을 쓰되, 정책을 모르면(null) 0 이 아니라 null 을
 * 그대로 올려보낸다 — 화면이 '정책을 불러오지 못했다' 고 밝히고 운영자가 직접 적게 한다
 * (모르는 것을 0으로 뭉개면 조용히 덜 빼는 쪽으로 틀린다 — shared/domain/shipping-policy 머리말).
 */
export function defaultReturnFee(kind: ClaimKind, policyFee: number | null): number | null {
  if (kind === 'cancel') return 0;
  return policyFee;
}

export const REFUND_FEE_INVALID = '반품배송비는 0 이상의 원 단위 숫자로 입력하세요.';

/**
 * 차감 입력(문자열) → 금액. **유효하지 않으면 null**.
 *
 * 폼이 문자열을 드는 것은 배송 정책 화면과 같은 결이다(입력 중간 상태를 숫자로 강제하면 지우는
 * 도중에 0이 튀어나온다). 원 단위 정수만 받는다 — 소수점 환불은 실무에 없고, `Number('3,000')` 이
 * NaN 이 되어 조용히 0원 차감으로 흐르는 길을 애초에 막는다.
 */
export function parseFeeInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/* ── 전이 규칙 (순수 술어 — 버튼과 저장이 **같은 것을** 읽는다) ──────────────── */

const REFUND_TRANSITION_SAME = '이미 그 환불 상태예요.';
export const REFUND_TRANSITION_DONE = '환불이 완료되어 더 이상 바꿀 수 없어요.';
export const REFUND_TRANSITION_BACKWARD = '환불 처리는 되돌릴 수 없어요.';
export const REFUND_NOT_REFUNDABLE = '교환은 환불 대상이 아니에요.';
export const REFUND_CLAIM_CLOSED = '반려·철회된 클레임은 환불할 수 없어요.';
export const REFUND_CLAIM_INCOMPLETE = '클레임 처리를 완료해야 환불을 완료할 수 있어요.';
export const REFUND_NO_MEMBER =
  '비회원 주문이라 적립금 원장이 없어요. 사용한 적립금을 복원할 수 없어 환불을 완료할 수 없어요.';

/** 환불 가드가 보는 최소 모양 */
type RefundGate = Pick<Claim, 'kind' | 'status' | 'memberId' | 'refund'>;

function refundIndex(status: RefundStatus): number {
  const index = REFUND_SEQUENCE.indexOf(status);
  return index === -1 ? REFUND_SEQUENCE.length : index;
}

/**
 * 환불을 `to` 로 옮길 수 없는 이유 — 옮길 수 있으면 null.
 *
 * 클레임 전이 가드와 같은 규약이다: 화면은 이 문자열을 비활성 버튼 옆에 그대로 쓰고, 어댑터도
 * 같은 함수로 막는다. 그래서 '눌리는데 거부당하는 버튼' 이 생기지 않는다.
 */
export function refundTransitionBlock(claim: RefundGate, to: RefundStatus): string | null {
  if (to === claim.refund.status) return REFUND_TRANSITION_SAME;
  if (!isRefundable(claim.kind)) return REFUND_NOT_REFUNDABLE;
  if (claim.refund.status === 'completed') return REFUND_TRANSITION_DONE;
  if (refundIndex(to) < refundIndex(claim.refund.status)) return REFUND_TRANSITION_BACKWARD;
  if (claim.status === 'rejected' || claim.status === 'withdrawn') return REFUND_CLAIM_CLOSED;
  if (to !== 'completed') return null;
  if (claim.status !== 'completed') return REFUND_CLAIM_INCOMPLETE;
  // 적립금을 쓴 주문인데 되돌릴 원장이 없으면 환불이 반쪽이 된다 — 돈만 가고 적립금은 사라진다.
  if (claim.refund.pointUsed > 0 && claim.memberId === '') return REFUND_NO_MEMBER;
  return null;
}

export function canTransitionRefund(claim: RefundGate, to: RefundStatus): boolean {
  return refundTransitionBlock(claim, to) === null;
}

export const REFUND_UNSAVED_CLAIM =
  '저장하지 않은 처리 내용이 있어요. 처리 저장을 먼저 한 뒤 환불을 진행하세요.';

/**
 * 환불 버튼이 읽는 사유 — **저장이 실제로 보낼 값**으로 판정한다. 누를 수 있으면 null.
 *
 * [왜 드래프트가 아니라 저장된 값을 읽는가]
 * 환불 저장(saveRefund)이 보내는 patch 에는 `refund` 밖에 없다 — 상태·메모·교환 옵션은 저장된
 * 값 그대로 나간다. 그런데 버튼이 편집 중인 상태로 판정하면, 상태 select 만 '완료'로 바꿔 둔
 * 화면에서 버튼이 열리고 어댑터는 저장된 상태를 보고 REFUND_CLAIM_INCOMPLETE 로 거절한다 —
 * 이 리포가 금지하는 '눌리는데 거부당하는 버튼'이다(shared/domain/order.ts 의 orderTransitionBlock
 * 머리말 · pages/products/inquiries/_shared/store.ts 의 canAnswer/canClose 가 선례).
 *
 * [왜 드래프트를 무시하는 대신 '먼저 저장' 을 요구하는가]
 * 저장된 값만 읽고 끝내면 버튼은 옳게 잠기지만, 화면의 select 에는 '완료'가 떠 있는데 '클레임
 * 처리를 완료해야 합니다' 라고 답하게 된다 — 운영자에게는 거짓말로 읽힌다. 더구나 그 편집은
 * 환불 저장이 **보내지 않아** 조용히 사라진다. 그래서 정본은 저장된 값으로 두되, 보내지지 않을
 * 편집이 남아 있으면 그것을 먼저 저장하라고 말한다. 두 축의 순서(클레임 완료 → 환불 완료)는
 * 그대로 지켜지고, 편집이 유실되는 경로도 함께 닫힌다.
 *
 * @param claimDirty 환불 저장이 **보내지 않는** 편집(상태·메모·교환 옵션)이 남아 있는가
 */
export function refundActionBlock(
  claim: RefundGate,
  to: RefundStatus,
  claimDirty: boolean,
): string | null {
  const blocked = refundTransitionBlock(claim, to);
  // 막힌 이유가 '클레임 미완료' 인 경우도 여기로 흡수한다 — 그 상태를 이미 '완료'로 바꿔 둔
  // 화면에 같은 문장을 돌려주면 무엇을 더 해야 하는지 알 수 없다.
  if (claimDirty && (blocked === null || blocked === REFUND_CLAIM_INCOMPLETE)) {
    return REFUND_UNSAVED_CLAIM;
  }
  return blocked;
}

/* ── 복원 규칙 ────────────────────────────────────────────────────────────── */

/**
 * 환불완료가 되돌릴 것들(순수) — **완료 시점에 딱 한 번** 계산한다.
 *
 * 이미 완료된(멱등 키가 찍힌) 환불은 0 을 준다: 재시도가 적립금을 두 번 얹으면 원장은 append-only
 * 라 되돌릴 수도 없다(가장 고치기 어려운 종류의 사고다).
 */
interface RefundRestoration {
  /** 원장에 덧붙일 적립금(원) — 양수만 */
  readonly point: number;
  /** 쿠폰을 되돌리는가 */
  readonly coupon: boolean;
  /** 되돌릴 쿠폰 이름 — 없으면 '' */
  readonly couponName: string;
}

export function planRefundRestoration(claim: RefundGate): RefundRestoration {
  const already = claim.refund.completedAt !== '';
  const point = already || claim.memberId === '' ? 0 : Math.max(0, claim.refund.pointUsed);
  const coupon = !already && claim.refund.couponRestored && claim.refund.couponDiscount > 0;
  return { point, coupon, couponName: coupon ? claim.refund.couponName : '' };
}

/** 원장에 남길 사유 — 유형별로 다르게 적어야 원장만 보고도 무엇이 돌려준 것인지 안다 */
export function restoreReason(kind: ClaimKind): string {
  return `${kind === 'cancel' ? '주문 취소' : '반품'} 환불 적립금 복원`;
}
