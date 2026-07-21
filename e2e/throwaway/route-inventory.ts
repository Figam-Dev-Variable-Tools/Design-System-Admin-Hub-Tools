// 라우트 인벤토리 — App.tsx / nav-config.ts 에서 **기계적으로** 뽑는다.
// 손으로 적은 목록은 화면이 늘어나는 순간 낡는다. 여기서는 소스를 읽어 파생시킨다.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..', '..');
const APP_TSX = resolve(repoRoot, 'apps/admin/src/App.tsx');
const NAV_CONFIG = resolve(repoRoot, 'apps/admin/src/shared/layout/nav-config.ts');

/**
 * App.tsx 에 등록된 모든 라우트 경로.
 *
 * 경로는 **두 가지 모양**으로 적혀 있고 둘 다 읽어야 한다:
 *   1. APP_ROUTES 배열의 객체 리터럴 — `{ path: '/users/members', ... }`
 *   2. JSX 속성 — `<Route path="/login" element={<LoginPage />} />`
 * 1번만 읽으면 셸 밖의 화면(/login)이 인벤토리에서 통째로 빠진다. 그러면 순회는 초록불인데
 * **한 번도 열어 보지 않은 화면**이 남는다 — 이 하니스가 없애려던 바로 그 거짓말이다.
 */
export function appRoutePaths(): readonly string[] {
  const src = readFileSync(APP_TSX, 'utf8');
  const out: string[] = [];
  let m: RegExpExecArray | null;

  const objectForm = /path:\s*'([^']+)'/g;
  while ((m = objectForm.exec(src)) !== null) out.push(m[1] as string);

  const jsxForm = /<Route\b[^>]*\bpath="([^"]+)"/g;
  while ((m = jsxForm.exec(src)) !== null) out.push(m[1] as string);

  return out;
}

/** nav-config.ts 의 사이드바 잎 경로 (`['라벨', '/경로']`) */
export function navLeafPaths(): readonly string[] {
  const src = readFileSync(NAV_CONFIG, 'utf8');
  const out: string[] = [];
  const pair = /\[\s*'[^']*'\s*,\s*'(\/[^']*)'\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = pair.exec(src)) !== null) out.push(m[1] as string);
  // leaf(icon, permission, label, to) 형태의 단일 잎
  const single = /leaf\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'(\/[^']*)'\s*\)/g;
  while ((m = single.exec(src)) !== null) out.push(m[1] as string);
  return out;
}

export interface RouteEntry {
  /** 라우터에 등록된 패턴 (`/users/members/:id`) */
  readonly pattern: string;
  readonly dynamic: boolean;
}

export function allRoutes(): readonly RouteEntry[] {
  const seen = new Set<string>();
  const out: RouteEntry[] = [];
  for (const p of [...appRoutePaths(), ...navLeafPaths()]) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push({ pattern: p, dynamic: p.includes(':') || p.includes('*') });
  }
  return out;
}

/**
 * 동적 파라미터를 **픽스처에서 실제로 존재하는 id** 로 채운다.
 * 각 도메인의 data-source.ts 가 SEED 배열을 갖고 있고, 그 첫 `id: '...'` 가 목록 첫 행이다.
 * id 를 지어내지 않는 것이 요점 — 없는 id 는 '찾을 수 없음' 화면을 열어 거짓 음성을 만든다.
 */
const PAGES_DIR = resolve(repoRoot, 'apps/admin/src/pages');

/** 라우트 프리픽스 → data-source 디렉터리 (규칙에서 벗어나는 것만 적는다) */
const DIR_OVERRIDES: Readonly<Record<string, string>> = {
  '/products': 'products/items',
  '/users/members': 'members',
  '/users/admins': 'admins',
};

export function fixtureIdFor(pattern: string): string | null {
  const prefix = pattern.slice(0, pattern.indexOf('/:'));
  const rel = DIR_OVERRIDES[prefix] ?? prefix.replace(/^\//, '');
  const candidates = [
    resolve(PAGES_DIR, rel, 'data-source.ts'),
    resolve(PAGES_DIR, rel, 'fixtures.ts'),
  ];
  for (const file of candidates) {
    let src: string;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const m = /\bid:\s*'([^']+)'/.exec(src);
    if (m !== null) return m[1] as string;
  }
  return null;
}

/** 패턴을 정규식으로 — 수집한 실제 URL 이 이 패턴에 속하는지 판정한다 */
export function patternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('/')
    .filter((s) => s.length > 0)
    .map((seg) => {
      if (seg.startsWith(':')) return '([^/]+)';
      if (seg === '*') return '(.*)';
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^/${body}/?$`);
}
