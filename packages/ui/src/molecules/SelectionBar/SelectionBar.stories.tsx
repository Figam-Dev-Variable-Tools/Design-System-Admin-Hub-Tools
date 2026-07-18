// SelectionBar — Storybook 스토리 (CSF3 · Molecules/SelectionBar)
//
// argTypes 는 계약 생성물(generated/argtypes/SelectionBar.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: states(default/focus-visible) + onClear 발화 + count=0 미렌더 + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { SelectionBarArgTypes } from '../../../generated/argtypes/SelectionBar.argtypes';
import { SelectionBar } from './SelectionBar';

const meta: Meta<typeof SelectionBar> = {
  title: 'Actions/SelectionBar',
  component: SelectionBar,
  argTypes: { ...SelectionBarArgTypes },
  args: {
    count: 3,
    noun: '건',
    onClear: fn(),
    children: (
      <button type="button" style={{ cursor: 'pointer' }}>
        일괄 삭제
      </button>
    ),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof SelectionBar>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-default)', padding: 'var(--tds-space-5)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** default — 3건 선택 + 해제 + 액션 */
export const Default: Story = {};

/** count=0 — 아무것도 렌더하지 않는다 (선택이 없으면 바가 없다) */
export const EmptyHidden: Story = {
  name: 'SelectionBar: count=0 이면 렌더하지 않는다',
  args: { count: 0 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('region')).toBeNull();
  },
};

/** onClear — '선택 해제' 클릭이 발화한다 */
export const ClearFires: Story = {
  name: 'SelectionBar: 선택 해제 클릭이 onClear 를 발화한다',
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '선택 해제' }));
    await expect(args.onClear).toHaveBeenCalled();
  },
};

/** onClear 미지정 — 해제 버튼이 없다 (prop 부재를 리터럴 render 로 보인다) */
export const WithoutClear: Story = {
  name: 'SelectionBar: onClear 미지정이면 해제 버튼이 없다',
  render: () => (
    <SelectionBar count={12} noun="명">
      <button type="button">일괄 삭제</button>
    </SelectionBar>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: '선택 해제' })).toBeNull();
  },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  decorators: [rtlFrame],
};
