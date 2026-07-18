// 관리자 SPA 전체 화면(full-page) 스크린샷 캡처
//
// tds-pages.json 의 65개 라우트를 순회하며 Playwright(chromium)로 full-page PNG 를
// reports/pages/ 에 저장하고, Figma 플러그인이 실제 화면을 1:1 로 재현할 수 있도록
// generated/page-assets.json 매니페스트를 emit 한다.
//
// [의존성 0 추가] playwright 는 워크스페이스에 이미 설치돼 있으나(tools/vrt 의 dep) pnpm 의
//   엄격 격리 때문에 figma-plugin 에서 직접 resolve 되지 않는다. tools/vrt 패키지 기준으로
//   createRequire 하여 store 의 playwright 를 그대로 빌려 쓴다 — 새 설치가 필요 없다.
//
// [백엔드 없음] 앱의 데이터는 axios 어댑터(shared/api/client.ts)가 픽스처로 해소한다 —
//   실제 네트워크 호출 0건. 따라서 MSW 워커 기동도, 백엔드도 필요 없다.
//
// [인증 우회 아님, 목(mock) 세션 주입] RequireAuth 는 localStorage 의 tds.admin.session 만
//   본다(pages/login/session.ts). 앱이 이미 제공하는 목 계정(admin@tds.local)의 세션 형태를
//   그대로 심어 정상 로그인 상태를 재현한다 — 앱 소스는 한 줄도 바꾸지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const PAGES_JSON = path.join(REPO_ROOT, 'tools', 'figma-plugin', 'generated', 'tds-pages.json');
const OUT_DIR = path.join(REPO_ROOT, 'reports', 'pages');
const ASSETS_JSON = path.join(REPO_ROOT, 'tools', 'figma-plugin', 'generated', 'page-assets.json');

/** 데스크톱 뷰포트 — VRT 와 동일하게 DPR 을 1 로 고정한다(머신 간 크기 불일치 방지) */
const VIEWPORT = { width: 1440, height: 900 };

/** 픽스처 지연(shared/crud/dev.ts LATENCY_MS=400) + 렌더 + recharts 애니메이션(≈1.5s) 정착 여유 */
const SETTLE_MS = 1600;

/** 앱이 제공하는 목 계정 그대로 — pages/login/api.ts MOCK_ACCOUNTS 참조 */
const MOCK_SESSION = {
  userId: 'u-001',
  email: 'admin@tds.local',
  role: 'system_admin',
  issuedAt: 0, // 결정성: 고정값(매니페스트에는 실리지 않는다)
};

/** 라우트 id → 안전한 파일명 (선행 '/' 제거, 나머지 '/' → '-', 루트는 'root') */
export function safeName(routeId) {
  const trimmed = routeId.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === '' ? 'root' : trimmed.replace(/\//g, '-');
}

/** PNG IHDR 에서 픽셀 크기를 읽는다 (width@16, height@20, big-endian) */
function pngSize(buffer) {
  const signatureOk =
    buffer.length > 24 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  if (!signatureOk) throw new Error('PNG 시그니처가 아닙니다 — 스크린샷 버퍼가 손상되었습니다.');
  return { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) };
}

/** playwright 를 tools/vrt 기준으로 resolve 해 chromium 을 가져온다 */
async function loadChromium() {
  const requireFromVrt = createRequire(path.join(REPO_ROOT, 'tools', 'vrt', 'package.json'));
  const playwrightEntry = requireFromVrt.resolve('playwright');
  const mod = await import(pathToFileURL(playwrightEntry).href);
  // playwright 진입점은 CJS — file URL import 시 named export 가 default 밑에 실릴 수 있다.
  const chromium = mod.chromium ?? mod.default?.chromium;
  if (!chromium) throw new Error('playwright chromium 을 로드하지 못했습니다.');
  return chromium;
}

export async function capturePages({ baseUrl, log = console.log } = {}) {
  const base = (baseUrl ?? process.env.ADMIN_BASE_URL ?? 'http://localhost:4173').replace(
    /\/+$/,
    '',
  );

  const raw = JSON.parse(fs.readFileSync(PAGES_JSON, 'utf8'));
  const pages = Array.isArray(raw.pages) ? raw.pages : [];
  if (pages.length === 0) throw new Error(`${PAGES_JSON} 에서 pages 를 찾지 못했습니다.`);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const chromium = await loadChromium();
  const browser = await chromium.launch();
  const results = [];
  const failures = [];

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });

    // 앱 스크립트보다 먼저 실행돼 목 세션을 심는다 — 모든 네비게이션에 적용된다.
    await context.addInitScript((session) => {
      try {
        window.localStorage.setItem('tds.admin.session', JSON.stringify(session));
      } catch {
        /* 저장소 차단 환경 — 무시 */
      }
    }, MOCK_SESSION);

    const page = await context.newPage();

    for (const entry of pages) {
      const id = entry.id;
      const file = `${safeName(id)}.png`;
      const filePath = path.join(OUT_DIR, file);
      try {
        await page.goto(`${base}${id}`, { waitUntil: 'networkidle', timeout: 45_000 });

        // 로딩 표식(aria-busy)이 걷힐 때까지 최선 대기 — 없으면 그냥 넘어간다.
        await page
          .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, {
            timeout: 6_000,
            polling: 100,
          })
          .catch(() => {});

        // 스크롤바 숨김 + 잔여 애니메이션 정지 (정착 이미지 안정화)
        await page.addStyleTag({
          content:
            '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}' +
            '*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}',
        });

        await page.waitForTimeout(SETTLE_MS);

        const buffer = await page.screenshot({ fullPage: true });
        const { w, h } = pngSize(buffer);
        fs.writeFileSync(filePath, buffer);

        results.push({
          id,
          name: entry.name,
          section: entry.section,
          menu: entry.menu,
          file,
          w,
          h,
        });
        log(`  ok   ${id}  →  ${file}  (${w}x${h})`);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failures.push({ id, reason });
        log(`  FAIL ${id}  —  ${reason}`);
      }
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    $kind: 'tds-page-assets',
    $source: 'reports/pages',
    base: 'pages',
    pages: results,
  };
  fs.writeFileSync(ASSETS_JSON, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { total: pages.length, captured: results.length, failures, assetsPath: ASSETS_JSON };
}

// 단독 실행 지원 — ADMIN_BASE_URL 환경변수(기본 http://localhost:4173)를 쓴다.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  capturePages()
    .then(({ total, captured, failures, assetsPath }) => {
      console.log(`\n[capture] ${captured}/${total} 캡처 완료 → ${assetsPath}`);
      if (failures.length > 0) {
        console.log(`[capture] 실패 ${failures.length}건:`);
        for (const f of failures) console.log(`  - ${f.id}: ${f.reason}`);
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error('[capture] 치명적 오류:', err);
      process.exitCode = 1;
    });
}
