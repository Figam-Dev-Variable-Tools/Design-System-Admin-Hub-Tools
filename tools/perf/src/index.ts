/**
 * @tds/perf — 성능 감사 엔트리 (A73 Performance Audit AI 소유)
 *
 * 검사:
 *   - packages/ui 가 **자기 코드로 내보내는 JS 전부**(dist/*.js = entry + 자체 청크)의
 *     gzip 합계를 size-limit 으로 측정
 *   - 동적 예산 = BASE_BUDGET_KB + PER_COMPONENT_KB × 컴포넌트 수
 *     (G6 체크리스트: "컴포넌트 추가 gzip +2KB 이내" — gates.json G6 blockedBy A73)
 *   - .size-limit.json 의 정적 한도(128KB)는 절대 상한, 실제 판정은 동적 예산이 우선
 *
 * ── 예산 단위: '진입 청크'가 아니라 '@tds/ui 자체 코드 전체 합' ──────────────
 * 근거 ①(형식): 예산식이 `base + 2KB × 컴포넌트 수` 로 **컴포넌트 수에 비례**한다.
 *   이 식은 측정 대상이 그 컴포넌트를 **전부 담고 있을 때만** 성립한다. 38개를 예산에
 *   넣고 일부만 담긴 진입 청크를 재는 것은 단위가 어긋난 비교다.
 * 근거 ②(구멍): 진입 청크만 재면 `React.lazy` 가 **예산 우회 수단**이 된다. 이 저장소엔
 *   이미 그런 청크가 실재한다 — RichTextFieldEditor(Tiptap)는 dist/index.js 에 없다.
 *   가정이 아니라 현물이다. 무엇이든 lazy 뒤로 옮기면 게이트가 눈을 감는다.
 * 근거 ③(대상 구분): 앱 라우트 분할로 진입 번들이 347→117.68 kB 가 된 것은 **@tds/admin
 *   의 진입 번들** 이야기이고, 이 게이트가 재는 것은 **@tds/ui 라이브러리 산출물**이다.
 *   서로 다른 아티팩트다. 앱은 여전히 workspace 링크로 `src/index.ts` 를 직접 컴파일하며
 *   dist 를 소비하지 않으므로, 앱의 lazy 분할은 이 수치를 **1바이트도 바꾸지 않는다.**
 *   즉 두 예산은 상충하지 않는다 — 라이브러리 총량 예산은 앱의 코드 분할을 벌하지 않는다.
 *
 * ⚠ 예산이 재지 **못하는** 축 (정직하게 기록):
 *   - 서드파티 의존성: vite lib 빌드가 deps/peerDeps 를 external 로 두므로 Tiptap 같은
 *     무거운 의존성 추가는 이 수치에 안 잡힌다. 앱 진입 번들 예산이 필요하다(현재 없음).
 *   - CSS: dist/style.css 는 리포트에 기록만 하고 예산 판정에는 넣지 않는다
 *     (.size-limit.json 과 G6 규칙이 JS entry 기준). 컴포넌트 수에 비례해 자라는 실제
 *     비용이므로 별도 축으로 승격할 후보다.
 *
 * 출력: reports/perf/<date>.json
 * 종료 코드: 0 = 예산 이내 / 1 = 예산 초과 또는 **측정 불가** (G6 차단 입력)
 *
 * **측정 불가는 통과가 아니다** (ADR-0009). dist 부재·size-limit 실행 실패는 예전엔
 * graceful skip(exit 0) 이었고, 그래서 이 게이트는 아무것도 재지 않으면서 초록불을 켜는
 * 공허 통과(vacuous pass)였다. 이제 둘 다 **exit 1** 이다.
 *
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

/**
 * 측정 불가 → **실패**. 예전의 graceful skip(exit 0)이 ADR-0009 가 지목한 공허 통과의
 * 정확한 원인이었다. 재지 못했다는 사실은 통과의 근거가 될 수 없다.
 */
function unmeasurable(reason: string, guidance: string): void {
  console.error(`[perf] FAIL — 측정 불가: ${reason}`);
  console.error(`[perf] 안내: ${guidance}`);
  writeReport({
    tool: '@tds/perf',
    agent: 'A73',
    date: DATE,
    generatedAt: new Date().toISOString(),
    status: 'unmeasurable',
    blockCondition: '측정 불가 → G6 차단 (ADR-0009: 측정 불가는 통과가 아니다)',
    reason,
    budget: { baseKB: BASE_BUDGET_KB, perComponentKB: PER_COMPONENT_KB },
    results: [],
  });
  process.exitCode = 1;
}

/** 예산 판정에 합산되는 파일 목록 — .size-limit.json 의 `dist/*.js` 와 같은 집합 */
function listDistJs(): string[] {
  if (!fs.existsSync(UI_DIST)) return [];
  return fs
    .readdirSync(UI_DIST)
    .filter((f) => f.endsWith('.js'))
    .sort()
    .map((f) => path.join(UI_DIST, f));
}

/** 예산 밖 참고 수치 — dist/style.css 원본 바이트 (없으면 0) */
function cssBytes(): number {
  const css = path.join(UI_DIST, 'style.css');
  return fs.existsSync(css) ? fs.statSync(css).size : 0;
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
  // 1. 전제 조건 — 빌드 산출물 존재 여부. 없으면 **실패** (skip 아님).
  const entry = ['index.js', 'index.mjs']
    .map((f) => path.join(UI_DIST, f))
    .find((f) => fs.existsSync(f));
  if (!entry) {
    unmeasurable(
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
  if (!results || results.length === 0) {
    unmeasurable(
      'size-limit 실행 결과를 얻지 못했습니다 (의존성 미설치 · 설정 오류 · 매칭 파일 0건)',
      '`pnpm install` 후 다시 실행하세요. 설정: tools/perf/.size-limit.json\n' +
        (run.stderr ? `size-limit stderr: ${run.stderr.trim()}` : ''),
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
    // 예산 단위 = @tds/ui 자체 JS 전체 합 (entry + 자체 청크). 파일 목록을 남겨
    // '무엇이 합산됐는지'가 리포트만 보고도 검증되게 한다 — 합계만 있는 수치는 믿기 어렵다.
    measuredUnit: 'dist/*.js gzip 합계 (entry + 자체 청크 · 서드파티 external)',
    measuredFiles: listDistJs().map((f) => rel(f)),
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
    // 예산 밖이지만 실재하는 비용 — 가려두지 않고 기록한다 (헤더의 '재지 못하는 축' 참조).
    unbudgeted: {
      styleCssBytes: cssBytes(),
      note: 'CSS 는 판정에 포함하지 않는다 (.size-limit.json/G6 이 JS entry 기준). 서드파티 의존성은 external 이라 잡히지 않는다.',
    },
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
