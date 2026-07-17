/**
 * 계약 → API 문서 생성기.
 *
 * contracts/<Name>.contract.json → docs/tds/components/<Name>.api.md
 * Props / Events / States / A11y / Tokens 표 + 자동 생성 경고 헤더.
 */
import path from 'node:path';
import { DOCS_COMPONENTS_DIR } from './paths';
import { ComponentContract, ContractProp, GeneratedFile, cssVarName, pascal } from './shared';

/** 마크다운 표 셀 이스케이프 (파이프, 개행) */
function cell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function code(s: string): string {
  return `\`${s}\``;
}

function propTypeLabel(componentName: string, propName: string, prop: ContractProp): string {
  switch (prop.type) {
    case 'enum':
      return (prop.values ?? []).map((v) => `\`'${v}'\``).join(' \\| ');
    case 'slot':
      return `ReactNode (허용: ${(prop.accepts ?? []).join(', ')})`;
    case 'node':
      return 'ReactNode';
    case 'function':
      return '`(...args) => void`';
    default:
      return code(prop.type);
  }
}

export function generateDocs(contract: ComponentContract): GeneratedFile {
  const { name } = contract;
  const out: string[] = [];

  out.push(
    `<!-- AUTO-GENERATED from contracts/${name}.contract.json — DO NOT EDIT (pnpm codegen) -->`,
  );
  out.push('');
  out.push(`# ${name} API`);
  out.push('');
  out.push('> ⚠️ **자동 생성 문서** — 이 파일은 계약에서 생성됩니다. 직접 수정하지 마세요.');
  out.push(
    `> 변경이 필요하면 \`contracts/${name}.contract.json\` 을 수정한 뒤 \`pnpm codegen\` 을 실행하세요.`,
  );
  out.push('');
  if (contract.description) {
    out.push(contract.description);
    out.push('');
  }

  // --- 개요 ------------------------------------------------------------------
  out.push('## 개요');
  out.push('');
  out.push('| 항목 | 값 |');
  out.push('|---|---|');
  out.push(`| 버전 | ${code(contract.version)} |`);
  out.push(`| 레벨 | ${code(contract.level)} |`);
  out.push(`| 상태 | ${code(contract.status)} |`);
  out.push(
    `| 소유 | code ${code(contract.owner.code)} · design ${code(contract.owner.design)} · figma ${code(contract.owner.figma)} |`,
  );
  if (contract.dependencies?.length) {
    out.push(`| 의존 컴포넌트 | ${contract.dependencies.map(code).join(', ')} |`);
  }
  out.push('');

  // --- Props -----------------------------------------------------------------
  out.push('## Props');
  out.push('');
  out.push('| 이름 | 타입 | 기본값 | 필수 | Figma Property | 설명 |');
  out.push('|---|---|---|---|---|---|');
  for (const [propName, prop] of Object.entries(contract.props)) {
    const defaultCell = prop.default !== undefined ? code(JSON.stringify(prop.default)) : '—';
    const requiredCell = prop.required === true ? '✅' : '—';
    const figmaCell =
      prop.type === 'enum' || prop.type === 'boolean' || prop.figmaProperty !== undefined
        ? code(prop.figmaProperty ?? pascal(propName))
        : '—';
    const descParts = [
      prop.deprecated ? '**[DEPRECATED]**' : undefined,
      prop.description,
      prop.hiddenWhen?.length ? `숨김 조건: ${prop.hiddenWhen.map(code).join(', ')}` : undefined,
    ].filter((s): s is string => s !== undefined);
    out.push(
      `| ${code(propName)} | ${propTypeLabel(contract.name, propName, prop)} | ${defaultCell} | ${requiredCell} | ${figmaCell} | ${cell(descParts.join(' ')) || '—'} |`,
    );
  }
  out.push('');

  // --- Events ----------------------------------------------------------------
  out.push('## Events');
  out.push('');
  const events = Object.entries(contract.events ?? {});
  if (events.length === 0) {
    out.push('_계약에 정의된 이벤트가 없습니다._');
  } else {
    out.push('| 이름 | Payload | 발화 차단 상태 | 설명 |');
    out.push('|---|---|---|---|');
    for (const [eventName, ev] of events) {
      const blocked = ev.blockedWhen?.length ? ev.blockedWhen.map(code).join(', ') : '—';
      out.push(
        `| ${code(eventName)} | ${code(cell(ev.payload))} | ${blocked} | ${cell(ev.description ?? '') || '—'} |`,
      );
    }
  }
  out.push('');

  // --- States ----------------------------------------------------------------
  out.push('## States');
  out.push('');
  out.push(contract.states.map(code).join(' · '));
  out.push('');
  out.push(
    '> Story 커버리지는 enum prop 값 곱 × boolean prop 당 2 조합 100%가 요구됩니다 (`combinationMatrix` 참조).',
    '> states 는 이 행렬에 포함되지 않습니다 — state 커버리지는 커버리지 축2(contract-states)가 **단언을 가진 테스트**로 따로 강제합니다.',
  );
  out.push('');

  // --- A11y ------------------------------------------------------------------
  out.push('## A11y');
  out.push('');
  out.push('| 항목 | 값 |');
  out.push('|---|---|');
  out.push(`| role | ${code(contract.a11y.role)} |`);
  out.push(`| 키보드 | ${contract.a11y.keyboard.map(code).join(', ')} |`);
  out.push(`| focus-visible | ${contract.a11y.focusVisible ? '필수' : '해당 없음'} |`);
  if (contract.a11y.ariaDisabled)
    out.push(`| aria-disabled | ${cell(contract.a11y.ariaDisabled)} |`);
  if (contract.a11y.ariaBusy) out.push(`| aria-busy | ${cell(contract.a11y.ariaBusy)} |`);
  for (const [ariaName, ariaValue] of Object.entries(contract.a11y.aria ?? {})) {
    out.push(`| ${code(ariaName)} | ${cell(ariaValue)} |`);
  }
  if (contract.a11y.contrastMin !== undefined)
    out.push(`| 최소 대비 | ${contract.a11y.contrastMin}:1 |`);
  out.push('');

  // --- Tokens ----------------------------------------------------------------
  out.push('## Tokens');
  out.push('');
  out.push('| 시각 속성 | 토큰 경로 | CSS 변수 |');
  out.push('|---|---|---|');
  for (const [visual, tokenPath] of Object.entries(contract.tokens)) {
    out.push(`| ${code(visual)} | ${code(tokenPath)} | ${code(cssVarName(tokenPath))} |`);
  }
  out.push('');
  out.push('> 하드코딩 색상/치수 금지 — 시각 속성은 반드시 위 토큰만 참조합니다.');
  out.push('');

  // --- Responsive (선택) -------------------------------------------------------
  if (contract.responsive) {
    out.push('## Responsive');
    out.push('');
    out.push('| 브레이크포인트 | 동작 |');
    out.push('|---|---|');
    out.push(
      `| ${contract.responsive.breakpoints.map(code).join(', ')} | ${code(contract.responsive.behavior)} |`,
    );
    out.push('');
  }

  // --- Deprecated Props (선택) --------------------------------------------------
  const deprecatedProps = contract.compat?.deprecatedProps ?? [];
  if (deprecatedProps.length > 0) {
    out.push('## Deprecated Props');
    out.push('');
    out.push('| 이름 | 대체 | 제거 예정 버전 |');
    out.push('|---|---|---|');
    for (const dep of deprecatedProps) {
      out.push(`| ${code(dep.name)} | ${code(dep.replacedBy)} | ${code(dep.removeIn)} |`);
    }
    out.push('');
  }

  return {
    filePath: path.join(DOCS_COMPONENTS_DIR, `${name}.api.md`),
    content: out.join('\n'),
  };
}
