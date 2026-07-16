// SelectAllHeaderCell — Storybook 스토리 (CSF3 · Molecules/TableSelection/SelectAllHeaderCell)
//
// argTypes 는 계약 생성물(generated/argtypes/SelectAllHeaderCell.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: states(default/focus-visible/checked/indeterminate) + onToggleAll + Dark/RTL.
// 계약 dependencies: TriStateCheckbox — 3상태(off/on/mixed)를 selection 으로 전수 보인다.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { SelectAllHeaderCellArgTypes } from '../../../generated/argtypes/SelectAllHeaderCell.argtypes';
import { SelectAllHeaderCell } from './SelectAllHeaderCell';

/** <th> 는 표 안에서만 유효하다 — 최소 table/thead/tr 골격으로 감싼다 */
const tableFrame: Decorator = (Story) => (
  <table style={{ borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <Story />
      </tr>
    </thead>
  </table>
);

const meta: Meta<typeof SelectAllHeaderCell> = {
  title: 'Molecules/TableSelection/SelectAllHeaderCell',
  component: SelectAllHeaderCell,
  argTypes: { ...SelectAllHeaderCellArgTypes },
  args: {
    label: '이 페이지의 FAQ 전체 선택',
    labelId: 'select-all-faq',
    selection: { allSelected: false, someSelected: false },
    onToggleAll: fn(),
  },
  decorators: [tableFrame],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof SelectAllHeaderCell>;

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

/** off — 아무것도 선택 안 됨 */
export const None: Story = { args: { selection: { allSelected: false, someSelected: false } } };

/** on — 전부 선택됨 (checked) */
export const All: Story = { args: { selection: { allSelected: true, someSelected: false } } };

/** mixed — 일부만 선택됨 (indeterminate → aria-checked="mixed") */
export const Some: Story = {
  name: 'SelectAllHeaderCell: indeterminate(mixed) — 일부 선택',
  args: { selection: { allSelected: false, someSelected: true } },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox');
    await expect(box).toHaveAttribute('aria-checked', 'mixed');
  },
};

/** onToggleAll — 클릭이 발화한다 */
export const TogglesAll: Story = {
  name: 'SelectAllHeaderCell: 클릭이 onToggleAll 을 발화한다',
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('checkbox'));
    await expect(args.onToggleAll).toHaveBeenCalledWith(true);
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { selection: { allSelected: false, someSelected: true } },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { label: 'تحديد الكل', selection: { allSelected: true, someSelected: false } },
  decorators: [rtlFrame],
};
