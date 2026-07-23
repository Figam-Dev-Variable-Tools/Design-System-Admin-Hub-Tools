// 청구·입금 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 모듈이 생겼나 — 수주 다음이 비어 있었다]
// 문의 → 견적 → 수주 까지는 화면이 있었는데 **그 다음이 없었다.** 견적이 '수주전환' 이 되면
// 거기서 끝이고, 돈이 언제 얼마나 들어왔는지는 앱 밖(통장·엑셀)에만 있었다.
//
// [PG 없이 파는 운영의 '결제' 는 무엇인가]
// 결제대행을 쓰지 않으므로 앱이 결제를 처리하지 않는다. 실제로 벌어지는 일은 둘 중 하나다.
//   ① 계좌이체 — 청구 안내를 보내고 **판매자가 입금을 확인해 수기로 처리**한다.
//      (카페24의 무통장입금이 정확히 이 모양이다: 판매자의 입금확인 처리 전에는 결제완료가 아니다.)
//   ② 개인결제창 — 결제 링크를 만들어 고객에게 보낸다. 앱은 **그 링크를 보관할 뿐**이고
//      결제 자체는 링크 너머에서 일어난다.
// 그래서 이 모듈은 결제를 흉내 내지 않는다. 청구액·안내 발송 여부·입금 사실만 기록한다.
//
// [세 가지 규칙은 회계에서 온다]
//   ① 입금확인은 **되돌리는 전이를 만들지 않는다.** 원장은 지우는 것이 아니라 덧붙이는 것이다.
//      (같은 이유로 주문 이력도 append-only 다 — shared/domain/order.ts)
//   ② 부분 입금은 **누적 합이 청구액에 닿아야** 완료다. 마지막 한 건을 보고 판정하지 않는다.
//   ③ 청구는 **수주 전환된 견적에서만** 생성된다. 그 앞 단계에는 청구할 근거가 없다.
// ─────────────────────────────────────────────────────────────────────────────
import type { StatusTone } from '../../../shared/ui';
import type { AccountRef } from '../_shared/account-reference';
import { computeTotals, isOrderedQuote } from '../quotes/types';
import type { Quote, QuoteStatus } from '../quotes/types';

/**
 * 청구 방식.
 *
 * 두 가지뿐인 것은 이 운영에 실제로 두 가지밖에 없기 때문이다(머리말). '카드결제' 를 넣지 않는
 * 이유도 같다 — 앱이 카드를 받지 않는데 선택지에 있으면 운영자가 고르고, 고른 뒤에 할 일이 없다.
 */
export type BillingMethod = 'bank_transfer' | 'payment_link';

/** 입금 상태 — 저장하지 않는다. 입금 기록의 **누적 합**에서 파생한다(규칙 ②) */
export type BillingPaymentState = 'unpaid' | 'partial' | 'paid';

/** 청구 안내를 보낸 창구 */
export type BillingNoticeChannel = 'email' | 'sms' | 'kakao' | 'phone';

/** 청구 안내 발송 기록 1건 — 덧붙이기만 한다(언제 무엇으로 안내했는가) */
export interface BillingNotice {
  readonly id: string;
  /** 발송 시각 ISO */
  readonly at: string;
  readonly channel: BillingNoticeChannel;
  readonly memo: string;
}

/**
 * 입금 기록 1건 — **회계 기록이다.** 고치지도 지우지도 않는다(규칙 ①).
 *
 * 잘못 넣었다면 반대 부호의 기록을 덧붙이는 것이 회계의 방식이지만, 이 화면은 아직 그 문(감액
 * 기록)을 열지 않는다: PG 없는 운영에서 실제로 필요한 것은 '받았다' 를 쌓는 일이고, 되돌리는
 * 문을 미리 열어 두면 그것이 곧 '입금 취소' 버튼이 된다.
 */
