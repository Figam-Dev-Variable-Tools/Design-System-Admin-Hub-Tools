/**
 * Storybook 정적 빌드(storybook-static)의 스토리마다 axe 접근성 검사를 수행하는 모듈.
 *
 * 구조는 자매 도구 `tools/vrt/src/capture.ts` 와 의도적으로 동일하다:
 *   - index.json(Storybook 7/8 스토리 인덱스)에서 type === "story" 항목을 수집한다.
 *   - node:http 기반 초경량 정적 서버로 storybook-static을 서빙한다 (외부 의존성 없음).
 *   - Playwright(chromium)로 iframe.html?id=<storyId> 를 열어 axe-core 를 주입하고 검사한다.
 *   - Playwright 미설치 시 null 을 반환한다 (호출부가 NOT_VERIFIED 로 처리 — skip 이 아니다).
 *
 * **왜 @storybook/test-runner 를 쓰지 않는가** (2026-07 교체):
 *   이전 구현은 `pnpm exec test-storybook` 을 spawn 했고, 그 경로는 이 저장소에서 한 번도
 *   동작한 적이 없다. 근본 원인이 셋 겹쳐 있었다:
 *     1. `packages/ui/.storybook/test-runner.ts` re-export 가 존재하지 않았다 — README 가
 *        A30 에게 change_request 로 요청하라고만 적어두고 아무도 만들지 않았다. 훅이 없으니
 *        axe 는 애초에 주입되지 않는다.
 *     2. `test-storybook` 은 `@tds/a11y` 의 devDependency 인데 spawn cwd 가 REPO_ROOT 라
 *        루트 node_modules/.bin 에서 찾지 못한다 → "Command not found".
 *     3. test-runner 는 jest 위에서 돌고, jest 의 testMatch 를 `path.join(projectRoot, glob)`
 *        으로 만든다. Windows 에서 그 결과에 섞인 `\` 를 micromatch 가 이스케이프로 읽어
 *        경로 구분자가 사라진다 → 0 matches.
 *   그리고 이 세 실패는 전부 index.ts 의 `skip()` 이 exit 0 으로 삼켰다.
 *   jest/haste/rootDir 계층을 걷어내고 VRT 와 같은 방식으로 직접 순회하면 셋 다 사라진다.
 *
 * **검사 범위가 왜 body 인가 — #storybook-root 가 아니다**:
 *   Modal·ConfirmDialog 는 createPortal 로 document.body 에 직접 붙는다 (VRT 가 실측으로
 *   확인한 '포털 스토리' 21건이 그것이다). 이전 test-runner 훅은 `#storybook-root` 로
 *   범위를 좁혔는데, 그러면 **다이얼로그의 접근성은 영원히 검사되지 않는다** — 포커스 트랩과
 *   aria-modal 이 가장 중요한 바로 그 컴포넌트들이 사각지대에 놓인다.
 *   iframe.html 의 body 에는 Storybook 크롬(사이드바/툴바)이 없고 스토리 렌더 결과만 있으므로
 *   body 를 범위로 잡는 것이 정확하다. <html> 단위 규칙(html-has-lang 등)은 스토리가 소유하지
 *   않는 iframe 셸의 속성이므로 body 범위로 자연히 빠진다.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

export interface StoryEntry {
  id: string;
  title: string;
  name: string;
}

export interface AxeViolationNode {
  target: unknown;
  html: string;
}

export interface AxeViolation {
  id: string;
  impact: string;
  help: string;
  helpUrl: string;
  nodes: AxeViolationNode[];
}

export interface AuditedStory {
  storyId: string;
  title: string;
  name: string;
  checkedAt: string;
  /** 검사에 성공했다면 위반 목록(0건일 수 있다). 실패했다면 undefined. */
  violations?: AxeViolation[];
  /** 검사 실패 사유 — 이 스토리는 '위반 0건'이 아니라 '검사 못 함'이다. */
  error?: string;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

/** 레이아웃 정착 대기 — 렌더 **완료를 확인한 뒤**의 여유분이다 (경합 대기가 아니다) */
const RENDER_SETTLE_MS = 100;

/** storybook-static/index.json에서 스토리 목록을 읽는다. 없거나 파싱 불가 시 null. */
export function readStoriesIndex(storybookDir: string): StoryEntry[] | null {
  const indexPath = path.join(storybookDir, 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
      entries?: Record<string, { type?: string; id: string; title: string; name: string }>;
      stories?: Record<string, { id: string; title: string; name: string }>;
    };
    const entries = raw.entries ?? raw.stories ?? {};
    return Object.values(entries)
      .filter((e) => !('type' in e) || (e as { type?: string }).type === 'story')
      .map((e) => ({ id: e.id, title: e.title, name: e.name }));
  } catch {
    return null;
  }
}

