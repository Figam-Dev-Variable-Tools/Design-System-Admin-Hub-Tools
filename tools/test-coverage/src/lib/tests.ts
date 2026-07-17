/**
 * 테스트 단위 수집 — vitest 테스트 + Storybook play function.
 *
 * **왜 러너를 돌리지 않고 정적으로 세는가.**
 * `pnpm test` 는 `vitest run --passWithNoTests` 다. 그 exit code 는 **테스트가 0건일 때도 0** 이다.
 * 러너의 초록불을 입력으로 삼는 순간 이 도구는 자기가 고발하려던 바로 그 거짓말을 물려받는다.
 * 그래서 테스트 커버리지 은 러너의 판정이 아니라 **소스에 실제로 존재하는 단언**을 센다.
 * (러너 JSON 이 있으면 교차 검증만 한다 — `ingestRunnerReport`. 판정 권한은 주지 않는다.)
 *
 * 검증 대상(apps/** · packages/** · e2e/**)은 전부 **읽기 전용**이다 — 테스트 커버리지은 테스트를 대신 쓰지 않는다.
 */
import {
  ASSERTION_PATTERNS,
  NON_INVOCATION_PATTERNS,
  SPY_PATTERNS,
  STORY_FILE_SUFFIXES,
  TEST_FILE_SUFFIXES,
  TEST_ROOTS,
} from '../thresholds.ts';
import { lineOf, matchBracket, readText, skipString, walkFiles } from './fsutil.ts';

export type TestKind = 'vitest' | 'play';

export interface TestUnit {
  kind: TestKind;
  /** 리포 루트 기준 POSIX 경로 */
  file: string;
  line: number;
  /** 테스트/스토리 이름 — 대조의 유일한 키다 (E2E 테스트 명명 규칙의 전제) */
  name: string;
  /** 스토리·테스트가 속한 컴포넌트 추정치 (계약 대조 스코프) */
  component: string | null;
  /** 단언을 1개 이상 가지는가 — **없으면 테스트로 세지 않는다** */
  hasAssertion: boolean;
  /** 스파이(fn())를 만드는가 — 비발생 관찰 수단의 존재 */
  hasSpy: boolean;
  /** 비발생 단언(not.toHaveBeenCalled 등)을 가지는가 — blockedWhen 검증의 필수 조건 */
  hasNonInvocationAssertion: boolean;
}

export interface TestScan {
  /** 단언을 가진 진짜 테스트 */
  units: TestUnit[];
  /** 단언이 없어 테스트로 세지 않은 실행 단위 — 리포트에 NOT_VERIFIED 로 드러낸다 */
  assertionFree: TestUnit[];
  files: { tests: string[]; stories: string[] };
}

const STORY_META_TITLE = /title\s*:\s*['"`]([^'"`]+)['"`]/;

function anyMatch(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text));
}

/** `Atoms/Button` · `Molecules/Tabs` → `Button` · `Tabs` */
function componentFromTitle(title: string): string {
  const parts = title.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? title;
}

/**
 * `packages/ui/src/atoms/Button/Button.stories.tsx` → `Button`
 * `apps/admin/src/pages/login/LoginForm.test.tsx` → `LoginForm`
 */
function componentFromPath(file: string): string | null {
  const base = file.split('/').pop() ?? '';
  const stem = base.replace(/\.(stories|test|spec)\.(tsx?|jsx?)$/, '');
  return stem.length > 0 ? stem : null;
}

/* ── vitest 테스트 ─────────────────────────────────────────────────────────── */

/**
 * `it('...')` · `test('...')` · `it.each(...)('...')` 의 제목과 본문을 뽑는다.
 * 본문 범위는 해당 호출의 여는 괄호부터 대응 닫는 괄호까지 (문자열·주석 인지 브래킷 매칭).
 */
const TEST_CALL =
  /\b(?:it|test)\s*(?:\.\s*(?:each\s*(?:\([\s\S]*?\)|`[\s\S]*?`)|concurrent|only|skip|todo|fails))?\s*\(/g;

function collectVitest(file: string, src: string): TestUnit[] {
  const out: TestUnit[] = [];
  TEST_CALL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TEST_CALL.exec(src)) !== null) {
    const openParen = m.index + m[0].length - 1;
    // 제목: 여는 괄호 바로 뒤의 문자열 리터럴
    let i = openParen + 1;
    while (i < src.length && /\s/.test(src[i] ?? '')) i++;
    const q = src[i];
    if (q !== '"' && q !== "'" && q !== '`') continue; // 제목이 문자열이 아니면 대조 불가 — 건너뛴다
    const end = skipString(src, i);
    const name = src.slice(i + 1, end - 1);

    const closeParen = matchBracket(src, openParen);
    const body = src.slice(openParen, Math.min(closeParen + 1, src.length));

    out.push({
      kind: 'vitest',
      file,
      line: lineOf(src, m.index),
      name,
      component: componentFromPath(file),
      hasAssertion: anyMatch(ASSERTION_PATTERNS, body),
      hasSpy: anyMatch(SPY_PATTERNS, body),
      hasNonInvocationAssertion: anyMatch(NON_INVOCATION_PATTERNS, body),
    });
    TEST_CALL.lastIndex = Math.min(closeParen + 1, src.length);
  }
  return out;
}