export interface BillingPayment {
  readonly id: string;
  /** 입금일 'YYYY-MM-DD' — 통장에 찍힌 날이다(입력한 날이 아니다) */
  readonly paidOn: string;
  readonly amount: number;
  /** 입금자명·메모 — 통장 표기가 주문자와 다를 때 이 칸이 유일한 단서다 */
  readonly memo: string;
}

export interface Billing extends AccountRef {
  readonly id: string;
  /** 청구번호 — 'BL-YYYYMMDD-NNN' */
  readonly billNo: string;
  /** 청구 대상 견적 id — **멱등키다.** 한 견적에 청구는 하나다 */
  readonly quoteId: string;
  /** 원 견적번호(승계 스냅숏 — 표시·역링크용) */
  readonly quoteNo: string;
  readonly method: BillingMethod;
  /**
   * 개인결제창 링크 — 계좌이체 청구면 ''.
   *
   * 앱은 이 링크를 **보관만** 한다. 눌러서 결제 상태를 조회하지 않고, 결제 완료를 추측하지도
   * 않는다(백엔드가 없다). 입금 사실은 언제나 사람이 확인해 기록한다.
   */
  readonly paymentLinkUrl: string;
  /** 청구액(원) — 견적 합계의 스냅숏. 견적을 나중에 고쳐도 이미 청구한 금액은 움직이지 않는다 */
  readonly amount: number;
  /** 청구 생성일 'YYYY-MM-DD' */
  readonly issuedAt: string;
  readonly notices: readonly BillingNotice[];
  readonly payments: readonly BillingPayment[];
  readonly note: string;
}

export type BillingInput = Omit<Billing, 'id'>;

export const BILLING_NOTE_MAX = 300;
export const BILLING_MEMO_MAX = 60;

/* ── 파생 값 (순수) ───────────────────────────────────────────────────────── */

/** 지금까지 들어온 금액 — **누적 합**이다(규칙 ②). 마지막 한 건이 아니다 */
export function paidAmount(billing: Pick<Billing, 'payments'>): number {
  return billing.payments.reduce((sum, payment) => sum + payment.amount, 0);
}

/** 아직 안 들어온 금액. 초과 입금을 막으므로 음수가 되지 않는다 */
export function outstandingAmount(billing: Pick<Billing, 'amount' | 'payments'>): number {
  return billing.amount - paidAmount(billing);
}

/**
 * 입금 상태 — 저장된 값이 아니라 기록에서 파생한다.
 *
 * 상태를 따로 저장하면 '입금 3건은 있는데 상태는 미입금' 인 순간이 생기고, 목록 배지와 잔액이
 * 동시에 거짓말을 한다. 파생이면 갈라질 수 없다(상품 문의의 처리 이력과 같은 판단).
 */
export function billingPaymentState(
  billing: Pick<Billing, 'amount' | 'payments'>,
): BillingPaymentState {
  const paid = paidAmount(billing);
  if (paid <= 0) return 'unpaid';
  return paid >= billing.amount ? 'paid' : 'partial';
}

/** 완납일 — 잔액을 0 으로 만든 그 입금의 날짜. 아직이면 '' */
export function paidOnDate(billing: Pick<Billing, 'amount' | 'payments'>): string {
  let running = 0;
  for (const payment of billing.payments) {
    running += payment.amount;
    if (running >= billing.amount) return payment.paidOn;
  }
  return '';
}

/** 청구 안내가 나갔는가 — 목록의 '발송' 열이 읽는다 */
export function hasSentNotice(billing: Pick<Billing, 'notices'>): boolean {
  return billing.notices.length > 0;
}

/** 마지막 안내 발송 시각 — 없으면 '' */
export function lastNoticeAt(billing: Pick<Billing, 'notices'>): string {
  return billing.notices.at(-1)?.at ?? '';
}

/* ── 전이 가드 (거절 사유 문자열) ────────────────────────────────────────────
 *
 * 버튼의 disabled 조건과 저장의 거절 조건이 **같은 술어**를 읽는다 — 둘이 갈라지면 '눌리는데
 * 실패하는 버튼' 또는 '눌리지 않는데 저장은 되는 동작' 이 생긴다
 * (shared/domain/order.ts 의 orderTransitionBlock 과 같은 규약). */

