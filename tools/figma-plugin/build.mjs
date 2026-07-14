// @tds/figma-plugin 빌드 스크립트
// - src/main.ts → dist/main.js (esbuild 번들, Figma 플러그인 샌드박스용 IIFE)
// - src/ui.html → dist/ui.html (그대로 복사 — manifest.json의 ui 필드가 참조)
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/main.js',
  platform: 'browser',
  format: 'iife',
  target: ['es2019'],
  logLevel: 'info',
});

mkdirSync('dist', { recursive: true });
copyFileSync('src/ui.html', 'dist/ui.html');
console.log('복사 완료: src/ui.html → dist/ui.html');
