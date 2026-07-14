/**
 * A77 자기 검증 — 검증기를 검증한다.
 *
 * 실행: pnpm --filter @tds/test-coverage run selftest
 *
 * **왜 필요한가.** A77은 다른 도구(codegen · contract-test)에게 골든 픽스처를 요구한다(축 5).
 * 요구하는 자가 스스로 그것을 갖지 않으면 그 요구는 규율이 아니라 위선이다.
 * 감사 실측: 재작업 8건 중 2건이 **검증 도구의 오판**이었다. 도구의 판정도 검증돼야 한다.
 *
 * **무엇을 증명하는가.** "항상 RED 를 뱉는 도구"는 "항상 GREEN 을 뱉는 도구"만큼 쓸모없다.
 * 이 selftest 는 A77이 **판별한다**는 것을 증명한다 —
 *   1. 커버가 실제로 존재하면 GREEN 이 된다 (기준선)
 *   2. 위반을 심으면 정확히 그 항목에서 RED 가 된다 (검출)
 *   3. 위반을 지우면 기준선으로 돌아온다 (복귀)
 *
 * 픽스처(`__fixtures__/covered/`)는 가상의 미니 리포다 — 실제 apps/packages 를 건드리지 않는다.
 * 돌연변이는 임시 복사본에서만 일어나므로 픽스처 원본은 불변이다.
 */
import fsm from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { checkBlockedWhen } from './axes/contract-blocked-when.ts';
import { checkContractStates } from './axes/contract-states.ts';
import { checkExistence } from './axes/existence.ts';
import { checkFsExceptions } from './axes/fs-exceptions.ts';
import { checkToolFixtures } from './axes/tool-fixtures.ts';
import type { Baseline } from './lib/baseline.ts';
import { loadContracts } from './lib/contracts.ts';
import { loadSpecs } from './lib/specs.ts';
import { scanTests } from './lib/tests.ts';
import { productScopes } from './lib/workspace.ts';
import type { Gap, ScopeRow } from './report.ts';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const FIXTURE = path.join(HERE, '__fixtures__', 'covered');

interface Measured {
  testUnits: number;
  assertionFree: number;
  blockers: Gap[];
  majors: Gap[];
  fsTargets: number;
  fsCells: number;
  fsCovered: number;
  fsTotalElements: number;
  scopes: ScopeRow[];
}

/** 래칫 기준선 0 — 최초 실행과 동등 (후퇴가 성립하지 않는다) */
const NO_BASELINE: Baseline = {
  covered: 0,
  contractStatesTotal: 0,
  contractBlockedTotal: 0,
  source: '(selftest — 기준선 0)',
};

/** 픽스처 루트 하나를 5축으로 측정한다 — index.ts 와 같은 축 함수를 쓴다 (경로만 다르다) */
function measure(root: string, baseline: Baseline = NO_BASELINE): Measured {
  const contracts = loadContracts(root);
  const specs = loadSpecs(root);
  const scan = scanTests(root);
  const scopes = productScopes(root);
  const fs4 = checkFsExceptions(specs, scan.units, baseline);
  const existence = checkExistence(scan, scopes);

  const gaps = [
    ...existence.result.gaps,
    ...checkContractStates(contracts, scan.units, baseline).gaps,
    ...checkBlockedWhen(contracts, scan.units, baseline).gaps,
    ...fs4.result.gaps,
    ...checkToolFixtures(root, scan.units).gaps,
  ];

  return {
    testUnits: scan.units.length,
    assertionFree: scan.assertionFree.length,
    blockers: gaps.filter((g) => g.severity === 'blocker'),
    majors: gaps.filter((g) => g.severity === 'major'),
    fsTargets: fs4.stats.elementsTargeted,
    fsCells: fs4.stats.cellsBehavioral,
    fsCovered: fs4.result.covered,
    fsTotalElements: fs4.stats.elementsTotal,
    scopes: existence.rows,
  };
}

/** 픽스처를 임시 디렉터리에 복사하고 돌연변이를 가한다 — 원본은 불변 */
function mutate(name: string, fn: (root: string) => void, baseline?: Baseline): Measured {
  const tmp = fsm.mkdtempSync(path.join(os.tmpdir(), `a77-${name}-`));
  fsm.cpSync(FIXTURE, tmp, { recursive: true });
  fn(tmp);
  const m = measure(tmp, baseline);
  fsm.rmSync(tmp, { recursive: true, force: true });
  return m;
}

