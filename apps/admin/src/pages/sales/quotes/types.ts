// 견적 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 국내 견적서 관례: 품목 라인아이템(품목·규격·수량·단가 → 공급가액 자동)·과세유형별 부가세(10%/영세/면세)·
// 공급가액/세액/합계 자동 합산·유효기간·견적→수주 전환. 세액은 라인별 반올림 후 합산으로 규칙을 고정한다.
import { directionParticle } from '../../../shared/format';
import type { StatusTone } from '../../../shared/ui';
import type { QuoteIssueSource, QuoteSourceChannel } from '../../../shared/domain/quote-issue';
import { UNREGISTERED_ACCOUNT_ID } from '../_shared/account-reference';
import type { AccountRef } from '../_shared/account-reference';

/** 라인아이템 — 공급가액은 저장하지 않고 수량·단가에서 파생한다(단일 원천) */
export interface QuoteLineItem {
  readonly id: string;
  /** 품목명 */
  readonly name: string;
  /** 규격/사양 */
  readonly spec: string;
  readonly quantity: number;
  /** 단가(원) */
  readonly unitPrice: number;
}

/** 과세유형 — 확장 가능하게 rate 를 데이터로 들고 있다(일반 10% · 영세 0% · 면세 없음) */
export type QuoteTaxMode = 'standard' | 'zero_rated' | 'exempt';

/** 견적 상태 — 작성→발송→승인/반려, 만료, 수주전환(계약·청구가 여기서 갈라진다) */
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'ordered';

/**
 * 이 견적을 만들어 낸 문의 한 건.
 *
 * [왜 배열인가 — 문의 하나에 견적 하나가 아니다]
 * 예전에는 견적이 `inquiryId`·`inquiryNo`·`inquiryBody` 스칼라 세 개를 들었다. 그래서 견적은
 * 언제나 문의 **한 건**의 산물이었고, '상품 셋을 한 번에 견적 내 달라' 는 요청은 견적 세 장이
 * 되거나(합계가 없다) 앱 밖에서 손으로 합쳐졌다. 외부 커머스(WooCommerce·Shopify 계열)의 견적
 * 요청은 전부 장바구니 모양이다 — `Quote.items` 가 이미 배열인 것도 같은 이유다. 원본도 배열로
 * 맞춘다: **합쳐진 문의는 모두 같은 견적 id 를 갖는다.**
 */
export interface QuoteSource {
  /** 원본 문의 id — 중복 발행을 막는 멱등키이자 역링크의 목적지 */
  readonly id: string;
  /** 원본 문의번호(승계 스냅숏 — 표시용) */
  readonly no: string;
  readonly channel: QuoteSourceChannel;
  /** 승계된 문의내용(읽기 전용 — 견적 작성의 근거) */
  readonly body: string;
}

/**
 * 문의 창구별 목록 경로 — 역링크가 갈 곳.
 *
 * [동명이인 정리] 이 값들은 예전에 견적 화면 세 곳에 `const INQUIRY_PATH = '/sales/inquiries'`
 * 로 각자 박혀 있었다. 그런데 `shared/commerce/payment-settings.ts` 에도 **같은 이름**의
 * `INQUIRY_PATH` 가 있고 그쪽은 상품·프로그램 문의 경로를 가리킨다 — 이름은 같고 뜻은 다른
 * 두 상수였다. 이제 세 창구를 한 표에 모으고 이름도 '문의 경로' 가 아니라 '견적 원본 경로' 로
 * 바꾼다. 경로 문자열은 모듈 import 가 아니라서 페이지 결합이 아니다(축1).
 */
const QUOTE_SOURCE_PATH: Readonly<Record<QuoteSourceChannel, string>> = {
  sales: '/sales/inquiries',
  product: '/products/inquiries',
  program: '/programs/inquiries',
};

const QUOTE_SOURCE_LABEL: Readonly<Record<QuoteSourceChannel, string>> = {
  sales: '영업 문의',
  product: '상품 문의',
  program: '프로그램 문의',
};

export function quoteSourceChannelLabel(channel: QuoteSourceChannel): string {
  return QUOTE_SOURCE_LABEL[channel];
}

/** 원본 문의 상세로 가는 경로 — 화면마다 문자열을 다시 조립하지 않게 한다 */
export function quoteSourceHref(source: QuoteSource): string {
  return `${QUOTE_SOURCE_PATH[source.channel]}/${source.id}`;
}

