// 거래처(계정) 도메인 타입 · 순수 규칙 · 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/sales/**)
//
// 국내 ERP(더존·이카운트) 거래처 관례를 따른다: 사업자정보(상호·사업자번호·대표·업태/종목·주소)·
// 거래유형(매출/매입/양방)·과세유형·신용등급·거래조건(여신한도·결제조건)·담당자 복수·거래 상태.
// 카테고리 결합이 없어 프레임워크 createCrudAdapter 를 그대로 쓴다.
import type { StatusTone } from '../../../shared/ui';

/** 거래유형 — 매출처/매입처/매입매출(양방) */
export type TradeType = 'sales' | 'purchase' | 'both';
/** 과세유형 — 일반/간이/면세/영세율 */
export type TaxType = 'general' | 'simplified' | 'exempt' | 'zero_rated';
/** 신용등급 — 우량(A)→불량(D) */
export type CreditGrade = 'A' | 'B' | 'C' | 'D';
/** 결제조건 — 현금/말일결제/Net-30/Net-60/익월말 */
export type PaymentTerm = 'cash' | 'eom' | 'net_30' | 'net_60' | 'next_eom';

/** 거래처 담당자 — 복수. 대표담당 1명(primary)이 목록·미리보기에 노출된다 */
export interface AccountContact {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  readonly position: string;
  readonly phone: string;
  readonly email: string;
  /** 대표담당 여부 — 한 명만 true 로 유지한다 */
  readonly primary: boolean;
}

export interface Account {
  readonly id: string;
  /** 상호(거래처명) */
  readonly name: string;
  /** 사업자등록번호 — '000-00-00000' 표기로 보관 */
  readonly bizNo: string;
  /** 대표자명 */
  readonly ceoName: string;
  /** 업태 — 도소매/제조/서비스 등 */
  readonly bizType: string;
  /** 종목 — 소프트웨어 개발 등 */
  readonly bizItem: string;
  readonly tradeType: TradeType;
  readonly taxType: TaxType;
  readonly creditGrade: CreditGrade;
  /** 여신한도(원) — 0 이면 미설정 */
  readonly creditLimit: number;
  readonly paymentTerm: PaymentTerm;
  readonly address: string;
  readonly phone: string;
  readonly contacts: readonly AccountContact[];
  /** 거래 상태 토글 — 끄면 거래중지 */
  readonly active: boolean;
  /** 최근 거래일 — 'YYYY-MM-DD'. 없으면 '' */
  readonly lastTradeAt: string;
  readonly note: string;
}

/** 쓰기 입력 — id 를 제외한 전체(담당자·상태 포함) */
export type AccountInput = Omit<Account, 'id'>;

export const ACCOUNT_NAME_MAX = 60;
export const ACCOUNT_NOTE_MAX = 500;
export const ACCOUNT_MAX_CONTACTS = 8;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const TRADE_TYPE_OPTIONS: readonly Option<TradeType>[] = [
  { id: 'sales', label: '매출처' },
  { id: 'purchase', label: '매입처' },
  { id: 'both', label: '매입매출' },
];

export const TAX_TYPE_OPTIONS: readonly Option<TaxType>[] = [
  { id: 'general', label: '일반과세' },
  { id: 'simplified', label: '간이과세' },
  { id: 'exempt', label: '면세' },
  { id: 'zero_rated', label: '영세율' },
];

export const CREDIT_GRADE_OPTIONS: readonly Option<CreditGrade>[] = [
  { id: 'A', label: 'A (우량)' },
  { id: 'B', label: 'B (정상)' },
  { id: 'C', label: 'C (주의)' },
  { id: 'D', label: 'D (불량)' },
];

export const PAYMENT_TERM_OPTIONS: readonly Option<PaymentTerm>[] = [
  { id: 'cash', label: '현금' },
  { id: 'eom', label: '말일결제' },
  { id: 'net_30', label: 'Net-30' },
  { id: 'net_60', label: 'Net-60' },
  { id: 'next_eom', label: '익월말' },
];

const label = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

export const tradeTypeLabel = (value: TradeType): string => label(TRADE_TYPE_OPTIONS, value);
export const taxTypeLabel = (value: TaxType): string => label(TAX_TYPE_OPTIONS, value);
export const paymentTermLabel = (value: PaymentTerm): string => label(PAYMENT_TERM_OPTIONS, value);
export const creditGradeLabel = (value: CreditGrade): string => label(CREDIT_GRADE_OPTIONS, value);

export function tradeTypeTone(value: TradeType): StatusTone {
  if (value === 'sales') return 'info';
  if (value === 'purchase') return 'warning';
  return 'success';
}

/** 신용등급 배지 색 — A 진해질수록 위험 */
export function creditGradeTone(value: CreditGrade): StatusTone {
  if (value === 'A') return 'success';
  if (value === 'B') return 'info';
  if (value === 'C') return 'warning';
  return 'danger';
}

/** 대표담당자 — 없으면 첫 담당자, 그것도 없으면 undefined */
export function primaryContact(account: Account): AccountContact | undefined {
  return account.contacts.find((contact) => contact.primary) ?? account.contacts[0];
}

export const TRADE_FILTER_ALL = 'all';
export type TradeFilter = typeof TRADE_FILTER_ALL | TradeType;

/** 거래유형 필터('전체'면 전체) */
export function filterAccounts(list: readonly Account[], filter: TradeFilter): readonly Account[] {
  if (filter === TRADE_FILTER_ALL) return list;
  return list.filter((account) => account.tradeType === filter);
}

/** 상호·사업자번호·대표자 검색(대소문자 무시) */
export function searchAccounts(list: readonly Account[], keyword: string): readonly Account[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  const digits = needle.replace(/\D/g, '');
  return list.filter(
    (account) =>
      account.name.toLowerCase().includes(needle) ||
      account.ceoName.toLowerCase().includes(needle) ||
      (digits !== '' && account.bizNo.replace(/\D/g, '').includes(digits)),
  );
}

/** 상호 오름차순(가나다). 테스트가 직접 부른다. */
export function sortAccounts(list: readonly Account[]): readonly Account[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** 항목 → 쓰기 입력(id 제외). 목록 인라인 토글과 폼이 함께 쓴다. */
export function toAccountInput(account: Account): AccountInput {
  return {
    name: account.name,
    bizNo: account.bizNo,
    ceoName: account.ceoName,
    bizType: account.bizType,
    bizItem: account.bizItem,
    tradeType: account.tradeType,
    taxType: account.taxType,
    creditGrade: account.creditGrade,
    creditLimit: account.creditLimit,
    paymentTerm: account.paymentTerm,
    address: account.address,
    phone: account.phone,
    contacts: account.contacts,
    active: account.active,
    lastTradeAt: account.lastTradeAt,
    note: account.note,
  };
}