const WIDGET_TEST = 'packages/ui/src/atoms/Widget/Widget.test.tsx';
const abs = (root: string, rel: string) => path.join(root, ...rel.split('/'));

/* ── 단언 ─────────────────────────────────────────────────────────────────── */

let failed = 0;
function check(label: string, ok: boolean, detail: string): void {
  if (ok) {
    console.log(`  PASS  ${label} — ${detail}`);
  } else {
    console.error(`  FAIL  ${label} — ${detail}`);
    failed++;
  }
}

/* ── 1. 기준선 — 커버가 존재하면 GREEN 이 된다 ───────────────────────────── */

console.log('\n[selftest] 1. 기준선 (__fixtures__/covered — 전 항목 커버)');
const base = measure(FIXTURE);
check(
  '기준선 blocker 0건',
  base.blockers.length === 0,
  `blocker ${base.blockers.length}건${base.blockers.length > 0 ? ` → ${base.blockers.map((g) => g.item).join(' / ')}` : ''}`,
);
check('기준선 major 0건', base.majors.length === 0, `major ${base.majors.length}건`);
check(
  '테스트 7건 인식',
  base.testUnits === 7,
  `단언을 가진 실행 단위 ${base.testUnits}건 (렌더 3 + blockedWhen 2 + FS 2)`,
);

/* ── 2. "동작이 정의된 요소" 판정 규칙 ────────────────────────────────────── */

console.log('\n[selftest] 2. FS 판정 규칙 — 정적 요소는 테스트를 요구하지 않는다');
check(
  '정적 라벨(EL-001) · 순수 위임(EL-003) 은 테스트 대상이 아니다',
  base.fsTotalElements === 3 && base.fsTargets === 1,
  `요소 ${base.fsTotalElements}개 중 테스트 대상 ${base.fsTargets}개 (EL-002 만) · 동작 칸 ${base.fsCells}칸 (빈 상태 · 로딩)`,
);

/* ── 3. 검출 — 위반을 심으면 정확히 그 항목이 RED 가 된다 ────────────────── */

console.log('\n[selftest] 3. 검출 검증 (위반을 심고 → 검출 확인)');

// M1 — blockedWhen 테스트를 지운다. 계약이 금지한 동작의 검증이 사라진다.
const m1 = mutate('drop-blockedwhen', (root) => {
  const p = abs(root, WIDGET_TEST);
  const src = fsm.readFileSync(p, 'utf8');
  fsm.writeFileSync(p, src.slice(0, src.indexOf("it('Widget: onClick")), 'utf8');
});
const m1b = m1.blockers.filter((g) => g.id === 'contract-blocked-when');
check(
  'M1 blockedWhen 테스트 삭제 → 축3 blocker 2건',
  m1b.length === 2 && m1.blockers.length === 2,
  `축3 blocker ${m1b.length}건: ${m1b.map((g) => g.item).join(' / ')}`,
);

// M2 — **비발생 단언을 렌더 단언으로 약화한다.** 이름은 그대로 두고 단언만 바꾼다.
//      "disabled 로 렌더된다"는 "onClick 이 발화하지 않는다"를 증명하지 못한다.
//      이 케이스를 잡지 못하면 A77은 이름만 보는 도구다.
const m2 = mutate('weaken-assertion', (root) => {
  const p = abs(root, WIDGET_TEST);
  const src = fsm.readFileSync(p, 'utf8');
  fsm.writeFileSync(
    p,
    src.replace(
      /expect\(spy\)\.not\.toHaveBeenCalled\(\);/g,
      "expect(screen.getByRole('button')).toBeDisabled();",
    ),
    'utf8',
  );
});
const m2b = m2.blockers.filter((g) => g.id === 'contract-blocked-when');
check(
  'M2 비발생 단언 → 렌더 단언으로 약화 → 축3 blocker 2건 (이름은 맞아도 통과시키지 않는다)',
  m2b.length === 2,
  m2b.length === 2
    ? `약화 탐지됨: "${(m2b[0]?.evidence ?? '').slice(0, 58)}…"`
    : `축3 blocker ${m2b.length}건 — 약화를 놓쳤다`,
);