/**
 * 견적.
 *
 * 거래처(공급받는자)는 AccountRef 두 필드로 참조한다 — `accountId`(마스터를 가리키는 **정본**,
 * '' 이면 미등록)와 `accountName`(견적서에 인쇄되는 비정규화 표시 라벨). 견적서는 발행 시점의
 * 상호를 그대로 남겨야 하는 문서라 라벨을 **일부러** 함께 보관한다 — 거래처가 나중에 개명해도
 * 이미 보낸 견적서의 상호가 바뀌어서는 안 된다. 조회·링크의 정본은 언제나 accountId 다.
 * (근거와 규칙은 ../_shared/account-reference 머리말)
 */
export interface Quote extends AccountRef {
  readonly id: string;
  /** 견적번호 — 'Q-YYYYMMDD-NNN' */
  readonly quoteNo: string;
  /** 공급받는자 사업자등록번호(표기용) */
  readonly accountBizNo: string;
  readonly accountCeo: string;
  /** 공급받는자 담당자 — 문의에서 발행하면 문의 고객명을 승계한다 */
  readonly contactName: string;
  /** 견적일 'YYYY-MM-DD' */
  readonly issueDate: string;
  /** 유효기간(만료일) 'YYYY-MM-DD' */
  readonly validUntil: string;
  readonly taxMode: QuoteTaxMode;
  readonly items: readonly QuoteLineItem[];
  readonly status: QuoteStatus;
  readonly note: string;
  /** 이 견적을 만들어 낸 문의들 — 비어 있으면 수동 등록 견적. 값이 있으면 승계 필드가 잠긴다 */
  readonly sources: readonly QuoteSource[];
}

export type QuoteInput = Omit<Quote, 'id'>;

/**
 * 문의에서 자동 생성된 견적인가 — 승계 필드·견적번호를 잠그는 단일 판정.
 * 사람이 고칠 수 있는 값과 시스템이 승계한 값을 화면마다 다시 정의하지 않게 한다.
 */
export function isInherited(quote: Pick<Quote, 'sources'>): boolean {
  return quote.sources.length > 0;
}

/**
 * 대표 원본 문의 — 거래처·담당자를 승계해 온 그 한 건.
 *
 * `sources[0]` 을 화면이 직접 집지 않는다: noUncheckedIndexedAccess 아래에서 그 표현은 매번
 * undefined 분기를 요구하고, 그 분기를 화면마다 다르게 처리하면 '원본이 있는데 비어 보이는'
 * 견적이 생긴다. 여기 한 곳에서만 집는다.
 */
export function primaryQuoteSource(quote: Pick<Quote, 'sources'>): QuoteSource | undefined {
  return quote.sources[0];
}

export const QUOTE_ITEM_NAME_MAX = 60;
export const QUOTE_MAX_ITEMS = 30;
export const QUOTE_NOTE_MAX = 500;

/**
 * 공급자(자사) 정보 — 견적서 상단에 고정 노출.
 *
 * [예전에는 여기 하드코딩된 상수였다] 'TDS 주식회사 · 211-88-11223'. 정작 회사 정보 화면에는
 * 다른 회사가 저장돼 있어서(주식회사 예시플래닝 · 123-45-67890), **회사 정보를 고쳐도 인쇄되는
 * 견적서는 바뀌지 않았다.** 옛 주석은 '연동 시 회사 설정에서 주입한다' 고 적어 두었지만 그 연동은
 * 오지 않았고, 주석이 낡은 채로 두 화면이 같은 사실을 다르게 말했다.
 *
 * [왜 회사 화면을 직접 부르지 않나] pages/sales → pages/company 는 페이지 간 결합이다
 * (code-quality 축1, blocker). 값은 공통 층의 조회기가 주고(shared/domain/supplier.ts),
 * 그 자리를 채우는 것은 두 도메인을 모두 아는 src/wiring.ts 다. 이 화면은 '회사 정보' 라는
 * 모듈을 끝까지 모른다.
 *
 * [상수가 아니라 함수인 이유] 회사 정보는 운영 중에 바뀐다. 모듈 로드 시점에 값을 얼려 두면
 * 저장한 회사 정보가 다음 새로고침까지 견적서에 나타나지 않는다 — 정확히 예전의 그 증상이다.
 */
export { resolveSupplier as quoteSupplier } from '../../../shared/domain/supplier';

interface TaxModeMeta {
  readonly id: QuoteTaxMode;
  readonly label: string;
  readonly rate: number;
}

