/**
 * 파일 시스템 공통 유틸 — 리포 루트 탐색 · 재귀 파일 순회 · JSON 읽기.
 * 외부 의존성 0 (node 내장 모듈만 사용). 가드 도구는 각자 독립 실행 가능해야 하므로
 * 도구별로 최소 복사본을 유지한다.
 */
import fs from 'node:fs';
import path from 'node:path';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo']);

/** pnpm-workspace.yaml 이 있는 상위 디렉터리를 리포 루트로 판별한다. */
export function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('리포 루트를 찾을 수 없습니다 (pnpm-workspace.yaml 기준으로 탐색).');
    }
    dir = parent;
  }
}

/**
 * 디렉터리를 재귀 순회하여 파일의 POSIX 상대경로 목록을 반환한다.
 * 디렉터리가 없으면 빈 배열 (부트스트랩 단계 배려).
 */
export function walkFiles(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) return [];
  const out: string[] = [];
  const stack: string[] = [''];
  while (stack.length > 0) {
    const rel = stack.pop();
    if (rel === undefined) break;
    const abs = path.join(baseDir, rel);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel === '' ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) stack.push(childRel);
      } else if (entry.isFile()) {
        out.push(childRel);
      }
    }
  }
  return out.sort();
}

export function readJson<T>(absPath: string): T {
  return JSON.parse(fs.readFileSync(absPath, 'utf8')) as T;
}

export function ensureDir(absPath: string): void {
  fs.mkdirSync(absPath, { recursive: true });
}
