// TokenGuard — 토큰 회귀 방지 가드 (TOKEN-01 · TOKEN-02)
//
// packages/ui 의 모든 컴포넌트 CSS 를 스캔해 '토큰만 참조' 불변식을 기계적으로 못 박는다.
// contract-test 의 token 축이 컴포넌트별 hex/px 를 잡지만, 여기서는 (1) 전 CSS 를 한 번에,
// (2) CSS border/outline 키워드(thin/medium/thick) 금지와 (3) 모든 :focus-visible 링이
// 단일 토큰(border-width.medium)에서 렌더되는지, (4) box-shadow 가 raw 값이 아니라 토큰
// 참조인지를 함께 검증한다 — 새 CSS 가 이 규칙을 깨면 커밋 단계에서 실패한다.
import { describe, expect, it } from 'vitest';

// 모든 컴포넌트 CSS 를 raw 문자열로 로드 (atoms/molecules/organisms). generated/ 는 src 밖이라 대상 아님.
const cssModules = import.meta.glob('../**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const cssEntries = Object.entries(cssModules);

/**
 * 주석을 걷어낸 소스 — 미정의 참조 검사는 이 위에서만 센다.
 *
 * 설명 주석이 없는 토큰 이름을 예시로 드는 일이 실제로 있다("`var(--tds-color-surface-sunken)`
 * 는 없는 토큰이다"). 주석까지 세면 그런 설명이 위반으로 잡혀, 결함을 설명하는 것이 결함이 된다.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/** 선언 라인만 (셀렉터/주석/공백 제외) — 대략적 필터 */
function declarationLines(css: string): { line: string; n: number }[] {
  return css
    .split(/\r?\n/)
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => line.includes(':') && !line.trimStart().startsWith('/*'));
}

/** selector { ... } 블록 본문 추출 (첫 매칭) */
function blocksFor(css: string, selectorSuffix: string): string[] {
  const bodies: string[] = [];
  const re = new RegExp(`([^{}]*${selectorSuffix})\\s*\\{([^}]*)\\}`, 'g');
  for (const m of css.matchAll(re)) {
    if (m[2] !== undefined) bodies.push(m[2]);
  }
  return bodies;
}

