/**
 * @tds/drift — Design Drift 상시 감시 엔트리 (디자인 드리프트 Design Drift AI 소유)
 *
 * 검사 항목:
 *   (a) stale-codegen : `pnpm --filter @tds/codegen run check` 재실행으로 계약 대비
 *       오래된(stale) 생성물 검출 — 생성물은 손으로 쓰지 않는다는 SSOT 원칙의 감시자
 *   (b) hardcoded-values : packages/ui/src 하드코딩 스캔 (contract-test와 동일 정규식,
 *       단 여기서는 severity "warning"으로 수집만 — 차단은 계약 테스트 관할)
 *   (c) unused-tokens : tokens.json 전체 토큰 대비 미참조 토큰 비율 계산
 *       (계약 tokens 블록 + 계약 responsive.breakpoints + DTCG alias +
 *        TOKEN_USAGE_ROOTS 의 var(--tds-*) 대조 — 정확/접두 일치),
 *       5% 초과 시 정리 요구 플래그 (G4 체크리스트 "미사용 토큰 누적 5% 초과 시 정리 요구")
 *
 *       ⚠ 이 수치는 **지우기 위한 근거**로 쓰인다. 오검출은 곧 "쓰는 토큰을 지워라"라는
 *       지시가 된다. 그래서 사용처 판정은 세 채널을 모두 봐야 한다 — 하나라도 빠지면
 *       그 채널로만 쓰이는 토큰이 통째로 '미사용'이 된다. 과거 세 채널이 다 새고 있었다:
 *         · 스캔 루트가 packages/ui/src 뿐 → 앱 전용 토큰이 미사용으로 계수
 *         · 정확 일치만 → composite 토큰(typography.*)이 영원히 미사용
 *         · 계약의 responsive.breakpoints 미독해 → breakpoint.* 가 영원히 미사용
 *           (breakpoint 는 CSS 스펙상 var() 로 쓸 수 없어 이 채널 말고는 구제 수단이 없다)
 *
 * 출력: reports/drift/<date>.json + reports/drift/<date>.md
 * 종료 코드: 0 = 드리프트 없음 / 2 = 드리프트 발견 (알림 레벨 — CI에서 자동 Fix PR 트리거용)
 *   ※ 디자인 드리프트은 게이트를 차단하지 않는다 (레지스트리 blockCondition: "차단 없음 — 알림 + Fix PR",
 *     수정 리드타임 SLO 24h). exit 2는 실패가 아니라 "Fix PR 파이프라인 기동" 신호다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { HARDCODE_RULES, IGNORE_MARKER, SCAN_EXTENSIONS } from './rules';
import {
  analyzeUnusedTokens,
  collectContractTokenRefs,
  collectCssVarUsage,
  type UnusedTokenAnalysis,
} from './tokens';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** 하드코딩 스캔 대상 — DS 컴포넌트 소스. (b) 검사 전용. */
const UI_SRC = path.join(REPO_ROOT, 'packages', 'ui', 'src');

/**
 * **토큰 사용처** 스캔 루트 — (c) 미사용 토큰 검사 전용.
 *
 * 예전에는 UI_SRC 한 곳만 봤다. 그런데 토큰을 가장 많이 소비하는 곳은 **앱**이다
 * (실측: apps/admin/src 216개 파일 vs packages/ui/src 101개 파일). 앱에서만 쓰는 토큰은
 * 전부 '미사용'으로 계수됐고, 그 수치를 믿고 토큰을 지우면 **앱이 깨진다.**
 * 지금 그 사고가 안 난 것은 규칙이 옳아서가 아니라 `radius.lg` 같은 것들이 우연히
 * tokens.json 내부 alias 로 참조돼 있었기 때문이다 — 설계가 아니라 요행이다.
 *
 * 하드코딩 스캔(b)은 여기 합류시키지 않는다: 그 규칙은 'DS 컴포넌트가 토큰 대신 리터럴을
 * 쓰지 않는가'를 보는 것이고, 소유(디자인 드리프트/계약 테스트)와 규칙 범위가 다르다. 범위를 넓히면 검사의
 * 의미가 바뀐다 — 이 커밋이 고치는 것은 **오계수**이지 규칙이 아니다.
 */
const TOKEN_USAGE_ROOTS = [
  UI_SRC,
  path.join(REPO_ROOT, 'packages', 'ui', 'pages'),
  path.join(REPO_ROOT, 'packages', 'ui', '.storybook'),
  path.join(REPO_ROOT, 'apps', 'admin', 'src'),
];

const TOKENS_JSON = path.join(REPO_ROOT, 'tokens', 'tokens.json');
const CONTRACTS_DIR = path.join(REPO_ROOT, 'contracts');
const CODEGEN_PKG = path.join(REPO_ROOT, 'tools', 'codegen', 'package.json');
const REPORT_DIR = path.join(REPO_ROOT, 'reports', 'drift');

