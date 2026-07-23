// 고객 설정(회원 등급 정책) 도메인 모델
//
// [등급의 SSOT — 두 겹이다]
//   - 기본 제공 등급 3종(일반회원/VIP/VVIP)의 **id 와 라벨**은 shared/domain/member.ts 가 갖는다.
//     회원이 들고 있는 참조(member.tier)가 그 유니온이고, 회원 목록·CSV·쿠폰 발급 기준이 그
//     라벨을 그대로 읽는다. 그래서 여기서 그 셋의 이름을 바꾸지 않는다(잠근다).
//   - 그 위에 **운영자가 추가한 등급**이 얹힌다. 추가된 등급은 id 가 생성값이고 이름을 고칠 수 있다.
// 두 종류를 한 목록(TierRow[])으로 다루되, 잠금 여부는 `system` 한 칸이 말한다 —
// 권한 관리의 시스템 역할(슈퍼어드민)이 같은 개념을 같은 이름으로 이미 쓰고 있다(roles.ts).
//
// [참조는 이름이 아니라 id 다] 회원의 등급도, 쿠폰의 '승급 시' 트리거도 id 를 든다. 그래서 추가한
// 등급의 **이름을 바꿔도 그 등급을 든 회원은 따라온다** — 이름 참조였다면 개명이 곧 고아 참조다.
//
// [검증의 자리] 규칙은 화면(입력 컨트롤)이 아니라 **모델**이 강제한다.
// - 입력을 막지 않는다(타이핑 중에는 무엇이든 들어올 수 있다).
// - 제출 시점에 validateDraft() 가 초안을 검사해 TierPolicy 를 만들어 준다.
//   에러가 하나라도 있으면 policy 는 null 이고, 화면은 저장을 거부한다.
import { formatNumber } from '../../shared/format';
import type { MemberTier } from '../../shared/domain/member';

/** 기본 제공 등급의 정해진 서열(낮은 → 높은). 이 순서가 뒤집히면 저장을 막는다 */
export const BUILT_IN_TIER_ORDER: readonly MemberTier[] = ['normal', 'vip', 'vvip'];

/**
 * 이 id 가 기본 제공 등급인가 — 타입 가드다(캐스팅으로 우기지 않는다).
 *
 * 쿠폰의 '승급 시' 트리거처럼 아직 `MemberTier`(닫힌 유니온)만 받는 소비처가 있어서, 등급 목록을
 * 도는 화면이 '이 등급은 그쪽이 아는 등급인가' 를 물어야 한다.
 */
export function isBuiltInTierId(id: string): id is MemberTier {
  return BUILT_IN_TIER_ORDER.some((tier) => tier === id);
}

/** 일반회원은 기본 등급이다 — 승급 조건이 없다(항상 0원). 모델이 이 값을 강제한다 */
export const BASE_TIER: MemberTier = 'normal';

export const DISCOUNT_MAX = 100;

export const TIER_LABEL_MAX = 20;

/** 추가한 등급의 id — 역할 id(createRoleId)와 같은 관례. 사람이 정하지 않는다(개명이 자유롭도록) */
function createTierId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `tier-${Date.now().toString(36)}-${random}`;
}

/* ── 정책 모델 ───────────────────────────────────────────────────────────── */

/**
 * 등급 한 줄 — 기본 제공 등급과 추가한 등급이 같은 모양이다.
 *
 * [왜 Record<MemberTier, …> 를 버렸나] 예전 모델은 `rules: Record<MemberTier, TierRule>` 이었다.
 * 그 타입은 '등급은 정확히 셋' 을 **타입으로** 못 박는다 — 등급을 추가할 자리가 없다.
 */
export interface TierRow {
  /** 회원이 들고 있는 참조값. 기본 제공 등급이면 'normal' | 'vip' | 'vvip' */
  readonly id: string;
  readonly label: string;
  /** 기본 제공 등급 — 이름 변경·삭제 불가(라벨의 정본이 shared/domain/member.ts 이기 때문) */
  readonly system: boolean;
  /** 승급 조건 — 누적 구매금액(원). 0 이상 정수. 기본 등급은 항상 0 */
  readonly threshold: number;
  /** 할인율 — 0~100 정수(%) */
  readonly discountPercent: number;
}

/** 집계 기간 — 누적 구매금액을 어느 구간에서 합산할지 */
export type AggregationPeriod = 'all' | 'last-12m' | 'last-6m';

export const PERIOD_OPTIONS: readonly { readonly id: AggregationPeriod; readonly label: string }[] =
  [
    { id: 'all', label: '전체 기간' },
    { id: 'last-12m', label: '최근 12개월' },
    { id: 'last-6m', label: '최근 6개월' },
  ];