describe('TokenGuard — TOKEN-01: 하드코딩 값 0건 (전 컴포넌트 CSS)', () => {
  // [이 가드가 공허해질 수 있는 두 경로를 스스로 막는다]
  //  1) glob 이 아무것도 못 잡는 경우 → 스캔 대상 0건 위에서 모든 단언이 참이 된다.
  //  2) vitest css:false 로 `?raw` 가 **빈 문자열로 스텁**되는 경우 → 파일 목록은 있는데 내용이 없어
  //     역시 모든 단언이 참이 된다 (vitest.config.ts 의 css:true 주석 참조).
  it('스캔 대상 CSS 가 내용과 함께 로드된다 (빈 스텁 위에서 통과하지 않는다)', () => {
    expect(cssEntries.length).toBeGreaterThan(10);
    for (const [path, css] of cssEntries) {
      expect(css.length, `${path} 가 빈 문자열로 로드됐다 — vitest css:true 확인`).toBeGreaterThan(
        0,
      );
    }
    expect(cssEntries.some(([, css]) => css.includes('var(--tds-'))).toBe(true);
  });

  it('primitive tier 밖 하드코딩 hex(#RGB..#RRGGBBAA)가 없다', () => {
    const hits: string[] = [];
    for (const [path, css] of cssEntries) {
      for (const { line, n } of declarationLines(css)) {
        if (/#[0-9a-fA-F]{3,8}\b/.test(line)) hits.push(`${path}:${n} → ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('px 리터럴이 없다 (0/상대단위 제외 — 모든 치수는 토큰 참조)', () => {
    const hits: string[] = [];
    for (const [path, css] of cssEntries) {
      for (const { line, n } of declarationLines(css)) {
        for (const m of line.matchAll(/\b(\d+(?:\.\d+)?)px\b/g)) {
          if (m[1] !== undefined && Number.parseFloat(m[1]) !== 0)
            hits.push(`${path}:${n} → ${m[0]}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('CSS border/outline 키워드(thin/medium/thick)를 값으로 쓰지 않는다', () => {
    const hits: string[] = [];
    // 콜론 직후에 오는 bare 키워드만 잡는다 — var(--tds-border-width-medium) 안의 medium 은 매칭되지 않는다
    const re = /\b(?:outline|border(?:-[a-z]+)*)\s*:\s*(?:thin|medium|thick)\b/;
    for (const [path, css] of cssEntries) {
      for (const { line, n } of declarationLines(css)) {
        if (re.test(line)) hits.push(`${path}:${n} → ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('TokenGuard — TOKEN-02: 단일 focus-ring 토큰', () => {
  it('모든 :focus-visible outline 선언이 var(--tds-border-width-medium) 로 두께를 렌더한다', () => {
    const hits: string[] = [];
    for (const [path, css] of cssEntries) {
      for (const body of blocksFor(css, ':focus-visible')) {
        const outline = body
          .split(/;/)
          .map((d) => d.trim())
          .find((d) => /^outline\s*:/.test(d));
        if (outline === undefined) continue; // outline 없이 다른 방식으로 링을 그리는 블록은 대상 아님
        if (!outline.includes('var(--tds-border-width-medium)')) hits.push(`${path} → ${outline}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('TokenGuard — TOKEN-04: elevation 은 shadow 토큰에서만 온다', () => {
  /**
   * box-shadow 를 **elevation 이 아닌 렌더링 기법**으로 쓰는 사전 합의된 예외.
   * Checkbox 의 체크 표면 링은 그림자가 아니라 border-width + surface 토큰으로 그린 '틈(ring gap)'이다 —
   * 의미가 elevation 이 아니므로 shadow 토큰을 쓰는 것이 오히려 틀리다. 새 예외는 이 목록에 명시적으로
   * 추가해야 하며(리뷰 대상), 그 외 모든 box-shadow 는 var(--tds-*shadow*) 여야 한다.
   */
  const NON_ELEVATION_EXCEPTIONS: readonly string[] = ['/atoms/Checkbox/Checkbox.css'];

  const isException = (path: string): boolean =>
    NON_ELEVATION_EXCEPTIONS.some((suffix) => path.endsWith(suffix));

  it('모든 box-shadow 값이 shadow 토큰(var(--tds-…shadow…))을 참조한다 — 예외는 명시 목록뿐', () => {
    const hits: string[] = [];
    for (const [path, css] of cssEntries) {
      if (isException(path)) continue;
      for (const { line, n } of declarationLines(css)) {
        const m = /box-shadow\s*:\s*([^;]+)/.exec(line);
        if (m === null || m[1] === undefined) continue;
        const value = m[1].trim();
        if (value === 'none') continue;
        if (!/var\(--tds-[^)]*shadow[^)]*\)/.test(value)) hits.push(`${path}:${n} → ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('예외 목록의 non-elevation box-shadow 도 raw 값이 아니라 토큰으로 조립된다', () => {
    const hits: string[] = [];
    for (const [path, css] of cssEntries) {
      if (!isException(path)) continue;
      for (const { line, n } of declarationLines(css)) {
        const m = /box-shadow\s*:\s*([^;]+)/.exec(line);
        if (m === null || m[1] === undefined) continue;
        const value = m[1].trim();
        if (value === 'none') continue;
        if (!value.includes('var(--tds-')) hits.push(`${path}:${n} → ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('예외 목록은 실재하는 파일만 담는다 (파일이 사라지면 예외를 지운다)', () => {
    for (const suffix of NON_ELEVATION_EXCEPTIONS) {
      expect(cssEntries.some(([path]) => path.endsWith(suffix))).toBe(true);
    }
  });
});

/**
 * 실재하지 않는 토큰을 참조하지 않는다.
 *
 * [위 가드들과 무엇이 다른가] 위쪽은 전부 **금지된 값**(hex·px·키워드·raw box-shadow)을 찾는다.
 * 그래서 `var(--tds-typography-body-lg-font-size)` 처럼 **문법은 완벽하지만 정의된 적 없는**
 * 이름을 참조하면 하나도 울리지 않았다. CSS 는 그런 참조를 조용히 삼킨다 — fallback 이 없으면
 * 선언 자체가 무효가 되고 속성은 초기값이나 상속값으로 떨어진다. 예외를 던지지 않으므로
 * 눈으로 보기 전에는 아무도 모른다.
 *
 * [왜 .tsx 까지 보는가] 실제로 샌 3건이 전부 스토리의 인라인 style 이었다:
 *   Spinner.stories  `--tds-typography-body-lg-font-size`  — body-lg 티어 자체가 없다
 *   Icon.stories ×2  `font: var(--tds-typography-body-md)` — typography 토큰은 네 속성으로
 *                     전개되므로 축약형 `font` 로 해석되지 않는다. 두 곳 다 조용히 상속값이었다.
 * CSS 만 스캔하면 이 계열이 통째로 사각지대다.
 *
 * `apps/admin` 에는 같은 검사가 이미 있다(`shared/token-guard.test.ts`). 그쪽은 앱을,
 * 이쪽은 DS 를 본다 — 한쪽의 초록이 다른 쪽의 빈칸을 가리지 못한다.
 */
describe('DS 토큰 가드 — 실재하지 않는 토큰을 참조하지 않는다', () => {
  const generatedCss = Object.values(
    import.meta.glob('../../generated/tokens/tokens.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  )[0];

  /** codegen 이 실제로 뱉은 --tds-* 정의 */
  const definedTokens = new Set(
    [...(generatedCss ?? '').matchAll(/^\s*(--tds-[a-z0-9-]+)\s*:/gm)].map(([, name]) => name),
  );

  const sourceEntries = Object.entries(
    import.meta.glob('../**/*.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>,
  );

  /**
   * 소스가 스스로 값을 넣어 주는 로컬 커스텀 프로퍼티는 토큰이 아니다.
   * (예: RichTextField 가 rows 를 `--tds-richtext-rows` 로 주입하고 CSS 가 fallback 과 함께 읽는다.)
   */
  const locallyAssigned = new Set(
    [...cssEntries, ...sourceEntries].flatMap(([, text]) =>
      [...text.matchAll(/['"]?(--tds-[a-z0-9-]+)['"]?\s*:/g)].map(([, name]) => name),
    ),
  );
  const resolvable = new Set([...definedTokens, ...locallyAssigned]);

  it('가드가 정본 토큰 목록을 실제로 읽었다 (빈 집합 위에서 통과하지 않는다)', () => {
    // 정본이 비면 '모든 참조가 미정의' 가 되어 아래가 요란하게 실패한다. 공허한 통과는 불가능하지만,
    // 실패를 '토큰이 깨졌다' 로 오독하지 않도록 여기서 먼저 못 박는다.
    expect(definedTokens.size).toBeGreaterThan(100);
    expect(definedTokens.has('--tds-color-surface-default')).toBe(true);
    expect(sourceEntries.length).toBeGreaterThan(50);
  });

  it('CSS · 인라인 style 의 모든 var(--tds-*) 가 정의된 토큰으로 해석된다', () => {
    const hits: string[] = [];
    for (const [path, text] of [...cssEntries, ...sourceEntries]) {
      stripComments(text)
        .split(/\r?\n/)
        .forEach((line, i) => {
          for (const [, name] of line.matchAll(/var\(\s*(--tds-[a-z0-9-]+)\s*[),]/g)) {
            if (name !== undefined && !resolvable.has(name)) {
              hits.push(`${path}:${String(i + 1)} → ${name}`);
            }
          }
        });
    }
    expect(hits).toEqual([]);
  });
});
