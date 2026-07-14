/**
 * Foundations/Spacing — 간격 스케일 (semantic space.* / primitive.space.*).
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 값 하드코딩 0건: tokenVars 맵 순회 + tokens.css(CSSOM) 런타임 해석 (_shared.tsx 참고).
 * tokens/tokens.json 에 space 토큰을 추가하면 이 스토리는 자동 갱신된다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { cssVar, Section, tokenEntries, TokenTable, type TokenEntry } from './_shared';

const meta: Meta = {
  title: 'Foundations/Spacing',
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj;

/** 간격 시각화 바 — 폭이 토큰 값 그대로 */
function SpacingBar({ entry }: { entry: TokenEntry }) {
  return (
    <div
      aria-hidden
      style={{
        inlineSize: `var(${entry.varName})`,
        blockSize: cssVar('space.3'),
        background: cssVar('color.action.primary.default'),
        borderRadius: cssVar('radius.sm'),
      }}
    />
  );
}

const toRows = (entries: TokenEntry[]) =>
  entries.map((entry) => ({ ...entry, preview: <SpacingBar entry={entry} /> }));

/** 간격 스케일 전체 — semantic(사용 계층) + primitive(원천) */
export const Scale: Story = {
  render: () => (
    <>
      <Section
        title="Spacing (space.*)"
        description="2계층 semantic — 컴포넌트/앱이 참조하는 계층. 모드 무관(라이트/다크 동일)이라 두 값이 같다."
      >
        <TokenTable rows={toRows(tokenEntries((p) => p.startsWith('space.')))} />
      </Section>
      <Section
        title="Primitive (primitive.space.*)"
        description="1계층 원시 스케일 — semantic 이 참조하는 원천. 컴포넌트 직접 참조 금지."
      >
        <TokenTable rows={toRows(tokenEntries((p) => p.startsWith('primitive.space.')))} />
      </Section>
    </>
  ),
};
