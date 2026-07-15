// 계약 도메인 타입 · 순수 규칙 · 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/sales/**)
//
// 국내 ERP 계약관리 관례: 계약유형·기간·금액(부가세 포함/별도)·자동갱신(통지기한)·상태 흐름
// (초안→검토→진행→만료/해지)·전자서명 흐름(미발송→서명대기→일부서명→서명완료)·첨부.
import type { StatusTone } from '../../../shared/ui';

export type ContractType = 'supply' | 'service' | 'maintenance' | 'license' | 'lease' | 'nda';
/** 계약 상태 — 초안→검토→진행중, 종료는 만료/해지 */
export type ContractStatus = 'draft' | 'review' | 'active' | 'expired' | 'terminated';
/** 전자서명 흐름 */
export type SignStatus = 'unsigned' | 'sent' | 'partial' | 'signed';

export interface Contract {
  readonly id: string;
  readonly title: string;
  /** 거래처명 — FE 전용이라 이름 문자열로 보관(연동 시 거래처 FK) */
  readonly accountName: string;
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
  };
}
