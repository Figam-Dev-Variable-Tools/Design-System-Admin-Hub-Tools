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
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const TOKENS_CSS = path.join(REPO_ROOT, 'packages', 'ui', 'generated', 'tokens', 'tokens.css');
const INJECT_MARKER = '/* @tds-tokens-inject */';

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

const uiOut = uiSource.replace(
  INJECT_MARKER,
  `/* ↓ 빌드 시 인라인 — 원천: packages/ui/generated/tokens/tokens.css (tokens/tokens.json) */\n${tokensCss}`,
);

writeFileSync(path.join(HERE, 'dist', 'ui.html'), uiOut);

const varCount = (tokensCss.match(/^\s*--tds-/gm) ?? []).length;
console.log(`기록 완료: dist/ui.html — 토큰 ${varCount}개 인라인 (tokens.css)`);
