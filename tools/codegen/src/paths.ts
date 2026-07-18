/**
 * 리포 루트 기준 경로 상수.
 *
 * 모든 generator / validator는 이 상수만 사용한다 — 경로 하드코딩 금지.
 * 이 파일 위치(tools/codegen/src)를 기준으로 리포 루트를 역산하므로
 * 어느 작업 디렉터리에서 실행해도 동일하게 동작한다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 리포지토리 루트 (tools/codegen/src → 3단계 상위) */
export const REPO_ROOT = path.resolve(HERE, '..', '..', '..');

/** 컴포넌트 계약 디렉터리 — <Name>.contract.json */
export const CONTRACTS_DIR = path.join(REPO_ROOT, 'contracts');

/** 계약 JSON Schema (draft 2020-12) */
export const CONTRACT_SCHEMA_PATH = path.join(CONTRACTS_DIR, 'schemas', 'component.v1.json');

/** 디자인 토큰 원본 (W3C DTCG 포맷) — Source of Truth */
export const TOKENS_JSON_PATH = path.join(REPO_ROOT, 'tokens', 'tokens.json');

/**
 * 컴포넌트 분류 체계(23 모듈 카탈로그) 원본 — Source of Truth.
 * 컴포넌트 계약이 아니라 '무엇을 만들 것인가' 목록이므로 contracts/ 가 아니라
 * tokens/ 와 같은 층위의 최상위 정본 디렉터리에 둔다 (contracts/ 직하는
 * <Name>.contract.json 만 허용 — naming-guard contract-file 규칙).
 */
export const TAXONOMY_JSON_PATH = path.join(REPO_ROOT, 'taxonomy', 'taxonomy.v1.json');

/** UI 패키지 생성물 루트 */
export const UI_GENERATED_DIR = path.join(REPO_ROOT, 'packages', 'ui', 'generated');

/** 계약 → React Props 타입 출력 — <Name>.types.ts */
export const GENERATED_TYPES_DIR = path.join(UI_GENERATED_DIR, 'types');

/** 계약 → Storybook argTypes 출력 — <Name>.argtypes.ts */
export const GENERATED_ARGTYPES_DIR = path.join(UI_GENERATED_DIR, 'argtypes');

/** 토큰 → CSS 변수 / 타입드 맵 출력 — tokens.css, tokens.ts */
export const GENERATED_TOKENS_DIR = path.join(UI_GENERATED_DIR, 'tokens');

/** 계약 → Figma Component Properties 출력 — <Name>.figma.json */
export const FIGMA_GENERATED_DIR = path.join(REPO_ROOT, 'tools', 'figma-plugin', 'generated');

/** 토큰 → Figma Variables 페이로드 출력 디렉터리 */
export const FIGMA_TOKENS_GENERATED_DIR = path.join(FIGMA_GENERATED_DIR, 'tokens');

/** 토큰 → Figma Variables 페이로드 — 플러그인(main.ts) TokensPayload 규격 */
export const FIGMA_VARIABLES_PATH = path.join(FIGMA_TOKENS_GENERATED_DIR, 'figma-variables.json');

/** Figma 플러그인 진입 — 카테고리 페이지 생성(COMPONENT_CATEGORY_ORDER) */
export const FIGMA_MAIN_PATH = path.join(REPO_ROOT, 'tools', 'figma-plugin', 'src', 'main.ts');

/** Figma 문서 생성기 — 카테고리 페이지 정렬(COMPONENT_CATEGORIES) */
export const FIGMA_DOC_PATH = path.join(REPO_ROOT, 'tools', 'figma-plugin', 'src', 'tds-doc.ts');

/** Storybook 프리뷰 설정 — 사이드바 카테고리 정렬(storySort.order) */
export const STORYBOOK_PREVIEW_PATH = path.join(
  REPO_ROOT,
  'packages',
  'ui',
  '.storybook',
  'preview.ts',
);

/** 계약 → API 문서 출력 — <Name>.api.md */
export const DOCS_COMPONENTS_DIR = path.join(REPO_ROOT, 'docs', 'tds', 'components');

/** 리포 루트 기준 상대 경로(항상 슬래시 구분)로 변환 — 로그/헤더 출력용 */
export function relFromRepo(absPath: string): string {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}
