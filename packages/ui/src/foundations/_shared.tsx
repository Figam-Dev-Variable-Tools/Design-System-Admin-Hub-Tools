/**
 * Foundations 스토리 공용 렌더 유틸 — TokenTable · SwatchGrid · ThemePanel 등.
 *
 * [선행 조건] `pnpm codegen` 선행 필요.
 * 아래 import 대상(packages/ui/generated/tokens/tokens.ts)은 tools/codegen 산출물이라
 * 리포 초기 상태에는 존재하지 않는다 (packages/ui/README.md 참고).
 *
 * 동작 원리 — 값 하드코딩 0건:
 *  - 토큰 "목록"은 generated/tokens/tokens.ts 의 tokenVars 맵(토큰 경로 → CSS 변수명)을 순회한다.
 *  - 토큰 "값"(라이트/다크)은 preview.ts 가 로드한 generated/tokens/tokens.css 를 CSSOM 으로
 *    읽어 var() 참조 체인을 풀어 해석한다. 화면에 보이는 hex/px/ms 문자열은 전부 런타임
 *    데이터이며 코드 리터럴이 아니다 (조직 규칙: 리터럴 금지 — 값의 데이터 렌더링은 허용).
 *  - 따라서 tokens/tokens.json(단일 원천, Figma Variables 와 동일 원천)에 토큰을 추가/변경하고
 *    codegen 만 다시 돌리면 Foundations 스토리는 자동 갱신된다.
 */
import type { CSSProperties, ReactNode } from 'react';
import { cssVar, tokenVars, type TokenPath } from '../../generated/tokens/tokens';

// ---------------------------------------------------------------------------
// 토큰 목록 순회 — tokenVars 맵이 유일한 목록 원천
// ---------------------------------------------------------------------------

export interface TokenEntry {
  /** 점 표기 토큰 경로 (예: color.text.default) */
  path: TokenPath;
  /** CSS 변수명 (예: --tds-color-text-default) */
  varName: string;
}

/** tokenVars 맵에서 조건에 맞는 토큰 목록을 tokens.json 선언 순서대로 반환 */
export function tokenEntries(match: (path: string) => boolean): TokenEntry[] {
  return (Object.keys(tokenVars) as TokenPath[])
    .filter(match)
    .map((path) => ({ path, varName: tokenVars[path] }));
}

// ---------------------------------------------------------------------------
// 토큰 값 해석 — generated/tokens/tokens.css(CSSOM)의 라이트/다크 선언을 읽는다
// ---------------------------------------------------------------------------

export type ThemeName = 'light' | 'dark';

const TOKEN_PREFIX = '--tds-';
/** var(--x) 참조 1건 탐지 — 체인 해석 루프에서 사용 */
const VAR_REF_RE = /var\((--[a-zA-Z0-9-]+)\)/;
/** CSSStyleDeclaration 이 커스텀 프로퍼티를 열거하지 않는 환경용 cssText 폴백 파서 */
const DECL_RE = /(--tds-[\w-]+)\s*:\s*([^;}]+)/g;

interface TokenSheets {
  light: Map<string, string>;
  dark: Map<string, string>;
}

let sheetsCache: TokenSheets | null = null;

function ruleDeclarations(rule: CSSStyleRule): Map<string, string> {
  const out = new Map<string, string>();
  for (let i = 0; i < rule.style.length; i += 1) {
    const prop = rule.style.item(i);
    if (prop.startsWith(TOKEN_PREFIX)) out.set(prop, rule.style.getPropertyValue(prop).trim());
  }
  if (out.size === 0) {
    for (const m of rule.cssText.matchAll(DECL_RE)) {
      const name = m[1];
      const value = m[2];
      if (name !== undefined && value !== undefined) out.set(name, value.trim());
    }
  }
  return out;
}

/**
 * 문서의 스타일시트에서 토큰 선언을 수집한다.
 *  - `:root { ... }`            → 라이트(기본) 값
 *  - `[data-theme='dark'] {..}` → 다크 오버라이드
 * tokens.css 는 preview.ts 가 정적 import 하므로 스토리 렌더 시점에는 항상 로드되어 있다.
 */
