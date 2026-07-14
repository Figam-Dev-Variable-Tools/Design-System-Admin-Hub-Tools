/**
 * 리포트 — reports/test-coverage/<scope>.json + .md  (**안정 파일명 · 날짜 없음**)
 *
 * **이 파일은 커밋된다** (축 4 래칫의 기준선 — CI 캐시가 초기화돼도 후퇴를 감지하려면
 * 저장소에 영속돼야 한다. ADR-0010 결정 2). 커밋되는 아티팩트이므로 **결정론적이어야 한다** —
 * **커버리지가 실제로 바뀔 때만 바뀐다.**
 *
 * 그래서 벽시계 값(`generatedAt`)도, 날짜(`date`)도 이 파일에 넣지 않는다:
 *   - `generatedAt` 벽시계 → 실행마다 한 줄이 바뀌어 pre-commit `verify:all` 이 돌 때마다
 *     트리가 더러워진다. 내용 변화가 아니라 소음이다.
 *   - **파일명의 날짜 접두(`YYYY-MM-DD-`)도 결함이었다** — 자정을 넘기면 새 파일이 생겨
 *     옛 기준선이 고아가 되고, 같은 날 두 번 실행해도 "직전 리포트 = 자기 자신"이 되어
 *     `ratchet.source` 가 실행 간에 달라진다. 그래서 **스코프당 파일 하나**(`<scope>.json`)로
 *     제자리 덮어쓴다. 실행 시각은 콘솔과 gitignore 되는 `reports/test-coverage/tmp/` 에만 남긴다.
 *
 * **`NOT_VERIFIED` 와 `PASS` 를 구분해 표기한다.** 이 둘을 같은 초록불로 적는 순간 리포트는 거짓말이 된다.
 * 위반 0건이어도 pass 리포트를 남긴다 (A33/A42가 G5·G6 evidence 로 인용한다).
 * 리포트는 150행 이내 (ADR-0010 T4) — 초과분은 요약 + JSON 경로로 넘긴다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AXES, type AxisSpec, type Severity } from './thresholds.ts';
import { ensureDir } from './lib/fsutil.ts';

/** 덮이지 않은 항목 1건 — (원천 경로 · 항목 · 기대 테스트 이름) 을 반드시 동반한다 */
export interface Gap {
  axis: number;
  id: string;
  severity: Severity;
  /** 원천 — 계약/FS 경로 */
  source: string;
  /** 덮이지 않은 항목 */
  item: string;
  /** 기대 테스트 이름 — 소유자가 그대로 복사해 쓸 수 있어야 한다 */
  expectedTest: string;
  /** 판정 근거 (명세 원문·계약 값) */
  evidence: string;
  gates: string[];
}

export interface AxisResult {
  spec: AxisSpec;
  /** 이 축이 무엇을 얼마나 쟀는가 — 재현성 */
  scanned: string;
  /** 커버된 항목 수 / 전체 항목 수 */
  covered: number;
  total: number;
  gaps: Gap[];
}

/** 단언이 없어 테스트로 세지 않은 실행 단위 — 초록불 뒤의 공집합 */
export interface AssertionFreeUnit {
  file: string;
  line: number;
  name: string;
  kind: string;
}

/** 축 1의 스코프별 행 — 한쪽의 초록이 다른 쪽의 빈칸을 가리지 못하게 한다 */
export interface ScopeRow {
  name: string;
  dir: string;
  testUnits: number;
  assertionFreeUnits: number;
  status: 'PASS' | 'BLOCKER';
}

