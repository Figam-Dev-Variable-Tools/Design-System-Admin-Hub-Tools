/**
 * check-boundary.ts — 변경 파일을 레지스트리 owns 글롭과 대조해 소유자를 판정한다.
 *
 * 동작:
 *  - 인자로 파일 목록을 받거나, 없으면 `git diff --name-only HEAD` 결과를 사용한다.
 *    (--base <ref> 지정 시 `git diff --name-only <ref>...HEAD`)
 *  - 각 파일의 유효 소유자(effective owner)를 판정한다. 판정은 CODEOWNERS와 동일한
 *    last-match-wins 순서(layer 오름차순 → 깊이 오름차순)를 따른다.
 *  - --agent <id|slug> 지정 시, 해당 에이전트 소유가 아닌 경로를 위반으로 검출하고
 *    reports/boundary/에 위반 리포트(JSON + MD)를 기록한 뒤 exit 1.
 *
 * 사용법:
 *   pnpm boundary:check                                  # HEAD 대비 변경분 소유자 판정
 *   pnpm boundary:check --base origin/main               # base...HEAD 변경분 판정
 *   pnpm boundary:check --agent A30 packages/ui/src/x.ts # A30 경계 위반 검사
 *
 * 소유자: A02 (Boundary Enforcer AI)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import {
  REPORTS_DIR,
  ROOT,
  TEAM_PREFIX,
  buildOwnership,
  loadRegistry,
  normalizePath,
  type Agent,
  type OwnershipEntry,
} from './registry.js';

interface FileJudgement {
  path: string;
  /** 유효 소유자 (last-match-wins). 공동 소유(A40/A41)면 복수 */
  owners: { id: string; slug: string }[];
  /** 유효 소유를 결정한 패턴 (미소유면 null) */
  pattern: string | null;
  /** 필드 단위 소유(package.json#version)에 걸린 경우 true — 필드 내용은 수동 확인 필요 */
  partial: boolean;
  /** 매칭된 모든 패턴 (진단용) */
  allPatterns: string[];
}

interface Violation {
  path: string;
  effectiveOwners: string[];
  reason: string;
}

interface CliOptions {
  agent: string | null;
  base: string | null;
  files: string[];
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { agent: null, base: null, files: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--agent') {
      options.agent = argv[++i] ?? null;
    } else if (arg === '--base') {
      options.base = argv[++i] ?? null;
    } else if (arg.startsWith('--')) {
      console.error(`[boundary] 알 수 없는 옵션: ${arg}`);
      process.exit(2);
    } else {
      options.files.push(normalizePath(arg));
    }
  }
  return options;
}

function gitChangedFiles(base: string | null): string[] {
  const args = base ? ['diff', '--name-only', `${base}...HEAD`] : ['diff', '--name-only', 'HEAD'];
  const stdout = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return stdout
    .split(/\r?\n/)
    .map((line) => normalizePath(line.trim()))
    .filter((line) => line.length > 0);
}

function judgeFile(path: string, entries: OwnershipEntry[]): FileJudgement {
  let effective: OwnershipEntry | null = null;
  const allPatterns: string[] = [];
  for (const entry of entries) {
    const matched = entry.fragment ? path === entry.fragmentBase : entry.regex.test(path);
    if (matched) {
      allPatterns.push(entry.pattern);
      effective = entry; // 정렬 순서상 마지막 매치 = 유효 소유 (CODEOWNERS와 동일)
    }
  }
  return {
    path,
    owners: effective ? effective.owners.map((a) => ({ id: a.id, slug: a.slug })) : [],
    pattern: effective ? effective.pattern : null,
    partial: effective?.fragment ?? false,
    allPatterns,
  };
}