function readTokenSheets(): TokenSheets {
  if (sheetsCache) return sheetsCache;
  const light = new Map<string, string>();
  const dark = new Map<string, string>();
  if (typeof document !== 'undefined') {
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // 크로스오리진 시트 — 토큰 시트는 번들 내라 해당 없음
      }
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSStyleRule)) continue;
        const selector = rule.selectorText;
        const isDark = selector.includes('data-theme') && selector.includes('dark');
        const isRoot = selector === ':root';
        if (!isRoot && !isDark) continue;
        for (const [k, v] of ruleDeclarations(rule)) (isDark ? dark : light).set(k, v);
      }
    }
  }
  const sheets: TokenSheets = { light, dark };
  // 토큰 시트를 아직 못 읽었다면 캐시하지 않는다 (로드 타이밍 문제 시 다음 렌더에서 재시도)
  if (light.size > 0) sheetsCache = sheets;
  return sheets;
}

/**
 * CSS 변수명 → 해당 테마의 최종 값. var() 참조 체인(semantic → primitive)을 끝까지 푼다.
 * 다크 맵에 없는 변수는 라이트 값으로 폴백한다(모드 무관 토큰: space/radius/typography/motion).
 */
export function resolveTokenValue(varName: string, theme: ThemeName): string {
  const sheets = readTokenSheets();
  const lookup = (name: string): string | undefined =>
    theme === 'dark' ? (sheets.dark.get(name) ?? sheets.light.get(name)) : sheets.light.get(name);

  let value = lookup(varName);
  if (value === undefined) return '(미정의)';
  for (let depth = 0; depth < 32; depth += 1) {
    const m = VAR_REF_RE.exec(value);
    if (!m) break;
    const refName = m[1];
    if (refName === undefined) break;
    const ref = lookup(refName);
    if (ref === undefined) break; // 미정의 참조 — 부분 해석 상태로 그대로 노출해 문제를 드러낸다
    value = value.replace(m[0], ref);
  }
  return value;
}

/** 해석된 값이 색상으로 보이는지 — component 계층에서 컬러 토큰만 골라낼 때 사용 (런타임 판정) */
export function isColorLike(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith('#') ||
    v.startsWith('rgb') ||
    v.startsWith('hsl') ||
    v.startsWith('oklch') ||
    v.startsWith('color(')
  );
}

// ---------------------------------------------------------------------------
// 라이트 스코프 스타일 주입 — 다크 전역 테마 아래에서도 라이트 패널을 나란히 보여주기 위함
// ---------------------------------------------------------------------------
//
// tokens.css 는 라이트 값을 :root 에만 선언하므로, 전역이 다크일 때 하위 요소는 라이트 값을
// 상속받을 수 없다. 라이트 선언을 [data-theme='light'] 스코프로 복제한 <style> 을 런타임에
// 1회 주입해 ThemePanel(light) 이 어느 전역 테마에서도 올바르게 렌더되게 한다.
// (내용 전체가 CSSOM 에서 읽은 런타임 데이터 — 하드코딩 아님)

const LIGHT_SCOPE_STYLE_ID = 'tds-foundations-light-scope';

function ensureLightScopeStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(LIGHT_SCOPE_STYLE_ID)) return;
  const { light } = readTokenSheets();
  const decls = [...light.entries()].map(([k, v]) => `${k}: ${v};`).join(' ');
  const el = document.createElement('style');
  el.id = LIGHT_SCOPE_STYLE_ID;
  el.textContent = `[data-theme='light'] { ${decls} }`;
  document.head.appendChild(el);
}

// ---------------------------------------------------------------------------
// 공용 스타일 헬퍼 — 문서 스캐폴딩 전용 (전부 토큰 var() 참조, 리터럴 없음)
// ---------------------------------------------------------------------------

