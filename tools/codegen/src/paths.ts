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

/** 계약 → API 문서 출력 — <Name>.api.md */
export const DOCS_COMPONENTS_DIR = path.join(REPO_ROOT, 'docs', 'tds', 'components');

/** 리포 루트 기준 상대 경로(항상 슬래시 구분)로 변환 — 로그/헤더 출력용 */
export function relFromRepo(absPath: string): string {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}
