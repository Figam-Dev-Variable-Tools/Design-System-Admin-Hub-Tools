/**
 * 계약 → Storybook argTypes 생성기.
 *
 * contracts/<Name>.contract.json → packages/ui/generated/argtypes/<Name>.argtypes.ts
 *  - <Name>ArgTypes    : Storybook argTypes 객체 (control / options / table.defaultValue)
 *  - combinationMatrix : enum prop 값 곱 × boolean prop 당 2 데카르트 곱 — Story 커버리지 100% 검증용
 *                        (states 는 포함 안 함 — contract-test 와 같은 식. 상세: 아래 generateArgTypes 주석)
 */
import path from 'node:path';
import { GENERATED_ARGTYPES_DIR } from './paths';
import {
  ComponentContract,
  ContractEvent,
  ContractProp,
  GeneratedFile,
  generatedHeader,
} from './shared';

// ---------------------------------------------------------------------------
// TS 리터럴 직렬화 (단일 따옴표, 식별자 키는 비인용)
// ---------------------------------------------------------------------------

function quote(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function keyLiteral(k: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : quote(k);
}

function tsLiteral(v: unknown, indent: number): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return quote(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    return v.length === 0 ? '[]' : `[${v.map((x) => tsLiteral(x, indent)).join(', ')}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>).filter(
    ([, val]) => val !== undefined,
  );
  if (entries.length === 0) return '{}';
  const pad = '  '.repeat(indent + 1);
  const inner = entries
    .map(([k, val]) => `${pad}${keyLiteral(k)}: ${tsLiteral(val, indent + 1)}`)
    .join(',\n');
  return `{\n${inner},\n${'  '.repeat(indent)}}`;
}

// ---------------------------------------------------------------------------
// argTypes 매핑
// ---------------------------------------------------------------------------

function typeSummary(prop: ContractProp): string {
  switch (prop.type) {
    case 'enum':
      return (prop.values ?? []).map((v) => `'${v}'`).join(' | ');
    case 'slot':
      return prop.accepts?.length ? `ReactNode (accepts: ${prop.accepts.join(', ')})` : 'ReactNode';
    case 'node':
      return 'ReactNode';
    case 'function':
      return 'function';
    case 'array':
      return `ReadonlyArray<${prop.itemShape ?? 'unknown'}>`;
    case 'object':
      return prop.itemShape ?? 'object';
    default:
      return prop.type;
  }
}

function controlFor(prop: ContractProp): unknown {
  switch (prop.type) {
    case 'enum':
      return { type: 'select' };
    case 'boolean':
      return { type: 'boolean' };
    case 'string':
    case 'node':
      return { type: 'text' };
    case 'number':
      return { type: 'number' };
    case 'slot':
    case 'function':
    case 'array':
    case 'object':
      return false; // Storybook control 비활성 (데이터 prop 은 Story args 로 직접 준다)
  }
}

function propArgType(prop: ContractProp): Record<string, unknown> {
  const description = [
    prop.deprecated ? '[DEPRECATED]' : undefined,
    prop.description,
    prop.hiddenWhen?.length ? `숨김 조건: ${prop.hiddenWhen.join(', ')}` : undefined,
  ]
    .filter((s): s is string => s !== undefined)
    .join(' ');

  return {
    description: description || undefined,
    control: controlFor(prop),
    options: prop.type === 'enum' ? prop.values : undefined,
    table: {
      category: prop.type === 'slot' ? 'Slots' : 'Props',
      type: { summary: typeSummary(prop) },
      defaultValue:
        prop.default !== undefined ? { summary: JSON.stringify(prop.default) } : undefined,
    },
  };
}

function eventArgType(eventName: string, ev: ContractEvent): Record<string, unknown> {
  const description = [
    ev.description,
    ev.blockedWhen?.length ? `발화 차단 상태: ${ev.blockedWhen.join(', ')}` : undefined,
  ]
    .filter((s): s is string => s !== undefined)
    .join(' ');

  return {
    description: description || undefined,
    action: eventName,
    control: false,
    table: {
      category: 'Events',
      type: { summary: ev.payload },
    },
  };
}

// ---------------------------------------------------------------------------
// 조합 행렬 (enum prop 값 곱 × boolean prop 당 2)
// ---------------------------------------------------------------------------

function cartesian(
  dimensions: Array<{ key: string; values: string[] }>,
): Array<Record<string, string>> {
  let rows: Array<Record<string, string>> = [{}];
  for (const dim of dimensions) {
    const next: Array<Record<string, string>> = [];
    for (const row of rows) {
      for (const value of dim.values) {
        next.push({ ...row, [dim.key]: value });
      }
    }
    rows = next;
  }
  return rows;
}

export function generateArgTypes(contract: ComponentContract): GeneratedFile {
  const { name } = contract;

  const argTypes: Record<string, unknown> = {};
  for (const [propName, prop] of Object.entries(contract.props)) {
    argTypes[propName] = propArgType(prop);
  }
  for (const [eventName, ev] of Object.entries(contract.events ?? {})) {
    argTypes[eventName] = eventArgType(eventName, ev);
  }

  // 조합 행렬 = **prop 표면**의 데카르트 곱 (enum 값 곱 × boolean prop 당 2).
  //
  // [왜 states 를 곱하지 않는가 — 도구 간 정의가 갈라졌던 자리다]
  //   이전 구현은 `enum × states` 를 생성했고(Button 72칸), contract-test 의 게이트는
  //   `enum × 2^boolean` 을 요구했다(96칸). **같은 이름의 두 정의가 다른 수를 말했다** —
  //   스토리 작성자가 이 생성물을 믿으면 게이트에서 반드시 FAIL 한다 (A30 실측).
  //
  //   책임을 나눠 해소한다:
  //     - **prop 표면 조합** → 여기(그리고 contract-test 의 combinationMatrixSize). 두 곳이 같은 식을 쓴다.
  //     - **states 커버리지** → A77 축2 가 소유한다. 모든 state 가 **단언을 가진** 테스트로 덮였는지 본다.
  //   states 를 여기서 또 곱하면 이중 과금이고, 조합이 폭발해(Button 576칸) 아무도 못 채운다.
  const enumDims = Object.entries(contract.props)
    .filter(([, p]) => p.type === 'enum' && (p.values?.length ?? 0) > 0)
    .map(([key, p]) => ({ key, values: p.values as string[] }));
  const booleanDims = Object.entries(contract.props)
    .filter(([, p]) => p.type === 'boolean')
    .map(([key]) => ({ key, values: ['false', 'true'] }));
  const combos = cartesian([...enumDims, ...booleanDims]);

  const out: string[] = [];
  out.push(generatedHeader(name, contract.version));
  out.push('');
  out.push('/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */');
  out.push(`export const ${name}ArgTypes = ${tsLiteral(argTypes, 0)} as const;`);
  out.push('');
  out.push('/**');
  out.push(' * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.');
  out.push(` * 총 ${combos.length}개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.`);
  out.push(' *');
  out.push(
    ' * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,',
  );
  out.push(' * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.');
  out.push(' */');
  out.push('export const combinationMatrix = [');
  for (const combo of combos) {
    const pairs = Object.entries(combo).map(([k, v]) => `${keyLiteral(k)}: ${quote(v)}`);
    out.push(`  { ${pairs.join(', ')} },`);
  }
  out.push('] as const;');
  out.push('');
  out.push(`export type ${name}Combination = (typeof combinationMatrix)[number];`);
  out.push('');

  return {
    filePath: path.join(GENERATED_ARGTYPES_DIR, `${name}.argtypes.ts`),
    content: out.join('\n'),
  };
}
