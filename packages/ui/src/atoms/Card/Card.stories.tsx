// Card — Storybook 스토리 (CSF3 · atom surface)
//
// [고정 IA] Overview · Variants(elevation) · Sizes(padding) · States(busy) · Content(본문 형태) ·
// Examples(실사용 조립) · Accessibility(RTL). Card 는 props 3개(padding·elevation·busy)뿐이라
// Playground 를 두지 않는다 — 단순 atom(Divider 계열)이며 세부 조합은 Docs 의 Controls 로 조작한다.
// argTypes 는 계약 생성물(generated/argtypes/Card.argtypes)을 spread 한다 (수기 금지 — G5).
import type { CSSProperties } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { CardArgTypes } from '../../../generated/argtypes/Card.argtypes';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Design System/Components/Card',
  component: Card,
  argTypes: { ...CardArgTypes },
  args: { padding: 'md', elevation: 'flat', busy: false, children: '카드 본문' },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Card>;

const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--tds-space-5)',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
};

const captionStyle: CSSProperties = {
  display: 'block',
  marginBlockEnd: 'var(--tds-space-2)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
};

const titleStyle: CSSProperties = {
  margin: 0,
  marginBlockEnd: 'var(--tds-space-2)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
};

const bodyStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
};

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 사용. 기본 표면(md · flat) 위에 본문이 놓인다 */
export const Overview: Story = {
  args: { children: '대시보드 요약 카드 본문이 이 표면 위에 놓여요.' },
};

/* ── Variants ───────────────────────────────────────────────────────────── */

/** 표면 높이(elevation). flat 은 그림자 없음, raised 는 shadow.raised 로 배경 위에 부상한다 (TOKEN-04) */
export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div style={rowStyle}>
      <div>
        <span style={captionStyle}>flat</span>
        <Card {...args} elevation="flat">
          그림자 없는 기본 표면
        </Card>
      </div>
      <div>
        <span style={captionStyle}>raised</span>
        <Card {...args} elevation="raised">
          강조 카드 — 배경 위로 부상
        </Card>
      </div>
    </div>
  ),
};

/* ── Sizes ──────────────────────────────────────────────────────────────── */

/** 내부 여백(padding). md = space.5, lg = space.6 를 한 화면에서 비교한다 */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div style={rowStyle}>
      <div>
        <span style={captionStyle}>md · space.5</span>
        <Card {...args} padding="md">
          기본 여백
        </Card>
      </div>
      <div>
        <span style={captionStyle}>lg · space.6</span>
        <Card {...args} padding="lg">
          넓은 여백
        </Card>
      </div>
    </div>
  ),
};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 계약 states(default · loading). loading 은 busy=true 가 aria-busy="true" 로 만든다 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div style={rowStyle}>
      <div>
        <span style={captionStyle}>default</span>
        <Card {...args} busy={false}>
          평상시 표면
        </Card>
      </div>
      <div>
        <span style={captionStyle}>loading · aria-busy</span>
        <Card {...args} busy>
          데이터를 불러오는 중이에요…
        </Card>
      </div>
    </div>
  ),
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최소 본문 — 한 줄. 카드는 콘텐츠 양에 맞춰 높이만 줄어든다 */
export const ContentMinimal: Story = {
  name: 'Content/Minimal',
  args: { children: '한 줄 본문' },
};

/** 긴 본문 — 컨테이너는 minWidth:0 이라 그리드 안에서 폭을 따라 흐른다 */
export const ContentLong: Story = {
  name: 'Content/Long Content',
  args: {
    children:
      '카드는 서피스 배경 + 테두리 + 라운드 + 내부 패딩만 제공하는 최소 단위 surface 다. 헤더/본문 구조나 도메인 데이터는 계약에 없다 — 조립은 organism(StatsCard/TodoCard/ListCard)이 한다(ADR-0003). 따라서 본문이 아무리 길어져도 카드는 스스로 레이아웃을 강제하지 않고 컨테이너의 폭을 따라 흐른다.',
  },
};

/** 구조화 본문 — 제목 + 본문도 그대로 담는다(구조를 만드는 책임은 조립하는 쪽) */
export const ContentRich: Story = {
  name: 'Content/Rich Content',
  parameters: { controls: { disable: true } },
  render: (args) => (
    <Card {...args}>
      <h3 style={titleStyle}>주간 방문자</h3>
      <p style={bodyStyle}>지난주 대비 12% 증가했어요.</p>
    </Card>
  ),
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 실사용 조립 — raised 표면에 제목 id 를 aria-labelledby 로 연결해 region 이름을 준다 */
export const ExampleLabelledPanel: Story = {
  name: 'Examples/Labelled Panel',
  parameters: { controls: { disable: true } },
  render: (args) => (
    <Card {...args} elevation="raised" padding="lg" aria-labelledby="card-ex-title">
      <h3 id="card-ex-title" style={titleStyle}>
        이번 달 매출
      </h3>
      <p style={bodyStyle}>₩ 128,400,000</p>
    </Card>
  ),
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 문서 방향만 뒤집는다. 치수는 논리 속성이라 같은 표면이 우측 정렬로 흐른다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  decorators: [rtlFrame],
  args: { children: '카드는 문서 방향(RTL)을 따라 흘러요.' },
};
