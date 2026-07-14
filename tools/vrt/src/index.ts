/**
 * @tds/vrt — Visual Regression 파이프라인 엔트리 (A70 Visual Regression AI 소유)
 *
 * 파이프라인:
 *   1. packages/ui/storybook-static 의 스토리를 Playwright로 스크린샷 캡처
 *   2. 기준 이미지 탐색 — 1순위: docs/figma/specs/** /exports/<storyId>.png (Figma export가 정본),
 *      2순위: reports/vrt/baseline/<storyId>.png (자체 관리 baseline)
 *   3. pixelmatch로 diff 비율 계산 → 0.1% 초과 스토리 목록 산출
 *   4. reports/vrt/<date>-summary.json + 개별 diff PNG(reports/vrt/diff/<date>/) 기록
 *
 * 모드:
 *   --update-baseline : 기준 이미지가 전혀 없는 스토리의 현재 스크린샷을
 *                       reports/vrt/baseline/ 에 baseline으로 등록한다.
 *                       (docs/figma/specs/** 는 A51~A55 소유 경로이므로 절대 쓰지 않는다 — P1 단일 소유권)
 *
 * 종료 코드: 0 = 실제로 비교했고 전부 통과 / 1 = diff > 0.1% (G7 차단 입력)
 *            2 = NOT_VERIFIED — 측정 자체가 불가능했다
 *
 * **측정 불가는 통과가 아니다** (ADR-0009 · ADR-0010).
 *   이 도구는 원래 storybook-static 부재 · playwright 미설치 시 exit 0 으로 빠져나갔고,
 *   기준 이미지가 0건이어도 "비교 0건 중 실패 0건 → PASS" 를 찍었다.
 *   그것은 `bundle-size` job(dist 없이 초록불) 및 `--passWithNoTests`(테스트 0건에 초록불)와
 *   **동일한 공허 통과**다 — 공집합 위에서 참인 명제이며 아무것도 보증하지 않는다.
 *   전제가 없으면 exit 2 로 NOT_VERIFIED 를 알린다. 초록불은 실제로 픽셀을 비교했을 때만 켠다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureStories, readStoriesIndex, sanitizeId, type CapturedStory } from './capture';
import { compareImages } from './compare';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** gates.json G7 blockedBy(A70): "pixel diff > 0.1%" 가 원천 — 임의 변경 금지 */
const DIFF_THRESHOLD = 0.001;

const STORYBOOK_STATIC = path.join(REPO_ROOT, 'packages', 'ui', 'storybook-static');
const FIGMA_SPECS_DIR = path.join(REPO_ROOT, 'docs', 'figma', 'specs');
const REPORT_DIR = path.join(REPO_ROOT, 'reports', 'vrt');
const LOCAL_BASELINE_DIR = path.join(REPORT_DIR, 'baseline');

const DATE = new Date().toISOString().slice(0, 10);
const UPDATE_BASELINE = process.argv.includes('--update-baseline');

interface VrtResult {
  storyId: string;
  status: 'pass' | 'fail' | 'no-baseline' | 'baseline-registered' | 'capture-error';
  diffRatio: number | null;
  baselineSource: 'figma-export' | 'local-baseline' | null;
  baseline: string | null;
  diffImage: string | null;
  note: string | null;
}

function rel(p: string): string {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

/** docs/figma/specs/** 아래 exports 디렉터리의 PNG를 <파일명(확장자 제외)> → 절대경로 로 수집한다. */
function collectFigmaBaselines(dir: string, map = new Map<string, string>()): Map<string, string> {
  if (!fs.existsSync(dir)) return map;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFigmaBaselines(full, map);
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith('.png') &&
      full.split(path.sep).includes('exports')
    ) {
      const key = entry.name.replace(/\.png$/i, '');
      if (!map.has(key)) map.set(key, full); // 중복 파일명은 최초 발견본 우선
    }
  }
  return map;
}

