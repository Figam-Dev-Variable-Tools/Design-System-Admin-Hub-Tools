/**
 * TDS 문서 생성기 — 피그마 파일에 'TDS 문서 스타일' 페이지를 생성/재생성한다.
 * 소유: Figma 플러그인 Figma Plugin Engineer (tools/figma-plugin/**), 게이트 G7, 검수: Figma 리뷰
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
  /** nav 섹션 제목(그룹) — 예: '일반 관리' (generated/tds-pages.json 이 채운다) */
  section?: string;
  /** 상위 메뉴 라벨 — 예: '사용자 관리'. 같은 menu 끼리 한 Figma 페이지로 묶인다 */
  menu?: string;
  /**
   * 실제 화면 스크린샷 참조 — 바이트는 cache-images 로 미리 올려 두고 key 로 가리킨다.
   * 있으면 스켈레톤 대신 실물 렌더로 아트보드를 채운다(1:1 미러). w·h 는 (필요시 축소된) 실제 픽셀.
   */
  image?: { key: string; w: number; h: number };
}

/** 컴포넌트 한 스토리의 실사 참조 — 🧩 Components 문서의 Variant 매트릭스를 실물로 채운다(key→캐시 해시) */
export interface DocRenderEntry {
  story: string;
  key: string;
  w: number;
  h: number;
}

/** 오너 정본 분류표(23모듈)의 한 항목 — component 가 null 이면 아직 미구현(로드맵) */
export interface TdsTaxonomyItem {
  key: string;
  name: string;
  /** 구현된 프로젝트 컴포넌트 이름. null/미지정 = 미구현 */
  component?: string | null;
}

/** 오너 정본 분류표의 한 카테고리(모듈) — no 는 01~23 오너 번호 */
export interface TdsTaxonomyCategory {
  no: number;
  /** 영문명 — COMPONENT_CATEGORIES 및 계약 category 와 1:1 */
  name: string;
  key: string;
  /** 한글 라벨 (예: '액션') */
  label: string;
  description?: string;
  items: TdsTaxonomyItem[];
  /** 정본 밖 프로젝트 고유 컴포넌트 이름 */
  extras?: string[];
}

export interface TdsDocPayload {
  tokens: TdsTokensPayload;
  /**
   * 오너 정본 분류표(23모듈 286항목). 없으면 카테고리 페이지의 체크리스트를 통째로 생략한다
   * (기존 동작 유지) — generated/taxonomy.json 이 없어도 문서 생성은 정상 동작해야 한다.
   */
  taxonomy?: TdsTaxonomyCategory[];
  /** generated/<Name>.figma.json 원본 배열 — 두 형식 모두 수용 (normalizeComponentSpec) */
  components?: unknown[];
  pages?: TdsPageMeta[];
  /** 컴포넌트 이름 → 스토리 실사 배열. 있으면 🧩 Components 문서에 실물 렌더를 넣는다(1:1) */
  componentRenders?: Record<string, DocRenderEntry[]>;
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

// 페이지 순서는 generateTdsDoc 이 동적으로 만든다(파운데이션 5장 + 구분선 + 메뉴별 페이지).

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
  /** 원자단위 — atom·molecule·organism (디자인 시스템 내부 축) */
  level: string;
  /** 기능 카테고리 — Actions·Inputs·Feedback… 문서 페이지를 이 축으로 묶는다 */
  category: string;
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
      level: asString(raw['level'], 'atom'),
      category: asString(raw['category'], 'Utilities'),
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
      level: asString(raw['level'], 'atom'),
      category: asString(raw['category'], 'Utilities'),
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
  /** 이미지 캐시 — key → imageHash (main 이 cache-images 로 미리 createImage 해 둔 것). 실사 채움용 */
  imageHash: Map<string, string>;
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
  // 식별은 표시명(순번 접두어 '5. ' 가 붙을 수 있음)이 아니라 tdsBase 키로 — 순번 부여와 멱등성 양립.
  // 사용자가 페이지를 복제하면 pluginData 까지 복사돼 같은 키가 둘이 된다. 첫 장만 쓰고 나머지는
  // 표식을 떼어 **사용자 페이지로 넘긴다** — 안 그러면 정리 단계가 사용자의 사본을 지운다.
  const matches = figma.root.children.filter((p) => p.getPluginData('tdsBase') === name);
  let page = matches[0];
  for (const extra of matches.slice(1)) {
    extra.setPluginData('tdsDoc', '');
    extra.setPluginData('tdsBase', '');
  }
  if (!page) {
    page = figma.createPage();
    page.name = name;
  }
  await page.loadAsync();
  for (const child of [...page.children]) {
    child.remove();
  }
  page.setPluginData('tdsBase', name); // 순번과 무관한 안정 식별자
  page.setPluginData('tdsDoc', '1'); // 우리가 만든 페이지 표식 — 재생성 시 옛 페이지 정리에 쓴다
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
    '생성기: tools/figma-plugin (Design System Admin Hub) — pnpm codegen 산출물만 입력',
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

/**
 * 한 컴포넌트의 Variant 매트릭스 — 스토리 실사를 WRAP 그리드로 나열한다(각 칸 = 렌더 + 스토리 라벨).
 * 넓은 렌더(예: Alert 1248px)는 표시 폭을 캡해 비율 유지 축소한다. createImage 실패 칸은 건너뛴다.
 */
function buildVariantMatrix(ctx: DocContext, name: string, renders: DocRenderEntry[]): FrameNode {
  const grid = wrapRow(`Variants — ${name}`);
  const CELL_MAX_W = GRID * 44; // 352 — 한 칸 최대 표시 폭
  for (const r of renders) {
    const hash = ctx.imageHash.get(r.key);
    if (!hash) {
      ctx.log.push(`[변형 이미지 미캐시] ${name}/${r.story} (${r.key})`);
      continue;
    }
    const cell = stack('VERTICAL', SUB, `Variant — ${r.story}`);
    const scale = r.w > CELL_MAX_W ? CELL_MAX_W / r.w : 1;
    const dw = Math.max(1, Math.round(r.w * scale));
    const dh = Math.max(1, Math.round(r.h * scale));
    const shot = figma.createFrame();
    shot.name = r.story;
    shot.resize(dw, dh);
    shot.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];
    shot.strokes = [boundSolid(ctx.chrome.borderDefault)];
    shot.strokeWeight = HAIRLINE;
    shot.strokeAlign = 'INSIDE';
    cell.appendChild(shot);
    cell.appendChild(
      makeText(ctx, r.story, { size: TYPE.caption, colorVar: ctx.chrome.textMuted }),
    );
    grid.appendChild(cell);
  }
  return grid;
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