/** 재계산 시점 — 등급을 다시 산정하는 트리거 */
export type RecalcTrigger = 'order-completed' | 'daily' | 'monthly';

export const RECALC_OPTIONS: readonly { readonly id: RecalcTrigger; readonly label: string }[] = [
  { id: 'order-completed', label: '주문 완료 시' },
  { id: 'daily', label: '매일 자정' },
  { id: 'monthly', label: '매월 1일' },
];

export interface TierPolicy {
  /** 낮은 등급 → 높은 등급. 정렬 기준은 승급 조건이며 검증이 그 순서를 강제한다 */
  readonly tiers: readonly TierRow[];
  readonly period: AggregationPeriod;
  /** true 면 조건 미달 시 등급이 내려간다. false 면 한 번 오른 등급은 유지된다 */
  readonly allowDemotion: boolean;
  readonly recalcTrigger: RecalcTrigger;
}

/**
 * 등급의 서열 — 승급/강등 판정에 쓴다. **저장하지 않는다**: 목록 순서에서 그때그때 읽는 파생값이다.
 * 목록에 없는 id 는 -1 이 아니라 null 이다 — '0번(기본 등급)' 으로 뭉개면 모르는 등급이 조용히
 * 일반회원이 된다.
 */
export function rankOf(tiers: readonly TierRow[], tierId: string): number | null {
  const index = tiers.findIndex((tier) => tier.id === tierId);
  return index < 0 ? null : index;
}

/* ── 폼 초안 ─────────────────────────────────────────────────────────────── */
//
// 화면의 입력은 문자열이다 — 지우는 중('')이거나, blur 로 포맷된 상태('1,000,000')일 수 있다.
// 그래서 폼 상태는 TierPolicy 가 아니라 아래 초안(Draft)이고, 모델이 이것을 정책으로 승격시킨다.

export interface TierDraftRow {
  readonly id: string;
  readonly label: string;
  readonly system: boolean;
  readonly threshold: string;
  readonly discount: string;
}

export interface PolicyDraft {
  /**
   * 표에 보이는 순서 그대로. **타이핑 중에 다시 정렬하지 않는다** — 금액을 한 자리 지울 때마다
   * 행이 위아래로 뛰면 편집할 수 없다. 정렬은 정책을 만들 때(=저장할 때) 한 번 한다.
   */
  readonly rows: readonly TierDraftRow[];
  readonly period: AggregationPeriod;
  readonly allowDemotion: boolean;
  readonly recalcTrigger: RecalcTrigger;
}

/** 천 단위 구분 — 표시용. 입력 중에는 쓰지 않고 blur 시에만 적용한다 */
export function withThousandSeparator(value: number): string {
  return value.toLocaleString('ko-KR');
}

export function draftFromPolicy(policy: TierPolicy): PolicyDraft {
  return {
    rows: policy.tiers.map((tier) => ({
      id: tier.id,
      label: tier.label,
      system: tier.system,
      threshold: withThousandSeparator(tier.threshold),
      discount: String(tier.discountPercent),
    })),
    period: policy.period,
    allowDemotion: policy.allowDemotion,
    recalcTrigger: policy.recalcTrigger,
  };
}

/** 입력 중 정제 — 숫자만 받는다(콤마·문자·부호 제거). 포맷은 blur 에서 한다 */
export function sanitizeDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** blur 포맷 — 값이 정수로 읽히면 천 단위 구분을 붙이고, 아니면 원문을 그대로 둔다(에러로 남긴다) */
export function formatAmountOnBlur(raw: string): string {
  const parsed = parseAmount(raw);
  return parsed === null ? raw.trim() : withThousandSeparator(parsed);
}

/** '1,000,000' / '1000000' → 1000000. 정수가 아니거나 비었으면 null */
function parseAmount(raw: string): number | null {
  const compact = raw.replace(/,/g, '').trim();
  if (compact === '' || !/^\d+$/.test(compact)) return null;
  const value = Number(compact);
  return Number.isSafeInteger(value) ? value : null;
}

/** '3' → 3. 0~100 정수가 아니면 null */
export function parsePercent(raw: string): number | null {
  const compact = raw.trim();
  if (compact === '' || !/^\d+$/.test(compact)) return null;
  const value = Number(compact);
  if (!Number.isSafeInteger(value) || value < 0 || value > DISCOUNT_MAX) return null;
  return value;
}

/** 기본 등급(일반회원)의 승급 조건은 입력과 무관하게 항상 0 이다 — 정책이 아니라 정의다 */
export function amountOf(row: TierDraftRow): number | null {
  return row.id === BASE_TIER ? 0 : parseAmount(row.threshold);
}