export const BILLING_CREATE_NOT_ORDERED = '수주로 전환된 견적만 청구할 수 있어요.';
export const BILLING_CREATE_DONE = '이미 청구가 생성된 견적이에요.';
export const PAYMENT_ALREADY_PAID = '이미 입금이 완료된 청구예요.';
export const PAYMENT_AMOUNT_POSITIVE = '입금액은 0보다 커야 해요.';
export const PAYMENT_OVER_OUTSTANDING = '입금액이 잔액보다 클 수 없어요.';
export const PAYMENT_DATE_REQUIRED = '입금일을 YYYY-MM-DD 형식으로 입력하세요.';
export const NOTICE_LINK_REQUIRED = '개인결제창 링크를 먼저 등록해야 안내를 보낼 수 있어요.';

/**
 * 지금 이 견적으로 청구를 만들 수 없는 이유 — 만들 수 있으면 null (규칙 ③).
 *
 * `existingBillingId` 가 '' 가 아니면 이미 만든 청구다 — 견적 id 가 멱등키라 두 번 눌러도
 * 청구는 하나다. 데이터소스도 같은 키로 한 번 더 막는다(이중 방어).
 */
export function billingCreateBlock(
  quoteStatus: QuoteStatus,
  existingBillingId: string,
): string | null {
  if (!isOrderedQuote(quoteStatus)) return BILLING_CREATE_NOT_ORDERED;
  if (existingBillingId !== '') return BILLING_CREATE_DONE;
  return null;
}

/** 'YYYY-MM-DD' 모양인가 — 입금일 검증의 최소선(달력 실재는 shared/format 의 isCalendarDate) */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 지금 이 입금을 기록할 수 없는 이유 — 기록할 수 있으면 null.
 *
 * 초과 입금을 막는 이유: 청구액보다 많이 받았다면 그것은 입금 기록이 아니라 **과오납 처리**라는
 * 다른 업무다. 여기서 조용히 받아 두면 잔액이 음수가 되고, 그 음수를 화면마다 다르게 그린다.
 */
export function recordPaymentBlock(
  billing: Pick<Billing, 'amount' | 'payments'>,
  amount: number,
  paidOn: string,
): string | null {
  if (billingPaymentState(billing) === 'paid') return PAYMENT_ALREADY_PAID;
  if (!Number.isInteger(amount) || amount <= 0) return PAYMENT_AMOUNT_POSITIVE;
  if (amount > outstandingAmount(billing)) return PAYMENT_OVER_OUTSTANDING;
  if (!DATE_RE.test(paidOn)) return PAYMENT_DATE_REQUIRED;
  return null;
}