const DATE = new Date().toISOString().slice(0, 10);
/** G4 체크리스트: 미사용 토큰 누적 5% 초과 시 정리 요구 */
const UNUSED_TOKEN_THRESHOLD = 0.05;

type CheckStatus = 'clean' | 'drift' | 'skipped';

interface Finding {
  file?: string;
  line?: number;
  rule?: string;
  match?: string;
  snippet?: string;
  detail?: string;
}

interface CheckResult {
  id: string;
  title: string;
  status: CheckStatus;
  severity: 'error' | 'warning' | null;
  summary: string;
  findings: Finding[];
}

function rel(p: string): string {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function walkFiles(dir: string, extensions: string[], out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walkFiles(full, extensions, out);
    } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/* ── (a) stale codegen 생성물 검출 ─────────────────────────────────────── */
function checkStaleCodegen(): CheckResult {
  const base = { id: 'stale-codegen', title: 'codegen --check 재실행 (stale 생성물 검출)' };
  if (!fs.existsSync(CODEGEN_PKG)) {
    return {
      ...base,
      status: 'skipped',
      severity: null,
      summary: 'tools/codegen 패키지가 아직 없어 건너뜀 (P1 SSOT 단계에서 생성 예정)',
      findings: [],
    };
  }
  // 의존성 미설치 상태에서 pnpm run은 항상 실패한다 — 환경 문제를 드리프트로 오판하지 않도록 사전 확인
  if (!fs.existsSync(path.join(REPO_ROOT, 'node_modules'))) {
    return {
      ...base,
      status: 'skipped',
      severity: null,
      summary: '워크스페이스 의존성 미설치로 건너뜀 — `pnpm install` 후 다시 실행',
      findings: [],
    };
  }

  // 인자를 개별 배열이 아닌 단일 명령 문자열로 전달 (shell:true + args 배열은 DEP0190)
  const run = spawnSync('pnpm --filter @tds/codegen run check', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: true,
    timeout: 120_000,
  });

  if (run.error) {
    return {
      ...base,
      status: 'skipped',
      severity: null,
      summary: `pnpm 실행 실패로 건너뜀: ${run.error.message}`,
      findings: [],
    };
  }
  if (run.status === 0) {
    return {
      ...base,
      status: 'clean',
      severity: null,
      summary: '생성물이 계약과 일치',
      findings: [],
    };
  }
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  // 실행 환경 문제(도구 미설치 등)로 인한 실패는 드리프트가 아니다
  if (/not recognized|command not found|Cannot find module|node_modules missing/i.test(output)) {
    return {
      ...base,
      status: 'skipped',
      severity: null,
      summary: 'codegen 실행 환경 미구성으로 건너뜀 — `pnpm install` 후 다시 실행',
      findings: [],
    };
  }
  const tail = output.trim().split('\n').slice(-20).join('\n');
  return {
    ...base,
    status: 'drift',
    severity: 'error',
    summary: '계약 대비 stale 생성물 검출 — `pnpm codegen` 재실행으로 갱신 필요',
    findings: [{ detail: tail }],
  };
}

