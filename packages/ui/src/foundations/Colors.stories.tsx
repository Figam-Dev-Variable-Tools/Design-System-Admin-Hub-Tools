/**
 * Foundations/Colors — 컬러 팔레트 (primitive / semantic / component 계층별 스와치 그리드).
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 값 하드코딩 0건: tokenVars 맵 순회 + tokens.css(CSSOM) 런타임 해석 (_shared.tsx 참고).
 * tokens/tokens.json 에 컬러 토큰을 추가하면 이 스토리는 자동 갱신된다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { isColorLike, resolveTokenValue, Section, SwatchGrid, tokenEntries } from './_shared';

const meta: Meta = {
  title: 'Foundations/Colors',
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj;

/** 1계층 — raw 값이 허용되는 유일한 계층. 컴포넌트/앱의 직접 참조 금지 (G4 규칙) */
const primitiveEntries = () => tokenEntries((p) => p.startsWith('primitive.color.'));

/** 2계층 — 의미 기반. 라이트/다크 페어링 필수(tds.modes). 계약·컴포넌트 토큰은 이 계층만 참조 */
const semanticEntries = () => tokenEntries((p) => p.startsWith('color.'));

/** 3계층 — 컴포넌트 스코프 토큰 중 색상만 (해석값이 색상인지 런타임 판정) */
const componentColorEntries = () =>
  tokenEntries((p) => p.startsWith('component.')).filter((e) =>
    isColorLike(resolveTokenValue(e.varName, 'light')),
  );

/** 세 계층 전체 개요 */
export const Palette: Story = {
  render: () => (
    <>
      <Section
        title="Primitive (1계층)"
        description="원시 팔레트 — raw 값이 허용되는 유일한 계층. 컴포넌트/앱이 직접 참조하면 G4/G6에서 반려된다."
      >
        <SwatchGrid entries={primitiveEntries()} />
      </Section>
      <Section
        title="Semantic (2계층)"
        description="의미 기반 컬러 — 모든 토큰이 primitive 참조 + 라이트/다크 페어링(tds.modes)을 가진다. 툴바의 Theme을 전환하면 스와치 면이 함께 바뀐다."
      >
        <SwatchGrid entries={semanticEntries()} />
      </Section>
      <Section
        title="Component (3계층)"
        description="컴포넌트 스코프 컬러 — semantic 계층만 참조한다(primitive 직접 참조 금지). 색상 외 component 토큰은 각 Foundations 페이지(Spacing/Radius/Typography/Motion)에서 다룬다."
      >
        <SwatchGrid entries={componentColorEntries()} />
      </Section>
    </>
  ),
};

/** 1계층 primitive 스와치 그리드 */
export const Primitive: Story = {
  render: () => (
    <Section
      title="Primitive Colors"
      description="tokens.json 의 primitive.color.* — 각 스와치에 토큰 경로 · CSS 변수명 · 라이트/다크 해석값을 표기한다 (primitive는 모드 무관이라 두 값이 동일)."
    >
      <SwatchGrid entries={primitiveEntries()} />
    </Section>
  ),
};

/** 2계층 semantic 스와치 그리드 */
export const Semantic: Story = {
  render: () => (
    <Section
      title="Semantic Colors"
      description="tokens.json 의 color.* — 다크 값은 [data-theme='dark'] 오버라이드 체인을 런타임에 풀어 표기한다."
    >
      <SwatchGrid entries={semanticEntries()} />
    </Section>
  ),
};

/** 3계층 component 컬러 스와치 그리드 */
export const Component: Story = {
  render: () => (
    <Section
      title="Component Colors"
      description="tokens.json 의 component.* 중 해석값이 색상인 토큰 — semantic 체인을 따라 라이트/다크가 자동 페어링된다."
    >
      <SwatchGrid entries={componentColorEntries()} />
    </Section>
  ),
};
