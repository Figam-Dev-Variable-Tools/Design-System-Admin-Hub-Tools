// Playwright 설정 (담당: E2E 테스트 — e2e/**)
//
// [백엔드는 없다] 화면은 apps/admin 의 data-source / api 어댑터가 돌려주는 픽스처로 돈다.
// 따라서 여기서 API 를 stub 하지 않는다 — 예외 축은 어댑터가 이미 뚫어 둔 재현용 쿼리
// 파라미터(?delay= · ?error=1 · ?empty=1 · ?fail=<op>)로 재현한다. 그것이 주입 지점이다.
//
// [retries = 0] 재시도로 초록불을 사는 것은 테스트 커버리지가 고발하는 거짓말과 같은 종류다.
// 불안정한 테스트는 숨기지 않고 드러낸다.
import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

const here = __dirname;
/** dev 서버는 리포 루트에서 띄운다 (pnpm dev:admin 과 같은 것) */
const repoRoot = resolve(here, '..');

const PORT = 5173;
export const BASE_URL = `http://127.0.0.1:${String(PORT)}`;

export default defineConfig({
  testDir: here,
  // 파일 배치는 명세를 미러링한다: specs/users/members/FS-003-*.md → e2e/users/members/FS-003-*.spec.ts
  testMatch: '**/FS-*.spec.ts',
  fullyParallel: true,
  workers: 3,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env['CI']),
  reporter: [['list']],
  outputDir: 'test-results',

  use: {
    baseURL: BASE_URL,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // `pnpm dev:admin` 과 동일한 서버. 포트를 고정해야 baseURL 이 흔들리지 않는다.
    command: `pnpm --filter @tds/admin exec vite --host 127.0.0.1 --port ${String(PORT)} --strictPort`,
    cwd: repoRoot,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
