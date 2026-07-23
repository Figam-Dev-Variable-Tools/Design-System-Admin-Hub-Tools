// 구독 결제의 '사실' — 결제 탭·결제내역 탭이 읽는 모델
//
// ┌ 이것은 /sales/billing 이 아니다 ─────────────────────────────────────────┐
// │ /sales/billing (영업 관리 > 청구·입금)  = **우리가 고객에게** 청구한 건.   │
// │                                          받을 돈이고, 운영자가 입금을 확인 │
// │                                          해 상태를 바꾼다(쓰기가 있다).    │
// │ 이 파일 (/settings/plan · 결제·결제내역) = **우리가 사내에 내는** 구독료.   │
// │                                          낼 돈이고, 이 어드민은 결과를     │
// │                                          받아 보여줄 뿐이다(쓰기가 없다).  │
// │                                                                          │
// │ 두 화면은 낱말이 거의 같아서(청구·금액·상태·미납) 서로를 흉내 내기 쉽다.     │
// │ 그래서 타입 이름을 `Billing*` 이 아니라 **`Subscription*`** 으로 둔다 —     │
// │ import 한 줄만 봐도 어느 쪽 돈인지 드러나야 한다.                          │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ null 은 '모른다' 다 — 0 도 [] 도 아니다 ─────────────────────────────────┐
// │ 이 앱에는 백엔드가 없다. 결제 수단·다음 청구일·지난 청구 목록은 사내 어드민   │
// │ 이 내려 주는 값이고, 지금은 **아무도 내려 주지 않았다.** 그 상태를 0원·0건   │
// │ 으로 그리면 화면이 '결제 수단이 없다'·'청구된 적이 없다' 는 **거짓 사실**을   │
// │ 단정한다 — 운영자는 그것을 믿고 사내에 문의한다.                           │
// │                                                                          │
// │ 그래서 모름을 두 층으로 나눈다:                                            │
// │   문서 자체가 null   → 이 어드민이 아직 결제 정보를 **받지 않았다**         │
// │   문서 안 필드가 null → 받았지만 그 값은 **보내지 않았다**                  │
// │   빈 배열([])        → 받았고, 지난 청구가 **실제로 0건이다**(신규 계약)     │
// │ 셋은 운영자가 할 행동이 다르므로 화면도 셋으로 갈린다.                      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// TODO(backend): GET /api/tenant/subscription/billing → SubscriptionBilling | null
// TODO(backend): GET /api/tenant/subscription/invoices → readonly SubscriptionInvoice[] | null
//   ⚠ 두 엔드포인트 모두 **조회만** 한다. 결제 수단 등록·플랜 변경·재청구는 사내 홈페이지 소관이고,
//     여기에 쓰기를 만들면 실제 계약과 어긋나는 두 번째 정본이 생긴다 (PlanPage.tsx 머리말).
import { formatNumber } from '../../../shared/format';

/* ── 결제 수단 ─────────────────────────────────────────────────────────────── */

export const BILLING_METHOD_KINDS = ['card', 'transfer', 'invoice'] as const;

export type BillingMethodKind = (typeof BILLING_METHOD_KINDS)[number];

export const BILLING_METHOD_LABEL: Readonly<Record<BillingMethodKind, string>> = {
  card: '신용카드 자동결제',
  transfer: '계좌 자동이체',
  invoice: '세금계산서 발행 후 입금',
};

export interface BillingMethod {
  readonly kind: BillingMethodKind;
  /**
   * 사람이 **자기 수단을 알아보는 최소 조각** — '신한 ····1234' · '기업 ···456'.
   * 카드번호·계좌번호 전체는 이 어드민에 오지 않는다(올 이유가 없다). 모르면 null.
   */
  readonly hint: string | null;
}

/** '신용카드 자동결제 · 신한 ····1234' — 힌트가 없으면 수단 이름만 말한다 */
export function formatBillingMethod(method: BillingMethod): string {
  const label = BILLING_METHOD_LABEL[method.kind];
  return method.hint === null ? label : `${label} · ${method.hint}`;
}

/* ── 청구 주기 ─────────────────────────────────────────────────────────────── */

export const BILLING_CYCLES = ['monthly', 'yearly'] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const BILLING_CYCLE_LABEL: Readonly<Record<BillingCycle, string>> = {
  monthly: '월간',
  yearly: '연간',
};

/* ── 금액 ──────────────────────────────────────────────────────────────────── */

/**
 * 통화를 값과 **한 벌로** 든다.
 *
 * 숫자만 들고 화면에서 '원' 을 붙이면 해외 계약(USD 연간)이 들어온 날 조용히 틀린 금액이 된다 —
 * 화면은 통화를 모르므로 그것이 잘못됐다는 사실조차 드러나지 않는다.
 */
export interface Money {
  /** ISO 4217 (KRW · USD …) */
  readonly currency: string;
  readonly amount: number;
}

