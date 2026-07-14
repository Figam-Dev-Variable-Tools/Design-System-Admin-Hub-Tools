/**
 * @tds/code-quality — 클린코드 6축 측정 진입점 (A83 Clean Code Inspector)
 *
 * 실행:
 *   pnpm quality:check                          # 전체 스캔 (PR 게이트)
 *   pnpm --filter @tds/code-quality run check
 *
 * 산출물: reports/code-quality/<date>.json + <date>.md
 * 종료 코드:
 *   0 — blocker 0건 (major 는 경고로 남고 통과)
 *   1 — blocker >= 1건 → PR 차단
 *   2 — 실행 오류 / **측정 대상 부재** (측정 불가는 통과가 아니다 — 공허 통과 금지)
 *
 * 판정 원칙: 6축의 수치 위반만이 판정 사유다. "읽기 좋다/나쁘다"는 판정하지 않는다.
 * A83은 측정만 하고 코드를 고치지 않는다 (수정은 소유자 A40/A41/A30의 일 — P1 단일 소유권).
 */
import { checkComplexity } from './axes/complexity.ts';
import { checkDeadCode } from './axes/dead-code.ts';
import { checkDomainLeak } from './axes/domain-leak.ts';
import { checkDuplication } from './axes/duplication.ts';
import { checkLayerDirection } from './axes/layer-direction.ts';
import { checkPageCoupling } from './axes/page-coupling.ts';
import { parse, type ParsedFile } from './lib/ast.ts';
import { exists, findRepoRoot, readText, walkFiles } from './lib/fsutil.ts';
import { buildReport, writeReport, type AxisResult, type UndefinedCase } from './report.ts';
import { EXCLUDE_PATTERNS, SCAN_ROOTS, SOURCE_EXTENSIONS } from './thresholds.ts';

function main(): void {
  const root = findRepoRoot(process.cwd());

  // 측정 대상 부재를 통과로 오인하지 않는다 (bundle-size 공허 통과가 준 교훈 — ADR-0006/0009)
  const missing = SCAN_ROOTS.filter((r) => !exists(root, r));
  if (missing.length === SCAN_ROOTS.length) {
    console.error(
      `[code-quality] 측정 대상이 하나도 없습니다: ${missing.join(', ')} — 측정 불가는 통과가 아니다. exit 2`,
    );
    process.exitCode = 2;
    return;
  }
  for (const m of missing) {
    console.warn(`[code-quality] 경고: 스캔 루트 없음 — ${m}`);
  }

  const targets = SCAN_ROOTS.filter((r) => exists(root, r))
    .flatMap((r) => walkFiles(root, r, SOURCE_EXTENSIONS))
    .filter((f) => !EXCLUDE_PATTERNS.some((re) => re.test(f)));
  if (targets.length === 0) {
    console.error('[code-quality] 스캔 대상 소스 파일 0건 — 측정 불가. exit 2');
    process.exitCode = 2;
    return;
  }

  const files: ParsedFile[] = targets.map((f) => parse(root, f, readText(root, f)));
  const totalLines = files.reduce((sum, f) => sum + f.lineCount, 0);

  const layer = checkLayerDirection(files);
  const results: AxisResult[] = [
    checkPageCoupling(files), // 축 1 blocker
    checkDomainLeak(files), // 축 2 blocker
    checkDuplication(files), // 축 3 major
    checkComplexity(files), // 축 4 major
    checkDeadCode(files), // 축 5 major
    layer.result, // 축 6 blocker
  ];
  const undefinedCases: UndefinedCase[] = [...layer.undefinedCases];

  const date = new Date().toISOString().slice(0, 10);
  const report = buildReport(
    date,
    { roots: SCAN_ROOTS, files: files.length, lines: totalLines },
    results,
    undefinedCases,
  );
  const paths = writeReport(root, report);

  console.log(
    `[code-quality] 스캔: ${files.length}개 파일 · ${totalLines}줄 (${SCAN_ROOTS.join(', ')})`,
  );
  for (const s of report.summary) {
    const mark = s.status === 'pass' ? 'PASS' : s.severity === 'blocker' ? 'BLOCKER' : 'MAJOR';
    console.log(
      `[code-quality] 축 ${s.axis} ${s.id.padEnd(16)} ${String(s.measured).padStart(3)}건 / 임계 ${s.threshold} — ${mark}  (${s.scanned})`,
    );
  }
  for (const v of report.violations.filter((x) => x.severity === 'blocker').slice(0, 30)) {
    console.error(
      `[code-quality] BLOCKER ${v.id} ${v.file}:${v.line} [${v.symbol}] — ${v.measured}`,
    );
  }
  console.log(`[code-quality] 리포트: ${paths.json}, ${paths.md}`);

  if (report.counts.blocker > 0) {
    console.error(
      `[code-quality] blocker ${report.counts.blocker}건 → PR 차단 (exit 1). major ${report.counts.major}건.`,
    );
    process.exitCode = 1;
    return;
  }
  if (report.counts.major > 0) {
    console.warn(
      `[code-quality] blocker 0건 → 통과 (exit 0). major ${report.counts.major}건은 경고로 남는다 — 리포트 참조.`,
    );
    process.exitCode = 0;
    return;
  }
  console.log('[code-quality] 6축 전부 임계값 이내 — 위반 0건 (exit 0)');
  process.exitCode = 0;
}

try {
  main();
} catch (e) {
  console.error(`[code-quality] 실행 오류: ${(e as Error).message}`);
  process.exitCode = 2;
}
