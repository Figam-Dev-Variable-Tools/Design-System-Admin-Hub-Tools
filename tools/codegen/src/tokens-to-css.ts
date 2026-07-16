/**
 * 토큰 → CSS 변수 / 타입드 맵 생성기.
 *
 * tokens/tokens.json (W3C DTCG) →
 *   packages/ui/generated/tokens/tokens.css  (:root 라이트 + [data-theme='dark'] 다크)
 *   packages/ui/generated/tokens/tokens.ts   (as const 타입드 맵 + cssVar 헬퍼)
 *
 * 규칙:
 *  - 토큰 경로 → CSS 변수명: color.action.primary.default → --tds-color-action-primary-default
 *  - 참조 토큰 {token.path} 는 값으로 풀지 않고 var(--tds-token-path) 체인으로 해석
 *    → 다크 테마에서 참조 대상만 바뀌어도 체인이 자동 반영된다
 *  - number 값: $type dimension → px, duration → ms, 그 외 무단위
 *  - 합성 값(shadow 등)은 단일 선언으로 조립, 그 외 객체 값은 하위 키별 서브 변수로 전개
 */
import path from 'node:path';
import { GENERATED_TOKENS_DIR, TOKENS_JSON_PATH, relFromRepo } from './paths';
import { FlatToken, GeneratedFile, cssVarName, flattenTokens, kebab } from './shared';

const REF_RE = /\{([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9-]+)+)\}/g;

/** 문자열 내 {token.path} 참조를 var(--tds-...) 체인으로 치환 */
function resolveRefs(s: string): string {
  return s.replace(REF_RE, (_m, refPath: string) => `var(${cssVarName(refPath)})`);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function primitiveToCss(value: unknown, type: string | undefined): string {
  if (typeof value === 'string') return resolveRefs(value);
  if (typeof value === 'number') {
    if (type === 'dimension') return `${value}px`;
    if (type === 'duration') return `${value}ms`;
    return String(value);
  }
  return String(value);
}

/** DTCG shadow 합성 값 → box-shadow 선언 */
function shadowToCss(v: Record<string, unknown>, type: string | undefined): string {
  const part = (x: unknown): string => primitiveToCss(x, 'dimension');
  const pieces = [
    v['inset'] === true ? 'inset' : undefined,
    part(v['offsetX'] ?? '0'),
    part(v['offsetY'] ?? '0'),
    part(v['blur'] ?? '0'),
    v['spread'] !== undefined ? part(v['spread']) : undefined,
    typeof v['color'] === 'string' ? resolveRefs(v['color'] as string) : undefined,
  ].filter((s): s is string => s !== undefined);
  void type;
  return pieces.join(' ');
}

function isShadowLike(v: Record<string, unknown>, type: string | undefined): boolean {
  return type === 'shadow' || ('offsetX' in v && 'offsetY' in v);
}

/**
 * 하나의 토큰 값 → [CSS 변수명, CSS 값] 목록.
 * 대부분 1건이지만, 합성 객체(typography 등)는 하위 키별 서브 변수로 전개된다.
 */
function tokenToCssDeclarations(
  tokenPath: string,
  value: unknown,
  type: string | undefined,
): Array<[string, string]> {
  const varName = cssVarName(tokenPath);

  if (Array.isArray(value)) {
    // fontFamily 스택 · 다중 shadow · cubicBezier 좌표
    const parts = value.map((item) =>
      isPlainObject(item) ? shadowToCss(item, type) : primitiveToCss(item, type),
    );
    // cubicBezier 는 4개 좌표 배열이다 — 유효한 timing-function 이 되도록 cubic-bezier() 로 감싼다.
    // (감싸지 않으면 consumer 가 bare 좌표를 받아 animation/transition shorthand 가 깨진다 — TOKEN-03)
    if (type === 'cubicBezier') return [[varName, `cubic-bezier(${parts.join(', ')})`]];
    return [[varName, parts.join(', ')]];
  }

  if (isPlainObject(value)) {
    if (isShadowLike(value, type)) return [[varName, shadowToCss(value, type)]];
    // typography 등 기타 합성 → 서브 변수 전개 (--tds-...-font-size 등)
    const decls: Array<[string, string]> = [];
    for (const [key, sub] of Object.entries(value)) {
      if (sub === undefined || sub === null || isPlainObject(sub) || Array.isArray(sub)) continue;
      decls.push([`${varName}-${kebab(key)}`, primitiveToCss(sub, undefined)]);
    }
    return decls;
  }

  return [[varName, primitiveToCss(value, type)]];
}

export function generateTokenOutputs(doc: Record<string, unknown>): GeneratedFile[] {
  const flat = flattenTokens(doc);
  const tokens = [...flat.values()];

  // --- tokens.css ------------------------------------------------------------
  const lightDecls: Array<[string, string]> = [];
  const darkDecls: Array<[string, string]> = [];
  for (const t of tokens) {
    lightDecls.push(...tokenToCssDeclarations(t.path, t.value, t.type));
    if (t.dark !== undefined) darkDecls.push(...tokenToCssDeclarations(t.path, t.dark, t.type));
  }

  const css: string[] = [];
  css.push(
    `/* AUTO-GENERATED from ${relFromRepo(TOKENS_JSON_PATH)} — DO NOT EDIT (pnpm codegen) */`,
  );
  css.push('');
  css.push('/* 라이트 테마 (기본) */');
  css.push(':root {');
  for (const [name, value] of lightDecls) css.push(`  ${name}: ${value};`);
  css.push('}');
  css.push('');
  css.push('/* 다크 테마 오버라이드 */');
  css.push("[data-theme='dark'] {");
  for (const [name, value] of darkDecls) css.push(`  ${name}: ${value};`);
  css.push('}');
  css.push('');

  // --- tokens.ts ---------------------------------------------------------------
  const ts: string[] = [];
  ts.push(`// AUTO-GENERATED from ${relFromRepo(TOKENS_JSON_PATH)} — DO NOT EDIT (pnpm codegen)`);
  ts.push('');
  ts.push('/** 토큰 경로 → CSS 변수명 타입드 맵 */');
  ts.push('export const tokenVars = {');
  for (const t of tokens) {
    ts.push(`  '${t.path}': '${cssVarName(t.path)}',`);
  }
  ts.push('} as const;');
  ts.push('');
  ts.push('export type TokenPath = keyof typeof tokenVars;');
  ts.push('');
  ts.push('/** 토큰 경로를 var() 참조 문자열로 변환 — 컴포넌트 스타일에서 사용 */');
  ts.push('export function cssVar(tokenPath: TokenPath): string {');
  ts.push('  return `var(${tokenVars[tokenPath]})`;');
  ts.push('}');
  ts.push('');

  return [
    { filePath: path.join(GENERATED_TOKENS_DIR, 'tokens.css'), content: css.join('\n') },
    { filePath: path.join(GENERATED_TOKENS_DIR, 'tokens.ts'), content: ts.join('\n') },
  ];
}

/** 다크 오버라이드가 하나라도 있는지 (진단 출력용) */
export function countDarkOverrides(doc: Record<string, unknown>): number {
  return [...flattenTokens(doc).values()].filter((t: FlatToken) => t.dark !== undefined).length;
}