// M3 — 테스트를 전부 지운다. 리포의 현재 상태(테스트 0건)를 픽스처로 재현한다.
const m3 = mutate('no-tests', (root) => {
  fsm.rmSync(abs(root, WIDGET_TEST), { force: true });
  fsm.rmSync(abs(root, 'e2e'), { recursive: true, force: true });
});
check(
  'M3 테스트 0건 → 축1 blocker (--passWithNoTests 에 대한 답)',
  m3.testUnits === 0 && m3.blockers.some((g) => g.id === 'test-existence'),
  `테스트 ${m3.testUnits}건 · blocker ${m3.blockers.length}건 (축1 존재 + 축2 states 3 + 축3 blockedWhen 2)`,
);

// M4 — 단언 없는 play function 만 남긴다. **리포의 실제 상태다** (play 62건 · expect 0건).
//      play 가 있으니 "테스트가 있다"고 세면 A77은 자기가 고발하려던 초록불을 재생산한다.
const m4 = mutate('assertion-free-play', (root) => {
  fsm.rmSync(abs(root, WIDGET_TEST), { force: true });
  fsm.rmSync(abs(root, 'e2e'), { recursive: true, force: true });
  fsm.writeFileSync(
    abs(root, 'packages/ui/src/atoms/Widget/Widget.stories.tsx'),
    [
      "import { userEvent, within } from '@storybook/test';",
      "import { Widget } from './Widget';",
      "const meta = { title: 'Atoms/Widget', component: Widget };",
      'export default meta;',
      '// 상태를 만들기만 하고 아무것도 단언하지 않는다 — 실패할 수 없는 play',
      'export const Disabled = {',
      '  args: { disabled: true },',
      '  play: async ({ canvasElement }) => {',
      "    await userEvent.hover(within(canvasElement).getByRole('button'));",
      '  },',
      '};',
      'export const Loading = {',
      '  args: { loading: true },',
      '  play: async ({ canvasElement }) => {',
      "    await userEvent.click(within(canvasElement).getByRole('button'));",
      '  },',
      '};',
    ].join('\n'),
    'utf8',
  );
});
check(
  'M4 단언 없는 play 2건만 존재 → 여전히 축1 blocker (테스트로 세지 않는다)',
  m4.testUnits === 0 &&
    m4.assertionFree === 2 &&
    m4.blockers.some((g) => g.id === 'test-existence'),
  `테스트 ${m4.testUnits}건 · 단언 없는 실행 단위 ${m4.assertionFree}건 → 초록불을 만들지 못한다`,
);

// M5 — 계약의 states 를 비운다. 대조 자체가 불가능해진다.
//      "잴 것이 없으니 통과"가 아니라 "잴 수 없으니 실패"다 (ADR-0009 의 교훈).
const m5 = mutate('empty-states', (root) => {
  const p = abs(root, 'contracts/Widget.contract.json');
  const c = JSON.parse(fsm.readFileSync(p, 'utf8'));
  c.states = [];
  fsm.writeFileSync(p, JSON.stringify(c, null, 2), 'utf8');
});
check(
  'M5 계약 states 공백 → 축2 blocker "대조 불가" (측정 불가 ≠ 통과)',
  m5.blockers.some((g) => g.id === 'contract-states' && g.item.includes('대조 불가')),
  m5.blockers.find((g) => g.id === 'contract-states')?.evidence.slice(0, 70) ?? '탐지 실패',
);

// M6 — 골든 픽스처를 지운다 (축 5 — 검증기를 검증한다).
const m6 = mutate('drop-golden', (root) => {
  fsm.rmSync(abs(root, 'tools/codegen/src/__fixtures__'), { recursive: true, force: true });
});
check(
  'M6 codegen 골든 픽스처 삭제 → 축5 major',
  m6.majors.some((g) => g.id === 'tool-golden-fixtures' && g.source === 'tools/codegen'),
  `축5 major ${m6.majors.filter((g) => g.id === 'tool-golden-fixtures').length}건`,
);

