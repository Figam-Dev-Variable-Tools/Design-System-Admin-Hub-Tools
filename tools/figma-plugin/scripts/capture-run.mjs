// 캡처 오케스트레이터 — serve(vite preview) → wait → capture → kill
//
// 크로스플랫폼(win32 우선). foreground sleep 없이 Node 에서 URL 준비를 폴링한다.
// 프로덕션 빌드(apps/admin/dist)를 vite preview 로 서빙한다 — dev 서버의 HMR/재최적화
// full-reload 흔들림 없이 정적으로 안정 서빙된다(vite.config.ts 주석의 그 지뢰를 피한다).
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { capturePages } from './capture-pages.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const ADMIN_DIR = path.join(REPO_ROOT, 'apps', 'admin');
const DIST_INDEX = path.join(ADMIN_DIR, 'dist', 'index.html');

const HOST = '127.0.0.1';
const PORT = Number(process.env.ADMIN_PREVIEW_PORT ?? 4173);
const BASE_URL = `http://${HOST}:${PORT}`;
const IS_WIN = process.platform === 'win32';

function waitForUrl(url, { timeoutMs = 60_000, intervalMs = 400 } = {}) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        // 200(index) 또는 SPA 폴백 어떤 상태든 서버가 응답하면 준비된 것으로 본다.
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2_000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`서버가 ${timeoutMs}ms 안에 준비되지 않았습니다: ${url}`));
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function killTree(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    if (IS_WIN && child.pid) {
      // pnpm → node(vite) 프로세스 트리 전체를 종료한다.
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).on(
        'exit',
        () => resolve(),
      );
    } else {
      child.kill('SIGTERM');
      resolve();
    }
  });
}

async function main() {
  if (!fs.existsSync(DIST_INDEX)) {
    throw new Error(
      `빌드 산출물이 없습니다: ${DIST_INDEX}\n먼저 빌드하세요: pnpm --filter @tds/admin run build`,
    );
  }

  console.log(`[run] vite preview 기동 → ${BASE_URL}`);
  const server = spawn(
    'pnpm',
    [
      '--filter',
      '@tds/admin',
      'exec',
      'vite',
      'preview',
      '--host',
      HOST,
      '--port',
      String(PORT),
      '--strictPort',
    ],
    { cwd: REPO_ROOT, stdio: 'inherit', shell: IS_WIN },
  );

  let serverExited = false;
  server.on('exit', () => {
    serverExited = true;
  });

  try {
    await waitForUrl(BASE_URL);
    if (serverExited) throw new Error('preview 서버가 준비 전에 종료되었습니다.');
    console.log('[run] 서버 준비 완료 — 캡처 시작\n');

    const { total, captured, failures } = await capturePages({ baseUrl: BASE_URL });

    console.log(`\n[run] 캡처 결과: ${captured}/${total} 성공`);
    if (failures.length > 0) {
      console.log(`[run] 실패 ${failures.length}건:`);
      for (const f of failures) console.log(`  - ${f.id}: ${f.reason}`);
    }
    process.exitCode = failures.length === 0 && captured === total ? 0 : 1;
  } finally {
    console.log('[run] preview 서버 종료');
    await killTree(server);
  }
}

main().catch((err) => {
  console.error('[run] 오류:', err);
  process.exitCode = 1;
});
