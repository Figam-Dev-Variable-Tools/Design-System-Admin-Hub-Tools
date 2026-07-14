/**
 * 축 5 — 검증 도구 자체의 골든 픽스처 (SKILL 축 5: "검증기를 검증한다").
 *
 * 감사가 확인한 재작업 8건 중 5건이 파이프라인 자체의 버그였고, 그중 2건은 **검증 도구가
 * 스스로 오판한 것**이다 (contract-test 가 정상 생성물을 '계약 밖'으로 오판 / codegen 헤더
 * 세대 미표기로 Contract↔React 축 FAIL). **도구의 테스트도 테스트다.**
 * 골든 픽스처(입력 → 기대 출력)가 없는 도구의 판정은 아무도 검증하지 않은 판정이다.
 *
 * severity 는 **major** 다 — 이유는 thresholds.ts 의 TOOL_FIXTURES 주석 참조.
 * (SKILL 표는 blocker 라 적었으나 레지스트리 blockCondition 은 이 축을 열거하지 않는다.
 *  SKILL 자신이 "하한의 원천은 레지스트리" 라고 명령하므로 레지스트리를 따르고,
 *  불일치는 리포트에 남겨 A01의 판정을 받는다. 도구가 blocker 를 발명하지 않는다.)
 */
import { exists, walkFiles } from '../lib/fsutil.ts';
import type { TestUnit } from '../lib/tests.ts';
import type { AxisResult, Gap } from '../report.ts';
import { FIXTURE_REQUIRED_TOOLS, TOOL_FIXTURES } from '../thresholds.ts';

const FIXTURE_DIR = /(^|\/)(__fixtures__|fixtures|golden|__golden__)(\/|$)/;
const TOOL_TEST = /\.(test|spec)\.ts$/;

export function checkToolFixtures(root: string, _units: TestUnit[]): AxisResult {
  const gaps: Gap[] = [];
  let covered = 0;

  for (const tool of FIXTURE_REQUIRED_TOOLS) {
    if (!exists(root, tool)) {
      gaps.push({
        axis: TOOL_FIXTURES.axis,
        id: TOOL_FIXTURES.id,
        severity: 'major',
        source: tool,
        item: `${tool} — 도구가 존재하지 않는다`,
        expectedTest: `${tool}/src/__fixtures__/ + ${tool}/src/*.test.ts`,
        evidence:
          '골든 픽스처를 요구하는 검증 도구가 리포에 없다 — 목록(thresholds.ts)과 실제가 어긋난다',
        gates: TOOL_FIXTURES.gates,
      });
      continue;
    }

    const files = walkFiles(root, tool);
    const fixtures = files.filter((f) => FIXTURE_DIR.test(f));
    const tests = files.filter((f) => TOOL_TEST.test(f));

    if (fixtures.length > 0 && tests.length > 0) {
      covered += 1;
      continue;
    }

    gaps.push({
      axis: TOOL_FIXTURES.axis,
      id: TOOL_FIXTURES.id,
      severity: 'major',
      source: tool,
      item: `${tool} · 골든 픽스처 ${fixtures.length}건 · 도구 테스트 ${tests.length}건`,
      expectedTest: `${tool}/src/__fixtures__/<case>/{input,expected} + ${tool}/src/<axis>.test.ts`,
      evidence:
        '이 도구는 게이트를 차단할 권한을 가지는데, 그 판정이 옳은지 검증하는 골든 픽스처가 없다. 감사 실측: 검증 도구의 오판 2건이 재작업을 유발했다',
      gates: TOOL_FIXTURES.gates,
    });
  }

  return {
    spec: TOOL_FIXTURES,
    scanned: `검증 도구 ${FIXTURE_REQUIRED_TOOLS.length}종 (${FIXTURE_REQUIRED_TOOLS.join(', ')})`,
    covered,
    total: FIXTURE_REQUIRED_TOOLS.length,
    gaps,
  };
}
