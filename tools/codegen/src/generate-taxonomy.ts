/**
 * 정본 분류표 + 계약 → 카탈로그(구현 현황) 생성기.
 *
 * taxonomy/taxonomy.v1.json + contracts/*.contract.json
 *   → packages/ui/generated/taxonomy.ts          (Storybook 카탈로그 스토리가 읽는다)
 *   → tools/figma-plugin/generated/taxonomy.json (Figma 문서 체크리스트가 읽는다)
 *
 * 존재 이유:
 * taxonomy.v1.json 은 "무엇을 만들어야 하는가"(목표 카탈로그)만 안다. 계약은 "무엇을 만들었는가"만
 * 안다. 둘을 이 자리에서 한 번 합쳐야 Storybook 과 Figma 가 같은 구현 현황을 본다 — 각자 합치면
 * 두 축이 조용히 갈라진다.
 *
 * 판정 규칙:
 *  - 계약의 taxonomyItem 이 가리키는 정본 항목 → 그 항목의 component 에 계약 name 이 박힌다(= 구현)
 *  - taxonomyItem 이 없는 계약 → 해당 category 의 extras (정본 목록 밖 프로젝트 고유 컴포넌트)
 *  - 아무 계약도 가리키지 않은 항목 → component: null (= 미구현)
 */
import path from 'node:path';
import { FIGMA_GENERATED_DIR, TAXONOMY_JSON_PATH, UI_GENERATED_DIR } from './paths';
import { CATEGORY_ORDER, ComponentContract, GeneratedFile, readJsonFile } from './shared';

/** taxonomy/taxonomy.v1.json 의 항목 */
interface TaxonomySourceItem {
  key: string;
  name: string;
  component: string | null;
}

interface TaxonomySourceCategory {
  no: number;
  name: string;
  key: string;
  label: string;
  description: string;
  items: TaxonomySourceItem[];
  extras: string[];
}

interface TaxonomySource {
  version: string;
  categories: TaxonomySourceCategory[];
}

export const TAXONOMY_SOURCE_PATH = TAXONOMY_JSON_PATH;

/** 분류표 원본을 읽는다. 파일이 없으면 null (카탈로그 생성 단계를 통째로 건너뛴다) */
export function loadTaxonomySource(): TaxonomySource | null {
  try {
    return readJsonFile(TAXONOMY_SOURCE_PATH) as TaxonomySource;
  } catch {
    return null;
  }
}

/** 정본 항목 key 집합 — validate-contract 의 taxonomyItem 실존 검사가 쓴다 */
export function taxonomyItemKeys(source: TaxonomySource): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const c of source.categories) out.set(c.name, new Set(c.items.map((i) => i.key)));
  return out;
}

interface ResolvedCategory extends TaxonomySourceCategory {
  items: TaxonomySourceItem[];
  extras: string[];
}

/** 분류표 × 계약 → 구현 현황이 채워진 카테고리 배열 */
function resolve(source: TaxonomySource, contracts: ComponentContract[]): ResolvedCategory[] {
  return source.categories.map((cat) => {
    // 분류표에 이미 적힌 component 는 보존한다 — 계약이 없는 구현(Foundation 토큰 문서 스토리 등)을
    // 분류표에서 직접 표기할 수 있어야 한다. 계약이 같은 항목을 주장하면 아래에서 덮어쓴다.
    const items = cat.items.map((i) => ({ ...i }));
    const byKey = new Map(items.map((i) => [i.key, i]));
    const extras: string[] = [];

    for (const c of contracts) {
      if (c.category !== cat.name) continue;
      const key = c.taxonomyItem;
      if (key === undefined) {
        extras.push(c.name);
        continue;
      }
      const item = byKey.get(key);
      // 존재하지 않는 key 는 validate-contract 가 이미 막는다 — 여기 도달하면 방어적으로 extras 처리
      if (item) item.component = c.name;
      else extras.push(c.name);
    }

    extras.sort();
    return { ...cat, items, extras };
  });
}

// ---------------------------------------------------------------------------
// 직렬화
// ---------------------------------------------------------------------------

function q(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function tsFile(version: string, cats: ResolvedCategory[]): string {
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED from taxonomy/taxonomy.v1.json + contracts/*.contract.json');
  lines.push('// DO NOT EDIT (pnpm codegen)');
  lines.push('');
  lines.push('/** 정본 카탈로그 항목 — component 가 null 이면 미구현 */');
  lines.push('export interface TaxonomyItem {');
  lines.push('  readonly key: string;');
  lines.push('  readonly name: string;');
  lines.push('  readonly component: string | null;');
  lines.push('}');
  lines.push('');
  lines.push('export interface TaxonomyCategory {');
  lines.push('  /** 오너 분류표 번호 (1~23) */');
  lines.push('  readonly no: number;');
  lines.push('  readonly name: string;');
  lines.push('  readonly key: string;');
  lines.push('  readonly label: string;');
  lines.push('  readonly description: string;');
  lines.push('  readonly items: readonly TaxonomyItem[];');
  lines.push('  /** 정본 목록 밖 프로젝트 고유 컴포넌트 */');
  lines.push('  readonly extras: readonly string[];');
  lines.push('}');
  lines.push('');
  lines.push(`export const TAXONOMY_VERSION = ${q(version)};`);
  lines.push('');
  lines.push('export const TAXONOMY: readonly TaxonomyCategory[] = [');
  for (const c of cats) {
    lines.push('  {');
    lines.push(`    no: ${String(c.no)},`);
    lines.push(`    name: ${q(c.name)},`);
    lines.push(`    key: ${q(c.key)},`);
    lines.push(`    label: ${q(c.label)},`);
    lines.push(`    description: ${q(c.description)},`);
    lines.push('    items: [');
    for (const i of c.items) {
      const comp = i.component === null ? 'null' : q(i.component);
      lines.push(`      { key: ${q(i.key)}, name: ${q(i.name)}, component: ${comp} },`);
    }
    lines.push('    ],');
    lines.push(
      c.extras.length === 0
        ? '    extras: [],'
        : `    extras: [${c.extras.map((e) => q(e)).join(', ')}],`,
    );
    lines.push('  },');
  }
  lines.push('] as const;');
  lines.push('');
  lines.push('/** 카테고리 이름 → 카테고리 (Storybook 스토리가 자기 카테고리를 찾을 때 쓴다) */');
  lines.push('export function taxonomyOf(name: string): TaxonomyCategory {');
  lines.push('  const found = TAXONOMY.find((c) => c.name === name);');
  lines.push('  if (!found) throw new Error(`알 수 없는 카테고리: ${name}`);');
  lines.push('  return found;');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

export function generateTaxonomy(
  source: TaxonomySource,
  contracts: ComponentContract[],
): GeneratedFile[] {
  const cats = resolve(source, contracts);

  // 분류표 순서가 CATEGORY_ORDER 와 어긋나면 Storybook/Figma 정렬이 분류표와 갈라진다
  const order = cats.map((c) => c.name).join('|');
  const expected = CATEGORY_ORDER.join('|');
  if (order !== expected) {
    throw new Error(
      `taxonomy.v1.json 의 카테고리 순서가 CATEGORY_ORDER 와 다릅니다.\n  기대: ${expected}\n  실제: ${order}`,
    );
  }

  return [
    {
      filePath: path.join(UI_GENERATED_DIR, 'taxonomy.ts'),
      content: tsFile(source.version, cats),
    },
    {
      filePath: path.join(FIGMA_GENERATED_DIR, 'taxonomy.json'),
      content: `${JSON.stringify({ version: source.version, categories: cats }, null, 2)}\n`,
    },
  ];
}
