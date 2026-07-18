// RowSelectCell — Storybook 스토리 (CSF3 · Molecules/TableSelection/RowSelectCell)
//
// argTypes 는 계약 생성물(generated/argtypes/RowSelectCell.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(checked = 2) + states(default/focus-visible/checked) + onToggle + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { RowSelectCellArgTypes } from '../../../generated/argtypes/RowSelectCell.argtypes';
import { RowSelectCell } from './RowSelectCell';
import type { RowSelectCellProps } from '../../../generated/types/RowSelectCell.types';

/** <td> 는 표 안에서만 유효하다 — 스토리에서 최소 table 골격으로 감싼다 */
const tableFrame: Decorator = (Story) => (
  <table style={{ borderCollapse: 'collapse' }}>
    <tbody>
      <tr>
        <Story />
      </tr>
    </tbody>
  </table>
);

/** 제어 컴포넌트 — checked 는 스토리가 잡는다 */
function ControlledRowSelectCell(args: RowSelectCellProps) {
  const [checked, setChecked] = useState(args.checked);
  useEffect(() => setChecked(args.checked), [args.checked]);
  return (
    <RowSelectCell
      {...args}
      checked={checked}
      onToggle={(next) => {
        setChecked(next);
        args.onToggle?.(next);
      }}
    />
  );
}

const meta: Meta<typeof RowSelectCell> = {
  title: 'Tables/RowSelectCell',
  component: RowSelectCell,
  argTypes: { ...RowSelectCellArgTypes },
  args: {
    id: 'faq-1',
    label: '자주 묻는 질문 선택',
    checked: false,
    onToggle: fn(),
  },
  render: (args) => <ControlledRowSelectCell {...args} />,
  decorators: [tableFrame],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof RowSelectCell>;

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

/* ── combinationMatrix 전수 (checked = 2) ──────────────────────────────────── */

/** 미선택 */
export const Unchecked: Story = { args: { checked: false } };

/** 선택됨 */
export const Checked: Story = { args: { checked: true } };

/** onToggle — 클릭이 다음 상태로 발화한다 */
export const TogglesOnClick: Story = {
  name: 'RowSelectCell: 클릭이 onToggle 을 다음 상태로 발화한다',
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole('checkbox', { name: '자주 묻는 질문 선택' }),
    );
    await expect(args.onToggle).toHaveBeenCalledWith(true);
  },
};

/** Dark */
export const DarkTheme: Story = { args: { checked: true }, decorators: [darkFrame] };

/** RTL */
export const RightToLeft: Story = { args: { label: 'تحديد' }, decorators: [rtlFrame] };
