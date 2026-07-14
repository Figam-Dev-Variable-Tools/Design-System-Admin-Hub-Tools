/**
 * TDS 문서 생성기 — 피그마 파일에 'TDS 문서 스타일' 페이지를 생성/재생성한다.
 * 소유: A50 Figma Plugin Engineer (tools/figma-plugin/**), 게이트 G7, 검수: A56
 *
 * 규격 문서: docs/figma/specs/tds-doc-style.md — 페이지 이름·치수·바인딩 규칙은
 * 전부 그 문서와 1:1이다. 여기 상수를 바꾸면 규격 문서도 같이 갱신할 것.
 *
 * 입력은 Storybook과 동일한 원천(pnpm codegen 산출물)만 받는다:
 *  - tokens:     generated/tokens/figma-variables.json (tokens/tokens.json에서 생성)
 *  - components: generated/<Name>.figma.json 배열 (contracts/<Name>.contract.json에서 생성)
 *  - pages:      (선택) SCR ID 메타 — docs/plan/ui/SCR-NNN.md 기준 수기 작성
 *
 * Detach 0 원칙: 모든 fill/stroke 색은 '토큰 → Variables 동기화'로 생성된 Variable에
 * setBoundVariableForPaint로 바인딩한다. 이 파일에 색 리터럴은 존재하지 않는다 —
 * 바인딩 전 플레이스홀더 페인트(검정 0값)는 바인딩이 즉시 대체한다.
 * (라벨에 hex/px "값"을 텍스트 데이터로 렌더링하는 것은 조직 규칙상 허용)
 *
 * 지오메트리는 8pt 그리드(GRID) 배수 상수만 사용한다 — 규격 문서 §2.
 */

// ---------------------------------------------------------------------------
// 페이로드 타입 — main.ts의 'generate-tds-doc' 메시지 규격
// ---------------------------------------------------------------------------

export interface TdsTokenVariable {
  /** Variable 이름 — 슬래시 표기 (예: 'color/action/primary/default') */
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  /** 모드별로 끝까지 해석된 raw 값 — COLOR는 hex 문자열 (라벨 데이터로 사용) */
  values: { light: string | number | boolean; dark: string | number | boolean };
  /** 참조 토큰의 대상 Variable 이름 — 스와치 라벨의 '→ …' 줄에 사용 */
  alias?: { light?: string; dark?: string };
}

export interface TdsTokensPayload {
  collection: string;
  modes?: string[];
  variables: TdsTokenVariable[];
}

/** Pages 메타 — 규격 문서 §8. Screen Spec(docs/plan/ui/SCR-NNN.md)의 ID를 옮겨 적는다 */
export interface TdsPageMeta {
  id: string;
  name?: string;
  description?: string;
}

export interface TdsDocPayload {
  tokens: TdsTokensPayload;
  /** generated/<Name>.figma.json 원본 배열 — 두 형식 모두 수용 (normalizeComponentSpec) */
  components?: unknown[];
  pages?: TdsPageMeta[];
  meta?: { version?: string; generatedAt?: string };
}

// ---------------------------------------------------------------------------
// 8pt 그리드 상수 — 규격 문서 §2와 1:1 (하드코딩 px 리터럴 대신 GRID 배수만 사용)
// ---------------------------------------------------------------------------

/** 8pt 그리드 기본 단위 */
const GRID = 8;
/** 4pt 서브그리드 (타이포·미세 간격 허용) */
const SUB = GRID / 2;

const PAGE_PAD = GRID * 8; // 루트 프레임 패딩 (64)
const SECTION_GAP = GRID * 6; // 섹션 간 간격 (48)
const CARD_GAP = GRID * 3; // 카드/행 간 간격 (24)
const CONTENT_W = GRID * 140; // 섹션 콘텐츠 폭 (1120)
const SWATCH = GRID * 15; // 스와치 한 변 (120)
const COVER_W = GRID * 160; // 커버 폭 (1280)
const COVER_H = GRID * 90; // 커버 높이 (720)
const ARTBOARD_W = GRID * 180; // Pages 데스크톱 아트보드 폭 (1440)
const ARTBOARD_H = GRID * 128; // Pages 데스크톱 아트보드 높이 (1024)
/** 헤어라인 두께 — 그리드 예외 허용 항목 (규격 문서 §2) */
const HAIRLINE = 1;

/** 문서 크롬 타입 스케일 (title/section/group/body/caption) — 12·14는 4pt 서브그리드 허용 */
const TYPE = {
  title: GRID * 5, // 40
  section: GRID * 3, // 24
  group: GRID * 2, // 16
  body: SUB * 3 + 2, // 14 (서브그리드 허용 단)
  caption: SUB * 3, // 12
} as const;

// ---------------------------------------------------------------------------
// 페이지 이름 = 멱등 키 — 규격 문서 §1. 이름이 일치하는 페이지는 비우고 재생성한다.
// ---------------------------------------------------------------------------

const PAGE_NAMES = {
  cover: '📕 Cover',
  colors: '🎨 Foundations-Colors',
  typography: 'Aa Typography',
  spacing: '📐 Spacing·Radius·Shadow',
  components: '🧩 Components',
  pages: '📄 Pages',
} as const;

const PAGE_ORDER: readonly string[] = [
  PAGE_NAMES.cover,
  PAGE_NAMES.colors,
  PAGE_NAMES.typography,
  PAGE_NAMES.spacing,
  PAGE_NAMES.components,
  PAGE_NAMES.pages,
];

/** 각 문서 페이지의 루트 프레임 이름 */
const ROOT_FRAME_NAME = 'TDS Doc';