  // 레벨(atom·molecule·organism)로 묶어 그룹 헤더 아래 컴포넌트 시트를 배치한다.
  const LEVEL_ORDER = ['atom', 'molecule', 'organism'];
  const LEVEL_LABEL: Record<string, string> = {
    atom: 'Atoms',
    molecule: 'Molecules',
    organism: 'Organisms',
  };
  const byLevel = new Map<string, DocComponentSpec[]>();
  for (const spec of specs) {
    const lvl = spec.level.length > 0 ? spec.level : 'atom';
    const bucket = byLevel.get(lvl);
    if (bucket) bucket.push(spec);
    else byLevel.set(lvl, [spec]);
  }
  const levels = [
    ...LEVEL_ORDER.filter((l) => byLevel.has(l)),
    ...[...byLevel.keys()].filter((l) => !LEVEL_ORDER.includes(l)),
  ];

  for (const level of levels) {
    const group = byLevel.get(level);
    if (!group) continue;
    root.appendChild(
      makeText(ctx, `${LEVEL_LABEL[level] ?? level} — ${String(group.length)}개`, {
        size: TYPE.title,
        font: ctx.fonts.bold,
      }),
    );
    for (const spec of group) {
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

      // Variant 매트릭스 — 실사가 있으면 실물 렌더 그리드, 없으면 안내 자리표시
      const renders = payload.componentRenders?.[spec.name] ?? [];
      if (renders.length > 0) {
        section.appendChild(groupHeader(ctx, `Variants — 스토리 ${String(renders.length)}개`));
        section.appendChild(buildVariantMatrix(ctx, spec.name, renders));
      } else {
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
          makeText(
            ctx,
            'Variant 매트릭스 — 실사 로드 후 채움 (내장 실사가 없으면 여기 안내가 남음)',
            {
              size: TYPE.body,
              colorVar: ctx.chrome.textMuted,
            },
          ),
        );
        section.appendChild(slot);
      }

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
  }
  ctx.log.push(`컴포넌트 페이지: ${specs.length}개 시트 · ${levels.length}개 레벨 렌더링`);
}

// ---------------------------------------------------------------------------
// 6. 📄 Pages — 규격 문서 §8
// ---------------------------------------------------------------------------

/** 구분선 페이지 이름 — Figma 페이지 목록에서 그룹을 가르는 하이픈 라인 */
const DIVIDER_NAME = '---------';

/**
 * 구분선 페이지를 **새로 만든다**(내용 없음, 이름만). 이름이 모두 '---------' 로 같아 이름으로
 * 재사용/식별할 수 없으므로 매번 fresh 로 만들고, 옛 구분선은 재생성 시 tdsDoc 표식 기반 정리
 * (삭제 후 재생성)가 걷어낸다.
 */
async function createDivider(): Promise<PageNode> {
  const page = figma.createPage();
  page.name = DIVIDER_NAME;
  page.setPluginData('tdsDoc', '1');
  await page.loadAsync();
  return page;
}

/**
 * 화면 한 장의 DS 스킨 스켈레톤 — 앱 셸(사이드바 + 헤더 + 콘텐츠 카드)을 토큰으로 그린다.
 * 빈 아트보드 대신 '앱처럼 보이는' IA 골격을 준다(픽셀 재현이 아니라 구조). 모든 크기는 GRID 배수.
 */
