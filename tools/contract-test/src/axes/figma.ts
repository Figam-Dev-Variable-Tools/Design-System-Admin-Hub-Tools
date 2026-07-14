/**
 * 축 3 — Contract ↔ Figma (설계서 §5.3)
 *
 * tools/figma-plugin/generated/<Name>.figma.json 의 properties 가
 * 계약 props 의 figmaProperty 와 이름/타입/값 완전 일치하는지 검사한다.
 *  - 이름: figmaProperty ↔ Figma property 명 정확 일치 (양방향 — 계약에 없는 property 도 불일치)
 *  - 타입: enum→VARIANT, boolean→BOOLEAN 등 매핑 표 기준 (대소문자/구분자 무시 비교)
 *  - 값: enum 의 values 집합 완전 일치, boolean 은 true/false
 *
 * figma.json 이 아직 없으면 축 SKIP (부트스트랩 단계).
 */
import fs from 'node:fs';
import path from 'node:path';
import { readText } from '../lib/fsutil.ts';
import type { AxisContext, AxisResult, Check, PropType } from '../lib/types.ts';
import { summarizeStatuses } from '../lib/types.ts';

/** 계약 prop 타입 → 허용되는 Figma property 타입 (정규화 후 비교). 빈 배열 = 타입 검사 생략 */
const TYPE_EXPECTATIONS: Record<PropType, string[]> = {
  enum: ['variant'],
  boolean: ['boolean'],
  string: ['text', 'string'],
  number: ['number', 'text'],
  slot: ['instanceswap', 'slot'],
  node: ['instanceswap', 'node', 'text'],
  function: [],
};

/**
 * Figma Component Property 로 매핑되는 prop 타입.
 * number/function 은 Figma 대응이 없어 codegen 이 생성물에서 제외한다
 * (tools/codegen/src/generate-figma.ts toFigmaProperty → null).
 */
const FIGMA_MAPPABLE_TYPES = new Set<PropType>(['enum', 'boolean', 'slot', 'string', 'node']);

/**
 * 계약 prop → Figma property 이름 유도.
 *
 * codegen 과 **동일한 규칙**이어야 한다: `figmaProperty` 가 있으면 그대로, 없으면 propName 의
 * PascalCase (tools/codegen/src/generate-figma.ts: `prop.figmaProperty ?? pascal(propName)`).
 * 스키마는 enum/boolean 에만 figmaProperty 를 요구하므로 slot/node/string 은 폴백으로 이름이
 * 정해진다 — 이 폴백을 여기서 재현하지 않으면 codegen 이 정상 생성한 property 를 '계약 밖'으로
 * 오판한다.
 */
function figmaNameOf(propName: string, figmaProperty: string | undefined): string {
  return figmaProperty ?? propName.charAt(0).toUpperCase() + propName.slice(1);
}

/** 'INSTANCE_SWAP' → 'instanceswap' 처럼 대소문자/구분자를 제거해 비교한다. */
function normalizeTypeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}

interface FigmaPropertyNorm {
  name: string;
  type: string | null;
  values: string[] | null;
}

function toStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.map((x) => String(x));
}

/** figma.json 의 properties 를 배열/객체 두 형태 모두 허용해 정규화한다. */
function normalizeFigmaProperties(doc: unknown): FigmaPropertyNorm[] | null {
  if (!doc || typeof doc !== 'object') return null;
  const props = (doc as Record<string, unknown>)['properties'];
  if (Array.isArray(props)) {
    return props.map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return {
        name: String(o['name'] ?? o['property'] ?? ''),
        type: typeof o['type'] === 'string' ? o['type'] : null,
        values: toStringArray(o['values'] ?? o['options'] ?? o['variantOptions']),
      };
    });
  }
  if (props && typeof props === 'object') {
    return Object.entries(props as Record<string, unknown>).map(([name, v]) => {
      const o = (v ?? {}) as Record<string, unknown>;
      return {
        name,
        type: typeof o['type'] === 'string' ? o['type'] : null,
        values: toStringArray(o['values'] ?? o['options'] ?? o['variantOptions']),
      };
    });
  }
  return null;
}