function writeSummary(summary: Record<string, unknown>): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${DATE}-summary.json`);
  fs.writeFileSync(file, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(`[vrt] 리포트 기록: ${rel(file)}`);
}

/**
 * 전제 조건이 없어 **측정 자체가 불가능**한 경우. 통과가 아니다 — exit 2 (NOT_VERIFIED).
 * 이전 구현은 여기서 exit 0 을 냈고, 그 초록불이 G7 의 증거로 쓰였다.
 */
function notVerified(reason: string, guidance: string): void {
  console.log(`[vrt] NOT_VERIFIED — ${reason}`);
  console.log(`[vrt] 안내: ${guidance}`);
  console.log('[vrt] 이것은 PASS 가 아니다. 측정할 수 없었다는 뜻이다.');
  writeSummary({
    tool: '@tds/vrt',
    agent: 'A70',
    date: DATE,
    generatedAt: new Date().toISOString(),
    threshold: DIFF_THRESHOLD,
    status: 'not-verified',
    reason,
    results: [],
  });
  process.exitCode = 2;
}

async function main(): Promise<void> {
  // 1. 전제 조건 — storybook-static 존재 여부
  if (!fs.existsSync(path.join(STORYBOOK_STATIC, 'index.html'))) {
    notVerified(
      'packages/ui/storybook-static 이 없습니다 (Storybook 빌드 미실행)',
      '`pnpm sb:build` 로 Storybook 정적 빌드를 생성한 뒤 다시 실행하세요.',
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

  // 2. 스크린샷 캡처 (중간물은 gitignore 대상인 reports/vrt/tmp/ 에 저장)
  const shotsDir = path.join(REPORT_DIR, 'tmp', DATE);
  console.log(`[vrt] 스토리 ${stories.length}건 캡처 시작...`);
  const captured = await captureStories(STORYBOOK_STATIC, stories, shotsDir);
  if (captured === null) {
    notVerified(
      'playwright 가 설치되어 있지 않습니다',
      '`pnpm install` 후 `pnpm --filter @tds/vrt exec playwright install chromium` 을 실행하세요.',
    );
    return;
  }

  // 3. 기준 이미지 대조
  const figmaBaselines = collectFigmaBaselines(FIGMA_SPECS_DIR);
  const diffDir = path.join(REPORT_DIR, 'diff', DATE);
  const results: VrtResult[] = [];
  let compareUnavailable = false;

  for (const shot of captured) {
    const id = sanitizeId(shot.storyId);
    const base: VrtResult = {
      storyId: shot.storyId,
      status: 'pass',
      diffRatio: null,
      baselineSource: null,
      baseline: null,
      diffImage: null,
      note: null,
    };

    if (!shot.file) {
      results.push({ ...base, status: 'capture-error', note: shot.error ?? 'unknown' });
      continue;
    }

    const figma = figmaBaselines.get(id);
    const local = path.join(LOCAL_BASELINE_DIR, `${id}.png`);
    const baselinePath = figma ?? (fs.existsSync(local) ? local : null);

    if (!baselinePath) {
      if (UPDATE_BASELINE) {
        fs.mkdirSync(LOCAL_BASELINE_DIR, { recursive: true });
        fs.copyFileSync(shot.file, local);
        results.push({
          ...base,
          status: 'baseline-registered',
          baselineSource: 'local-baseline',
          baseline: rel(local),
          note: '기준 이미지 최초 등록 (--update-baseline)',
        });
      } else {
        results.push({
          ...base,
          status: 'no-baseline',
          note: '기준 이미지 없음 — Figma export 대기 또는 --update-baseline 로 등록',
        });
      }
      continue;
    }

    const outcome = await compareImages(baselinePath, shot.file);
    if (outcome === null) {
      compareUnavailable = true;
      break;
    }

    const source: VrtResult['baselineSource'] = figma ? 'figma-export' : 'local-baseline';
    if (outcome.dimensionMismatch) {
      results.push({
        ...base,
        status: 'fail',
        diffRatio: 1,
        baselineSource: source,
        baseline: rel(baselinePath),
        note: '이미지 크기 불일치 — 캡처 뷰포트 또는 Figma export 크기 확인 필요',
      });
      continue;
    }

    let diffImage: string | null = null;
    if (outcome.diffRatio > DIFF_THRESHOLD && outcome.diffPngBuffer) {
      fs.mkdirSync(diffDir, { recursive: true });
      const diffFile = path.join(diffDir, `${id}.png`);
      fs.writeFileSync(diffFile, outcome.diffPngBuffer);
      diffImage = rel(diffFile);
    }

    results.push({
      ...base,
      status: outcome.diffRatio > DIFF_THRESHOLD ? 'fail' : 'pass',
      diffRatio: Number(outcome.diffRatio.toFixed(6)),
      baselineSource: source,
      baseline: rel(baselinePath),
      diffImage,
    });
  }

  if (compareUnavailable) {
    notVerified(
      'pixelmatch/pngjs 가 설치되어 있지 않습니다',
      '`pnpm install` 을 실행한 뒤 다시 시도하세요.',
    );
    return;
  }

  // 4. 요약 리포트
  const failed = results.filter((r) => r.status === 'fail');
  const noBaseline = results.filter((r) => r.status === 'no-baseline');
  const registered = results.filter((r) => r.status === 'baseline-registered');
  const compared = results.filter((r) => r.diffRatio !== null).length;

  // 픽셀을 한 장도 비교하지 못했다면 그것은 '실패 0건'이 아니라 '검증 0건'이다.
  // 기준 이미지가 전부 없는 지금 상태에서 이전 구현은 "PASS — 비교 0건 중 실패 0건"을 찍었다.
  // 등록 모드(--update-baseline)는 비교가 목적이 아니므로 예외다.
  const verifiable = compared > 0 || (UPDATE_BASELINE && registered.length > 0);
  const status = !verifiable ? 'not-verified' : failed.length > 0 ? 'fail' : 'pass';

  writeSummary({
    tool: '@tds/vrt',
    agent: 'A70',
    date: DATE,
    generatedAt: new Date().toISOString(),
    threshold: DIFF_THRESHOLD,
    blockCondition: 'diff > 0.1% → G7 차단 (gates.json)',
    status,
    totalStories: stories.length,
    compared,
    failedCount: failed.length,
    noBaselineCount: noBaseline.length,
    registeredBaselineCount: registered.length,
    failed,
    results,
  });

  if (!verifiable) {
    console.error(
      `[vrt] NOT_VERIFIED — 스토리 ${stories.length}건을 캡처했지만 기준 이미지가 0건이라 ` +
        '한 장도 비교하지 못했습니다.',
    );
    console.error(
      '[vrt] 이것은 PASS 가 아니다 — 비교 0건에 실패 0건은 공집합 위의 참이며 아무것도 보증하지 않는다.',
    );
    console.error(
      '[vrt] 해소: Figma export(docs/figma/specs/**/exports/)를 채우거나, ' +
        '`pnpm vrt --update-baseline` 으로 현재 스크린샷을 기준 이미지로 등록하세요.',
    );
    process.exitCode = 2;
    return;
  }

  if (failed.length > 0) {
    console.error(
      `[vrt] FAIL — diff > 0.1% 스토리 ${failed.length}건. G7 차단 입력이 생성되었습니다.`,
    );
    for (const f of failed) {
      console.error(
        `  - ${f.storyId}: diff ${(Number(f.diffRatio) * 100).toFixed(3)}% (${f.note ?? f.diffImage ?? ''})`,
      );
    }
    process.exitCode = 1;
  } else {
    console.log(
      `[vrt] PASS — 실제 비교 ${compared}건 중 실패 0건` +
        (noBaseline.length > 0 ? ` (기준 이미지 없음 ${noBaseline.length}건 — 경고)` : ''),
    );
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('[vrt] 예기치 못한 오류:', err);
  process.exitCode = 1;
});