function screenSkeleton(ctx: DocContext, meta: TdsPageMeta): FrameNode {
  const SIDEBAR_W = GRID * 30; // 240
  const MAIN_W = ARTBOARD_W - SIDEBAR_W; // 1200
  const PAD = GRID * 4; // 32

  const board = figma.createFrame();
  board.name =
    meta.name !== undefined && meta.name.length > 0 ? `${meta.name} — ${meta.id}` : meta.id;
  board.layoutMode = 'HORIZONTAL';
  board.primaryAxisSizingMode = 'FIXED';
  board.counterAxisSizingMode = 'FIXED';
  board.resize(ARTBOARD_W, ARTBOARD_H);
  board.itemSpacing = 0;
  board.fills = [boundSolid(ctx.chrome.surfaceDefault)];
  board.strokes = [boundSolid(ctx.chrome.borderDefault)];
  board.strokeWeight = HAIRLINE;
  board.strokeAlign = 'INSIDE';
  board.clipsContent = true;

  // 사이드바 — 고정 폭, nav 자리표시 바(현재 메뉴는 accent)
  const sidebar = stack('VERTICAL', GRID * 2, 'Sidebar');
  sidebar.primaryAxisSizingMode = 'FIXED';
  sidebar.counterAxisSizingMode = 'FIXED';
  sidebar.resize(SIDEBAR_W, ARTBOARD_H);
  sidebar.paddingTop = PAD;
  sidebar.paddingBottom = PAD;
  sidebar.paddingLeft = GRID * 3;
  sidebar.paddingRight = GRID * 3;
  sidebar.fills = [boundSolid(ctx.chrome.surfaceRaised)];
  sidebar.strokes = [boundSolid(ctx.chrome.borderDefault)];
  sidebar.strokeWeight = HAIRLINE;
  sidebar.strokeAlign = 'INSIDE';
  for (let i = 0; i < 8; i += 1) {
    const bar = figma.createFrame();
    bar.name = 'nav-item';
    bar.resize(SIDEBAR_W - GRID * 6, GRID * 3);
    bar.cornerRadius = SUB;
    bar.fills = [boundSolid(i === 1 ? ctx.chrome.accent : ctx.chrome.surfaceDefault)];
    sidebar.appendChild(bar);
  }
  board.appendChild(sidebar);

  // 메인 — 고정 폭, 헤더(제목·경로) + 콘텐츠 카드 자리표시
  const main = stack('VERTICAL', GRID * 3, 'Main');
  main.primaryAxisSizingMode = 'FIXED';
  main.counterAxisSizingMode = 'FIXED';
  main.resize(MAIN_W, ARTBOARD_H);
  main.paddingTop = PAD;
  main.paddingBottom = PAD;
  main.paddingLeft = PAD;
  main.paddingRight = PAD;
  const heading = meta.name !== undefined && meta.name.length > 0 ? meta.name : meta.id;
  main.appendChild(makeText(ctx, heading, { size: TYPE.section, font: ctx.fonts.bold }));
  main.appendChild(makeText(ctx, meta.id, { size: TYPE.body, colorVar: ctx.chrome.textMuted }));
  if (meta.description !== undefined && meta.description.length > 0) {
    main.appendChild(
      makeText(ctx, meta.description, { size: TYPE.body, colorVar: ctx.chrome.textMuted }),
    );
  }
  for (let i = 0; i < 3; i += 1) {
    const card = figma.createFrame();
    card.name = `Card ${String(i + 1)}`;
    card.resize(MAIN_W - PAD * 2, GRID * 12);
    card.cornerRadius = GRID;
    card.fills = [boundSolid(ctx.chrome.surfaceRaised)];
    card.strokes = [boundSolid(ctx.chrome.borderDefault)];
    card.strokeWeight = HAIRLINE;
    card.strokeAlign = 'INSIDE';
    main.appendChild(card);
  }
  board.appendChild(main);

  return board;
}

/**
 * 화면 한 장의 **실제 스크린샷** 아트보드 — meta.image 가 있으면 실물 렌더로 채운다(1:1).
 * 바이트는 cache-images 로 미리 createImage 됐다. 캐시에 없으면 스켈레톤으로 안전 폴백한다.
 */
function screenImage(ctx: DocContext, meta: TdsPageMeta): FrameNode {
  const img = meta.image;
  if (!img) return screenSkeleton(ctx, meta);
  const hash = ctx.imageHash.get(img.key);
  if (!hash) {
    ctx.log.push(`[페이지 이미지 미캐시] ${meta.id} (${img.key}) — 스켈레톤 대체`);
    return screenSkeleton(ctx, meta);
  }
  const frame = figma.createFrame();
  frame.name =
    meta.name !== undefined && meta.name.length > 0 ? `${meta.name} — ${meta.id}` : meta.id;
  frame.resize(Math.max(1, Math.round(img.w)), Math.max(1, Math.round(img.h)));
  frame.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];
  frame.strokes = [boundSolid(ctx.chrome.borderDefault)];
  frame.strokeWeight = HAIRLINE;
  frame.strokeAlign = 'INSIDE';
  frame.clipsContent = true;
  return frame;
}

/** 한 메뉴(= nav 가지)의 화면들을 한 Figma 페이지에 나열한다 — 실사가 있으면 실물, 없으면 DS 스켈레톤 */
function buildMenuPage(
  ctx: DocContext,
  page: PageNode,
  menu: string,
  screens: readonly TdsPageMeta[],
): void {
  const root = buildRoot(ctx, page);
  const shots = screens.filter((s) => s.image).length;
  root.appendChild(
    sectionHeader(
      ctx,
      `${menu} — 화면 ${String(screens.length)}개${shots > 0 ? ` (실사 ${String(shots)})` : ''}`,
    ),
  );
  for (const meta of screens) {
    const label =
      meta.name !== undefined && meta.name.length > 0 ? `${meta.name}  ·  ${meta.id}` : meta.id;
    const block = stack('VERTICAL', GRID * 2, `Screen — ${meta.id}`);
    block.appendChild(makeText(ctx, label, { size: TYPE.group, font: ctx.fonts.medium }));
    block.appendChild(meta.image ? screenImage(ctx, meta) : screenSkeleton(ctx, meta));
    root.appendChild(block);
  }
  ctx.log.push(`Pages — ${menu}: 화면 ${String(screens.length)}개 (실사 ${String(shots)})`);
}

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

    // 1440 데스크톱 아트보드 — 내용은 비워 둔다 (화면 조립은 Figma UI 소유)
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

/**
 * 기능 카테고리 표준 순서 — main.ts 의 COMPONENT_CATEGORY_ORDER 와 반드시 같아야 한다.
 * 페이지 base 는 `🧩 Components — <카테고리>` 규칙(main.ts categoryPageName)과 1:1.
 */
