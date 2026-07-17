// 등급 정책 검증 규칙 (ADR-0008 §7.3 집행)
//
// **저장을 막는 규칙의 정본은 이 zod 스키마다.** types.ts 안에 if 문으로 흩어져 있던
// 손코딩 검증기(승급 조건 파싱·할인율 범위·단조 증가 검사)는 삭제하고 여기로 옮겼다.
//
// 진입점은 `zod/mini` 다 (ADR-0008 §7.3 — classic zod +17.5 kB vs mini +4.6 kB).
//
// ─────────────────────────────────────────────────────────────────────────────
// [경고(warning)가 왜 스키마 밖에 있는가 — 이 경계는 의도된 것이다]
//
// zod 에는 **에러 채널밖에 없다.** 이슈를 만들면 그것은 곧 `safeParse` 실패이고, 저장이 막힌다.
// 그런데 이 화면의 '할인율 역전'은 **저장을 막지 않는 경고**다 (정책상 가능한 값이다 — types.ts §검증).
// 이것을 스키마에 넣으면 지금까지 저장되던 정책이 **저장 거부**로 바뀐다 = 동작 변경이다.
//
// 그래서 경계를 이렇게 그었다:
//   - **에러(저장 거부)** → zod 스키마 (`tierPolicySchema`)  ← 규칙의 정본
//   - **경고(저장 허용)** → `policyWarnings()`               ← zod 가 표현할 수 없는 축
// ─────────────────────────────────────────────────────────────────────────────
import * as z from 'zod/mini';

import { TIER_LABEL } from '../../shared/domain/member';
import type { MemberTier } from '../../shared/domain/member';
// 의존 방향은 한쪽뿐이다: validation → types. types 는 validation 을 import 하지 않는다
// (반대로 물리면 import-x/no-cycle 이 error 로 막는다 — ADR-0008 §4.2).
import {
  BASE_TIER,
  DISCOUNT_MAX,
  errorsOf,
  parseAmount,
  parsePercent,
  TIER_ORDER,
  withThousandSeparator,
} from './types';
import type {
  IssueTarget,
  PolicyDraft,
  PolicyIssue,
  PolicyValidation,
  TierDraftRow,
  TierRules,
} from './types';

/** 한 등급의 입력 행 — 문자열 두 칸. 값의 의미 검증은 아래 스키마가 한다 */
const rowSchema = z.object({ threshold: z.string(), discount: z.string() });

const rowsSchema = z.object({ normal: rowSchema, vip: rowSchema, vvip: rowSchema });

/** 기본 등급(일반회원)의 승급 조건은 입력과 무관하게 항상 0 이다 — 정책이 아니라 정의다 */
function amountOf(tier: MemberTier, row: TierDraftRow): number | null {
  return tier === BASE_TIER ? 0 : parseAmount(row.threshold);
}

/**
 * 저장을 막는 규칙 전부.
 *
 * - 금액/할인율이 정수로 읽히지 않는다 (할인율은 0~DISCOUNT_MAX)
 * - 승급 조건이 등급이 올라갈수록 커지지 않는다 (VIP <= 일반, VVIP <= VIP)
 *
 * 이슈의 `path` 는 화면의 필드 id (`${tier}-threshold` / `${tier}-discount`) 와 1:1 이다 —
 * 그래야 표 안의 어느 칸이 틀렸는지 인라인으로 짚을 수 있다.
 */
