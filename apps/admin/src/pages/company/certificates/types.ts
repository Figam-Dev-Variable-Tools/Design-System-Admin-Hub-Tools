// 인증서/특허 화면 전용 타입 + 순수 규칙
import type { StatusTone } from '../../../shared/ui';

export type CertKind = 'certificate' | 'patent';

export interface CertItem {
  readonly id: string;
  readonly name: string;
  /** 발급기관 */
  readonly issuer: string;
  /** 발급일 'YYYY-MM-DD' */
  readonly issuedOn: string;
  readonly kind: CertKind;
  readonly imageUrl: string;
}

export interface CertInput {
  readonly name: string;
  readonly issuer: string;
  readonly issuedOn: string;
  readonly kind: CertKind;
  readonly imageUrl: string;
}

interface KindOption {
  readonly id: CertKind;
  readonly label: string;
}

export const CERT_KIND_OPTIONS: readonly KindOption[] = [
  { id: 'certificate', label: '인증서' },
  { id: 'patent', label: '특허' },
];

export function certKindLabel(kind: CertKind): string {
  return kind === 'patent' ? '특허' : '인증서';
}

/** 구분의 색 의도 — 인증서=info, 특허=success */
export function certKindTone(kind: CertKind): StatusTone {
  return kind === 'patent' ? 'success' : 'info';
}

/** 발급일 내림차순(최근이 위). 같은 날짜는 id 로 안정 정렬. **테스트가 직접 부른다.** */
export function sortCertificates(list: readonly CertItem[]): readonly CertItem[] {
  return [...list].sort((a, b) => {
    if (a.issuedOn !== b.issuedOn) return a.issuedOn < b.issuedOn ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/* ── 구분 필터 ───────────────────────────────────────────────────────────── */

export const CERT_FILTER_ALL = 'all';
export type CertFilter = typeof CERT_FILTER_ALL | CertKind;

/** 구분 필터 적용. **테스트가 이 순수 함수를 직접 부른다.** */
export function filterCertificates(
  list: readonly CertItem[],
  filter: CertFilter,
): readonly CertItem[] {
  if (filter === CERT_FILTER_ALL) return list;
  return list.filter((item) => item.kind === filter);
}

export const NAME_MAX_LENGTH = 100;
export const ISSUER_MAX_LENGTH = 100;
