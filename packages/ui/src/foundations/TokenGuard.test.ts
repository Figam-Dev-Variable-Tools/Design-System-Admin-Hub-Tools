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
  it('스캔 대상 CSS 가 최소 1개 이상 로드된다 (glob 이 비면 가드가 공허해진다)', () => {
    expect(cssEntries.length).toBeGreaterThan(10);
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

describe('TokenGuard — TOKEN-04: box-shadow 는 raw 값이 아니라 토큰 참조', () => {
  it('모든 box-shadow 값이 var(--tds-*) 토큰을 참조한다 (raw px/rgba 금지)', () => {
    const hits: string[] = [];
    for (const [path, css] of cssEntries) {
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
});
