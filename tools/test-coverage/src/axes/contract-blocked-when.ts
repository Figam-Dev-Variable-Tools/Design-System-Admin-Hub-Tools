/**
 * 축 3 (임무의 축 A-2) — 계약 events.blockedWhen 커버리지.
 *
 * `blockedWhen` 은 **계약이 명시한 금지 동작**이다. "loading 중엔 onClick 이 발화하지 않는다."
 * 다른 항목과 달리 이것은 **반드시** 테스트가 있어야 한다 — 금지는 지켜지지 않으면 계약 위반이다.
 *
 * **비발생은 렌더로 증명되지 않는다.**
 * `expect(button).toBeDisabled()` 는 onClick 이 발화하지 않음을 증명하지 못한다. `disabled` 속성 없이
 * CSS 로만 흐리게 처리하고 핸들러를 그대로 물려도 그 단언은 통과한다. 금지 동작을 증명하려면
 * 콜백을 **관찰**해야 한다 — 스파이(`fn()`)를 주입하고 `not.toHaveBeenCalled()` 로 비발생을 단언한다.
 *
 * 그래서 이 축의 커버 조건은 세 가지를 **모두** 요구한다:
 *   (1) 그 컴포넌트의 테스트/play 이고
 *   (2) 이름에 이벤트(onClick → 'onclick' 또는 'click')와 차단 조건(disabled/loading)이 함께 있고
 *   (3) **비발생 단언**(not.toHaveBeenCalled · toHaveBeenCalledTimes(0) …)을 실제로 가진다
 *
 * (실측: 리포의 play function 65개 중 `fn()` 스파이 0개 · `expect` 0개.
 *  즉 현재 코드베이스에서 blockedWhen 검증은 **없는 것이 아니라 물리적으로 불가능**하다.
 *  G5 exit *"Play Function으로 events.blockedWhen 전수 검증"* 은 그 65개의 초록불로 통과돼 왔다.)
 */
import { surfaceShrinkGap, type Baseline } from '../lib/baseline.ts';
import type { Contract } from '../lib/contracts.ts';
import { normalize, type TestUnit } from '../lib/tests.ts';
import type { AxisResult, Gap } from '../report.ts';
import { CONTRACT_BLOCKED_WHEN } from '../thresholds.ts';
import { unitsFor } from './contract-states.ts';

/** `onClick` → ['onclick', 'click'] — 테스트 이름은 둘 중 어느 쪽으로도 쓸 수 있다 */
function eventTokens(event: string): string[] {
  const full = normalize(event);
  const bare = normalize(event.replace(/^on/, ''));
  return bare.length > 0 && bare !== full ? [full, bare] : [full];
}

export function checkBlockedWhen(
  contracts: Contract[],
  units: TestUnit[],
  baseline: Baseline,
): AxisResult {
  const gaps: Gap[] = [];
  let total = 0;
  let covered = 0;

  for (const c of contracts) {
    const scoped = unitsFor(c.name, units);
    for (const { event, condition } of c.blockedWhen) {
      total += 1;
      const cond = normalize(condition);
      const tokens = eventTokens(event);

      const hit = scoped.find((u) => {
        const n = normalize(u.name);
        const namesTheContract = tokens.some((t) => n.includes(t)) && n.includes(cond);
        return namesTheContract && u.hasNonInvocationAssertion;
      });

      if (hit !== undefined) {
        covered += 1;
        continue;
      }

      // 이름은 맞는데 비발생 단언이 없는 경우를 따로 짚어 준다 — 소유자가 무엇을 고쳐야 하는지 알려준다.
      const named = scoped.find((u) => {
        const n = normalize(u.name);
        return tokens.some((t) => n.includes(t)) && n.includes(cond);
      });

      gaps.push({
        axis: CONTRACT_BLOCKED_WHEN.axis,
        id: CONTRACT_BLOCKED_WHEN.id,
        severity: 'blocker',
        source: c.file,
        item: `${c.name} · \`${event}\` blockedWhen \`${condition}\``,
        expectedTest: `${c.name}: ${event} — ${condition} 상태에서 발화하지 않는다`,
        evidence:
          named !== undefined
            ? `\`${named.file}:${named.line}\` 의 "${named.name}" 이 이름은 맞지만 **비발생 단언이 없다** — 스파이(fn())를 주입하고 not.toHaveBeenCalled() 로 단언해야 한다. 렌더 단언(toBeDisabled 등)은 콜백 비발생을 증명하지 못한다`
            : `계약이 금지한 동작을 검증하는 테스트가 없다. 스파이(fn())를 ${event} 에 주입하고 ${condition} 상태에서 not.toHaveBeenCalled() 를 단언하라`,
        gates: CONTRACT_BLOCKED_WHEN.gates,
      });
    }
  }

  // 분모 세탁 감시 — `blockedWhen` 은 **계약이 명시한 금지 동작**이다.
  // 금지를 계약에서 지우면 그 금지를 지키는지 아무도 묻지 않게 된다. 지우는 것도 사건이다.
  gaps.push(
    ...surfaceShrinkGap({
      axis: CONTRACT_BLOCKED_WHEN.axis,
      id: CONTRACT_BLOCKED_WHEN.id,
      label: '계약 blockedWhen',
      current: total,
      baseline: baseline.contractBlockedTotal,
      baselineSource: baseline.source,
      gates: CONTRACT_BLOCKED_WHEN.gates,
    }),
  );

  return {
    spec: CONTRACT_BLOCKED_WHEN,
    scanned: `계약 ${contracts.length}종 · blockedWhen 총 ${total}칸 (직전 ${baseline.contractBlockedTotal}칸)`,
    covered,
    total,
    gaps,
  };
}