/**
 * 금액 표시 — 통화 코드가 ISO 4217 이 아니면 Intl 이 던진다.
 *
 * 그 예외로 화면이 통째로 죽는 것이 최악이다(우리가 만든 값도 아니고 화면이 고칠 수도 없다).
 * 그래서 던지면 숫자 + 코드 원문으로 되돌아간다 — 틀린 통화 기호를 붙이는 것보다 낫다.
 */
export function formatMoney(money: Money): string {
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: money.currency,
      currencyDisplay: 'narrowSymbol',
    }).format(money.amount);
  } catch {
    return `${formatNumber(money.amount)} ${money.currency}`;
  }
}

/* ── 구독의 결제 정보 ──────────────────────────────────────────────────────── */

/**
 * 지금 구독이 **어떻게 청구되는가**.
 *
 * 청구 상태(정상·지연·정지)는 여기 없다 — 그것은 PlanState.billingState 가 이미 갖고 있고,
 * 엔타이틀먼트 판정(planReadOnly)이 그 값을 읽는다. 같은 사실을 두 곳에 두면 배너와 이 카드가
 * 서로 다른 말을 하는 날이 온다.
 */
export interface SubscriptionBilling {
  readonly method: BillingMethod | null;
  readonly cycle: BillingCycle | null;
  /** 다음 청구일 'YYYY-MM-DD'. 해지 예정이면 다음 청구가 없으므로 null 이 정상이다 */
  readonly nextChargeAt: string | null;
  readonly nextChargeAmount: Money | null;
  /** 청구서·영수증이 가는 주소 — 운영자가 '나에게 안 왔다' 를 확인하는 유일한 단서 */
  readonly invoiceEmail: string | null;
}

/* ── 지난 청구 한 건 ───────────────────────────────────────────────────────── */

export const INVOICE_STATES = ['paid', 'unpaid', 'refunded', 'void'] as const;

export type InvoiceState = (typeof INVOICE_STATES)[number];

export const INVOICE_STATE_LABEL: Readonly<Record<InvoiceState, string>> = {
  paid: '결제 완료',
  unpaid: '미납',
  refunded: '환불',
  void: '청구 취소',
};

export interface SubscriptionInvoice {
  readonly id: string;
  /** 청구일 'YYYY-MM-DD' */
  readonly chargedAt: string;
  /** 이 청구가 덮는 이용 기간 'YYYY-MM-DD' — 금액만으로는 무엇에 대한 청구인지 알 수 없다 */
  readonly periodStart: string;
  readonly periodEnd: string;
  /** 그때의 계약명 — 지금 플랜과 다를 수 있다(플랜을 올린 뒤 옛 청구를 볼 때) */
  readonly planLabel: string;
  readonly amount: Money;
  readonly state: InvoiceState;
  /** 영수증·세금계산서가 있는 곳. 없으면 null — 링크 칸을 비워 두는 것이 가짜 링크보다 낫다 */
  readonly receiptUrl: string | null;
}

/* ── 조회 (지금은 전부 '모른다') ───────────────────────────────────────────── */

/**
 * 이 어드민이 받은 결제 정보 — **지금은 null 이다.**
 *
 * 상수를 돌려주는 함수인 이유: 이 값이 오는 자리가 어디인지 코드에 남겨 두기 위해서다. 서버가
 * 붙으면 이 함수 본문만 바뀌고 화면은 그대로다(entitlement-store 의 loadState 와 같은 규약).
 * 빈 객체를 돌려주지 않는 이유는 파일 머리말에 적었다 — 모름과 없음은 다른 사실이다.
 */
export function fetchSubscriptionBilling(): SubscriptionBilling | null {
  // TODO(backend): GET /api/tenant/subscription/billing
  return null;
}

/**
 * 지난 청구 목록 — **지금은 null 이다**(빈 배열이 아니다).
 *
 * `[]` 를 돌려주면 화면이 '청구된 적이 없습니다' 라고 **완결되게** 말한다. 그것은 3년째 결제 중인
 * 고객에게도 똑같이 나오는 거짓말이다.
 */
export function fetchSubscriptionInvoices(): readonly SubscriptionInvoice[] | null {
  // TODO(backend): GET /api/tenant/subscription/invoices
  return null;
}

/* ── 모름의 말투 ───────────────────────────────────────────────────────────── */

/**
 * 값을 모를 때 칸에 쓰는 말 — **한 벌만 둔다.**
 *
 * '—' · '없음' · '미확인' 이 섞이면 운영자는 그중 어느 것이 '0' 이고 어느 것이 '모름' 인지 구분할
 * 수 없다. 이 화면에서 그 구분이 전부이므로 낱말을 고정한다.
 */
export const UNKNOWN_TEXT = '확인할 수 없음';

/** 모르는 값의 칸 — null 이면 UNKNOWN_TEXT, 아니면 포맷한 값 */
export function orUnknown<T>(value: T | null, format: (value: T) => string): string {
  return value === null ? UNKNOWN_TEXT : format(value);
}
