/**
 * 네이밍 규칙 정의 및 검사 구현 (네이밍 가드 Naming Convention AI)
 *
 * 규칙 목록 (설계서 §3 네이밍 가드 · §8 G3 체크리스트):
 *  - component-dir   : packages/ui/src/** 컴포넌트 폴더 PascalCase
 *                      (atomic 레벨 폴더 + 문서 전용 폴더는 화이트리스트 — ADR-0002)
 *  - component-file  : 컴포넌트 파일 <Name>.tsx (PascalCase) + 허용 보조 파일 패턴
 *                      (문서 전용 폴더에 한해 `_` 접두 비공개 모듈 추가 허용 — ADR-0002)
 *  - story-file      : Story 파일 <Name>.stories.tsx
 *  - mdx-file        : MDX 문서 <Name>.mdx
 *  - contract-file   : 계약 파일 <Name>.contract.json (PascalCase)
 *  - token-path      : tokens.json 경로 세그먼트 lowercase + 하이픈
 *  - boolean-prop    : boolean prop 은 is/has/can 접두, 표시 토글 접두(show/hide/dim — ADR-0005),
 *                      또는 상태 형용사 화이트리스트
 *  - event-name      : 이벤트는 on[A-Z]* 형식
 *  - icon-file       : 아이콘 <name>-<12|16|20|24>-<filled|outlined|rounded|sharp>.svg
 */
import path from 'node:path';
import { posixBasename, readJson } from './lib/fsutil.ts';

export interface Violation {
  rule: string;
  path: string;
  message: string;
}

export const PASCAL_RE = /^[A-Z][A-Za-z0-9]*$/;
export const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BOOL_PREFIX_RE = /^(?:is|has|can)[A-Z][A-Za-z0-9]*$/;

/**
 * 표시 토글 접두 (ADR-0005).
 *
 * `showLegend`, `hideWhenZero`, `dimZero` 처럼 **무엇을 보여줄지**를 켜고 끄는 boolean 은
 * React 생태계의 사실상 표준 관례이고, 규칙 의도(불리언이 술어로 읽힐 것)를 이미 만족한다.
 * 접두 3개는 **열거 가능한 전체 집합**이다 — 늘리려면 아키텍처 승인(ADR)이 필요하다.
 * 이 목록을 열어두면 결국 모든 동사 접두가 통과해 규칙이 무의미해진다.
 */
export const BOOL_DISPLAY_PREFIX_RE = /^(?:show|hide|dim)[A-Z][A-Za-z0-9]*$/;
export const EVENT_RE = /^on[A-Z][A-Za-z0-9]*$/;
export const ICON_RE =
  /^[a-z0-9]+(?:-[a-z0-9]+)*-(?:12|16|20|24)-(?:filled|outlined|rounded|sharp)\.svg$/;

/** Atomic Design 레벨 폴더 — lowercase 허용 화이트리스트 */
export const LEVEL_DIRS = new Set(['atoms', 'molecules', 'organisms', 'templates', 'pages']);

/**
 * 문서 전용 폴더 — 배포되는 컴포넌트가 아니라 스펙시멘/카탈로그 스토리만 담는다 (ADR-0002).
 * Atomic 레벨이 아니므로 PascalCase 폴더 규칙 대상이 아니며, 스토리 간 공용 렌더 유틸을
 * `_` 접두 비공개 모듈로 둘 수 있다 (public entry 로 재노출 금지 — src/index.ts 에서 export 하지 않음).
 *
 *  - foundations : 토큰 스펙시멘 스토리 (색·타이포·간격·모션…)
 *  - catalog     : 23 모듈 분류표 대비 구현 현황 체크리스트 스토리
 *                  (원천 taxonomy/taxonomy.v1.json → generated/taxonomy.ts)
 */
export const DOC_ONLY_DIRS = new Set(['foundations', 'catalog']);

/** 문서 전용 폴더에서 추가로 허용되는 파일명 패턴 — `_` 접두 비공개 모듈 */
const DOC_ONLY_FILE_PATTERNS: RegExp[] = [/^_[a-z][A-Za-z0-9]*\.tsx?$/];

/**
 * boolean prop 상태 형용사 화이트리스트 (is/has/can 접두 없이 허용).
 * G3 체크리스트: "boolean은 is/has/can 또는 형용사"
 */