export interface Report {
  tool: '@tds/test-coverage';
  agent: 'A77';
  scope: string;
  // 주의: `date` · `generatedAt` 등 벽시계 필드는 **의도적으로 없다** (파일 상단 주석 참조).
  //       실행 시각이 필요하면 콘솔 또는 gitignore 되는 tmp/ 런로그를 본다.
  /** PASS | NOT_VERIFIED | FAIL — NOT_VERIFIED 는 통과가 아니다 */
  status: 'PASS' | 'WARN' | 'NOT_VERIFIED' | 'FAIL';
  exitCode: 0 | 1 | 2;
  blockedGates: string[];
  inputs: {
    contracts: number;
    specs: number;
    testFiles: number;
    storyFiles: number;
    /** 단언을 가진 실행 단위 = 진짜 테스트 수 */
    testUnits: number;
    /** 단언이 없어 세지 않은 실행 단위 (play function 등) */
    assertionFreeUnits: number;
  };
  summary: {
    axis: number;
    id: string;
    title: string;
    severity: Severity;
    threshold: string;
    covered: number;
    total: number;
    gaps: number;
    scanned: string;
    status: 'PASS' | 'VIOLATED';
    gates: string[];
  }[];
  /** 축 1 — 워크스페이스에서 파생된 스코프별 판정 */
  scopes: ScopeRow[];
  /** 축 4 래칫 — 후퇴 판정의 기준선 */
  ratchet: { baseline: number; current: number; source: string; regressed: boolean };
  counts: { blocker: number; major: number; total: number };
  gaps: Gap[];
  assertionFree: AssertionFreeUnit[];
  /** 도구가 자기 한계를 스스로 신고하는 자리 — 공허 통과 경로를 숨기지 않는다 */
  selfAudit: string[];
  /** SKILL ↔ 레지스트리 불일치 — 도구가 임의 해소하지 않고 A01에 올린다 */
  discrepancies: string[];
}

export function buildReport(args: {
  scope: string;
  inputs: Report['inputs'];
  results: AxisResult[];
  scopes: ScopeRow[];
  ratchet: Report['ratchet'];
  assertionFree: AssertionFreeUnit[];
  selfAudit: string[];
  discrepancies: string[];
  unmeasurable: boolean;
}): Report {
  const gaps = args.results.flatMap((r) => r.gaps);
  const blocker = gaps.filter((g) => g.severity === 'blocker').length;
  const major = gaps.filter((g) => g.severity === 'major').length;

  const exitCode: 0 | 1 | 2 = args.unmeasurable ? 2 : blocker > 0 ? 1 : 0;
  const status: Report['status'] = args.unmeasurable
    ? 'NOT_VERIFIED'
    : blocker > 0
      ? args.inputs.testUnits === 0
        ? 'NOT_VERIFIED'
        : 'FAIL'
      : major > 0
        ? 'WARN'
        : 'PASS';

  const blockedGates = [
    ...new Set(gaps.filter((g) => g.severity === 'blocker').flatMap((g) => g.gates)),
  ].sort();

  return {
    tool: '@tds/test-coverage',
    agent: 'A77',
    scope: args.scope,
    status,
    exitCode,
    blockedGates,
    inputs: args.inputs,
    summary: AXES.map((spec) => {
      const r = args.results.find((x) => x.spec.id === spec.id);
      return {
        axis: spec.axis,
        id: spec.id,
        title: spec.title,
        severity: spec.severity,
        threshold: spec.threshold,
        covered: r?.covered ?? 0,
        total: r?.total ?? 0,
        gaps: r?.gaps.length ?? 0,
        scanned: r?.scanned ?? '-',
        status: (r?.gaps.length ?? 0) > 0 ? ('VIOLATED' as const) : ('PASS' as const),
        gates: spec.gates,
      };
    }),
    scopes: args.scopes,
    ratchet: args.ratchet,
    counts: { blocker, major, total: gaps.length },
    gaps,
    assertionFree: args.assertionFree,
    selfAudit: args.selfAudit,
    discrepancies: args.discrepancies,
  };
}

const SEV: Record<Severity, string> = { blocker: '**blocker**', major: 'major' };

/** MD 는 150행 이내 (ADR-0010 T4). 넘치면 요약 + JSON 경로만 남긴다. */
const MAX_ROWS_PER_AXIS = 12;

