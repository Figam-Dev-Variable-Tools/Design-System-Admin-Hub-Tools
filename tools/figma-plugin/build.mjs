// @tds/figma-plugin 빌드 스크립트
// - src/main.ts  → dist/main.js  (esbuild 번들, Figma 플러그인 샌드박스용 IIFE)
// - src/ui.html  → dist/ui.html  (디자인 토큰을 인라인해 기록 — manifest.json 의 ui 필드가 참조)
//
// 토큰 인라인이 필요한 이유: 플러그인 UI 는 앱과 분리된 별도 문서(iframe)라
// packages/ui 의 CSS 를 import 할 수 없다. 그래서 codegen 산출물인 tokens.css
// (tokens/tokens.json → :root 라이트 + [data-theme='dark'] 다크)를 빌드 시점에
// ui.html 의 <style> 안으로 밀어 넣는다. UI 규칙은 var(--tds-*) 만 쓰므로
// hex/px 리터럴이 UI 소스에 흩어지지 않고 원천(tokens.json)에서만 흘러온다.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const TOKENS_CSS = path.join(REPO_ROOT, 'packages', 'ui', 'generated', 'tokens', 'tokens.css');
const INJECT_MARKER = '/* @tds-tokens-inject */';

// --- generated/tds-pages.json: 앱 nav 구조 → 화면 목록 --------------------
// build.mjs 가 이미 esbuild 를 갖고 있으니 gen-pages.ts(nav-config 를 읽는다)를 번들해
// 실행한다. 새 의존성 없이 매 빌드 tds-pages.json 을 앱 메뉴와 동기화한다. import.meta.url 이
// dist 를 가리키므로 gen-pages 의 OUT(=dist/../generated)이 그대로 맞는다.
mkdirSync(path.join(HERE, 'dist'), { recursive: true });
const genPagesTmp = path.join(HERE, 'dist', '.gen-pages.mjs');
await build({
  entryPoints: [path.join(HERE, 'scripts', 'gen-pages.ts')],
  bundle: true,
  outfile: genPagesTmp,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
await import(pathToFileURL(genPagesTmp).href);

// --- generated/render-assets.json: VRT 베이스라인(Storybook 실사) → 컴포넌트·스토리 매핑 ----
// gen-pages 와 같은 방식으로 번들해 실행한다. reports/vrt/baseline/*.png 를 계약에 매핑한
// 소형 매니페스트(경로·치수)만 만든다 — 이미지 바이트는 런타임에 자산 서버에서 fetch.
const genAssetsTmp = path.join(HERE, 'dist', '.gen-assets.mjs');
await build({
  entryPoints: [path.join(HERE, 'scripts', 'gen-assets.ts')],
  bundle: true,
  outfile: genAssetsTmp,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});
await import(pathToFileURL(genAssetsTmp).href);

await build({
  entryPoints: [path.join(HERE, 'src', 'main.ts')],
  bundle: true,
  outfile: path.join(HERE, 'dist', 'main.js'),
  platform: 'browser',
  format: 'iife',
  target: ['es2019'],
  logLevel: 'info',
});

mkdirSync(path.join(HERE, 'dist'), { recursive: true });

// --- ui.html: 토큰 인라인 --------------------------------------------------
let tokensCss;
try {
  tokensCss = readFileSync(TOKENS_CSS, 'utf8');
} catch {
  // 조용히 넘기면 토큰 없는(=스타일이 깨진) UI 가 dist 에 실린다 — 빌드를 세운다.
  throw new Error(
    `토큰 CSS 를 찾을 수 없습니다: ${TOKENS_CSS}\n리포 루트에서 pnpm codegen 을 먼저 실행하세요.`,
  );
}

const uiSource = readFileSync(path.join(HERE, 'src', 'ui.html'), 'utf8');
if (!uiSource.includes(INJECT_MARKER)) {
  throw new Error(`src/ui.html 에 토큰 주입 지점(${INJECT_MARKER})이 없습니다.`);
}

// --- 산출물 데이터 내장 -----------------------------------------------------
// 플러그인은 networkAccess:none 샌드박스라 런타임에 프로젝트 파일을 못 읽는다. 그래서
// 빌드 시점(= 프로젝트 안)에서 generated/ 산출물을 UI 에 통째로 심는다 → 사용자는 업로드
// 없이 열자마자 '바로 생성'할 수 있고, 항상 전량(38 계약)이라 누락도 원천적으로 없다.
const DATA_MARKER = '/* @tds-data-inject */';
if (!uiSource.includes(DATA_MARKER)) {
  throw new Error(`src/ui.html 에 데이터 주입 지점(${DATA_MARKER})이 없습니다.`);
}
const IMAGES_MARKER = '/* @tds-images-inject */';
if (!uiSource.includes(IMAGES_MARKER)) {
  throw new Error(`src/ui.html 에 이미지 주입 지점(${IMAGES_MARKER})이 없습니다.`);
}
const GEN = path.join(HERE, 'generated');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const readJsonOr = (p, fallback) => {
  try {
    return readJson(p);
  } catch {
    return fallback;
  }
};
// render-assets: Storybook 실사(항상 존재 — 방금 gen-assets 가 생성).
// page-assets: 어드민 페이지 실사(capture-pages 가 만든다 — 아직 없으면 빈 목록으로 진행).
const renderAssets = readJson(path.join(GEN, 'render-assets.json'));
const pageAssets = readJsonOr(path.join(GEN, 'page-assets.json'), { base: 'pages', pages: [] });
const embedded = {
  manifest: readJson(path.join(GEN, 'manifest.json')),
  tokens: readJson(path.join(GEN, 'tokens', 'figma-variables.json')),
  contracts: (await import('node:fs'))
    .readdirSync(GEN)
    .filter((f) => f.endsWith('.figma.json'))
    .sort()
    .map((f) => readJson(path.join(GEN, f))),
  pages: readJson(path.join(GEN, 'tds-pages.json')).pages,
  // 오너 정본 분류표(23모듈) — 아직 생성 전이면 null. 문서의 체크리스트만 생략되고 나머지는 정상.
  taxonomy: readJsonOr(path.join(GEN, 'taxonomy.json'), null),
  // 실사 매니페스트 — UI 가 자산 서버(localhost:3999)에서 이미지 바이트를 fetch 할 때 쓴다.
  // Figma allowedDomains 가 IP 리터럴을 불허하므로 localhost 로 맞춘다(manifest 와 동일 오리진).
  assetServer: 'http://localhost:3999',
  renderAssets: { base: renderAssets.base, stories: renderAssets.stories },
  pageAssets: { base: pageAssets.base, pages: pageAssets.pages },
};

// --- 실사 이미지 바이트 내장 (base64) --------------------------------------
// 네트워크 없이 열자마자 동작하도록 PNG 를 통째로 UI 에 심는다. Figma 는 플러그인 UI 의
// localhost fetch 를 데스크톱/브라우저 환경에 따라 막을 수 있어(서버 방식이 불안정) 원천 회피한다.
const REPORTS = path.join(REPO_ROOT, 'reports');
function b64Map(dir, entries) {
  const map = {};
  let bytes = 0;
  for (const e of entries) {
    try {
      const buf = readFileSync(path.join(dir, e.file));
      map[e.file] = buf.toString('base64');
      bytes += buf.length;
    } catch {
      // 파일 없음 — 건너뛴다(스토리/페이지 매니페스트와 reports/ 불일치 시)
    }
  }
  return { map, bytes };
}
const storyImg = b64Map(path.join(REPORTS, 'vrt', 'baseline'), renderAssets.stories);
const pageImg = b64Map(path.join(REPORTS, 'pages'), pageAssets.pages);
const imageBlob = JSON.stringify({ stories: storyImg.map, pages: pageImg.map });

const uiOut = uiSource
  .replace(
    INJECT_MARKER,
    `/* ↓ 빌드 시 인라인 — 원천: packages/ui/generated/tokens/tokens.css (tokens/tokens.json) */\n${tokensCss}`,
  )
  .replace(
    DATA_MARKER,
    `/* ↓ 빌드 시 내장 — 원천: tools/figma-plugin/generated/ */\nwindow.__TDS_EMBEDDED__ = ${JSON.stringify(embedded)};`,
  )
  .replace(
    IMAGES_MARKER,
    `/* ↓ 빌드 시 내장 — 원천: reports/vrt/baseline, reports/pages (PNG→base64) */\nwindow.__TDS_IMAGE_BYTES__ = ${imageBlob};`,
  );

writeFileSync(path.join(HERE, 'dist', 'ui.html'), uiOut);
const mb = (n) => `${(n / (1024 * 1024)).toFixed(1)}MB`;
console.log(
  `내장 완료: 계약 ${String(embedded.contracts.length)} · 변수 ${String(embedded.tokens.variables.length)} · 화면 ${String(embedded.pages.length)} · 실사(스토리 ${String(Object.keys(storyImg.map).length)}장 ${mb(storyImg.bytes)} · 페이지 ${String(Object.keys(pageImg.map).length)}장 ${mb(pageImg.bytes)})`,
);

const varCount = (tokensCss.match(/^\s*--tds-/gm) ?? []).length;
console.log(`기록 완료: dist/ui.html — 토큰 ${varCount}개 인라인 (tokens.css)`);