export const BOOLEAN_STATE_WHITELIST = new Set([
  'loading',
  'disabled',
  'readonly',
  'required',
  'open',
  'checked',
  'selected',
  'multiple',
  'active',
  'expanded',
  'collapsed',
  'visible',
  'hidden',
  'indeterminate',
  'busy',
  'revealed',
  'inline',
  'dense',
  'fluid',
  'bordered',
  'striped',
  'hoverable',
  'closable',
  'clearable',
  'searchable',
  'error',
]);

/** packages/ui/src/** 에서 허용되는 파일명 패턴 */
const UI_FILE_PATTERNS: RegExp[] = [
  /^README\.md$/, // 디렉터리 안내 문서 (부트스트랩 placeholder 포함)
  /^\.gitkeep$/, // 빈 디렉터리 유지용
  /^index\.tsx?$/,
  /^[A-Z][A-Za-z0-9]*\.tsx$/,
  /^[A-Z][A-Za-z0-9]*\.stories\.tsx$/,
  /^[A-Z][A-Za-z0-9]*\.mdx$/,
  /^[A-Z][A-Za-z0-9]*\.types\.ts$/,
  /^[A-Z][A-Za-z0-9]*\.play\.ts$/,
  /^[A-Z][A-Za-z0-9]*\.test\.tsx?$/,
  /^[A-Z][A-Za-z0-9]*(?:\.module)?\.css$/,
];

/**
 * packages/ui/src/** 경로 검사 — 폴더/파일 PascalCase, Story/MDX 파일 규칙.
 * @param relPaths 리포 루트 기준 POSIX 상대경로 (packages/ui/src/ 하위만)
 */
export function checkUiPaths(relPaths: string[]): Violation[] {
  const violations: Violation[] = [];
  const seenDirs = new Set<string>();
  const PREFIX = 'packages/ui/src/';

  for (const rel of relPaths) {
    if (!rel.startsWith(PREFIX)) continue;
    const inner = rel.slice(PREFIX.length);
    const segments = inner.split('/');
    const base = segments.pop() ?? '';

    // 문서 전용 폴더(foundations 등)는 컴포넌트 레이어가 아니다 — ADR-0002
    const inDocOnlyDir = segments.length > 0 && DOC_ONLY_DIRS.has(segments[0] ?? '');

    // 디렉터리 세그먼트: atomic 레벨 폴더 또는 문서 전용 폴더 또는 PascalCase
    let dirPath = 'packages/ui/src';
    for (const seg of segments) {
      dirPath += `/${seg}`;
      if (seenDirs.has(dirPath)) continue;
      seenDirs.add(dirPath);
      if (!LEVEL_DIRS.has(seg) && !DOC_ONLY_DIRS.has(seg) && !PASCAL_RE.test(seg)) {
        violations.push({
          rule: 'component-dir',
          path: dirPath,
          message: `폴더명 "${seg}" — PascalCase 또는 레벨 폴더(${[...LEVEL_DIRS].join('/')}) 또는 문서 전용 폴더(${[...DOC_ONLY_DIRS].join('/')})만 허용`,
        });
      }
    }

    // 파일명 패턴 — 문서 전용 폴더는 `_` 접두 비공개 모듈을 추가 허용
    const allowedFilePatterns = inDocOnlyDir
      ? [...UI_FILE_PATTERNS, ...DOC_ONLY_FILE_PATTERNS]
      : UI_FILE_PATTERNS;

    if (!allowedFilePatterns.some((re) => re.test(base))) {
      let rule = 'component-file';
      let expected =
        '<Name>.tsx (PascalCase) 또는 index.ts, <Name>.types.ts, <Name>.play.ts, <Name>.test.tsx, <Name>.css';
      if (base.includes('.stories.')) {
        rule = 'story-file';
        expected = '<Name>.stories.tsx (Name = PascalCase 컴포넌트명)';
      } else if (base.endsWith('.mdx')) {
        rule = 'mdx-file';
        expected = '<Name>.mdx (Name = PascalCase 컴포넌트명)';
      }
      violations.push({
        rule,
        path: rel,
        message: `파일명 "${base}" 규칙 위반 — 기대: ${expected}`,
      });
    }
  }
  return violations;
}

/**
 * 계약 파일명 검사 — contracts/ 직하 *.json 은 <Name>.contract.json (PascalCase) 이어야 한다.
 * @param relPaths contracts/ 직하 .json 파일의 리포 루트 기준 상대경로
 */
