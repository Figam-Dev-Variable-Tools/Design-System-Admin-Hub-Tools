/**
 * 계약 → React Props 타입 생성기.
 *
 * contracts/<Name>.contract.json → packages/ui/generated/types/<Name>.types.ts
 *  - enum prop  → 유니온 타입 별칭 (export type <Name><Prop> = 'a' | 'b')
 *  - props      → Props 인터페이스 (JSDoc: description / @default / @deprecated)
 *  - events     → 이벤트 핸들러 시그니처 (payload 타입 반영, blockedWhen 주석)
 *  - states     → <Name>State 유니온 타입
 */
import path from 'node:path';
import { GENERATED_TYPES_DIR } from './paths';
import {
  ComponentContract,
  ContractEvent,
  ContractProp,
  GeneratedFile,
  generatedHeader,
  pascal,
} from './shared';

/** React 에서 import 해야 하는 합성 이벤트 타입명 (그 외 식별자는 전역/DOM 타입으로 간주) */
const REACT_EVENT_TYPES = new Set([
  'SyntheticEvent',
  'MouseEvent',
  'KeyboardEvent',
  'FocusEvent',
  'ChangeEvent',
  'FormEvent',
  'PointerEvent',
  'TouchEvent',
  'WheelEvent',
  'UIEvent',
  'ClipboardEvent',
  'CompositionEvent',
  'DragEvent',
  'AnimationEvent',
  'TransitionEvent',
]);

function extractIdentifiers(typeExpr: string): string[] {
  return typeExpr.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? [];
}

/** JSDoc 내부에서 블록 종료 시퀀스를 무해화 */
function jsdocSafe(s: string): string {
  return s.replace(/\*\//g, '*\\/');
}

function jsdocBlock(lines: string[], indent: string): string {
  if (lines.length === 0) return '';
  const body = lines.map((l) => `${indent} * ${jsdocSafe(l)}`).join('\n');
  return `${indent}/**\n${body}\n${indent} */\n`;
}

function propTsType(componentName: string, propName: string, prop: ContractProp): string {
  switch (prop.type) {
    case 'enum':
      return `${componentName}${pascal(propName)}`;
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'slot':
    case 'node':
      return 'ReactNode';
    case 'function':
      return '(...args: unknown[]) => void';
    case 'array':
      return `ReadonlyArray<${prop.itemShape ?? 'unknown'}>`;
    case 'object':
      return prop.itemShape ?? 'Record<string, unknown>';
  }
}

function propJsdoc(prop: ContractProp): string[] {
  const lines: string[] = [];
  if (prop.description) lines.push(prop.description);
  if (prop.type === 'slot' && prop.accepts?.length)
    lines.push(`허용 컴포넌트: ${prop.accepts.join(', ')}`);
  if (prop.hiddenWhen?.length) lines.push(`숨김 조건: ${prop.hiddenWhen.join(', ')}`);
  if (prop.default !== undefined) lines.push(`@default ${JSON.stringify(prop.default)}`);
  if (prop.deprecated)
    lines.push('@deprecated 계약 compat.deprecatedProps 참조 — 대체 prop 으로 이전할 것');
  return lines;
}

function eventJsdoc(event: ContractEvent): string[] {
  const lines: string[] = [];
  if (event.description) lines.push(event.description);
  if (event.blockedWhen?.length)
    lines.push(
      `발화 차단 상태: ${event.blockedWhen.join(', ')} (Storybook Play Function 이 전수 검증)`,
    );
  return lines;
}

export function generateTypes(contract: ComponentContract): GeneratedFile {
  const { name } = contract;
  const props = Object.entries(contract.props);
  const events = Object.entries(contract.events ?? {});

  // --- react import 수집 ---------------------------------------------------
  const reactImports = new Set<string>();
  if (props.some(([, p]) => p.type === 'slot' || p.type === 'node')) reactImports.add('ReactNode');
  for (const [, ev] of events) {
    for (const id of extractIdentifiers(ev.payload)) {
      if (REACT_EVENT_TYPES.has(id)) reactImports.add(id);
    }
  }

  const out: string[] = [];
  out.push(generatedHeader(name, contract.version));
  out.push(
    `// 레벨: ${contract.level} · 카테고리: ${contract.category} · 상태: ${contract.status}`,
  );
  out.push('');
  if (reactImports.size > 0) {
    out.push(`import type { ${[...reactImports].sort().join(', ')} } from 'react';`);
    out.push('');
  }

  // --- enum 유니온 타입 ------------------------------------------------------
  for (const [propName, prop] of props) {
    if (prop.type !== 'enum' || !prop.values) continue;
    out.push(`/** \`${name}.${propName}\` 허용 값 (계약이 유일한 원천) */`);
    out.push(
      `export type ${name}${pascal(propName)} = ${prop.values.map((v) => `'${v}'`).join(' | ')};`,
    );
    out.push('');
  }

  // --- states 유니온 ---------------------------------------------------------
  out.push(`/** 계약에 선언된 상호작용 상태 */`);
  out.push(`export type ${name}State = ${contract.states.map((s) => `'${s}'`).join(' | ')};`);
  out.push('');

  // --- Props 인터페이스 ------------------------------------------------------
  if (contract.description) {
    out.push(jsdocBlock([contract.description], '').trimEnd());
  }
  out.push(`export interface ${name}Props {`);

  for (const [propName, prop] of props) {
    const doc = jsdocBlock(propJsdoc(prop), '  ');
    if (doc) out.push(doc.trimEnd());
    const optional = prop.required === true ? '' : '?';
    out.push(`  ${propName}${optional}: ${propTsType(name, propName, prop)};`);
  }

  if (events.length > 0) {
    out.push('');
    out.push('  // --- events (계약 events 블록에서 생성) ---');
    for (const [eventName, ev] of events) {
      const doc = jsdocBlock(eventJsdoc(ev), '  ');
      if (doc) out.push(doc.trimEnd());
      out.push(`  ${eventName}?: (payload: ${ev.payload}) => void;`);
    }
  }

  out.push('}');
  out.push('');

  return {
    filePath: path.join(GENERATED_TYPES_DIR, `${name}.types.ts`),
    content: out.join('\n'),
  };
}
