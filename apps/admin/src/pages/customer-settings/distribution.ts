// 등급 분포 미리보기 계산
//
// [무엇을 계산하나] "지금 화면에 입력된 정책을 저장하면 회원이 어떻게 나뉘는가".
// 저장하지 않은 초안으로 계산하는 **미리보기**다 — 아무것도 바꾸지 않는 순수 함수다.
//
// [입력] 회원 데이터는 shared/fixtures/members 의 회원을 화면이 읽어서 넘긴다(import 만 — 수정하지 않는다).
//   - 현재 등급: member.tier (지금 저장돼 있는 값 — 기본 제공 등급 중 하나다)
//   - 예상 등급: member.totalPurchase 를 정책의 승급 조건에 태워 다시 계산한 값
//
// [추가된 등급의 '현재' 인원은 0 이다 — 그리고 그것은 사실이다]
// 회원이 들고 있는 등급(member.tier)은 기본 제공 3종뿐이다. 방금 만든 등급을 든 회원은 아직 없고,
// 미리보기의 '현재' 열이 0 인 것은 추정이 아니라 관측이다. 반대로 '저장 후(예상)' 열에는 그 등급으로
// 옮겨 갈 회원이 잡힌다 — 새 등급을 만든 운영자가 가장 먼저 확인하고 싶은 숫자가 그것이다.
//
// [강등 허용]
//   - 켜짐: 조건에 미달하면 등급이 내려간다 → 예상 등급 = 조건으로 계산한 등급
//   - 꺼짐: 한 번 오른 등급은 유지된다   → 예상 등급 = max(현재 등급, 계산한 등급)
//
// [집계 기간의 한계] 픽스처에는 주문 이력이 없고 누적 구매금액 합계만 있다. 그래서 미리보기는
// '전체 기간' 기준으로만 계산된다 — 기간 옵션은 백엔드 집계 쿼리에 실려 나갈 값이고, 화면은
// 이 사실을 문구로 밝힌다(TierDistributionCard).
import type { Member } from '../../shared/domain/member';
import { rankOf } from './types';
import type { TierRow } from './types';

/** 누적 구매금액 → 등급 id. 조건을 만족하는 가장 높은 등급을 고른다 (목록은 오름차순) */
function tierForAmount(tiers: readonly TierRow[], amount: number): string | null {
  let matched: string | null = null;
  for (const tier of tiers) {
    if (amount >= tier.threshold) matched = tier.id;
  }
  return matched;
}

/**
 * 강등 허용이 꺼져 있으면 현재 등급 아래로는 내려가지 않는다.
 *
 * 계산 결과가 없거나(승급 조건을 만족하는 등급이 하나도 없다) 회원의 현재 등급이 목록에 없으면
 * 목록의 첫 등급으로 떨어뜨린다 — 목록에는 기본 제공 등급이 반드시 있고(검증이 강제한다),
 * 그중 가장 낮은 것이 곧 가입 직후의 자리다.
 */
function projectedTierId(
  member: Member,
  tiers: readonly TierRow[],
  allowDemotion: boolean,
): string | null {
  const base = tiers[0]?.id ?? null;
  const computed = tierForAmount(tiers, member.totalPurchase) ?? base;
  if (computed === null) return null;
  if (allowDemotion) return computed;

  const computedRank = rankOf(tiers, computed);
  const currentRank = rankOf(tiers, member.tier);
  if (computedRank === null || currentRank === null) return computed;
  return computedRank >= currentRank ? computed : member.tier;
}

interface DistributionRow {
  readonly tierId: string;
  readonly label: string;
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
  /** 승급 회원을 '도착 등급'으로 묶은 수 — "N명이 VIP로 승급됩니다" 문구가 쓴다 (키 = 등급 id) */
  readonly promotedInto: Readonly<Record<string, number>>;
  /** 강등 회원을 '도착 등급'으로 묶은 수 */
  readonly demotedInto: Readonly<Record<string, number>>;
}

function zeroCounts(tiers: readonly TierRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tier of tiers) counts[tier.id] = 0;
  return counts;
}

/** 아는 등급만 센다 — 없는 키를 새로 만들면 목록에 없는 등급이 표에 나타난다 */
function bump(counts: Record<string, number>, tierId: string): void {
  const value = counts[tierId];
  if (value === undefined) return;
  counts[tierId] = value + 1;
}

export function computeDistribution(
  members: readonly Member[],
  tiers: readonly TierRow[],
  allowDemotion: boolean,
): Distribution {
  const current = zeroCounts(tiers);
  const projected = zeroCounts(tiers);
  const promotedInto = zeroCounts(tiers);
  const demotedInto = zeroCounts(tiers);
  let promoted = 0;
  let demoted = 0;

  for (const member of members) {
    const next = projectedTierId(member, tiers, allowDemotion);
    if (next === null) continue;

    // 회원의 현재 등급이 목록에 없을 수는 없다(기본 제공 등급은 지워지지 않는다).
    // 그래도 세지 못한 회원을 '0명' 으로 뭉개지 않기 위해 존재하는 키만 올린다.
    bump(current, member.tier);
    bump(projected, next);

    const nextRank = rankOf(tiers, next);
    const currentRank = rankOf(tiers, member.tier);
    if (nextRank === null || currentRank === null) continue;

    const diff = nextRank - currentRank;
    if (diff > 0) {
      promoted += 1;
      bump(promotedInto, next);
    } else if (diff < 0) {
      demoted += 1;
      bump(demotedInto, next);
    }
  }

  const rows = tiers.map((tier) => ({
    tierId: tier.id,
    label: tier.label,
    current: current[tier.id] ?? 0,
    projected: projected[tier.id] ?? 0,
    delta: (projected[tier.id] ?? 0) - (current[tier.id] ?? 0),
  }));

  return { rows, total: members.length, promoted, demoted, promotedInto, demotedInto };
}