/* ── 동시 저장 가드 (기록 소실) ──────────────────────────────────────────────
 *
 * ┌ 무엇이 문제였나 ─────────────────────────────────────────────────────────┐
 * │ 이 화면의 저장은 **문서 한 벌을 통째로** 보낸다(BillingDetailPage 의 commit).  │
 * │ 그래서 두 운영자가 같은 청구를 열어 두면 이런 일이 일어났다:                  │
 * │   ① A 가 입금 2,000,000원을 기록한다 → 저장된다                              │
 * │   ② B 는 그 전에 화면을 열었다. B 의 문서에는 그 입금이 없다.                 │
 * │   ③ B 가 비고 한 줄을 고쳐 저장한다 → 문서 전체가 갈리면서 **A 의 입금이       │
 * │      흔적 없이 사라진다.** 성공 토스트까지 뜬다.                              │
 * │ 입금은 회계 기록이고 되돌릴 수단이 없다(규칙 ①). 조용히 지워지면 끝이다.       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * [왜 revision 이 아니라 기록 자체를 토큰으로 쓰는가]
 * 시스템 설정 섹션은 문서마다 revision 을 달아 낙관적 잠금을 건다(pages/settings/_shared/store.ts).
 * 그 방식은 **모든 동시 편집**을 충돌로 본다 — 비고를 고친 것과 입금을 기록한 것을 구분하지 않는다.
 * 청구에서 되돌릴 수 없는 것은 문서가 아니라 **원장**(payments · notices)이고, 원장은 덧붙이기만
 * 하므로 '저장된 기록이 들어온 기록의 앞부분 그대로인가' 만 보면 된다. 이 판정은 revision 보다
 * 좁고(기록이 실제로 사라질 때만 거절한다) 정확하다(입금 기록끼리도 순서가 어긋나면 잡는다).
 * 새 동시성 모델이 아니라, 이 도메인이 이미 갖고 있던 append-only 규약을 저장 경로에 세운 것이다.
 *
 * [이 가드에는 짝이 되는 disabled 버튼이 없다 — 그럴 수 없다]
 * 다른 가드들과 달리 이 판정의 근거는 **화면이 볼 수 없는 사실**(내가 읽은 뒤 서버에서 벌어진 일)
 * 이다. 그래서 버튼을 미리 잠글 수 없고, 짝은 저장 실패의 표면 — 409 충돌 다이얼로그다(EXC-04).
 *
 * [지금은 청구만이다] `version`/`updatedAt`/`If-Match` 는 이 앱 어디에도 없고, 나머지 화면은
 * 전부 last-write-wins 다. 전면 도입은 더 큰 결정이라 여기서 하지 않는다 — 청구를 먼저 막는
 * 이유는 잃는 것이 **되돌릴 수 없는 회계 기록**이기 때문이다.
 */

export const BILLING_PAYMENT_LOST =
  '내가 화면을 연 뒤 다른 관리자가 입금을 기록했어요. 그대로 저장하면 그 입금이 사라져요. 최신 내용을 불러온 뒤 다시 기록해 주세요.';
export const BILLING_NOTICE_LOST =
  '내가 화면을 연 뒤 다른 관리자가 안내 발송을 기록했어요. 그대로 저장하면 그 기록이 사라져요. 최신 내용을 불러와 주세요.';

/** 원장 1행이 갖는 최소 모양 — 입금·안내가 같은 규약(덧붙이기만)이라 한 술어로 본다 */
interface LedgerEntry {
  readonly id: string;
}

/**
 * 들어온 기록이 저장된 기록에 **덧붙이기만 한** 것인가.
 *
 * 앞부분이 한 칸이라도 다르면(사라졌거나 뒤바뀌었다) 거짓이다 — 그것은 저장이 아니라 소실이다.
 */
function isAppendOf(stored: readonly LedgerEntry[], incoming: readonly LedgerEntry[]): boolean {
  if (incoming.length < stored.length) return false;
  return stored.every((entry, index) => incoming[index]?.id === entry.id);
}

/** 이 저장이 이미 기록된 것을 지우는가 — 지우면 사유, 아니면 null */
export function ledgerLossBlock(
  current: Pick<Billing, 'payments' | 'notices'>,
  next: Pick<BillingInput, 'payments' | 'notices'>,
): string | null {
  if (!isAppendOf(current.payments, next.payments)) return BILLING_PAYMENT_LOST;
  if (!isAppendOf(current.notices, next.notices)) return BILLING_NOTICE_LOST;
  return null;
}

/**
 * 지금 청구 안내를 보낼 수 없는 이유 — 보낼 수 있으면 null.
 *
 * 개인결제창인데 링크가 없으면 안내에 실을 것이 없다 — 고객은 '결제해 달라' 는 말만 받고
 * 결제할 수단을 못 받는다. 계좌이체는 계좌 안내가 문면에 있으므로 막지 않는다.
 */
export function sendNoticeBlock(
  billing: Pick<Billing, 'method' | 'paymentLinkUrl'>,
): string | null {
  if (billing.method === 'payment_link' && billing.paymentLinkUrl.trim() === '') {
    return NOTICE_LINK_REQUIRED;
  }
  return null;
}