/** 문서 크롬이 요구하는 필수 Variable — 규격 문서 §10 (없으면 생성 중단) */
const CHROME_VARS = {
  textDefault: 'color/text/default',
  textMuted: 'color/text/muted',
  surfaceDefault: 'color/surface/default',
  surfaceRaised: 'color/surface/raised',
  borderDefault: 'color/border/default',
  accent: 'color/action/primary/default',
} as const;

// ---------------------------------------------------------------------------
// 컴포넌트 스펙 정규화 — generated/<Name>.figma.json 두 형식 모두 수용
// ---------------------------------------------------------------------------

interface DocPropertyRow {
  name: string;
  type: string;
  values: string;
  defaultValue: string;
}

interface DocComponentSpec {
  name: string;
  version: string;
  properties: DocPropertyRow[];
  /** 계약 tokens 블록 — 키 → 토큰 경로(점 표기) */
  tokens: Record<string, string>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/**
 * <Name>.figma.json → DocComponentSpec.
 *  형식 A (generate-figma.ts 현행 출력): { component, version, properties[], tokens }
 *  형식 B (main.ts sync-component 규격): { name, variantProperties: { P: { values, default } } }
 */
function normalizeComponentSpec(raw: unknown): DocComponentSpec | null {
  if (!isRecord(raw)) return null;

  // 형식 A — properties 배열
  if (Array.isArray(raw['properties'])) {
    const properties: DocPropertyRow[] = [];
    for (const entry of raw['properties']) {
      if (!isRecord(entry)) continue;
      const values = Array.isArray(entry['values'])
        ? (entry['values'] as unknown[]).map(String).join(' · ')
        : Array.isArray(entry['accepts'])
          ? `accepts: ${(entry['accepts'] as unknown[]).map(String).join(' · ')}`
          : '-';
      const flags: string[] = [];
      if (Array.isArray(entry['hiddenWhen']) && entry['hiddenWhen'].length > 0) {
        flags.push(`hiddenWhen: ${(entry['hiddenWhen'] as unknown[]).map(String).join(',')}`);
      }
      if (entry['deprecated'] === true) flags.push('deprecated');
      properties.push({
        name: asString(entry['name'], '?'),
        type: asString(entry['type'], '?'),
        values: flags.length > 0 ? `${values} (${flags.join(' · ')})` : values,
        defaultValue:
          entry['default'] === undefined || entry['default'] === null
            ? '-'
            : String(entry['default']),
      });
    }
    const tokens: Record<string, string> = {};
    if (isRecord(raw['tokens'])) {
      for (const [key, value] of Object.entries(raw['tokens'])) {
        if (typeof value === 'string') tokens[key] = value;
      }
    }
    return {
      name: asString(raw['component'] ?? raw['name'], 'Unknown'),
      version: asString(raw['version'], '-'),
      properties,
      tokens,
    };
  }

  // 형식 B — variantProperties 레코드
  if (isRecord(raw['variantProperties'])) {
    const properties: DocPropertyRow[] = [];
    for (const [prop, def] of Object.entries(raw['variantProperties'])) {
      if (!isRecord(def)) continue;
      properties.push({
        name: prop,
        type: 'VARIANT',
        values: Array.isArray(def['values'])
          ? (def['values'] as unknown[]).map(String).join(' · ')
          : '-',
        defaultValue: def['default'] === undefined ? '-' : String(def['default']),
      });
    }
    return {
      name: asString(raw['name'], 'Unknown'),
      version: asString(raw['version'], '-'),
      properties,
      tokens: {},
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 문서 생성 컨텍스트 — Variable 인덱스 · 폰트 캐시 · 경고 수집
// ---------------------------------------------------------------------------

interface DocContext {
  log: string[];
  /** 파일에 실존하는 Variable 인덱스 (이름 → Variable, 대상 컬렉션 한정) */
  vars: Map<string, Variable>;
  chrome: {
    textDefault: Variable;
    textMuted: Variable;
    surfaceDefault: Variable;
    surfaceRaised: Variable;
    borderDefault: Variable;
    accent: Variable;
  };
  fonts: { regular: FontName; medium: FontName; bold: FontName };
  /** 스펙시먼 폰트 로드 캐시 — 'family|style' → 성공한 FontName (실패 시 Inter 대체) */
  specimenFonts: Map<string, FontName>;
}

function warn(ctx: DocContext, line: string): void {
  ctx.log.push(`[경고] ${line}`);
}

/** SOLID 페인트를 Variable에 바인딩 — 플레이스홀더 0값은 바인딩이 즉시 대체 (Detach 0) */
function boundSolid(variable: Variable): SolidPaint {
  const placeholder: SolidPaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
  return figma.variables.setBoundVariableForPaint(placeholder, 'color', variable);
}

/** FLOAT 계열 필드 바인딩 시도 — 실패해도 문서 생성은 계속 (값은 이미 적용됨) */
function tryBindField(ctx: DocContext, node: SceneNode, field: string, variable: Variable): void {
  try {
    (node as unknown as { setBoundVariable(field: string, v: Variable): void }).setBoundVariable(
      field,
      variable,
    );
  } catch (error) {
    warn(
      ctx,
      `${field} Variable 바인딩 실패(${variable.name}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// --- 레이아웃 헬퍼 ----------------------------------------------------------

function stack(direction: 'VERTICAL' | 'HORIZONTAL', spacing: number, name: string): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = direction;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.itemSpacing = spacing;
  frame.fills = []; // 컨테이너는 투명 — 색은 명시 바인딩만
  return frame;
}

/** CONTENT_W 고정 폭의 가로 WRAP 컨테이너 (스와치/카드 나열용) */
function wrapRow(name: string): FrameNode {
  const frame = stack('HORIZONTAL', CARD_GAP, name);
  frame.resize(CONTENT_W, frame.height);
  frame.primaryAxisSizingMode = 'FIXED';
  // counterAxisSpacing은 layoutWrap=WRAP에서만 유효 — 순서 고정
  frame.layoutWrap = 'WRAP';
  frame.counterAxisSpacing = CARD_GAP;
  return frame;
}

interface TextOptions {
  size: number;
  font?: FontName;
  colorVar?: Variable;
  /** 지정 시 고정 폭 + 높이 자동 (표 셀용) */
  width?: number;
}

function makeText(ctx: DocContext, content: string, options: TextOptions): TextNode {
  const node = figma.createText();
  node.fontName = options.font ?? ctx.fonts.regular;
  node.characters = content;
  node.fontSize = options.size;
  node.fills = [boundSolid(options.colorVar ?? ctx.chrome.textDefault)];
  if (options.width !== undefined) {
    node.textAutoResize = 'HEIGHT';
    node.resize(options.width, node.height);
  }
  return node;
}

/** CONTENT_W 폭 헤어라인 — color/border/default 바인딩 (그리드 예외 §2) */
function hairline(ctx: DocContext, width: number): LineNode {
  const line = figma.createLine();
  line.resize(width, 0);
  line.strokes = [boundSolid(ctx.chrome.borderDefault)];
  line.strokeWeight = HAIRLINE;
  return line;
}

/** 섹션 헤더 — 24 Semibold(Bold 폰트 사용) + 헤어라인 (규격 문서 §9) */
function sectionHeader(ctx: DocContext, title: string): FrameNode {
  const frame = stack('VERTICAL', SUB * 2, `Section — ${title}`);
  frame.appendChild(makeText(ctx, title, { size: TYPE.section, font: ctx.fonts.bold }));
  frame.appendChild(hairline(ctx, CONTENT_W));
  return frame;
}

/** 그룹(하위) 헤더 — 16 Medium, 헤어라인 없음 */
function groupHeader(ctx: DocContext, title: string): TextNode {
  return makeText(ctx, title, { size: TYPE.group, font: ctx.fonts.medium });
}

// ---------------------------------------------------------------------------
// 페이지 확보/재생성 (멱등) — 이름 매칭 → 자식 전부 제거 → 루트 프레임 재구축
// ---------------------------------------------------------------------------

async function ensurePage(name: string): Promise<PageNode> {
  let page = figma.root.children.find((p) => p.name === name);
  if (!page) {
    page = figma.createPage();
    page.name = name;
  }
  await page.loadAsync();
  for (const child of [...page.children]) {
    child.remove();
  }
  return page;
}

/** 문서 페이지 공통 루트 — 세로 AL, surface/default 배경, PAGE_PAD 패딩 */
function buildRoot(ctx: DocContext, page: PageNode): FrameNode {
  const root = stack('VERTICAL', SECTION_GAP, ROOT_FRAME_NAME);
  root.fills = [boundSolid(ctx.chrome.surfaceDefault)];
  root.paddingTop = PAGE_PAD;
  root.paddingBottom = PAGE_PAD;
  root.paddingLeft = PAGE_PAD;
  root.paddingRight = PAGE_PAD;
  root.x = 0;
  root.y = 0;
  page.appendChild(root);
  return root;
}

// ---------------------------------------------------------------------------
// 1. 📕 Cover — 규격 문서 §3
// ---------------------------------------------------------------------------

function buildCover(ctx: DocContext, page: PageNode, payload: TdsDocPayload): void {
  const cover = stack('VERTICAL', GRID * 4, ROOT_FRAME_NAME);
  cover.fills = [boundSolid(ctx.chrome.surfaceDefault)];
  cover.resize(COVER_W, COVER_H);
  cover.primaryAxisSizingMode = 'FIXED';
  cover.counterAxisSizingMode = 'FIXED';
  cover.paddingTop = GRID * 10;
  cover.paddingBottom = GRID * 10;
  cover.paddingLeft = GRID * 10;
  cover.paddingRight = GRID * 10;
  cover.x = 0;
  cover.y = 0;
  page.appendChild(cover);

  // 액센트 바 — color/action/primary/default
  const accentBar = figma.createFrame();
  accentBar.name = 'Accent';
  accentBar.resize(GRID * 16, GRID);
  accentBar.fills = [boundSolid(ctx.chrome.accent)];
  cover.appendChild(accentBar);

  cover.appendChild(makeText(ctx, 'TDS 디자인 시스템', { size: TYPE.title, font: ctx.fonts.bold }));
  cover.appendChild(
    makeText(ctx, 'TDS Documentation — Figma 미러 (Storybook과 동일 원천)', {
      size: TYPE.group,
      colorVar: ctx.chrome.textMuted,
    }),
  );

  const generatedAt = payload.meta?.generatedAt ?? new Date().toISOString().slice(0, 10);
  const meta = stack('VERTICAL', GRID, 'Meta');
  const lines = [
    `버전: ${payload.meta?.version ?? '-'}`,
    `생성일: ${generatedAt}`,
    'SSOT: tokens/tokens.json · contracts/<Name>.contract.json',
    '생성기: tools/figma-plugin (TDS Sync) — pnpm codegen 산출물만 입력',
  ];
  for (const line of lines) {
    meta.appendChild(makeText(ctx, line, { size: TYPE.body, colorVar: ctx.chrome.textMuted }));
  }
  cover.appendChild(meta);
}

// ---------------------------------------------------------------------------
// 2. 🎨 Foundations-Colors — 규격 문서 §4
// ---------------------------------------------------------------------------

/** COLOR Variable을 규격 §4의 그룹 키로 분류 — 대상 아님이면 null */
function colorGroupOf(name: string): string | null {
  const parts = name.split('/');
  if (parts[0] === 'color' && parts.length >= 2) return `Semantic — color/${parts[1]}`;
  if (parts[0] === 'primitive' && parts[1] === 'color' && parts.length >= 3) {
    return `Primitive — primitive/color/${parts[2]}`;
  }
  if (parts[0] === 'component' && parts.length >= 2) return `Component — component/${parts[1]}`;
  return null;
}

/** 스와치 카드 — 120×120 바인딩 fill + 토큰 경로·hex·변수명(·alias) 라벨 */
function swatchCard(ctx: DocContext, spec: TdsTokenVariable, variable: Variable): FrameNode {
  const card = stack('VERTICAL', SUB, `Swatch — ${spec.name}`);

  const chip = figma.createFrame();
  chip.name = 'Chip';
  chip.resize(SWATCH, SWATCH);
  chip.fills = [boundSolid(variable)];
  chip.strokes = [boundSolid(ctx.chrome.borderDefault)];
  chip.strokeWeight = HAIRLINE;
  const radiusSm = ctx.vars.get('radius/sm');
  if (radiusSm) {
    for (const corner of [
      'topLeftRadius',
      'topRightRadius',
      'bottomLeftRadius',
      'bottomRightRadius',
    ]) {
      tryBindField(ctx, chip, corner, radiusSm);
    }
  }
  card.appendChild(chip);

  const tokenPath = spec.name.split('/').join('.');
  card.appendChild(
    makeText(ctx, tokenPath, { size: TYPE.caption, font: ctx.fonts.medium, width: SWATCH }),
  );
  card.appendChild(
    makeText(ctx, `L ${String(spec.values.light)} · D ${String(spec.values.dark)}`, {
      size: TYPE.caption,
      colorVar: ctx.chrome.textMuted,
      width: SWATCH,
    }),
  );
  card.appendChild(
    makeText(ctx, spec.name, { size: TYPE.caption, colorVar: ctx.chrome.textMuted, width: SWATCH }),
  );
  if (spec.alias?.light !== undefined) {
    card.appendChild(
      makeText(ctx, `→ ${spec.alias.light}`, {
        size: TYPE.caption,
        colorVar: ctx.chrome.textMuted,
        width: SWATCH,
      }),
    );
  }
  return card;
}

function buildColorsPage(ctx: DocContext, page: PageNode, payload: TdsDocPayload): void {
  const root = buildRoot(ctx, page);
  root.appendChild(sectionHeader(ctx, 'Foundations — Colors'));

  // 그룹 순서는 페이로드 등장 순서(= tokens.json 순서) 유지
  const groups = new Map<string, TdsTokenVariable[]>();
  let missing = 0;
  for (const spec of payload.tokens.variables) {
    if (spec.type !== 'COLOR') continue;
    const group = colorGroupOf(spec.name);
    if (group === null) continue;
    if (!ctx.vars.has(spec.name)) {
      missing += 1;
      continue;
    }
    const list = groups.get(group) ?? [];
    list.push(spec);
    groups.set(group, list);
  }
  if (missing > 0) {
    warn(
      ctx,
      `파일에 없는 COLOR Variable ${missing}개 — 스와치 생략. '토큰 → Variables 동기화'를 먼저 실행하세요.`,
    );
  }

  for (const [group, specs] of groups) {
    const section = stack('VERTICAL', CARD_GAP, group);
    section.appendChild(groupHeader(ctx, group));
    const row = wrapRow('Swatches');
    for (const spec of specs) {
      const variable = ctx.vars.get(spec.name);
      if (variable) row.appendChild(swatchCard(ctx, spec, variable));
    }
    section.appendChild(row);
    root.appendChild(section);
  }
  ctx.log.push(`컬러 페이지: 그룹 ${groups.size}개 렌더링`);
}

// ---------------------------------------------------------------------------
// 3. Aa Typography — 규격 문서 §5
// ---------------------------------------------------------------------------

/** 토큰 fontWeight 값 → Figma 스타일명 (Inter/Pretendard 공통 관례) */
function styleForWeight(weight: number): string {
  if (weight >= 700) return 'Bold';
  if (weight >= 500) return 'Medium';
  return 'Regular';
}

/** 스펙시먼 폰트 로드 — 미설치 시 Inter로 대체하고 경고 (규격 §5.2) */
async function loadSpecimenFont(ctx: DocContext, family: string, style: string): Promise<FontName> {
  const key = `${family}|${style}`;
  const cached = ctx.specimenFonts.get(key);
  if (cached) return cached;
  let font: FontName = { family, style };
  try {
    await figma.loadFontAsync(font);
  } catch {
    warn(ctx, `폰트 미설치: ${family} ${style} — Inter로 대체 (fontFamily 바인딩 생략)`);
    font =
      style === 'Bold' ? ctx.fonts.bold : style === 'Medium' ? ctx.fonts.medium : ctx.fonts.regular;
  }
  ctx.specimenFonts.set(key, font);
  return font;
}

interface TypeRampEntry {
  prefix: string; // 예: 'typography/label/md'
  fontSize?: TdsTokenVariable;
  fontWeight?: TdsTokenVariable;
  lineHeight?: TdsTokenVariable;
  fontFamily?: TdsTokenVariable;
}

function collectTypeRamp(payload: TdsDocPayload): TypeRampEntry[] {
  const byPrefix = new Map<string, TypeRampEntry>();
  const RAMP_RE = /^(typography\/.+)\/(font-size|font-weight|line-height|font-family)$/;
  for (const spec of payload.tokens.variables) {
    const match = RAMP_RE.exec(spec.name);
    if (!match || match[1] === undefined || match[2] === undefined) continue;
    const prefix = match[1];
    const entry = byPrefix.get(prefix) ?? { prefix };
    if (match[2] === 'font-size') entry.fontSize = spec;
    else if (match[2] === 'font-weight') entry.fontWeight = spec;
    else if (match[2] === 'line-height') entry.lineHeight = spec;
    else entry.fontFamily = spec;
    byPrefix.set(prefix, entry);
  }
  return [...byPrefix.values()].filter((entry) => entry.fontSize !== undefined);
}

async function buildTypographyPage(
  ctx: DocContext,
  page: PageNode,
  payload: TdsDocPayload,
): Promise<void> {
  const root = buildRoot(ctx, page);

  // 5.1 폰트 컬러 — color/text/*
  root.appendChild(sectionHeader(ctx, '폰트 컬러 — color/text/*'));
  const fontColors = stack('VERTICAL', GRID * 2, 'Font Colors');
  for (const spec of payload.tokens.variables) {
    if (spec.type !== 'COLOR' || !spec.name.startsWith('color/text/')) continue;
    const variable = ctx.vars.get(spec.name);
    if (!variable) continue;
    const row = stack('HORIZONTAL', CARD_GAP, `FontColor — ${spec.name}`);
    row.counterAxisAlignItems = 'CENTER';
    row.appendChild(
      makeText(ctx, '가나다라 ABC 0123', {
        size: TYPE.group,
        colorVar: variable,
        width: GRID * 30,
      }),
    );
    row.appendChild(
      makeText(
        ctx,
        `${spec.name.split('/').join('.')} · L ${String(spec.values.light)} · D ${String(spec.values.dark)} · ${spec.name}`,
        { size: TYPE.caption, colorVar: ctx.chrome.textMuted },
      ),
    );
    fontColors.appendChild(row);
    fontColors.appendChild(hairline(ctx, CONTENT_W));
  }
  root.appendChild(fontColors);

  // 5.2 타이포 스펙시먼 램프
  root.appendChild(sectionHeader(ctx, '타이포그래피 램프 — typography/*'));
  const rampSection = stack('VERTICAL', CARD_GAP, 'Type Ramp');
  for (const entry of collectTypeRamp(payload)) {
    const sizeValue =
      typeof entry.fontSize?.values.light === 'number' ? entry.fontSize.values.light : TYPE.group;
    const weightValue =
      typeof entry.fontWeight?.values.light === 'number' ? entry.fontWeight.values.light : 400;
    const lineHeightValue =
      typeof entry.lineHeight?.values.light === 'number'
        ? entry.lineHeight.values.light
        : undefined;
    const familyStack =
      typeof entry.fontFamily?.values.light === 'string' ? entry.fontFamily.values.light : '';
    const firstFamily = familyStack.split(',')[0]?.trim() ?? '';

    const style = styleForWeight(weightValue);
    const font =
      firstFamily.length > 0
        ? await loadSpecimenFont(ctx, firstFamily, style)
        : style === 'Bold'
          ? ctx.fonts.bold
          : style === 'Medium'
            ? ctx.fonts.medium
            : ctx.fonts.regular;

    const row = stack('VERTICAL', SUB * 2, `Ramp — ${entry.prefix}`);
    const specimen = makeText(ctx, '한글 타이포그래피 Ag 0123', { size: sizeValue, font });
    if (lineHeightValue !== undefined) {
      // 배수형 line-height는 Variable(px 해석)과 단위 불일치 — PERCENT 적용 (규격 §5.2 예외)
      specimen.lineHeight =
        lineHeightValue < 4
          ? { unit: 'PERCENT', value: lineHeightValue * 100 }
          : { unit: 'PIXELS', value: lineHeightValue };
    }
    if (entry.fontSize) {
      const sizeVar = ctx.vars.get(entry.fontSize.name);
      if (sizeVar) tryBindField(ctx, specimen, 'fontSize', sizeVar);
    }
    if (entry.fontWeight) {
      const weightVar = ctx.vars.get(entry.fontWeight.name);
      if (weightVar) tryBindField(ctx, specimen, 'fontWeight', weightVar);
    }
    row.appendChild(specimen);

    const metaParts = [
      entry.prefix.split('/').join('.'),
      `size ${String(sizeValue)}`,
      `weight ${String(weightValue)}`,
      ...(lineHeightValue !== undefined ? [`lh ${String(lineHeightValue)}`] : []),
      ...(familyStack.length > 0 ? [familyStack] : []),
    ];
    row.appendChild(
      makeText(ctx, metaParts.join(' · '), { size: TYPE.caption, colorVar: ctx.chrome.textMuted }),
    );
    row.appendChild(hairline(ctx, CONTENT_W));
    rampSection.appendChild(row);
  }
  root.appendChild(rampSection);

  // 5.3 폰트 패밀리 — primitive/typography/font-family/*
  root.appendChild(sectionHeader(ctx, '폰트 패밀리 — primitive/typography/font-family/*'));
  const familySection = stack('VERTICAL', GRID, 'Font Families');
  for (const spec of payload.tokens.variables) {
    if (!spec.name.startsWith('primitive/typography/font-family/')) continue;
    familySection.appendChild(
      makeText(ctx, `${spec.name} · ${String(spec.values.light)}`, {
        size: TYPE.body,
        colorVar: ctx.chrome.textMuted,
      }),
    );
  }
  root.appendChild(familySection);
  ctx.log.push('타이포그래피 페이지: 폰트 컬러 + 램프 + 패밀리 렌더링');
}

// ---------------------------------------------------------------------------
// 4. 📐 Spacing·Radius·Shadow — 규격 문서 §6
// ---------------------------------------------------------------------------

function buildSpacingPage(ctx: DocContext, page: PageNode, payload: TdsDocPayload): void {
  const root = buildRoot(ctx, page);

  // Spacing — semantic space/* (값 오름차순)
  root.appendChild(sectionHeader(ctx, 'Spacing — space/*'));
  const spacingSection = stack('VERTICAL', GRID * 2, 'Spacing');
  const spaceSpecs = payload.tokens.variables
    .filter((spec) => /^space\//.test(spec.name) && spec.type === 'FLOAT')
    .sort((a, b) => Number(a.values.light) - Number(b.values.light));
  for (const spec of spaceSpecs) {
    const value = Number(spec.values.light);
    const row = stack('HORIZONTAL', CARD_GAP, `Space — ${spec.name}`);
    row.counterAxisAlignItems = 'CENTER';
    row.appendChild(
      makeText(ctx, `${spec.name} · ${String(value)}px`, {
        size: TYPE.caption,
        colorVar: ctx.chrome.textMuted,
        width: GRID * 30,
      }),
    );
    const bar = figma.createFrame();
    bar.name = 'Bar';
    bar.resize(Math.max(value, HAIRLINE), GRID);
    bar.fills = [boundSolid(ctx.chrome.accent)];
    const spaceVar = ctx.vars.get(spec.name);
    if (spaceVar) tryBindField(ctx, bar, 'width', spaceVar);
    row.appendChild(bar);
    spacingSection.appendChild(row);
  }
  root.appendChild(spacingSection);

  // Radius — radius/* (4코너 Variable 바인딩)
  root.appendChild(sectionHeader(ctx, 'Radius — radius/*'));
  const radiusRow = wrapRow('Radius');
  for (const spec of payload.tokens.variables) {
    if (!/^radius\//.test(spec.name) || spec.type !== 'FLOAT') continue;
    const variable = ctx.vars.get(spec.name);
    const card = stack('VERTICAL', SUB, `Radius — ${spec.name}`);
    const box = figma.createFrame();
    box.name = 'Box';
    box.resize(GRID * 8, GRID * 8);
    box.fills = [boundSolid(ctx.chrome.surfaceRaised)];
    box.strokes = [boundSolid(ctx.chrome.borderDefault)];
    box.strokeWeight = HAIRLINE;
    if (variable) {
      for (const corner of [
        'topLeftRadius',
        'topRightRadius',
        'bottomLeftRadius',
        'bottomRightRadius',
      ]) {
        tryBindField(ctx, box, corner, variable);
      }
    }
    card.appendChild(box);
    card.appendChild(
      makeText(ctx, `${spec.name} · ${String(spec.values.light)}px`, {
        size: TYPE.caption,
        colorVar: ctx.chrome.textMuted,
      }),
    );
    radiusRow.appendChild(card);
  }
  root.appendChild(radiusRow);

  // Shadow — 현재 tokens.json에 없으면 안내 문구 (규격 §6)
  root.appendChild(sectionHeader(ctx, 'Shadow'));
  const shadowSpecs = payload.tokens.variables.filter((spec) =>
    /^(shadow|elevation)\//.test(spec.name),
  );
  if (shadowSpecs.length === 0) {
    root.appendChild(
      makeText(ctx, 'shadow 토큰 없음 — tokens.json에 추가 시 자동 렌더링', {
        size: TYPE.body,
        colorVar: ctx.chrome.textMuted,
      }),
    );
  } else {
    const shadowSection = stack('VERTICAL', GRID, 'Shadow');
    for (const spec of shadowSpecs) {
      shadowSection.appendChild(
        makeText(
          ctx,
          `${spec.name} · L ${String(spec.values.light)} · D ${String(spec.values.dark)}`,
          {
            size: TYPE.body,
            colorVar: ctx.chrome.textMuted,
          },
        ),
      );
    }
    root.appendChild(shadowSection);
  }

  // Motion — 동일 원천 보너스 섹션 (duration ms · easing cubic-bezier)
  root.appendChild(sectionHeader(ctx, 'Motion — motion/*'));
  const motionSection = stack('VERTICAL', GRID, 'Motion');
  for (const spec of payload.tokens.variables) {
    if (!/^motion\/(duration|easing)\//.test(spec.name)) continue;
    const unit = spec.type === 'FLOAT' ? 'ms' : '';
    motionSection.appendChild(
      makeText(ctx, `${spec.name} · ${String(spec.values.light)}${unit}`, {
        size: TYPE.body,
        colorVar: ctx.chrome.textMuted,
      }),
    );
  }
  root.appendChild(motionSection);
  ctx.log.push('Spacing·Radius·Shadow 페이지 렌더링 완료');
}

// ---------------------------------------------------------------------------
// 5. 🧩 Components — 규격 문서 §7
// ---------------------------------------------------------------------------

/** Property 표 열 폭 — 규격 §7 */
const COL_W = {
  name: GRID * 22,
  type: GRID * 18,
  values: GRID * 45,
  defaultValue: GRID * 18,
} as const;

function tableRow(ctx: DocContext, cells: DocPropertyRow, font: FontName): FrameNode {
  const row = stack('HORIZONTAL', GRID * 2, 'Row');
  row.appendChild(makeText(ctx, cells.name, { size: TYPE.caption, font, width: COL_W.name }));
  row.appendChild(makeText(ctx, cells.type, { size: TYPE.caption, font, width: COL_W.type }));
  row.appendChild(makeText(ctx, cells.values, { size: TYPE.caption, font, width: COL_W.values }));
  row.appendChild(
    makeText(ctx, cells.defaultValue, { size: TYPE.caption, font, width: COL_W.defaultValue }),
  );
  return row;
}

function buildComponentsPage(ctx: DocContext, page: PageNode, payload: TdsDocPayload): void {
  const root = buildRoot(ctx, page);
  const specs = (payload.components ?? [])
    .map((raw) => normalizeComponentSpec(raw))
    .filter((spec): spec is DocComponentSpec => spec !== null);

  if (specs.length === 0) {
    root.appendChild(sectionHeader(ctx, 'Components'));
    root.appendChild(
      makeText(ctx, '컴포넌트 페이로드 없음 — generated/<Name>.figma.json을 함께 로드하세요.', {
        size: TYPE.body,
        colorVar: ctx.chrome.textMuted,
      }),
    );
    ctx.log.push('컴포넌트 페이지: 페이로드 없음 (안내만 렌더링)');
    return;
  }

  for (const spec of specs) {
    const section = stack('VERTICAL', CARD_GAP, `Component — ${spec.name}`);
    section.appendChild(sectionHeader(ctx, `${spec.name} v${spec.version}`));

    // Property 표
    const table = stack('VERTICAL', GRID, 'Properties');
    table.appendChild(
      tableRow(
        ctx,
        { name: 'Property', type: 'Type', values: 'Values', defaultValue: 'Default' },
        ctx.fonts.bold,
      ),
    );
    table.appendChild(hairline(ctx, CONTENT_W));
    for (const prop of spec.properties) {
      table.appendChild(tableRow(ctx, prop, ctx.fonts.regular));
    }
    section.appendChild(table);

    // Variant 매트릭스 자리 — 내용은 A51 소유 (여기서는 자리만)
    const slot = figma.createFrame();
    slot.name = `Variant Matrix Slot — ${spec.name}`;
    slot.resize(CONTENT_W, GRID * 30);
    slot.fills = [boundSolid(ctx.chrome.surfaceRaised)];
    slot.strokes = [boundSolid(ctx.chrome.borderDefault)];
    slot.strokeWeight = HAIRLINE;
    slot.dashPattern = [SUB, SUB];
    slot.layoutMode = 'VERTICAL';
    slot.primaryAxisSizingMode = 'FIXED';
    slot.counterAxisSizingMode = 'FIXED';
    slot.primaryAxisAlignItems = 'CENTER';
    slot.counterAxisAlignItems = 'CENTER';
    slot.appendChild(
      makeText(ctx, "Variant 매트릭스 — '계약 → Variant Property 동기화' 실행 후 A51이 채움", {
        size: TYPE.body,
        colorVar: ctx.chrome.textMuted,
      }),
    );
    section.appendChild(slot);

    // 토큰 바인딩 표 — 키 / 토큰 경로 / Variable 이름 (미생성 표시)
    const tokenEntries = Object.entries(spec.tokens);
    if (tokenEntries.length > 0) {
      const tokenTable = stack('VERTICAL', GRID, 'Tokens');
      tokenTable.appendChild(groupHeader(ctx, '토큰 바인딩'));
      for (const [key, path] of tokenEntries) {
        const varName = path.split('.').join('/');
        // 합성 토큰(typography 등)은 서브 Variable(…/font-size)로 전개되므로 프리픽스 일치도 인정
        const exists =
          ctx.vars.has(varName) ||
          [...ctx.vars.keys()].some((name) => name.startsWith(`${varName}/`));
        if (!exists) warn(ctx, `${spec.name}.tokens.${key}: Variable 미생성 — ${varName}`);
        tokenTable.appendChild(
          makeText(ctx, `${key} · ${path} · ${varName}${exists ? '' : ' (미생성)'}`, {
            size: TYPE.caption,
            colorVar: ctx.chrome.textMuted,
          }),
        );
      }
      section.appendChild(tokenTable);
    }
    root.appendChild(section);
  }
  ctx.log.push(`컴포넌트 페이지: ${specs.length}개 시트 렌더링`);
}

// ---------------------------------------------------------------------------
// 6. 📄 Pages — 규격 문서 §8
// ---------------------------------------------------------------------------

function buildPagesPage(ctx: DocContext, page: PageNode, payload: TdsDocPayload): void {
  const root = buildRoot(ctx, page);
  root.appendChild(sectionHeader(ctx, 'Pages — Screen Spec 아트보드'));

  const pages = payload.pages ?? [];
  if (pages.length === 0) {
    root.appendChild(
      makeText(
        ctx,
        'pages 메타 없음 — {"$kind":"tds-pages","pages":[{"id":"SCR-001","name":"…"}]} 형식으로 로드하면 1440 아트보드가 생성됩니다.',
        { size: TYPE.body, colorVar: ctx.chrome.textMuted },
      ),
    );
    ctx.log.push('Pages 페이지: 메타 없음 (안내만 렌더링)');
    return;
  }

  for (const meta of pages) {
    const label =
      meta.name !== undefined && meta.name.length > 0 ? `${meta.id} · ${meta.name}` : meta.id;
    const block = stack('VERTICAL', GRID * 2, `Screen — ${meta.id}`);
    block.appendChild(makeText(ctx, label, { size: TYPE.group, font: ctx.fonts.medium }));
    if (meta.description !== undefined && meta.description.length > 0) {
      block.appendChild(
        makeText(ctx, meta.description, { size: TYPE.body, colorVar: ctx.chrome.textMuted }),
      );
    }

    // 1440 데스크톱 아트보드 — 내용은 비워 둔다 (화면 조립은 A53 소유)
    const artboard = figma.createFrame();
    artboard.name =
      meta.name !== undefined && meta.name.length > 0 ? `${meta.id} — ${meta.name}` : meta.id;
    artboard.resize(ARTBOARD_W, ARTBOARD_H);
    artboard.fills = [boundSolid(ctx.chrome.surfaceDefault)];
    artboard.strokes = [boundSolid(ctx.chrome.borderDefault)];
    artboard.strokeWeight = HAIRLINE;
    artboard.clipsContent = true;
    block.appendChild(artboard);
    root.appendChild(block);
  }
  ctx.log.push(`Pages 페이지: 아트보드 ${pages.length}개 렌더링`);
}

// ---------------------------------------------------------------------------
// 엔트리 — 페이로드 검증 → 컨텍스트 구성 → 6개 페이지 생성/재생성 → 정렬
// ---------------------------------------------------------------------------

export async function generateTdsDoc(payload: TdsDocPayload): Promise<string[]> {
  if (
    !payload ||
    !isRecord(payload.tokens) ||
    typeof payload.tokens.collection !== 'string' ||
    !Array.isArray(payload.tokens.variables)
  ) {
    throw new Error(
      'TDS 문서 페이로드 형식 오류 — { tokens: {collection, variables[]}, components?, pages?, meta? } 필요 (docs/figma/specs/tds-doc-style.md §11)',
    );
  }

  const log: string[] = [];
  await figma.loadAllPagesAsync();

  // Variable 인덱스 — '토큰 → Variables 동기화'가 만든 컬렉션이 선행 조건
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const collection = collections.find((c) => c.name === payload.tokens.collection);
  if (!collection) {
    throw new Error(
      `Variable 컬렉션 '${payload.tokens.collection}' 없음 — 먼저 '토큰 → Variables 동기화'를 실행하세요 (실행 순서: codegen → Variables → TDS 문서)`,
    );
  }
  const vars = new Map<string, Variable>();
  for (const variable of await figma.variables.getLocalVariablesAsync()) {
    if (variable.variableCollectionId === collection.id) vars.set(variable.name, variable);
  }

  // 필수 크롬 Variable — 규격 §10 (하나라도 없으면 중단)
  const missingChrome = Object.values(CHROME_VARS).filter((name) => !vars.has(name));
  if (missingChrome.length > 0) {
    throw new Error(
      `문서 크롬 필수 Variable 없음: ${missingChrome.join(', ')} — tokens.json semantic 계층과 Variables 동기화 상태를 확인하세요`,
    );
  }
  const chromeVar = (name: string): Variable => {
    const v = vars.get(name);
    if (!v) throw new Error(`크롬 Variable 조회 실패: ${name}`);
    return v;
  };

  // 문서 크롬 폰트 — Inter 3단 (Figma 기본 탑재)
  const fonts = {
    regular: { family: 'Inter', style: 'Regular' } as FontName,
    medium: { family: 'Inter', style: 'Medium' } as FontName,
    bold: { family: 'Inter', style: 'Bold' } as FontName,
  };
  await Promise.all([
    figma.loadFontAsync(fonts.regular),
    figma.loadFontAsync(fonts.medium),
    figma.loadFontAsync(fonts.bold),
  ]);

  const ctx: DocContext = {
    log,
    vars,
    chrome: {
      textDefault: chromeVar(CHROME_VARS.textDefault),
      textMuted: chromeVar(CHROME_VARS.textMuted),
      surfaceDefault: chromeVar(CHROME_VARS.surfaceDefault),
      surfaceRaised: chromeVar(CHROME_VARS.surfaceRaised),
      borderDefault: chromeVar(CHROME_VARS.borderDefault),
      accent: chromeVar(CHROME_VARS.accent),
    },
    fonts,
    specimenFonts: new Map(),
  };

  // 페이지 생성/재생성 (이름 매칭 멱등 — 목록 밖 페이지는 건드리지 않음)
  buildCover(ctx, await ensurePage(PAGE_NAMES.cover), payload);
  buildColorsPage(ctx, await ensurePage(PAGE_NAMES.colors), payload);
  await buildTypographyPage(ctx, await ensurePage(PAGE_NAMES.typography), payload);
  buildSpacingPage(ctx, await ensurePage(PAGE_NAMES.spacing), payload);
  buildComponentsPage(ctx, await ensurePage(PAGE_NAMES.components), payload);
  buildPagesPage(ctx, await ensurePage(PAGE_NAMES.pages), payload);

  // 문서 페이지를 규격 순서로 파일 맨 앞에 정렬
  PAGE_ORDER.forEach((name, index) => {
    const page = figma.root.children.find((p) => p.name === name);
    if (page) figma.root.insertChild(index, page);
  });

  log.push('TDS 문서 생성 완료 — 페이지 6개 (규격: docs/figma/specs/tds-doc-style.md)');
  return log;
}