export const TAX_MODE_OPTIONS: readonly TaxModeMeta[] = [
  { id: 'standard', label: '과세(10%)', rate: 0.1 },
  { id: 'zero_rated', label: '영세율(0%)', rate: 0 },
  { id: 'exempt', label: '면세', rate: 0 },
];

function taxRateOf(mode: QuoteTaxMode): number {
  return TAX_MODE_OPTIONS.find((option) => option.id === mode)?.rate ?? 0;
}

export function taxModeLabel(mode: QuoteTaxMode): string {
  return TAX_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode;
}

interface Option {
  readonly id: QuoteStatus;
  readonly label: string;
}

/**
 * `ordered` 의 사람 이름 — **'수주' 와 '계약 진행' 은 같은 칸의 두 이름이다.**
 *
 * [왜 한쪽을 지우지 않았나] 예전에는 버튼이 '계약 초안 만들기' 인데 거절 문구는 '…수주로 전환할
 * 수 있습니다' 였고 상태값은 `ordered` 였다. 운영자는 그 칸을 '계약 진행' 이라 부른다 — 세 이름이
 * 한 칸을 가리켰다. 그렇다고 `ordered` 를 '계약' 으로 개명할 수는 없다: 이 상태는 **청구의 근거**
 * 이기도 하다(../billing/types.ts 규칙 ③ — 청구는 수주 전환된 견적에서만 생긴다). '계약된 견적만
 * 청구할 수 있다' 는 문장은 거짓이다(청구는 계약을 요구하지 않는다). 그래서 코드 어휘는 `ordered`
 * 로 두고, **사람이 읽는 자리에는 두 이름을 붙여 둔다** — 운영자의 말과 코드의 말이 같은 줄에서
 * 만나게. 라벨은 여기 한 곳에서만 정한다.
 */
export const QUOTE_ORDERED_LABEL = '수주(계약 진행)';

export const QUOTE_STATUS_OPTIONS: readonly Option[] = [
  { id: 'draft', label: '작성중' },
  { id: 'sent', label: '발송' },
  { id: 'accepted', label: '승인' },
  { id: 'rejected', label: '반려' },
  { id: 'expired', label: '만료' },
  { id: 'ordered', label: QUOTE_ORDERED_LABEL },
];

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

const STATUS_META: Record<QuoteStatus, StatusMeta> = {
  draft: { label: '작성중', tone: 'neutral' },
  sent: { label: '발송', tone: 'info' },
  accepted: { label: '승인', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
  expired: { label: '만료', tone: 'neutral' },
  ordered: { label: QUOTE_ORDERED_LABEL, tone: 'success' },
};

export function quoteStatusMeta(status: QuoteStatus): StatusMeta {
  return STATUS_META[status];
}

/* ── 상태 전이 (순수) ─────────────────────────────────────────────────────────
 *
 * ┌ 무엇이 없었나 ───────────────────────────────────────────────────────────┐
 * │ 견적 상세에는 상태를 바꾸는 컨트롤이 **한 개도 없었다.** 그런데 다음 칸(계약)  │
 * │ 은 '승인' 에서만 열린다. 그래서 발송한 견적을 승인으로 넘길 방법이 화면에      │
 * │ 없어 계약 버튼이 영원히 잠겨 있었다 — 운영자가 말한 "발송 후 상태 관리에서    │
 * │ 다음으로 변경" 이 실제로 불가능했다.                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * [되돌리는 전이는 없다 — 답할 수 없기 때문이다]
 * `accepted → sent` 를 열면 곧바로 답할 수 없는 질문이 생긴다: 그 견적으로 이미 계약이 만들어졌다면
 * 그 계약은 무엇이 되는가? 청구가 걸려 있다면 그 청구는? 백엔드가 없어 되돌릴 트랜잭션도 없다.
 * 답할 수 없으면 막는다. 견적서 내용을 고치는 길은 그대로 살아 있다('견적 수정') — 막은 것은
 * **상태를 거꾸로 돌리는 일**뿐이다.
 *
 * [`ordered` 는 이 표에 없다 — 사람이 고르는 칸이 아니다]
 * 예전에는 '수주 전환' 버튼이 따로 있었고, 그 다음에 '계약 초안 만들기' 를 또 눌러야 했다.
 * 한 사건('이 거래는 성사됐다')을 두 번 누르게 한 셈이고, 그래서 계약이 있는데 견적은 '승인' 에
 * 머무는 어긋남이 생겼다. 이제 `ordered` 는 **계약이 만들어진 결과**다(../contracts/data-source
 * 의 createContractFromQuote → ./data-source 의 markQuoteOrdered).
 */

const QUOTE_STATUS_FLOW: Readonly<Record<QuoteStatus, readonly QuoteStatus[]>> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected'],
  // 승인 다음 칸은 상태가 아니라 문서(계약)다 — 아래 QUOTE_STATUS_NEXT_IS_CONTRACT 가 그렇게 말한다.
  accepted: [],
  rejected: [],
  expired: [],
  ordered: [],
};