/* ── 전이 적용 (기록이 함께 움직인다) ─────────────────────────────────────── */

/**
 * 입금을 기록한다 — 막힌 기록은 **던진다**(술어가 먼저 걸러 주므로 여기 도달하면 그것은 버그다).
 *
 * 상태를 함께 옮기지 않는 이유는 상태가 저장되지 않기 때문이다(billingPaymentState 는 파생이다).
 * 기록 하나만 덧붙이면 목록 배지·잔액·완납일이 **동시에** 따라온다.
 */
export function applyPayment(billing: Billing, payment: BillingPayment): Billing {
  const blocked = recordPaymentBlock(billing, payment.amount, payment.paidOn);
  if (blocked !== null) throw new Error(blocked);
  return { ...billing, payments: [...billing.payments, payment] };
}

/** 청구 안내 발송을 기록한다 — 되돌리지 않는다(보낸 것은 보낸 것이다) */
export function applyNotice(billing: Billing, notice: BillingNotice): Billing {
  const blocked = sendNoticeBlock(billing);
  if (blocked !== null) throw new Error(blocked);
  return { ...billing, notices: [...billing.notices, notice] };
}

/* ── 표시 규칙 ────────────────────────────────────────────────────────────── */

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const BILLING_METHOD_OPTIONS: readonly Option<BillingMethod>[] = [
  { id: 'bank_transfer', label: '계좌이체' },
  { id: 'payment_link', label: '개인결제창' },
];

export const BILLING_NOTICE_CHANNEL_OPTIONS: readonly Option<BillingNoticeChannel>[] = [
  { id: 'email', label: '이메일' },
  { id: 'sms', label: '문자' },
  { id: 'kakao', label: '카카오톡' },
  { id: 'phone', label: '전화' },
];

const METHOD_LABEL: Record<BillingMethod, string> = {
  bank_transfer: '계좌이체',
  payment_link: '개인결제창',
};

export function billingMethodLabel(method: BillingMethod): string {
  return METHOD_LABEL[method];
}

const NOTICE_CHANNEL_LABEL: Record<BillingNoticeChannel, string> = {
  email: '이메일',
  sms: '문자',
  kakao: '카카오톡',
  phone: '전화',
};

export function billingNoticeChannelLabel(channel: BillingNoticeChannel): string {
  return NOTICE_CHANNEL_LABEL[channel];
}

interface StateMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

/**
 * 입금 상태의 문구·색.
 *
 * 부분입금을 미입금과 같은 색으로 두지 않는다 — 둘은 운영자가 할 일이 다르다. 미입금은 안내를
 * 다시 보낼 자리이고, 부분입금은 잔액만 받아 내면 되는 자리다.
 */
const STATE_META: Record<BillingPaymentState, StateMeta> = {
  unpaid: { label: '미입금', tone: 'warning' },
  partial: { label: '부분입금', tone: 'info' },
  paid: { label: '입금완료', tone: 'success' },
};

export function billingStateMeta(state: BillingPaymentState): StateMeta {
  return STATE_META[state];
}

/* ── 목록 조회(순수) ──────────────────────────────────────────────────────── */

export const BILLING_FILTER_ALL = 'all';
export type BillingStateFilter = typeof BILLING_FILTER_ALL | BillingPaymentState;

export const BILLING_STATE_FILTERS: readonly Option<BillingStateFilter>[] = [
  { id: BILLING_FILTER_ALL, label: '전체' },
  { id: 'unpaid', label: '미입금' },
  { id: 'partial', label: '부분입금' },
  { id: 'paid', label: '입금완료' },
];

export const BILLING_STATE_FILTER_VALUES: readonly BillingStateFilter[] = BILLING_STATE_FILTERS.map(
  (option) => option.id,
);

