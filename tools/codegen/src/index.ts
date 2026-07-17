/**
 * 코드 생성 파이프라인 오케스트레이션.
 *
 *   validate → generate-types → generate-argtypes → generate-figma
 *            → generate-docs  → tokens-to-css → generate-figma-variables
 *
 * 실행 모드:
 *   pnpm --filter @tds/codegen run generate   생성물 기록 (변경분만) + 고아 파일 삭제
 *   pnpm --filter @tds/codegen run check      생성물이 계약과 일치하는지 비교 — stale 이면 exit 1 (CI 게이트)
 *
 * 입력은 전부 glob 기반 (contracts/*.contract.json, tokens/tokens.json 존재 시)
 * — 특정 계약 파일 존재를 가정하지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  DOCS_COMPONENTS_DIR,
  FIGMA_GENERATED_DIR,
  FIGMA_TOKENS_GENERATED_DIR,
  GENERATED_ARGTYPES_DIR,
  GENERATED_TOKENS_DIR,
  GENERATED_TYPES_DIR,
  relFromRepo,
} from './paths';
import { GeneratedFile, fileMatches, loadTokensDocument, writeFileEnsured } from './shared';
import { reportValidation, runValidation } from './validate-contract';
import { generateTypes } from './generate-types';
import { generateArgTypes } from './generate-argtypes';
import { generateFigma } from './generate-figma';
import { FigmaContractOutput, generateFigmaManifest } from './generate-figma-manifest';
import { generateFigmaVariables } from './generate-figma-variables';
import { generateDocs } from './generate-docs';
import { generateTokenOutputs } from './tokens-to-css';

interface OutputPattern {
  dir: string;
  /** 이 디렉터리에서 codegen 소유로 간주하는 파일 패턴 */
  pattern: RegExp;
}

/** codegen 이 소유하는 출력 파일 패턴 — 고아(stale) 파일 검출 범위 */
const OUTPUT_PATTERNS: OutputPattern[] = [
  { dir: GENERATED_TYPES_DIR, pattern: /\.types\.ts$/ },
  { dir: GENERATED_ARGTYPES_DIR, pattern: /\.argtypes\.ts$/ },
  { dir: FIGMA_GENERATED_DIR, pattern: /\.figma\.json$/ },
  { dir: FIGMA_GENERATED_DIR, pattern: /^manifest\.json$/ },
  { dir: FIGMA_TOKENS_GENERATED_DIR, pattern: /^figma-variables\.json$/ },
  { dir: DOCS_COMPONENTS_DIR, pattern: /\.api\.md$/ },
  { dir: GENERATED_TOKENS_DIR, pattern: /^tokens\.(css|ts)$/ },
];

function collectExistingOutputs(): string[] {
  const found: string[] = [];
  for (const { dir, pattern } of OUTPUT_PATTERNS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (pattern.test(f)) found.push(path.join(dir, f));
    }
  }
  return found;
}

function main(): void {
  const checkMode = process.argv.includes('--check');

  // --- 1) 검증 ---------------------------------------------------------------
  const validation = runValidation();
  if (!reportValidation(validation)) {
    console.error('[codegen] 계약 검증 실패 — 생성을 중단합니다.');
    process.exit(1);
  }

  // --- 2) 생성 계획 수립 --------------------------------------------------------
  const expected: GeneratedFile[] = [];

  // Figma 매니페스트는 계약/토큰 산출물의 이름·체크섬을 동봉하므로 그 결과를 모아 둔다
  const figmaOutputs: FigmaContractOutput[] = [];

  for (const { contract } of validation.contracts) {
    expected.push(generateTypes(contract));
    expected.push(generateArgTypes(contract));
    const figmaFile = generateFigma(contract);
    figmaOutputs.push({ contract, file: figmaFile });
    expected.push(figmaFile);
    expected.push(generateDocs(contract));
  }

  const tokensDoc = loadTokensDocument();
  const tokensAvailable = tokensDoc !== null;
  let figmaVariablesFile: GeneratedFile | null = null;
  if (tokensAvailable) {
    expected.push(...generateTokenOutputs(tokensDoc));
    figmaVariablesFile = generateFigmaVariables(tokensDoc);
    expected.push(figmaVariablesFile);
  } else {
    console.warn('[codegen] tokens/tokens.json 이 아직 없습니다 — 토큰 생성 단계를 건너뜁니다.');
  }

  // 플러그인 UI 가 "무엇이 전량인가"를 아는 유일한 수단 — 항상 마지막에 조립한다
  expected.push(generateFigmaManifest(figmaOutputs, figmaVariablesFile));

  // --- 3) 고아 파일 검출 (계약이 삭제된 뒤 남은 생성물) -----------------------------------
  const expectedPaths = new Set(expected.map((f) => f.filePath));
  const orphans = collectExistingOutputs().filter((p) => {
    if (expectedPaths.has(p)) return false;
    // tokens.json 이 없어 토큰 생성을 건너뛴 경우, 기존 토큰 산출물은 고아로 취급하지 않는다
    if (
      !tokensAvailable &&
      (path.dirname(p) === GENERATED_TOKENS_DIR || path.dirname(p) === FIGMA_TOKENS_GENERATED_DIR)
    ) {
      return false;
    }
    return true;
  });

  // --- 4-a) --check: 비교만 수행 --------------------------------------------------
  if (checkMode) {
    const stale: string[] = [];
    for (const f of expected) {
      if (!fs.existsSync(f.filePath)) stale.push(`${relFromRepo(f.filePath)} (누락)`);
      else if (!fileMatches(f.filePath, f.content))
        stale.push(`${relFromRepo(f.filePath)} (내용 불일치)`);
    }
    for (const p of orphans) stale.push(`${relFromRepo(p)} (고아 — 대응 계약 없음)`);

    if (stale.length > 0) {
      console.error(`[codegen --check] 생성물이 계약과 불일치합니다 (${stale.length}건):`);
      for (const s of stale) console.error(`  - ${s}`);
      console.error('\n해결: pnpm codegen 실행 후 결과를 커밋하세요.');
      process.exit(1);
    }
    console.log(`[codegen --check] 생성물 ${expected.length}건 모두 최신 상태 ✔`);
    return;
  }

  // --- 4-b) generate: 기록 --------------------------------------------------------
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const f of expected) {
    if (!fs.existsSync(f.filePath)) {
      writeFileEnsured(f.filePath, f.content);
      created += 1;
      console.log(`  + ${relFromRepo(f.filePath)}`);
    } else if (!fileMatches(f.filePath, f.content)) {
      writeFileEnsured(f.filePath, f.content);
      updated += 1;
      console.log(`  ~ ${relFromRepo(f.filePath)}`);
    } else {
      unchanged += 1;
    }
  }
  for (const p of orphans) {
    fs.rmSync(p);
    console.log(`  - ${relFromRepo(p)} (고아 삭제)`);
  }

  console.log(
    `[codegen] 완료 — 신규 ${created} · 갱신 ${updated} · 동일 ${unchanged} · 고아 삭제 ${orphans.length}`,
  );
}

main();
