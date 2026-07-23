// 계약 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 국내 ERP 계약관리 관례: 계약유형·기간·금액(부가세 포함/별도)·자동갱신(통지기한)·상태 흐름
// (초안→검토→진행→만료/해지)·전자서명 흐름(미발송→서명대기→일부서명→서명완료)·첨부.
import type { StatusTone } from '../../../shared/ui';
import type { AccountRef } from '../_shared/account-reference';
import { addDays, computeTotals, isOrderedQuote } from '../quotes/types';
import type { Quote, QuoteStatus } from '../quotes/types';

export type ContractType = 'supply' | 'service' | 'maintenance' | 'license' | 'lease' | 'nda';
/** 계약 상태 — 초안→검토→진행중, 종료는 만료/해지 */
export type ContractStatus = 'draft' | 'review' | 'active' | 'expired' | 'terminated';
/** 전자서명 흐름 */
export type SignStatus = 'unsigned' | 'sent' | 'partial' | 'signed';

/**
 * 계약.
 *
 * 거래처는 AccountRef 두 필드로 참조한다 — `accountId`(마스터를 가리키는 **정본**, '' 이면 미등록)
 * 와 `accountName`(저장 시점의 비정규화 표시 라벨). 왜 둘 다 드는지·어느 쪽이 이기는지는
 * ../_shared/account-reference 머리말에 한 곳으로 적혀 있다. 예전에는 `accountName` 문자열
 * 하나뿐이었고, 그래서 오타가 거래처를 쪼개고 역방향 조회가 아예 불가능했다.
 */
export interface Contract extends AccountRef {
  readonly id: string;
  readonly title: string;
  readonly contractType: ContractType;
  readonly startAt: string;
  readonly endAt: string;
  /** 계약금액(원) */
  readonly amount: number;
  /** 부가세 포함 금액이면 true, 별도면 false */
  readonly vatIncluded: boolean;
  readonly autoRenew: boolean;
  /** 갱신 통지기한(일) — 만료 N일 전. autoRenew 일 때 의미 있음 */
  readonly renewNoticeDays: number;
  readonly status: ContractStatus;
  readonly signStatus: SignStatus;
  readonly ownerName: string;
  /** 첨부 — 계약서 스캔 이미지(data/object URL) */
  readonly attachments: readonly string[];
  /** 주요 조항 요약 */
  readonly terms: string;
  readonly note: string;
  /**
   * 이 계약을 낳은 견적 id — '' 면 견적 없이 맺은 계약.
   *
   * [문서에는 있고 코드에는 없던 화살표] `docs/flow/mmd/03-sales-pipeline.mmd` 는 견적 → 계약을
   * 그려 두었지만 계약에는 견적을 가리키는 필드가 한 칸도 없었다. 그래서 '이 계약이 얼마짜리
   * 견적에서 나왔는가' 를 앱이 답하지 못했고, 수주 전환된 견적은 그 다음이 없는 종점이었다.
   */
  readonly quoteId: string;
  /** 원 견적번호(승계 스냅숏 — 표시·역링크용) */
  readonly quoteNo: string;
}

export type ContractInput = Omit<Contract, 'id'>;

export const CONTRACT_TITLE_MAX = 80;
export const CONTRACT_TERMS_MAX = 1000;
export const CONTRACT_MAX_ATTACHMENTS = 5;

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const CONTRACT_TYPE_OPTIONS: readonly Option<ContractType>[] = [
  { id: 'supply', label: '공급계약' },
  { id: 'service', label: '용역계약' },
  { id: 'maintenance', label: '유지보수' },
  { id: 'license', label: '라이선스' },
  { id: 'lease', label: '임대' },
  { id: 'nda', label: '비밀유지(NDA)' },
];

export const CONTRACT_STATUS_OPTIONS: readonly Option<ContractStatus>[] = [
  { id: 'draft', label: '초안' },
  { id: 'review', label: '검토중' },
  { id: 'active', label: '진행중' },
  { id: 'expired', label: '만료' },
  { id: 'terminated', label: '해지' },
];

export const SIGN_STATUS_OPTIONS: readonly Option<SignStatus>[] = [
  { id: 'unsigned', label: '미발송' },
  { id: 'sent', label: '서명대기' },
  { id: 'partial', label: '일부서명' },
  { id: 'signed', label: '서명완료' },
];