/**
 * 상태 관리 UI 가 늘어놓는 칸 — **운영자가 손으로 고르는 상태만** 이다.
 *
 * `draft` 는 없다(견적은 문의에서 '작성중' 으로 태어난다 — 되돌아갈 칸이 아니다).
 * `expired` 도 없다: 만료는 유효기간이 지났다는 **관측 사실**이지 운영자의 의견이 아니다.
 * `ordered` 는 계약이 만든다(위 머리말).
 */
export const QUOTE_MANUAL_STATUSES: readonly QuoteStatus[] = ['sent', 'accepted', 'rejected'];

/** 지금 상태에서 손으로 갈 수 있는 칸 — 비어 있으면 그 상태가 종점이다 */
export function quoteStatusTransitions(from: QuoteStatus): readonly QuoteStatus[] {
  return QUOTE_STATUS_FLOW[from];
}

export function quoteStatusAlready(status: QuoteStatus): string {
  return `이미 '${quoteStatusMeta(status).label}' 상태예요.`;
}

export const QUOTE_STATUS_NEXT_IS_CONTRACT = `'승인' 다음 칸은 상태가 아니라 계약이에요. '계약 만들기'를 누르면 계약이 생기고 견적이 '${QUOTE_ORDERED_LABEL}'로 바뀌어요.`;

/** 종점 상태의 거절 사유 — 되돌리는 전이를 만들지 않는 이유를 문장으로 말한다 */
export function quoteStatusTerminal(from: QuoteStatus): string {
  return `'${quoteStatusMeta(from).label}' 상태의 견적은 상태를 되돌리거나 더 바꿀 수 없어요 — 계약·청구가 이 상태를 근거로 삼아요.`;
}

/**
 * 지금 이 견적의 상태를 `to` 로 바꿀 수 없는 이유 — 바꿀 수 있으면 null.
 *
 * **버튼의 disabled 조건과 저장의 거절 조건이 이 한 술어를 읽는다** — 둘이 갈라지면 '눌리는데
 * 실패하는 버튼' 또는 '눌리지 않는데 저장은 되는 동작' 이 생긴다
 * (shared/domain/order.ts 의 orderTransitionBlock 과 같은 규약).
 *
 * 거절이 boolean 이 아니라 문자열인 이유도 같다: 화면이 '왜 못 누르는지' 를 자기 문장으로 다시
 * 지어내면 같은 거절을 화면마다 다르게 설명하게 된다.
 */
export function quoteStatusChangeBlock(from: QuoteStatus, to: QuoteStatus): string | null {
  if (from === to) return quoteStatusAlready(to);
  const targets = quoteStatusTransitions(from);
  if (from === 'accepted') return QUOTE_STATUS_NEXT_IS_CONTRACT;
  if (targets.length === 0) return quoteStatusTerminal(from);
  if (!targets.includes(to)) {
    const allowed = targets.map((target) => `'${quoteStatusMeta(target).label}'`).join(' · ');
    const toLabel = quoteStatusMeta(to).label;
    return `'${quoteStatusMeta(from).label}'에서 '${toLabel}'${directionParticle(toLabel)} 바꿀 수 없어요. 지금 바꿀 수 있는 것: ${allowed}.`;
  }
  return null;
}

export const QUOTE_CONVERT_DONE = `이미 '${QUOTE_ORDERED_LABEL}' 상태인 견적이에요.`;
export const QUOTE_CONVERT_NOT_ACCEPTED = `승인된 견적만 '${QUOTE_ORDERED_LABEL}'로 넘길 수 있어요.`;

/**
 * 지금 이 견적에 '수주(계약 진행)' 를 찍을 수 없는 이유 — 찍을 수 있으면 null.
 *
 * 사람이 직접 부르는 술어가 아니다. **계약이 만들어질 때** 견적 저장소가 되돌려 쓰기 직전에 읽고
 * (./data-source 의 markQuoteOrdered), 화면은 그 결과 문자열을 그대로 보여 준다. 그래서 '계약은
 * 생겼는데 견적은 안 바뀐' 반쪽 저장이 조용히 지나가지 않는다.
 */
