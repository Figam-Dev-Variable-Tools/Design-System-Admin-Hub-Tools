/**
 * generate-codeowners.ts — orchestration/registry/agents.json → .github/CODEOWNERS 생성
 *
 * 규칙:
 *  (a) figma:// 가상 경로와 package.json#version 특수 표기는 CODEOWNERS에서 제외하고
 *      헤더 주석에 명시한다 (check-boundary.ts가 별도로 강제).
 *  (b) GitHub CODEOWNERS는 last-match-wins이므로 layer 오름차순 + 경로 특이도(깊이)
 *      오름차순으로 배치해, review 하위 경로 등 더 특이한 경로가 상위 소유를 덮는다.
 *  (c) 소유자 표기는 @tds-agents/<slug> 팀 컨벤션.
 *  (d) 헤더에 'AUTO-GENERATED — pnpm boundary:codeowners' 경고를 넣는다.
 *
 * 사용법:
 *   pnpm boundary:codeowners            # .github/CODEOWNERS 생성(덮어쓰기)
 *   pnpm boundary:codeowners --check    # 커밋된 파일이 최신인지 검사 (stale이면 exit 1)
 *
 * 소유자: A02 (Boundary Enforcer AI)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';

import {
  CODEOWNERS_PATH,
  LAYER_TITLES,
  ROOT,
  TEAM_PREFIX,
  buildOwnership,
  loadRegistry,
} from './registry.js';

/** 레지스트리 글롭 → CODEOWNERS 패턴. '/' 포함 시 루트 앵커, 아니면 비앵커 유지 */
function anchorPattern(pattern: string): string {
  return pattern.includes('/') ? `/${pattern}` : pattern;
}

export function renderCodeowners(): string {
  const { agents } = loadRegistry();
  const { entries, excluded } = buildOwnership(agents);

  const BAR = `# ${'='.repeat(78)}`;
  const lines: string[] = [
    BAR,
    '# AUTO-GENERATED — pnpm boundary:codeowners',
    '# 이 파일은 손으로 편집하지 않는다. 원천(SSOT): orchestration/registry/agents.json',
    '# 생성기: tools/boundary/src/generate-codeowners.ts · 소유자: A02 (Boundary Enforcer AI)',
    '#',
    '# 배치 규칙: GitHub CODEOWNERS는 last-match-wins이므로 layer 오름차순 →',
    '# 경로 깊이(특이도) 오름차순으로 정렬한다. review/** 등 더 깊고 특이한',
    '# 경로가 뒤에 배치되어 상위의 넓은 소유를 덮는다.',
    '#',
    '# 아래 소유 경로는 CODEOWNERS로 표현할 수 없어 제외한다',
    '# (tools/boundary/src/check-boundary.ts가 별도로 강제):',
  ];

  for (const ex of excluded) {
    lines.push(`#   - ${ex.agent.id} ${TEAM_PREFIX}${ex.agent.slug}: ${ex.path} (${ex.reason})`);
  }
  lines.push(BAR);

  let currentLayer = -1;
  for (const entry of entries) {
    if (entry.layer !== currentLayer) {
      currentLayer = entry.layer;
      lines.push('', `# ── Layer ${entry.layer} · ${LAYER_TITLES[entry.layer]} ──`);
    }
    const owners = entry.owners.map((agent) => `${TEAM_PREFIX}${agent.slug}`).join(' ');
    lines.push(`${anchorPattern(entry.pattern)} ${owners}`);
  }

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const checkOnly = process.argv.slice(2).includes('--check');
  const content = renderCodeowners();
  const relPath = relative(ROOT, CODEOWNERS_PATH).replace(/\\/g, '/');

  if (checkOnly) {
    const existing = existsSync(CODEOWNERS_PATH) ? readFileSync(CODEOWNERS_PATH, 'utf8') : '';
    if (existing !== content) {
      console.error(`[boundary] STALE: ${relPath} 가 레지스트리와 불일치.`);
      console.error('[boundary] 재생성: pnpm boundary:codeowners');
      process.exit(1);
    }
    console.log(`[boundary] OK: ${relPath} 최신 상태.`);
    return;
  }

  mkdirSync(dirname(CODEOWNERS_PATH), { recursive: true });
  writeFileSync(CODEOWNERS_PATH, content, 'utf8');
  console.log(`[boundary] 생성 완료: ${relPath}`);
}

main();
