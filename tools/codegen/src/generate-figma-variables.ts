/**
 * 토큰 → Figma Variables 페이로드 생성기.
 *
 * tokens/tokens.json (W3C DTCG) →
 *   tools/figma-plugin/generated/tokens/figma-variables.json
 *
 * Figma 플러그인(tools/figma-plugin/src/main.ts)의 TokensPayload 규격과 필드명이 1:1 대응한다:
 *   { collection: 'TDS Tokens', modes: ['light', 'dark'],
 *     variables: [{ name, type, values: { light, dark } }] }
 *
 * 변환 규칙 (플러그인 toFigmaValue 가 실제 처리하는 형식에 정합):
 *  - Variable 이름: 토큰 경로의 점을 슬래시로 — color.action.primary.default → color/action/primary/default
 *  - $type → Figma 타입: color→COLOR · dimension/spacing/radius/sizing/borderWidth/duration/number/fontWeight→FLOAT
 *    · fontFamily/cubicBezier→STRING · boolean 값→BOOLEAN · 그 외 문자열→STRING
 *  - COLOR 값은 hex 문자열로 출력한다 — hex→RGBA 변환은 플러그인(parseHexColor)이 수행
 *  - FLOAT 값은 숫자로 정규화한다: '4px'→4 · '0.75rem'→12 (1rem=16px 기준) · '150ms'→150 · '0.4s'→400
 *  - 참조 토큰 {a.b.c} 는 모드 컨텍스트에서 체인 끝까지 해석해 raw 값을 values 에 기록하고,
 *    참조 대상 Variable 이름(a/b/c)을 alias 필드에 병기한다. Figma VARIABLE_ALIAS 는 대상
 *    Variable ID(파일별 부여)가 필요해 codegen 시점에 만들 수 없다 — 현행 플러그인은
 *    values(raw)만 바인딩하며 alias 는 추후 이름→ID 해석 후 승격하기 위한 메타데이터다.
 *  - 다크 값 우선순위: 토큰별 $extensions['tds.modes'].dark (tokens.json 규약) →
 *    shared 다크 인코딩(최상위 dark 그룹 / $extensions dark 계열) → 라이트 값 복제
 *    (플러그인 syncTokens 는 두 모드 모두 setValueForMode 하므로 다크 누락 불가)
 *  - typography 등 합성 객체는 하위 키별 서브 Variable 로 전개 — typography/label/md/font-size 등
 *  - cubicBezier [x1, y1, x2, y2] → 'cubic-bezier(x1, y1, x2, y2)' 문자열
 */
import { FIGMA_VARIABLES_PATH, TOKENS_JSON_PATH, relFromRepo } from './paths';
import { FlatToken, GeneratedFile, flattenTokens, kebab } from './shared';

/** 플러그인이 생성/갱신하는 컬렉션 이름 — main.ts TokensPayload.collection 과 동일해야 한다 */
const COLLECTION_NAME = 'TDS Tokens';

/** 플러그인 ensureLightDarkModes 가 보장하는 2모드 — 이름/순서 고정 */
const MODES: readonly Mode[] = ['light', 'dark'];

type Mode = 'light' | 'dark';

// ---------------------------------------------------------------------------
// 출력 타입 — main.ts 의 TokenVariableSpec / TokensPayload 와 필드명 1:1
// ---------------------------------------------------------------------------

type FigmaVariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
type FigmaVariableValue = string | number | boolean;

interface FigmaVariableSpec {
  /** Figma 그룹 구분은 슬래시 — 예: 'color/action/primary/default' */
  name: string;
  type: FigmaVariableType;
  /** 라이트/다크 페어 — 참조는 모드별로 끝까지 해석된 raw 값 */
  values: { light: FigmaVariableValue; dark: FigmaVariableValue };
  /** 참조 토큰의 대상 Variable 이름 — 현행 플러그인은 무시(raw 값 바인딩), VARIABLE_ALIAS 승격용 */
  alias?: { light?: string; dark?: string };
}

// ---------------------------------------------------------------------------
// 참조/모드 해석
// ---------------------------------------------------------------------------

/** 참조 경로 본문 — tokens-to-css 의 REF_RE 와 동일 문법 */
const REF_BODY = '[a-zA-Z][a-zA-Z0-9]*(?:\\.[a-zA-Z0-9-]+)+';
const REF_RE = new RegExp(`\\{(${REF_BODY})\\}`, 'g');
const FULL_REF_RE = new RegExp(`^\\{(${REF_BODY})\\}$`);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