export function checkContractFileNames(relPaths: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const rel of relPaths) {
    const base = posixBasename(rel);
    if (!/^[A-Z][A-Za-z0-9]*\.contract\.json$/.test(base)) {
      violations.push({
        rule: 'contract-file',
        path: rel,
        message: `계약 파일명 "${base}" — <Name>.contract.json (PascalCase) 규칙 위반`,
      });
    }
  }
  return violations;
}

/** 계약 내용 검사 — boolean prop 네이밍 + 이벤트 on[A-Z]* 규칙 */
export function checkContractContent(root: string, relPath: string): Violation[] {
  const violations: Violation[] = [];
  let doc: unknown;
  try {
    doc = readJson<unknown>(path.join(root, ...relPath.split('/')));
  } catch (e) {
    violations.push({
      rule: 'contract-parse',
      path: relPath,
      message: `JSON 파싱 실패 — ${(e as Error).message}`,
    });
    return violations;
  }
  if (!doc || typeof doc !== 'object') return violations;
  const contract = doc as Record<string, unknown>;

  const props = contract['props'];
  if (props && typeof props === 'object' && !Array.isArray(props)) {
    for (const [propName, propDef] of Object.entries(props as Record<string, unknown>)) {
      const type =
        propDef && typeof propDef === 'object'
          ? (propDef as Record<string, unknown>)['type']
          : undefined;
      if (type === 'boolean') {
        const ok =
          BOOL_PREFIX_RE.test(propName) ||
          BOOL_DISPLAY_PREFIX_RE.test(propName) ||
          BOOLEAN_STATE_WHITELIST.has(propName);
        if (!ok) {
          violations.push({
            rule: 'boolean-prop',
            path: relPath,
            message: `boolean prop "${propName}" — is/has/can 접두, 표시 토글 접두(show/hide/dim), 또는 상태 형용사 화이트리스트(loading, disabled, readonly, required, busy, revealed 등)만 허용`,
          });
        }
      }
    }
  }

  const events = contract['events'];
  if (events && typeof events === 'object' && !Array.isArray(events)) {
    for (const eventName of Object.keys(events as Record<string, unknown>)) {
      if (!EVENT_RE.test(eventName)) {
        violations.push({
          rule: 'event-name',
          path: relPath,
          message: `이벤트 "${eventName}" — on[A-Z]* 형식 위반 (예: onClick, onChange)`,
        });
      }
    }
  }
  return violations;
}

/** tokens.json 경로 세그먼트 검사 — lowercase + 하이픈 ($ 접두 DTCG 메타 키는 제외) */
export function checkTokenPaths(root: string, relPath = 'tokens/tokens.json'): Violation[] {
  const violations: Violation[] = [];
  let doc: unknown;
  try {
    doc = readJson<unknown>(path.join(root, ...relPath.split('/')));
  } catch (e) {
    violations.push({
      rule: 'token-parse',
      path: relPath,
      message: `JSON 파싱 실패 — ${(e as Error).message}`,
    });
    return violations;
  }

  const recurse = (node: unknown, trail: string[]): void => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key.startsWith('$')) continue; // DTCG 메타 키 ($value, $type, $description ...)
      if (!KEBAB_RE.test(key)) {
        violations.push({
          rule: 'token-path',
          path: relPath,
          message: `토큰 경로 세그먼트 "${[...trail, key].join('.')}" — lowercase+하이픈([a-z0-9-]) 규칙 위반`,
        });
      }
      recurse(value, [...trail, key]);
    }
  };
  recurse(doc, []);
  return violations;
}

/** 아이콘 파일명 검사 — <name>-<12|16|20|24>-<filled|outlined|rounded|sharp>.svg */
export function checkIconFiles(relPaths: string[]): Violation[] {
  const violations: Violation[] = [];
  for (const rel of relPaths) {
    if (!rel.endsWith('.svg')) continue;
    const base = posixBasename(rel);
    if (!ICON_RE.test(base)) {
      violations.push({
        rule: 'icon-file',
        path: rel,
        message: `아이콘 파일명 "${base}" — <name>-<12|16|20|24>-<filled|outlined|rounded|sharp>.svg 규칙 위반 (name 은 lowercase+하이픈)`,
      });
    }
  }
  return violations;
}
