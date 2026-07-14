/**
 * 축 1의 스코프를 **워크스페이스에서 파생**한다 (A00/A01 판정 1).
 *
 * 하드코딩(`['packages/ui', 'apps/admin']`)하지 않는 이유:
 * 손으로 두 개를 박아 두면 **세 번째 패키지가 추가되는 날 같은 구멍이 다시 열린다.**
 * 새 앱/패키지는 자동으로 축 1의 대상이 되어야 한다.
 *
 * 원천은 `pnpm-workspace.yaml` 의 `packages:` 글롭이다.
 *
 * **왜 `tools/*` 는 축 1의 스코프가 아닌가.**
 * 워크스페이스 글롭은 `tools/*` 도 포함하지만, 검증 도구의 테스트 요구는 **축 5(골든 픽스처)**가
 * 이미 담당한다 (레지스트리 blockCondition 이 인가한 범위). `tools/*` 11개를 축 1에 넣으면
 * 레지스트리가 인가하지 않은 blocker 11건을 **도구가 발명하는 것**이 된다 — A77이 지켜야 할
 * 원칙("도구가 스스로 blocker 를 발명하지 않는다")의 정면 위반이다.
 * 그래서 **제품 스코프(apps/* · packages/*)만** 축 1의 대상으로 파생한다.
 * 이 경계 자체를 바꾸는 것은 A01의 ADR 사안이다.
 *
 * `e2e/` 는 워크스페이스 패키지가 아니므로 스코프가 아니다 — 그 커버리지는 축 4(래칫)가 잰다.
 */
import fs from 'node:fs';
import path from 'node:path';

/** 축 1이 테스트를 요구하는 워크스페이스 루트 — 여기 아래의 패키지가 자동 편입된다 */
export const PRODUCT_ROOTS = ['apps', 'packages'];

export interface Scope {
  /** package.json 의 name (예: @tds/ui) */
  name: string;
  /** 리포 루트 기준 POSIX 경로 (예: packages/ui) */
  dir: string;
}

/** `pnpm-workspace.yaml` 의 `packages:` 아래 글롭 목록을 읽는다 (의존성 0 — 최소 파서). */
function readWorkspaceGlobs(root: string): string[] {
  const file = path.join(root, 'pnpm-workspace.yaml');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const globs: string[] = [];
  let inPackages = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trimEnd();
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      const m = /^\s+-\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line);
      if (m?.[1] !== undefined) {
        globs.push(m[1]);
        continue;
      }
      // 들여쓰기가 끝나면 packages 블록도 끝난다
      if (line.trim() !== '' && !/^\s/.test(line)) inPackages = false;
    }
  }
  return globs;
}

/** `apps/*` → apps 아래의 package.json 을 가진 디렉터리들. 정확 경로도 지원한다. */
function expand(root: string, glob: string): string[] {
  const hasStar = glob.endsWith('/*');
  const base = hasStar ? glob.slice(0, -2) : glob;
  const abs = path.join(root, ...base.split('/'));
  if (!fs.existsSync(abs)) return [];

  if (!hasStar) {
    return fs.existsSync(path.join(abs, 'package.json')) ? [base] : [];
  }
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'node_modules')
    .map((e) => `${base}/${e.name}`)
    .filter((rel) => fs.existsSync(path.join(root, ...rel.split('/'), 'package.json')));
}

/**
 * 축 1의 스코프 목록 — 워크스페이스에서 파생한 **제품 패키지**들.
 * 목록이 비면 호출부는 "측정 불가"로 처리해야 한다 (스코프가 없다 ≠ 통과다).
 */
export function productScopes(root: string): Scope[] {
  const globs = readWorkspaceGlobs(root).filter((g) =>
    PRODUCT_ROOTS.some((r) => g === r || g.startsWith(`${r}/`)),
  );
  const dirs = [...new Set(globs.flatMap((g) => expand(root, g)))].sort();

  return dirs.map((dir) => {
    let name = dir;
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(root, ...dir.split('/'), 'package.json'), 'utf8'),
      ) as { name?: string };
      name = pkg.name ?? dir;
    } catch {
      // package.json 이 깨졌어도 스코프는 존재한다 — 경로를 이름으로 쓴다
    }
    return { name, dir };
  });
}
