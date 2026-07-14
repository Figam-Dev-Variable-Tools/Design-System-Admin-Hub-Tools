/**
 * 축 2 — Contract ↔ Storybook (설계서 §5.3)
 *
 * 검사 항목:
 *  1) generated argTypes 존재 — packages/ui/generated/**\/<Name>.argtypes.ts
 *  2) <Name>.stories.tsx 가 generated argTypes 를 import 하는지 정적 검사
 *  3) Story 조합 커버리지 휴리스틱 — combinationMatrix(enum 값 곱 × boolean prop당 2)
 *     기준 필요 조합 수 vs 파일 내 export 된 Story 수 비교
 *
 * Story/argTypes 산출물이 전혀 없으면 축 SKIP (부트스트랩 단계).
 */
import path from 'node:path';
import { posixBasename, readText } from '../lib/fsutil.ts';
import type { AxisContext, AxisResult, Check, Contract } from '../lib/types.ts';
import { summarizeStatuses } from '../lib/types.ts';

/** 계약 props 로부터 필요 조합 수(combinationMatrix 크기)를 계산한다. */
export function combinationMatrixSize(contract: Contract): number {
  let n = 1;
  for (const prop of Object.values(contract.props ?? {})) {
    if (prop.type === 'enum' && Array.isArray(prop.values) && prop.values.length > 0) {
      n *= prop.values.length;
    } else if (prop.type === 'boolean') {
      n *= 2;
    }
  }
  return n;
}

/** CSF 규약: Story export 는 PascalCase `export const` — 파일들에서 고유 export 명 수집 */
function countExportedStories(contents: string[]): number {
  const names = new Set<string>();
  const re = /^export\s+const\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/gm;
  for (const content of contents) {
    for (const m of content.matchAll(re)) {
      const exported = m[1];
      if (exported !== undefined) names.add(exported);
    }
  }
  return names.size;
}

export function checkStorybookAxis(ctx: AxisContext): AxisResult {
  const { contract, ui } = ctx;
  const name = contract.name;
  const checks: Check[] = [];

  const storiesRels = ui.files.filter(
    (r) => r.startsWith('src/') && posixBasename(r) === `${name}.stories.tsx`,
  );
  const argtypesBaseRe = new RegExp(`^${name}\\.arg[tT]ypes\\.tsx?$`);
  const argtypesRels = ui.files.filter(
    (r) => r.startsWith('generated/') && argtypesBaseRe.test(posixBasename(r)),
  );

  if (storiesRels.length === 0 && argtypesRels.length === 0) {
    checks.push({
      id: 'storybook.not-implemented',
      title: 'Storybook 산출물 존재 여부',
      status: 'SKIP',
      detail: `packages/ui/src/**/${name}.stories.tsx 및 packages/ui/generated/argtypes/${name}.argtypes.ts 미존재 — 부트스트랩 단계`,
    });
    return { axis: 'storybook', title: 'Contract ↔ Storybook', status: 'SKIP', checks };
  }

  // 1) generated argTypes 존재
  if (argtypesRels.length > 0) {
    checks.push({
      id: 'storybook.argtypes-exist',
      title: 'generated argTypes 존재',
      status: 'PASS',
      detail: argtypesRels.map((r) => `packages/ui/${r}`).join(', '),
    });
  } else {
    checks.push({
      id: 'storybook.argtypes-exist',
      title: 'generated argTypes 존재',
      status: 'FAIL',
      detail: `Story 파일은 있으나 packages/ui/generated/argtypes/${name}.argtypes.ts 가 없음 — pnpm codegen 실행 필요 (argTypes 수기 작성 금지)`,
    });
  }

  const storiesContents = storiesRels.map((r) => readText(path.join(ui.base, ...r.split('/'))));

  // 2) Story 파일이 generated argTypes 를 import
  if (storiesRels.length === 0) {
    checks.push({
      id: 'storybook.stories-import-argtypes',
      title: 'Story 파일이 generated argTypes 를 import',
      status: 'SKIP',
      detail: `Story 파일 없음 — codegen 산출물만 존재`,
    });
  } else {
    const specRe = new RegExp(
      String.raw`from\s+['"][^'"]*generated[^'"]*${name}\.arg[tT]ypes(?:\.js|\.ts)?['"]`,
    );
    const lcName = name.charAt(0).toLowerCase() + name.slice(1);
    const namedRe = new RegExp(
      String.raw`import\s+(?:type\s+)?\{[^}]*\b(?:${lcName}|${name})ArgTypes\b[^}]*\}\s*from\s+['"][^'"]*generated[^'"]*['"]`,
    );
    const imported = storiesContents.some((c) => specRe.test(c) || namedRe.test(c));
    checks.push({
      id: 'storybook.stories-import-argtypes',
      title: 'Story 파일이 generated argTypes 를 import',
      status: imported ? 'PASS' : 'FAIL',
      detail: imported
        ? storiesRels.map((r) => `packages/ui/${r}`).join(', ')
        : `${storiesRels
            .map((r) => `packages/ui/${r}`)
            .join(
              ', ',
            )} 에서 generated argTypes import 미검출 — 계약 생성 argTypes 사용 필수 (G5 체크리스트)`,
    });
  }

  // 3) 조합 커버리지 휴리스틱
  if (storiesRels.length === 0) {
    checks.push({
      id: 'storybook.coverage',
      title: 'Story 조합 커버리지 (combinationMatrix 휴리스틱)',
      status: 'SKIP',
      detail: 'Story 파일 없음',
    });
  } else {
    const required = combinationMatrixSize(contract);
    const exported = countExportedStories(storiesContents);
    const ok = exported >= required;
    checks.push({
      id: 'storybook.coverage',
      title: 'Story 조합 커버리지 (combinationMatrix 휴리스틱)',
      status: ok ? 'PASS' : 'FAIL',
      detail: `필요 조합 ${required}건 (enum 값 곱 × boolean×2) vs export Story ${exported}건${
        ok ? '' : ' — 커버리지 부족 (G5: variant × size × state 전수)'
      }`,
    });
  }

  return {
    axis: 'storybook',
    title: 'Contract ↔ Storybook',
    status: summarizeStatuses(checks.map((c) => c.status)),
    checks,
  };
}