/* ── Storybook play function ──────────────────────────────────────────────── */

/**
 * 선언 위치에서 **함수 본문**을 뽑는다 — 파라미터 목록을 본문으로 오인하지 않는다.
 *
 * **이 함수는 테스트 커버리지의 거짓 음성(false negative) 버그를 고친 자리다.**
 * 구 버전은 선언 뒤의 **첫 `{`** 를 본문 시작으로 읽었다. 그런데 Storybook play function 의
 * **표준 시그니처는 구조 분해**다:
 *
 *     const hover = async ({ canvasElement }) => {   // ← 이 `{` 는 파라미터지 본문이 아니다
 *       await expect(button).toBeEnabled();          // ← 그래서 이 단언을 보지 못했다
 *     };
 *
 * 결과: **단언이 실제로 있는데 `assertionFree` 로 집계됐다.** 컴포넌트 엔지니어은 이 오탐을 피하려고 자기
 * 헬퍼 시그니처를 비구조분해(`(ctx: PlayCtx)`)로 바꾸고 그 사유를 주석으로 남겼다 —
 * **도구를 만족시키려 컨벤션을 비튼 것이다. 꼬리가 개를 흔들었다.**
 *
 * 테스트 커버리지은 "단언 없는 실행 단위는 테스트가 아니다"라는 원칙 위에 서 있다. 그 판정이 파서 버그로
 * 거짓 음성을 내면 **정직한 테스트가 '단언 없음'으로 몰리고 작성자가 코드를 비틀게 된다.**
 * **틀린 빨간불은 사람이 게이트를 우회하게 만드는 가장 빠른 길이다** — 거짓 양성만큼 위험하다.
 *
 * 그래서 시그니처를 **구조적으로 건너뛴다**: 파라미터 괄호 `(...)`, 타입 인자 `<...>`,
 * 타입 주석의 중괄호(`({ a }: { a: HTMLElement })`)를 전부 브래킷 매칭으로 통째로 넘기고,
 * **화살표 `=>` 뒤** 또는 **파라미터 괄호를 지난 뒤의 `{`** 만 본문으로 인정한다.
 *
 * 지원: `({ a })` · `({ a } = {})` · `({ a: { b } })` · `({ a }: Ctx)` · `(ctx: Ctx)` ·
 *       `async` · `function f(...) {}` · 표현식 본문 (`=> expect(x).toBe(1)`).
 */
function extractFunctionBody(src: string, from: number): string | null {
  const limit = Math.min(src.length, from + 4000);
  let i = from;

  while (i < limit) {
    const c = src[i];
    if (c === undefined) break;

    // 주석·문자열은 통째로 건너뛴다
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      i = e === -1 ? src.length : e + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }

    // 파라미터 목록 `(...)` · 타입 인자/인덱스 `[...]` — **통째로** 건너뛴다.
    // 구조 분해 `({ canvasElement })` 와 타입 주석 `: { canvasElement: HTMLElement }` 의
    // 중괄호가 여기서 함께 소비된다. 이것이 이 버그 수정의 핵심이다.
    if (c === '(' || c === '[') {
      i = matchBracket(src, i) + 1;
      continue;
    }

    // 화살표 → 그 뒤가 본문이다
    if (c === '=' && src[i + 1] === '>') {
      i += 2;
      while (i < src.length && /\s/.test(src[i] ?? '')) i++;
      if (src[i] === '{') {
        const end = matchBracket(src, i);
        return src.slice(i, Math.min(end + 1, src.length));
      }
      // 표현식 본문 (`=> expect(x).toBe(1)`) — 최상위 `;` 까지가 본문이다
      return src.slice(i, expressionEnd(src, i));
    }

    // 파라미터 괄호를 이미 지나온 뒤 만난 `{` → `function f(a) { ... }` 의 본문
    if (c === '{') {
      const end = matchBracket(src, i);
      return src.slice(i, Math.min(end + 1, src.length));
    }

    i++;
  }
  return null;
}

