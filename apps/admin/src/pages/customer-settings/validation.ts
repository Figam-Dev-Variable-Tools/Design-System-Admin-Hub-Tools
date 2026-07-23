// 등급 정책 검증 규칙 (ADR-0008 §7.3 집행)
//
// **저장을 막는 규칙의 정본은 이 zod 스키마다.**
//
// 진입점은 `zod/mini` 다 (ADR-0008 §7.3 — classic zod +17.5 kB vs mini +4.6 kB).
//
// ─────────────────────────────────────────────────────────────────────────────
// [경고(warning)가 왜 스키마 밖에 있는가 — 이 경계는 의도된 것이다]
//
// zod 에는 **에러 채널밖에 없다.** 이슈를 만들면 그것은 곧 `safeParse` 실패이고, 저장이 막힌다.
// 그런데 이 화면의 '할인율 역전'은 **저장을 막지 않는 경고**다 (정책상 가능한 값이다).
// 이것을 스키마에 넣으면 지금까지 저장되던 정책이 **저장 거부**로 바뀐다 = 동작 변경이다.
//
// 그래서 경계를 이렇게 그었다:
//   - **에러(저장 거부)** → zod 스키마 (`tierPolicySchema`)  ← 규칙의 정본
//   - **경고(저장 허용)** → `policyWarnings()`               ← zod 가 표현할 수 없는 축
// ─────────────────────────────────────────────────────────────────────────────
//
// [등급이 셋이 아니게 되면서 늘어난 규칙 두 가지]
//   ④ 기본 제공 등급 3종은 목록에서 사라질 수 없다 — 회원이 그 id 를 들고 있다(고아 참조).
//   ⑤ 승급 조건은 등급마다 **달라야 한다** — 같으면 어느 등급이 위인지 정해지지 않는다.
//      (등급의 서열은 저장된 순번이 아니라 승급 조건에서 파생된다 — types.ts 의 sortTiersByThreshold)
import * as z from 'zod/mini';

import { TIER_LABEL } from '../../shared/domain/member';
// 의존 방향은 한쪽뿐이다: validation → types. types 는 validation 을 import 하지 않는다
// (반대로 물리면 import-x/no-cycle 이 error 로 막는다 — ADR-0008 §4.2).
import {
  amountOf,
  BUILT_IN_TIER_ORDER,
  discountFieldOf,
  DISCOUNT_MAX,
  errorsOf,
  parsePercent,
  sortTiersByThreshold,
  thresholdFieldOf,
  withThousandSeparator,
} from './types';
import type {
  IssueTarget,
  PolicyDraft,
  PolicyIssue,
  PolicyValidation,
  TierDraftRow,
  TierRow,
} from './types';

/** 한 등급의 입력 행 — 값의 의미 검증은 아래 스키마가 한다 */
const rowSchema = z.object({
  id: z.string(),
  label: z.string(),
  system: z.boolean(),
  threshold: z.string(),
  discount: z.string(),
});

function labelOf(row: TierDraftRow): string {
  return row.label.trim() === '' ? '이름 없는 등급' : row.label.trim();
}

/**
 * 저장을 막는 규칙 전부.
 *
 * 이슈의 `path` 는 화면의 필드 id (`${tierId}-threshold` / `${tierId}-discount`) 와 1:1 이다 —
 * 그래야 표 안의 어느 칸이 틀렸는지 인라인으로 짚을 수 있다. 어느 칸에도 붙지 않는 이슈는
 * path 를 비워 'policy' 로 모인다(카드 하단 배너).
 */
/** 한 규칙이 만들어 낸 이슈 — zod ctx 로 옮겨지기 전의 중립 표현 */
interface RuleIssue {
  /** 붙일 필드 id. 어느 칸에도 붙지 않으면 null → 'policy' 로 모인다 */
  readonly field: IssueTarget | null;
  readonly input: string;
  readonly message: string;
}

