/**
 * 계약 검증기 — contracts/*.contract.json 을 두 단계로 검증한다.
 *
 *  1) 스키마 검증: contracts/schemas/component.v1.json (draft 2020-12, ajv)
 *  2) 의미 검증:
 *     (a) tokens 블록의 모든 경로가 tokens/tokens.json(DTCG, $value 보유 노드)에 실존
 *     (b) enum prop 의 default ∈ values
 *     (c) compat.deprecatedProps[].name 이 props 에 실존
 *     (d) dependencies: 대상 계약 파일 실존 + level 위계
 *         - atom 은 dependencies 가 비어 있어야 한다
 *         - 자기 자신/상위 레벨 의존(역방향 의존) 금지
 *     (e) 카테고리 정본 순서(shared.ts CATEGORY_ORDER)와 소비처 4곳의 복제본 일치
 *         - contracts/schemas/component.v1.json      (category enum)
 *         - tools/figma-plugin/src/main.ts           (COMPONENT_CATEGORY_ORDER)
 *         - tools/figma-plugin/src/tds-doc.ts        (COMPONENT_CATEGORIES)
 *         - packages/ui/.storybook/preview.ts        (storySort.order)
 *
 * 위반이 하나라도 있으면 위반 목록을 출력하고 exit 1.
 *
 * 실행: pnpm --filter @tds/codegen run validate  (루트: pnpm validate:contracts)
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  CONTRACT_SCHEMA_PATH,
  CONTRACTS_DIR,
  FIGMA_DOC_PATH,
  FIGMA_MAIN_PATH,
  STORYBOOK_PREVIEW_PATH,
  TOKENS_JSON_PATH,
  relFromRepo,
} from './paths';
import { TAXONOMY_SOURCE_PATH, loadTaxonomySource, taxonomyItemKeys } from './generate-taxonomy';
import {
  CATEGORY_ORDER,
  ComponentContract,
  LEVEL_ORDER,
  LoadedContract,
  flattenTokens,
  listContractFiles,
  loadTokensDocument,
  readJsonFile,
} from './shared';

export interface Violation {
  /** 리포 루트 기준 상대 경로 */
  file: string;
  rule: string;
  message: string;
}

export interface ValidationResult {
  violations: Violation[];
  /** 스키마+파싱을 통과한 계약 목록 (generator 입력으로 사용 가능) */
  contracts: LoadedContract[];
}

