/**
 * 공용 유틸 — 계약 타입 정의, 계약/토큰 로딩, DTCG 플래튼, 문자열 헬퍼.
 * 모든 generator와 validator가 이 모듈을 공유한다 (로직 중복 금지).
 */
import fs from 'node:fs';
import path from 'node:path';
import { CONTRACTS_DIR, TOKENS_JSON_PATH } from './paths';

// ---------------------------------------------------------------------------
// 계약(contract) 타입 — contracts/schemas/component.v1.json 과 1:1 대응
// ---------------------------------------------------------------------------

export type ComponentLevel = 'atom' | 'molecule' | 'organism' | 'template' | 'page';

/** 기능 축 — level(원자성 축)과 직교한다. CATEGORY_ORDER 가 표시/정렬 순서의 정본이다. */
export type ComponentCategory =
  | 'Actions'
  | 'Inputs'
  | 'Selection'
  | 'Navigation'
  | 'Feedback'
  | 'Dialogs & Overlays'
  | 'Data Display'
  | 'Media'
  | 'Layout'
  | 'Forms'
  | 'Lists'
  | 'Tables'
  | 'Authentication'
  | 'Commerce'
  | 'Communication'
  | 'File'
  | 'Maps'
  | 'Charts'
  | 'Utilities'
  | 'Mobile'
  | 'AI'
  | 'Korean Service'
  | 'Foundation';

/**
 * 표시/정렬 순서의 정본(23 모듈). 아래 4곳이 이 순서와 반드시 일치해야 한다:
 *  - contracts/schemas/component.v1.json  (category enum)
 *  - packages/ui/.storybook/preview.ts    (storySort.order)
 *  - tools/figma-plugin/src/main.ts       (COMPONENT_CATEGORY_ORDER — 페이지 생성)
 *  - tools/figma-plugin/src/tds-doc.ts    (COMPONENT_CATEGORIES — 페이지 정렬)
 */
export const CATEGORY_ORDER: readonly ComponentCategory[] = [
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
] as const;

export type PropType =
  | 'enum'
  | 'boolean'
  | 'string'
  | 'number'
  | 'slot'
  | 'node'
  | 'function'
  // 데이터 기반 컴포넌트(테이블 rows, 차트 points)의 데이터 prop — Figma 대응 없음 (ADR-0003)
  | 'array'
  | 'object';

export interface ContractProp {
  type: PropType;
  values?: string[];
  default?: unknown;
  required?: boolean;
  figmaProperty?: string;
  accepts?: string[];
  /** array/object prop 의 TS 타입 표현 (예: '{ id: string; label: string }') */
  itemShape?: string;
  hiddenWhen?: string[];
  description?: string;
  deprecated?: boolean;
}

export interface ContractEvent {
  payload: string;
  blockedWhen?: string[];
  description?: string;
}

export interface DeprecatedProp {
  name: string;
  replacedBy: string;
  removeIn: string;
}

export interface ContractA11y {
  role: string;
  keyboard: string[];
  focusVisible: boolean;
  ariaDisabled?: string;
  ariaBusy?: string;
  aria?: Record<string, string>;
  contrastMin?: number;
}

export interface ComponentContract {
  $schema?: string;
  name: string;
  version: string;
  level: ComponentLevel;
  category: ComponentCategory;
  /** 구현 대상 정본 카탈로그 항목 key — 생략하면 정본 밖 프로젝트 고유(extras) */
  taxonomyItem?: string;
  status: 'draft' | 'beta' | 'stable' | 'deprecated';
  description?: string;
  owner: { code: string; design: string; figma: string };
  props: Record<string, ContractProp>;
  events?: Record<string, ContractEvent>;
  states: string[];
  tokens: Record<string, string>;
  a11y: ContractA11y;
  responsive?: { breakpoints: string[]; behavior: string };
  compat?: { breakingSince?: string | null; deprecatedProps?: DeprecatedProp[] };
  dependencies?: string[];
}

