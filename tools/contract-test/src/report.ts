/**
 * 리포트 기록 — reports/contract-test/<component>.json + summary.md
 * 리포트 경로 소유: A74 (orchestration/registry/agents.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './lib/fsutil.ts';
import type { AxisId, ComponentReport } from './lib/types.ts';

const AXIS_ORDER: AxisId[] = ['react', 'storybook', 'figma', 'token'];
const AXIS_LABELS: Record<AxisId, string> = {
  react: 'React',
  storybook: 'Storybook',
  figma: 'Figma',
  token: 'Token',
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_');
}

function axisStatusOf(report: ComponentReport, axis: AxisId): string {
  return report.axes.find((a) => a.axis === axis)?.status ?? '-';
}

export function buildSummaryMd(reports: ComponentReport[], generatedAt: string): string {
  const pass = reports.filter((r) => r.status === 'PASS').length;
  const fail = reports.filter((r) => r.status === 'FAIL').length;
  const skip = reports.filter((r) => r.status === 'SKIP').length;
  const totalMismatch = reports.reduce((n, r) => n + r.mismatchCount, 0);

  const lines: string[] = [];
  lines.push('# Contract Test — 4자 일치 검증 리포트');
  lines.push('');
  lines.push('> Contract ↔ React ↔ Storybook ↔ Figma ↔ Token 일치 검증 (A74, 설계서 §5.3)');
  lines.push('> 불일치 1건이라도 있으면 exit 1 → G5/G6/G7 동시 차단.');
  lines.push('> SKIP = 구현 산출물이 아직 없는 계약 (부트스트랩 단계 — 차단하지 않음).');
  lines.push('');
  lines.push(`- 실행 시각: ${generatedAt}`);
  lines.push(`- 대상 계약: ${reports.length}건 — PASS ${pass} · FAIL ${fail} · SKIP ${skip}`);
  lines.push(`- 불일치 합계: ${totalMismatch}건`);
  lines.push(`- 최종 판정: ${fail > 0 ? 'FAIL (게이트 차단)' : 'PASS (차단 없음)'}`);
  lines.push('');

  if (reports.length === 0) {
    lines.push(
      '검증할 계약(contracts/*.contract.json)이 없습니다. 파이프라인은 차단하지 않습니다.',
    );
    lines.push('');
    return lines.join('\n');
  }

  lines.push('| 컴포넌트 | 계약 버전 | React | Storybook | Figma | Token | 불일치 | 상태 |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of reports) {
    const cols = AXIS_ORDER.map((a) => axisStatusOf(r, a)).join(' | ');
    lines.push(
      `| ${r.component} | ${r.contractVersion} | ${cols} | ${r.mismatchCount} | ${r.status} |`,
    );
  }
  lines.push('');

  const failed = reports.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    lines.push('## 불일치 상세');
    lines.push('');
    for (const r of failed) {
      lines.push(`### ${r.component}@${r.contractVersion} (${r.contractPath})`);
      if (r.error) {
        lines.push(`- [계약] ${r.error}`);
      }
      for (const axis of r.axes) {
        for (const c of axis.checks) {
          if (c.status !== 'FAIL') continue;
          lines.push(`- [${AXIS_LABELS[axis.axis]}] ${c.title} — ${c.detail ?? '상세 없음'}`);
        }
      }
      lines.push('');
    }
  }

  const skipped = reports.filter((r) => r.status === 'SKIP');
  if (skipped.length > 0) {
    lines.push('## SKIP (구현 전 계약)');
    lines.push('');
    for (const r of skipped) {
      lines.push(`- ${r.component}@${r.contractVersion} — 4개 축 모두 산출물 미생성 (차단 아님)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** 컴포넌트별 JSON + summary.md 를 reports/contract-test/ 에 기록한다. */
export function writeReports(root: string, reports: ComponentReport[], generatedAt: string): void {
  const dir = path.join(root, 'reports', 'contract-test');
  ensureDir(dir);
  for (const r of reports) {
    const file = path.join(dir, `${sanitizeFileName(r.component)}.json`);
    fs.writeFileSync(file, `${JSON.stringify(r, null, 2)}\n`, 'utf8');
  }
  fs.writeFileSync(path.join(dir, 'summary.md'), buildSummaryMd(reports, generatedAt), 'utf8');
}
