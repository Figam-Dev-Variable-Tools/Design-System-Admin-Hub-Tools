/**
 * TDS Sync — Figma 플러그인 메인 스레드
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

interface ComponentFigmaSpec {
  /** Component Set 이름 — 계약의 name (예: 'Button') */
  name: string;
  /** 키 = 계약의 figmaProperty (예: 'Variant', 'Size', 'Loading') */
  variantProperties: Record<string, VariantPropertyDef>;
}

type UiMessage =
  | { type: 'sync-tokens'; payload: TokensPayload }
  | { type: 'sync-components'; payload: ComponentFigmaSpec[] }
  | { type: 'generate-tds-doc'; payload: TdsDocPayload }
  | { type: 'scan-detached' }
  | { type: 'close' };

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

function createComponentSet(spec: ComponentFigmaSpec, log: string[]): void {
  const entries = Object.entries(spec.variantProperties);
  const combos = cartesian(
    entries.map(([prop, def]) => def.values.map((value) => `${prop}=${value}`)),
  );
  if (combos.length > 200) {
    throw new Error(
      `variant 조합 ${combos.length}개 — 200개 초과는 계약 분리가 필요하다 (계약 엔지니어에 변경 요청 발행)`,
    );
  }
  const components = combos.map((combo) => {
    const component = figma.createComponent();
    component.name = combo.join(', ');
    return component;
  });
  const set = figma.combineAsVariants(components, figma.currentPage);
  set.name = spec.name;
  log.push(
    `Component Set 생성: ${spec.name} — variant ${combos.length}개 (프레임 내용/레이아웃 채움은 Figma 컴포넌트/Figma UI 담당)`,
  );
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

async function syncComponent(spec: ComponentFigmaSpec): Promise<string[]> {
  if (!spec || typeof spec.name !== 'string' || !spec.variantProperties) {
    throw new Error(
      '컴포넌트 페이로드 형식 오류 — {name, variantProperties} 필요 (generated/<Name>.figma.json)',
    );
  }
  const entries = Object.entries(spec.variantProperties);
  if (entries.length === 0) {
    throw new Error(`${spec.name}: variantProperties가 비어 있음 — codegen 산출물 확인`);
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
  await figma.loadAllPagesAsync();
  const sets = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET'] });
  const target = sets.find((set) => set.name === spec.name);

  if (!target) {
    createComponentSet(spec, log);
  } else {
    log.push(`기존 Component Set 갱신: ${spec.name}`);
    updateComponentSet(target, spec, log);
  }
  return log;
}

/**
 * 여러 계약을 한 번에 동기화한다 (UI 의 '전체' 선택).
 * 하나가 실패해도 나머지를 계속 진행하고, 실패를 로그에 남긴 뒤 마지막에 집계한다 —
 * 중간에 던져 버리면 '몇 개가 반영됐는지 모르는' 상태가 되어 조용한 부분 반영이 된다.
 */
async function syncComponents(specs: ComponentFigmaSpec[]): Promise<string[]> {
  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error('동기화할 계약이 없습니다 — 산출물을 적재하세요.');
  }
  const log: string[] = [];
  let failed = 0;

  for (const spec of specs) {
    try {
      const entryLog = await syncComponent(spec);
      for (const line of entryLog) log.push(line);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      const name = spec && typeof spec.name === 'string' ? spec.name : '(이름 불명)';
      log.push(`[오류] ${name}: ${message}`);
    }
  }

  log.push(`Component Set 동기화 완료 — 성공 ${specs.length - failed} · 실패 ${failed}`);
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
        figma.notify('TDS Sync: Variables 동기화 완료');
        break;
      }
      case 'sync-components': {
        const log = await syncComponents(msg.payload);
        figma.ui.postMessage({ type: 'sync-components-result', log });
        figma.notify(`TDS Sync: Component Set 동기화 완료 (${msg.payload.length}개)`);
        break;
      }
      case 'generate-tds-doc': {
        const log = await generateTdsDoc(msg.payload);
        figma.ui.postMessage({ type: 'generate-tds-doc-result', log });
        figma.notify('TDS Sync: TDS 문서 생성 완료');
        break;
      }
      case 'scan-detached': {
        const { log, report, truncated } = await scanDetachedStyles();
        figma.ui.postMessage({ type: 'scan-result', log, report, truncated });
        figma.notify('TDS Sync: Detached 스캔 완료');
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
    figma.notify(`TDS Sync 오류: ${message}`, { error: true });
  }
};