export const LEVEL_ORDER: Record<ComponentLevel, number> = {
  atom: 0,
  molecule: 1,
  organism: 2,
  template: 3,
  page: 4,
};

// ---------------------------------------------------------------------------
// 파일 로딩
// ---------------------------------------------------------------------------

export interface LoadedContract {
  /** 절대 경로 */
  filePath: string;
  /** 파일명 (예: Button.contract.json) */
  fileName: string;
  contract: ComponentContract;
}

export function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/** contracts/*.contract.json 목록 (glob 기반 — 특정 파일 존재를 가정하지 않음) */
export function listContractFiles(): string[] {
  if (!fs.existsSync(CONTRACTS_DIR)) return [];
  return fs
    .readdirSync(CONTRACTS_DIR)
    .filter((f) => f.endsWith('.contract.json'))
    .sort()
    .map((f) => path.join(CONTRACTS_DIR, f));
}

/**
 * 모든 계약을 로드한다. JSON 파싱 실패 시 throw —
 * 스키마/의미 검증 전에 반드시 validate-contract 를 통과시킬 것.
 */
export function loadContracts(): LoadedContract[] {
  return listContractFiles().map((filePath) => ({
    filePath,
    fileName: path.basename(filePath),
    contract: readJsonFile(filePath) as ComponentContract,
  }));
}

