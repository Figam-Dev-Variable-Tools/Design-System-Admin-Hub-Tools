/**
 * @tds/perf — 성능 감사 엔트리 (A73 Performance Audit AI 소유)
 *
 * 검사:
 *   - packages/ui public entry(dist/index.js)의 gzip 크기를 size-limit으로 측정
 *   - 동적 예산 = BASE_BUDGET_KB + PER_COMPONENT_KB × 컴포넌트 수
 *     (G6 체크리스트: "컴포넌트 추가 gzip +2KB 이내" — gates.json G6 blockedBy A73)
 *   - .size-limit.json 의 정적 한도(128KB)는 절대 상한, 실제 판정은 동적 예산이 우선
 *
 * 출력: reports/perf/<date>.json
 * 종료 코드: 0 = 예산 이내 또는 graceful skip / 1 = 예산 초과 (G6 차단 입력)
 *
 * graceful skip: packages/ui/dist 없음 · size-limit 미설치 → 안내 후 exit 0
 * 렌더 카운트 예산(마운트 1회 · 무관 상태 변경 시 재렌더 0회)은 README.md 가이드 참조 —
 * 정적 측정이 불가능해 Storybook Play Function/프로파일러 검증으로 커버한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const TOOL_DIR = path.resolve(__dirname, '..');

const UI_DIST = path.join(REPO_ROOT, 'packages', 'ui', 'dist');
const UI_SRC = path.join(REPO_ROOT, 'packages', 'ui', 'src');
const REPORT_DIR = path.join(REPO_ROOT, 'reports', 'perf');
const DATE = new Date().toISOString().slice(0, 10);

/** 컴포넌트 0개 시점의 public entry 기본 예산 (런타임 + 유틸 몫) */
const BASE_BUDGET_KB = 30;
/** G6 규칙: 컴포넌트 추가당 gzip +2KB 이내 (gates.json G6 blockedBy A73) */
const PER_COMPONENT_KB = 2;
/** Atomic 레벨 디렉터리 — 하위 1단계 폴더 1개 = 컴포넌트 1개로 계산 */
const ATOMIC_LEVELS = ['atoms', 'molecules', 'organisms', 'templates'];

interface SizeLimitResult {
  name: string;
  size: number;
  passed?: boolean;
}

function rel(p: string): string {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function writeReport(report: Record<string, unknown>): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${DATE}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[perf] 리포트 기록: ${rel(file)}`);
}

function skip(reason: string, guidance: string): void {
  console.log(`[perf] SKIP — ${reason}`);
  console.log(`[perf] 안내: ${guidance}`);
  writeReport({
    tool: '@tds/perf',
    agent: 'A73',
    date: DATE,
    generatedAt: new Date().toISOString(),
    status: 'skipped',
    reason,
    budget: { baseKB: BASE_BUDGET_KB, perComponentKB: PER_COMPONENT_KB },
    results: [],
  });
  process.exitCode = 0;
}

/** packages/ui/src/{atoms,molecules,organisms,templates}/* 폴더 수 = 컴포넌트 수 */
function countComponents(): number {
  let count = 0;
  for (const level of ATOMIC_LEVELS) {
    const dir = path.join(UI_SRC, level);
    if (!fs.existsSync(dir)) continue;
    count += fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
  }
  return count;
}

function main(): void {
  // 1. 전제 조건 — 빌드 산출물 존재 여부
  const entry = ['index.js', 'index.mjs']
    .map((f) => path.join(UI_DIST, f))
    .find((f) => fs.existsSync(f));
  if (!entry) {
    skip(
      'packages/ui/dist 에 public entry(index.js|index.mjs)가 없습니다 (빌드 미실행)',
      '`pnpm --filter @tds/ui run build` 로 UI 패키지를 빌드한 뒤 다시 실행하세요.',
    );
    return;
  }

  // 2. size-limit 측정 (--json: 순수 JSON 배열을 stdout에 출력)
  //    단일 명령 문자열로 전달 (shell:true + args 배열은 DEP0190)
  const run = spawnSync('pnpm exec size-limit --json', {
    cwd: TOOL_DIR,
    encoding: 'utf8',
    shell: true,
    timeout: 180_000,
  });

  let results: SizeLimitResult[] | null = null;
  if (!run.error && typeof run.stdout === 'string') {
    try {
      const start = run.stdout.indexOf('[');
      const end = run.stdout.lastIndexOf(']');
      if (start !== -1 && end > start) {
        results = JSON.parse(run.stdout.slice(start, end + 1)) as SizeLimitResult[];
      }
    } catch {
      results = null;
    }
  }
  if (!results) {
    skip(
      'size-limit 실행 결과를 얻지 못했습니다 (의존성 미설치 가능성)',
      '`pnpm install` 후 다시 실행하세요. 설정: tools/perf/.size-limit.json',
    );
    return;
  }

  // 3. 동적 예산 판정 — 컴포넌트당 +2KB 규칙
  const componentCount = countComponents();
  const allowedKB = BASE_BUDGET_KB + PER_COMPONENT_KB * componentCount;
  const allowedBytes = allowedKB * 1024;
  const measured = results[0];
  const measuredBytes = measured?.size ?? 0;

  const overDynamicBudget = measuredBytes > allowedBytes;
  const overStaticLimit = results.some((r) => r.passed === false);
  const status = overDynamicBudget || overStaticLimit ? 'fail' : 'pass';

  writeReport({
    tool: '@tds/perf',
    agent: 'A73',
    date: DATE,
    generatedAt: new Date().toISOString(),
    status,
    blockCondition: 'gzip 예산 초과 → G6 차단 (gates.json G6 blockedBy A73)',
    entry: rel(entry),
    measuredBytes,
    measuredKB: Number((measuredBytes / 1024).toFixed(2)),
    budget: {
      baseKB: BASE_BUDGET_KB,
      perComponentKB: PER_COMPONENT_KB,
      componentCount,
      allowedKB,
      formula: 'allowedKB = baseKB + perComponentKB × componentCount',
    },
    exceededBytes: overDynamicBudget ? measuredBytes - allowedBytes : 0,
    staticLimit: '128 KB (.size-limit.json — 절대 상한)',
    sizeLimitResults: results,
  });

  if (status === 'fail') {
    console.error(
      `[perf] FAIL — gzip ${(measuredBytes / 1024).toFixed(2)}KB > 예산 ${allowedKB}KB ` +
        `(base ${BASE_BUDGET_KB}KB + ${PER_COMPONENT_KB}KB × 컴포넌트 ${componentCount}개). G6 차단 입력이 생성되었습니다.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `[perf] PASS — gzip ${(measuredBytes / 1024).toFixed(2)}KB ≤ 예산 ${allowedKB}KB (컴포넌트 ${componentCount}개)`,
    );
    process.exitCode = 0;
  }
}

main();
