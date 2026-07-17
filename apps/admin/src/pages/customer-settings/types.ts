// 고객 설정(회원 등급 정책) 도메인 모델
//
// [등급의 SSOT] 등급 개념(MemberTier / TIER_LABEL)은 shared/domain/member.ts 가 갖는다.
// 이 파일은 그 등급에 **정책(승급 조건·할인율·산정 기준)** 을 얹을 뿐, 등급을 새로 정의하지 않는다.
//
// [검증의 자리] 규칙은 화면(입력 컨트롤)이 아니라 **모델**이 강제한다.
// - 입력을 막지 않는다(타이핑 중에는 무엇이든 들어올 수 있다).
// - 제출 시점에 validateDraft() 가 초안을 검사해 TierPolicy 를 만들어 준다.
//   에러가 하나라도 있으면 policy 는 null 이고, 화면은 저장을 거부한다.
// 이렇게 두면 같은 규칙이 화면 세 곳에 흩어지지 않고, 백엔드가 붙어도 그대로 계약 검증에 쓰인다.
import type { MemberTier } from '../../shared/domain/member';

/** 낮은 등급 → 높은 등급. 승급 조건의 단조 증가 검사와 분포 계산이 이 순서를 쓴다 */
export const TIER_ORDER: readonly MemberTier[] = ['normal', 'vip', 'vvip'];

/** 등급의 서열 — 승급/강등 판정에 쓴다 (일반 0 < VIP 1 < VVIP 2) */
export function rankOf(tier: MemberTier): number {
  const index = TIER_ORDER.indexOf(tier);
  return index < 0 ? 0 : index;
}

/** 일반회원은 기본 등급이다 — 승급 조건이 없다(항상 0원). 모델이 이 값을 강제한다 */
export const BASE_TIER: MemberTier = 'normal';

export const DISCOUNT_MAX = 100;

/* ── 정책 모델 ───────────────────────────────────────────────────────────── */

interface TierRule {
  /** 승급 조건 — 누적 구매금액(원). 0 이상 정수 */
  readonly threshold: number;
  /** 할인율 — 0~100 정수(%) */
  readonly discountPercent: number;
}

export type TierRules = Readonly<Record<MemberTier, TierRule>>;

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
  readonly rules: TierRules;
  readonly period: AggregationPeriod;
  /** true 면 조건 미달 시 등급이 내려간다. false 면 한 번 오른 등급은 유지된다 */
  readonly allowDemotion: boolean;
  readonly recalcTrigger: RecalcTrigger;
}

/* ── 폼 초안 ─────────────────────────────────────────────────────────────── */
//
// 화면의 입력은 문자열이다 — 지우는 중('')이거나, blur 로 포맷된 상태('1,000,000')일 수 있다.
// 그래서 폼 상태는 TierPolicy 가 아니라 아래 초안(Draft)이고, 모델이 이것을 정책으로 승격시킨다.

export interface TierDraftRow {
  readonly threshold: string;
  readonly discount: string;
}

export type TierDraftRows = Readonly<Record<MemberTier, TierDraftRow>>;

export interface PolicyDraft {
  readonly rows: TierDraftRows;
  readonly period: AggregationPeriod;
  readonly allowDemotion: boolean;
  readonly recalcTrigger: RecalcTrigger;
}

/** 천 단위 구분 — 표시용. 입력 중에는 쓰지 않고 blur 시에만 적용한다 */
export function withThousandSeparator(value: number): string {
  return value.toLocaleString('ko-KR');
}

export function draftFromPolicy(policy: TierPolicy): PolicyDraft {
  const rows = {
    normal: rowOf(policy.rules.normal),
    vip: rowOf(policy.rules.vip),
    vvip: rowOf(policy.rules.vvip),
  };
  return {
    rows,
    period: policy.period,
    allowDemotion: policy.allowDemotion,
    recalcTrigger: policy.recalcTrigger,
  };
}

function rowOf(rule: TierRule): TierDraftRow {
  return {
    threshold: withThousandSeparator(rule.threshold),
    discount: String(rule.discountPercent),
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
export function parseAmount(raw: string): number | null {
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

/* ── 검증 ────────────────────────────────────────────────────────────────── */

type PolicyFieldId = `${MemberTier}-threshold` | `${MemberTier}-discount`;

/** 특정 입력에 붙지 않는 이슈(등급 간 관계 등)는 'policy' 로 모은다 */
export type IssueTarget = PolicyFieldId | 'policy';

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
// 예전에는 이 파일이 validateDraft() 안에 if 문으로 규칙을 들고 있었다 — zod 스키마로 옮기고 지웠다.
// 이 파일에 남은 것은 **모델과 파서**뿐이다 (규칙이 아니라 값의 표현).

/**
 * 변경 감지용 정규화 문자열.
 *
 * blur 포맷('1000000' → '1,000,000')만으로 '변경됨'이 되면 안 된다 — 값을 파싱해서 비교한다.
 * 파싱되지 않는 원문은 그대로 실어 보내 '잘못된 값으로 바뀐 상태'도 변경으로 잡는다.
 */
export function serializeDraft(draft: PolicyDraft): string {
  const rows = TIER_ORDER.map((tier) => {
    const row = draft.rows[tier];
    const threshold = tier === BASE_TIER ? 0 : parseAmount(row.threshold);
    const discount = parsePercent(row.discount);
    return {
      tier,
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
