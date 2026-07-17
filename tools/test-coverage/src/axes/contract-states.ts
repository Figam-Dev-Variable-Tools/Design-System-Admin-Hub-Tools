/**
 * 축 2 (임무의 축 A-1) — 계약 states 커버리지.
 *
 * `Button.contract.json` 의 `states: [default, hover, active, focus-visible, disabled, loading]`
 * 전부가 각각 최소 1개의 **단언을 가진** 테스트로 덮여야 한다. 하나라도 빠지면 blocker.
 *
 * Storybook play function 도 테스트로 인정한다 — **단, 단언이 있을 때만.**
 * `userEvent.hover(...)` 만 하고 아무것도 expect 하지 않는 play 는 상태를 *만들기만* 하고
 * 그 상태가 옳은지는 묻지 않는다. 그것을 커버로 세면 이 도구는 자기가 고발하려던
 * 초록불을 그대로 재생산한다.
 *
 * 대조 키는 **테스트/스토리 이름**이다 (SKILL: "소스 전문을 정독하지 않는다").
 */
import { surfaceShrinkGap, type Baseline } from '../lib/baseline.ts';
import type { Contract } from '../lib/contracts.ts';
import { normalize, type TestUnit } from '../lib/tests.ts';
import type { AxisResult, Gap } from '../report.ts';
import { CONTRACT_STATES } from '../thresholds.ts';

/**
 * 이 테스트 단위가 컴포넌트 C 의 것인가 — 파일 경로 · 스토리 title · 이름 순으로 귀속.
 *
 * **거짓 양성 방지 — 컴포넌트 이름의 부분 문자열 충돌.**
 * 구 버전은 이름을 정규화한 뒤 **단순 부분 문자열**로 대조했다. 그런데 이 디자인 시스템에는
 * `Card` ⊂ `ListCard` · `StatsCard` · `TodoCard` 처럼 **짧은 이름이 긴 이름에 포함**되는 쌍이 있다.
 *
 *     normalize('ListCard: renders loading state') = 'listcardrendersloadingstate'
 *                                                        ^^^^ 'card' 가 들어 있다
 *
 * → **`ListCard` 의 테스트가 `Card` 계약의 커버로 세어진다.** `Card` 에 테스트가 한 건도 없어도
 *   형제 컴포넌트의 테스트가 대신 초록불을 켜 준다. 이것은 테스트 커버리지이 막으려던 바로 그 종류의 거짓말이다.
 *   (실측 당시 `Card` 는 자기 테스트를 실제로 갖고 있어 판정 자체는 옳았다 — 그러나 **메커니즘이
 *    틀렸다.** 옳은 답이 우연히 나온 것은 옳은 도구가 아니다.)
 *
 * 그래서 귀속은 **강한 신호 우선**이다:
 *   1. 스토리 meta `title: 'Atoms/Card'` → 컴포넌트명 **정확 일치**
 *   2. 파일 경로에 `/Card/` 디렉터리 세그먼트 (`/ListCard/` 는 매칭되지 않는다)
 *   3. 테스트 이름에서 **토큰 경계**로 등장 (`Card: …` ✅ / `ListCard: …` ❌ — 앞 글자가 영숫자다)
 */
export function unitsFor(component: string, units: TestUnit[]): TestUnit[] {
  const exact = normalize(component);
  // 토큰 경계 — 앞뒤가 영숫자가 아니어야 그 컴포넌트를 지목한 것이다
  const boundary = new RegExp(`(^|[^A-Za-z0-9])${escapeRe(component)}([^A-Za-z0-9]|$)`);

  return units.filter(
    (u) =>
      (u.component !== null && normalize(u.component) === exact) ||
      u.file.includes(`/${component}/`) ||
      boundary.test(u.name),
  );
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function checkContractStates(
  contracts: Contract[],
  units: TestUnit[],
  baseline: Baseline,
): AxisResult {
  const gaps: Gap[] = [];
  let total = 0;
  let covered = 0;

  for (const c of contracts) {
    if (c.unmeasurable !== null) {
      // 측정 불가는 통과가 아니다 — 계약이 상태를 선언하지 않았으면 대조 자체가 성립하지 않는다.
      total += 1;
      gaps.push({
        axis: CONTRACT_STATES.axis,
        id: CONTRACT_STATES.id,
        severity: 'blocker',
        source: c.file,
        item: `${c.name} — 대조 불가`,
        expectedTest: '(계약 보완 후 재측정)',
        evidence: c.unmeasurable,
        gates: CONTRACT_STATES.gates,
      });
      continue;
    }

    const scoped = unitsFor(c.name, units);
    for (const state of c.states) {
      total += 1;
      const s = normalize(state);
      const hit = scoped.find((u) => normalize(u.name).includes(s));
      if (hit !== undefined) {
        covered += 1;
        continue;
      }
      gaps.push({
        axis: CONTRACT_STATES.axis,
        id: CONTRACT_STATES.id,
        severity: 'blocker',
        source: c.file,
        item: `${c.name} · state \`${state}\``,
        expectedTest: `${c.name}: renders ${state} state`,
        evidence: `계약 states[] = [${c.states.join(', ')}] — 이 중 \`${state}\` 를 단언하는 테스트/play 가 없다`,
        gates: CONTRACT_STATES.gates,
      });
    }
  }

  // 분모 세탁 감시 — 계약이 선언한 states 총수가 줄었으면 신고한다 (차단하지 않는다).
  gaps.push(
    ...surfaceShrinkGap({
      axis: CONTRACT_STATES.axis,
      id: CONTRACT_STATES.id,
      label: '계약 states',
      current: total,
      baseline: baseline.contractStatesTotal,
      baselineSource: baseline.source,
      gates: CONTRACT_STATES.gates,
    }),
  );

  return {
    spec: CONTRACT_STATES,
    scanned: `계약 ${contracts.length}종 · states 총 ${total}칸 (직전 ${baseline.contractStatesTotal}칸)`,
    covered,
    total,
    gaps,
  };
}