export function quoteConvertBlock(status: QuoteStatus): string | null {
  if (status === 'ordered') return QUOTE_CONVERT_DONE;
  if (status !== 'accepted') return QUOTE_CONVERT_NOT_ACCEPTED;
  return null;
}

/**
 * 수주 이후의 문서(청구)를 만들 수 있는 견적인가.
 *
 * `ordered` 하나만 문을 연다. 승인(accepted)만으로는 아직 거래가 확정되지 않았고, 그 상태에서
 * 청구가 먼저 생기면 성사되지 않은 견적에 돈 이야기가 붙는다. 이제 `ordered` 는 계약이 만들어진
 * 결과이므로, 이 술어는 사실상 '계약이 맺어진 견적인가' 를 묻는다.
 */
export function isOrderedQuote(status: QuoteStatus): boolean {
  return status === 'ordered';
}

/**
 * 계약은 있는데 견적 상태가 그것을 반영하지 못한 상태인가 — 어긋났으면 사유, 멀쩡하면 null.
 *
 * [왜 필요한가 — 두 갈래로 생긴다]
 *   ① **반쪽 저장.** 백엔드가 없어 트랜잭션이 없다. 계약은 만들어졌는데 되돌려 쓰기가 실패하면
 *      정확히 이 모양이 남는다. 성공을 흉내 내지 않으려면 그 어긋남을 화면이 말해야 한다.
 *   ② **옛 데이터.** 이 규칙이 생기기 전에 만들어진 계약(픽스처의 ct-2 ↔ qt-2)이 그대로 있다.
 *      조용히 정상인 척하지 않는다.
 * 어느 쪽이든 빠져나갈 길은 같다 — 견적 상세의 '견적 상태 맞추기'.
 */
export function quoteOrderDriftBlock(status: QuoteStatus, contractId: string): string | null {
  if (contractId === '' || status === 'ordered') return null;
  return `이 견적에는 이미 계약이 있는데 견적 상태는 '${quoteStatusMeta(status).label}' 예요. 계약이 만들어질 때 상태 갱신이 끝나지 않았거나, 이 규칙이 생기기 전에 맺은 계약이에요.`;
}

/* ── 금액 계산(순수) — 견적 도메인의 핵심 규칙 ─────────────────────────────── */

/** 라인 공급가액 = 수량 × 단가 */
export function lineSupply(item: Pick<QuoteLineItem, 'quantity' | 'unitPrice'>): number {
  return item.quantity * item.unitPrice;
}

interface QuoteTotals {
  readonly supply: number;
  readonly vat: number;
  readonly total: number;
}

/**
 * 합계 계산 — 라인별 공급가액 합산, 세액은 라인별 반올림 후 합산(문서 규칙 고정), 합계 = 공급가액 + 세액.
 * 면세/영세율은 세액 0.
 */
export function computeTotals(items: readonly QuoteLineItem[], taxMode: QuoteTaxMode): QuoteTotals {
  const rate = taxRateOf(taxMode);
  let supply = 0;
  let vat = 0;
  for (const item of items) {
    const amount = lineSupply(item);
    supply += amount;
    vat += Math.round(amount * rate);
  }
  return { supply, vat, total: supply + vat };
}

export const QUOTE_FILTER_ALL = 'all';
export type QuoteStatusFilter = typeof QUOTE_FILTER_ALL | QuoteStatus;

export function filterQuotes(list: readonly Quote[], filter: QuoteStatusFilter): readonly Quote[] {
  if (filter === QUOTE_FILTER_ALL) return list;
  return list.filter((quote) => quote.status === filter);
}

export function searchQuotes(list: readonly Quote[], keyword: string): readonly Quote[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (quote) =>
      quote.quoteNo.toLowerCase().includes(needle) ||
      quote.accountName.toLowerCase().includes(needle) ||
      // 운영자가 손에 쥔 단서는 견적번호가 아니라 고객이 부르는 **문의번호**일 때가 많다
      quote.sources.some((source) => source.no.toLowerCase().includes(needle)),
  );
}

/** 견적일 내림차순(최근이 위). 같은 날짜는 견적번호 내림차순. 테스트가 직접 부른다. */
export function sortQuotes(list: readonly Quote[]): readonly Quote[] {
  return [...list].sort((a, b) => {
    if (a.issueDate !== b.issueDate) return a.issueDate < b.issueDate ? 1 : -1;
    return a.quoteNo < b.quoteNo ? 1 : a.quoteNo > b.quoteNo ? -1 : 0;
  });
}

