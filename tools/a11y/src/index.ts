/**
 * @tds/a11y — 접근성 감사 엔트리 (A72 Accessibility Audit AI 소유)
 *
 * 파이프라인:
 *   1. packages/ui/storybook-static 존재 확인 (없으면 NOT_VERIFIED — skip 이 아니다)
 *   2. index.json 에서 스토리 목록 수집
 *   3. 내장 정적 서버 + Playwright(chromium) 로 스토리마다 axe-core 검사
 *   4. 집계 → reports/a11y/<date>.json
 *
 * 종료 코드: 0 = 실제로 검사했고 critical/serious 0건
 *            1 = critical/serious 위반 1건 이상 (agents.json A72 blockCondition — G5/G6 차단 입력)
 *            2 = NOT_VERIFIED — 검사 자체가 불가능했다
 *
 * **측정 불가는 통과가 아니다** (ADR-0009 · ADR-0010 · ADR-0012).
 *   이 도구는 2026-07 이전까지 `skip()` 으로 exit 0 을 냈다. 그 결과 리포트에는
 *   `status: "skipped"` 와 함께 `axe: { critical: 0, serious: 0, moderate: 0, minor: 0 }` 가
 *   찍혔다 — **0건 검사하고 "위반 0건"을 기록**한 것이다. 그 초록불은 CI 의 `a11y` job 을
 *   통과시켰고 G5/G6 의 증거로 쓰였다. 이는 `bundle-size`(dist 없이 초록불) 및
 *   `vrt`(비교 0건에 PASS)와 **동일한 공허 통과**다 — 공집합 위에서 참인 명제다.
 *   전제가 없으면 exit 2 로 NOT_VERIFIED 를 알린다. 초록불은 실제로 검사했을 때만 켠다.
 *
 * 검사 방식과 test-runner 를 걷어낸 이유는 `audit.ts` 헤더 주석 참조.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditStories, readStoriesIndex, type AuditedStory } from './audit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const STORYBOOK_STATIC = path.join(REPO_ROOT, 'packages', 'ui', 'storybook-static');
const REPORT_DIR = path.join(REPO_ROOT, 'reports', 'a11y');
const DATE = new Date().toISOString().slice(0, 10);

/**
 * 차단 임계 — agents.json A72 blockCondition("axe critical/serious 위반 1건 이상")이 원천.
 * 임의로 느슨하게 바꾸지 않는다. 위반이 나오면 임계가 아니라 코드를 고친다.
 */
const BLOCKING_IMPACTS = ['critical', 'serious'] as const;

/** 알려진 부채 목록 — 임계 완화가 아니라 **열거된 예외**다. 파일 헤더 주석 참조. */
const KNOWN_FILE = path.join(__dirname, '..', 'known-violations.json');

interface KnownViolation {
  storyId: string;
  ruleId: string;
  measured: string;
  reason: string;
  owner: string;
  addedAt: string;
}