/** 타이포그래피 컴포지트 토큰의 서브 변수(--…-font-size 등) 참조 문자열 */
function typoVar(
  path: TokenPath,
  sub: 'font-family' | 'font-size' | 'font-weight' | 'line-height',
): string {
  return `var(${tokenVars[path]}-${sub})`;
}

/** 타이포그래피 컴포지트 토큰 → CSSProperties (서브 변수 4종 전개) */
export function typographyStyle(path: TokenPath): CSSProperties {
  return {
    fontFamily: typoVar(path, 'font-family'),
    fontSize: typoVar(path, 'font-size'),
    fontWeight: typoVar(path, 'font-weight') as CSSProperties['fontWeight'],
    lineHeight: typoVar(path, 'line-height'),
  };
}

/**
 * 고정폭 — 토큰 경로/CSS 변수명/값처럼 **글자를 하나씩 대조해 읽는** 텍스트에 쓴다
 * (비례폭에서는 0/O · 1/l 이 구분되지 않는다). 폰트 스택을 여기 박아 두던 것을 토큰으로 돌린다.
 */
const monoFontFamily = cssVar('primitive.typography.font-family.mono');

/** 경로/변수명/값 등 메타 텍스트 스타일 */
export const metaTextStyle: CSSProperties = {
  fontFamily: monoFontFamily,
  fontSize: typoVar('typography.label.md', 'font-size'),
  lineHeight: typoVar('typography.label.md', 'line-height'),
  color: cssVar('color.text.muted'),
};

/** 얇은 테두리 값 — 폭은 CSS 키워드(thin)로, 색은 토큰으로 */
export function thinBorder(): string {
  return `thin solid ${cssVar('color.border.default')}`;
}

// ---------------------------------------------------------------------------
// 공용 컴포넌트
// ---------------------------------------------------------------------------

/** 인라인 코드 칩 — 토큰 경로/CSS 변수명 표기용 */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        fontFamily: monoFontFamily,
        fontSize: typoVar('typography.label.md', 'font-size'),
        background: cssVar('color.surface.raised'),
        color: cssVar('color.text.default'),
        borderRadius: cssVar('radius.sm'),
        paddingInline: cssVar('space.1'),
      }}
    >
      {children}
    </code>
  );
}

