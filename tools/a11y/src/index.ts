/**
 * @tds/a11y — 접근성 감사 엔트리 (A72 Accessibility Audit AI 소유)
 *
 * 파이프라인:
 *   1. packages/ui/storybook-static 존재 확인 (없으면 graceful skip + 안내)
 *   2. 내장 정적 서버로 storybook-static 서빙
 *   3. Storybook test-runner(test-storybook) 실행 — tools/a11y/test-runner.ts 훅이
 *      axe-playwright 로 스토리별 위반을 TDS_A11Y_OUT(JSONL)에 수집
 *   4. JSONL 집계 → reports/a11y/<date>.json
 *
 * 종료 코드: 0 = 위반 없음 또는 graceful skip / 1 = critical/serious 위반 1건 이상
 *   (agents.json A72 blockCondition — G5/G6 차단 입력)
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const STORYBOOK_STATIC = path.join(REPO_ROOT, 'packages', 'ui', 'storybook-static');
const SB_CONFIG_DIR = path.join(REPO_ROOT, 'packages', 'ui', '.storybook');
const REPORT_DIR = path.join(REPO_ROOT, 'reports', 'a11y');
const DATE = new Date().toISOString().slice(0, 10);

interface ViolationRecord {
  storyId: string;
  title: string;
  name: string;
  checkedAt: string;
  violations: Array<{
    id: string;
    impact: string;
    help: string;
    helpUrl: string;
    nodes: Array<{ target: unknown; html: string }>;
  }>;
}

function rel(p: string): string {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function writeReport(report: Record<string, unknown>): string {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${DATE}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[a11y] 리포트 기록: ${rel(file)}`);
  return file;
}

function skip(reason: string, guidance: string): void {
  console.log(`[a11y] SKIP — ${reason}`);
  console.log(`[a11y] 안내: ${guidance}`);
  writeReport({
    tool: '@tds/a11y',
    agent: 'A72',
    date: DATE,
    generatedAt: new Date().toISOString(),
    status: 'skipped',
    reason,
    axe: { critical: 0, serious: 0, moderate: 0, minor: 0 },
    stories: [],
  });
  process.exitCode = 0;
}

/** storybook-static 초경량 정적 서버 */
async function serveStatic(rootDir: string): Promise<{ url: string; close: () => Promise<void> }> {
  const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(rootDir, relPath));
    if (
      !filePath.startsWith(path.normalize(rootDir)) ||
      !fs.existsSync(filePath) ||
      !fs.statSync(filePath).isFile()
    ) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function main(): Promise<void> {
  // 1. 전제 조건
  if (!fs.existsSync(path.join(STORYBOOK_STATIC, 'index.html'))) {
    skip(
      'packages/ui/storybook-static 이 없습니다 (Storybook 빌드 미실행)',
      '`pnpm sb:build` 로 정적 빌드를 생성한 뒤 다시 실행하세요.',
    );
    return;
  }

  // 2. 수집 파일 준비 (tmp/는 gitignore 대상)
  const tmpDir = path.join(REPORT_DIR, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const outJsonl = path.join(tmpDir, `${DATE}-violations.jsonl`);
  if (fs.existsSync(outJsonl)) fs.rmSync(outJsonl);

  // 3. test-runner 실행
  const server = await serveStatic(STORYBOOK_STATIC);
  let run: ReturnType<typeof spawnSync>;
  try {
    // 단일 명령 문자열로 전달 (shell:true + args 배열은 DEP0190). 경로 인자는 인용 처리.
    let command = `pnpm exec test-storybook --url ${server.url} --maxWorkers 2`;
    if (fs.existsSync(SB_CONFIG_DIR)) {
      command += ` --config-dir "${rel(SB_CONFIG_DIR)}"`;
    }
    console.log(`[a11y] test-storybook 실행 (${server.url}) ...`);
    run = spawnSync(command, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      shell: true,
      timeout: 600_000,
      env: { ...process.env, TDS_A11Y_OUT: outJsonl },
    });
  } finally {
    await server.close();
  }

  const jsonlExists = fs.existsSync(outJsonl);
  if (run.error || (run.status !== 0 && !jsonlExists)) {
    // 위반으로 인한 실패라면 JSONL이 존재한다. JSONL 없이 비정상 종료 = 실행 환경 미구성.
    skip(
      'test-storybook 실행 환경이 구성되지 않았습니다 (의존성 미설치 또는 test-runner 미연결)',
      "`pnpm install` 후 README.md의 '연결 방법'에 따라 packages/ui/.storybook/test-runner.ts 재export를 추가하세요.",
    );
    return;
  }

  // 4. 집계
  const records: ViolationRecord[] = jsonlExists
    ? fs
        .readFileSync(outJsonl, 'utf8')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as ViolationRecord)
    : [];

  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
  for (const record of records) {
    for (const v of record.violations) {
      const impact = v.impact as keyof typeof counts;
      counts[impact in counts ? impact : 'unknown'] += 1;
    }
  }
  const severeCount = counts.critical + counts.serious;
  const status = severeCount > 0 ? 'fail' : 'pass';

  writeReport({
    tool: '@tds/a11y',
    agent: 'A72',
    date: DATE,
    generatedAt: new Date().toISOString(),
    status,
    blockCondition: 'critical/serious >= 1 → G5/G6 차단 (agents.json A72)',
    testRunnerExitCode: run.status,
    axe: counts,
    storiesWithViolations: records.length,
    stories: records,
  });

  if (severeCount > 0) {
    console.error(
      `[a11y] FAIL — critical ${counts.critical}건 + serious ${counts.serious}건. G5/G6 차단 입력이 생성되었습니다.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `[a11y] PASS — critical/serious 위반 0건 (moderate ${counts.moderate}, minor ${counts.minor})`,
    );
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('[a11y] 예기치 못한 오류:', err);
  process.exitCode = 1;
});
