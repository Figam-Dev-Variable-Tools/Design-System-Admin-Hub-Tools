/**
 * 리포트 기록 — reports/naming/naming-report.json + naming-report.md
 * 리포트 경로 소유: 네이밍 가드
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './lib/fsutil.ts';
import type { Violation } from './rules.ts';

export interface ScanStats {
  mode: 'full' | 'staged';
  uiFiles: number;
  contractFiles: number;
  iconFiles: number;
  tokensScanned: boolean;
}

export interface NamingReport {
  generatedAt: string;
  mode: 'full' | 'staged';
  stats: ScanStats;
  violationCount: number;
  violations: Violation[];
}

const RULE_LABELS: Record<string, string> = {
  'component-dir': '컴포넌트 폴더 PascalCase',
  'component-file': '컴포넌트 파일 PascalCase',
  'story-file': 'Story 파일 <Name>.stories.tsx',
  'mdx-file': 'MDX 파일 <Name>.mdx',
  'contract-file': '계약 파일 <Name>.contract.json',
  'contract-parse': '계약 JSON 파싱',
  'token-path': '토큰 경로 lowercase+하이픈',
  'token-parse': 'tokens.json 파싱',
  'boolean-prop': 'boolean prop 접두/화이트리스트',
  'event-name': '이벤트 on[A-Z]*',
  'icon-file': '아이콘 파일명 규격',
};

export function buildReportMd(report: NamingReport): string {
  const lines: string[] = [];
  lines.push('# Naming Guard 리포트');
  lines.push('');
  lines.push(
    '> 네이밍 규칙 강제 (네이밍 가드 Naming Convention AI) — 위반 시 커밋 차단 (pre-commit)',
  );
  lines.push('');
  lines.push(`- 실행 시각: ${report.generatedAt}`);
  lines.push(
    `- 모드: ${report.mode === 'staged' ? '--staged (git diff --cached 대상만)' : '전체 스캔'}`,
  );
  lines.push(
    `- 스캔 범위: UI 파일 ${report.stats.uiFiles}건 · 계약 ${report.stats.contractFiles}건 · 아이콘 ${report.stats.iconFiles}건 · tokens.json ${report.stats.tokensScanned ? '검사함' : '대상 아님/미존재'}`,
  );
  lines.push(
    `- 위반: ${report.violationCount}건 → ${report.violationCount > 0 ? '커밋 차단 (exit 1)' : '통과 (exit 0)'}`,
  );
  lines.push('');

  if (report.violations.length === 0) {
    lines.push('위반 없음 — 모든 네이밍 규칙 통과.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| 규칙 | 경로 | 내용 |');
  lines.push('|---|---|---|');
  for (const v of report.violations) {
    const label = RULE_LABELS[v.rule] ?? v.rule;
    lines.push(`| ${label} (\`${v.rule}\`) | \`${v.path}\` | ${v.message.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  lines.push('## 조치');
  lines.push('');
  lines.push('- 위반 파일/키를 규칙에 맞게 개명한 뒤 재커밋한다.');
  lines.push(
    '- 규칙 자체에 이의가 있으면 Architecture AI(아키텍처)에 규칙 개정을 제안한다 — 가드는 우회하지 않는다.',
  );
  lines.push('');
  return lines.join('\n');
}

export function writeReport(root: string, report: NamingReport): void {
  const dir = path.join(root, 'reports', 'naming');
  ensureDir(dir);
  fs.writeFileSync(
    path.join(dir, 'naming-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(path.join(dir, 'naming-report.md'), buildReportMd(report), 'utf8');
}