const optionLabel = <T extends string>(options: readonly Option<T>[], id: T): string =>
  options.find((option) => option.id === id)?.label ?? id;

export const contractTypeLabel = (v: ContractType): string => optionLabel(CONTRACT_TYPE_OPTIONS, v);
export const signStatusLabel = (v: SignStatus): string => optionLabel(SIGN_STATUS_OPTIONS, v);

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

const STATUS_META: Record<ContractStatus, StatusMeta> = {
  draft: { label: '초안', tone: 'neutral' },
  review: { label: '검토중', tone: 'info' },
  active: { label: '진행중', tone: 'success' },
  expired: { label: '만료', tone: 'neutral' },
  terminated: { label: '해지', tone: 'danger' },
};

export function contractStatusMeta(status: ContractStatus): StatusMeta {
  return STATUS_META[status];
}

export function signStatusTone(status: SignStatus): StatusTone {
  if (status === 'signed') return 'success';
  if (status === 'partial') return 'warning';
  if (status === 'sent') return 'info';
  return 'neutral';
}

/** 종료일까지 남은 일수 — 오늘(today) 주입 가능(테스트). 만료 상태거나 날짜가 지나면 음수/0 */
export function daysRemaining(endAt: string, today: string): number {
  const end = new Date(`${endAt}T00:00:00`).getTime();
  const now = new Date(`${today}T00:00:00`).getTime();
  if (Number.isNaN(end) || Number.isNaN(now)) return 0;
  return Math.round((end - now) / (24 * 60 * 60 * 1000));
}

/** 만료 임박 여부 — 진행중이고 통지기한 이내 */
export function isRenewalDue(contract: Contract, today: string): boolean {
  if (contract.status !== 'active' || !contract.autoRenew) return false;
  const remaining = daysRemaining(contract.endAt, today);
  return remaining >= 0 && remaining <= contract.renewNoticeDays;
}

export const CONTRACT_FILTER_ALL = 'all';
export type ContractStatusFilter = typeof CONTRACT_FILTER_ALL | ContractStatus;

export function filterContracts(
  list: readonly Contract[],
  filter: ContractStatusFilter,
): readonly Contract[] {
  if (filter === CONTRACT_FILTER_ALL) return list;
  return list.filter((contract) => contract.status === filter);
}

export function searchContracts(list: readonly Contract[], keyword: string): readonly Contract[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (contract) =>
      contract.title.toLowerCase().includes(needle) ||
      contract.accountName.toLowerCase().includes(needle),
  );
}

