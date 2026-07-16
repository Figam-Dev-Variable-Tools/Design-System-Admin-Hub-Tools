// SelectField — Storybook 스토리 (CSF3 · Atoms/SelectField)
//
// argTypes 는 계약 생성물(generated/argtypes/SelectField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(isInvalid 2) 전수 + states(default/focus-visible/disabled/error) +
//           네이티브 무손실(selectOption) + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { SelectFieldArgTypes } from '../../../generated/argtypes/SelectField.argtypes';
import { SelectField } from './SelectField';

const OPTIONS = (
  <>
    <option value="grant">적립</option>
    <option value="deduct">차감</option>
  </>
);

const meta: Meta<typeof SelectField> = {
  title: 'Atoms/SelectField',
  component: SelectField,
  argTypes: { ...SelectFieldArgTypes },
  args: { isInvalid: false },
  render: (args) => (
    <SelectField {...args} aria-label="구분" defaultValue="grant">
      {OPTIONS}
    </SelectField>
  ),
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof SelectField>;

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

/* ── combinationMatrix 전수 (isInvalid 2) ────────────────────────────────── */

/** default — 유효 상태, 네이티브 combobox 로 렌더된다 */
export const Default: Story = {
  args: { isInvalid: false },
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByRole('combobox', { name: '구분' });
    await expect(select.tagName).toBe('SELECT');
    // 무손실 드롭인 — 값을 고르면 네이티브로 선택된다
    await userEvent.selectOptions(select, 'deduct');
    await expect((select as HTMLSelectElement).value).toBe('deduct');
  },
};

/** error(isInvalid) — 붉은 테두리 (메시지는 감싸는 FormField 담당) */
export const Invalid: Story = {
  args: { isInvalid: true },
};

/** disabled — native disabled 패스스루 */
export const Disabled: Story = {
  render: (args) => (
    <SelectField {...args} aria-label="구분" defaultValue="grant" disabled>
      {OPTIONS}
    </SelectField>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('combobox', { name: '구분' })).toBeDisabled();
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { isInvalid: false },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  render: (args) => (
    <SelectField {...args} aria-label="النوع" defaultValue="grant">
      <option value="grant">إيداع</option>
      <option value="deduct">خصم</option>
    </SelectField>
  ),
  decorators: [rtlFrame],
};