export function checkFigmaAxis(ctx: AxisContext): AxisResult {
  const { root, contract } = ctx;
  const name = contract.name;
  const checks: Check[] = [];
  const figmaRel = `tools/figma-plugin/generated/${name}.figma.json`;
  const figmaAbs = path.join(root, 'tools', 'figma-plugin', 'generated', `${name}.figma.json`);

  if (!fs.existsSync(figmaAbs)) {
    checks.push({
      id: 'figma.not-generated',
      title: 'Figma 스펙(figma.json) 존재 여부',
      status: 'SKIP',
      detail: `${figmaRel} 미존재 — codegen/플러그인 산출 전 부트스트랩 단계`,
    });
    return { axis: 'figma', title: 'Contract ↔ Figma', status: 'SKIP', checks };
  }

  let doc: unknown;
  try {
    doc = JSON.parse(readText(figmaAbs));
  } catch (e) {
    checks.push({
      id: 'figma.parse',
      title: 'figma.json 파싱',
      status: 'FAIL',
      detail: `${figmaRel} JSON 파싱 실패 — ${(e as Error).message}`,
    });
    return { axis: 'figma', title: 'Contract ↔ Figma', status: 'FAIL', checks };
  }

  // 세대 확인 (contractVersion 필드가 있을 때만 — 없으면 검사 생략)
  const docVersion = (doc as Record<string, unknown>)['contractVersion'];
  if (typeof docVersion === 'string') {
    checks.push({
      id: 'figma.generation',
      title: 'figma.json 세대(계약 버전) 일치',
      status: docVersion === contract.version ? 'PASS' : 'FAIL',
      detail:
        docVersion === contract.version
          ? `계약/생성물 모두 ${contract.version}`
          : `세대 불일치 — 계약 ${contract.version} vs 생성물 ${docVersion}`,
    });
  }

  const figmaProps = normalizeFigmaProperties(doc);
  if (figmaProps === null) {
    checks.push({
      id: 'figma.properties-shape',
      title: 'figma.json properties 구조',
      status: 'FAIL',
      detail: `${figmaRel} 에 properties 블록(객체 또는 배열)이 없음`,
    });
    return { axis: 'figma', title: 'Contract ↔ Figma', status: 'FAIL', checks };
  }

  // 정방향: 계약 prop → Figma property 이름/타입/값 일치 (이름 유도는 codegen 규칙과 동일)
  for (const [propName, prop] of Object.entries(contract.props ?? {})) {
    if (!FIGMA_MAPPABLE_TYPES.has(prop.type)) continue; // number/function — Figma 대응 없음

    const figmaName = figmaNameOf(propName, prop.figmaProperty);
    const found = figmaProps.find((p) => p.name === figmaName);
    const problems: string[] = [];

    if (!found) {
      problems.push(`Figma property "${figmaName}" 미존재`);
    } else {
      const expected = TYPE_EXPECTATIONS[prop.type] ?? [];
      if (expected.length > 0) {
        if (!found.type) {
          problems.push('Figma property 타입 정보 없음');
        } else if (!expected.includes(normalizeTypeName(found.type))) {
          problems.push(
            `타입 불일치 — 계약 ${prop.type} (기대: ${expected.join('/')}) vs Figma "${found.type}"`,
          );
        }
      }
      if (prop.type === 'enum') {
        const contractValues = prop.values ?? [];
        if (!found.values) {
          problems.push('Figma variant 값 목록 없음');
        } else {
          const missing = contractValues.filter((v) => !found.values?.includes(v));
          const extra = found.values.filter((v) => !contractValues.includes(v));
          if (missing.length > 0) problems.push(`값 누락: ${missing.join(', ')}`);
          if (extra.length > 0) problems.push(`계약에 없는 값: ${extra.join(', ')}`);
        }
      }
      if (prop.type === 'boolean' && found.values) {
        const set = new Set(found.values.map((v) => v.toLowerCase()));
        if (!(set.size === 2 && set.has('true') && set.has('false'))) {
          problems.push(`boolean 값 목록 이상 — [${found.values.join(', ')}] (기대: true/false)`);
        }
      }
    }

    checks.push({
      id: `figma.prop.${propName}`,
      title: `props.${propName} ↔ Figma "${figmaName}"`,
      status: problems.length > 0 ? 'FAIL' : 'PASS',
      ...(problems.length > 0 ? { detail: problems.join(' | ') } : {}),
    });
  }

  // 역방향: 계약에 매핑되지 않은 Figma property 는 불일치 (완전 일치 요구)
  const expectedNames = new Set(
    Object.entries(contract.props ?? {})
      .filter(([, p]) => FIGMA_MAPPABLE_TYPES.has(p.type))
      .map(([propName, p]) => figmaNameOf(propName, p.figmaProperty)),
  );
  const extras = figmaProps.filter((p) => !expectedNames.has(p.name)).map((p) => p.name);
  checks.push({
    id: 'figma.extra-properties',
    title: '계약 밖 Figma property 없음',
    status: extras.length > 0 ? 'FAIL' : 'PASS',
    ...(extras.length > 0
      ? { detail: `계약에 매핑되지 않은 Figma property: ${extras.join(', ')}` }
      : {}),
  });

  return {
    axis: 'figma',
    title: 'Contract ↔ Figma',
    status: summarizeStatuses(checks.map((c) => c.status)),
    checks,
  };
}