/* ── 3b. 축 1 스코프 분리 + 워크스페이스 파생 (A00/A01 판정 1) ───────────── */

console.log('\n[selftest] 3b. 축 1 — 스코프 분리 · 워크스페이스 파생');

check(
  '워크스페이스에서 제품 스코프만 파생 (tools/* 는 유효한 패키지지만 제외)',
  base.scopes.length === 1 && base.scopes[0]?.dir === 'packages/ui',
  `스코프 ${base.scopes.length}개: ${base.scopes.map((s) => `${s.dir}(${s.name})`).join(', ')} — tools/codegen · tools/contract-test 는 package.json 이 있어도 축1 대상이 아니다`,
);

// M7 — **새 패키지를 추가한다.** 하드코딩이었다면 이 패키지는 영원히 측정되지 않는다.
//      워크스페이스 파생이면 자동으로 축 1의 대상이 되고, 테스트가 0건이므로 blocker 다.
const m7 = mutate('new-package', (root) => {
  const dir = abs(root, 'apps/newapp');
  fsm.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fsm.writeFileSync(
    path.join(dir, 'package.json'),
    '{ "name": "@tds/newapp", "version": "0.0.0", "private": true }\n',
    'utf8',
  );
});
const m7scope = m7.scopes.find((s) => s.dir === 'apps/newapp');
check(
  'M7 새 패키지(apps/newapp) 추가 → 축1 스코프에 **자동 편입** + blocker',
  m7.scopes.length === 2 &&
    m7scope?.status === 'BLOCKER' &&
    m7.blockers.some((g) => g.id === 'test-existence' && g.item.includes('apps/newapp')),
  `스코프 ${m7.scopes.length}개 (${m7.scopes.map((s) => s.dir).join(', ')}) — 새 패키지가 손대지 않아도 측정 대상이 됐다`,
);

// M8 — **한쪽 스코프에만 테스트가 있다.** 이전 버전(전역 카운트)의 구멍을 정확히 재현한다.
//      packages/ui 는 테스트 7건으로 초록, apps/newapp 은 0건 — 초록이 빈칸을 가리면 안 된다.
const m8 = mutate('one-scope-green', (root) => {
  const dir = abs(root, 'apps/newapp');
  fsm.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fsm.writeFileSync(
    path.join(dir, 'package.json'),
    '{ "name": "@tds/newapp", "version": "0.0.0", "private": true }\n',
    'utf8',
  );
});
check(
  'M8 packages/ui 초록(7건) + apps/newapp 0건 → **초록이 빈칸을 가리지 못한다** (축1 blocker)',
  m8.testUnits === 7 &&
    m8.scopes.find((s) => s.dir === 'packages/ui')?.status === 'PASS' &&
    m8.scopes.find((s) => s.dir === 'apps/newapp')?.status === 'BLOCKER',
  `전역 테스트 ${m8.testUnits}건인데도 apps/newapp 이 BLOCKER — 이것이 §5-1 구멍의 해소다`,
);

/* ── 3b-2. 파서 회귀 — 구조 분해 시그니처 (A30 신고: 거짓 음성) ──────────── */

console.log('\n[selftest] 3b-2. 파서 — play function 의 구조 분해 시그니처 (거짓 음성 회귀 방지)');

/** 지정한 play 헬퍼 본문을 가진 stories 파일을 픽스처에 심는다 */
function withStories(name: string, storiesBody: string): Measured {
  return mutate(name, (root) => {
    fsm.writeFileSync(
      abs(root, 'packages/ui/src/atoms/Widget/Widget.stories.tsx'),
      storiesBody,
      'utf8',
    );
  });
}

const STORY_HEAD = [
  "import { expect, userEvent, within } from '@storybook/test';",
  "import { Widget } from './Widget';",
  "const meta = { title: 'Atoms/Widget', component: Widget };",
  'export default meta;',
].join('\n');