function renderMarkdown(
  agent: Agent | null,
  base: string | null,
  judgements: FileJudgement[],
  violations: Violation[],
  unowned: string[],
  date: string,
): string {
  const lines: string[] = [
    '# Boundary 검사 리포트',
    '',
    `- 실행일: ${date}`,
    `- 모드: ${agent ? `--agent ${agent.id} (${agent.slug}) 경계 위반 검사` : '소유자 판정(정보성)'}`,
    `- diff 기준: ${base ? `${base}...HEAD` : 'HEAD'}`,
    `- 파일 수: ${judgements.length} · 위반: ${violations.length} · 미소유: ${unowned.length}`,
    `- 판정: ${violations.length > 0 ? '**FAIL**' : '**PASS**'}`,
    '',
    '## 파일별 유효 소유자',
    '',
    '| 파일 | 유효 소유자 | 결정 패턴 |',
    '|---|---|---|',
  ];
  for (const j of judgements) {
    const owners =
      j.owners.length > 0
        ? j.owners.map((o) => `${o.id} ${TEAM_PREFIX}${o.slug}`).join(', ') +
          (j.partial ? ' (필드 단위 소유 — 수동 확인 필요)' : '')
        : '(미소유)';
    lines.push(`| \`${j.path}\` | ${owners} | \`${j.pattern ?? '-'}\` |`);
  }
  if (violations.length > 0) {
    lines.push('', '## 위반 (P1 단일 소유권)', '');
    for (const v of violations) {
      lines.push(`- \`${v.path}\` — ${v.reason}`);
    }
    lines.push(
      '',
      '> 조치: 소유자에게 change_request(orchestration/schemas/change-request.v1.json)를 발행하거나, 해당 파일을 커밋에서 제외할 것.',
    );
  }
  if (unowned.length > 0) {
    lines.push('', '## 미소유 경로 (경고 — 레지스트리 공백 가능성, A01에 보고)', '');
    for (const p of unowned) lines.push(`- \`${p}\``);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * P1(단일 소유권)의 명시적 예외 — **레지스트리와 파이프라인이 모순되는 두 지점.**
 *
 * 예외를 두지 않으면 조직이 자기 규칙에 갇힌다. 아래 둘은 A18/A84가 실제로 부딪힌 사례다.
 */
const BOUNDARY_EXEMPTIONS: readonly { readonly test: RegExp; readonly reason: string }[] = [
  {
    // codegen 산출물. `pnpm codegen` 이 쓰지, 에이전트가 손으로 쓰지 않는다.
    // 파이프라인은 codegen 을 A18 의 단계로 규정하는데, 산출물 경로는 A50/A60/미소유다
    // → A18 이 자기 단계를 수행하면 경계 위반으로 차단된다. 모순이다.
    // 손편집 방어는 여기가 아니라 `codegen:check` 가 한다 (재생성 후 diff ≠ 0 이면 실패).
    test: /(^|\/)generated\/|^docs\/tds\/components\/.*\.api\.md$/,
    reason: 'codegen 산출물 — 손으로 쓰지 않는다. 최신성은 codegen:check 가 강제한다',
  },
  {
    // change_request 봉투. `orchestration/tasks/**` 는 A00 소유인데,
    // CR 은 **생산자가 경계를 넘어 요청할 유일한 통로**다.
    // A00 만 쓸 수 있다면 생산자는 CR 을 발행할 방법이 없고, 발행처가 없는 요청은
    // 문서 안의 표로만 남아 아무에게도 전달되지 않는다 (감사 발견 9: 그렇게 사장된 CR 29건).
    // 새 CR 파일 생성은 누구나 할 수 있다 — 다만 상태(ACCEPTED/REJECTED) 판정은 수신자 몫이다.
    test: /^orchestration\/tasks\/CR-[\d-]+\.json$/,
    reason: 'change_request 발행 — 생산자가 경계를 넘어 요청할 유일한 통로다',
  },
];

function exemptionFor(path: string): string | null {
  return BOUNDARY_EXEMPTIONS.find((e) => e.test.test(path))?.reason ?? null;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const { agents } = loadRegistry();
  // fragment(package.json#version) 포함 — CODEOWNERS에는 못 넣지만 경계 검사는 강제한다
  const { entries } = buildOwnership(agents, { includeFragments: true });

  let agent: Agent | null = null;
  if (options.agent) {
    agent = agents.find((a) => a.id === options.agent || a.slug === options.agent) ?? null;
    if (!agent) {
      console.error(`[boundary] 레지스트리에 없는 에이전트: ${options.agent}`);
      process.exit(2);
    }
  }

  const files = options.files.length > 0 ? options.files : gitChangedFiles(options.base);
  const judgements = files.map((file) => judgeFile(file, entries));
  const unowned = judgements.filter((j) => j.owners.length === 0).map((j) => j.path);

  const violations: Violation[] = [];
  const exempted: { path: string; reason: string }[] = [];
  if (agent) {
    for (const j of judgements) {
      const isOwner = j.owners.some((o) => o.id === agent.id);
      if (isOwner) continue;

      const exemption = exemptionFor(j.path);
      if (exemption !== null) {
        exempted.push({ path: j.path, reason: exemption });
        continue;
      }

      violations.push({
        path: j.path,
        effectiveOwners: j.owners.map((o) => o.id),
        reason:
          j.owners.length > 0
            ? `유효 소유자는 ${j.owners.map((o) => `${o.id}(${o.slug})`).join(', ')} — ${agent.id}(${agent.slug}) 소유 아님`
            : `소유자 없는 경로 — ${agent.id}(${agent.slug})의 owns에 포함되지 않음`,
      });
    }
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const report = {
    tool: '@tds/boundary check-boundary',
    generatedAt: now.toISOString(),
    agent: agent ? { id: agent.id, slug: agent.slug } : null,
    base: options.base,
    fileCount: judgements.length,
    result: violations.length > 0 ? 'FAIL' : 'PASS',
    files: judgements,
    unowned,
    violations,
    exempted, // P1 예외 — 침묵하지 않는다. 예외가 늘면 규칙을 다시 봐야 한다는 신호다
  };

  mkdirSync(REPORTS_DIR, { recursive: true });
  const jsonPath = resolve(REPORTS_DIR, `${date}-boundary-check.json`);
  const mdPath = resolve(REPORTS_DIR, `${date}-boundary-check.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(
    mdPath,
    renderMarkdown(agent, options.base, judgements, violations, unowned, date),
    'utf8',
  );

  const rel = (p: string): string => relative(ROOT, p).replace(/\\/g, '/');
  if (judgements.length === 0) {
    console.log('[boundary] 검사 대상 파일 없음 (변경분 0건).');
  }
  for (const j of judgements) {
    const owners = j.owners.length > 0 ? j.owners.map((o) => o.id).join(',') : '(미소유)';
    console.log(`  ${j.path} → ${owners}${j.partial ? ' [필드 단위]' : ''}`);
  }
  for (const e of exempted) {
    console.log(`  ○ P1 예외: ${e.path} — ${e.reason}`);
  }
  for (const v of violations) {
    console.error(`  ✗ 위반: ${v.path} — ${v.reason}`);
  }
  console.log(`[boundary] 리포트: ${rel(jsonPath)}, ${rel(mdPath)}`);

  if (violations.length > 0) {
    console.error(
      `[boundary] FAIL — 위반 ${violations.length}건. PR/커밋을 차단한다 (P1 단일 소유권).`,
    );
    process.exit(1);
  }
  if (unowned.length > 0) {
    console.warn(
      `[boundary] 경고 — 미소유 경로 ${unowned.length}건 (레지스트리 공백 가능성, A01에 보고).`,
    );
  }
  console.log('[boundary] PASS');
}

main();