const tierPolicySchema = z
  .object({
    rows: rowsSchema,
    period: z.enum(['all', 'last-12m', 'last-6m']),
    allowDemotion: z.boolean(),
    recalcTrigger: z.enum(['order-completed', 'daily', 'monthly']),
  })
  .check((ctx) => {
    const draft = ctx.value;

    for (const tier of TIER_ORDER) {
      const row = draft.rows[tier];

      if (amountOf(tier, row) === null) {
        ctx.issues.push({
          code: 'custom',
          input: row.threshold,
          path: [`${tier}-threshold`],
          message: `${TIER_LABEL[tier]} 승급 조건은 0 이상의 정수(원)로 입력하세요.`,
        });
      }

      if (parsePercent(row.discount) === null) {
        ctx.issues.push({
          code: 'custom',
          input: row.discount,
          path: [`${tier}-discount`],
          message: `${TIER_LABEL[tier]} 할인율은 0~${String(DISCOUNT_MAX)} 사이의 정수(%)로 입력하세요.`,
        });
      }
    }

    // 승급 조건은 등급이 올라갈수록 커야 한다 — 인접 등급끼리 순서대로 비교한다.
    // 한쪽이라도 파싱되지 않으면 비교하지 않는다(이미 위에서 에러가 붙었다).
    for (let i = 1; i < TIER_ORDER.length; i += 1) {
      const lower = TIER_ORDER[i - 1];
      const upper = TIER_ORDER[i];
      if (lower === undefined || upper === undefined) continue;

      const lowerAmount = amountOf(lower, draft.rows[lower]);
      const upperAmount = amountOf(upper, draft.rows[upper]);
      if (lowerAmount === null || upperAmount === null) continue;
      if (upperAmount > lowerAmount) continue;

      ctx.issues.push({
        code: 'custom',
        input: draft.rows[upper].threshold,
        path: [`${upper}-threshold`],
        message: `${TIER_LABEL[upper]} 승급 조건(${withThousandSeparator(upperAmount)}원)은 ${
          TIER_LABEL[lower]
        } 승급 조건(${withThousandSeparator(lowerAmount)}원)보다 커야 합니다.`,
      });
    }
  });

/**
 * 경고 — **저장을 막지 않는다. 다만 조용히 넘기지도 않는다.**
 * 등급이 올라가는데 할인율이 작아지는 것은 정책상 가능하지만 대개 실수다.
 * (zod 에 경고 채널이 없어 스키마 밖에 있다 — 파일 머리말의 경계 설명 참조)
 */
function policyWarnings(draft: PolicyDraft): readonly PolicyIssue[] {
  const warnings: PolicyIssue[] = [];

  for (let i = 1; i < TIER_ORDER.length; i += 1) {
    const lower = TIER_ORDER[i - 1];
    const upper = TIER_ORDER[i];
    if (lower === undefined || upper === undefined) continue;

    const lowerDiscount = parsePercent(draft.rows[lower].discount);
    const upperDiscount = parsePercent(draft.rows[upper].discount);
    if (lowerDiscount === null || upperDiscount === null) continue;
    if (upperDiscount >= lowerDiscount) continue;

    warnings.push({
      target: 'policy',
      severity: 'warning',
      message: `${TIER_LABEL[upper]} 할인율(${String(upperDiscount)}%)이 ${TIER_LABEL[lower]} 할인율(${String(
        lowerDiscount,
      )}%)보다 낮습니다. 등급이 올라가는데 혜택이 줄어듭니다 — 의도한 정책인지 확인하세요.`,
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

  // zod 이슈의 path[0] 이 곧 화면의 필드 id 다 (스키마가 그렇게 싣는다)
  const errors: PolicyIssue[] = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        target: (issue.path[0] ?? 'policy') as IssueTarget,
        severity: 'error' as const,
        message: issue.message,
      }));

  const issues: readonly PolicyIssue[] = [...errors, ...policyWarnings(draft)];

  const rules = buildRules(draft);
  const blocked = errorsOf(issues).length > 0;

  return {
    policy:
      blocked || rules === null
        ? null
        : {
            rules,
            period: draft.period,
            allowDemotion: draft.allowDemotion,
            recalcTrigger: draft.recalcTrigger,
          },
    issues,
  };
}

/** 검증을 통과한 초안 → 정책. 규칙은 스키마가 이미 강제했다 — 여기서는 값을 옮기기만 한다 */
function buildRules(draft: PolicyDraft): TierRules | null {
  const rules: Partial<Record<MemberTier, { threshold: number; discountPercent: number }>> = {};

  for (const tier of TIER_ORDER) {
    const threshold = amountOf(tier, draft.rows[tier]);
    const discountPercent = parsePercent(draft.rows[tier].discount);
    if (threshold === null || discountPercent === null) return null;
    rules[tier] = { threshold, discountPercent };
  }

  const { normal, vip, vvip } = rules;
  if (normal === undefined || vip === undefined || vvip === undefined) return null;
  return { normal, vip, vvip };
}
