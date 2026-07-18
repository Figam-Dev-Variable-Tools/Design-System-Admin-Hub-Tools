// Badge — Storybook 스토리 (CSF3 · Atoms/Badge)
//
// argTypes 는 계약 생성물(generated/argtypes/Badge.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(tone 3 × state 1) 전수 + boolean(hideWhenZero) true/false + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { BadgeArgTypes } from '../../../generated/argtypes/Badge.argtypes';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Data Display/Badge',
  component: Badge,
  argTypes: { ...BadgeArgTypes },
  args: { count: 3, tone: 'neutral', hideWhenZero: true },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Badge>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{
      background: 'var(--tds-color-surface-default)',
      padding: 'var(--tds-space-5)',
      borderRadius: 'var(--tds-radius-md)',
    }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** neutral — 텍스트색 배경 위 서피스색 숫자 */
export const Neutral: Story = {
  args: { tone: 'neutral', count: 3 },
};

/** danger — 처리 대기 건수 강조 */
export const Danger: Story = {
  args: { tone: 'danger', count: 12 },
};

/** success — 완료 건수 */
export const Success: Story = {
  args: { tone: 'success', count: 7 },
};

/** hideWhenZero=true + count=0 → 아무것도 렌더하지 않는다 (계약: `if (count <= 0) return null`) */
export const HiddenWhenZero: Story = {
  args: { count: 0, hideWhenZero: true },
};

/** hideWhenZero=false + count=0 → 0 도 표시한다 */
export const VisibleWhenZero: Story = {
  args: { count: 0, hideWhenZero: false },
};

/** 음수 — hideWhenZero=false 면 그대로 표시된다 (계약: count<=0 판정) */
export const NegativeVisible: Story = {
  args: { count: -1, hideWhenZero: false },
};

/** 최소 콘텐츠 — 한 자리 수 */
export const MinimalCount: Story = {
  args: { count: 1 },
};

/** 최대 콘텐츠 — 자릿수가 늘어도 pill 이 깨지지 않는다 (min-inline-size + padding) */
export const LargeCount: Story = {
  args: { count: 129384, tone: 'danger' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { count: 9, tone: 'neutral' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { count: 42, tone: 'success' },
  decorators: [rtlFrame],
};