export function toQuoteInput(quote: Quote): QuoteInput {
  return {
    quoteNo: quote.quoteNo,
    accountId: quote.accountId,
    accountName: quote.accountName,
    accountBizNo: quote.accountBizNo,
    accountCeo: quote.accountCeo,
    contactName: quote.contactName,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    taxMode: quote.taxMode,
    items: quote.items,
    status: quote.status,
    note: quote.note,
    sources: quote.sources,
  };
}

/** 견적번호 자동 생성 — 'Q-YYYYMMDD-NNN'. seq 는 데이터소스가 채운다. */
export function makeQuoteNo(issueDate: string, seq: number): string {
  const compact = issueDate.replace(/\D/g, '');
  return `Q-${compact}-${String(seq).padStart(3, '0')}`;
}

/** 견적 기본 유효기간 — 발행일로부터 30일(국내 관례). 문의 발행 견적의 초기값. */
export const QUOTE_VALID_DAYS = 30;

/** 'YYYY-MM-DD' + 일수 → 'YYYY-MM-DD'. 유효기간 기본값 계산이 쓴다. */
export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return date;
  base.setDate(base.getDate() + days);
  const year = String(base.getFullYear());
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 발행 요청 → 견적 원본 참조(순수) — 무엇이 견적에 남는지의 단일 정의 */
function toQuoteSource(source: QuoteIssueSource): QuoteSource {
  return { id: source.id, no: source.no, channel: source.channel, body: source.body };
}

/**
 * 승계된 값으로 신규 견적 입력을 만든다(순수) — 문의에서 넘어오는 필드는 여기 한 곳에서만 정한다.
 *
 * 과세유형·유효기간·단가는 승계 대상이 아니다(문의는 그 정보를 갖지 않는다) — 운영자가 채운다.
 * 상태는 '작성중'이다: 품목이 비어 있는 견적을 '발송'으로 두면 발송되지 않은 견적이 발송으로 보인다.
 *
 * [여러 문의를 한 견적으로 — 바구니]
 * 거래처·담당자는 **첫 문의**를 따른다(합칠 수 있는 것은 같은 고객의 문의라는 전제다). 품목은
 * 문의마다 한 줄씩 쌓이고 단가는 0 으로 시작한다 — 문의는 금액을 모르기 때문이다. '무엇에 대한
 * 견적인지' 는 문의가 알고 '얼마인지' 는 운영자가 안다. 품목명을 갖지 않는 영업 문의(itemName '')
 * 는 줄을 만들지 않으므로 예전의 '품목 없는 빈 견적' 이 그대로 유지된다.
 *
 * [거래처는 미등록으로 시작한다] 문의는 고객이 적어 넣은 **이름 문자열**만 갖는다 — 그 회사가
 * 거래처 마스터의 어느 행인지 문의는 모른다. 여기서 억지로 이름을 맞춰 id 를 추측하면 동명이인
 * 거래처에 남의 견적이 붙는다. 그래서 accountId 는 ''(미등록)로 두고, 견적 폼이 '거래처 마스터에
 * 연결되지 않았다'는 사실과 연결 수단을 함께 보여 준다 (../_shared/AccountSelectField).
 */
export function buildQuoteFromSources(
  sources: readonly QuoteIssueSource[],
  issueDate: string,
): QuoteInput {
  const primary = sources[0];
  return {
    // 견적번호는 데이터소스가 채번한다(빈 값 = 자동 부여) — 사람이 정하지 않는다.
    quoteNo: '',
    accountId: UNREGISTERED_ACCOUNT_ID,
    accountName: primary?.accountLabel ?? '',
    accountBizNo: '',
    accountCeo: '',
    contactName: primary?.customerName ?? '',
    issueDate,
    validUntil: addDays(issueDate, QUOTE_VALID_DAYS),
    taxMode: 'standard',
    items: sources
      .filter((source) => source.itemName !== '')
      .map((source) => ({
        // 라인 id 는 원본 문의 id 에서 파생한다 — 같은 문의가 두 줄이 되지 않고, 줄이 어느
        // 문의에서 왔는지 데이터만 보고도 되짚을 수 있다.
        id: `li-${source.id}`,
        name: source.itemName,
        spec: '',
        quantity: 1,
        unitPrice: 0,
      })),
    status: 'draft',
    note: '',
    sources: sources.map(toQuoteSource),
  };
}
