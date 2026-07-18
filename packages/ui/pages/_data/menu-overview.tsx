/**
 * 메뉴 개요 뷰 — `Pages/<English Menu>/Overview` 스토리 13개가 공유하는 **스토리 전용** 렌더러.
 *
 * 이것은 디자인 시스템 컴포넌트가 아니다. `../../src` 의 public API 로 내보내지 않으며 앱이
 * 쓰지 않는다 — 스토리 13벌이 같은 표를 복사하지 않도록 묶어둔 자리표시(placeholder) 골격일
 * 뿐이다 (pages/README.md '신규 컴포넌트 생성 금지' 는 DS 컴포넌트를 뜻한다).
 * DataTable 등 목록 모듈이 Pages 조립에 열리면 이 파일은 그 컴포넌트로 교체된다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(var(--tds-*))만 참조한다.
 */
import type { CSSProperties } from 'react';
import { cssVar, tokenVars } from '../../generated/tokens/tokens';
import { menuByEnglishName, pagesOfMenu } from './pages';

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 사용 */
const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

type TypographyPath =
  'typography.body.md' | 'typography.label.md' | 'typography.caption.md' | 'typography.title.lg';

/** 타이포그래피 컴포지트 토큰 → CSSProperties (codegen이 생성한 서브 변수 4종 전개) */
function typography(path: TypographyPath): CSSProperties {
  const v = tokenVars[path];
  return {
    fontFamily: `var(${v}-font-family)`,
    fontSize: `var(${v}-font-size)`,
    fontWeight: `var(${v}-font-weight)` as CSSProperties['fontWeight'],
    lineHeight: `var(${v}-line-height)`,
  };
}

const cellStyle: CSSProperties = {
  borderBlockEnd: `thin solid ${cssVar('color.border.subtle')}`,
  padding: cssVar('space.3'),
  textAlign: 'start',
  verticalAlign: 'top',
};

const headStyle: CSSProperties = {
  ...cellStyle,
  ...typography('typography.label.md'),
  borderBlockEnd: `thin solid ${cssVar('color.border.default')}`,
  color: cssVar('color.text.muted'),
};

/**
 * 한 메뉴에 속한 화면 목록 표.
 *
 * @param menuEn 영문 메뉴명 — `pages.ts` 의 `MENUS[].en` 과 일치해야 한다.
 */
export function MenuOverview({ menuEn }: { menuEn: string }) {
  const menu = menuByEnglishName(menuEn);
  const entries = pagesOfMenu(menu);

  return (
    <div
      style={{
        display: 'grid',
        gap: cssVar('space.5'),
        padding: cssVar('space.6'),
        minBlockSize: size(20),
        background: cssVar('color.surface.default'),
        color: cssVar('color.text.default'),
      }}
    >
      <header style={{ display: 'grid', gap: cssVar('space.1') }}>
        <p
          style={{
            ...typography('typography.caption.md'),
            color: cssVar('color.text.muted'),
            margin: 0,
          }}
        >
          {menu.section.en} · {menu.section.ko}
        </p>
        <h1 style={{ ...typography('typography.title.lg'), margin: 0 }}>{menu.en}</h1>
        <p
          style={{
            ...typography('typography.body.md'),
            color: cssVar('color.text.muted'),
            margin: 0,
          }}
        >
          {menu.ko} — {menu.basePath} · 화면 {entries.length}건
        </p>
      </header>

      <div
        style={{
          border: `thin solid ${cssVar('color.border.default')}`,
          borderRadius: cssVar('radius.lg'),
          background: cssVar('color.surface.raised'),
          overflow: 'hidden',
        }}
      >
        <table
          style={{
            ...typography('typography.body.md'),
            inlineSize: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <caption
            style={{
              ...typography('typography.label.md'),
              color: cssVar('color.text.muted'),
              padding: cssVar('space.3'),
              textAlign: 'start',
            }}
          >
            {menu.en} 메뉴의 화면 목록 (출처: apps/admin nav-config.ts)
          </caption>
          <thead>
            <tr>
              <th scope="col" style={headStyle}>
                화면 (KO)
              </th>
              <th scope="col" style={headStyle}>
                Screen (EN)
              </th>
              <th scope="col" style={headStyle}>
                경로
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.path}>
                <th scope="row" style={{ ...cellStyle, fontWeight: 'inherit' }}>
                  {entry.ko}
                </th>
                <td style={cellStyle}>{entry.en}</td>
                <td style={{ ...cellStyle, color: cssVar('color.text.muted') }}>{entry.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        style={{
          ...typography('typography.caption.md'),
          color: cssVar('color.text.muted'),
          margin: 0,
        }}
      >
        각 화면의 세부 상태(목록 · 추가 · 수정 · 삭제)는 해당 화면 모듈이 G5 를 통과하는 순서대로 이
        카테고리 아래에 스토리로 추가된다.
      </p>
    </div>
  );
}
