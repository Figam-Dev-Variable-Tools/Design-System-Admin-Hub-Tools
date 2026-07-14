/**
 * Foundations/Radius — 모서리 반경 스케일 (semantic radius.* / primitive.radius.*).
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 값 하드코딩 0건: tokenVars 맵 순회 + tokens.css(CSSOM) 런타임 해석 (_shared.tsx 참고).
 * tokens/tokens.json 에 radius 토큰을 추가하면 이 스토리는 자동 갱신된다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { cssVar, Section, thinBorder, tokenEntries, TokenTable, type TokenEntry } from './_shared';

const meta: Meta = {
  title: 'Foundations/Radius',
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj;

/** 반경 미리보기 박스 — borderRadius 에 토큰 값 적용 */
function RadiusBox({ entry }: { entry: TokenEntry }) {
  return (
    <div
      aria-hidden
      style={{
        inlineSize: `calc(${cssVar('space.6')} * 3)`,
        blockSize: `calc(${cssVar('space.6')} * 2)`,
        borderRadius: `var(${entry.varName})`,
        background: cssVar('color.surface.raised'),
        border: thinBorder(),
      }}
    />
  );
}

const toRows = (entries: TokenEntry[]) =>
  entries.map((entry) => ({ ...entry, preview: <RadiusBox entry={entry} /> }));

/** 반경 스케일 전체 — semantic(사용 계층) + primitive(원천) */
export const Scale: Story = {
  render: () => (
    <>
      <Section
        title="Radius (radius.*)"
        description="2계층 semantic — 컴포넌트/앱이 참조하는 계층. 모드 무관이라 라이트/다크 값이 같다."
      >
        <TokenTable rows={toRows(tokenEntries((p) => p.startsWith('radius.')))} />
      </Section>
      <Section
        title="Primitive (primitive.radius.*)"
        description="1계층 원시 스케일 — semantic 이 참조하는 원천. 컴포넌트 직접 참조 금지."
      >
        <TokenTable rows={toRows(tokenEntries((p) => p.startsWith('primitive.radius.')))} />
      </Section>
    </>
  ),
};