/** 시작일 내림차순(최근이 위). 같은 날짜는 id 안정 정렬. 테스트가 직접 부른다. */
export function sortContracts(list: readonly Contract[]): readonly Contract[] {
  return [...list].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt < b.startAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function toContractInput(contract: Contract): ContractInput {
  return {
    title: contract.title,
    accountId: contract.accountId,
    accountName: contract.accountName,
    contractType: contract.contractType,
    startAt: contract.startAt,
    endAt: contract.endAt,
    amount: contract.amount,
    vatIncluded: contract.vatIncluded,
    autoRenew: contract.autoRenew,
    renewNoticeDays: contract.renewNoticeDays,
    status: contract.status,
    signStatus: contract.signStatus,
    ownerName: contract.ownerName,
    attachments: contract.attachments,
    terms: contract.terms,
    note: contract.note,
    quoteId: contract.quoteId,
    quoteNo: contract.quoteNo,
  };
}

/* ── 견적 → 계약 초안 ─────────────────────────────────────────────────────── */

export const CONTRACT_DRAFT_NOT_ACCEPTED =
  '고객이 승인한 견적만 계약으로 넘길 수 있어요. 견적 상세의 상태 관리에서 ‘승인’으로 바꾸세요.';
export const CONTRACT_DRAFT_DONE = '이미 계약이 만들어진 견적이에요.';

/** 기본 계약기간 — 1년(국내 관례). 초안의 출발값일 뿐 운영자가 폼에서 고친다 */
const CONTRACT_DEFAULT_DAYS = 365;

/**
 * 지금 이 견적으로 계약을 만들 수 없는 이유 — 만들 수 있으면 null.
 *
 * 버튼의 disabled 조건과 생성 경로의 거절이 **같은 술어**를 읽는다.
 *
 * [왜 `ordered` 가 아니라 `accepted` 가 문을 여나 — 순서가 뒤집혔다]
 * 예전에는 운영자가 '수주 전환' 을 먼저 누르고, 그 다음에 '계약 초안 만들기' 를 눌렀다. 한 사건
 * ('이 거래는 성사됐다')을 두 번 누르게 한 셈이라 한 번을 빠뜨리면 두 화면이 다른 사실을 말했다.
 * 이제 `ordered` 는 **계약이 만들어진 결과**다(../quotes/data-source 의 markQuoteOrdered). 그래서
 * 계약의 입구는 그 앞 칸인 '승인' 이다.
 *
 * [`ordered` 도 통과시킨다] 계약이 없는데 상태만 `ordered` 인 견적이 존재할 수 있다 — 되돌려
 * 쓰기만 성공하고 그 앞의 계약이 지워졌거나, 이 규칙 이전의 데이터다. 그때 문을 닫으면 그 견적은
 * 영원히 계약을 가질 수 없다(수동 등록이 막혀 있어 우회로가 없다). 막다른 골목을 만들지 않는다.
 */
export function contractDraftBlock(status: QuoteStatus, existingContractId: string): string | null {
  if (existingContractId !== '') return CONTRACT_DRAFT_DONE;
  if (status !== 'accepted' && !isOrderedQuote(status)) return CONTRACT_DRAFT_NOT_ACCEPTED;
  return null;
}

/**
 * 체결이 끝난 계약인가 — **프로젝트로 넘어갈 수 있는 계약의 단일 정의.**
 *
 * [‘계약 완료’ 라는 상태는 없다 — 무엇을 완료로 볼지 정한 근거]
 * 계약 상태 유니온은 `draft|review|active|expired|terminated` 이고 '완료' 가 없다. 없는 상태를
 * 함부로 만들지 않는다 — 상태를 하나 늘리면 목록 필터·배지·시드가 전부 그 칸을 다시 정의해야 하고,
 * 운영자가 말한 '계약 완료' 는 애초에 **새 칸이 아니라 이미 있는 두 사실의 교집합**이다:
 *   · `signStatus === 'signed'` — 도장이 찍혔다(계약이 성립했다)
 *   · `status === 'active'`     — 지금 효력이 있다(진행중)
 * 국내 실무의 '계약 완료' 는 '계약 체결 완료' 이지 '계약 종료' 가 아니다. 그래서 `expired`(만료)·
 * `terminated`(해지)는 완료가 아니라 **끝난** 것이고, 끝난 계약에서 프로젝트를 새로 시작하지 않는다.
 *
 * [막다른 골목이 아니다] 만료·해지로 넘어간 뒤에 프로젝트가 필요해지면 계약을 '진행중'으로 되돌릴
 * 수 있다(계약 수정은 막지 않았다 — 막은 것은 생성뿐이다).
 */
export function isConcludedContract(status: ContractStatus, signStatus: SignStatus): boolean {
  return status === 'active' && signStatus === 'signed';
}

/**
 * 견적 → 계약 초안 입력(순수) — 무엇이 견적에서 넘어오는지의 단일 정의.
 *
 * 금액은 견적 **합계**(공급가액 + 세액)를 그대로 옮기므로 `vatIncluded` 는 과세 견적일 때만
 * 참이다: 면세·영세율 견적의 합계에는 애초에 세액이 없어서 '부가세 포함'이라고 적으면 거짓이 된다.
 * 기간·조항·담당자는 승계 대상이 아니다(견적은 그 정보를 갖지 않는다) — 초안에서 사람이 채운다.
 */
export function buildContractFromQuote(quote: Quote, today: string): ContractInput {
  return {
    title: `${quote.quoteNo} 기준 계약`,
    accountId: quote.accountId,
    accountName: quote.accountName,
    contractType: 'supply',
    startAt: today,
    endAt: addDays(today, CONTRACT_DEFAULT_DAYS),
    amount: computeTotals(quote.items, quote.taxMode).total,
    vatIncluded: quote.taxMode === 'standard',
    autoRenew: false,
    renewNoticeDays: 0,
    // 초안이다 — 검토·진행은 사람이 올린다.
    status: 'draft',
    signStatus: 'unsigned',
    ownerName: '',
    attachments: [],
    terms: '',
    note: '',
    quoteId: quote.id,
    quoteNo: quote.quoteNo,
  };
}
