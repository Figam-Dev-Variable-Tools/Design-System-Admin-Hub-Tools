// 견적 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 국내 견적서 관례: 품목 라인아이템(품목·규격·수량·단가 → 공급가액 자동)·과세유형별 부가세(10%/영세/면세)·
// 공급가액/세액/합계 자동 합산·유효기간·견적→수주 전환. 세액은 라인별 반올림 후 합산으로 규칙을 고정한다.
import type { StatusTone } from '../../../shared/ui';

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

/** 견적 상태 — 작성→발송→승인/반려, 만료, 수주전환(종료·잠금) */
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'ordered';

export interface Quote {
  readonly id: string;
  /** 견적번호 — 'Q-YYYYMMDD-NNN' */
  readonly quoteNo: string;
  readonly accountName: string;
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
  /** 원본 문의 id — '' 면 수동 등록 견적. 값이 있으면 승계 필드가 잠긴다 */
  readonly inquiryId: string;
  /** 원본 문의번호(승계 스냅숏 — 표시·역링크용) */
  readonly inquiryNo: string;
  /** 승계된 문의내용(읽기 전용 — 견적 작성의 근거) */
  readonly inquiryBody: string;
}

export type QuoteInput = Omit<Quote, 'id'>;

/**
 * 문의에서 자동 생성된 견적인가 — 승계 필드·견적번호를 잠그는 단일 판정.
 * 사람이 고칠 수 있는 값과 시스템이 승계한 값을 화면마다 다시 정의하지 않게 한다.
 */
export function isInherited(quote: Pick<Quote, 'inquiryId'>): boolean {
  return quote.inquiryId !== '';
}

export const QUOTE_ITEM_NAME_MAX = 60;
export const QUOTE_MAX_ITEMS = 30;
export const QUOTE_NOTE_MAX = 500;

/** 공급자(자사) 정보 — 견적서 미리보기 상단에 고정 노출. 연동 시 회사 설정에서 주입한다. */
export const SUPPLIER = {
  name: 'TDS 주식회사',
  bizNo: '211-88-11223',
  ceoName: '홍대표',
  address: '서울특별시 강남구 테헤란로 501, 12층',
  phone: '02-6000-1000',
} as const;

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

export const QUOTE_STATUS_OPTIONS: readonly Option[] = [
  { id: 'draft', label: '작성중' },
  { id: 'sent', label: '발송' },
  { id: 'accepted', label: '승인' },
  { id: 'rejected', label: '반려' },
  { id: 'expired', label: '만료' },
  { id: 'ordered', label: '수주전환' },
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
  ordered: { label: '수주전환', tone: 'success' },
};

export function quoteStatusMeta(status: QuoteStatus): StatusMeta {
  return STATUS_META[status];
}

/** 수주 전환 가능 여부 — 승인된 견적만 전환한다(이미 전환/반려/만료는 불가) */
export function canConvertToOrder(status: QuoteStatus): boolean {
  return status === 'accepted';
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
      quote.accountName.toLowerCase().includes(needle),
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
    inquiryId: quote.inquiryId,
    inquiryNo: quote.inquiryNo,
    inquiryBody: quote.inquiryBody,
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

/** 문의 → 견적 승계 값(순수) — 어떤 필드가 문의에서 넘어오는지의 단일 정의 */
export interface QuoteInheritance {
  readonly inquiryId: string;
  readonly inquiryNo: string;
  /** 회사 → 거래처(공급받는자) */
  readonly company: string;
  /** 문의 고객명 → 담당자 */
  readonly customerName: string;
  /** 문의내용 */
  readonly body: string;
  /** 발행일 'YYYY-MM-DD' */
  readonly issueDate: string;
}

/**
 * 승계된 값으로 신규 견적 입력을 만든다(순수) — 문의에서 넘어오는 필드는 여기 한 곳에서만 정한다.
 * 품목·과세유형·금액은 승계 대상이 아니다(문의는 그 정보를 갖지 않는다) — 운영자가 채운다.
 * 상태는 '작성중'이다: 품목이 비어 있는 견적을 '발송'으로 두면 발송되지 않은 견적이 발송으로 보인다.
 */
export function buildQuoteFromInquiry(inheritance: QuoteInheritance): QuoteInput {
  return {
    // 견적번호는 데이터소스가 채번한다(빈 값 = 자동 부여) — 사람이 정하지 않는다.
    quoteNo: '',
    accountName: inheritance.company,
    accountBizNo: '',
    accountCeo: '',
    contactName: inheritance.customerName,
    issueDate: inheritance.issueDate,
    validUntil: addDays(inheritance.issueDate, QUOTE_VALID_DAYS),
    taxMode: 'standard',
    items: [],
    status: 'draft',
    note: '',
    inquiryId: inheritance.inquiryId,
    inquiryNo: inheritance.inquiryNo,
    inquiryBody: inheritance.body,
  };
}
