/**
 * 축 1 — 페이지 간 결합 (blocker, 임계값 0건)
 *
 * `apps/<app>/src/pages/A/` 가 `pages/B/` 를 import 하면 위반이다. 페이지는 서로를 모른다.
 * side-effect CSS import(`import '../members/members.css'`)도 결합이다 — B를 지우면 A가 깨진다.
 *
 * 해소 방향은 하나: 공통으로 쓰이는 것은 `shared/ui`(또는 `packages/ui`)로 **승격**한다.
 * 이동은 A83이 하지 않는다 — A40/A41의 일이다 (ADR-0006 후속 작업).
 */
import type { ParsedFile } from '../lib/ast.ts';
import type { AxisResult, Violation } from '../report.ts';
import { PAGE_COUPLING } from '../thresholds.ts';

const PAGE_RE = /^(apps\/[^/]+\/src\/pages)\/([^/]+)\//;

/** 파일이 속한 페이지 이름 (pages/<name>/…). 페이지 밖이면 null */
export function pageOf(file: string): string | null {
  const m = PAGE_RE.exec(file);
  return m ? (m[2] ?? null) : null;
}

export function checkPageCoupling(files: ParsedFile[]): AxisResult {
  const violations: Violation[] = [];
  let pageFiles = 0;

  for (const pf of files) {
    const fromPage = pageOf(pf.file);
    if (fromPage === null) continue;
    pageFiles += 1;

    for (const edge of pf.imports) {
      if (edge.to === null) continue; // 외부 패키지
      const toPage = pageOf(edge.to);
      if (toPage === null || toPage === fromPage) continue;

      const symbol =
        edge.kind === 'side-effect'
          ? `(side-effect import ${edge.specifier})`
          : edge.names.join(', ') || edge.specifier;

      violations.push({
        axis: PAGE_COUPLING.axis,
        id: PAGE_COUPLING.id,
        severity: PAGE_COUPLING.severity,
        file: pf.file,
        line: edge.line,
        symbol,
        measured: `pages/${fromPage} → pages/${toPage} (1건)`,
        threshold: PAGE_COUPLING.threshold,
        message: `페이지 '${fromPage}' 가 페이지 '${toPage}' 의 모듈을 import 한다 — 재사용이 아니라 결합이다. '${toPage}' 를 지우면 '${fromPage}' 가 죽는다.`,
        suggestion: `공통으로 쓰이는 것이면 \`apps/admin/src/shared/ui\` (또는 \`packages/ui\`) 로 승격하고 배럴에서 import 한다. 한 페이지 전용이면 '${fromPage}' 안에 자기 사본을 둔다.`,
        related: [{ file: edge.to, line: 1 }],
      });
    }
  }

  return {
    spec: PAGE_COUPLING,
    scanned: `pages 파일 ${pageFiles}건`,
    violations,
  };
}