interface ModePair {
  light?: unknown;
  dark?: unknown;
}

function unwrapDollarValue(v: unknown): unknown {
  return isPlainObject(v) && '$value' in v ? v['$value'] : v;
}

/**
 * 토큰별 $extensions['tds.modes'] 라이트/다크 페어를 경로별로 수집한다.
 * (tokens.json 의 페어링 규약 — shared.flattenTokens 는 이 키를 보존하지 않으므로 별도 수집)
 */
function collectModePairs(doc: Record<string, unknown>): Map<string, ModePair> {
  const out = new Map<string, ModePair>();

  const walk = (node: unknown, prefix: string[]): void => {
    if (!isPlainObject(node)) return;
    if ('$value' in node) {
      const ext = node['$extensions'];
      const modes = isPlainObject(ext) ? ext['tds.modes'] : undefined;
      if (isPlainObject(modes)) {
        const pair: ModePair = {};
        if (modes['light'] !== undefined) pair.light = unwrapDollarValue(modes['light']);
        if (modes['dark'] !== undefined) pair.dark = unwrapDollarValue(modes['dark']);
        if (pair.light !== undefined || pair.dark !== undefined) out.set(prefix.join('.'), pair);
      }
      return; // 토큰 리프 아래로는 내려가지 않는다 (flattenTokens 와 동일 기준)
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      walk(child, [...prefix, key]);
    }
  };

  for (const [key, child] of Object.entries(doc)) {
    if (key.startsWith('$')) continue;
    const lowered = key.toLowerCase();
    // 최상위 light/dark 그룹은 flattenTokens 가 프리픽스를 제거하므로 경로를 동일하게 맞춘다
    if (lowered === 'dark' || lowered === 'light') {
      walk(child, []);
      continue;
    }
    walk(child, [key]);
  }
  return out;
}

interface TokenTable {
  flat: Map<string, FlatToken>;
  modes: Map<string, ModePair>;
}

/** 모드별 원시(미해석) 값 — tds.modes 오버라이드 > shared 다크 인코딩 > 라이트 값 복제 순 */
function rawValueFor(table: TokenTable, tokenPath: string, mode: Mode): unknown {
  const token = table.flat.get(tokenPath);
  if (!token) {
    throw new Error(`토큰 참조 대상 없음: {${tokenPath}} — tokens/tokens.json 확인`);
  }
  const pair = table.modes.get(tokenPath);
  const light = pair?.light !== undefined ? pair.light : token.value;
  if (mode === 'light') return light;
  if (pair?.dark !== undefined) return pair.dark;
  if (token.dark !== undefined) return token.dark;
  return light;
}

/** 참조 체인을 모드 컨텍스트에서 재귀 해석 — 배열/객체 내부 참조까지 처리 */
function resolveValue(table: TokenTable, raw: unknown, mode: Mode, stack: string[]): unknown {
  if (typeof raw === 'string') {
    const full = FULL_REF_RE.exec(raw);
    if (full && full[1] !== undefined) {
      // 전체가 단일 참조 → 값 타입(hex/숫자/배열/객체)을 보존하며 재귀
      return resolveToken(table, full[1], mode, stack);
    }
    // 문자열 내 부분 참조 → 해석 값을 문자열로 치환
    return raw.replace(REF_RE, (_m, refPath: string) =>
      String(resolveToken(table, refPath, mode, stack)),
    );
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => resolveValue(table, item, mode, stack));
  }
  if (isPlainObject(raw)) {
    const out: Record<string, unknown> = {};
    for (const [key, sub] of Object.entries(raw)) out[key] = resolveValue(table, sub, mode, stack);
    return out;
  }
  return raw;
}

function resolveToken(table: TokenTable, tokenPath: string, mode: Mode, stack: string[]): unknown {
  if (stack.includes(tokenPath)) {
    throw new Error(`토큰 순환 참조: ${[...stack, tokenPath].join(' → ')}`);
  }
  return resolveValue(table, rawValueFor(table, tokenPath, mode), mode, [...stack, tokenPath]);
}

// ---------------------------------------------------------------------------
// 타입 매핑 / 값 정규화 — 플러그인 toFigmaValue 분기와 정합
// ---------------------------------------------------------------------------

/** 토큰 경로 → Figma Variable 이름 (점 → 슬래시 그룹) */
function figmaName(tokenPath: string): string {
  return tokenPath.split('.').join('/');
}

