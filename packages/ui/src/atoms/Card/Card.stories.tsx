// Card — Storybook 스토리 (CSF3 · Atoms/Card)
//
// argTypes 는 계약 생성물(generated/argtypes/Card.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(padding 2 × state 2 = 4) 전수 + 슬롯 최소/최대 + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { CardArgTypes } from '../../../generated/argtypes/Card.argtypes';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Atoms/Card',
  component: Card,
  argTypes: { ...CardArgTypes },
  args: { padding: 'md', busy: false, children: '카드 본문' },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Card>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-raised)', padding: 'var(--tds-space-5)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** padding=md (space.5) · default */
export const PaddingMdDefault: Story = {
  args: { padding: 'md', busy: false, children: '기본 패딩(md = space.5) 카드입니다.' },
};

/** padding=md · loading (aria-busy=true) */
export const PaddingMdLoading: Story = {
  args: { padding: 'md', busy: true, children: '데이터를 불러오는 중입니다…' },
};

/** padding=lg (space.6) · default */
export const PaddingLgDefault: Story = {
  args: { padding: 'lg', busy: false, children: '넓은 패딩(lg = space.6) 카드입니다.' },
};

/** padding=lg · loading */
export const PaddingLgLoading: Story = {
  args: { padding: 'lg', busy: true, children: '데이터를 불러오는 중입니다…' },
};

/** 슬롯 최소 — 한 줄 텍스트 */
export const SlotMinimal: Story = {
  args: { children: '.' },
};

/** 슬롯 최대 — 긴 본문 (컨테이너는 flex column · minWidth:0 이라 그리드 안에서 축소된다) */
export const SlotLongContent: Story = {
  args: {
    children:
      '카드는 서피스 배경 + 테두리 + 라운드 + 내부 패딩만 제공하는 최소 단위 surface 다. 헤더/본문 구조나 도메인 데이터는 계약에 없다 — 조립은 organism(StatsCard/TodoCard/ListCard)이 한다(ADR-0003). 따라서 본문이 아무리 길어져도 카드는 스스로 레이아웃을 강제하지 않고, 컨테이너의 폭을 따라 흐른다.',
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { children: '다크 테마에서도 surface/border 토큰이 자동 전환된다.' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { children: 'بطاقة — الحاوية تتبع اتجاه المستند' },
  decorators: [rtlFrame],
};