const COMPONENT_CATEGORIES = [
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
const COMPONENT_PAGE_ORDER = COMPONENT_CATEGORIES.map((c) => `🧩 Components — ${c}`);
/** 페이지 base → 계약 category */
const COMPONENT_PAGE_CATEGORY: Record<string, string> = {};
for (const c of COMPONENT_CATEGORIES) COMPONENT_PAGE_CATEGORY[`🧩 Components — ${c}`] = c;
/** sync-components 가 INSTANCE_SWAP 기본값용으로 만든 더미 — 정렬에서 제외한다 */
const SWAP_PLACEHOLDER_NAME = '↔ Swap Placeholder';

/** 속성 타입 = 용도. 문서에서 이 순서·이 라벨로 묶어 보여 준다. */
const PROP_TYPE_ORDER = ['VARIANT', 'BOOLEAN', 'TEXT', 'INSTANCE_SWAP'];
const PROP_TYPE_LABEL: Record<string, string> = {
  VARIANT: '변형 · Variant',
  BOOLEAN: '불리언 · Boolean',
  TEXT: '텍스트 · Text',
  INSTANCE_SWAP: '인스턴스 교체 · Instance swap',
};

/** 토큰 용도 분류 — 경로 접두어로 가른다(색상/타이포/간격/모서리/그림자) */
const TOKEN_GROUPS: Array<{ label: string; prefix: string }> = [
  { label: '색상 · Color', prefix: 'color.' },
  { label: '타이포그래피 · Typography', prefix: 'typography.' },
  { label: '간격 · Spacing', prefix: 'space.' },
  { label: '모서리 · Radius', prefix: 'radius.' },
  { label: '그림자 · Shadow', prefix: 'shadow.' },
];
const TOKEN_OTHER = '기타 · Other';
function tokenGroupLabel(path: string): string {
  for (const g of TOKEN_GROUPS) if (path.indexOf(g.prefix) === 0) return g.label;
  return TOKEN_OTHER;
}

const TOKEN_COL_W = { key: GRID * 20, path: GRID * 42, variable: GRID * 42, status: GRID * 12 };

function tokenRow(
  ctx: DocContext,
  cells: { key: string; path: string; variable: string; status: string },
  font: FontName,
  muted: boolean,
): FrameNode {
  const row = stack('HORIZONTAL', GRID * 2, 'Token Row');
  const cell = (text: string, width: number): TextNode =>
    makeText(ctx, text, {
      size: TYPE.caption,
      font,
      width,
      ...(muted ? { colorVar: ctx.chrome.textMuted } : {}),
    });
  row.appendChild(cell(cells.key, TOKEN_COL_W.key));
  row.appendChild(cell(cells.path, TOKEN_COL_W.path));
  row.appendChild(cell(cells.variable, TOKEN_COL_W.variable));
  row.appendChild(cell(cells.status, TOKEN_COL_W.status));
  return row;
}

// ---------------------------------------------------------------------------
// 오너 정본 분류표 체크리스트 — 카테고리 페이지 상단(안내문 다음, 시트 앞)
// ---------------------------------------------------------------------------

/** 체크리스트 열 폭 — tokenRow/TOKEN_COL_W 와 같은 방식(합계 ≤ CONTENT_W) */
const TAXO_COL_W = { item: GRID * 60, status: GRID * 20, component: GRID * 54 };

const TAXO_DONE = '✅ 구현';
const TAXO_TODO = '⬜ 미구현';

/** 알 수 없는 payload 를 방어적으로 검증한다 — 형식이 어긋나면 조용히 버린다(문서 생성은 계속) */
function normalizeTaxonomy(raw: unknown): TdsTaxonomyCategory[] {
  if (!Array.isArray(raw)) return [];
  const out: TdsTaxonomyCategory[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const rec = entry as Record<string, unknown>;
    if (typeof rec.name !== 'string' || rec.name.length === 0) continue;
    const items: TdsTaxonomyItem[] = [];
    if (Array.isArray(rec.items)) {
      for (const it of rec.items) {
        if (typeof it !== 'object' || it === null) continue;
        const ir = it as Record<string, unknown>;
        if (typeof ir.name !== 'string' || ir.name.length === 0) continue;
        items.push({
          key: typeof ir.key === 'string' ? ir.key : '',
          name: ir.name,
          component:
            typeof ir.component === 'string' && ir.component.length > 0 ? ir.component : null,
        });
      }
    }
    const extras: string[] = Array.isArray(rec.extras)
      ? rec.extras.filter((e): e is string => typeof e === 'string' && e.length > 0)
      : [];
    out.push({
      no: typeof rec.no === 'number' && isFinite(rec.no) ? rec.no : 0,
      name: rec.name,
      key: typeof rec.key === 'string' ? rec.key : '',
      label: typeof rec.label === 'string' ? rec.label : '',
      ...(typeof rec.description === 'string' ? { description: rec.description } : {}),
      items,
      extras,
    });
  }
  return out;
}

/** 오너 번호 2자리 zero-pad — 0(미지정)이면 빈 문자열 */
function taxoNo(no: number): string {
  if (no <= 0) return '';
  return no < 10 ? `0${String(no)}` : String(no);
}

/** 카테고리 페이지 섹션 헤더 문구 — `01. Actions (액션) — 컴포넌트 3개` */
function categoryHeading(
  category: string,
  taxo: TdsTaxonomyCategory | null,
  count: number,
): string {
  const tail = `컴포넌트 ${String(count)}개`;
  if (!taxo) return `${category} — ${tail}`;
  const no = taxoNo(taxo.no);
  const prefix = no.length > 0 ? `${no}. ` : '';
  const label = taxo.label.length > 0 ? ` (${taxo.label})` : '';
  return `${prefix}${taxo.name}${label} — ${tail}`;
}

function taxoRow(
  ctx: DocContext,
  cells: { item: string; status: string; component: string },
  font: FontName,
  muted: boolean,
): FrameNode {
  const row = stack('HORIZONTAL', GRID * 2, 'Taxonomy Row');
  const cell = (text: string, width: number): TextNode =>
    makeText(ctx, text, {
      size: TYPE.caption,
      font,
      width,
      ...(muted ? { colorVar: ctx.chrome.textMuted } : {}),
    });
  row.appendChild(cell(cells.item, TAXO_COL_W.item));
  row.appendChild(cell(cells.status, TAXO_COL_W.status));
  row.appendChild(cell(cells.component, TAXO_COL_W.component));
  return row;
}

/**
 * 오너 정본 분류표 체크리스트 한 벌 — 헤더행 + 정본 항목 행 + 요약 + (있으면) 프로젝트 고유 목록.
 * 색은 전부 ctx.chrome.* Variable 바인딩(하드코딩 색 없음).
 */
function taxonomyChecklist(ctx: DocContext, taxo: TdsTaxonomyCategory): FrameNode {
  const block = stack('VERTICAL', GRID * 2, `Taxonomy — ${taxo.name}`);

  const done = taxo.items.filter((i) => typeof i.component === 'string' && i.component.length > 0);
  const extras = taxo.extras ?? [];

  block.appendChild(groupHeader(ctx, '정본 분류표 체크리스트 · Owner taxonomy'));
  block.appendChild(
    makeText(
      ctx,
      `정본 ${String(taxo.items.length)}개 · 구현 ${String(done.length)}개 · 미구현 ${String(
        taxo.items.length - done.length,
      )}개 · 프로젝트 고유 ${String(extras.length)}개`,
      { size: TYPE.body, colorVar: ctx.chrome.textMuted },
    ),
  );

  const table = stack('VERTICAL', SUB, 'Taxonomy Table');
  table.appendChild(
    taxoRow(ctx, { item: '항목', status: '상태', component: '컴포넌트' }, ctx.fonts.medium, true),
  );
  table.appendChild(hairline(ctx, CONTENT_W));
  for (const item of taxo.items) {
    const impl = typeof item.component === 'string' && item.component.length > 0;
    table.appendChild(
      taxoRow(
        ctx,
        {
          item: item.name,
          status: impl ? TAXO_DONE : TAXO_TODO,
          component: impl ? (item.component ?? '') : '—',
        },
        ctx.fonts.regular,
        !impl, // 미구현 행만 흐리게 — 구현된 행은 기본 텍스트색
      ),
    );
  }
  block.appendChild(table);

  if (extras.length > 0) {
    const extraBlock = stack('VERTICAL', SUB, 'Taxonomy Extras');
    extraBlock.appendChild(groupHeader(ctx, '프로젝트 고유 · Project-specific'));
    extraBlock.appendChild(
      makeText(ctx, '정본 분류표 밖에서 이 프로젝트가 추가로 갖고 있는 컴포넌트입니다.', {
        size: TYPE.caption,
        colorVar: ctx.chrome.textMuted,
        width: CONTENT_W,
      }),
    );
    for (const name of extras) {
      extraBlock.appendChild(
        taxoRow(ctx, { item: name, status: TAXO_DONE, component: name }, ctx.fonts.regular, false),
      );
    }
    block.appendChild(extraBlock);
  }

  return block;
}

/** 케이스 카드 한 장 — 변형 이름 + 그 변형의 실제 인스턴스. 폭이 넘치면 비율 유지 축소. */
function caseCard(ctx: DocContext, variant: ComponentNode): FrameNode | null {
  let inst: InstanceNode;
  try {
    inst = variant.createInstance();
  } catch (error) {
    const m = error instanceof Error ? error.message : String(error);
    ctx.log.push(`[케이스 인스턴스 실패] ${variant.name}: ${m}`);
    return null;
  }
  const MAX_W = GRID * 62; // 496 — 카드 한 장 최대 폭
  if (inst.width > MAX_W && inst.width > 0) {
    const scale = MAX_W / inst.width;
    inst.resize(MAX_W, Math.max(1, Math.round(inst.height * scale)));
  }
  const card = stack('VERTICAL', GRID, `Case — ${variant.name}`);
  card.paddingTop = GRID * 2;
  card.paddingBottom = GRID * 2;
  card.paddingLeft = GRID * 2;
  card.paddingRight = GRID * 2;
  card.cornerRadius = GRID;
  card.fills = [boundSolid(ctx.chrome.surfaceRaised)];
  card.strokes = [boundSolid(ctx.chrome.borderDefault)];
  card.strokeWeight = HAIRLINE;
  card.strokeAlign = 'INSIDE';
  card.appendChild(makeText(ctx, variant.name, { size: TYPE.caption, font: ctx.fonts.medium }));
  card.appendChild(inst);
  return card;
}

/**
 * 컴포넌트 한 개의 문서 시트 — **용도별로 묶어** 보여 준다(실물 세트는 같은 페이지 아래에 따로).
 *  - 속성: 변형 / 불리언 / 텍스트 / 인스턴스 교체 로 그룹, 각 그룹마다 표
 *  - 토큰: 색상 / 타이포 / 간격 / 모서리 / 그림자 로 그룹, 키·토큰·Variable·상태 4열 표
 */
function componentSheet(
  ctx: DocContext,
  spec: DocComponentSpec,
  real: SceneNode | null,
): FrameNode {
  const section = stack('VERTICAL', CARD_GAP, `Component — ${spec.name}`);
  section.appendChild(sectionHeader(ctx, `${spec.name} v${spec.version}`));

  // --- 실제 Component Set 을 시트 안에 넣는다 — 문서에서 바로 보이도록(오토레이아웃이라 겹치지 않음) ---
  if (real) {
    try {
      section.appendChild(groupHeader(ctx, '컴포넌트 · Component Set'));
      section.appendChild(real); // 페이지 최상위 → 이 시트 안으로 재부모화
    } catch (error) {
      const m = error instanceof Error ? error.message : String(error);
      ctx.log.push(`[세트 삽입 실패] ${spec.name}: ${m} — 페이지에 그대로 둡니다`);
    }
  }

  // --- 케이스별 카드 — 변형(정상/에러/취소 …) 하나하나를 독립 카드로 분리한다 ---
  if (real && real.type === 'COMPONENT_SET') {
    const variants = real.children.filter((c): c is ComponentNode => c.type === 'COMPONENT');
    if (variants.length > 0) {
      const cases = stack('VERTICAL', GRID * 2, 'Cases');
      cases.appendChild(groupHeader(ctx, `케이스 · Cases — ${String(variants.length)}개`));
      const grid = wrapRow(`Cases — ${spec.name}`);
      for (const v of variants) {
        const card = caseCard(ctx, v);
        if (card) grid.appendChild(card);
      }
      cases.appendChild(grid);
      section.appendChild(cases);
    }
  }

  // --- 속성: 타입(용도)별 그룹 ---
  const byType = new Map<string, DocPropertyRow[]>();
  for (const p of spec.properties) {
    const t = p.type.length > 0 ? p.type : TOKEN_OTHER;
    const bucket = byType.get(t);
    if (bucket) bucket.push(p);
    else byType.set(t, [p]);
  }
  if (byType.size > 0) {
    const types = [
      ...PROP_TYPE_ORDER.filter((t) => byType.has(t)),
      ...[...byType.keys()].filter((t) => !PROP_TYPE_ORDER.includes(t)),
    ];
    const props = stack('VERTICAL', GRID * 2, 'Properties');
    props.appendChild(groupHeader(ctx, `속성 — ${String(spec.properties.length)}개`));
    for (const t of types) {
      const rows = byType.get(t) ?? [];
      const block = stack('VERTICAL', GRID, `Props — ${t}`);
      block.appendChild(
        makeText(ctx, `${PROP_TYPE_LABEL[t] ?? t}  (${String(rows.length)})`, {
          size: TYPE.caption,
          font: ctx.fonts.medium,
        }),
      );
      block.appendChild(
        tableRow(
          ctx,
          { name: 'Property', type: 'Type', values: 'Values', defaultValue: 'Default' },
          ctx.fonts.bold,
        ),
      );
      block.appendChild(hairline(ctx, CONTENT_W));
      for (const r of rows) block.appendChild(tableRow(ctx, r, ctx.fonts.regular));
      props.appendChild(block);
    }
    section.appendChild(props);
  }

  // --- 토큰 바인딩: 용도별 그룹 + 4열 표 ---
  const entries = Object.entries(spec.tokens);
  if (entries.length > 0) {
    const byGroup = new Map<string, Array<[string, string]>>();
    for (const entry of entries) {
      const label = tokenGroupLabel(entry[1]);
      const bucket = byGroup.get(label);
      if (bucket) bucket.push(entry);
      else byGroup.set(label, [entry]);
    }
    const tokens = stack('VERTICAL', GRID * 2, 'Tokens');
    tokens.appendChild(groupHeader(ctx, `토큰 바인딩 — ${String(entries.length)}개`));
    for (const label of [...TOKEN_GROUPS.map((g) => g.label), TOKEN_OTHER]) {
      const rows = byGroup.get(label);
      if (!rows || rows.length === 0) continue;
      const block = stack('VERTICAL', GRID, `Tokens — ${label}`);
      block.appendChild(
        makeText(ctx, `${label}  (${String(rows.length)})`, {
          size: TYPE.caption,
          font: ctx.fonts.medium,
        }),
      );
      block.appendChild(
        tokenRow(
          ctx,
          { key: '키', path: '토큰', variable: 'Variable', status: '상태' },
          ctx.fonts.bold,
          false,
        ),
      );
      block.appendChild(hairline(ctx, CONTENT_W));
      for (const [key, path] of rows) {
        const varName = path.split('.').join('/');
        const exists =
          ctx.vars.has(varName) || [...ctx.vars.keys()].some((n) => n.startsWith(`${varName}/`));
        if (!exists) warn(ctx, `${spec.name}.tokens.${key}: Variable 미생성 — ${varName}`);
        block.appendChild(
          tokenRow(
            ctx,
            { key, path, variable: varName, status: exists ? '연결됨' : '미생성' },
            ctx.fonts.regular,
            true,
          ),
        );
      }
      tokens.appendChild(block);
    }
    section.appendChild(tokens);
  }
  return section;
}

/**
 * 카테고리 페이지 = TDS Doc 문서(속성 표·토큰) **위**, 실제 Component Set **아래**.
 * 세트는 sync-components 가 이미 만든 것 — 절대 지우지 않고 위치만 정렬한다.
 * 재실행 시 이전 문서 프레임(TDS Doc)만 지우고 새로 그린다.
 */
function buildComponentCategoryPage(
  ctx: DocContext,
  page: PageNode,
  category: string,
  specs: DocComponentSpec[],
  taxo: TdsTaxonomyCategory | null,
): void {
  // 이전 문서 프레임을 지우기 **전에** 실제 컴포넌트를 걷어 둔다 — 지난 실행에서 시트 안에 넣어 뒀다면
  // 프레임과 함께 지워질 수 있기 때문. 먼저 최상위로 꺼내 놓고, 그다음 옛 프레임을 제거한다.
  const realByName = new Map<string, SceneNode>();
  const collect = (node: SceneNode): void => {
    if (node.name === SWAP_PLACEHOLDER_NAME) return;
    if (node.type === 'COMPONENT_SET') realByName.set(node.name, node);
    else if (node.type === 'COMPONENT' && node.parent?.type !== 'COMPONENT_SET')
      realByName.set(node.name, node);
  };
  for (const child of page.children) {
    if (child.name === ROOT_FRAME_NAME && child.type === 'FRAME') {
      const inners = child.findAll((n) => n.type === 'COMPONENT_SET' || n.type === 'COMPONENT');
      for (const inner of inners) collect(inner);
    } else {
      collect(child);
    }
  }
  for (const node of realByName.values()) page.appendChild(node); // 최상위로 복귀(프레임 삭제로부터 보호)
  for (const child of [...page.children]) {
    if (child.name === ROOT_FRAME_NAME) child.remove(); // 문서 프레임만 교체 — 컴포넌트는 이미 대피
  }

  const group = specs.filter(
    (s) => (s.category.length > 0 ? s.category : 'Utilities') === category,
  );
  const root = buildRoot(ctx, page);
  root.x = 0;
  root.y = 0;
  root.appendChild(sectionHeader(ctx, categoryHeading(category, taxo, group.length)));
  if (taxo && taxo.description !== undefined && taxo.description.length > 0) {
    root.appendChild(
      makeText(ctx, taxo.description, {
        size: TYPE.body,
        colorVar: ctx.chrome.textMuted,
        width: CONTENT_W,
      }),
    );
  }
  root.appendChild(
    makeText(
      ctx,
      group.length > 0
        ? '각 시트 안의 Component Set 이 실제 컴포넌트입니다 — 변형축·속성은 계약 원천.'
        : `아직 이 카테고리의 컴포넌트가 없습니다 — 계약에 "category": "${category}" 를 지정하면 여기에 자동으로 나타납니다.`,
      {
        size: TYPE.body,
        colorVar: ctx.chrome.textMuted,
      },
    ),
  );
  // 오너 정본 분류표 체크리스트 — taxonomy 가 없으면 통째로 생략(기존 동작 유지)
  if (taxo) root.appendChild(taxonomyChecklist(ctx, taxo));
  let embedded = 0;
  for (const spec of group) {
    const real = realByName.get(spec.name) ?? null;
    root.appendChild(componentSheet(ctx, spec, real));
    // 삽입 성공 판정은 **실제 부모**로 한다 — Figma 가 프레임 안 Component Set 을 거부하면
    // 여전히 page 의 자식이므로 잔여 목록에 남겨 아래쪽에 정렬(겹침 방지)한다.
    if (real && real.parent !== page) {
      realByName.delete(spec.name);
      embedded += 1;
    }
  }

  // 시트에 못 붙인 나머지(계약에 없는 세트 등)는 문서 아래에 한 줄로 둔다 — 겹치지 않게
  let x = 0;
  const top = root.y + root.height + SECTION_GAP;
  for (const leftover of realByName.values()) {
    leftover.x = x;
    leftover.y = top;
    x += leftover.width + SECTION_GAP;
  }
  ctx.log.push(
    `${page.name}: 시트 ${String(group.length)}개 · 세트 삽입 ${String(embedded)}개 · 잔여 ${String(realByName.size)}개`,
  );
}

/**
 * sync-components 가 만든 **실제 Component Set 페이지**를 문서 순서에 편입한다(내용은 건드리지 않는다).
 * 이 페이지들은 tdsDoc 표식이 없어 문서 정리에 삭제되지 않는다 — 여기서는 위치·번호만 관리한다.
 */
async function adoptComponentCategoryPages(ctx: DocContext): Promise<PageNode[]> {
  const byBase = new Map<string, PageNode>();
  for (const p of figma.root.children) {
    const base = p.getPluginData('tdsBase');
    if (base.startsWith('🧩 Components — ')) byBase.set(base, p);
  }
  const ordered: PageNode[] = [];
  for (const base of COMPONENT_PAGE_ORDER) {
    const p = byBase.get(base);
    if (p) {
      await p.loadAsync();
      ordered.push(p);
      byBase.delete(base);
    }
  }
  // 규정 외 레벨(Other 등)도 뒤에 붙인다 — 누락 없이
  for (const p of byBase.values()) {
    await p.loadAsync();
    ordered.push(p);
  }
  ctx.log.push(
    ordered.length > 0
      ? `컴포넌트 카테고리 페이지 편입: ${String(ordered.length)}개 (실제 Component Set)`
      : '[경고] 컴포넌트 카테고리 페이지 없음 — ② Component Set 동기화를 먼저 실행하세요',
  );
  return ordered;
}

export async function generateTdsDoc(
  payload: TdsDocPayload,
  imageHash: Map<string, string>,
): Promise<string[]> {
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

  // 문서 기본 폰트를 먼저 로드한다 — figma.createText() 가 만드는 노드는 **문서 기본 폰트**로
  // 시작하는데(문서마다 다르다: Inter·Pretendard SemiBold 등), 그게 미로드면 characters/fontName
  // 설정이나 appendChild 가 "unloaded font …" 로 실패한다. 프로브 노드로 한 번 로드해 둔다.
  const probe = figma.createText();
  try {
    if (probe.fontName !== figma.mixed) {
      await figma.loadFontAsync(probe.fontName);
    }
  } catch {
    // 기본 폰트를 못 불러와도 아래에서 Inter 로 강제하므로 치명적이지 않다
  }
  probe.remove();

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
    imageHash,
  };

  // 파운데이션 5장 — 이름 매칭 멱등(내용을 비우고 재생성). 정렬·정리는 이름이 아니라 **페이지 참조**로
  // 한다: 구분선은 이름이 전부 '---------' 라 이름으로 구별되지 않기 때문이다.
  const coverP = await ensurePage(PAGE_NAMES.cover);
  buildCover(ctx, coverP, payload);
  const colorsP = await ensurePage(PAGE_NAMES.colors);
  buildColorsPage(ctx, colorsP, payload);
  const typoP = await ensurePage(PAGE_NAMES.typography);
  await buildTypographyPage(ctx, typoP, payload);
  const spacingP = await ensurePage(PAGE_NAMES.spacing);
  buildSpacingPage(ctx, spacingP, payload);

  // 🧩 Components — 스크린샷 페이지(클립보드)를 만들지 않는다. 대신 sync-components 가 만든
  // **실제 Component Set 카테고리 페이지**(🧩 Components — Atoms/Molecules/Organisms)를 순서에 편입한다.
  const componentPages = await adoptComponentCategoryPages(ctx);
  // 각 카테고리 페이지에 TDS Doc 문서(속성 표·토큰 바인딩)를 얹고, 실제 세트를 그 아래로 정렬한다.
  const docSpecs = (payload.components ?? [])
    .map((raw) => normalizeComponentSpec(raw))
    .filter((s): s is DocComponentSpec => s !== null);
  // 오너 정본 분류표(있을 때만) — 카테고리 영문명으로 매칭한다. 없으면 빈 맵 → 체크리스트 생략.
  const taxoByName = new Map<string, TdsTaxonomyCategory>();
  for (const t of normalizeTaxonomy(payload.taxonomy)) taxoByName.set(t.name, t);
  if (taxoByName.size > 0) {
    ctx.log.push(`정본 분류표 적재: ${String(taxoByName.size)}개 카테고리`);
  }
  for (const cp of componentPages) {
    const cat = COMPONENT_PAGE_CATEGORY[cp.getPluginData('tdsBase')] ?? 'Utilities';
    buildComponentCategoryPage(ctx, cp, cat, docSpecs, taxoByName.get(cat) ?? null);
  }

  const orderedPages: PageNode[] = [coverP, colorsP, typoP, spacingP, ...componentPages];

  // Pages — 앱의 nav 구조대로 **메뉴별 페이지**로 쪼갠다. 각 섹션(일반 관리·비즈니스·…) 앞에
  // '---------' 구분선 페이지를 하나씩 둔다(라벨 없음) — Figma 페이지 목록이 앱 IA 처럼 그룹진다.
  const metas = payload.pages ?? [];
  if (metas.length > 0) {
    // 섹션·메뉴 순서를 payload 등장 순서 그대로 보존한다(nav 순서 = 화면 순서).
    interface MenuGroup {
      menu: string;
      screens: TdsPageMeta[];
    }
    interface SectionGroup {
      title: string;
      menus: MenuGroup[];
    }
    const sections: SectionGroup[] = [];
    // 메뉴는 **전역으로** 유일해야 한다. 같은 메뉴 라벨이 두 섹션에 나오면 ensurePage 가 같은 페이지를
    // 돌려주는데, 두 번 만들면 앞 섹션의 화면이 지워지고 orderedPages 에 중복 들어가 순번까지 어긋난다.
    const menuByTitle = new Map<string, MenuGroup>();
    for (const meta of metas) {
      const secTitle = meta.section ?? '기타';
      const menuTitle = meta.menu ?? meta.name ?? meta.id;
      let sec = sections.find((s) => s.title === secTitle);
      if (!sec) {
        sec = { title: secTitle, menus: [] };
        sections.push(sec);
      }
      let group = menuByTitle.get(menuTitle);
      if (!group) {
        group = { menu: menuTitle, screens: [] };
        menuByTitle.set(menuTitle, group);
        sec.menus.push(group); // 처음 등장한 섹션에만 소속시킨다
      }
      group.screens.push(meta);
    }

    for (const sec of sections) {
      orderedPages.push(await createDivider()); // 섹션 앞 '---------' (라벨 없이)
      for (const group of sec.menus) {
        const p = await ensurePage(`📄 ${group.menu}`);
        buildMenuPage(ctx, p, group.menu, group.screens);
        orderedPages.push(p);
      }
    }
  } else {
    // 메타 없음 — 기존 단일 안내 페이지 유지(generated/tds-pages.json 을 로드하라고 안내)
    const p = await ensurePage(PAGE_NAMES.pages);
    buildPagesPage(ctx, p, payload);
    orderedPages.push(p);
  }

  // 이전 생성물 삭제 — 이번에 만든 페이지(참조 집합)에 없는데 **우리가 과거에 만든**(tdsDoc 표식)
  // 또는 구버전 단일 '📄 Pages' 는 지운다('있으면 삭제하고 다시'). orderedPages 가 남으므로
  // Figma 의 '≥1 페이지' 제약은 항상 지켜진다. 사용자가 만든(표식 없는) 페이지는 건드리지 않는다.
  const keep = new Set<PageNode>(orderedPages);
  // documentAccess: dynamic-page — 동기 currentPage 대입 금지. 삭제 대상이 현재 페이지가 되지 않게 커버로.
  await figma.setCurrentPageAsync(coverP);
  let removed = 0;
  // 삭제 기준은 **오직 우리 표식(tdsDoc)** — 이름으로 지우지 않는다(이름은 순번 접두어로 바뀌고,
  // 사용자가 만든 동명 페이지를 오인 삭제할 수 있다). 게다가 실제 컴포넌트가 든 페이지는 절대 지우지
  // 않는다: 구버전에서 Component Set 이 문서 페이지 위에 만들어졌을 수 있어 작업물 손실이 된다.
  let preserved = 0;
  for (const p of [...figma.root.children]) {
    if (p.getPluginData('tdsDoc') !== '1' || keep.has(p)) continue;
    await p.loadAsync();
    if (p.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).length > 0) {
      p.setPluginData('tdsDoc', ''); // 표식을 떼어 사용자 페이지로 넘긴다(다음 실행에도 안전)
      log.push(`[보존] ${p.name} — 컴포넌트가 들어 있어 삭제하지 않습니다`);
      preserved += 1;
      continue;
    }
    p.remove();
    removed += 1;
  }
  if (removed > 0) log.push(`이전 생성물 정리 — 페이지 ${String(removed)}개 삭제`);
  if (preserved > 0)
    log.push(`보존 ${String(preserved)}개 — 컴포넌트가 있는 옛 페이지는 수동 확인 후 정리하세요`);

  // 참조 순서대로 파일 맨 앞에 정렬(목록 밖 사용자 페이지는 건드리지 않음)
  orderedPages.forEach((page, index) => figma.root.insertChild(index, page));

  // 순번 자동 부여 — 구분선('---------')은 건너뛰고 실제 페이지만 1,2,3… 으로 매긴다.
  // 표시명만 바꾸고 식별은 tdsBase 로 하므로 다음 실행에도 같은 페이지를 찾아 멱등하다.
  let seq = 0;
  for (const page of orderedPages) {
    const base = page.getPluginData('tdsBase');
    if (base.length === 0) continue; // 구분선 등 — 번호 없음
    seq += 1;
    page.name = `${String(seq)}. ${base}`;
  }

  log.push(
    `TDS 문서 생성 완료 — 페이지 ${String(orderedPages.length)}개 (순번 ${String(seq)} · 컴포넌트 카테고리 + 메뉴별 분리 + '---------' 구분선)`,
  );
  return log;
}
