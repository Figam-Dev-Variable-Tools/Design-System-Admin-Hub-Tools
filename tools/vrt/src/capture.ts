/**
 * Storybook 정적 빌드(storybook-static)에서 스토리 스크린샷을 캡처하는 모듈.
 *
 * - index.json(Storybook 7/8 스토리 인덱스)에서 type === "story" 항목을 수집한다.
 * - node:http 기반 초경량 정적 서버로 storybook-static을 서빙한다 (외부 의존성 없음).
 * - Playwright(chromium)로 iframe.html?id=<storyId> 를 열어 #storybook-root 요소를 캡처한다.
 * - Playwright가 설치되지 않은 환경에서는 null을 반환한다 (graceful skip — 호출부가 안내 출력).
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

export interface CapturedStory {
  storyId: string;
  /** 캡처된 스크린샷 파일 절대 경로 (실패 시 undefined) */
  file?: string;
  /** 캡처 실패 사유 */
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

/** storybook-static/index.json에서 스토리 목록을 읽는다. 없거나 파싱 불가 시 null. */
export function readStoriesIndex(storybookDir: string): StoryEntry[] | null {
  const indexPath = path.join(storybookDir, 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as {
      entries?: Record<string, { type?: string; id: string; title: string; name: string }>;
      stories?: Record<string, { id: string; title: string; name: string }>;
    };
    // Storybook 7/8: entries, 6.x: stories
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
    // 경로 탈출(path traversal) 방지
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
 * 전체 스토리를 순회하며 스크린샷을 캡처한다.
 * @returns Playwright 미설치 시 null (호출부에서 graceful skip 처리)
 */
export async function captureStories(
  storybookDir: string,
  stories: StoryEntry[],
  outDir: string,
): Promise<CapturedStory[] | null> {
  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    return null; // playwright 미설치 — graceful skip
  }

  fs.mkdirSync(outDir, { recursive: true });
  const server = await serveStatic(storybookDir);
  const results: CapturedStory[] = [];

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      reducedMotion: 'reduce', // 모션 토큰에 의한 애니메이션 흔들림 제거
    });
    const page = await context.newPage();

    for (const story of stories) {
      const file = path.join(outDir, `${sanitizeId(story.id)}.png`);
      try {
        await page.goto(
          `${server.url}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`,
          { waitUntil: 'load', timeout: 15_000 },
        );
        const root = page.locator('#storybook-root');
        await root.waitFor({ state: 'visible', timeout: 10_000 });
        await page.waitForTimeout(300); // 렌더 안정화 대기
        await root.screenshot({ path: file });
        results.push({ storyId: story.id, file });
      } catch (err) {
        results.push({
          storyId: story.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return results;
}

/** storyId를 안전한 파일명으로 정규화한다 (기준 이미지 파일명 규칙과 동일). */
export function sanitizeId(storyId: string): string {
  return storyId.replace(/[^a-zA-Z0-9._-]/g, '_');
}
