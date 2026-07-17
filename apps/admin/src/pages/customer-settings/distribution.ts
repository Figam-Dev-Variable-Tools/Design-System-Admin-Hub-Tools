// 등급 분포 미리보기 계산
//
// [무엇을 계산하나] "지금 화면에 입력된 정책을 저장하면 회원이 어떻게 나뉘는가".
// 저장하지 않은 초안으로 계산하는 **미리보기**다 — 아무것도 바꾸지 않는 순수 함수다.
//
// [입력] 회원 데이터는 shared/fixtures/members 의 회원을 화면이 읽어서 넘긴다(import 만 — 수정하지 않는다).
//   (회원 화면의 픽스처를 가로질러 읽지 않는다 — 같은 표본을 공유하되 의존은 shared 로만 간다.)
//   - 현재 등급: member.tier (지금 저장돼 있는 값)
//   - 예상 등급: member.totalPurchase 를 정책의 승급 조건에 태워 다시 계산한 값
//
// [강등 허용]
//   - 켜짐: 조건에 미달하면 등급이 내려간다 → 예상 등급 = 조건으로 계산한 등급
//   - 꺼짐: 한 번 오른 등급은 유지된다   → 예상 등급 = max(현재 등급, 계산한 등급)
//
// [집계 기간의 한계] 픽스처에는 주문 이력이 없고 누적 구매금액 합계만 있다. 그래서 미리보기는
// '전체 기간' 기준으로만 계산된다 — 기간 옵션은 백엔드 집계 쿼리에 실려 나갈 값이고, 화면은
// 이 사실을 문구로 밝힌다(TierDistributionCard).
import type { Member, MemberTier } from '../../shared/domain/member';
import { rankOf, TIER_ORDER } from './types';
import type { TierRules } from './types';

/** 누적 구매금액 → 등급. 조건을 만족하는 가장 높은 등급을 고른다 */
function tierForAmount(rules: TierRules, amount: number): MemberTier {
  let matched: MemberTier = 'normal';
  for (const tier of TIER_ORDER) {
    if (amount >= rules[tier].threshold) matched = tier;
  }
  return matched;
}

/** 강등 허용이 꺼져 있으면 현재 등급 아래로는 내려가지 않는다 */
function projectedTier(member: Member, rules: TierRules, allowDemotion: boolean): MemberTier {
  const computed = tierForAmount(rules, member.totalPurchase);
  if (allowDemotion) return computed;
  return rankOf(computed) >= rankOf(member.tier) ? computed : member.tier;
}

interface DistributionRow {
  readonly tier: MemberTier;
  /** 지금 등급이 이 값인 회원 수 */
  readonly current: number;
  /** 이 정책을 저장하면 이 등급이 될 회원 수 */
  readonly projected: number;
  /** projected - current */
  readonly delta: number;
}

export interface Distribution {
  readonly rows: readonly DistributionRow[];
  readonly total: number;
  /** 등급이 올라가는 회원 수 */
  readonly promoted: number;
  /** 등급이 내려가는 회원 수 */
  readonly demoted: number;
  /** 승급 회원을 '도착 등급'으로 묶은 수 — "N명이 VIP로 승급됩니다" 문구가 쓴다 */
  readonly promotedInto: Readonly<Record<MemberTier, number>>;
  /** 강등 회원을 '도착 등급'으로 묶은 수 */
  readonly demotedInto: Readonly<Record<MemberTier, number>>;
}

export function computeDistribution(
  members: readonly Member[],
  rules: TierRules,
  allowDemotion: boolean,
): Distribution {
  const current: Record<MemberTier, number> = { normal: 0, vip: 0, vvip: 0 };
  const projected: Record<MemberTier, number> = { normal: 0, vip: 0, vvip: 0 };
  const promotedInto: Record<MemberTier, number> = { normal: 0, vip: 0, vvip: 0 };
  const demotedInto: Record<MemberTier, number> = { normal: 0, vip: 0, vvip: 0 };
  let promoted = 0;
  let demoted = 0;

  for (const member of members) {
    const next = projectedTier(member, rules, allowDemotion);
    current[member.tier] += 1;
    projected[next] += 1;

    const diff = rankOf(next) - rankOf(member.tier);
    if (diff > 0) {
      promoted += 1;
      promotedInto[next] += 1;
    } else if (diff < 0) {
      demoted += 1;
      demotedInto[next] += 1;
    }
  }

  const rows = TIER_ORDER.map((tier) => ({
    tier,
    current: current[tier],
    projected: projected[tier],
    delta: projected[tier] - current[tier],
  }));

  return { rows, total: members.length, promoted, demoted, promotedInto, demotedInto };
}
