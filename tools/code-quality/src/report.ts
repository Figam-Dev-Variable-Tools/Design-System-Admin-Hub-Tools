/**
 * 리포트 — reports/code-quality/<date>.json + <date>.md
 * (reports/README.md 규격: 날짜 접두 `YYYY-MM-DD`. 기계 생성 전용, 수기 편집 금지)
 *
 * 리포트 규칙 (SKILL): 모든 항목은 **측정값 + 임계값 + 위반 위치(file:line)** 를 동반한다.
 * 수치 없는 지적("복잡도가 높음")은 리포트에 실을 수 없다 — 재현 가능해야 차단할 수 있다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AXES, type AxisSpec, type Severity } from './thresholds.ts';
import { ensureDir } from './lib/fsutil.ts';

export interface Violation {
  axis: number;
  id: string;
  severity: Severity;
  /** 위반 위치 — 리포 루트 기준 POSIX 상대경로 */
  file: string;
  line: number;
  symbol: string;
  /** 측정값 (숫자 또는 "pages/admins → pages/members" 같은 판정 근거) */
  measured: string;
  threshold: string;
  message: string;
  suggestion: string;
  /** 중복·결합처럼 상대편 위치가 있는 경우 */
  related?: { file: string; line: number }[];
}

/** 규칙에 정의되지 않은 의심 사례 — 차단하지 않는다. 아키텍처에 규칙 제정 요청용 */
export interface UndefinedCase {
  file: string;
  line: number;
  note: string;
}

export interface AxisResult {
  spec: AxisSpec;
  /** 이 축의 측정 대상 규모 (재현성 — "무엇을 얼마나 쟀는가") */
  scanned: string;
  violations: Violation[];
}

export interface Report {
  tool: '@tds/code-quality';
  agent: 'clean-code-inspector';
  date: string;
  generatedAt: string;
  status: 'pass' | 'warn' | 'fail';
  exitCode: 0 | 1;
  scope: { roots: string[]; files: number; lines: number };
  summary: {
    axis: number;
    id: string;
    title: string;
    severity: Severity;
    threshold: string;
    measured: number;
    scanned: string;
    status: 'pass' | 'violated';
  }[];
  counts: { blocker: number; major: number; total: number };
  violations: Violation[];
  undefined: UndefinedCase[];
}

export function buildReport(
  date: string,
  scope: { roots: string[]; files: number; lines: number },
  results: AxisResult[],
  undefinedCases: UndefinedCase[],
): Report {
  const violations = results.flatMap((r) => r.violations);
  const blocker = violations.filter((v) => v.severity === 'blocker').length;
  const major = violations.filter((v) => v.severity === 'major').length;
  const exitCode: 0 | 1 = blocker > 0 ? 1 : 0;
  const status: Report['status'] = blocker > 0 ? 'fail' : major > 0 ? 'warn' : 'pass';

  return {
    tool: '@tds/code-quality',
    agent: 'clean-code-inspector',
    date,
    generatedAt: new Date().toISOString(),
    status,
    exitCode,
    scope,
    summary: AXES.map((spec) => {
      const r = results.find((x) => x.spec.id === spec.id);
      const count = r?.violations.length ?? 0;
      return {
        axis: spec.axis,
        id: spec.id,
        title: spec.title,
        severity: spec.severity,
        threshold: spec.threshold,
        measured: count,
        scanned: r?.scanned ?? '-',
        status: count > 0 ? ('violated' as const) : ('pass' as const),
      };
    }),
    counts: { blocker, major, total: violations.length },
    violations,
    undefined: undefinedCases,
  };
}

const SEVERITY_LABEL: Record<Severity, string> = {
  blocker: '**blocker**',
  major: 'major',
};

