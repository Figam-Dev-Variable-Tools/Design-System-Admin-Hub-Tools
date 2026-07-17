/**
 * 계약/토큰 산출물 → Figma 플러그인 적재 매니페스트 생성기.
 *
 * contracts/*.contract.json + tokens/tokens.json
 *   → tools/figma-plugin/generated/manifest.json
 *
 * 존재 이유 (조용한 누락 방지):
 * 플러그인은 manifest `networkAccess: none` 이라 리포를 읽을 수 없다. 따라서 UI 는
 * "지금 몇 개의 계약이 있어야 하는가"를 알 방법이 없고, 오퍼레이터가 38개 중 37개만
 * 골라도 아무 경고 없이 37개만 동기화된다 — 코드 갭이 아니라 강제(enforcement) 갭이다.
 *
 * 이 매니페스트가 그 기대치를 산출물에 동봉해 UI 로 운반한다. UI 는 업로드된 파일을
 * 이 목록과 대조해 누락/스테일을 검출하고 실행을 차단한다 (src/ui.html).
 *
 * 무결성: 파일당 checksum 은 "정규화 JSON"(키 정렬 후 공백 없이 직렬화)의 FNV-1a 32비트다.
 *  - 원문 텍스트가 아니라 파싱 후 재직렬화한 값을 해싱하므로 줄바꿈(CRLF/LF)·들여쓰기·
 *    키 순서 차이에 영향받지 않는다. 즉 git 의 autocrlf 가 체크아웃에서 무엇을 하든 일치한다.
 *  - 목적은 위변조 방지가 아니라 스테일(오래된 산출물 업로드) 검출이다 — 암호학적 강도 불필요.
 *  - UI 는 같은 알고리즘을 JS 로 재구현한다(플러그인 UI 는 번들과 분리된 별도 문서라 import 불가).
 *    알고리즘을 바꾸면 ui.html 의 canonicalJson/fnv1a 도 같이 바꿀 것.
 */
import path from 'node:path';
import { FIGMA_GENERATED_DIR } from './paths';
import { ComponentContract, GeneratedFile } from './shared';

/** 매니페스트 스키마 버전 — UI 가 호환성 검사에 쓴다 (불일치 시 UI 가 실행 차단) */
export const FIGMA_MANIFEST_VERSION = 1;

interface ManifestContractEntry {
  /** Component Set 이름 = 계약 name (예: 'Button') */
  name: string;
  /** generated/ 기준 상대 경로 — UI 가 업로드 파일명과 대조 */
  file: string;
  version: string;
  /** 이 계약이 Figma Variant Property 를 갖는지 — 없으면 sync-component 대상 아님 */
  variantPropertyCount: number;
  checksum: string;
}

interface ManifestTokensEntry {
  file: string;
  collection: string;
  modes: string[];
  variableCount: number;
  checksum: string;
}

export interface FigmaManifest {
  $generated: string;
  manifestVersion: number;
  contractCount: number;
  contracts: ManifestContractEntry[];
  tokens: ManifestTokensEntry | null;
}

/**
 * 키를 정렬해 공백 없이 직렬화 — 해시 입력의 정규형.
 * 배열 순서는 의미가 있으므로 보존한다.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
    );
  return `{${entries.join(',')}}`;
}

/** FNV-1a 32비트 → 8자리 소문자 hex. ui.html 의 동명 함수와 반드시 동일하게 유지할 것. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32비트 FNV prime(16777619) 곱 — Math.imul 로 오버플로를 32비트로 가둔다
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** 생성된 파일의 JSON 본문에서 정규화 체크섬 계산 */
function checksumOf(file: GeneratedFile): string {
  return fnv1a(canonicalJson(JSON.parse(file.content)));
}

interface FigmaVariablesShape {
  collection?: unknown;
  modes?: unknown;
  variables?: unknown;
}

/** 계약 ↔ 그 계약에서 나온 figma 산출물 쌍 — 인덱스로 짝을 맞추지 않는다 */
export interface FigmaContractOutput {
  contract: ComponentContract;
  file: GeneratedFile;
}

/**
 * @param outputs     계약과 generateFigma 산출물의 쌍 목록
 * @param tokensFile  generateFigmaVariables 산출물 (tokens.json 부재 시 null)
 */
export function generateFigmaManifest(
  outputs: FigmaContractOutput[],
  tokensFile: GeneratedFile | null,
): GeneratedFile {
  const entries: ManifestContractEntry[] = outputs.map(({ contract, file }) => {
    const payload = JSON.parse(file.content) as { variantProperties?: Record<string, unknown> };
    if (payload.variantProperties === undefined) {
      throw new Error(
        `[codegen] ${contract.name}.figma.json 에 variantProperties 가 없습니다 — generate-figma 규격 위반.`,
      );
    }
    return {
      name: contract.name,
      file: path.basename(file.filePath),
      version: contract.version,
      variantPropertyCount: Object.keys(payload.variantProperties).length,
      checksum: checksumOf(file),
    };
  });

  // 이름 정렬 — 계약 파일 glob 순서에 의존하지 않는 결정적 출력
  entries.sort((a, b) => a.name.localeCompare(b.name));

  let tokens: ManifestTokensEntry | null = null;
  if (tokensFile !== null) {
    const payload = JSON.parse(tokensFile.content) as FigmaVariablesShape;
    if (typeof payload.collection !== 'string' || !Array.isArray(payload.variables)) {
      throw new Error(
        '[codegen] figma-variables.json 형식 오류 — {collection, modes, variables[]} 필요.',
      );
    }
    tokens = {
      // UI 는 업로드 파일명만 알 수 있으므로 디렉터리 없는 basename 으로 대조한다
      file: path.basename(tokensFile.filePath),
      collection: payload.collection,
      modes: Array.isArray(payload.modes) ? (payload.modes as string[]) : [],
      variableCount: payload.variables.length,
      checksum: checksumOf(tokensFile),
    };
  }

  const manifest: FigmaManifest = {
    $generated:
      'AUTO-GENERATED from contracts/*.contract.json + tokens/tokens.json — DO NOT EDIT (pnpm codegen)',
    manifestVersion: FIGMA_MANIFEST_VERSION,
    contractCount: entries.length,
    contracts: entries,
    tokens,
  };

  return {
    filePath: path.join(FIGMA_GENERATED_DIR, 'manifest.json'),
    content: `${JSON.stringify(manifest, null, 2)}\n`,
  };
}
