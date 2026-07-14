/**
 * 계약 → Figma Component Properties 생성기.
 *
 * contracts/<Name>.contract.json → tools/figma-plugin/generated/<Name>.figma.json
 * Figma 플러그인이 이 파일을 읽어 Component Property / Variant 를 동기화한다.
 *
 * prop 타입 매핑:
 *   enum    → VARIANT        (values + default)
 *   boolean → BOOLEAN        (default)
 *   slot    → INSTANCE_SWAP  (accepts)
 *   string  → TEXT           (default)
 *   node    → TEXT           (콘텐츠 슬롯 — Figma 텍스트 프로퍼티로 매핑)
 *   number / function → Figma 대응 없음, 생략
 *
 * 산출 페이로드는 두 소비자를 동시에 만족시킨다:
 *   - name + variantProperties : 플러그인 sync-component (Component Set 의 Variant Property 동기화)
 *   - component + properties + tokens : TDS 문서 생성기 (Property 표 · 토큰 바인딩)
 * variantProperties 는 Figma Variant 로 표현 가능한 prop(enum·boolean)만 담는다.
 * boolean 은 Figma Variant 값이 문자열이므로 ['true','false'] 로 정규화한다.
 */
import path from 'node:path';
import { FIGMA_GENERATED_DIR } from './paths';
import { ComponentContract, ContractProp, GeneratedFile, pascal } from './shared';

interface FigmaProperty {
  name: string;
  type: 'VARIANT' | 'BOOLEAN' | 'INSTANCE_SWAP' | 'TEXT';
  values?: string[];
  default?: unknown;
  accepts?: string[];
  hiddenWhen?: string[];
  deprecated?: boolean;
}

function toFigmaProperty(propName: string, prop: ContractProp): FigmaProperty | null {
  const name = prop.figmaProperty ?? pascal(propName);
  const common = {
    ...(prop.hiddenWhen?.length ? { hiddenWhen: prop.hiddenWhen } : {}),
    ...(prop.deprecated ? { deprecated: true } : {}),
  };

  switch (prop.type) {
    case 'enum':
      return {
        name,
        type: 'VARIANT',
        values: prop.values ?? [],
        ...(prop.default !== undefined ? { default: prop.default } : {}),
        ...common,
      };
    case 'boolean':
      return { name, type: 'BOOLEAN', default: prop.default ?? false, ...common };
    case 'slot':
      return { name, type: 'INSTANCE_SWAP', accepts: prop.accepts ?? [], ...common };
    case 'string':
    case 'node':
      return { name, type: 'TEXT', default: prop.default ?? '', ...common };
    case 'number':
    case 'function':
    case 'array':
    case 'object':
      return null; // Figma Component Property 대응 없음 (데이터 prop 포함 — ADR-0003)
  }
}

interface VariantPropertyDef {
  values: string[];
  default: string;
}

/** VARIANT·BOOLEAN 프로퍼티만 Figma Variant Property 로 승격한다. */
function toVariantProperties(properties: FigmaProperty[]): Record<string, VariantPropertyDef> {
  const variantProperties: Record<string, VariantPropertyDef> = {};

  for (const prop of properties) {
    if (prop.type === 'VARIANT') {
      const values = prop.values ?? [];
      if (values.length === 0) continue;
      variantProperties[prop.name] = {
        values,
        default: String(prop.default ?? values[0]),
      };
    } else if (prop.type === 'BOOLEAN') {
      variantProperties[prop.name] = {
        values: ['true', 'false'],
        default: String(prop.default ?? false),
      };
    }
  }

  return variantProperties;
}

export function generateFigma(contract: ComponentContract): GeneratedFile {
  const properties: FigmaProperty[] = [];
  for (const [propName, prop] of Object.entries(contract.props)) {
    const mapped = toFigmaProperty(propName, prop);
    if (mapped !== null) properties.push(mapped);
  }

  const payload = {
    $generated: `AUTO-GENERATED from contracts/${contract.name}.contract.json — DO NOT EDIT (pnpm codegen)`,
    name: contract.name,
    component: contract.name,
    version: contract.version,
    variantProperties: toVariantProperties(properties),
    properties,
    tokens: contract.tokens,
  };

  return {
    filePath: path.join(FIGMA_GENERATED_DIR, `${contract.name}.figma.json`),
    content: `${JSON.stringify(payload, null, 2)}\n`,
  };
}
