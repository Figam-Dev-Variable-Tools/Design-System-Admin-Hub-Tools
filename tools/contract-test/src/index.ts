/**
 * @tds/contract-test — 4자 일치 검증 진입점 (계약 테스트 Contract Test AI)
 *
 * 실행: pnpm contract-test  (= pnpm --filter @tds/contract-test run test)
 *
 * 검증 축 (설계서 §5.3):
 *  1) Contract ↔ React     — generated 타입 존재/세대 일치 + 구현의 generated import
 *  2) Contract ↔ Storybook — generated argTypes 존재/Story import + 조합 커버리지 휴리스틱
 *  3) Contract ↔ Figma     — figma.json properties 이름/타입/값 완전 일치
 *  4) Contract ↔ Token     — 계약 tokens 경로 실존 + 하드코딩 hex/px 스캔
 *
 * 산출물: reports/contract-test/<component>.json + summary.md
 * 종료 코드: 불일치(FAIL) 1건 이상 → 1 (G5/G6/G7 동시 차단), 그 외 → 0
 */
import path from 'node:path';
import { checkFigmaAxis } from './axes/figma.ts';
import { checkReactAxis } from './axes/react.ts';
import { checkStorybookAxis } from './axes/storybook.ts';
import { checkTokenAxis } from './axes/token.ts';
import { loadContracts } from './lib/contracts.ts';
import { findRepoRoot, walkFiles } from './lib/fsutil.ts';
import type { AxisContext, ComponentReport } from './lib/types.ts';
import { summarizeStatuses } from './lib/types.ts';
import { writeReports } from './report.ts';

function main(): void {
  const root = findRepoRoot(process.cwd());
  const generatedAt = new Date().toISOString();
  const uiBase = path.join(root, 'packages', 'ui');
  const uiFiles = walkFiles(uiBase);

  const { contracts, errors } = loadContracts(root);
  const reports: ComponentReport[] = [];

  // 읽을 수 없는 계약 = 검증 불가 = 불일치로 취급 (게이트 차단)
  for (const err of errors) {
    const component = err.relPath.replace(/^contracts\//, '').replace(/\.contract\.json$/, '');
    reports.push({
      component,
      contractPath: err.relPath,
      contractVersion: 'unknown',
      generatedAt,
      status: 'FAIL',
      mismatchCount: 1,
      axes: [],
      error: err.message,
    });
  }

  for (const { contract, relPath } of contracts) {
    const ctx: AxisContext = {
      root,
      contract,
      ui: { base: uiBase, files: uiFiles },
    };
    const reactAxis = checkReactAxis(ctx);
    const storybookAxis = checkStorybookAxis(ctx);
    const figmaAxis = checkFigmaAxis(ctx);
    // 앞선 3개 축이 전부 SKIP = 산출물이 하나도 없는 "계약만 존재" 상태.
    // 이 경우 Token 축도 SKIP — 계약만 있는 컴포넌트는 차단하지 않는다 (부트스트랩 배려).
    const contractOnly =
      reactAxis.status === 'SKIP' && storybookAxis.status === 'SKIP' && figmaAxis.status === 'SKIP';
    const axes = [reactAxis, storybookAxis, figmaAxis, checkTokenAxis(ctx, { contractOnly })];
    const status = summarizeStatuses(axes.map((a) => a.status));
    const mismatchCount = axes.reduce(
      (n, a) => n + a.checks.filter((c) => c.status === 'FAIL').length,
      0,
    );
    reports.push({
      component: contract.name,
      contractPath: relPath,
      contractVersion: contract.version,
      generatedAt,
      status,
      mismatchCount,
      axes,
    });
  }

  writeReports(root, reports, generatedAt);

  const pass = reports.filter((r) => r.status === 'PASS').length;
  const fail = reports.filter((r) => r.status === 'FAIL');
  const skip = reports.filter((r) => r.status === 'SKIP').length;

  if (reports.length === 0) {
    console.log('[contract-test] 검증할 계약이 없습니다 (contracts/*.contract.json 0건) — 통과.');
  } else {
    console.log(
      `[contract-test] 계약 ${reports.length}건 검증 — PASS ${pass} · FAIL ${fail.length} · SKIP ${skip}`,
    );
    for (const r of fail) {
      console.error(
        `[contract-test] FAIL ${r.component}@${r.contractVersion} — 불일치 ${r.mismatchCount}건 (reports/contract-test/${r.component}.json)`,
      );
    }
  }
  console.log('[contract-test] 리포트: reports/contract-test/summary.md');

  if (fail.length > 0) {
    console.error('[contract-test] 불일치 발견 → G5/G6/G7 차단 (exit 1)');
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

try {
  main();
} catch (e) {
  console.error(`[contract-test] 실행 오류: ${(e as Error).message}`);
  process.exitCode = 2;
}
