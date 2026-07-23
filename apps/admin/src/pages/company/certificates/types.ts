// 인증서/특허 화면 전용 타입 + 순수 규칙
import { objectParticle } from '../../../shared/format';
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
  /**
   * 정렬 순서 — 작을수록 위에 온다. **저장되는 값이지 파생값이 아니다.**
   *
   * 예전에는 이 화면에 순서 필드가 없었고 목록은 `발급일 내림차순`으로만 정렬됐다(sortCertificates).
   * 운영자가 손으로 순서를 바꿀 수 있게 되면 그 규칙과 **정면으로 충돌한다** — 위로 올린 행이
   * 다음 조회에서 발급일 자리로 되돌아가면 조작이 없던 일이 된다(no-op UI · FEEDBACK-03).
   * 그래서 **수동 순서가 이긴다**: 목록 조회는 order 오름차순이고, 발급일은 이제 정렬 규칙이 아니라
   * 그냥 표시되는 열이다. 발급일 내림차순은 딱 한 자리에만 남는다 — 아직 아무도 순서를 만지지 않은
   * **최초 배정**(seedCertOrder). 새로 등록한 항목은 발급일과 무관하게 맨 끝으로 간다(nextCertOrder).
   */
  readonly order: number;
}

/** 등록/수정 입력 — 정렬 순서는 목록의 드래그/이동 버튼이 관리하므로 폼에서 받지 않는다 */
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

/* ── 순서 ────────────────────────────────────────────────────────────────── */

/** id 와 발급일만 있으면 되는 것 — 시드(order 배정 전)와 CertItem 둘 다 받는다 */
interface Dated {
  readonly id: string;
  readonly issuedOn: string;
}

/**
 * 발급일 내림차순(최근이 위). 같은 날짜는 id 로 안정 정렬.
 *
 * **이제 목록 정렬이 아니다** — 순서 필드가 아직 없는 시드에 최초 order 를 매기는 데에만 쓴다
 * (CertItem.order 주석의 충돌 판단). **테스트가 직접 부른다.**
 */
export function byIssuedDateDesc<T extends Dated>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.issuedOn !== b.issuedOn) return a.issuedOn < b.issuedOn ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 최초 order 배정 — 발급일 내림차순으로 1..n. **테스트가 직접 부른다.** */
export function seedCertOrder(list: readonly Omit<CertItem, 'order'>[]): CertItem[] {
  return byIssuedDateDesc(list).map((item, index) => ({ ...item, order: index + 1 }));
}

/**
 * 목록의 정본 순서 — order 오름차순(같으면 id 안정 정렬).
 * 발급일은 여기에 관여하지 않는다. **테스트가 직접 부른다.**
 */
export function sortCertificates(list: readonly CertItem[]): readonly CertItem[] {
  return [...list].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * orderedIds 순서대로 재배치하고 order 를 1..n 으로 다시 매긴다.
 * 목록에 없는 id 는 무시하고, orderedIds 에 없는 항목은 자기 슬롯을 지킨다(로고 목록과 같은 규칙).
 * **테스트가 직접 부른다.**
 */
export function reorderCertificatesByIds(
  list: readonly CertItem[],
  orderedIds: readonly string[],
): CertItem[] {
  const byId = new Map(list.map((item) => [item.id, item]));
  const moved = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is CertItem => item !== undefined);
  const idSet = new Set(moved.map((item) => item.id));
  let cursor = 0;
  const next = list.map((item) => (idSet.has(item.id) ? (moved[cursor++] ?? item) : item));
  return next.map((item, index) => ({ ...item, order: index + 1 }));
}

/** 현재 최대 order + 1 (비면 1) — 새 항목은 맨 끝이다. **테스트가 직접 부른다.** */
export function nextCertOrder(list: readonly CertItem[]): number {
  return list.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

/**
 * 순서 변경을 **왜 못 하는지**. 가능하면 null.
 *
 * boolean 하나로 조용히 끄지 않는 이유: 손잡이와 이동 버튼이 그냥 사라지면 운영자는 '이 화면은
 * 순서를 못 바꾸는구나' 와 '지금 조건에서만 못 바꾸는구나' 를 구별할 수 없다. 문장으로 말한다.
 *
 * **화면과 저장이 같은 이 술어를 읽는다** — 버튼을 숨기기만 하고 저장 경로를 열어 두면 게이팅이
 * 아니라 장식이다(강등된 세션·필터를 건 뒤 남아 있던 드래그 모두 이 문을 지난다).
 */
export function certReorderRefusal({
  canUpdate,
  filtered,
  count,
}: {
  /** 이 라우트의 update 권한 — 순서 변경도 쓰기다 */
  readonly canUpdate: boolean;
  /** 구분 필터가 걸려 있는가 */
  readonly filtered: boolean;
  /** 지금 화면에 보이는 건수 */
  readonly count: number;
}): string | null {
  if (!canUpdate) return '인증서/특허 수정 권한이 없어 순서를 바꿀 수 없어요.';
  if (filtered) {
    return '구분 필터를 걸면 걸러진 일부만 보여 전체 순서를 알 수 없어요. 필터를 전체로 되돌린 뒤 순서를 바꾸세요.';
  }
  if (count < 2) return '인증서/특허가 2건 이상일 때 순서를 바꿀 수 있어요.';
  return null;
}

/**
 * 순서가 바뀐 사실을 한 문장으로 — 라이브 영역이 읽는다.
 *
 * 표에서 행이 한 칸 올라간 것은 **시각적 사실**이라 스크린리더에는 아무것도 전달되지 않는다.
 * movedId 는 훅이 알려 준 '이번에 움직인 행' 이다 — 배열 diff 로 추측하면 이웃 맞바꿈에서
 * 엉뚱한 행을 부른다(@tds/ui TableReorder 머리말). **테스트가 직접 부른다.**
 */
export function certOrderAnnouncement(
  list: readonly CertItem[],
  orderedIds: readonly string[],
  movedId: string,
): string | null {
  const moved = list.find((item) => item.id === movedId);
  const position = orderedIds.indexOf(movedId);
  if (moved === undefined || position < 0) return null;
  return `'${moved.name}'${objectParticle(moved.name)} ${orderedIds.length}건 중 ${position + 1}번째로 옮겼어요.`;
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