function readKnownViolations(): KnownViolation[] {
  if (!fs.existsSync(KNOWN_FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(KNOWN_FILE, 'utf8')) as { violations?: KnownViolation[] };
  return raw.violations ?? [];
}

function keyOf(storyId: string, ruleId: string): string {
  return `${storyId}::${ruleId}`;
}

function rel(p: string): string {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function writeReport(report: Record<string, unknown>): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${DATE}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[a11y] 리포트 기록: ${rel(file)}`);
}

/**
 * 전제 조건이 없어 **검사 자체가 불가능**한 경우. 통과가 아니다 — exit 2 (NOT_VERIFIED).
 * 이전 구현(`skip()`)은 여기서 exit 0 을 냈고, 그 초록불이 G5/G6 의 증거로 쓰였다.
 */
function notVerified(reason: string, guidance: string): void {
  console.error(`[a11y] NOT_VERIFIED — ${reason}`);
  console.error(`[a11y] 안내: ${guidance}`);
  console.error('[a11y] 이것은 PASS 가 아니다. 검사할 수 없었다는 뜻이다.');
  writeReport({
    tool: '@tds/a11y',
    agent: 'A72',
    date: DATE,
    generatedAt: new Date().toISOString(),
    status: 'not-verified',
    reason,
    stories: [],
  });
  process.exitCode = 2;
}

async function main(): Promise<void> {
  // 1. 전제 조건 — storybook-static 존재 여부
  if (!fs.existsSync(path.join(STORYBOOK_STATIC, 'index.html'))) {
    notVerified(
      'packages/ui/storybook-static 이 없습니다 (Storybook 빌드 미실행)',
      '`pnpm sb:build` 로 정적 빌드를 생성한 뒤 다시 실행하세요. (`pnpm a11y:gate` 는 이 빌드를 선행한다)',
    );
    return;
  }

  const stories = readStoriesIndex(STORYBOOK_STATIC);
  if (!stories || stories.length === 0) {
    notVerified(
      'storybook-static/index.json 에서 스토리를 찾지 못했습니다',
      'Storybook 빌드가 정상 완료됐는지 확인하세요 (`pnpm sb:build`).',
    );
    return;
  }

  // 2. 검사
  console.log(`[a11y] 스토리 ${stories.length}건 axe 검사 시작...`);
  const audited = await auditStories(STORYBOOK_STATIC, stories);
  if (audited === null) {
    notVerified(
      'playwright 또는 axe-playwright 가 설치되어 있지 않습니다',
      '`pnpm install` 후 `pnpm --filter @tds/a11y exec playwright install chromium` 을 실행하세요.',
    );
    return;
  }

  // 3. 집계
  const auditErrors = audited.filter((s) => s.error !== undefined);
  const checked = audited.filter((s) => s.violations !== undefined);
  const withViolations = checked.filter((s) => (s.violations ?? []).length > 0);

  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
  /** 규칙별 집계 — 부채 등재/우선순위 판단의 근거가 된다 */
  const byRule = new Map<string, { impact: string; stories: number; nodes: number }>();

  for (const story of checked) {
    for (const v of story.violations ?? []) {
      const impact = (v.impact in counts ? v.impact : 'unknown') as keyof typeof counts;
      counts[impact] += 1;
      const entry = byRule.get(v.id) ?? { impact: v.impact, stories: 0, nodes: 0 };
      entry.stories += 1;
      entry.nodes += v.nodes.length;
      byRule.set(v.id, entry);
    }
  }

  // 알려진 부채는 차단에서 빠지되 **리포트에는 그대로 남는다**. 숨기는 것이 아니다.
  const known = readKnownViolations();
  const knownKeys = new Set(known.map((k) => keyOf(k.storyId, k.ruleId)));
  const seenKeys = new Set<string>();
  for (const story of checked) {
    for (const v of story.violations ?? []) seenKeys.add(keyOf(story.storyId, v.id));
  }
  /** 등재해 뒀지만 더 이상 나오지 않는 항목 — 목록이 썩지 않도록 실패시킨다 */
  const staleKnown = known.filter((k) => !seenKeys.has(keyOf(k.storyId, k.ruleId)));

  const isBlocking = (storyId: string, v: { id: string; impact: string }): boolean =>
    (BLOCKING_IMPACTS as readonly string[]).includes(v.impact) &&
    !knownKeys.has(keyOf(storyId, v.id));

  const severeStories = checked.filter((s) =>
    (s.violations ?? []).some((v) => isBlocking(s.storyId, v)),
  );
  const severeCount = checked.reduce(
    (sum, s) => sum + (s.violations ?? []).filter((v) => isBlocking(s.storyId, v)).length,
    0,
  );
  /** 차단되지는 않지만 실재하는 위반 수 — '초록불 = 위반 0' 이 아님을 리포트가 말하게 한다 */
  const knownSevereCount = checked.reduce(
    (sum, s) =>
      sum +
      (s.violations ?? []).filter(
        (v) =>
          (BLOCKING_IMPACTS as readonly string[]).includes(v.impact) &&
          knownKeys.has(keyOf(s.storyId, v.id)),
      ).length,
    0,
  );

  // 검사 실패가 하나라도 있으면 나머지가 전부 통과여도 초록불을 켜지 않는다 (VRT 와 동일한 규율).
  // "검사되지 않은 위반"과 "위반 없음"은 구별할 수 없으므로, 구별할 수 없다고 말한다.
  const status =
    checked.length === 0
      ? 'not-verified'
      : auditErrors.length > 0
        ? 'not-verified'
        : severeCount > 0 || staleKnown.length > 0
          ? 'fail'
          : 'pass';

  writeReport({
    tool: '@tds/a11y',
    agent: 'A72',
    date: DATE,
    generatedAt: new Date().toISOString(),
    status,
    blockCondition: 'critical/serious >= 1 → G5/G6 차단 (agents.json A72)',
    scope: 'iframe.html 의 body — 포털(Modal/ConfirmDialog)을 포함한다',
    totalStories: stories.length,
    checkedStories: checked.length,
    auditErrorCount: auditErrors.length,
    storiesWithViolations: withViolations.length,
    axe: counts,
    /**
     * 차단 집계 — `axe` 는 **실재하는** 위반 전부이고, 이것은 그중 차단하는 수다.
     * knownSevere > 0 인데 status 가 pass 라면 그것은 '위반 0' 이 아니라 '등재된 부채만 남았다' 는 뜻이다.
     */
    blocking: {
      severeCount,
      knownSevereCount,
      knownEntries: known.length,
      staleKnown: staleKnown.map((k) => ({ storyId: k.storyId, ruleId: k.ruleId })),
    },
    knownViolations: known,
    byRule: Object.fromEntries(
      [...byRule.entries()].sort((a, b) => b[1].nodes - a[1].nodes).map(([id, v]) => [id, v]),
    ),
    auditErrors: auditErrors.map((s) => ({ storyId: s.storyId, error: s.error })),
    stories: withViolations,
  });

  // 4. 판정
  if (checked.length === 0) {
    console.error('[a11y] NOT_VERIFIED — 스토리를 한 건도 검사하지 못했습니다.');
    console.error('[a11y] 검사 0건에 위반 0건은 공집합 위의 참이며 아무것도 보증하지 않는다.');
    process.exitCode = 2;
    return;
  }

  if (auditErrors.length > 0) {
    console.error(
      `[a11y] NOT_VERIFIED — 스토리 ${auditErrors.length}건을 검사하지 못했습니다. ` +
        '검사 못 한 스토리는 위반이 있어도 잡히지 않습니다 — 이것은 PASS 가 아닙니다.',
    );
    for (const e of auditErrors.slice(0, 10)) {
      console.error(`  - ${e.storyId}: ${(e.error ?? '').split('\n')[0]}`);
    }
    process.exitCode = 2;
    return;
  }

  // 등재해 둔 부채가 더 이상 나오지 않는다 = 목록이 현실과 어긋났다. 고쳤으면 목록에서 지워야 한다 —
  // 안 지우면 그 자리에 **다음 위반이 조용히 숨는다**. 그래서 이것도 빨간불이다.
  if (staleKnown.length > 0) {
    console.error(
      `[a11y] FAIL — known-violations.json 의 항목 ${staleKnown.length}건이 더 이상 재현되지 않습니다.`,
    );
    console.error(
      '[a11y] 고쳤다면 목록에서 지우세요 — 남겨두면 같은 (스토리, 규칙) 의 새 위반이 이 예외 뒤에 숨습니다.',
    );
    for (const k of staleKnown) console.error(`  - ${k.storyId} :: ${k.ruleId}`);
    process.exitCode = 1;
    return;
  }

  if (severeCount > 0) {
    console.error(
      `[a11y] FAIL — 차단 대상 critical/serious ${severeCount}건 ` +
        `(스토리 ${severeStories.length}건). G5/G6 차단 입력이 생성되었습니다.`,
    );
    for (const s of severeStories.slice(0, 20)) {
      const severe = (s.violations ?? []).filter((v) => isBlocking(s.storyId, v));
      console.error(`  - ${s.storyId}: ${severe.map((v) => `${v.id}(${v.impact})`).join(', ')}`);
    }
    if (severeStories.length > 20) {
      console.error(`  ... 외 ${severeStories.length - 20}건 — 전체는 리포트 참조`);
    }
    process.exitCode = 1;
    return;
  }

  // '위반 0건' 이라고 말하지 않는다 — 등재된 부채가 남아 있으면 그 수를 함께 말한다.
  // 초록불의 의미를 정확히 적는 것이 이 도구가 공허한 검사로 되돌아가지 않는 유일한 방법이다.
  console.log(
    `[a11y] PASS — 실제 검사 ${checked.length}건 중 차단 대상 critical/serious 0건 ` +
      `(moderate ${counts.moderate}, minor ${counts.minor})`,
  );
  if (knownSevereCount > 0) {
    console.log(
      `[a11y] 주의 — 등재된 부채 ${knownSevereCount}건(critical/serious)이 남아 있습니다. ` +
        '이 초록불은 "위반 0" 이 아니라 "새 위반 0" 입니다 — tools/a11y/known-violations.json 참조.',
    );
  }
  process.exitCode = 0;
}

main().catch((err) => {
  console.error('[a11y] 예기치 못한 오류:', err);
  process.exitCode = 1;
});
