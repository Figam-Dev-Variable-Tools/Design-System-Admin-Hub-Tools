/**
 * Design System Admin Hub — Figma 플러그인 메인 스레드
 * 소유: Figma 플러그인 Figma Plugin Engineer (tools/figma-plugin/**), 게이트 G7, 검수: Figma 리뷰 Figma Reviewer
 *
 * 역할: codegen 산출물(generated/<Name>.figma.json, generated/tokens/figma-variables.json)을
 * UI(iframe)로부터 postMessage로 받아 Figma 파일에 반영한다.
 *  (a) Variables 컬렉션 생성/갱신 — light/dark 2모드 (figma.variables API)
 *  (b) Component Set의 Variant Property 정의 생성/갱신 (contract의 figmaProperty 매핑)
 *  (c) Detached 스타일(Variable/Style 미바인딩 raw 값) 스캔 리포트 — G7 체크리스트 "바인딩률 100%" 입력값
 *  (d) TDS 문서 생성 — Foundations/컴포넌트/Pages를 'TDS 문서 스타일'로 렌더링 (src/tds-doc.ts,
 *      규격: docs/figma/specs/tds-doc-style.md — Storybook과 동일한 tokens.json 원천)
 *
 * 원칙(P2 계약 우선): 이 플러그인은 계약에 없는 것을 만들지 않는다.
 * 계약에 없는 기존 값을 발견해도 삭제하지 않고 경고만 남긴다 — 파괴적 변경 판단은 G7 검수(Figma 리뷰)의 몫.
 */

import { generateTdsDoc, type TdsDocPayload } from './tds-doc';

// ---------------------------------------------------------------------------
// 메시지 프로토콜 (UI ↔ main). 페이로드 형식은 tools/codegen이 생성한다:
// - TokensPayload    ← generated/tokens/figma-variables.json (tokens.json에서 생성)
// - ComponentFigmaSpec ← generated/<Name>.figma.json (<Name>.contract.json에서 생성)
// ---------------------------------------------------------------------------

interface TokenVariableSpec {
  /** Figma 그룹 구분은 슬래시 — 예: 'color/action/primary/default' */
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  /** 라이트/다크 페어 — G4 체크리스트 "다크모드 페어링 누락 0건"이 보장하는 형식 */
  values: {
    light: string | number | boolean;
    dark: string | number | boolean;
  };
}

interface TokensPayload {
  /** 예: 'TDS Tokens' */
  collection: string;
  modes: string[];
  variables: TokenVariableSpec[];
}

interface VariantPropertyDef {
  /** Variant 값 목록 — 계약의 enum values (boolean prop은 codegen이 ['true','false']로 정규화) */
  values: string[];
  default: string;
}

/**
 * 계약 속성 하나(generated/<Name>.figma.json 의 properties[] 원소).
 * type 별로 Figma 표현이 다르다: VARIANT→변형축 · BOOLEAN/TEXT/INSTANCE_SWAP→Component Property.
 * (주의: codegen 은 BOOLEAN 도 variantProperties 에 넣지만, 진짜 원천은 이 properties[] 의 type 이다.)
 */
interface FigmaPropSpec {
  name: string;
  type: 'VARIANT' | 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP';
  values?: string[];
  default?: unknown;
  accepts?: string[];
}

interface ComponentFigmaSpec {
  /** Component Set 이름 — 계약의 name (예: 'Button') */
  name: string;
  /** 원자단위 — atom·molecule·organism (디자인 시스템 내부 축) */
  level?: string;
  /** 기능 카테고리 — Actions·Inputs·Feedback… **사용자가 찾는 축**. 페이지 분리는 이걸 쓴다 */
  category?: string;
  /** 키 = 계약의 figmaProperty (예: 'Variant', 'Size', 'Loading') */
  variantProperties: Record<string, VariantPropertyDef>;
  /** 타입 포함 속성 목록 — 변형축/컴포넌트 속성 분리의 원천 (있으면 이걸 우선한다) */
  properties?: FigmaPropSpec[];
  /** 토큰 바인딩 — 키(surfaceDanger·radius·paddingX…) → 점 경로(color.feedback.danger.surface). 실제 레이어 조립의 원천 */
  tokens?: Record<string, string>;
}

/**
 * Storybook 실사 한 장의 **참조** — 실제 바이트는 미리 cache-images 로 올려 두고 여기선 key 로만 가리킨다.
 * (대용량 바이트를 sync-components/generate-tds-doc 한 메시지에 싣지 않기 위한 배치 캐시 설계.)
 * component=계약 이름, story=스토리 id, key=이미지 캐시 키(파일명), w·h=픽셀 치수.
 */
interface RenderImage {
  component: string;
  story: string;
  key: string;
  w: number;
  h: number;
}

/** cache-images 한 조각 — 이미지 바이트는 오직 여기로만, 여러 배치로 나눠 흐른다. */
interface ImageBatchItem {
  key: string;
  bytes: Uint8Array;
}

/** sync-components 페이로드 — 계약 명세 + 실사 참조(키). 실사 없으면 images=[] */
interface SyncComponentsPayload {
  specs: ComponentFigmaSpec[];
  images: RenderImage[];
}

type UiMessage =
  | { type: 'sync-tokens'; payload: TokensPayload }
  | { type: 'cache-images'; batch: ImageBatchItem[] }
  | { type: 'sync-components'; payload: SyncComponentsPayload | ComponentFigmaSpec[] }
  | { type: 'generate-tds-doc'; payload: TdsDocPayload }
  | { type: 'scan-detached' }
  | { type: 'close' };

// ---------------------------------------------------------------------------
// 이미지 해시 캐시 — cache-images 로 받은 바이트를 createImage 해 key→imageHash 로 보관한다.
// 이후 컴포넌트/문서/페이지 렌더는 바이트 대신 이 해시를 참조한다(메시지 경량화 + 이미지 dedupe).
// ---------------------------------------------------------------------------
const imageHashCache = new Map<string, string>();

function cacheImageBatch(batch: ImageBatchItem[], log: string[]): { ok: number; fail: number } {
  let ok = 0;
  let fail = 0;
  for (const item of batch) {
    if (!item || typeof item.key !== 'string') continue;
    if (imageHashCache.has(item.key)) {
      ok += 1;
      continue;
    }
    try {
      // 구조적 복제로 Uint8Array 가 일반 객체/배열로 변질됐을 수 있다 → createImage 전에 되살린다
      const bytes =
        item.bytes instanceof Uint8Array
          ? item.bytes
          : new Uint8Array(item.bytes as ArrayLike<number>);
      const image = figma.createImage(bytes);
      imageHashCache.set(item.key, image.hash);
      ok += 1;
    } catch (error) {
      log.push(`[이미지 캐시 실패] ${item.key}: ${errMsg(error)}`);
      fail += 1;
    }
  }
  return { ok, fail };
}

interface DetachedEntry {
  page: string;
  node: string;
  nodeType: string;
  issue: string;
}

// ---------------------------------------------------------------------------
// 값 변환 유틸
// ---------------------------------------------------------------------------