/** 표현식 본문의 끝 — 최상위 `;` 또는 소스 끝 (괄호·문자열은 건너뛴다) */
function expressionEnd(src: string, from: number): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === undefined) break;
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      i = matchBracket(src, i) + 1;
      continue;
    }
    if (c === ';') return i;
    i++;
  }
  return src.length;
}

/** 모듈 스코프의 `const hover = async ({ canvasElement }) => { ... }` — `play: hover` 참조 해석용 */
function moduleScopeFunctions(src: string): Map<string, string> {
  const map = new Map<string, string>();
  const decl = /(?:^|\n)\s*(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)\s*(?:[:=]|\()/g;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(src)) !== null) {
    const ident = m[1];
    if (ident === undefined) continue;
    // 선언의 마지막 문자(`=` · `:` · `(`)에서 스캔을 시작한다.
    // `(` 인 경우(= `function f(`) 여기서 시작해야 파라미터 목록이 통째로 건너뛰어진다.
    const body = extractFunctionBody(src, m.index + m[0].length - 1);
    if (body === null) continue;
    map.set(ident, body);
  }
  return map;
}

const STORY_EXPORT = /export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*\{/g;

function collectPlay(file: string, src: string): TestUnit[] {
  const out: TestUnit[] = [];
  const metaTitle = STORY_META_TITLE.exec(src);
  const rawTitle = metaTitle?.[1];
  const component = rawTitle !== undefined ? componentFromTitle(rawTitle) : componentFromPath(file);
  const fns = moduleScopeFunctions(src);

  STORY_EXPORT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STORY_EXPORT.exec(src)) !== null) {
    const exportName = m[1] ?? '(anonymous)';
    const braceStart = m.index + m[0].length - 1;
    const braceEnd = matchBracket(src, braceStart);
    const block = src.slice(braceStart, Math.min(braceEnd + 1, src.length));
    STORY_EXPORT.lastIndex = Math.min(braceEnd + 1, src.length);

    const playRef = /play\s*:\s*([A-Za-z_$][\w$]*)\s*[,}]/.exec(block);
    const playInline = /play\s*:\s*(?:async\s*)?(?:\(|[A-Za-z_$][\w$]*\s*=>)/.test(block);
    if (playRef === null && !playInline) continue; // play 가 없는 스토리는 실행 단위가 아니다

    // play 본문 = 스토리 블록 + (참조된 경우) 모듈 스코프 함수 본문
    const playIdent = playRef?.[1];
    const referenced = playIdent !== undefined ? (fns.get(playIdent) ?? '') : '';
    const body = `${block}\n${referenced}`;

    // 스토리 이름: `name: '...'` 이 있으면 그것, 없으면 export 식별자
    const nameField = /\bname\s*:\s*['"`]([^'"`]+)['"`]/.exec(block);
    const name = nameField?.[1] ?? exportName;

    out.push({
      kind: 'play',
      file,
      line: lineOf(src, m.index),
      name,
      component,
      hasAssertion: anyMatch(ASSERTION_PATTERNS, body),
      hasSpy: anyMatch(SPY_PATTERNS, body),
      hasNonInvocationAssertion: anyMatch(NON_INVOCATION_PATTERNS, body),
    });
  }
  return out;
}

/* ── 진입점 ───────────────────────────────────────────────────────────────── */

export function scanTests(root: string): TestScan {
  const all = TEST_ROOTS.flatMap((r) => walkFiles(root, r));
  const testFiles = all.filter((f) => TEST_FILE_SUFFIXES.some((s) => f.endsWith(s)));
  const storyFiles = all.filter((f) => STORY_FILE_SUFFIXES.some((s) => f.endsWith(s)));

  const found: TestUnit[] = [
    ...testFiles.flatMap((f) => collectVitest(f, readText(root, f))),
    ...storyFiles.flatMap((f) => collectPlay(f, readText(root, f))),
  ];

  return {
    units: found.filter((u) => u.hasAssertion),
    assertionFree: found.filter((u) => !u.hasAssertion),
    files: { tests: testFiles, stories: storyFiles },
  };
}

/** 이름 정규화 — 대소문자·구분자 무시 대조용. `focus-visible` ↔ `FocusVisible` ↔ `focus visible` */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}