/** tokens/tokens.json 로드 — 없으면 null (다른 배치가 생성 중일 수 있음) */
export function loadTokensDocument(): Record<string, unknown> | null {
  if (!fs.existsSync(TOKENS_JSON_PATH)) return null;
  return readJsonFile(TOKENS_JSON_PATH) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// DTCG 토큰 플래튼
// ---------------------------------------------------------------------------
//
// 토큰 판정 기준: `$value` 프로퍼티 보유 노드 = 토큰 리프.
// `$type` 은 그룹에서 상속된다.
//
// 다크 테마 인코딩 지원(둘 다 허용):
//   1) 최상위 `dark` / `light` 그룹 — 그룹 프리픽스를 제거한 경로로 병합
//   2) 토큰별 `$extensions` 오버라이드 — tds.modes.dark | tds.dark | tds.themes.dark |
//      mode.dark | modes.dark | dark 키 순으로 탐색 ({ $value } 래핑도 허용)
//
// tds.modes 가 tokens.json 의 정본 규약이다 (generate-figma-variables 의 collectModePairs 와
// 동일 키). 나머지 키는 하위 호환용 별칭이며, 이 목록에서 tds.modes 가 빠지면 CSS/TS 경로에서
// 다크 값이 전량 유실되고 Figma Variables 와 구조적으로 어긋난다.

export interface FlatToken {
  /** 점 표기 경로 (예: color.action.primary.default) */
  path: string;
  /** 상속 포함 $type */
  type: string | undefined;
  /** 라이트(기본) 값 */
  value: unknown;
  /** 다크 오버라이드 값 (없으면 undefined) */
  dark: unknown | undefined;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function extractDarkExtension(ext: unknown): unknown {
  if (!isPlainObject(ext)) return undefined;
  const candidates: unknown[] = [
    isPlainObject(ext['tds.modes'])
      ? (ext['tds.modes'] as Record<string, unknown>)['dark']
      : undefined,
    ext['tds.dark'],
    isPlainObject(ext['tds.themes'])
      ? (ext['tds.themes'] as Record<string, unknown>)['dark']
      : undefined,
    isPlainObject(ext['mode']) ? (ext['mode'] as Record<string, unknown>)['dark'] : undefined,
    isPlainObject(ext['modes']) ? (ext['modes'] as Record<string, unknown>)['dark'] : undefined,
    ext['dark'],
  ];
  for (const c of candidates) {
    if (c === undefined) continue;
    if (isPlainObject(c) && '$value' in c) return c['$value'];
    return c;
  }
  return undefined;
}

/**
 * DTCG 문서를 `경로 → FlatToken` 맵으로 평탄화한다.
 * 삽입 순서는 tokens.json 의 선언 순서를 따른다 (생성물 결정성 보장).
 */
export function flattenTokens(doc: Record<string, unknown>): Map<string, FlatToken> {
  const base = new Map<string, FlatToken>();
  const darkOverrides = new Map<string, { value: unknown; type: string | undefined }>();

  const walk = (
    node: unknown,
    prefix: string[],
    inheritedType: string | undefined,
    target: 'base' | 'dark',
  ): void => {
    if (!isPlainObject(node)) return;
    const type = typeof node['$type'] === 'string' ? (node['$type'] as string) : inheritedType;

    if ('$value' in node) {
      const p = prefix.join('.');
      if (p === '') return; // 루트 자체가 토큰인 비정상 문서는 무시
      if (target === 'dark') {
        darkOverrides.set(p, { value: node['$value'], type });
      } else {
        base.set(p, {
          path: p,
          type,
          value: node['$value'],
          dark: extractDarkExtension(node['$extensions']),
        });
      }
      return; // 토큰 리프 아래로는 내려가지 않는다
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      walk(child, [...prefix, key], type, target);
    }
  };

  for (const [key, child] of Object.entries(doc)) {
    if (key.startsWith('$')) continue;
    const lowered = key.toLowerCase();
    if (lowered === 'dark') {
      walk(child, [], undefined, 'dark');
      continue;
    }
    if (lowered === 'light') {
      walk(child, [], undefined, 'base');
      continue;
    }
    walk(child, [key], undefined, 'base');
  }

  for (const [p, override] of darkOverrides) {
    const existing = base.get(p);
    if (existing) {
      existing.dark = override.value;
    } else {
      // 다크 전용 토큰 — 라이트에도 동일 값으로 정의해 var() 미정의를 방지
      base.set(p, { path: p, type: override.type, value: override.value, dark: undefined });
    }
  }

  return base;
}

/** 토큰 경로 → CSS 변수명. color.action.primary.default → --tds-color-action-primary-default */
export function cssVarName(tokenPath: string): string {
  return `--tds-${tokenPath.split('.').join('-')}`;
}

// ---------------------------------------------------------------------------
// 문자열 / 생성물 헬퍼
// ---------------------------------------------------------------------------

export interface GeneratedFile {
  /** 절대 경로 */
  filePath: string;
  /** LF 개행으로 정규화된 최종 내용 */
  content: string;
}

/**
 * 모든 생성 TS 파일의 첫 줄 헤더.
 *
 * version 을 넘기면 `contracts/<Name>.contract.json@<semver>` 형태로 원천과 세대를 한 줄에 박는다.
 * contract-test 의 세대 일치 검사가 '같은 줄의 contract + semver'로 생성물 세대를 판별하므로,
 * 이 형식이 깨지면 Contract ↔ React 축이 FAIL 처리된다 (tools/contract-test/src/axes/react.ts).
 */
export function generatedHeader(contractName: string, version?: string): string {
  const source = version
    ? `contracts/${contractName}.contract.json@${version}`
    : `contracts/${contractName}.contract.json`;
  return `// AUTO-GENERATED from ${source} — DO NOT EDIT (pnpm codegen)`;
}

export function pascal(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** camelCase → kebab-case (fontSize → font-size) */
export function kebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** 개행 정규화 — --check 비교 시 CRLF/LF 차이를 무시 */
export function normalizeEol(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

/** 디렉터리를 보장하고 파일을 기록 (LF, UTF-8) */
export function writeFileEnsured(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/** 기존 파일과 내용이 같은지 비교 (없으면 false) */
export function fileMatches(filePath: string, content: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const current = normalizeEol(fs.readFileSync(filePath, 'utf8'));
  return current === normalizeEol(content);
}