// (a) **거짓 음성 방지** — 구조 분해 + 타입 주석 시그니처인데 본문에 expect 가 있다.
//     이것이 Storybook play function 의 **표준 시그니처**다. 반드시 테스트로 집계돼야 한다.
const p1 = withStories(
  'destructured-with-expect',
  [
    STORY_HEAD,
    'const assertDisabled = async ({ canvasElement }: { canvasElement: HTMLElement }) => {',
    "  const button = within(canvasElement).getByRole('button');",
    '  await userEvent.hover(button);',
    '  await expect(button).toBeDisabled();',
    '};',
    "export const Disabled = { args: { disabled: true }, name: 'Widget: renders disabled state', play: assertDisabled };",
  ].join('\n'),
);
check(
  '(a) 구조 분해 + 타입 주석 시그니처 + 본문에 expect → **테스트로 집계** (거짓 음성 없음)',
  p1.testUnits === 8 && p1.assertionFree === 0,
  `테스트 ${p1.testUnits}건 (기준선 7 + play 1) · 단언 없는 단위 ${p1.assertionFree}건 — 파라미터의 \`{\` 를 본문으로 오인하지 않는다`,
);

// (b) **거짓 양성 방지** — 같은 구조 분해 시그니처인데 본문에 expect 가 **없다.**
//     한쪽만 고치면 반대쪽이 뚫린다. 시그니처를 건너뛴 결과가 "본문에 단언 있음"이 되면 안 된다.
const p2 = withStories(
  'destructured-no-expect',
  [
    STORY_HEAD,
    'const justHover = async ({ canvasElement }: { canvasElement: HTMLElement }) => {',
    "  await userEvent.hover(within(canvasElement).getByRole('button'));",
    '};',
    "export const Hover = { args: {}, name: 'Widget: hover', play: justHover };",
  ].join('\n'),
);
check(
  '(b) 구조 분해 시그니처 + 본문에 expect **없음** → **집계 안 됨** (거짓 양성 없음)',
  p2.testUnits === 7 && p2.assertionFree === 1,
  `테스트 ${p2.testUnits}건 (기준선 7 = 증가 없음) · 단언 없는 단위 ${p2.assertionFree}건 — 시그니처를 건너뛰었다고 단언이 생기지는 않는다`,
);

// (c) 중첩 구조 분해 · 기본값 · 인라인 play — 시그니처 변형 전반
const p3 = withStories(
  'destructured-variants',
  [
    STORY_HEAD,
    'const nested = async ({ canvasElement, args: { disabled } = { disabled: false } }: any) => {',
    "  const button = within(canvasElement).getByRole('button');",
    '  await expect(button).toBeDisabled();',
    '  void disabled;',
    '};',
    "export const Nested = { name: 'Widget: renders loading state', play: nested };",
    'export const Inline = {',
    "  name: 'Widget: renders default state',",
    '  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {',
    "    await expect(within(canvasElement).getByRole('button')).toBeVisible();",
    '  },',
    '};',
  ].join('\n'),
);
check(
  '(c) 중첩 구조 분해 + 기본값 + 인라인 play → 둘 다 집계',
  p3.testUnits === 9 && p3.assertionFree === 0,
  `테스트 ${p3.testUnits}건 (기준선 7 + 참조형 1 + 인라인 1) · 단언 없는 단위 ${p3.assertionFree}건`,
);

/* ── 3c. 축 4 래칫 — 후퇴 금지 (A00/A01 판정 2) ──────────────────────────── */

console.log('\n[selftest] 3c. 축 4 래칫 — 후퇴 금지');

check(
  '기준선 0 (최초 실행) → 커버 2칸, 후퇴 없음 · exit 2 사유 아님',
  base.fsCovered === 2 && !base.blockers.some((g) => g.id === 'fs-exception-axes'),
  `커버 ${base.fsCovered}칸 / 기준선 0 — 과거가 없으면 후퇴도 없다`,
);