function parseHexColor(hex: string): RGBA {
  const raw = hex.trim().replace(/^#/, '');
  const expand = (s: string): string =>
    s
      .split('')
      .map((ch) => ch + ch)
      .join('');
  let full: string;
  if (raw.length === 3 || raw.length === 4) {
    full = expand(raw);
  } else if (raw.length === 6 || raw.length === 8) {
    full = raw;
  } else {
    throw new Error(`색상 파싱 실패: "${hex}" — #RGB/#RGBA/#RRGGBB/#RRGGBBAA 형식만 지원`);
  }
  const channel = (offset: number): number => {
    const value = Number.parseInt(full.slice(offset, offset + 2), 16);
    if (Number.isNaN(value)) {
      throw new Error(`색상 파싱 실패: "${hex}" — 16진수 아님`);
    }
    return value / 255;
  };
  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: full.length === 8 ? channel(6) : 1,
  };
}

function toFigmaValue(
  type: TokenVariableSpec['type'],
  raw: string | number | boolean,
): VariableValue {
  switch (type) {
    case 'COLOR': {
      if (typeof raw !== 'string') {
        throw new Error(`COLOR 값은 hex 문자열이어야 함: ${String(raw)}`);
      }
      return parseHexColor(raw);
    }
    case 'FLOAT': {
      const value = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
      if (Number.isNaN(value)) {
        throw new Error(`FLOAT 값 파싱 실패: ${String(raw)} — codegen이 숫자로 정규화해야 함`);
      }
      return value;
    }
    case 'BOOLEAN':
      return raw === true || raw === 'true';
    case 'STRING':
      return String(raw);
  }
}

function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])),
    [[]],
  );
}

// ---------------------------------------------------------------------------
// (a) Variables 컬렉션 생성/갱신 — light/dark 2모드
// ---------------------------------------------------------------------------

function ensureLightDarkModes(collection: VariableCollection): { light: string; dark: string } {
  const existingLight = collection.modes.find((m) => m.name === 'light');
  let lightId: string;
  if (existingLight) {
    lightId = existingLight.modeId;
  } else {
    const first = collection.modes[0];
    if (!first) {
      throw new Error('컬렉션에 모드가 없음 — Figma 파일 상태 확인 필요');
    }
    if (first.name === 'dark') {
      // 첫 모드를 이미 dark로 쓰는 비정상 상태 — light 모드를 새로 추가
      lightId = collection.addMode('light');
    } else {
      // 기본 'Mode 1'을 light로 개명
      collection.renameMode(first.modeId, 'light');
      lightId = first.modeId;
    }
  }
  const existingDark = collection.modes.find((m) => m.name === 'dark');
  // 주의: 무료 플랜은 컬렉션당 1모드 제한 — addMode가 던지는 에러는 상위에서 리포트됨
  const darkId = existingDark ? existingDark.modeId : collection.addMode('dark');
  return { light: lightId, dark: darkId };
}

async function syncTokens(payload: TokensPayload): Promise<string[]> {
  if (!payload || typeof payload.collection !== 'string' || !Array.isArray(payload.variables)) {
    throw new Error(
      '토큰 페이로드 형식 오류 — {collection, modes, variables[]} 필요 (generated/tokens/figma-variables.json)',
    );
  }
  const log: string[] = [];

  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === payload.collection);
  if (!collection) {
    collection = figma.variables.createVariableCollection(payload.collection);
    log.push(`컬렉션 생성: ${payload.collection}`);
  } else {
    log.push(`기존 컬렉션 사용: ${payload.collection}`);
  }

  const modeIds = ensureLightDarkModes(collection);

  const allVariables = await figma.variables.getLocalVariablesAsync();
  const byName = new Map<string, Variable>();
  for (const variable of allVariables) {
    if (variable.variableCollectionId === collection.id) {
      byName.set(variable.name, variable);
    }
  }

  let created = 0;
  let updated = 0;
  for (const spec of payload.variables) {
    let variable = byName.get(spec.name);
    if (variable && variable.resolvedType !== spec.type) {
      // 타입이 바뀐 토큰은 재생성 (Figma는 resolvedType 변경 불가)
      log.push(`타입 변경(${variable.resolvedType} → ${spec.type})으로 재생성: ${spec.name}`);
      variable.remove();
      variable = undefined;
    }
    if (!variable) {
      variable = figma.variables.createVariable(spec.name, collection, spec.type);
      created += 1;
    } else {
      updated += 1;
    }
    variable.setValueForMode(modeIds.light, toFigmaValue(spec.type, spec.values.light));
    variable.setValueForMode(modeIds.dark, toFigmaValue(spec.type, spec.values.dark));
  }

  // 계약(토큰) 목록에 없는 기존 Variable → 삭제하지 않고 경고만 (G7 검수 대상)
  const specNames = new Set(payload.variables.map((v) => v.name));
  const orphans = [...byName.keys()].filter((name) => !specNames.has(name));
  if (orphans.length > 0) {
    log.push(
      `[경고] tokens.json에 없는 Variable ${orphans.length}개: ${orphans.slice(0, 10).join(', ')}${orphans.length > 10 ? ' …' : ''}`,
    );
  }

  log.push(`Variables 동기화 완료 — 생성 ${created} · 갱신 ${updated} (모드: light/dark)`);
  return log;
}

// ---------------------------------------------------------------------------
// (b) Component Set — Variant Property 정의 생성/갱신
// ---------------------------------------------------------------------------

/** 변형 이름('Variant=primary, Size=md')에서 특정 property 값을 교체/부착 */
function renameVariant(name: string, prop: string, value: string): string {
  const parts = name.split(',').map((part) => part.trim());
  const index = parts.findIndex((part) => part.startsWith(`${prop}=`));
  if (index === -1) {
    return `${name}, ${prop}=${value}`;
  }
  parts[index] = `${prop}=${value}`;
  return parts.join(', ');
}

function createComponentSet(spec: ComponentFigmaSpec, log: string[]): ComponentSetNode {
  const entries = Object.entries(spec.variantProperties);
  const combos = cartesian(
    entries.map(([prop, def]) => def.values.map((value) => `${prop}=${value}`)),
  );
  if (combos.length > 200) {
    throw new Error(
      `variant 조합 ${combos.length}개 — 200개 초과는 계약 분리가 필요하다 (계약 엔지니어에 변경 요청 발행)`,
    );
  }
  let cx = 0;
  const components = combos.map((combo) => {
    const component = figma.createComponent();
    component.name = combo.join(', ');
    // combineAsVariants 는 자동 배치를 안 한다 — 좌표를 안 주면 (0,0)에 겹친다. 한 줄로 펼친다.
    component.x = cx;
    component.y = 0;
    cx += component.width + 40;
    return component;
  });
  const set = figma.combineAsVariants(components, figma.currentPage);
  set.name = spec.name;
  log.push(
    `Component Set 생성: ${spec.name} — variant ${combos.length}개 (프레임 내용/레이아웃 채움은 Figma 컴포넌트/Figma UI 담당)`,
  );
  return set;
}