export function renderMarkdown(report: Report): string {
  const L: string[] = [];
  const r = report;

  L.push(`# Test Coverage 리포트 — ${r.scope}`);
  L.push('');
  L.push('> 생성: `@tds/test-coverage` (A77 Test Coverage Guard) — 기계 생성 전용, 수기 편집 금지');
  L.push(
    '> 커밋되는 기준선이다 — **커버리지가 실제로 바뀔 때만 바뀐다.** 실행 시각은 여기 없다(콘솔/tmp 참조).',
  );
  L.push('> **커버리지는 라인 %가 아니다.** 계약이 정의한 상태 전부 + FS가 정의한 예외 축 전부다.');
  L.push('');
  L.push(
    `- 판정: **${r.status}** (exit ${r.exitCode}) — blocker ${r.counts.blocker}건 · major ${r.counts.major}건`,
  );
  if (r.blockedGates.length > 0) L.push(`- 차단 게이트: **${r.blockedGates.join(' · ')} BLOCKED**`);
  L.push(
    `- 입력: 계약 ${r.inputs.contracts}종 · FS ${r.inputs.specs}건 · 테스트 파일 ${r.inputs.testFiles}개 · 스토리 파일 ${r.inputs.storyFiles}개`,
  );
  L.push(
    `- **단언을 가진 실행 단위(= 테스트): ${r.inputs.testUnits}건** / 단언 없는 실행 단위: ${r.inputs.assertionFreeUnits}건`,
  );
  L.push('');

  if (r.status === 'NOT_VERIFIED') {
    L.push('> ## NOT_VERIFIED — 이것은 PASS 가 아니다');
    L.push('>');
    L.push(
      '> 테스트가 0건이거나 원천이 없어 **대조가 성립하지 않았다.** `pnpm test` 가 `--passWithNoTests` 로',
    );
    L.push(
      '> exit 0 을 돌려주더라도 그 초록불은 공집합 위에서 참인 명제이며, 아무것도 보증하지 않는다.',
    );
    L.push('');
  }

  L.push('## 축별 요약');
  L.push('');
  L.push('| # | 축 | 심각도 | 커버 | 전체 | 미커버 | 임계값 | 게이트 | 판정 |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const s of r.summary) {
    L.push(
      `| ${s.axis} | ${s.title} | ${SEV[s.severity]} | ${s.covered} | ${s.total} | ${s.gaps} | ${s.threshold} | ${s.gates.join('·')} | ${s.status} |`,
    );
  }
  L.push('');

  L.push('### 축 1 — 스코프별 (워크스페이스 파생)');
  L.push('');
  L.push(
    '`pnpm-workspace.yaml` 에서 파생한다 — 새 앱/패키지는 자동 편입된다. **한쪽의 초록이 다른 쪽의 빈칸을 가리지 못한다.**',
  );
  L.push('');
  L.push('| 스코프 | 경로 | 테스트 (단언 有) | 단언 없는 실행 단위 | 판정 |');
  L.push('|---|---|---|---|---|');
  for (const s of r.scopes) {
    L.push(
      `| ${s.name} | \`${s.dir}\` | **${s.testUnits}** | ${s.assertionFreeUnits} | ${s.status === 'PASS' ? 'PASS' : '**BLOCKER**'} |`,
    );
  }
  L.push('');

  L.push('### 축 4 — 래칫 (후퇴 금지)');
  L.push('');
  L.push(
    `- 기준선 **${r.ratchet.baseline}칸** · 현재 **${r.ratchet.current}칸** → ${
      r.ratchet.regressed
        ? `**후퇴 ${r.ratchet.baseline - r.ratchet.current}칸 → BLOCKER**`
        : '후퇴 없음'
    }`,
  );
  L.push(`- 기준선 출처: \`${r.ratchet.source}\``);
  L.push(
    '- 축 4는 major 다 — **새 테스트를 요구하지 않는다.** 그러나 **있던 커버리지를 잃으면 blocker** 다. 커버 칸 수는 단조 증가만 한다.',
  );
  L.push('');

  if (r.assertionFree.length > 0) {
    L.push(`## 단언 없는 실행 단위 — ${r.assertionFree.length}건 (테스트로 세지 않는다)`);
    L.push('');
    L.push(
      '`expect` 가 없는 play function 은 **실패할 수 없다.** 실패할 수 없는 것은 검증하지 않는다 —',
    );
    L.push(
      '`--passWithNoTests` 가 공집합 위에서 참인 것과 같은 종류의 초록불이다. 상태를 *만들기만* 하고 아무것도 단언하지 않는다.',
    );
    L.push('');
    const byFile = new Map<string, number>();
    for (const u of r.assertionFree) byFile.set(u.file, (byFile.get(u.file) ?? 0) + 1);
    L.push('| 파일 | 단언 없는 단위 |');
    L.push('|---|---|');
    for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
      L.push(`| \`${f}\` | ${n}건 |`);
    }
    if (byFile.size > 12) L.push(`| … 외 ${byFile.size - 12}개 파일 (JSON 참조) | |`);
    L.push('');
  }

  for (const spec of AXES) {
    const gaps = r.gaps.filter((g) => g.id === spec.id);
    if (gaps.length === 0) continue;
    L.push(`## 축 ${spec.axis} — ${spec.title} (${gaps.length}건, ${spec.severity})`);
    L.push('');
    L.push('| 원천 | 덮이지 않은 항목 | 기대 테스트 이름 |');
    L.push('|---|---|---|');
    for (const g of gaps.slice(0, MAX_ROWS_PER_AXIS)) {
      L.push(`| \`${g.source}\` | ${esc(g.item)} | \`${esc(g.expectedTest)}\` |`);
    }
    if (gaps.length > MAX_ROWS_PER_AXIS) {
      L.push(
        `| … 외 **${gaps.length - MAX_ROWS_PER_AXIS}건** | 전수 목록은 JSON 리포트 \`gaps[]\` 참조 | |`,
      );
    }
    L.push('');
  }

  if (r.discrepancies.length > 0) {
    L.push('## SKILL ↔ 레지스트리 불일치 (A01 판정 요청 — 도구가 임의 해소하지 않는다)');
    L.push('');
    for (const d of r.discrepancies) L.push(`- ${d}`);
    L.push('');
  }

  L.push('## 자기 감사 — 이 도구가 공허 통과할 수 있는 경로');
  L.push('');
  L.push(
    '검증기를 검증하는 자가 없다는 것이 이 조직의 반복 패턴이다. A77은 자기 한계를 스스로 신고한다.',
  );
  L.push('');
  for (const s of r.selfAudit) L.push(`- ${s}`);
  L.push('');

  L.push('## 조치 주체');
  L.push('');
  L.push('- A77은 **측정만** 한다 — 테스트를 대신 쓰지 않는다. 없다는 사실을 증명할 뿐이다.');
  L.push(
    '  - `packages/ui/src/**/*.test.*` · `*.stories.tsx` play → **A30** / `apps/*/src/**/*.test.*` → **A40** / `e2e/**` → **A85**',
  );
  L.push('- 하한 조정 요청은 **A01(ADR)**. 미달이 많다고 하한을 내리지 않는다.');
  L.push('- 계약 `states` 공백 → **A18** 경유 A19 / FS 예외 표 공백 → **A62** 경유 A64.');
  L.push('');
  return L.join('\n');
}

function esc(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * 커밋되는 기준선을 **안정 파일명**으로 제자리 덮어쓴다: `reports/test-coverage/<scope>.json` + `.md`.
 * 날짜 접두가 없으므로 자정을 넘겨도 새 파일이 생기지 않고, 같은 입력이면 바이트가 동일하다.
 */
export function writeReport(root: string, report: Report): { json: string; md: string } {
  const dir = path.join(root, 'reports', 'test-coverage');
  ensureDir(dir);
  const stem = report.scope;
  fs.writeFileSync(path.join(dir, `${stem}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(dir, `${stem}.md`), renderMarkdown(report), 'utf8');
  return {
    json: `reports/test-coverage/${stem}.json`,
    md: `reports/test-coverage/${stem}.md`,
  };
}