/** DTCG $type → Figma Variable 타입. 미지정 시 해석 값으로 추론 */
function figmaTypeFor(dtcgType: string | undefined, resolved: unknown): FigmaVariableType {
  switch (dtcgType) {
    case 'color':
      return 'COLOR';
    case 'dimension':
    case 'spacing':
    case 'radius':
    case 'sizing':
    case 'borderWidth':
    case 'duration':
    case 'number':
    case 'fontWeight':
      return 'FLOAT';
    case 'fontFamily':
    case 'cubicBezier':
      return 'STRING';
    default:
      break;
  }
  if (typeof resolved === 'number') return 'FLOAT';
  if (typeof resolved === 'boolean') return 'BOOLEAN';
  return 'STRING';
}

/** 플러그인 parseHexColor 가 지원하는 hex 형식 (#RGB/#RGBA/#RRGGBB/#RRGGBBAA) */
const HEX_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function toColorHex(name: string, resolved: unknown): string {
  if (typeof resolved === 'string' && HEX_RE.test(resolved.trim())) {
    return resolved.trim();
  }
  throw new Error(
    `COLOR 값이 hex 문자열이 아님: ${name} = ${JSON.stringify(resolved)} — 플러그인 parseHexColor 는 #RGB/#RGBA/#RRGGBB/#RRGGBBAA 만 지원`,
  );
}

/** FLOAT 는 숫자로 정규화 (main.ts 요구) — 단위 문자열은 px/ms 스케일 숫자로 변환 */
function toFloat(name: string, resolved: unknown): number {
  if (typeof resolved === 'number') return resolved;
  if (typeof resolved === 'string') {
    const m = /^(-?\d*\.?\d+)(px|rem|em|ms|s)?$/.exec(resolved.trim());
    if (m && m[1] !== undefined) {
      const n = Number.parseFloat(m[1]);
      if (m[2] === undefined || m[2] === 'px' || m[2] === 'ms') return n;
      if (m[2] === 'rem' || m[2] === 'em') return n * 16; // 1rem = 16px 기준 (Figma 는 px 스케일)
      if (m[2] === 's') return n * 1000;
    }
  }
  throw new Error(
    `FLOAT 정규화 실패: ${name} = ${JSON.stringify(resolved)} — 무단위 숫자/px/rem/em/ms/s 만 지원`,
  );
}

function toStringValue(resolved: unknown, dtcgType: string | undefined): string {
  if (Array.isArray(resolved)) {
    if (
      dtcgType === 'cubicBezier' &&
      resolved.length === 4 &&
      resolved.every((n) => typeof n === 'number')
    ) {
      return `cubic-bezier(${resolved.join(', ')})`;
    }
    // fontFamily 스택 등 — CSS 표기와 동일하게 콤마로 결합
    return resolved.map((item) => String(item)).join(', ');
  }
  return String(resolved);
}

function convertValue(
  name: string,
  figmaType: FigmaVariableType,
  resolved: unknown,
  dtcgType: string | undefined,
): FigmaVariableValue {
  switch (figmaType) {
    case 'COLOR':
      return toColorHex(name, resolved);
    case 'FLOAT':
      return toFloat(name, resolved);
    case 'BOOLEAN':
      return resolved === true || resolved === 'true'; // 플러그인 BOOLEAN 분기와 동일 판정
    case 'STRING':
      return toStringValue(resolved, dtcgType);
  }
}

// ---------------------------------------------------------------------------
// 토큰 → Variable 스펙
// ---------------------------------------------------------------------------

/** 합성(typography 등) 하위 키 → Figma 타입 관례. 미등재 키는 해석 값으로 추론 */
const COMPOSITE_KEY_TYPES: Record<string, FigmaVariableType> = {
  fontFamily: 'STRING',
  fontSize: 'FLOAT',
  fontWeight: 'FLOAT',
  lineHeight: 'FLOAT',
  letterSpacing: 'FLOAT',
  paragraphSpacing: 'FLOAT',
};

/** raw 값이 단일 참조({a.b.c})면 대상 Variable 이름(a/b/c)을 반환 */
function aliasNameFor(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const m = FULL_REF_RE.exec(raw);
  return m && m[1] !== undefined ? figmaName(m[1]) : undefined;
}

/** alias 페어 조립 — 양쪽 모두 없으면 필드 자체를 생략 */
function buildAlias(
  light: string | undefined,
  dark: string | undefined,
): { alias: NonNullable<FigmaVariableSpec['alias']> } | Record<string, never> {
  if (light === undefined && dark === undefined) return {};
  return {
    alias: {
      ...(light !== undefined ? { light } : {}),
      ...(dark !== undefined ? { dark } : {}),
    },
  };
}