function updateComponentSet(
  target: ComponentSetNode,
  spec: ComponentFigmaSpec,
  log: string[],
): void {
  for (const [prop, def] of Object.entries(spec.variantProperties)) {
    // 이름 변경이 일어날 때마다 파생 값이 바뀌므로 매 property마다 새로 읽는다
    const current = target.variantGroupProperties[prop];

    if (!current) {
      // 신규 Variant Property — 모든 기존 변형 이름에 `${prop}=${default}` 부착
      for (const child of target.children) {
        child.name = `${child.name}, ${prop}=${def.default}`;
      }
      log.push(`Variant Property 추가: ${prop} (기본값 ${def.default})`);
      // 기본값 외 값은 defaultVariant 복제로 생성
      for (const value of def.values.filter((v) => v !== def.default)) {
        const clone = target.defaultVariant.clone();
        clone.name = renameVariant(clone.name, prop, value);
        target.appendChild(clone);
        log.push(`Variant 추가: ${prop}=${value}`);
      }
      continue;
    }

    // 기존 property — 누락 값만 추가
    const missing = def.values.filter((value) => !current.values.includes(value));
    for (const value of missing) {
      const clone = target.defaultVariant.clone();
      clone.name = renameVariant(clone.name, prop, value);
      target.appendChild(clone);
      log.push(`Variant 값 추가: ${prop}=${value}`);
    }

    // 계약에 없는 값 → 삭제하지 않고 리포트만 (파괴적 변경은 G7 검수에서 판단)
    const extras = current.values.filter((value) => !def.values.includes(value));
    if (extras.length > 0) {
      log.push(`[경고] 계약에 없는 ${prop} 값: ${extras.join(', ')} — G7 검수 대상`);
    }
  }

  // 계약에 없는 property 리포트
  const specProps = new Set(Object.keys(spec.variantProperties));
  const extraProps = Object.keys(target.variantGroupProperties).filter((p) => !specProps.has(p));
  if (extraProps.length > 0) {
    log.push(`[경고] 계약에 없는 Variant Property: ${extraProps.join(', ')} — G7 검수 대상`);
  }
}

interface SyncOne {
  log: string[];
  /** 이번에 만들거나 갱신한 노드(레이아웃 배치용). 기존 유지면 그 노드 */
  node: SceneNode | null;
}

async function syncComponent(spec: ComponentFigmaSpec): Promise<SyncOne> {
  if (!spec || typeof spec.name !== 'string' || !spec.variantProperties) {
    throw new Error(
      '컴포넌트 페이로드 형식 오류 — {name, variantProperties} 필요 (generated/<Name>.figma.json)',
    );
  }
  const entries = Object.entries(spec.variantProperties);
  if (entries.length === 0) {
    // variant 가 없는 **단일 구성 컴포넌트**(HelpTip·Modal·Tabs 등) — Component Set 이 아니라
    // 단일 Component 로 만든다. 에러가 아니라 정상 갈래다(변형이 없다는 뜻일 뿐).
    const log: string[] = [];
    const existing = figma.root.findOne(
      (n) => n.type === 'COMPONENT' && n.name === spec.name && n.parent?.type !== 'COMPONENT_SET',
    );
    if (existing) {
      log.push(`기존 단일 컴포넌트 유지: ${spec.name}`);
      // 술어가 type==='COMPONENT' 를 보장하므로 SceneNode 다(findOne 은 PageNode 도 후보로 봐 넓게 잡힌다)
      return { log, node: existing as ComponentNode };
    }
    const component = figma.createComponent();
    component.name = spec.name;
    figma.currentPage.appendChild(component);
    log.push(
      `단일 컴포넌트 생성: ${spec.name} (variant 없음 — 프레임 내용은 Figma 컴포넌트/Figma UI 담당)`,
    );
    return { log, node: component };
  }
  for (const [prop, def] of entries) {
    if (!Array.isArray(def.values) || def.values.length === 0) {
      throw new Error(`${spec.name}.${prop}: values가 비어 있음`);
    }
    if (!def.values.includes(def.default)) {
      throw new Error(
        `${spec.name}.${prop}: default('${def.default}')가 values에 없음 — 계약(G3) 위반`,
      );
    }
  }

  const log: string[] = [];
  const sets = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] });
  const target = sets.find((set) => set.name === spec.name);

  if (!target) {
    return { log, node: createComponentSet(spec, log) };
  }
  log.push(`기존 Component Set 갱신: ${spec.name}`);
  updateComponentSet(target, spec, log);
  return { log, node: target };
}

/**
 * 기능 카테고리 표준 순서 — 페이지도 이 순서로 만든다.
 * 사용자는 '원자/분자'가 아니라 '무엇을 하는 컴포넌트인가'로 찾는다.
 */
const COMPONENT_CATEGORY_ORDER = [
  'Actions',
  'Inputs',
  'Selection',
  'Navigation',
  'Feedback',
  'Dialogs & Overlays',
  'Data Display',
  'Media',
  'Layout',
  'Forms',
  'Lists',
  'Tables',
  'Authentication',
  'Commerce',
  'Communication',
  'File',
  'Maps',
  'Charts',
  'Utilities',
  'Mobile',
  'AI',
  'Korean Service',
  'Foundation',
];

/** 카테고리 → 페이지 이름. 여기에 **실제 Component Set** 이 놓이고 문서가 순서·번호에 편입한다. */
function categoryPageName(category: string): string {
  return `🧩 Components — ${category}`;
}

async function ensureComponentCategoryPage(category: string): Promise<PageNode> {
  const base = categoryPageName(category);
  // 식별은 tdsBase 키로 한다 — 문서가 표시명에 '5. ' 같은 순번을 붙여도 다음 실행에 다시 찾는다.
  let page = figma.root.children.find((p) => p.getPluginData('tdsBase') === base);
  if (!page) {
    // 구버전 '📦 Components — X' 페이지가 있으면 **승계**한다(이름만 바꿔 내용 보존) — 지우지 않는다.
    const legacyName = base.replace('🧩', '📦');
    const legacy = figma.root.children.find((p) => p.name === legacyName);
    if (legacy) {
      legacy.name = base;
      page = legacy;
    }
  }
  if (!page) {
    page = figma.createPage();
    page.name = base;
  }
  page.setPluginData('tdsBase', base);
  // tdsDoc 표식은 붙이지 않는다 — 문서 정리(삭제)에 휩쓸리지 않게. 위치/번호만 문서가 관리한다.
  await page.loadAsync();
  return page;
}

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 스토리·값 이름을 영숫자 소문자로 정규화 — 매칭 대조용('with-hint'→'withhint'). */
function normToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// 토큰 기반 '진짜' 컴포넌트 조립 — 실사 이미지 대신 Variable 바인딩된 레이어로 만든다.
// 이래야 Text/Boolean 속성을 레이어에 연결할 수 있어 Figma 의 '어느 레이어도 안 씀' 경고가 사라진다.
// ---------------------------------------------------------------------------

/** 점 경로 → Figma Variable 이름 ('color.feedback.danger.surface' → 'color/feedback/danger/surface') */
function toFigmaName(dotted: string): string {
  return dotted.split('.').join('/');
}

