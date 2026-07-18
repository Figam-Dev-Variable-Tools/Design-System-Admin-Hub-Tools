/**
 * Catalog — 23 모듈 분류표 체크리스트 렌더러 (문서 전용).
 *
 * [무엇인가] 오너가 정의한 정본 항목(286개) 대비 **무엇이 구현됐고 무엇이 미구현인지**를
 * 카테고리 단위로 한 눈에 보여주는 Storybook 문서 화면이다.
 *
 * [원천] packages/ui/generated/taxonomy.ts (taxonomy/taxonomy.v1.json → codegen 산출물).
 * 화면에 나오는 번호·이름·라벨·설명·항목·구현 연결은 전부 그 데이터에서 온다 — 목록 하드코딩 0건.
 * 항목을 구현하면 원천의 `component` 를 채우고 codegen 을 다시 돌리는 것만으로 이 화면이 갱신된다.
 *
 * [계약 대상 아님] catalog/ 는 문서 전용이며 제품 컴포넌트가 아니다.
 * 따라서 atoms/molecules/organisms 에 새 컴포넌트를 만들지 않고 여기서 자체 렌더한다.
 *
 * [토큰 전용] 색상·치수 리터럴 0건. 모든 스타일 값은 generated/tokens 의 `var(--tds-*)` 참조다
 * (foundations/_shared.tsx 의 관례를 그대로 따른다). 논리 속성(paddingInline/marginBlockEnd/
 * textAlign:'start')만 써서 RTL 에서도 방향이 뒤집히지 않으며, 색은 전부 semantic 토큰이라
 * 다크 테마에서 자동으로 대비가 유지된다.
 */
import type { CSSProperties, ReactNode } from 'react';
import { TAXONOMY, type TaxonomyCategory, type TaxonomyItem } from '../../generated/taxonomy';
import { cssVar, tokenVars, type TokenPath } from '../../generated/tokens/tokens';

// ---------------------------------------------------------------------------
// 스타일 헬퍼 — foundations/_shared.tsx 와 동일한 방식 (리터럴 없이 토큰 참조만 조립)
// ---------------------------------------------------------------------------

/** 타이포그래피 컴포지트 토큰의 서브 변수(--…-font-size 등) 참조 문자열 */
function typoVar(
  path: TokenPath,
  sub: 'font-family' | 'font-size' | 'font-weight' | 'line-height',
): string {
  return `var(${tokenVars[path]}-${sub})`;
}

/** 타이포그래피 컴포지트 토큰 → CSSProperties (서브 변수 4종 전개) */
function typographyStyle(path: TokenPath): CSSProperties {
  return {
    fontFamily: typoVar(path, 'font-family'),
    fontSize: typoVar(path, 'font-size'),
    fontWeight: typoVar(path, 'font-weight') as CSSProperties['fontWeight'],
    lineHeight: typoVar(path, 'line-height'),
  };
}

/** 굵은 웨이트 — 문서 스캐폴딩 전용 (컴포넌트 구현이 아니므로 primitive 참조 허용) */
const boldWeight =
  `var(${tokenVars['primitive.typography.font-weight.bold']})` as CSSProperties['fontWeight'];

/** 얇은 테두리 값 — 폭은 토큰, 색도 토큰 */
function thinBorder(): string {
  return `var(${tokenVars['border-width.thin']}) solid ${cssVar('color.border.default')}`;
}

/** 고정폭 — 컴포넌트명처럼 글자를 하나씩 대조해 읽는 텍스트에 쓴다 */
const monoFontFamily = cssVar('primitive.typography.font-family.mono');

// ---------------------------------------------------------------------------
// 집계 — 정본/구현/미구현/고유
// ---------------------------------------------------------------------------

interface CatalogSummary {
  /** 정본 항목 수 */
  total: number;
  /** component 가 연결된 항목 수 */
  done: number;
  /** component 가 null 인 항목 수 */
  todo: number;
  /** 정본 밖 프로젝트 고유 컴포넌트 수 */
  extras: number;
}

function summarize(category: TaxonomyCategory): CatalogSummary {
  const done = category.items.filter((item) => item.component !== null).length;
  return {
    total: category.items.length,
    done,
    todo: category.items.length - done,
    extras: category.extras.length,
  };
}

/** `01. Actions (액션)` — 번호 2자리 + 영문명 + (한글 label) */
function headingText(category: TaxonomyCategory): string {
  return `${String(category.no).padStart(2, '0')}. ${category.name} (${category.label})`;
}

// ---------------------------------------------------------------------------
// 조각 컴포넌트
// ---------------------------------------------------------------------------

/** 인라인 코드 칩 — 컴포넌트명 표기용 */
function Code({ children }: { children: ReactNode }) {
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

/**
 * 상태 배지 — 구현/미구현.
 * 색만으로 구분하지 않는다: 텍스트('구현'/'미구현')가 상태를 그대로 말하므로
 * 색각 이상·흑백 인쇄에서도 정보가 소실되지 않는다 (a11y 감사 기준).
 */
function StatusChip({ done }: { done: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        ...typographyStyle('typography.label.sm'),
        fontWeight: boldWeight,
        color: done ? cssVar('color.feedback.success.text') : cssVar('color.text.muted'),
        background: done
          ? cssVar('color.feedback.success.surface')
          : cssVar('color.surface.raised'),
        border: `var(${tokenVars['border-width.thin']}) solid ${
          done ? cssVar('color.feedback.success.border') : cssVar('color.border.subtle')
        }`,
        borderRadius: cssVar('radius.full'),
        paddingInline: cssVar('space.2'),
        paddingBlock: cssVar('space.1'),
        whiteSpace: 'nowrap',
      }}
    >
      {done ? '구현' : '미구현'}
    </span>
  );
}