/** 전체 계약을 검증하고 위반 목록을 반환한다 (프로세스 종료는 호출자 책임) */
export function runValidation(): ValidationResult {
  const violations: Violation[] = [];
  const contracts: LoadedContract[] = [];

  // --- 스키마 컴파일 -------------------------------------------------------
  if (!fs.existsSync(CONTRACT_SCHEMA_PATH)) {
    violations.push({
      file: relFromRepo(CONTRACT_SCHEMA_PATH),
      rule: 'schema-missing',
      message: '계약 스키마 파일이 존재하지 않아 검증을 진행할 수 없습니다.',
    });
    return { violations, contracts };
  }

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(readJsonFile(CONTRACT_SCHEMA_PATH) as object);

  // --- 토큰 경로 집합 ------------------------------------------------------
  let tokenPaths: Set<string> | null = null;
  let tokensLoadError: string | null = null;
  try {
    const doc = loadTokensDocument();
    if (doc !== null) tokenPaths = new Set(flattenTokens(doc).keys());
  } catch (err) {
    tokensLoadError = err instanceof Error ? err.message : String(err);
  }

  // --- 파일별 검증 ---------------------------------------------------------
  const files = listContractFiles();
  for (const filePath of files) {
    const rel = relFromRepo(filePath);

    let parsed: unknown;
    try {
      parsed = readJsonFile(filePath);
    } catch (err) {
      violations.push({
        file: rel,
        rule: 'json-parse',
        message: `JSON 파싱 실패: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    if (!validate(parsed)) {
      for (const e of validate.errors ?? []) {
        violations.push({
          file: rel,
          rule: 'schema',
          message: `${e.instancePath || '(root)'} ${e.message ?? ''}`.trim(),
        });
      }
      continue; // 스키마 불합격 계약은 의미 검증 생략
    }

    const contract = parsed as ComponentContract;
    contracts.push({ filePath, fileName: path.basename(filePath), contract });

    // 파일명 ↔ name 일치 (generator 출력 파일명의 원천이므로 강제)
    const expectedFileName = `${contract.name}.contract.json`;
    if (path.basename(filePath) !== expectedFileName) {
      violations.push({
        file: rel,
        rule: 'file-name',
        message: `파일명이 계약 name과 불일치합니다. 기대: ${expectedFileName}`,
      });
    }

    // (a) tokens 블록 경로 실존
    for (const [visual, tokenPath] of Object.entries(contract.tokens)) {
      if (tokensLoadError !== null) {
        violations.push({
          file: rel,
          rule: 'token-exists',
          message: `tokens/tokens.json 파싱 실패로 tokens.${visual} = "${tokenPath}" 를 검증할 수 없습니다: ${tokensLoadError}`,
        });
      } else if (tokenPaths === null) {
        violations.push({
          file: rel,
          rule: 'token-exists',
          message: `${relFromRepo(TOKENS_JSON_PATH)} 이 없어 tokens.${visual} = "${tokenPath}" 를 검증할 수 없습니다.`,
        });
      } else if (!tokenPaths.has(tokenPath)) {
        violations.push({
          file: rel,
          rule: 'token-exists',
          message: `tokens.${visual} = "${tokenPath}" 가 tokens/tokens.json 에 존재하지 않습니다 ($value 보유 노드 없음).`,
        });
      }
    }

    // (b) enum default ∈ values
    for (const [propName, prop] of Object.entries(contract.props)) {
      if (prop.type === 'enum' && prop.default !== undefined) {
        const values = prop.values ?? [];
        if (typeof prop.default !== 'string' || !values.includes(prop.default)) {
          violations.push({
            file: rel,
            rule: 'enum-default',
            message: `props.${propName}.default = ${JSON.stringify(prop.default)} 가 values [${values.join(', ')}] 에 없습니다.`,
          });
        }
      }
    }

    // (c) deprecatedProps.name 이 props 에 실존
    for (const dep of contract.compat?.deprecatedProps ?? []) {
      if (!(dep.name in contract.props)) {
        violations.push({
          file: rel,
          rule: 'deprecated-prop-exists',
          message: `compat.deprecatedProps 의 "${dep.name}" 이 props 에 존재하지 않습니다. deprecated prop 은 제거 버전(${dep.removeIn}) 전까지 props 에 남아 있어야 합니다.`,
        });
      }
    }
  }

  // (d) dependencies — 전체 계약 로드 후 교차 검증
  const byName = new Map<string, ComponentContract>(
    contracts.map((c) => [c.contract.name, c.contract]),
  );
  for (const { filePath, contract } of contracts) {
    const rel = relFromRepo(filePath);
    const deps = contract.dependencies ?? [];

    if (contract.level === 'atom' && deps.length > 0) {
      violations.push({
        file: rel,
        rule: 'atom-no-deps',
        message: `atom 은 dependencies 가 비어 있어야 합니다. 발견: [${deps.join(', ')}]`,
      });
    }

    for (const depName of deps) {
      if (depName === contract.name) {
        violations.push({
          file: rel,
          rule: 'self-dependency',
          message: `자기 자신(${depName})에 의존할 수 없습니다.`,
        });
        continue;
      }

      const depFile = path.join(CONTRACTS_DIR, `${depName}.contract.json`);
      if (!fs.existsSync(depFile)) {
        violations.push({
          file: rel,
          rule: 'dependency-exists',
          message: `의존 컴포넌트 계약 파일이 없습니다: ${relFromRepo(depFile)}`,
        });
        continue;
      }

      const depContract = byName.get(depName);
      if (!depContract) continue; // 파일은 있으나 스키마 불합격 — 해당 파일의 schema 위반으로 이미 보고됨

      if (LEVEL_ORDER[depContract.level] > LEVEL_ORDER[contract.level]) {
        violations.push({
          file: rel,
          rule: 'level-hierarchy',
          message: `역방향 의존: ${contract.level}(${contract.name}) 이 상위 레벨 ${depContract.level}(${depName}) 에 의존합니다.`,
        });
      }
    }
  }

  violations.push(...checkCategoryOrderSync());
  violations.push(...checkTaxonomyItems(contracts));

  return { violations, contracts };
}

/**
 * taxonomyItem 이 실제로 그 category 안에 있는 정본 항목인지, 그리고 한 항목을 두 컴포넌트가
 * 동시에 주장하지 않는지 검사한다. 어긋나면 카탈로그가 조용히 '미구현'으로 남는다.
 */
function checkTaxonomyItems(contracts: LoadedContract[]): Violation[] {
  const out: Violation[] = [];
  const source = loadTaxonomySource();
  if (source === null) return out; // 분류표가 없으면 이 축은 검사하지 않는다

  const keysByCategory = taxonomyItemKeys(source);
  const claimed = new Map<string, string>(); // `${category}/${item}` → 컴포넌트명

  for (const { filePath, contract } of contracts) {
    const item = contract.taxonomyItem;
    if (item === undefined) continue;
    const file = relFromRepo(filePath);
    const keys = keysByCategory.get(contract.category);
    if (!keys) {
      out.push({
        file,
        rule: 'taxonomy-item',
        message: `분류표에 category '${contract.category}' 가 없습니다.`,
      });
      continue;
    }
    if (!keys.has(item)) {
      out.push({
        file,
        rule: 'taxonomy-item',
        message: `taxonomyItem '${item}' 이 '${contract.category}' 의 정본 항목이 아닙니다 — ${relFromRepo(TAXONOMY_SOURCE_PATH)} 참조.`,
      });
      continue;
    }
    const slot = `${contract.category}/${item}`;
    const prev = claimed.get(slot);
    if (prev !== undefined) {
      out.push({
        file,
        rule: 'taxonomy-item',
        message: `정본 항목 '${slot}' 을 ${prev} 와 ${contract.name} 이 중복 주장합니다.`,
      });
      continue;
    }
    claimed.set(slot, contract.name);
  }

  return out;
}

/**
 * 카테고리 정본 순서(CATEGORY_ORDER)를 소비처 4곳이 그대로 복제하고 있는지 검사한다.
 * 복제본이 어긋나면 Storybook 사이드바 순서와 Figma 페이지 순서가 조용히 갈라지므로
 * 텍스트 수준에서 강제한다 — 소비처는 각자 다른 런타임(플러그인 샌드박스·Storybook 설정)이라
 * 정본을 import 할 수 없다.
 */
function checkCategoryOrderSync(): Violation[] {
  const out: Violation[] = [];

  /** `marker` 뒤 첫 배열 리터럴에서 따옴표 문자열을 순서대로 뽑는다 */
  const literalsAfter = (source: string, marker: string): string[] | null => {
    const start = source.indexOf(marker);
    if (start < 0) return null;
    const open = source.indexOf('[', start);
    const close = source.indexOf(']', open);
    if (open < 0 || close < 0) return null;
    return [...source.slice(open, close).matchAll(/'([^']*)'|"([^"]*)"/g)].map(
      (m) => m[1] ?? m[2] ?? '',
    );
  };

  const compare = (file: string, actual: string[] | null, expected: readonly string[]): void => {
    if (actual === null) {
      out.push({ file, rule: 'category-order-sync', message: '카테고리 목록을 찾지 못했습니다.' });
      return;
    }
    if (actual.length === expected.length && actual.every((v, i) => v === expected[i])) return;
    out.push({
      file,
      rule: 'category-order-sync',
      message: `카테고리 순서가 CATEGORY_ORDER(tools/codegen/src/shared.ts)와 다릅니다.\n        기대: ${expected.join(' → ')}\n        실제: ${actual.join(' → ')}`,
    });
  };

  // 스키마 enum — CATEGORY_ORDER 와 완전히 동일해야 한다
  const schema = readJsonFile(CONTRACT_SCHEMA_PATH) as {
    properties?: { category?: { enum?: string[] } };
  };
  compare(
    relFromRepo(CONTRACT_SCHEMA_PATH),
    schema.properties?.category?.enum ?? null,
    CATEGORY_ORDER,
  );

  const read = (abs: string): string | null =>
    fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;

  for (const [abs, marker] of [
    [FIGMA_MAIN_PATH, 'const COMPONENT_CATEGORY_ORDER ='],
    [FIGMA_DOC_PATH, 'const COMPONENT_CATEGORIES ='],
  ] as const) {
    const src = read(abs);
    if (src === null) {
      out.push({ file: relFromRepo(abs), rule: 'category-order-sync', message: '파일 없음' });
      continue;
    }
    compare(relFromRepo(abs), literalsAfter(src, marker), CATEGORY_ORDER);
  }

  // Storybook 사이드바 — 토큰 문서 네임스페이스 'Foundations' 가 맨 앞에 오고,
  // 계약 category 'Foundation'(컴포넌트용)은 사이드바 그룹으로 쓰지 않는다.
  const previewSrc = read(STORYBOOK_PREVIEW_PATH);
  if (previewSrc === null) {
    out.push({
      file: relFromRepo(STORYBOOK_PREVIEW_PATH),
      rule: 'category-order-sync',
      message: '파일 없음',
    });
  } else {
    compare(relFromRepo(STORYBOOK_PREVIEW_PATH), literalsAfter(previewSrc, 'storySort'), [
      'Foundations',
      ...CATEGORY_ORDER.filter((c) => c !== 'Foundation'),
    ]);
  }

  return out;
}

/** 검증 결과 출력 + 종료 코드 결정 (index.ts 와 단독 실행이 공유) */
export function reportValidation(result: ValidationResult): boolean {
  const files = listContractFiles();
  if (files.length === 0) {
    console.log(
      `[validate] ${relFromRepo(CONTRACTS_DIR)}/*.contract.json 이 없습니다 — 검증 대상 0건 (통과).`,
    );
    return true;
  }

  if (result.violations.length === 0) {
    console.log(`[validate] 계약 ${files.length}건 검증 통과 ✔`);
    return true;
  }

  console.error(`[validate] 위반 ${result.violations.length}건 발견:\n`);
  let current = '';
  for (const v of result.violations) {
    if (v.file !== current) {
      current = v.file;
      console.error(`  ${v.file}`);
    }
    console.error(`    - [${v.rule}] ${v.message}`);
  }
  console.error('');
  return false;
}

// --- 단독 실행 (pnpm --filter @tds/codegen run validate) --------------------
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const ok = reportValidation(runValidation());
  process.exit(ok ? 0 : 1);
}