/** storybook-static을 서빙하는 초경량 정적 서버. */
export async function serveStatic(
  rootDir: string,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = path.normalize(path.join(rootDir, rel));
    if (!filePath.startsWith(path.normalize(rootDir))) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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

/**
 * 스토리 렌더가 **끝날 때까지** 기다린다 (VRT capture.ts 와 동일한 신호).
 * Storybook 은 스토리를 다 그리면 body 에 `sb-show-main` 을 붙인다.
 * 시간이 다하면 throw → 호출부가 audit-error 로 기록한다. **못 본 것을 본 척하지 않는다.**
 */
async function waitForStoryRendered(page: import('playwright').Page): Promise<void> {
  await page.waitForFunction(() => document.body.classList.contains('sb-show-main'), undefined, {
    timeout: 10_000,
    polling: 50,
  });
}

/**
 * 전체 스토리를 순회하며 axe 검사를 수행한다.
 * @returns Playwright 미설치 시 null (호출부에서 NOT_VERIFIED 처리)
 */
export async function auditStories(
  storybookDir: string,
  stories: StoryEntry[],
): Promise<AuditedStory[] | null> {
  let chromium: typeof import('playwright').chromium;
  let injectAxe: typeof import('axe-playwright').injectAxe;
  let getViolations: typeof import('axe-playwright').getViolations;
  try {
    ({ chromium } = await import('playwright'));
    ({ injectAxe, getViolations } = await import('axe-playwright'));
  } catch {
    return null; // playwright / axe-playwright 미설치 — NOT_VERIFIED
  }

  const server = await serveStatic(storybookDir);
  const results: AuditedStory[] = [];
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      // 애니메이션 중간 프레임에서 대비(color-contrast)를 재면 결과가 흔들린다.
      // VRT 와 같은 이유로 감속을 강제한다 — 게이트는 결정적이어야 한다.
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // 외부 네트워크 차단 — 결정성의 전제 (VRT capture.ts 와 동일한 근거).
    // ImageThumb 의 BrokenImage 스토리가 실제 외부 요청을 던지므로, DNS 실패 타이밍에 따라
    // 렌더 결과가 달라진다. 로컬 서버 외 요청을 즉시 abort 하면 실패 시점이 항상 같아진다.
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(server.url) || url.startsWith('data:') || url.startsWith('blob:')) {
        void route.continue();
      } else {
        void route.abort();
      }
    });

    for (const story of stories) {
      const checkedAt = new Date().toISOString();
      let lastErr: unknown;
      let recorded = false;

      // [한 번은 다시 해본다 — 그래도 안 되면 '검사 못 함' 으로 남긴다]
      //
      // axe 는 같은 JS 컨텍스트에서 이전 run 이 끝나기 전에 새 run 이 시작되면
      // "Axe is already running" 으로 던진다. 스토리가 렌더 후에도 비동기로 DOM 을 만지면
      // (organisms-todocard--right-to-left 에서 실측) 그 경합이 드물게 잡힌다.
      // 재시도는 **새로 navigate 해서 컨텍스트를 버리고** 하는 것이므로 이전 run 의 흔적이 남지 않는다.
      // 조용히 통과시키지 않는다 — 재시도까지 실패하면 audit-error 로 남아 게이트를 exit 2 로 만든다.
      for (let attempt = 0; attempt < 2 && !recorded; attempt += 1) {
        try {
          await page.goto(
            `${server.url}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`,
            { waitUntil: 'load', timeout: 15_000 },
          );
          await waitForStoryRendered(page);
          await page.waitForTimeout(RENDER_SETTLE_MS);

          await injectAxe(page);
          // 범위가 body 인 이유는 파일 헤더 주석 참조 — 포털(Modal/ConfirmDialog)을 놓치지 않기 위해서다.
          const violations = await getViolations(page, 'body');

          results.push({
            storyId: story.id,
            title: story.title,
            name: story.name,
            checkedAt,
            violations: violations.map((v) => ({
              id: v.id,
              impact: v.impact ?? 'unknown',
              help: v.help,
              helpUrl: v.helpUrl,
              nodes: v.nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 200) })),
            })),
          });
          recorded = true;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!recorded) {
        results.push({
          storyId: story.id,
          title: story.title,
          name: story.name,
          checkedAt,
          error: lastErr instanceof Error ? lastErr.message : String(lastErr),
        });
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  return results;
}