/** 요약 한 줄 — `정본 9개 중 구현 1개 · 미구현 8개 · 프로젝트 고유 2개` */
function SummaryLine({ summary }: { summary: CatalogSummary }) {
  return (
    <p
      style={{
        ...typographyStyle('typography.body.md'),
        color: cssVar('color.text.default'),
        background: cssVar('color.surface.raised'),
        border: thinBorder(),
        borderRadius: cssVar('radius.md'),
        padding: cssVar('space.3'),
        margin: 0,
        marginBlockEnd: cssVar('space.5'),
      }}
    >
      정본 {summary.total}개 중{' '}
      <strong style={{ fontWeight: boldWeight }}>구현 {summary.done}개</strong> · 미구현{' '}
      {summary.todo}개 · 프로젝트 고유 {summary.extras}개
    </p>
  );
}

/** 섹션 제목 */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        ...typographyStyle('typography.title.md'),
        fontWeight: boldWeight,
        color: cssVar('color.text.default'),
        margin: 0,
        marginBlockEnd: cssVar('space.3'),
      }}
    >
      {children}
    </h3>
  );
}

const cellStyle: CSSProperties = {
  padding: cssVar('space.2'),
  borderBlockEnd: thinBorder(),
  textAlign: 'start',
  verticalAlign: 'middle',
};

const headStyle: CSSProperties = {
  ...cellStyle,
  ...typographyStyle('typography.label.md'),
  color: cssVar('color.text.muted'),
};

/** 정본 항목 표 — 항목명 / 상태 / 연결된 컴포넌트명 */
function ItemsTable({ items }: { items: readonly TaxonomyItem[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', inlineSize: '100%' }}>
        <thead>
          <tr>
            <th style={headStyle}>항목명</th>
            <th style={headStyle}>상태</th>
            <th style={headStyle}>연결된 컴포넌트</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <td
                style={{
                  ...cellStyle,
                  ...typographyStyle('typography.body.md'),
                  color:
                    item.component !== null
                      ? cssVar('color.text.default')
                      : cssVar('color.text.muted'),
                }}
              >
                {item.name}
              </td>
              <td style={cellStyle}>
                <StatusChip done={item.component !== null} />
              </td>
              <td style={cellStyle}>
                {item.component !== null ? (
                  <Code>{item.component}</Code>
                ) : (
                  <span
                    style={{
                      ...typographyStyle('typography.label.md'),
                      color: cssVar('color.text.disabled'),
                    }}
                  >
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 프로젝트 고유 — 정본 목록엔 없지만 이 카테고리에 실재하는 컴포넌트 */
function ExtrasSection({ extras }: { extras: readonly string[] }) {
  return (
    <section style={{ marginBlockStart: cssVar('space.6') }}>
      <SectionTitle>프로젝트 고유</SectionTitle>
      <p
        style={{
          ...typographyStyle('typography.label.md'),
          color: cssVar('color.text.muted'),
          margin: 0,
          marginBlockEnd: cssVar('space.3'),
        }}
      >
        정본 목록에는 없지만 이 서비스에 필요해 별도로 구현한 컴포넌트다.
      </p>
      {extras.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: cssVar('space.2'),
          }}
        >
          {extras.map((name) => (
            <li key={name}>
              <Code>{name}</Code>
            </li>
          ))}
        </ul>
      ) : (
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
          없음 — 이 카테고리의 구현은 전부 정본 항목에 대응한다.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 공개 컴포넌트
// ---------------------------------------------------------------------------

export interface CatalogTableProps {
  /** taxonomy 카테고리 key (예: 'actions'). 23 모듈 분류표의 식별자 정본. */
  categoryKey: string;
}

/**
 * 카테고리 1개의 카탈로그(체크리스트) 화면.
 * 23개 스토리 파일은 Storybook title 이 정적 문자열이어야 해서 각각 존재하지만,
 * 렌더는 전부 이 컴포넌트 하나를 통과한다.
 */
export function CatalogTable({ categoryKey }: CatalogTableProps) {
  const category = TAXONOMY.find((entry) => entry.key === categoryKey);

  if (category === undefined) {
    return (
      <p
        style={{
          ...typographyStyle('typography.body.md'),
          color: cssVar('color.feedback.danger.text'),
          background: cssVar('color.feedback.danger.surface'),
          border: `var(${tokenVars['border-width.thin']}) solid ${cssVar(
            'color.feedback.danger.border',
          )}`,
          borderRadius: cssVar('radius.md'),
          padding: cssVar('space.4'),
          margin: 0,
        }}
      >
        분류표에 없는 카테고리 key 다: <Code>{categoryKey}</Code> — taxonomy/taxonomy.v1.json 을
        확인하라.
      </p>
    );
  }

  const summary = summarize(category);

  return (
    <article
      style={{
        color: cssVar('color.text.default'),
        background: cssVar('color.surface.default'),
        ...typographyStyle('typography.body.md'),
      }}
    >
      <header style={{ marginBlockEnd: cssVar('space.4') }}>
        <h2
          style={{
            ...typographyStyle('typography.title.lg'),
            fontWeight: boldWeight,
            color: cssVar('color.text.default'),
            margin: 0,
            marginBlockEnd: cssVar('space.2'),
          }}
        >
          {headingText(category)}
        </h2>
        <p
          style={{
            ...typographyStyle('typography.body.md'),
            color: cssVar('color.text.muted'),
            margin: 0,
          }}
        >
          {category.description}
        </p>
      </header>

      <SummaryLine summary={summary} />

      <section>
        <SectionTitle>정본 항목</SectionTitle>
        <ItemsTable items={category.items} />
      </section>

      <ExtrasSection extras={category.extras} />
    </article>
  );
}