/**
 * 합성 객체(typography 등) → 하위 키별 서브 Variable 전개.
 * 서브 이름은 CSS 서브 변수와 동일한 kebab 규칙 — typography/label/md/font-size 등.
 * 부모가 단일 참조였다면 서브 alias 는 `대상/하위키`, 인라인 객체였다면 하위 키의 참조에서 취한다.
 */
function expandComposite(
  name: string,
  lightObj: Record<string, unknown>,
  darkObj: Record<string, unknown>,
  lightRaw: unknown,
  darkRaw: unknown,
): FigmaVariableSpec[] {
  const parentAliasLight = aliasNameFor(lightRaw);
  const parentAliasDark = aliasNameFor(darkRaw);

  const subAlias = (
    parentAlias: string | undefined,
    raw: unknown,
    key: string,
  ): string | undefined => {
    if (parentAlias !== undefined) return `${parentAlias}/${kebab(key)}`;
    return isPlainObject(raw) ? aliasNameFor(raw[key]) : undefined;
  };

  const specs: FigmaVariableSpec[] = [];
  const keys = [...new Set([...Object.keys(lightObj), ...Object.keys(darkObj)])];
  for (const key of keys) {
    const subLight = lightObj[key] !== undefined ? lightObj[key] : darkObj[key];
    const subDark = darkObj[key] !== undefined ? darkObj[key] : subLight;
    // 중첩 객체는 Figma Variable 대응 없음 — CSS 서브 변수 전개(tokens-to-css)와 동일하게 생략
    if (subLight === undefined || subLight === null || isPlainObject(subLight)) continue;

    const subName = `${name}/${kebab(key)}`;
    const subType = COMPOSITE_KEY_TYPES[key] ?? figmaTypeFor(undefined, subLight);
    specs.push({
      name: subName,
      type: subType,
      values: {
        light: convertValue(subName, subType, subLight, undefined),
        dark: convertValue(subName, subType, subDark, undefined),
      },
      ...buildAlias(
        subAlias(parentAliasLight, lightRaw, key),
        subAlias(parentAliasDark, darkRaw, key),
      ),
    });
  }
  return specs;
}

function tokenToVariableSpecs(table: TokenTable, token: FlatToken): FigmaVariableSpec[] {
  const name = figmaName(token.path);
  const lightRaw = rawValueFor(table, token.path, 'light');
  const darkRaw = rawValueFor(table, token.path, 'dark');
  const lightResolved = resolveToken(table, token.path, 'light', []);
  const darkResolved = resolveToken(table, token.path, 'dark', []);

  // typography 등 합성 객체 → 서브 Variable 전개
  if (isPlainObject(lightResolved) || isPlainObject(darkResolved)) {
    const lightObj = isPlainObject(lightResolved) ? lightResolved : {};
    const darkObj = isPlainObject(darkResolved) ? darkResolved : lightObj;
    return expandComposite(name, lightObj, darkObj, lightRaw, darkRaw);
  }

  const figmaType = figmaTypeFor(token.type, lightResolved);
  return [
    {
      name,
      type: figmaType,
      values: {
        light: convertValue(name, figmaType, lightResolved, token.type),
        dark: convertValue(name, figmaType, darkResolved, token.type),
      },
      ...buildAlias(aliasNameFor(lightRaw), aliasNameFor(darkRaw)),
    },
  ];
}

// ---------------------------------------------------------------------------
// 엔트리
// ---------------------------------------------------------------------------

export function generateFigmaVariables(doc: Record<string, unknown>): GeneratedFile {
  const table: TokenTable = { flat: flattenTokens(doc), modes: collectModePairs(doc) };

  const variables: FigmaVariableSpec[] = [];
  for (const token of table.flat.values()) {
    variables.push(...tokenToVariableSpecs(table, token));
  }

  // Variable 이름 충돌은 플러그인 갱신 로직(byName 맵)을 오염시키므로 생성 단계에서 차단
  const seen = new Set<string>();
  for (const v of variables) {
    if (seen.has(v.name)) {
      throw new Error(`Figma Variable 이름 충돌: ${v.name} — tokens.json 경로 확인`);
    }
    seen.add(v.name);
  }

  const payload = {
    $generated: `AUTO-GENERATED from ${relFromRepo(TOKENS_JSON_PATH)} — DO NOT EDIT (pnpm codegen)`,
    collection: COLLECTION_NAME,
    modes: [...MODES],
    variables,
  };

  return { filePath: FIGMA_VARIABLES_PATH, content: `${JSON.stringify(payload, null, 2)}\n` };
}