/* ── 등급 추가·수정·삭제 (초안 위의 순수 연산) ───────────────────────────────
 *
 * 세 연산 모두 **거부 사유 문자열**을 돌려준다 — boolean 이 아니다. 같은 문자열이 두 곳에서 쓰인다:
 * 화면이 버튼을 잠그며 다는 사유(title/aria-label)와, 연산이 거절하며 돌려주는 오류.
 * 두 곳에 따로 적으면 경합으로 거절됐을 때만 다른 문장이 뜬다 (roleDeletionBlock 과 같은 분담).
 */

export type TierMutationResult =
  | { readonly ok: true; readonly draft: PolicyDraft }
  | { readonly ok: false; readonly error: string };

/** 기본 제공 등급을 고칠 수 없는 이유 — 비활성 컨트롤의 title/aria-label 문구로도 쓴다 */
export const SYSTEM_TIER_REASON =
  '기본 제공 등급이라 이름 변경·삭제를 할 수 없어요. 회원 목록·회원 CSV·쿠폰 발급 기준이 이 이름과 id 를 그대로 읽어요. 승급 조건과 할인율은 수정할 수 있어요.';

/**
 * 등급 이름 검증 — 빈 값·길이·중복(대소문자 무시). 통과하면 null.
 * ignoreTierId 는 '수정' 에서 자기 자신을 중복 검사에서 빼기 위한 것이다.
 *
 * 기본 제공 등급의 이름과도 겹칠 수 없다 — 목록에 'VIP' 가 둘이면 어느 쪽이 회원의 등급인지
 * 화면에서 구분할 길이 없다.
 */
export function validateTierLabel(
  label: string,
  rows: readonly TierDraftRow[],
  ignoreTierId: string | null,
): string | null {
  const trimmed = label.trim();
  if (trimmed === '') return '등급 이름을 입력하세요.';
  if (trimmed.length > TIER_LABEL_MAX) {
    return `등급 이름은 ${String(TIER_LABEL_MAX)}자를 넘을 수 없어요.`;
  }

  const key = trimmed.toLocaleLowerCase();
  const duplicated = rows.some(
    (row) => row.id !== ignoreTierId && row.label.trim().toLocaleLowerCase() === key,
  );
  return duplicated ? '이미 같은 이름의 등급이 있어요.' : null;
}

/**
 * 등급 삭제를 막아야 하는 이유 — 없으면 null.
 *
 * `memberCount === null` 은 '0명' 이 아니라 **'확인 불가'** 다(조회기 미배선 —
 * shared/domain/member-tier-catalog.ts 머리말). 모르는 것을 '없음' 으로 읽으면 회원이 붙어 있는
 * 등급이 조용히 지워지고, 그 회원들의 등급은 존재하지 않는 id 를 가리키게 된다(고아 참조).
 */
export function tierDeletionBlock(row: TierDraftRow, memberCount: number | null): string | null {
  if (row.system) return `'${row.label}' 은(는) ${SYSTEM_TIER_REASON}`;
  if (memberCount === null) {
    return `'${row.label}' 등급을 쓰는 회원을 확인하지 못해 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.`;
  }
  if (memberCount > 0) {
    return `'${row.label}' 등급을 쓰는 회원이 ${formatNumber(memberCount)}명 있어 삭제할 수 없어요. 회원 관리(/users/members)에서 이 회원들의 등급을 먼저 바꾼 뒤 다시 삭제해 주세요.`;
  }
  return null;
}

/**
 * 등급 추가 — 이름만 받는다. 승급 조건·할인율은 만든 뒤 표에서 채운다.
 * (역할 추가가 '이름만 받고 권한은 전부 끈 채로 시작' 하는 것과 같은 관례 — RoleFormModal)
 *
 * 승급 조건을 비운 채로 만드는 이유: 여기서 아무 값이나 지어 넣으면 그 숫자가 정책이 된다.
 * 비어 있으면 저장이 막히고(검증), 화면이 '값을 채우라' 고 말한다 — 지어낸 값보다 낫다.
 */
export function addTier(draft: PolicyDraft, label: string): TierMutationResult {
  const invalid = validateTierLabel(label, draft.rows, null);
  if (invalid !== null) return { ok: false, error: invalid };

  const row: TierDraftRow = {
    id: createTierId(),
    label: label.trim(),
    system: false,
    threshold: '',
    discount: '0',
  };
  return { ok: true, draft: { ...draft, rows: [...draft.rows, row] } };
}