/** dynamic-page 라 동기 getLocalVariables 는 던진다 — 반드시 async 로 색인한다. */
async function buildVarIndex(collectionName: string): Promise<Map<string, Variable>> {
  const all = await figma.variables.getLocalVariablesAsync();
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const col = cols.find((c) => c.name === collectionName);
  const idx = new Map<string, Variable>();
  for (const v of all) {
    if (!col || v.variableCollectionId === col.id) idx.set(v.name, v);
  }
  return idx;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * 역할(role)에 맞는 Variable 을 고른다. 변형 값이 있으면 'surfaceDanger' 를 먼저, 없으면 'surface'.
 * 타입이 안 맞으면 **바인딩이 throw** 하므로 여기서 걸러 낸다(로그만 남기고 건너뜀).
 */
function pickVar(
  tokens: Record<string, string>,
  vars: Map<string, Variable>,
  role: string,
  variantValue: string | null,
  expect: VariableResolvedDataType,
  log: string[],
): Variable | null {
  // 키 순서가 계약마다 다르다: 'surfaceDanger'(역할+값) 와 'neutralSurface'(값+역할) 둘 다 시도한다.
  const candidates = variantValue
    ? [`${role}${capitalize(variantValue)}`, `${variantValue}${capitalize(role)}`, role]
    : [role];
  for (const key of candidates) {
    const dotted = tokens[key];
    if (dotted === undefined) continue;
    const v = vars.get(toFigmaName(dotted));
    if (!v) {
      log.push(`[토큰 미해결] ${key} → ${dotted}`);
      continue;
    }
    if (v.resolvedType !== expect) {
      log.push(`[타입 불일치] ${key}: ${v.resolvedType} ≠ ${expect}`);
      continue;
    }
    return v;
  }
  return null;
}

/** setBoundVariableForPaint 는 **복사본을 돌려준다** — 반드시 다시 대입해야 반영된다. */
function bindPaintVar(
  node: MinimalFillsMixin & MinimalStrokesMixin,
  kind: 'fills' | 'strokes',
  v: Variable,
): void {
  const base: SolidPaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
  const bound = figma.variables.setBoundVariableForPaint(base, 'color', v);
  if (kind === 'fills') node.fills = [bound];
  else node.strokes = [bound];
}

/** dynamic-page 에서는 Variable **객체**를 넘겨야 한다(문자열 id 는 throw). */
function bindFieldVar(
  node: SceneNode,
  field: VariableBindableNodeField,
  v: Variable,
  log: string[],
): void {
  try {
    node.setBoundVariable(field, v);
  } catch (error) {
    log.push(`[바인드 실패] ${node.name}.${field}: ${errMsg(error)}`);
  }
}

/** 역할 어휘 — 토큰 키에서 이 단어를 찾으면 그게 '역할'이고, 남는 토막이 '부위'다. */
const ROLE_WORDS: Record<string, keyof PartStyle> = {
  surface: 'surface',
  background: 'surface',
  bg: 'surface',
  border: 'border',
  outline: 'border',
  text: 'text',
  foreground: 'text',
  fg: 'text',
  label: 'text',
  title: 'text',
  caption: 'text',
  radius: 'radius',
  gap: 'gap',
  padding: 'padding',
  paddingx: 'padX',
  paddingy: 'padY',
};

/** 한 부위(root·head·row·track…)의 스타일 묶음 — 전부 Variable 바인딩 대상 */
interface PartStyle {
  surface?: Variable;
  border?: Variable;
  text?: Variable;
  radius?: Variable;
  padding?: Variable;
  padX?: Variable;
  padY?: Variable;
  gap?: Variable;
}

/** 상태/레이아웃 수식어 — 부위가 아니다. 기본 상태만 그리므로 부위로 잡히면 버린다. */
const STATE_WORDS = new Set([
  'hover',
  'active',
  'disabled',
  'focus',
  'selected',
  'pressed',
  'checked',
  'on',
  'off',
  'dimmed',
  'muted',
  'invalid',
  'block',
  'inline',
]);

/** camelCase 키를 소문자 토막으로 (headText → ['head','text']) */
function segmentsOf(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/\s+/)
    .filter((s) => s.length > 0);
}

/** 이름으로 역할을 못 찾으면 Variable 타입 + 키워드로 추론한다 — 어떤 토큰도 버리지 않기 위해 */
function inferRole(key: string, v: Variable): keyof PartStyle | null {
  const k = key.toLowerCase();
  if (v.resolvedType === 'COLOR') {
    return k.indexOf('text') >= 0 || k.indexOf('label') >= 0 || k.indexOf('title') >= 0
      ? 'text'
      : k.indexOf('border') >= 0 || k.indexOf('line') >= 0
        ? 'border'
        : 'surface';
  }
  if (v.resolvedType === 'FLOAT') {
    if (k.indexOf('radius') >= 0) return 'radius';
    if (k.indexOf('gap') >= 0) return 'gap';
    if (k.indexOf('padding') >= 0) return 'padding';
  }
  return null; // typography·duration·easing 등은 레이어 배치에 직접 쓰지 않는다
}

interface AssembledParts {
  root: PartStyle;
  parts: Array<{ name: string; style: PartStyle }>;
}

/**
 * 토큰 키를 **부위 × 역할**로 해체한다. 이래야 DataTable(head/row/cell)·ToggleSwitch(track/thumb)
 * 같은 다층 컴포넌트도 부위별 프레임으로 실제 조립할 수 있다(이미지 쓰지 않음).
 * 현재 조합에 해당하지 않는 변형 토큰(다른 톤)은 건너뛴다.
 */
function assembleParts(
  spec: ComponentFigmaSpec,
  comboValues: string[],
  vars: Map<string, Variable>,
): AssembledParts {
  const tokens = spec.tokens ?? {};
  const axes = (spec.properties ?? []).filter((p) => p.type === 'VARIANT');
  const allValues = new Set(axes.flatMap((a) => (a.values ?? []).map((v) => v.toLowerCase())));
  const active = new Set(comboValues.map((v) => v.toLowerCase()));

  const root: PartStyle = {};
  const partMap = new Map<string, PartStyle>();

  for (const key of Object.keys(tokens)) {
    const dotted = tokens[key];
    if (dotted === undefined) continue;
    const v = vars.get(toFigmaName(dotted));
    if (!v) continue;

    const segs = segmentsOf(key);
    // 이 컴포넌트의 변형 값 토막을 골라낸다 — 현재 조합에 없는 값이면 이 변형의 토큰이 아니다
    const variantSegs = segs.filter((s) => allValues.has(s));
    if (variantSegs.length > 0 && !variantSegs.some((s) => active.has(s))) continue;
    const rest = segs.filter((s) => !allValues.has(s));

    // 'paddingX' 처럼 붙여 읽어야 역할인 경우를 먼저 본다(안 그러면 'x' 가 부위로 둔갑한다)
    let role: keyof PartStyle | null = ROLE_WORDS[rest.join('')] ?? null;
    let partName = '';
    if (role === null) {
      const roleIdx = rest.findIndex((s) => ROLE_WORDS[s] !== undefined);
      if (roleIdx === 0) {
        // 역할이 앞 → 뒤는 상태 수식어(backgroundHover·borderError·textDisabled).
        // 지금 그리는 건 기본 상태이므로 수식어가 남아 있으면 이 토큰은 건너뛴다.
        if (rest.length > 1) continue;
        role = ROLE_WORDS[rest[0] ?? ''] ?? null;
      } else if (roleIdx > 0) {
        // 역할이 뒤 → 앞이 진짜 부위(headText·dropzoneBorder·errorText)
        role = ROLE_WORDS[rest[roleIdx] ?? ''] ?? null;
        partName = rest.slice(0, roleIdx).join('-');
      } else {
        // 역할 단어가 없다 → 타입으로 추론하고 첫 토막을 부위로 본다(trackOn → track)
        role = inferRole(key, v);
        partName = rest.length > 1 ? (rest[0] ?? '') : '';
      }
    }
    if (role === null) continue;
    // 상태어가 부위로 잡히면 버린다 — 기본 상태만 그린다
    if (partName.length > 0 && STATE_WORDS.has(partName)) continue;
    const bucket =
      partName.length === 0
        ? root
        : (partMap.get(partName) ??
          (partMap.set(partName, {}), partMap.get(partName) as PartStyle));
    if (bucket[role] === undefined) bucket[role] = v;
  }

  return { root, parts: [...partMap.entries()].map(([name, style]) => ({ name, style })) };
}

