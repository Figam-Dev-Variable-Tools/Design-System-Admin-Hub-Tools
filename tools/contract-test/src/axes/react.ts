/**
 * 축 1 — Contract ↔ React (설계서 §5.3)
 *
 * 검사 항목:
 *  1) packages/ui/generated/types/<Name>.types.ts 존재 여부
 *  2) 생성 타입 파일이 계약과 동일 세대인지 — 파일 내 계약 버전 주석 비교
 *     (codegen 헤더 규약: "// 자동 생성 — 원천: contracts/<Name>.contract.json@<version>"
 *      과 같이 'contract'와 semver가 같은 줄에 존재하면 인식)
 *  3) packages/ui/src/**\/<Name>.tsx 구현이 generated 타입을 import 하는지 정적 검사
 *
 * 구현 산출물(타입 파일·구현 파일)이 하나도 없으면 축 전체 SKIP — 계약만 존재하는
 * 부트스트랩 단계는 차단하지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { posixBasename, readText } from '../lib/fsutil.ts';
import type { AxisContext, AxisResult, Check } from '../lib/types.ts';
import { summarizeStatuses } from '../lib/types.ts';

/** 'contract' 단어와 semver가 같은 줄에 있는 첫 번째 버전 표기를 추출 */
const VERSION_COMMENT_RE = /contract[^\r\n]*?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/i;

export function checkReactAxis(ctx: AxisContext): AxisResult {
  const { contract, ui } = ctx;
  const name = contract.name;
  const checks: Check[] = [];

  const typesRel = `generated/types/${name}.types.ts`;
  const typesAbs = path.join(ui.base, ...typesRel.split('/'));
  const typesExists = fs.existsSync(typesAbs);

  const implRels = ui.files.filter(
    (r) => r.startsWith('src/') && posixBasename(r) === `${name}.tsx`,
  );

  // 구현 산출물이 전혀 없으면 축 SKIP (계약만 존재)
  if (!typesExists && implRels.length === 0) {
    checks.push({
      id: 'react.not-implemented',
      title: 'React 구현 존재 여부',
      status: 'SKIP',
      detail: `packages/ui/${typesRel} 및 packages/ui/src/**/${name}.tsx 미존재 — 계약만 있는 부트스트랩 단계`,
    });
    return { axis: 'react', title: 'Contract ↔ React', status: 'SKIP', checks };
  }

  // 1) generated 타입 파일 존재
  if (typesExists) {
    checks.push({
      id: 'react.types-exist',
      title: 'generated 타입 파일 존재',
      status: 'PASS',
      detail: `packages/ui/${typesRel}`,
    });
  } else {
    checks.push({
      id: 'react.types-exist',
      title: 'generated 타입 파일 존재',
      status: 'FAIL',
      detail: `구현 파일은 있으나 packages/ui/${typesRel} 이 없음 — pnpm codegen 실행 필요`,
    });
  }

  // 2) 세대 일치 — 타입 파일 내 계약 버전 주석 비교
  if (typesExists) {
    const content = readText(typesAbs);
    const m = content.match(VERSION_COMMENT_RE);
    const found = m?.[1];
    if (!found) {
      checks.push({
        id: 'react.types-generation',
        title: '생성 타입 세대(계약 버전) 일치',
        status: 'FAIL',
        detail: `버전 주석을 찾을 수 없어 세대 판별 불가 — codegen 헤더에 "contracts/${name}.contract.json@${contract.version}" 표기 필요`,
      });
    } else if (found !== contract.version) {
      checks.push({
        id: 'react.types-generation',
        title: '생성 타입 세대(계약 버전) 일치',
        status: 'FAIL',
        detail: `세대 불일치 — 계약 ${contract.version} vs 생성물 ${found}. pnpm codegen 재실행 필요`,
      });
    } else {
      checks.push({
        id: 'react.types-generation',
        title: '생성 타입 세대(계약 버전) 일치',
        status: 'PASS',
        detail: `계약/생성물 모두 ${contract.version}`,
      });
    }
  } else {
    checks.push({
      id: 'react.types-generation',
      title: '생성 타입 세대(계약 버전) 일치',
      status: 'SKIP',
      detail: '타입 파일이 없어 비교 불가',
    });
  }

  // 3) 구현 파일이 generated 타입을 import 하는지
  if (implRels.length === 0) {
    checks.push({
      id: 'react.impl-imports-generated',
      title: '구현이 generated 타입을 import',
      status: 'SKIP',
      detail: `packages/ui/src/**/${name}.tsx 없음 — codegen 산출물만 존재`,
    });
  } else {
    const importRe = new RegExp(
      String.raw`from\s+['"][^'"]*generated\/(?:types\/)?${name}(?:\.types)?(?:\.js|\.ts)?['"]`,
    );
    const missing = implRels.filter(
      (r) => !importRe.test(readText(path.join(ui.base, ...r.split('/')))),
    );
    if (missing.length === 0) {
      checks.push({
        id: 'react.impl-imports-generated',
        title: '구현이 generated 타입을 import',
        status: 'PASS',
        detail: implRels.map((r) => `packages/ui/${r}`).join(', '),
      });
    } else {
      checks.push({
        id: 'react.impl-imports-generated',
        title: '구현이 generated 타입을 import',
        status: 'FAIL',
        detail: `generated/types/${name}.types import 미검출: ${missing
          .map((r) => `packages/ui/${r}`)
          .join(', ')} — 수동 타입 선언 금지 (G6 체크리스트)`,
      });
    }
  }

  return {
    axis: 'react',
    title: 'Contract ↔ React',
    status: summarizeStatuses(checks.map((c) => c.status)),
    checks,
  };
}