/* ── (b) packages/ui/src 하드코딩 스캔 ─────────────────────────────────── */
function checkHardcodedValues(): CheckResult {
  const base = {
    id: 'hardcoded-values',
    title: 'packages/ui/src 하드코딩 스캔 (severity: warning)',
  };
  if (!fs.existsSync(UI_SRC)) {
    return {
      ...base,
      status: 'skipped',
      severity: null,
      summary: 'packages/ui/src 가 아직 없어 건너뜀',
      findings: [],
    };
  }

  const findings: Finding[] = [];
  for (const file of walkFiles(UI_SRC, SCAN_EXTENSIONS)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.includes(IGNORE_MARKER)) return;
      for (const rule of HARDCODE_RULES) {
        for (const m of line.matchAll(rule.pattern)) {
          findings.push({
            file: rel(file),
            line: i + 1,
            rule: rule.id,
            match: m[0],
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    });
  }

  if (findings.length === 0) {
    return {
      ...base,
      status: 'clean',
      severity: null,
      summary: '하드코딩 값 0건 (SLO 충족)',
      findings: [],
    };
  }
  return {
    ...base,
    status: 'drift',
    severity: 'warning',
    summary: `하드코딩 값 ${findings.length}건 — SLO 목표 0건 (게이트 정의 slo.hardcodedValues)`,
    findings,
  };
}

/* ── (c) 미사용 토큰 비율 ──────────────────────────────────────────────── */
function checkUnusedTokens(): CheckResult & { analysis?: UnusedTokenAnalysis } {
  const base = { id: 'unused-tokens', title: '미사용 토큰 비율 (5% 초과 시 정리 요구)' };
  if (!fs.existsSync(TOKENS_JSON)) {
    return {
      ...base,
      status: 'skipped',
      severity: null,
      summary: 'tokens/tokens.json 이 아직 없어 건너뜀',
      findings: [],
    };
  }

  let tokensJson: unknown;
  try {
    tokensJson = JSON.parse(fs.readFileSync(TOKENS_JSON, 'utf8'));
  } catch (err) {
    return {
      ...base,
      status: 'drift',
      severity: 'error',
      summary: `tokens.json 파싱 실패: ${err instanceof Error ? err.message : String(err)}`,
      findings: [],
    };
  }

  const contractRefs = collectContractTokenRefs(CONTRACTS_DIR);
  const usageFiles = TOKEN_USAGE_ROOTS.filter((root) => fs.existsSync(root)).flatMap((root) =>
    walkFiles(root, SCAN_EXTENSIONS),
  );
  const cssVarUsage = collectCssVarUsage(usageFiles);
  const analysis = analyzeUnusedTokens(tokensJson, contractRefs, cssVarUsage);

  const pct = (analysis.unusedRatio * 100).toFixed(1);
  if (analysis.unusedRatio > UNUSED_TOKEN_THRESHOLD) {
    return {
      ...base,
      status: 'drift',
      severity: 'warning',
      summary: `미사용 토큰 ${analysis.unusedCount}/${analysis.totalTokens}건 (${pct}%) — 5% 초과, 토큰 엔지니어(Token Engineer)에 정리 요구`,
      findings: analysis.unused.map((tokenPath) => ({ detail: tokenPath })),
      analysis,
    };
  }
  return {
    ...base,
    status: 'clean',
    severity: null,
    summary: `미사용 토큰 ${analysis.unusedCount}/${analysis.totalTokens}건 (${pct}%) — 임계치 이내`,
    findings: [],
    analysis,
  };
}

/* ── 리포트 생성 ───────────────────────────────────────────────────────── */
function renderMarkdown(checks: CheckResult[], status: string, exitCode: number): string {
  const lines: string[] = [
    `# Drift 리포트 — ${DATE}`,
    '',
    '> 생성: `@tds/drift` (디자인 드리프트 Design Drift AI) — 기계 생성 전용, 수기 편집 금지',
    '',
    `- 판정: **${status}** (exit ${exitCode})`,
    `- 정책: 드리프트 발견 = 알림 레벨(exit 2) → CI가 자동 Fix PR 트리거. 게이트 차단 없음 (SLO: 수정 리드타임 ≤ 24h)`,
    '',
    '| 검사 | 상태 | 심각도 | 요약 |',
    '|---|---|---|---|',
  ];
  for (const c of checks) {
    lines.push(`| ${c.id} | ${c.status} | ${c.severity ?? '-'} | ${c.summary} |`);
  }
  for (const c of checks) {
    if (c.findings.length === 0) continue;
    lines.push(
      '',
      `## ${c.id} — 상세 (${c.findings.length}건${c.findings.length > 50 ? ', 상위 50건만 표시' : ''})`,
      '',
    );
    for (const f of c.findings.slice(0, 50)) {
      if (f.file) {
        lines.push(`- \`${f.file}:${f.line}\` [${f.rule}] \`${f.match}\` — ${f.snippet}`);
      } else if (f.detail) {
        lines.push(`- ${f.detail}`);
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const checks: CheckResult[] = [checkStaleCodegen(), checkHardcodedValues(), checkUnusedTokens()];

  const hasDrift = checks.some((c) => c.status === 'drift');
  const allSkipped = checks.every((c) => c.status === 'skipped');
  const status = hasDrift ? 'drift' : allSkipped ? 'skipped' : 'clean';
  const exitCode = hasDrift ? 2 : 0;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const jsonFile = path.join(REPORT_DIR, `${DATE}.json`);
  const mdFile = path.join(REPORT_DIR, `${DATE}.md`);

  fs.writeFileSync(
    jsonFile,
    JSON.stringify(
      {
        tool: '@tds/drift',
        agent: 'design-drift',
        date: DATE,
        generatedAt: new Date().toISOString(),
        status,
        exitCode,
        thresholds: { unusedTokenRatio: UNUSED_TOKEN_THRESHOLD },
        slo: { hardcodedValues: '0건', driftFixLeadTime: '<= 24h' },
        checks,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  fs.writeFileSync(mdFile, renderMarkdown(checks, status, exitCode), 'utf8');

  console.log(`[drift] 리포트 기록: ${rel(jsonFile)}, ${rel(mdFile)}`);
  for (const c of checks) console.log(`[drift] ${c.id}: ${c.status} — ${c.summary}`);

  if (hasDrift) {
    console.error('[drift] 드리프트 발견 — exit 2 (알림 레벨, CI Fix PR 트리거)');
  } else {
    console.log(
      `[drift] ${allSkipped ? '전 항목 건너뜀 (입력 산출물 미생성 단계)' : '드리프트 없음'} — exit 0`,
    );
  }
  process.exitCode = exitCode;
}

main();