/** 컴포넌트를 실사 이미지로 채운다(FILL). 캐시에 해시가 없으면(캐시 실패/누락) false. */
function fillWithImage(comp: ComponentNode, img: RenderImage, log: string[]): boolean {
  const hash = imageHashCache.get(img.key);
  if (!hash) {
    log.push(`[이미지 미캐시] ${img.component}/${img.story} (${img.key})`);
    return false;
  }
  comp.resizeWithoutConstraints(Math.max(1, Math.round(img.w)), Math.max(1, Math.round(img.h)));
  comp.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];
  return true;
}

/**
 * 변형 조합(예: {Variant:'primary', Size:'md'})에 가장 잘 맞는 스토리 실사를 고른다.
 * 조합 값이 스토리 이름에 많이 담길수록 고득점. 매칭 없으면 default→비-엣지 스토리→첫 스토리.
 */
function pickImageForCombo(values: string[], imgs: RenderImage[]): RenderImage | null {
  if (imgs.length === 0) return null;
  const wanted = values.map(normToken).filter((v) => v.length > 0);
  let best: RenderImage | null = null;
  let bestScore = -1;
  for (const img of imgs) {
    const sn = normToken(img.story);
    let score = 0;
    for (const w of wanted) if (sn === w || sn.includes(w) || w.includes(sn)) score += 2;
    if (sn === 'default') score += 1;
    // 엣지 스토리(다크/RTL)는 대표 이미지로는 감점 — 조합에 명시되지 않는 한
    if (/darktheme|righttoleft|rtl/.test(sn)) score -= 1;
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }
  return best ?? imgs[0] ?? null;
}

const GRID_UNIT = 24;
const SWAP_PLACEHOLDER_NAME = '↔ Swap Placeholder';

/**
 * INSTANCE_SWAP 기본값에 쓸 실제 컴포넌트 id — 공용 플레이스홀더를 만들어 재사용한다.
 * dynamic-page 모드라 getNodeById 대신 이름으로 찾는다(loadAllPagesAsync 로 이미 적재됨).
 */
function ensureSwapPlaceholderId(page: PageNode): string {
  const found = figma.root.findOne(
    (n) => n.type === 'COMPONENT' && n.name === SWAP_PLACEHOLDER_NAME,
  );
  if (found) return found.id;
  const comp = figma.createComponent();
  comp.name = SWAP_PLACEHOLDER_NAME;
  comp.resize(GRID_UNIT, GRID_UNIT);
  // 오프캔버스로 밀어 실제 컴포넌트/스캔과 겹치지 않게 한다(INSTANCE_SWAP 기본값 전용 더미)
  comp.x = -2000;
  comp.y = -2000;
  page.appendChild(comp);
  return comp.id;
}

/**
 * 계약의 BOOLEAN/TEXT/INSTANCE_SWAP 속성을 Component(Set)에 부여한다(Variant 는 이미 combineAsVariants 가 처리).
 * 각 호출을 try/catch 로 감싸 하나가 던져도 나머지를 계속 만든다(특히 INSTANCE_SWAP 기본값 요구).
 */
/**
 * 계약의 BOOLEAN/TEXT/INSTANCE_SWAP 속성을 Component(Set)에 부여하고 **반환 키를 모은다**.
 * 반환 키('Children#0:1')는 레이어의 componentPropertyReferences 에 그대로 넣어야 실제로 연결된다 —
 * 이걸 버리면 속성이 '어느 레이어도 사용하지 않음' 경고로 남는다.
 */
function addContractProperties(
  target: ComponentNode | ComponentSetNode,
  props: FigmaPropSpec[],
  page: PageNode,
  log: string[],
): Map<string, string> {
  const keys = new Map<string, string>();
  for (const p of props) {
    try {
      if (p.type === 'BOOLEAN') {
        keys.set(
          p.name,
          target.addComponentProperty(
            p.name,
            'BOOLEAN',
            p.default === true || p.default === 'true',
          ),
        );
      } else if (p.type === 'TEXT') {
        keys.set(
          p.name,
          target.addComponentProperty(
            p.name,
            'TEXT',
            typeof p.default === 'string' ? p.default : '',
          ),
        );
      } else if (p.type === 'INSTANCE_SWAP') {
        // Figma 는 INSTANCE_SWAP 기본값으로 실제 컴포넌트 id 를 요구한다(빈 문자열 throw) → 플레이스홀더 사용
        keys.set(
          p.name,
          target.addComponentProperty(p.name, 'INSTANCE_SWAP', ensureSwapPlaceholderId(page)),
        );
      }
    } catch (error) {
      log.push(`[속성 실패] ${target.name}.${p.name} (${p.type}): ${errMsg(error)}`);
    }
  }
  return keys;
}

/** 텍스트 레이어 이름 — 이 이름으로 찾아 TEXT 속성을 연결한다 */
const TOKEN_TEXT_LAYER = 'Label';

/**
 * 토큰으로 변형 하나를 **실제 레이어**로 조립한다: 오토레이아웃 프레임(배경·테두리·라운드·패딩·간격 바인딩)
 * + 텍스트 자식(글자색 바인딩). 값은 전부 Variable 바인딩이라 토큰이 바뀌면 Figma 도 따라 바뀐다.
 */
/** 한 프레임에 부위 스타일을 바인딩한다(배경·테두리·라운드·패딩·간격 전부 Variable). */
function applyPartStyle(frame: FrameNode | ComponentNode, style: PartStyle, log: string[]): void {
  if (style.surface) bindPaintVar(frame, 'fills', style.surface);
  else frame.fills = [];
  if (style.border) {
    frame.strokeWeight = 1; // 두께를 먼저 줘야 색이 보인다
    frame.strokeAlign = 'INSIDE';
    bindPaintVar(frame, 'strokes', style.border);
  }
  if (style.radius) bindFieldVar(frame, 'cornerRadius', style.radius, log);
  // Figma 에 paddingX/Y 필드는 없다 — 각각 두 필드에 건다
  const px = style.padX ?? style.padding;
  if (px) {
    bindFieldVar(frame, 'paddingLeft', px, log);
    bindFieldVar(frame, 'paddingRight', px, log);
  }
  const py = style.padY ?? style.padding;
  if (py) {
    bindFieldVar(frame, 'paddingTop', py, log);
    bindFieldVar(frame, 'paddingBottom', py, log);
  }
  if (style.gap) bindFieldVar(frame, 'itemSpacing', style.gap, log);
}