/** ④ 기본 제공 등급은 목록에서 사라질 수 없다 — 회원이 그 id 를 들고 있다(고아 참조) */
function missingBuiltIns(rows: readonly TierDraftRow[]): readonly RuleIssue[] {
  return BUILT_IN_TIER_ORDER.filter((builtIn) => !rows.some((row) => row.id === builtIn)).map(
    (builtIn) => ({
      field: null,
      input: builtIn,
      message: `기본 제공 등급 '${TIER_LABEL[builtIn]}' 이(가) 목록에 없어요. 이 등급을 쓰는 회원이 존재하므로 지울 수 없어요.`,
    }),
  );
}

/** 한 행의 값 — 이름이 비었는가 · 금액이 정수인가 · 할인율이 0~100 인가 */
function rowValueIssues(row: TierDraftRow): readonly RuleIssue[] {
  const issues: RuleIssue[] = [];

  if (row.label.trim() === '') {
    issues.push({
      field: null,
      input: row.label,
      message: '이름이 비어 있는 등급이 있어요. 등급 이름을 입력하세요.',
    });
  }
  if (amountOf(row) === null) {
    issues.push({
      field: thresholdFieldOf(row.id),
      input: row.threshold,
      message: `${labelOf(row)} 승급 조건은 0 이상의 정수(원)로 입력하세요.`,
    });
  }
  if (parsePercent(row.discount) === null) {
    issues.push({
      field: discountFieldOf(row.id),
      input: row.discount,
      message: `${labelOf(row)} 할인율은 0~${String(DISCOUNT_MAX)} 사이의 정수(%)로 입력하세요.`,
    });
  }

  return issues;
}

/**
 * 기본 제공 등급의 서열은 고정이다 — 일반회원 < VIP < VVIP.
 *
 * 승급 조건이 그 순서를 뒤집으면 화면의 이름과 실제 서열이 어긋난다('VVIP 승급 시' 쿠폰이 VIP
 * 보다 먼저 나간다). 한쪽이라도 파싱되지 않으면 비교하지 않는다(이미 위에서 에러가 붙었다).
 */
function builtInOrderIssues(rows: readonly TierDraftRow[]): readonly RuleIssue[] {
  const issues: RuleIssue[] = [];

  for (let i = 1; i < BUILT_IN_TIER_ORDER.length; i += 1) {
    const lower = rows.find((row) => row.id === BUILT_IN_TIER_ORDER[i - 1]);
    const upper = rows.find((row) => row.id === BUILT_IN_TIER_ORDER[i]);
    if (lower === undefined || upper === undefined) continue;

    const lowerAmount = amountOf(lower);
    const upperAmount = amountOf(upper);
    if (lowerAmount === null || upperAmount === null || upperAmount > lowerAmount) continue;

    issues.push({
      field: thresholdFieldOf(upper.id),
      input: upper.threshold,
      message: `${labelOf(upper)} 승급 조건(${withThousandSeparator(upperAmount)}원)은 ${labelOf(
        lower,
      )} 승급 조건(${withThousandSeparator(lowerAmount)}원)보다 커야 해요.`,
    });
  }

  return issues;
}

/** ⑤ 승급 조건이 겹치면 서열이 정해지지 않는다 — 뒤에 나온 쪽에 이슈를 붙인다 */
function duplicateThresholdIssues(rows: readonly TierDraftRow[]): readonly RuleIssue[] {
  const issues: RuleIssue[] = [];
  const seen = new Map<number, TierDraftRow>();

  for (const row of rows) {
    const amount = amountOf(row);
    if (amount === null) continue;

    const previous = seen.get(amount);
    if (previous === undefined) {
      seen.set(amount, row);
      continue;
    }

    issues.push({
      field: thresholdFieldOf(row.id),
      input: row.threshold,
      message: `${labelOf(row)} 승급 조건(${withThousandSeparator(amount)}원)이 ${labelOf(
        previous,
      )} 과(와) 같아요. 등급마다 다른 금액이어야 어느 등급이 위인지 정해져요.`,
    });
  }

  return issues;
}