// M9 — **기준선을 인위적으로 올린 뒤 커버 칸을 줄인다.** e2e 테스트 1건을 지워 2칸 → 1칸.
//      기준선 2칸이므로 1칸 후퇴 → blocker 여야 한다.
const m9 = mutate(
  'ratchet-regress',
  (root) => {
    const p = abs(root, 'e2e/widget/FS-009-widget.spec.ts');
    const src = fsm.readFileSync(p, 'utf8');
    // '로딩' 축 테스트를 삭제한다 → 커버 2칸 → 1칸
    fsm.writeFileSync(p, src.slice(0, src.indexOf("it('FS-009-EL-002: 로딩")), 'utf8');
  },
  {
    covered: 2,
    contractStatesTotal: 0,
    contractBlockedTotal: 0,
    source: '(selftest — 인위적 기준선 2칸)',
  },
);
const m9r = m9.blockers.filter((g) => g.id === 'fs-exception-axes');
check(
  'M9 커버 2칸 → 1칸 (기준선 2칸) → **래칫 blocker** (major 축이지만 후퇴는 차단한다)',
  m9.fsCovered === 1 && m9r.length === 1 && (m9r[0]?.item.includes('커버리지 후퇴') ?? false),
  `커버 ${m9.fsCovered}칸 < 기준선 2칸 → ${m9r.length > 0 ? m9r[0]?.item.replace(/\*/g, '') : '탐지 실패'}`,
);

// M10 — 후퇴를 원복한다(픽스처 원본 그대로). 같은 기준선 2칸에서 blocker 가 사라져야 한다.
const m10 = measure(FIXTURE, {
  covered: 2,
  contractStatesTotal: 0,
  contractBlockedTotal: 0,
  source: '(selftest — 인위적 기준선 2칸)',
});
check(
  'M10 후퇴 원복 → 커버 2칸 = 기준선 2칸 → 래칫 blocker 소멸 (동률은 후퇴가 아니다)',
  m10.fsCovered === 2 && !m10.blockers.some((g) => g.id === 'fs-exception-axes'),
  `커버 ${m10.fsCovered}칸 = 기준선 2칸 — 단조 증가만 요구한다`,
);

// M11 — 커버가 기준선보다 **늘면** 당연히 통과. 래칫은 전진을 막지 않는다.
const m11 = measure(FIXTURE, {
  covered: 1,
  contractStatesTotal: 0,
  contractBlockedTotal: 0,
  source: '(selftest — 기준선 1칸)',
});
check(
  'M11 커버 2칸 > 기준선 1칸 → 통과 (래칫은 전진을 막지 않는다)',
  !m11.blockers.some((g) => g.id === 'fs-exception-axes'),
  `커버 ${m11.fsCovered}칸 > 기준선 1칸`,
);

/* ── 3d. 분모 세탁 — 계약 표면 축소 감시 ─────────────────────────────────── */

console.log('\n[selftest] 3d. 분모 세탁 (계약에서 항목을 지워 커버리지를 올리는 경로)');

// M12 — **테스트는 그대로 두고 계약에서 상태 하나를 지운다.**
//       미커버가 저절로 사라지고 커버리지가 "완벽"해진다. 테스트는 한 줄도 안 늘었는데.
//       기준선(직전 리포트)의 states 총수 3칸과 대조해 표면 축소를 신고해야 한다.
const m12 = mutate(
  'denominator-laundering',
  (root) => {
    const p = abs(root, 'contracts/Widget.contract.json');
    const c = JSON.parse(fsm.readFileSync(p, 'utf8')) as { states: string[] };
    c.states = c.states.filter((s) => s !== 'loading'); // 3칸 → 2칸
    fsm.writeFileSync(p, JSON.stringify(c, null, 2), 'utf8');
    // loading 렌더 테스트도 지운다 — 그래도 커버리지는 2/2 = 100% 다
    const t = abs(root, WIDGET_TEST);
    const src = fsm.readFileSync(t, 'utf8');
    fsm.writeFileSync(
      t,
      src.replace(/it\('Widget: renders loading state'[\s\S]*?\}\);\n/, ''),
      'utf8',
    );
  },
  {
    covered: 0,
    contractStatesTotal: 3,
    contractBlockedTotal: 2,
    source: '(selftest — 직전 states 3칸)',
  },
);
const m12s = m12.majors.filter((g) => g.id === 'contract-states' && g.item.includes('표면 축소'));
check(
  'M12 계약에서 state 삭제 + 그 테스트 삭제 → 커버리지는 100%지만 **표면 축소 major** 로 신고',
  m12s.length === 1 && !m12.blockers.some((g) => g.id === 'contract-states'),
  m12s.length === 1
    ? `${m12s[0]?.item.replace(/\*/g, '')} — blocker 로 발명하지 않고 A19에 확인을 요구한다`
    : '표면 축소를 놓쳤다 — 분모 세탁이 통과한다',
);