/** 텍스트 레이어 하나 — 폰트는 syncComponents 가 미리 로드해 둔다(로드 전 characters 대입은 throw). */
function makeTextLayer(name: string, content: string, color: Variable | undefined): TextNode {
  const t = figma.createText();
  t.name = name;
  t.characters = content;
  if (color) bindPaintVar(t, 'fills', color);
  return t;
}

/**
 * 변형 하나를 **실제 레이어**로 조립한다 — 이미지는 일절 쓰지 않는다.
 * 루트 프레임(부위 없는 토큰) + 부위별 자식 프레임(head/row/track…)을 세로로 쌓고, 각 부위의
 * 글자색 토큰이 있으면 그 부위 이름의 텍스트 레이어를 넣는다. 값은 전부 Variable 바인딩.
 */
function buildTokenVariant(
  spec: ComponentFigmaSpec,
  comboValues: string[],
  vars: Map<string, Variable>,
  log: string[],
): ComponentNode {
  const { root, parts } = assembleParts(spec, comboValues, vars);

  const comp = figma.createComponent();
  comp.layoutMode = 'VERTICAL';
  comp.primaryAxisSizingMode = 'AUTO';
  comp.counterAxisSizingMode = 'AUTO';
  comp.counterAxisAlignItems = 'MIN';
  applyPartStyle(comp, root, log);
  if (comp.itemSpacing === 0) comp.itemSpacing = GRID_UNIT / 3;
  if (comp.paddingLeft === 0 && comp.paddingTop === 0) {
    comp.paddingLeft = GRID_UNIT / 2;
    comp.paddingRight = GRID_UNIT / 2;
    comp.paddingTop = GRID_UNIT / 2;
    comp.paddingBottom = GRID_UNIT / 2;
  }

  // 루트 텍스트 — Text 속성이 연결될 레이어(항상 하나 둔다)
  comp.appendChild(makeTextLayer(TOKEN_TEXT_LAYER, spec.name, root.text));

  // 부위별 자식 프레임 — 토큰이 알려 준 구조 그대로
  for (const part of parts) {
    const frame = figma.createFrame();
    frame.name = part.name;
    frame.layoutMode = 'HORIZONTAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.counterAxisAlignItems = 'CENTER';
    applyPartStyle(frame, part.style, log);
    if (frame.paddingLeft === 0 && frame.paddingTop === 0) {
      frame.paddingLeft = GRID_UNIT / 2;
      frame.paddingRight = GRID_UNIT / 2;
      frame.paddingTop = GRID_UNIT / 4;
      frame.paddingBottom = GRID_UNIT / 4;
    }
    frame.appendChild(makeTextLayer(`${part.name} label`, part.name, part.style.text));
    comp.appendChild(frame);
  }

  return comp;
}

/**
 * 각 변형 안의 레이어에 속성 참조를 건다 — **모든 변형**에 걸어야 경고가 사라진다(기본 변형만으론 부족).
 * TEXT→characters, BOOLEAN→visible. 대상 레이어가 없으면 조용히 건너뛴다.
 */
function attachPropertyReferences(
  set: ComponentSetNode,
  keys: Map<string, string>,
  props: FigmaPropSpec[],
  log: string[],
): number {
  let bound = 0;
  const textProp = props.find((p) => p.type === 'TEXT' && p.name !== 'Id');
  const textKey = textProp ? keys.get(textProp.name) : undefined;
  if (textKey === undefined) return 0;
  for (const variant of set.children) {
    if (variant.type !== 'COMPONENT') continue;
    const target = variant.findOne((n) => n.type === 'TEXT' && n.name === TOKEN_TEXT_LAYER);
    if (!target) {
      log.push(`[참조 누락] ${set.name}/${variant.name}: ${TOKEN_TEXT_LAYER} 텍스트 레이어 없음`);
      continue;
    }
    try {
      target.componentPropertyReferences = { characters: textKey };
      bound += 1;
    } catch (error) {
      log.push(`[참조 실패] ${set.name}/${variant.name}: ${errMsg(error)}`);
    }
  }
  return bound;
}

/**
 * 계약 스키마로 컴포넌트를 만든다(Figma API 전문 검수 반영).
 *  - VARIANT 타입 속성만 변형축 → 카테시안 곱, 모든 자식이 **같은 키 집합·유일 값**(충돌 원천 제거)
 *  - VARIANT 축이 0개면 단일 Component (예: ImageUploadField — 불리언은 축이 아니라 속성)
 *  - BOOLEAN/TEXT/INSTANCE_SWAP 은 addComponentProperty 로 진짜 컴포넌트 속성 부여
 *  - 각 변형/단일 컴포넌트는 조합에 맞는 실사로 채움
 * 재실행 결정론을 위해 기존 동명 셋/컴포넌트는 지우고 새로 만든다.
 */
