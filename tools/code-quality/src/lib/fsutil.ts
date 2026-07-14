/**
 * 파일 시스템 공통 유틸 — 리포 루트 탐색 · 재귀 파일 순회.
 * 외부 의존성 0 (node 내장 모듈만). 가드 도구는 각자 독립 실행 가능해야 하므로
 * 도구별로 최소 복사본을 유지한다 (tools/naming-guard/src/lib/fsutil.ts 와 같은 규약).
 */
import fs from 'node:fs';
import path from 'node:path';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.turbo',
  'storybook-static',
]);

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
 * baseDir 를 재귀 순회하여 파일의 POSIX 상대경로(리포 루트 기준) 목록을 반환한다.
 * 디렉터리가 없으면 빈 배열 — 단, 호출부가 "대상 부재"를 통과로 오인하지 않도록
 * 존재 여부는 별도로 확인한다 (공허 통과 금지).
 */
export function walkFiles(root: string, relDir: string, extensions?: string[]): string[] {
  const baseDir = path.join(root, ...relDir.split('/'));
  if (!fs.existsSync(baseDir)) return [];
  const out: string[] = [];
  const stack: string[] = [relDir];
  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur === undefined) break;
    const abs = path.join(root, ...cur.split('/'));
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const childRel = `${cur}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) stack.push(childRel);
      } else if (entry.isFile()) {
        if (!extensions || extensions.some((e) => entry.name.endsWith(e))) out.push(childRel);
      }
    }
  }
  return out.sort();
}

export function ensureDir(absPath: string): void {
  fs.mkdirSync(absPath, { recursive: true });
}

export function readText(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, ...rel.split('/')), 'utf8');
}

export function exists(root: string, rel: string): boolean {
  return fs.existsSync(path.join(root, ...rel.split('/')));
}

/** POSIX 상대경로 결합 — './x', '../y' 를 해석한다 (path.posix 기반). */
export function joinPosix(fromDir: string, spec: string): string {
  return path.posix.normalize(path.posix.join(fromDir, spec));
}

export function dirnamePosix(rel: string): string {
  return path.posix.dirname(rel);
}