/** 등급 이름 수정 — 기본 제공 등급은 거절한다(같은 술어로 화면도 버튼을 잠근다) */
export function renameTier(draft: PolicyDraft, tierId: string, label: string): TierMutationResult {
  const target = draft.rows.find((row) => row.id === tierId);
  if (target === undefined) return { ok: false, error: '등급을 찾을 수 없어요.' };
  if (target.system) return { ok: false, error: `'${target.label}' 은(는) ${SYSTEM_TIER_REASON}` };

  const invalid = validateTierLabel(label, draft.rows, tierId);
  if (invalid !== null) return { ok: false, error: invalid };

  const trimmed = label.trim();
  return {
    ok: true,
    draft: {
      ...draft,
      rows: draft.rows.map((row) => (row.id === tierId ? { ...row, label: trimmed } : row)),
    },
  };
}

/**
 * 등급 삭제 — 참조 검사(그 등급을 쓰는 회원)를 통과해야 지운다.
 * 화면도 같은 `tierDeletionBlock` 으로 버튼을 미리 잠그지만, 거절의 책임은 이 함수가 진다.
 */
export function removeTier(
  draft: PolicyDraft,
  tierId: string,
  memberCount: number | null,
): TierMutationResult {
  const target = draft.rows.find((row) => row.id === tierId);
  if (target === undefined) return { ok: false, error: '등급을 찾을 수 없어요.' };

  const blocked = tierDeletionBlock(target, memberCount);
  if (blocked !== null) return { ok: false, error: blocked };

  return { ok: true, draft: { ...draft, rows: draft.rows.filter((row) => row.id !== tierId) } };
}

/* ── 검증 ────────────────────────────────────────────────────────────────── */

/** 특정 입력에 붙지 않는 이슈(등급 간 관계 등)는 'policy' 로 모은다 */
export type IssueTarget = `${string}-threshold` | `${string}-discount` | 'policy';

export function thresholdFieldOf(tierId: string): IssueTarget {
  return `${tierId}-threshold`;
}

export function discountFieldOf(tierId: string): IssueTarget {
  return `${tierId}-discount`;
}

/** error 는 저장을 막는다. warning 은 막지 않는다 — 정책상 가능하지만 의도치 않았을 값을 알린다 */
type IssueSeverity = 'error' | 'warning';

export interface PolicyIssue {
  readonly target: IssueTarget;
  readonly severity: IssueSeverity;
  readonly message: string;
}

export interface PolicyValidation {
  /** 에러가 하나라도 있으면 null — 저장할 수 없다는 뜻이다 */
  readonly policy: TierPolicy | null;
  readonly issues: readonly PolicyIssue[];
}

export function issuesFor(
  issues: readonly PolicyIssue[],
  target: IssueTarget,
): readonly PolicyIssue[] {
  return issues.filter((issue) => issue.target === target);
}

export function errorsOf(issues: readonly PolicyIssue[]): readonly PolicyIssue[] {
  return issues.filter((issue) => issue.severity === 'error');
}

export function warningsOf(issues: readonly PolicyIssue[]): readonly PolicyIssue[] {
  return issues.filter((issue) => issue.severity === 'warning');
}

// 검증 규칙(저장을 막는 에러 · 막지 않는 경고)은 **./validation.ts** 가 갖는다.

/**
 * 승급 조건 오름차순으로 세운 등급 목록 — 기본 등급(0원)이 늘 맨 앞이다.
 *
 * **파생값이라 저장하지 않는다**: 순서는 승급 조건이 결정하고, 승급 조건은 운영자가 정한다.
 * 별도의 'order' 칸을 두면 금액과 순서가 서로를 배신하는 상태가 저장될 수 있다.
 * 금액이 같은 등급이 있으면 순서가 정해지지 않는다 — 그건 검증이 에러로 막는다.
 */
export function sortTiersByThreshold(tiers: readonly TierRow[]): readonly TierRow[] {
  return [...tiers].sort((a, b) => a.threshold - b.threshold);
}

/**
 * 변경 감지용 정규화 문자열.
 *
 * blur 포맷('1000000' → '1,000,000')만으로 '변경됨'이 되면 안 된다 — 값을 파싱해서 비교한다.
 * 파싱되지 않는 원문은 그대로 실어 보내 '잘못된 값으로 바뀐 상태'도 변경으로 잡는다.
 * 이름·행의 존재 여부(추가/삭제)도 함께 실린다 — 이름만 바꾼 것도 저장할 것이 있는 변경이다.
 */
export function serializeDraft(draft: PolicyDraft): string {
  const rows = draft.rows.map((row) => {
    const threshold = amountOf(row);
    const discount = parsePercent(row.discount);
    return {
      id: row.id,
      label: row.label.trim(),
      threshold: threshold ?? `raw:${row.threshold.trim()}`,
      discount: discount ?? `raw:${row.discount.trim()}`,
    };
  });

  return JSON.stringify({
    rows,
    period: draft.period,
    allowDemotion: draft.allowDemotion,
    recalcTrigger: draft.recalcTrigger,
  });
}