export function renderMarkdown(report: Report): string {
  const L: string[] = [];
  L.push(`# Code Quality 리포트 — ${report.date}`);
  L.push('');
  L.push(
    '> 생성: `@tds/code-quality` (클린코드 점검 Clean Code Inspector) — 기계 생성 전용, 수기 편집 금지',
  );
  L.push('> 판정은 **6축의 수치 위반**으로만 한다. "읽기 좋다/나쁘다"는 판정 사유가 아니다.');
  L.push('');
  L.push(
    `- 판정: **${report.status.toUpperCase()}** (exit ${report.exitCode}) — blocker ${report.counts.blocker}건 · major ${report.counts.major}건`,
  );
  L.push(`- 정책: blocker ≥ 1 → exit 1 (PR 차단) / major 만 → exit 0 (경고, 리뷰 evidence)`);
  L.push(
    `- 스캔: ${report.scope.roots.join(', ')} — 파일 ${report.scope.files}건 · ${report.scope.lines}줄`,
  );
  L.push('');
  L.push('| # | 축 | 심각도 | 측정값 | 임계값 | 측정 범위 | 판정 |');
  L.push('|---|---|---|---|---|---|---|');
  for (const s of report.summary) {
    L.push(
      `| ${s.axis} | ${s.title} | ${SEVERITY_LABEL[s.severity]} | ${s.measured}건 | ${s.threshold} | ${s.scanned} | ${s.status === 'pass' ? 'PASS' : 'VIOLATED'} |`,
    );
  }
  L.push('');

  if (report.violations.length === 0) {
    L.push('## 위반 상세');
    L.push('');
    L.push(
      '위반 0건 — 6축 전부 임계값 이내. (코드 리뷰 Code Reviewer 는 G6 검수에서 이 리포트를 evidence 로 인용한다.)',
    );
    L.push('');
  } else {
    for (const spec of AXES) {
      const vs = report.violations.filter((v) => v.id === spec.id);
      if (vs.length === 0) continue;
      L.push(`## 축 ${spec.axis} — ${spec.title} (${vs.length}건, ${spec.severity})`);
      L.push('');
      L.push(`임계값: **${spec.threshold}**`);
      L.push('');
      L.push('| 위치 (file:line) | 심볼 | 측정값 | 조치 |');
      L.push('|---|---|---|---|');
      for (const v of vs.slice(0, 100)) {
        const related =
          v.related && v.related.length > 0
            ? `<br/>↔ ${v.related.map((r) => `\`${r.file}:${r.line}\``).join(', ')}`
            : '';
        L.push(
          `| \`${v.file}:${v.line}\`${related} | \`${v.symbol}\` | ${esc(v.measured)} | ${esc(v.suggestion)} |`,
        );
      }
      if (vs.length > 100) L.push(`| … 외 ${vs.length - 100}건 (JSON 리포트 참조) | | | |`);
      L.push('');
    }
  }

  if (report.undefined.length > 0) {
    L.push('## UNDEFINED — 규칙 미정의 (차단하지 않음)');
    L.push('');
    L.push('규칙에 없는 문제는 차단하지 않는다. 아키텍처에 규칙 제정(ADR)을 요청한다.');
    L.push('');
    for (const u of report.undefined) {
      L.push(`- \`${u.file}:${u.line}\` — ${u.note}`);
    }
    L.push('');
  }

  L.push('## 조치 주체');
  L.push('');
  L.push(
    '- 클린코드 점검은 **측정만** 한다 — 위반 코드를 수정하지 않는다. 수정은 소유자의 일이다 (P1 단일 소유권).',
  );
  L.push(
    '  - `apps/**` → 프론트 구현/프론트 리팩터 · `packages/**` → 컴포넌트 엔지니어/스토리북 문서/스토리북 페이지',
  );
  L.push(
    '- 임계값에 이의가 있으면 아키텍처에 **ADR**을 요청한다. 임계값은 도구가 임의로 바꾸지 않는다.',
  );
  L.push('');
  return L.join('\n');
}

function esc(s: string): string {
  return s.replace(/\|/g, '\\|');
}

export function writeReport(root: string, report: Report): { json: string; md: string } {
  const dir = path.join(root, 'reports', 'code-quality');
  ensureDir(dir);
  const json = path.join(dir, `${report.date}.json`);
  const md = path.join(dir, `${report.date}.md`);
  fs.writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(md, renderMarkdown(report), 'utf8');
  return {
    json: `reports/code-quality/${report.date}.json`,
    md: `reports/code-quality/${report.date}.md`,
  };
}