/** 섹션 래퍼 — 제목 + 설명 + 본문 */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBlockEnd: cssVar('space.6'), color: cssVar('color.text.default') }}>
      <h2
        style={{
          ...typographyStyle('typography.body.md'),
          // 문서 스캐폴딩 헤딩 전용 — 컴포넌트 구현이 아니므로 primitive 웨이트 참조 허용
          fontWeight:
            `var(${tokenVars['primitive.typography.font-weight.bold']})` as CSSProperties['fontWeight'],
          margin: 0,
          marginBlockEnd: cssVar('space.2'),
        }}
      >
        {title}
      </h2>
      {description !== undefined ? (
        <p
          style={{
            ...typographyStyle('typography.label.md'),
            color: cssVar('color.text.muted'),
            margin: 0,
            marginBlockEnd: cssVar('space.3'),
          }}
        >
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/** 표 형태 토큰 뷰 — 미리보기 · 토큰 경로 · CSS 변수 · Light/Dark 값 */
interface TokenRow extends TokenEntry {
  /** 행별 시각 미리보기 (스와치/바/박스 등) */
  preview?: ReactNode;
}

export function TokenTable({
  rows,
  previewLabel = '미리보기',
}: {
  rows: TokenRow[];
  previewLabel?: string;
}) {
  const cell: CSSProperties = {
    padding: cssVar('space.2'),
    borderBlockEnd: thinBorder(),
    textAlign: 'start',
    verticalAlign: 'middle',
  };
  const head: CSSProperties = {
    ...cell,
    ...typographyStyle('typography.label.md'),
    color: cssVar('color.text.muted'),
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', inlineSize: '100%' }}>
        <thead>
          <tr>
            <th style={head}>{previewLabel}</th>
            <th style={head}>토큰 경로</th>
            <th style={head}>CSS 변수</th>
            <th style={head}>Light 값</th>
            <th style={head}>Dark 값</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const light = resolveTokenValue(row.varName, 'light');
            const dark = resolveTokenValue(row.varName, 'dark');
            return (
              <tr key={row.path}>
                <td style={cell}>{row.preview}</td>
                <td style={cell}>
                  <Code>{row.path}</Code>
                </td>
                <td style={cell}>
                  <Code>{row.varName}</Code>
                </td>
                <td style={{ ...cell, ...metaTextStyle }}>{light}</td>
                <td style={{ ...cell, ...metaTextStyle }}>
                  {dark === light ? `${dark} (light와 동일)` : dark}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 컬러 스와치 1개 — 경로 · CSS 변수명 · 라이트/다크 해석값 표기 */
function Swatch({ entry }: { entry: TokenEntry }) {
  const light = resolveTokenValue(entry.varName, 'light');
  const dark = resolveTokenValue(entry.varName, 'dark');
  return (
    <figure
      style={{
        margin: 0,
        border: thinBorder(),
        borderRadius: cssVar('radius.md'),
        overflow: 'hidden',
        background: cssVar('color.surface.default'),
      }}
    >
      {/* 스와치 면 — 현재 전역 테마의 값을 그대로 따라간다 */}
      <div
        aria-hidden
        style={{
          background: `var(${entry.varName})`,
          blockSize: `calc(${cssVar('space.6')} * 2)`,
          borderBlockEnd: thinBorder(),
        }}
      />
      <figcaption style={{ padding: cssVar('space.2'), display: 'grid', gap: cssVar('space.1') }}>
        <Code>{entry.path}</Code>
        <Code>{entry.varName}</Code>
        <span style={metaTextStyle}>light: {light}</span>
        <span style={metaTextStyle}>dark: {dark}</span>
      </figcaption>
    </figure>
  );
}

/** 컬러 스와치 그리드 */
export function SwatchGrid({ entries }: { entries: TokenEntry[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))',
        gap: cssVar('space.3'),
      }}
    >
      {entries.map((entry) => (
        <Swatch key={entry.path} entry={entry} />
      ))}
    </div>
  );
}

/** 테마 고정 패널 — data-theme 스코프로 라이트/다크를 나란히 비교 */
function ThemePanel({
  theme,
  children,
  style,
}: {
  theme: ThemeName;
  children: ReactNode;
  style?: CSSProperties;
}) {
  ensureLightScopeStyle();
  return (
    <section
      data-theme={theme}
      style={{
        background: cssVar('color.surface.default'),
        color: cssVar('color.text.default'),
        border: thinBorder(),
        borderRadius: cssVar('radius.lg'),
        padding: cssVar('space.4'),
        flex: '1 1 18rem',
        minInlineSize: 0,
        ...style,
      }}
    >
      <p style={{ ...metaTextStyle, margin: 0, marginBlockEnd: cssVar('space.3') }}>
        data-theme=&quot;{theme}&quot;
      </p>
      {children}
    </section>
  );
}

/** 라이트/다크 패널 쌍 — 같은 내용을 두 테마로 나란히 렌더 */
export function ThemePair({ children }: { children: (theme: ThemeName) => ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: cssVar('space.4'), flexWrap: 'wrap' }}>
      <ThemePanel theme="light">{children('light')}</ThemePanel>
      <ThemePanel theme="dark">{children('dark')}</ThemePanel>
    </div>
  );
}

/** 해당 그룹 토큰이 아직 없을 때의 안내 — 토큰 추가 시 스토리가 자동으로 채워진다 */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        ...typographyStyle('typography.body.md'),
        color: cssVar('color.text.muted'),
        background: cssVar('color.surface.raised'),
        border: thinBorder(),
        borderRadius: cssVar('radius.md'),
        padding: cssVar('space.4'),
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

// 스토리에서 자주 쓰는 것 재노출 — foundations 밖에서는 generated 에서 직접 import 할 것
export { cssVar, tokenVars };
export type { TokenPath };
