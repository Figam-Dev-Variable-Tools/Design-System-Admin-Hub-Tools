/**
 * 파일 시스템 공통 유틸 — 리포 루트 탐색 · 재귀 파일 순회.
 * 외부 의존성 0 (node 내장 모듈만). 가드 도구는 각자 독립 실행 가능해야 하므로
 * 도구별로 최소 복사본을 유지한다 (tools/code-quality/src/lib/fsutil.ts 와 같은 규약).
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
 * 디렉터리가 없으면 빈 배열 — 호출부는 "대상 부재"를 통과로 오인하면 안 된다 (공허 통과 금지).
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

/** 1-based 줄 번호 — 위반 위치를 재현 가능하게 남기기 위한 것 */
export function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * openIndex 위치의 여는 괄호/중괄호에 대응하는 닫는 위치를 반환한다 (문자열·주석 인지).
 * 대응짝을 찾지 못하면 source.length 를 반환한다 — 파싱 실패를 "블록 없음"으로
 * 조용히 넘기지 않고 호출부가 그 사실을 알 수 있게 한다.
 */
export function matchBracket(source: string, openIndex: number): number {
  const open = source[openIndex];
  const close = open === '{' ? '}' : open === '(' ? ')' : open === '[' ? ']' : '';
  if (close === '') return source.length;

  let depth = 0;
  let i = openIndex;
  while (i < source.length) {
    const c = source[i];
    // 주석 건너뛰기
    if (c === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i);
      i = nl === -1 ? source.length : nl;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    // 문자열/템플릿 건너뛰기
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(source, i);
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return source.length;
}

/** quoteIndex 의 따옴표로 시작하는 문자열 리터럴의 끝 다음 인덱스를 반환한다. */
export function skipString(source: string, quoteIndex: number): number {
  const q = source[quoteIndex];
  let i = quoteIndex + 1;
  while (i < source.length) {
    const c = source[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === q) return i + 1;
    i++;
  }
  return source.length;
}