function buildComponent(
  spec: ComponentFigmaSpec,
  imgs: RenderImage[],
  page: PageNode,
  log: string[],
  vars: Map<string, Variable> | null,
): SceneNode | null {
  // 기존 동명 셋/단일 컴포넌트 제거(플레이스홀더는 이름이 달라 안전)
  for (const set of figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] })) {
    if (set.name === spec.name) set.remove();
  }
  const dupe = figma.root.findOne(
    (n) => n.type === 'COMPONENT' && n.name === spec.name && n.parent?.type !== 'COMPONENT_SET',
  );
  if (dupe) dupe.remove();

  // 속성 원천: properties[] 의 type (없으면 variantProperties 로 폴백 — 전부 VARIANT 취급)
  const props: FigmaPropSpec[] = Array.isArray(spec.properties)
    ? spec.properties
    : Object.entries(spec.variantProperties).map(([name, def]) => ({
        name,
        type: 'VARIANT' as const,
        values: def.values,
        default: def.default,
      }));
  // VARIANT 축: 값 중복 제거(중복 값 → 동일 조합명 → combineAsVariants 충돌 재발) + 축 이름 유일화
  const axisSeen = new Set<string>();
  const variantAxes = props
    .filter(
      (p): p is FigmaPropSpec & { values: string[] } =>
        p.type === 'VARIANT' && Array.isArray(p.values) && p.values.length > 0,
    )
    .filter((p) => (axisSeen.has(p.name) ? false : (axisSeen.add(p.name), true)))
    .map((p) => ({ ...p, values: [...new Set(p.values)] }));
  const otherProps = props.filter((p) => p.type !== 'VARIANT');

  let target: ComponentNode | ComponentSetNode | null = null;
  // Figma 에는 **실제 컴포넌트만** 만든다 — 스크린샷 이미지는 쓰지 않는다.
  // Variable 색인이 없을 때만(토큰 동기화 실패) 빈 프레임으로 떨어진다.
  const tokenBuild = vars !== null;

  if (variantAxes.length === 0) {
    // 변형축 없음 → 단일 컴포넌트 (불리언/텍스트/스왑은 속성으로)
    const comp = vars ? buildTokenVariant(spec, [], vars, log) : figma.createComponent();
    comp.name = spec.name;
    page.appendChild(comp);
    target = comp;
  } else {
    // 변형축 카테시안 — 모든 자식이 동일 키 집합, 값만 다름 → 충돌 없음
    const combos = cartesian(variantAxes.map((ax) => ax.values.map((v) => `${ax.name}=${v}`)));
    if (combos.length > 200) {
      throw new Error(`${spec.name}: 변형 조합 ${combos.length}개 > 200 — 계약 분리 필요`);
    }
    const defaultName = variantAxes
      .map((ax) => `${ax.name}=${String(ax.default ?? ax.values[0])}`)
      .join(', ');
    const children: ComponentNode[] = [];
    for (const tuple of combos) {
      const values = tuple.map((t) => t.split('=')[1] ?? '');
      const comp = vars ? buildTokenVariant(spec, values, vars, log) : figma.createComponent();
      comp.name = tuple.join(', ');
      children.push(comp);
    }
    // 전부 기본값인 조합을 맨 앞으로 → x=0,y=0(공간상 좌상단)에 놓여 defaultVariant 가 된다
    children.sort((a, b) => (a.name === defaultName ? -1 : b.name === defaultName ? 1 : 0));
    if (children.length === 1) {
      const only = children[0];
      if (!only) return null;
      only.name = spec.name;
      page.appendChild(only);
      target = only;
    } else {
      // combineAsVariants 는 자동 배치를 안 한다 — 좌표를 안 주면 전부 (0,0)에 겹치고
      // defaultVariant(=공간상 좌상단)도 불확정. 한 줄로 펼치고 기본 조합을 맨 왼쪽(x=0)에 둔다.
      const VGAP = 40;
      let vx = 0;
      for (const c of children) {
        c.x = vx;
        c.y = 0;
        vx += c.width + VGAP;
      }
      target = figma.combineAsVariants(children, page);
      target.name = spec.name;
    }
  }

  const keys = addContractProperties(target, otherProps, page, log);
  // 반환된 키를 레이어에 연결해야 속성이 실제로 동작한다(토큰 조립본만 연결 대상 레이어를 가진다)
  let refs = 0;
  if (tokenBuild && target.type === 'COMPONENT_SET') {
    refs = attachPropertyReferences(target, keys, otherProps, log);
  }
  log.push(
    `계약 컴포넌트: ${spec.name} — ${tokenBuild ? '토큰 조립' : '실사'} · 변형축 ${String(
      variantAxes.length,
    )}(${variantAxes.map((a) => a.name).join('×')}) · 속성 ${String(keys.size)}${
      refs > 0 ? ` · 레이어연결 ${String(refs)}` : ''
    }`,
  );
  return target;
}

/**
 * 여러 계약을 한 번에 동기화한다 (UI 의 '전체' 선택).
 * **레벨(atom·molecule·organism)별 전용 페이지**에 Component Set 을 만든다 — 분류가 되고,
 * 문서 생성이 건드리는 페이지(🧩 Components 등)와 분리돼 삭제/비우기에 휩쓸리지 않는다.
 * 실사(images)가 있으면 각 스토리를 실제 렌더로 채워 1:1 미러하고, 없으면 변형 구조만 만든다.
 * 하나가 실패해도 나머지를 계속 진행하고, 실패를 로그에 남긴 뒤 마지막에 집계한다.
 */
async function syncComponents(
  specs: ComponentFigmaSpec[],
  images: RenderImage[],
): Promise<string[]> {
  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error('동기화할 계약이 없습니다 — 산출물을 적재하세요.');
  }
  const log: string[] = [];
  let failed = 0;

  await figma.loadAllPagesAsync();

  // 실사를 컴포넌트별로 묶는다(스토리 순서 유지)
  const imgsByComponent = new Map<string, RenderImage[]>();
  for (const img of images) {
    if (!img || typeof img.component !== 'string') continue;
    const bucket = imgsByComponent.get(img.component);
    if (bucket) bucket.push(img);
    else imgsByComponent.set(img.component, [img]);
  }
  log.push(
    imgsByComponent.size > 0
      ? `실사 모드 — 이미지 ${String(images.length)}장 · 컴포넌트 ${String(imgsByComponent.size)}개로 1:1 미러`
      : '실사 없음 — 변형 구조만 생성.',
  );

  // 토큰 조립용 Variable 색인 + 폰트 선로드(텍스트 노드 생성 전 필수). 실패하면 실사 모드로 안전 폴백.
  let vars: Map<string, Variable> | null = null;
  try {
    vars = await buildVarIndex('TDS Tokens');
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    log.push(`토큰 색인 ${String(vars.size)}개 — 단순 박스형은 실제 레이어로 조립합니다`);
  } catch (error) {
    vars = null;
    log.push(`[토큰 조립 비활성] ${errMsg(error)} — 전부 실사로 진행합니다`);
  }

  // 기능 카테고리로 묶는다 — 사용자가 컴포넌트를 찾는 축(Actions·Inputs·Feedback…)
  const byCategory = new Map<string, ComponentFigmaSpec[]>();
  for (const spec of specs) {
    const cat =
      typeof spec.category === 'string' && spec.category.length > 0 ? spec.category : 'Utilities';
    const bucket = byCategory.get(cat);
    if (bucket) bucket.push(spec);
    else byCategory.set(cat, [spec]);
  }
  // 계약이 아직 없는 카테고리도 **페이지는 만든다** — 분류 체계(23 모듈) 골격이 Figma 에 그대로
  // 드러나야 새 컴포넌트가 어느 페이지로 들어갈지 한눈에 보이고, 페이지 순서도 정본과 어긋나지 않는다.
  const categories = [
    ...COMPONENT_CATEGORY_ORDER,
    ...[...byCategory.keys()].filter((c) => !COMPONENT_CATEGORY_ORDER.includes(c)),
  ];

  const GAP = 80;
  let emptyPages = 0;
  for (const category of categories) {
    const group = byCategory.get(category) ?? [];
    const page = await ensureComponentCategoryPage(category);
    if (group.length === 0) {
      // 빈 슬롯 — 페이지만 자리를 잡아 둔다. 문서(tds-doc)가 '컴포넌트 0개' 안내를 얹는다.
      emptyPages += 1;
      log.push(`── ${category} — 0개 (${page.name}) · 빈 슬롯 ──`);
      continue;
    }
    await figma.setCurrentPageAsync(page);
    log.push(`── ${category} — ${String(group.length)}개 (${page.name}) ──`);
    let x = 0;
    for (const spec of group) {
      try {
        const imgs = imgsByComponent.get(spec.name) ?? [];
        let node: SceneNode | null;
        if (imgs.length > 0) {
          // 계약 스키마로 변형축·속성 구성 — 단순 박스형은 토큰으로 실제 조립, 나머지는 실사로 채움
          node = buildComponent(spec, imgs, page, log, vars);
        } else {
          // 실사 없음 → 변형 구조만(기존 경로)
          const r = await syncComponent(spec);
          for (const line of r.log) log.push(line);
          node = r.node;
        }
        if (node) {
          // 기존 셋이 다른 페이지(옛 실행의 잔재)에 있을 수 있다 — 이 레벨 페이지로 **옮긴다**.
          if (node.parent !== page) page.appendChild(node);
          node.x = x;
          node.y = 0;
          x += node.width + GAP;
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        const name = spec && typeof spec.name === 'string' ? spec.name : '(이름 불명)';
        log.push(`[오류] ${name}: ${message}`);
      }
    }
  }

  log.push(
    `Component Set 동기화 완료 — 성공 ${String(specs.length - failed)} · 실패 ${String(failed)} · 카테고리 페이지 ${String(categories.length)}개(빈 슬롯 ${String(emptyPages)}개)`,
  );
  if (failed > 0) {
    log.push('[경고] 실패한 계약은 반영되지 않았습니다 — 위 오류를 해결한 뒤 다시 실행하세요.');
  }
  return log;
}

