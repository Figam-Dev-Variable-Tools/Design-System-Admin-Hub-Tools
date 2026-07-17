/**
 * 축 1 (임무의 축 C) — 테스트 존재. **스코프별로 독립 판정한다** (오케스트레이터/아키텍처 판정 1).
 *
 * **테스트가 0건이면 무조건 실패한다.** 이것이 `--passWithNoTests` 에 대한 답이다.
 *
 * **왜 스코프별인가.** 전역 카운트였을 때 이 축에는 구멍이 있었다 —
 * 컴포넌트 엔지니어이 `packages/ui` 에 테스트를 채우면 `apps/admin` 이 0건이어도 축 1이 초록으로 바뀐다.
 * **한쪽의 초록이 다른 쪽의 빈칸을 가린다.** 그래서 스코프마다 독립적으로 >= 1건을 요구하고,
 * 어느 한쪽이 0이면 **그 스코프가 blocker** 다.
 *
 * 스코프 목록은 하드코딩하지 않고 `pnpm-workspace.yaml` 에서 파생한다 (lib/workspace.ts) —
 * 새 앱/패키지는 자동으로 이 축의 대상이 된다. 손으로 두 개를 박아 두면 세 번째 패키지가
 * 추가되는 날 같은 구멍이 다시 열린다.
 *
 * 세는 것은 "테스트 파일 수"가 아니라 **단언을 가진 실행 단위 수**다.
 * 파일이 있어도 `expect` 가 없으면 그 파일은 실패할 수 없고, 실패할 수 없는 것은 검증하지 않는다.
 */
import type { TestScan } from '../lib/tests.ts';
import type { Scope } from '../lib/workspace.ts';
import type { AxisResult, Gap, ScopeRow } from '../report.ts';
import { EXISTENCE } from '../thresholds.ts';

export function checkExistence(
  scan: TestScan,
  scopes: Scope[],
): { result: AxisResult; rows: ScopeRow[] } {
  const gaps: Gap[] = [];
  const rows: ScopeRow[] = [];

  // 스코프가 0개면 잴 대상이 없다 — "잴 것이 없으니 통과"는 성립하지 않는 명제다.
  if (scopes.length === 0) {
    gaps.push({
      axis: EXISTENCE.axis,
      id: EXISTENCE.id,
      severity: 'blocker',
      source: 'pnpm-workspace.yaml',
      item: '축 1 스코프 0개 — 워크스페이스에서 제품 패키지(apps/* · packages/*)를 하나도 파생하지 못했다',
      expectedTest: '(워크스페이스 설정 확인 후 재측정)',
      evidence:
        '측정 불가는 통과가 아니다. pnpm-workspace.yaml 의 packages: 글롭 또는 package.json 배치를 확인하라 (의존성 관리).',
      gates: EXISTENCE.gates,
    });
    return {
      result: { spec: EXISTENCE, scanned: '스코프 0개 — 측정 불가', covered: 0, total: 0, gaps },
      rows,
    };
  }

  for (const scope of scopes) {
    const prefix = `${scope.dir}/`;
    const units = scan.units.filter((u) => u.file.startsWith(prefix));
    const free = scan.assertionFree.filter((u) => u.file.startsWith(prefix));

    rows.push({
      name: scope.name,
      dir: scope.dir,
      testUnits: units.length,
      assertionFreeUnits: free.length,
      status: units.length > 0 ? 'PASS' : 'BLOCKER',
    });

    if (units.length > 0) continue;

    gaps.push({
      axis: EXISTENCE.axis,
      id: EXISTENCE.id,
      severity: 'blocker',
      source: `${scope.dir}/package.json`,
      item: `${scope.name} (\`${scope.dir}\`) — 단언을 가진 실행 단위 **0건**${
        free.length > 0 ? ` · 단언 없는 실행 단위 ${free.length}건` : ''
      }`,
      expectedTest: `${scope.dir}/src/**/*.test.tsx — 단언(expect)을 가진 테스트 1건 이상`,
      evidence:
        free.length > 0
          ? `이 스코프에 실행 단위 ${free.length}건이 있으나 전부 단언(expect)이 없다 — 실패할 수 없는 초록불이다. **다른 스코프의 테스트는 이 빈칸을 가리지 못한다.**`
          : '이 스코프에 테스트가 없다. `--passWithNoTests` 의 exit 0 은 증거가 아니다. **다른 스코프의 테스트는 이 빈칸을 가리지 못한다.**',
      gates: EXISTENCE.gates,
    });
  }

  return {
    result: {
      spec: EXISTENCE,
      scanned: `워크스페이스 파생 스코프 ${scopes.length}개: ${scopes.map((s) => s.dir).join(' · ')}`,
      covered: rows.filter((r) => r.status === 'PASS').length,
      total: scopes.length,
      gaps,
    },
    rows,
  };
}
