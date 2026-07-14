/**
 * Foundations/Shadow — 그림자(elevation) 토큰.
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 값 하드코딩 0건: tokenVars 맵 순회 + tokens.css(CSSOM) 런타임 해석 (_shared.tsx 참고).
 *
 * 현재 tokens/tokens.json 에는 shadow/elevation 토큰이 아직 없다 — 이 스토리는 맵을 동적
 * 순회하므로 A20(Token Engineer)이 토큰을 추가하고 G4 승인 + codegen 이 돌면 자동으로 채워진다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import {
  Code,
  cssVar,
  EmptyNote,
  Section,
  thinBorder,
  tokenEntries,
  TokenTable,
  type TokenEntry,
} from './_shared';

const meta: Meta = {
  title: 'Foundations/Shadow',
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj;

/** 경로 세그먼트에 shadow/elevation 이 포함된 토큰 전부 (계층 불문 — 추가 즉시 노출) */
const shadowEntries = () =>
  tokenEntries((p) =>
    p.split('.').some((seg) => seg.includes('shadow') || seg.includes('elevation')),
  );

/** 그림자 미리보기 카드 */
function ShadowBox({ entry }: { entry: TokenEntry }) {
  return (
    <div
      aria-hidden
      style={{
        inlineSize: `calc(${cssVar('space.6')} * 3)`,
        blockSize: `calc(${cssVar('space.6')} * 2)`,
        boxShadow: `var(${entry.varName})`,
        background: cssVar('color.surface.default'),
        border: thinBorder(),
        borderRadius: cssVar('radius.md'),
      }}
    />
  );
}

/** 그림자 토큰 전수 — 없으면 자동 반영 안내 */
export const Elevation: Story = {
  render: () => {
    const entries = shadowEntries();
    return (
      <Section
        title="Shadow / Elevation"
        description="box-shadow 합성 토큰 — codegen(tokens-to-css.ts)이 DTCG shadow 값을 단일 선언으로 조립한다."
      >
        {entries.length === 0 ? (
          <EmptyNote>
            아직 정의된 shadow/elevation 토큰이 없습니다. <Code>tokens/tokens.json</Code> 에 토큰이
            추가되고(소유: A20, 승인: G4) <Code>pnpm codegen</Code> 이 실행되면 이 페이지는 자동으로
            채워집니다 — 스토리가 토큰 맵을 동적 순회하기 때문에 코드 수정은 필요 없습니다.
          </EmptyNote>
        ) : (
          <TokenTable
            rows={entries.map((entry) => ({ ...entry, preview: <ShadowBox entry={entry} /> }))}
          />
        )}
      </Section>
    );
  },
};