// ---------------------------------------------------------------------------
// (c) Detached 스타일 스캔 — Variable/Style 미바인딩 raw 값 리포트
// ---------------------------------------------------------------------------

const MAX_REPORT_ENTRIES = 500;

/** SceneNode 유니언 내로잉 대신 구조적 캐스트로 검사 (스캔은 읽기 전용) */
interface StyleScanTarget {
  readonly fills?: unknown;
  readonly strokes?: unknown;
  readonly fillStyleId?: unknown;
  readonly strokeStyleId?: unknown;
  readonly cornerRadius?: unknown;
  readonly boundVariables?: Readonly<Record<string, unknown>>;
}

function hasDetachedSolidPaint(paints: readonly Paint[]): boolean {
  return paints.some(
    (paint) =>
      paint.type === 'SOLID' &&
      paint.visible !== false &&
      !(paint.boundVariables && paint.boundVariables.color),
  );
}

function checkNode(node: SceneNode, pageName: string, out: DetachedEntry[]): void {
  const n = node as unknown as StyleScanTarget;
  const push = (issue: string): void => {
    out.push({ page: pageName, node: node.name, nodeType: node.type, issue });
  };

  // fill: Variable 바인딩도 Style도 없는 SOLID 페인트
  if (Array.isArray(n.fills) && hasDetachedSolidPaint(n.fills as Paint[])) {
    const hasFillStyle = typeof n.fillStyleId === 'string' && n.fillStyleId !== '';
    if (!hasFillStyle) {
      push('fill: Variable/Style 미바인딩 (raw color)');
    }
  }

  // stroke: 동일 기준
  if (Array.isArray(n.strokes) && hasDetachedSolidPaint(n.strokes as Paint[])) {
    const hasStrokeStyle = typeof n.strokeStyleId === 'string' && n.strokeStyleId !== '';
    if (!hasStrokeStyle) {
      push('stroke: Variable/Style 미바인딩 (raw color)');
    }
  }

  // cornerRadius: 숫자 raw 값인데 radius Variable 미바인딩
  if (typeof n.cornerRadius === 'number' && n.cornerRadius > 0) {
    const radiusKeys = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
    const bound =
      n.boundVariables !== undefined &&
      radiusKeys.some(
        (key) => n.boundVariables !== undefined && n.boundVariables[key] !== undefined,
      );
    if (!bound) {
      push(`cornerRadius: ${n.cornerRadius} — radius Variable 미바인딩 (raw px)`);
    }
  }

  // text: Text Style 미적용
  if (node.type === 'TEXT' && typeof node.textStyleId === 'string' && node.textStyleId === '') {
    push('text: Text Style 미적용 (raw typography)');
  }
}

async function scanDetachedStyles(): Promise<{
  log: string[];
  report: DetachedEntry[];
  truncated: boolean;
}> {
  await figma.loadAllPagesAsync();
  const report: DetachedEntry[] = [];
  let truncated = false;
  let scanned = 0;

  for (const page of figma.root.children) {
    for (const node of page.findAll(() => true)) {
      scanned += 1;
      checkNode(node, page.name, report);
      if (report.length >= MAX_REPORT_ENTRIES) {
        truncated = true;
        break;
      }
    }
    if (truncated) {
      break;
    }
  }

  const log = [
    `Detached 스캔 완료 — 노드 ${scanned}개 검사, 위반 ${report.length}건${truncated ? ' (상한 도달, 절단됨)' : ''}`,
    'G7 체크리스트 기준: Variable 바인딩률 100% (Detached style 0) — 위반 0건이어야 통과',
  ];
  return { log, report, truncated };
}

// ---------------------------------------------------------------------------
// 엔트리 — UI 기동 + 메시지 라우팅
// ---------------------------------------------------------------------------

// 460 = 적재 리포트의 '누락 N개: …' 줄이 접히지 않는 최소 폭, 720 = 적재 리포트와
// 첫 액션 카드가 스크롤 없이 함께 보이는 높이. themeColors: <html> 에 figma-dark 를
// 붙여 UI 의 토큰 다크 모드([data-theme='dark'])를 켜는 스위치다.
figma.showUI(__html__, { width: 460, height: 720, themeColors: true });

figma.ui.onmessage = async (msg: UiMessage) => {
  try {
    switch (msg.type) {
      case 'sync-tokens': {
        const log = await syncTokens(msg.payload);
        figma.ui.postMessage({ type: 'sync-tokens-result', log });
        figma.notify('Design System Admin Hub: Variables 동기화 완료');
        break;
      }
      case 'cache-images': {
        const log: string[] = [];
        const { ok, fail } = cacheImageBatch(msg.batch, log);
        log.push(
          `이미지 캐시: +${String(ok)} (실패 ${String(fail)}) · 누적 ${String(imageHashCache.size)}`,
        );
        figma.ui.postMessage({ type: 'cache-images-result', log });
        break;
      }
      case 'sync-components': {
        // 구형(배열)·신형({specs, images}) 둘 다 받는다 — 자산 서버가 꺼져 있으면 images 가 빈 배열
        const p = msg.payload;
        const specs = Array.isArray(p) ? p : p.specs;
        const images = Array.isArray(p) ? [] : (p.images ?? []);
        const log = await syncComponents(specs, images);
        figma.ui.postMessage({ type: 'sync-components-result', log });
        figma.notify(`Design System Admin Hub: Component Set 동기화 완료 (${specs.length}개)`);
        break;
      }
      case 'generate-tds-doc': {
        // 이미지 해시 캐시를 넘겨 tds-doc 이 바이트 없이 key→hash 로 실사를 채우게 한다
        const log = await generateTdsDoc(msg.payload, imageHashCache);
        figma.ui.postMessage({ type: 'generate-tds-doc-result', log });
        figma.notify('Design System Admin Hub: TDS 문서 생성 완료');
        break;
      }
      case 'scan-detached': {
        const { log, report, truncated } = await scanDetachedStyles();
        figma.ui.postMessage({ type: 'scan-result', log, report, truncated });
        figma.notify('Design System Admin Hub: Detached 스캔 완료');
        break;
      }
      case 'close': {
        figma.closePlugin();
        break;
      }
      default: {
        figma.ui.postMessage({ type: 'error', message: '알 수 없는 메시지 타입' });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: 'error', message });
    figma.notify(`Design System Admin Hub 오류: ${message}`, { error: true });
  }
};
