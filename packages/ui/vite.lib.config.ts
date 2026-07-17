// @tds/ui — vite lib mode 빌드 (ADR-0009 승격 조건 ①)
//
// **이 빌드의 목적은 배포가 아니라 측정이다.**
// 앱(@tds/admin)은 여전히 workspace 링크로 `src/index.ts` 를 직접 컴파일한다
// (package.json 의 main/exports 를 dist 로 돌리지 않았다 — 소비 경로를 바꾸는 것은
//  CSS import 규약·트리셰이킹·e2e 전반을 건드리는 별개의 큰 변경이다).
// 여기서 만드는 dist 는 `tools/perf` 가 G6 번들 예산(컴포넌트당 gzip +2KB)을
// 잴 수 있게 하는 **측정 대상**이다. 측정할 수 없으면 게이트도 없다 (ADR-0009).
//
// ── external 정책: peerDependencies + dependencies 전부 external ──────────────
// 라이브러리 빌드에 react 를 번들하면 소비 앱에서 React 가 2벌이 된다. Tiptap 을
// 번들하면 소비자가 dedupe/버전 고정을 할 수 없다. 둘 다 라이브러리 안티패턴이다.
// 그리고 G6 규칙("컴포넌트 추가 gzip +2KB 이내")이 재려는 것은 **DS 가 작성한 코드**의
// 증가이지 벤더 코드의 크기가 아니다. 벤더를 번들하면 Tiptap 만으로 128KB 상한을
// 영구 초과해 ADR-0009 가 명시적으로 거부한 (A)안 — "게이트가 아니라 벽" — 이 된다.
//
// ⚠ 한계(정직하게 기록): deps 가 external 이므로 **무거운 서드파티 의존성 추가는 이
//   게이트가 잡지 못한다.** 그것은 앱 진입 번들 예산이 재야 할 별개의 축이고 현재
//   저장소에 그 축은 없다 (ADR-0010 후속 참조).
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('./package.json') as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/** 선언된 의존성은 전부 external — 정확 일치 + 서브패스(`@tiptap/core/x`) 모두 */
const externalNames = [
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.dependencies ?? {}),
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(dirname, 'src/index.ts'),
      formats: ['es'],
      // tools/perf/.size-limit.json 이 dist/index.js 를 가리킨다 — 이름을 바꾸면 게이트가 눈이 먼다.
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: (id) => externalNames.some((n) => id === n || id.startsWith(`${n}/`)),
      output: {
        // 청크 이름을 해시 없이 고정 — size-limit 이 dist/*.js 를 glob 으로 합산하고
        // 리포트의 파일명이 커밋 간 비교 가능해야 한다.
        chunkFileNames: '[name].js',
        assetFileNames: '[name][extname]',
      },
    },
    // 측정 대상이므로 minify 는 소비 앱과 같은 조건(esbuild 기본)으로 고정한다.
    minify: 'esbuild',
    sourcemap: false,
    emptyOutDir: true,
    target: 'es2022',
  },
});
