/**
 * @tds/naming-guard — 네이밍 규칙 강제 진입점 (네이밍 가드 Naming Convention AI)
 *
 * 실행:
 *   pnpm naming:check                               # 전체 스캔
 *   pnpm --filter @tds/naming-guard run check --staged   # git diff --cached 대상만 (pre-commit)
 *
 * 산출물: reports/naming/naming-report.json + naming-report.md
 * 종료 코드: 위반 1건 이상 → 1 (커밋 차단), 통과 → 0, 실행 오류 → 2
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findRepoRoot, walkFiles } from './lib/fsutil.ts';
import type { NamingReport, ScanStats } from './report.ts';
import { writeReport } from './report.ts';
import type { Violation } from './rules.ts';
import {
  checkContractContent,
  checkContractFileNames,
  checkIconFiles,
  checkTokenPaths,
  checkUiPaths,
} from './rules.ts';

/** git 스테이징 영역의 파일 목록 (추가/복사/수정/이름변경만 — 삭제 제외) */
function gitStagedFiles(root: string): string[] {
  const res = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(`git diff --cached 실행 실패: ${res.stderr || res.error?.message || ''}`);
  }
  return res.stdout.split('\0').filter((s) => s.length > 0);
}

interface Targets {
  uiFiles: string[];
  contractFiles: string[];
  iconFiles: string[];
  scanTokens: boolean;
}

function collectTargets(root: string, staged: boolean): Targets {
  if (staged) {
    const files = gitStagedFiles(root);
    return {
      uiFiles: files.filter((p) => p.startsWith('packages/ui/src/')),
      contractFiles: files.filter((p) => /^contracts\/[^/]+\.json$/.test(p)),
      iconFiles: files.filter((p) => p.startsWith('assets/icons/') && p.endsWith('.svg')),
      scanTokens:
        files.includes('tokens/tokens.json') &&
        fs.existsSync(path.join(root, 'tokens', 'tokens.json')),
    };
  }
  return {
    uiFiles: walkFiles(path.join(root, 'packages', 'ui', 'src')).map((r) => `packages/ui/src/${r}`),
    contractFiles: walkFiles(path.join(root, 'contracts'))
      .filter((r) => !r.includes('/') && r.endsWith('.json'))
      .map((r) => `contracts/${r}`),
    iconFiles: walkFiles(path.join(root, 'assets', 'icons'))
      .filter((r) => r.endsWith('.svg'))
      .map((r) => `assets/icons/${r}`),
    scanTokens: fs.existsSync(path.join(root, 'tokens', 'tokens.json')),
  };
}

function main(): void {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const staged = args.includes('--staged');

  const root = findRepoRoot(process.cwd());
  const targets = collectTargets(root, staged);
  const violations: Violation[] = [];

  // 1) packages/ui/src/** 폴더/파일 규칙
  violations.push(...checkUiPaths(targets.uiFiles));

  // 2) 계약 파일명 + 내용(boolean prop, 이벤트) 규칙
  violations.push(...checkContractFileNames(targets.contractFiles));
  for (const rel of targets.contractFiles) {
    // staged 모드에서 새 파일은 워킹트리 내용으로 검사 (커밋 전 가드 목적상 충분)
    if (rel.endsWith('.contract.json') && fs.existsSync(path.join(root, ...rel.split('/')))) {
      violations.push(...checkContractContent(root, rel));
    }
  }

  // 3) tokens.json 경로 세그먼트 규칙
  if (targets.scanTokens) {
    violations.push(...checkTokenPaths(root));
  }

  // 4) 아이콘 파일명 규칙
  violations.push(...checkIconFiles(targets.iconFiles));

  const stats: ScanStats = {
    mode: staged ? 'staged' : 'full',
    uiFiles: targets.uiFiles.length,
    contractFiles: targets.contractFiles.length,
    iconFiles: targets.iconFiles.length,
    tokensScanned: targets.scanTokens,
  };
  const report: NamingReport = {
    generatedAt: new Date().toISOString(),
    mode: stats.mode,
    stats,
    violationCount: violations.length,
    violations,
  };
  writeReport(root, report);

  console.log(
    `[naming-guard] ${staged ? '--staged' : '전체'} 스캔 — UI ${stats.uiFiles} · 계약 ${stats.contractFiles} · 아이콘 ${stats.iconFiles} · tokens.json ${stats.tokensScanned ? 'O' : 'X'}`,
  );
  if (violations.length > 0) {
    const shown = violations.slice(0, 30);
    for (const v of shown) {
      console.error(`[naming-guard] 위반 (${v.rule}) ${v.path} — ${v.message}`);
    }
    if (violations.length > shown.length) {
      console.error(`[naming-guard] ... 외 ${violations.length - shown.length}건 (리포트 참조)`);
    }
    console.error(
      `[naming-guard] 위반 ${violations.length}건 → 커밋 차단 (reports/naming/naming-report.md)`,
    );
    process.exitCode = 1;
  } else {
    console.log('[naming-guard] 위반 0건 — 통과 (reports/naming/naming-report.md)');
    process.exitCode = 0;
  }
}

try {
  main();
} catch (e) {
  console.error(`[naming-guard] 실행 오류: ${(e as Error).message}`);
  process.exitCode = 2;
}