export function filterBillings(
  list: readonly Billing[],
  filter: BillingStateFilter,
): readonly Billing[] {
  if (filter === BILLING_FILTER_ALL) return list;
  return list.filter((billing) => billingPaymentState(billing) === filter);
}

/** 건수 배지 — **필터 이전** 전체 집합에서 센다(필터가 자기 배지를 흔들면 비교가 불가능하다) */
export function countBillingsByState(list: readonly Billing[]): Record<BillingStateFilter, number> {
  const counts: Record<BillingStateFilter, number> = {
    [BILLING_FILTER_ALL]: list.length,
    unpaid: 0,
    partial: 0,
    paid: 0,
  };
  for (const billing of list) counts[billingPaymentState(billing)] += 1;
  return counts;
}

/** 아직 다 받지 못한 청구의 잔액 합 — 목록 상단이 '지금 얼마가 미수인가' 를 말한다 */
export function totalOutstanding(list: readonly Billing[]): number {
  return list.reduce((sum, billing) => sum + Math.max(outstandingAmount(billing), 0), 0);
}

export function searchBillings(list: readonly Billing[], keyword: string): readonly Billing[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (billing) =>
      billing.billNo.toLowerCase().includes(needle) ||
      billing.quoteNo.toLowerCase().includes(needle) ||
      billing.accountName.toLowerCase().includes(needle),
  );
}

/** 청구일 내림차순(최근이 위). 같은 날짜는 청구번호 내림차순. 테스트가 직접 부른다. */
export function sortBillings(list: readonly Billing[]): readonly Billing[] {
  return [...list].sort((a, b) => {
    if (a.issuedAt !== b.issuedAt) return a.issuedAt < b.issuedAt ? 1 : -1;
    return a.billNo < b.billNo ? 1 : a.billNo > b.billNo ? -1 : 0;
  });
}

export function toBillingInput(billing: Billing): BillingInput {
  return {
    billNo: billing.billNo,
    quoteId: billing.quoteId,
    quoteNo: billing.quoteNo,
    accountId: billing.accountId,
    accountName: billing.accountName,
    method: billing.method,
    paymentLinkUrl: billing.paymentLinkUrl,
    amount: billing.amount,
    issuedAt: billing.issuedAt,
    notices: billing.notices,
    payments: billing.payments,
    note: billing.note,
  };
}

/** 청구번호 자동 생성 — 'BL-YYYYMMDD-NNN'. seq 는 데이터소스가 채운다. */
export function makeBillNo(issuedAt: string, seq: number): string {
  const compact = issuedAt.replace(/\D/g, '');
  return `BL-${compact}-${String(seq).padStart(3, '0')}`;
}

/**
 * 견적 → 청구 입력(순수) — 무엇이 견적에서 넘어오는지의 단일 정의.
 *
 * 청구액은 견적 **합계**(공급가액 + 세액)의 스냅숏이다. 참조로 두지 않는 이유는 주문이 상품
 * 스냅숏을 드는 이유와 같다(shared/domain/order.ts) — 견적을 나중에 고치면 이미 보낸 청구서의
 * 금액이 사후에 바뀌고, 그 청구서를 근거로 받은 입금이 전부 어긋난다.
 *
 * 청구 방식의 기본값은 계좌이체다: 개인결제창은 링크를 먼저 만들어야 성립하는데, 그 링크는 이
 * 시점에 아직 없다.
 */
export function buildBillingFromQuote(quote: Quote, issuedAt: string): BillingInput {
  return {
    // 청구번호는 데이터소스가 채번한다(빈 값 = 자동 부여) — 사람이 정하지 않는다.
    billNo: '',
    quoteId: quote.id,
    quoteNo: quote.quoteNo,
    accountId: quote.accountId,
    accountName: quote.accountName,
    method: 'bank_transfer',
    paymentLinkUrl: '',
    amount: computeTotals(quote.items, quote.taxMode).total,
    issuedAt,
    notices: [],
    payments: [],
    note: '',
  };
}
