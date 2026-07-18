// 자산 서버 — Storybook/페이지 실사(reports/) 를 Figma 플러그인 UI 에 공급한다.
//
// [왜 서버인가] 플러그인 UI(iframe)는 로컬 파일을 직접 못 읽고, main(샌드박스)은 네트워크가
// 없다. 그래서 UI 가 fetch 할 수 있는 최소 정적 서버를 띄운다 — manifest.json 의
// networkAccess.allowedDomains 가 이 오리진(http://127.0.0.1:3999)만 허용한다.
// 이미지 바이트는 여기서 흐르고(대용량), 소형 매니페스트만 빌드시 UI 에 내장된다.
//
// [보안] 읽기 전용, reports/ 밖으로는 못 나간다(경로 정규화 + prefix 검사). CORS 는 '*'
// (플러그인 iframe 은 null 오리진). 무의존 — node 표준 http/fs 만.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const ROOT = path.join(REPO_ROOT, 'reports'); // 서빙 루트 — 이 밖은 금지
const PORT = 3999;

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  try {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    // reports/ 안으로 정규화 — '..' 탈출을 차단한다
    const abs = path.normalize(path.join(ROOT, urlPath));
    if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
      res.writeHead(403, cors);
      res.end('forbidden');
      return;
    }
    const info = await stat(abs);
    if (!info.isFile()) {
      res.writeHead(404, cors);
      res.end('not a file');
      return;
    }
    const body = await readFile(abs);
    res.writeHead(200, {
      ...cors,
      'Content-Type': MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
    res.end('not found');
  }
});

// 127.0.0.1 에 바인딩한다. Figma(데스크톱=Chromium)의 http://localhost:3999 요청은 localhost→루프백
// 폴백으로 이 리스너에 닿는다. manifest.allowedDomains 는 IP 불허라 URL 은 localhost 로 통일.
server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `자산 서버 실행: http://localhost:${PORT}/  (루트: ${path.relative(REPO_ROOT, ROOT)})`,
  );
  console.log('  Figma 플러그인 UI 가 여기서 Storybook·페이지 실사를 가져갑니다. 종료: Ctrl+C');
});