const tierPolicySchema = z
  .object({
    rows: z.array(rowSchema),
    period: z.enum(['all', 'last-12m', 'last-6m']),
    allowDemotion: z.boolean(),
    recalcTrigger: z.enum(['order-completed', 'daily', 'monthly']),
  })
  .check((ctx) => {
    const rows: readonly TierDraftRow[] = ctx.value.rows;

    const found = [
      ...missingBuiltIns(rows),
      ...rows.flatMap(rowValueIssues),
      ...builtInOrderIssues(rows),
      ...duplicateThresholdIssues(rows),
    ];

    for (const issue of found) {
      ctx.issues.push({
        code: 'custom',
        input: issue.input,
        path: issue.field === null ? [] : [issue.field],
        message: issue.message,
      });
    }
  });

/**
 * 경고 — **저장을 막지 않는다. 다만 조용히 넘기지도 않는다.**
 * 등급이 올라가는데 할인율이 작아지는 것은 정책상 가능하지만 대개 실수다.
 * 비교 순서는 승급 조건 오름차순이다 — 추가된 등급도 그 사이에 끼어 함께 검사된다.
 */
function policyWarnings(draft: PolicyDraft): readonly PolicyIssue[] {
  const warnings: PolicyIssue[] = [];

  const ordered = [...draft.rows]
    .map((row) => ({ row, amount: amountOf(row), discount: parsePercent(row.discount) }))
    .filter((entry) => entry.amount !== null && entry.discount !== null)
    .sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));

  for (let i = 1; i < ordered.length; i += 1) {
    const lower = ordered[i - 1];
    const upper = ordered[i];
    if (lower === undefined || upper === undefined) continue;
    if ((upper.discount ?? 0) >= (lower.discount ?? 0)) continue;

    warnings.push({
      target: 'policy',
      severity: 'warning',
      message: `${labelOf(upper.row)} 할인율(${String(upper.discount ?? 0)}%)이 ${labelOf(
        lower.row,
      )} 할인율(${String(
        lower.discount ?? 0,
      )}%)보다 낮아요. 등급이 올라가는데 혜택이 줄어들어요 — 의도한 정책인지 확인하세요.`,
    });
  }

  return warnings;
}

/**
 * 초안 → 정책 + 이슈 목록. **화면이 부르는 유일한 검증 진입점이다.**
 *
 * 규칙은 여기서 판정하지 않는다 — `tierPolicySchema`(에러)와 `policyWarnings`(경고)가 판정하고,
 * 이 함수는 그 결과를 화면이 쓰는 모양(PolicyIssue[])으로 **옮기기만** 한다.
 * 에러가 하나라도 있으면 policy 는 null 이고, 화면은 저장을 거부한다.
 */
export function validateDraft(draft: PolicyDraft): PolicyValidation {
  const parsed = tierPolicySchema.safeParse(draft);

  // zod 이슈의 path[0] 이 곧 화면의 필드 id 다 (스키마가 그렇게 싣는다). 비어 있으면 'policy'.
  const errors: PolicyIssue[] = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        target: (issue.path[0] ?? 'policy') as IssueTarget,
        severity: 'error' as const,
        message: issue.message,
      }));

  const issues: readonly PolicyIssue[] = [...errors, ...policyWarnings(draft)];

  const tiers = buildTiers(draft);
  const blocked = errorsOf(issues).length > 0;

  return {
    policy:
      blocked || tiers === null
        ? null
        : {
            tiers,
            period: draft.period,
            allowDemotion: draft.allowDemotion,
            recalcTrigger: draft.recalcTrigger,
          },
    issues,
  };
}

/**
 * 검증을 통과한 초안 → 등급 목록(승급 조건 오름차순).
 * 규칙은 스키마가 이미 강제했다 — 여기서는 값을 옮기고 **순서를 파생**시키기만 한다.
 */
function buildTiers(draft: PolicyDraft): readonly TierRow[] | null {
  const tiers: TierRow[] = [];

  for (const row of draft.rows) {
    const threshold = amountOf(row);
    const discountPercent = parsePercent(row.discount);
    if (threshold === null || discountPercent === null) return null;
    tiers.push({
      id: row.id,
      label: row.label.trim(),
      system: row.system,
      threshold,
      discountPercent,
    });
  }

  return sortTiersByThreshold(tiers);
}