check(
  '표면이 그대로면 표면 축소 신고 없음 (거짓 양성 없음)',
  !measure(FIXTURE, {
    covered: 0,
    contractStatesTotal: 3,
    contractBlockedTotal: 2,
    source: '(selftest — 동일 표면)',
  }).majors.some((g) => g.item.includes('표면 축소')),
  'states 3칸 = 기준선 3칸 · blockedWhen 2칸 = 기준선 2칸 → 신고 없음',
);

/* ── 3e. 형제 컴포넌트 이름 충돌 (거짓 양성) ─────────────────────────────── */

console.log('\n[selftest] 3e. 컴포넌트 귀속 — 부분 문자열 충돌 (Card ⊂ ListCard)');

// M13 — **형제 컴포넌트의 테스트가 짧은 이름의 계약을 대신 덮어 주는가.**
//       실제 리포의 위험: `Card` ⊂ `ListCard`·`StatsCard`·`TodoCard`.
//       픽스처에서 재현: Widget 의 테스트를 전부 `SubWidget` 으로 개명하고 다른 폴더로 옮긴다.
//       → Widget 계약은 이제 **자기 테스트가 하나도 없다.** blocker 가 떠야 한다.
//       구 버전(단순 부분 문자열)은 'subwidget…' 안의 'widget' 을 보고 Widget 을 덮었다고 셌다.
const m13 = mutate('sibling-name-collision', (root) => {
  const from = abs(root, WIDGET_TEST);
  const src = fsm.readFileSync(from, 'utf8');
  fsm.rmSync(from, { force: true });
  const dir = abs(root, 'packages/ui/src/atoms/SubWidget');
  fsm.mkdirSync(dir, { recursive: true });
  fsm.writeFileSync(
    path.join(dir, 'SubWidget.test.tsx'),
    src.replace(/Widget:/g, 'SubWidget:').replace(/<Widget /g, '<SubWidget '),
    'utf8',
  );
});
const m13s = m13.blockers.filter((g) => g.id === 'contract-states');
const m13b = m13.blockers.filter((g) => g.id === 'contract-blocked-when');
check(
  'M13 형제(SubWidget) 테스트는 Widget 계약을 덮지 못한다 → 축2 blocker 3건 + 축3 blocker 2건',
  m13s.length === 3 && m13b.length === 2,
  m13s.length === 3 && m13b.length === 2
    ? 'Widget 은 자기 테스트가 없으므로 미커버 — 형제의 초록불을 빌려오지 못한다'
    : `축2 ${m13s.length}건 · 축3 ${m13b.length}건 — 형제 테스트가 오귀속됐다 (거짓 양성)`,
);

check(
  '정상 귀속은 유지된다 (Widget 자기 테스트는 Widget 을 덮는다)',
  base.blockers.length === 0,
  '기준선에서 Widget 테스트 7건이 Widget 계약을 정상 커버 — 경계 강화가 참 양성을 죽이지 않았다',
);

/* ── 4. 복귀 — 위반을 지우면 기준선으로 돌아온다 ──────────────────────────── */

console.log('\n[selftest] 4. 기준선 복귀 (돌연변이 제거 → 재측정)');
const restored = measure(FIXTURE);
check(
  '기준선 복귀 — blocker 0 · major 0 · 테스트 7건',
  restored.blockers.length === 0 &&
    restored.majors.length === 0 &&
    restored.testUnits === base.testUnits,
  `blocker ${restored.blockers.length} · major ${restored.majors.length} · 테스트 ${restored.testUnits}건 (원본 픽스처 불변)`,
);

/* ── 결과 ─────────────────────────────────────────────────────────────────── */

console.log('');
if (failed > 0) {
  console.error(`[selftest] FAIL — ${failed}건. A77의 판정을 신뢰할 수 없다. exit 1`);
  process.exitCode = 1;
} else {
  console.log(
    '[selftest] PASS — A77은 판별한다: 커버되면 GREEN, 위반을 심으면 그 항목이 RED. exit 0',
  );
  process.exitCode = 0;
}
