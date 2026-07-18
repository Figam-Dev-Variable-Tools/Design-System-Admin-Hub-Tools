// TriStateCheckbox — Storybook 스토리 (CSF3 · Atoms/TriStateCheckbox)
//
// argTypes 는 계약 생성물(generated/argtypes/TriStateCheckbox.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(checked·indeterminate·disabled = 2^3 = 8) 전수 + blockedWhen(disabled) +
//           활성 발화 대조 + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { TriStateCheckboxArgTypes } from '../../../generated/argtypes/TriStateCheckbox.argtypes';
import { TriStateCheckbox } from './TriStateCheckbox';
import type { TriStateCheckboxProps } from '../../../generated/types/TriStateCheckbox.types';

/** 제어 컴포넌트라 스토리에서 checked 를 실제로 토글해 보여준다 */
function ControlledTriState(args: TriStateCheckboxProps) {
  const [checked, setChecked] = useState(args.checked);
  useEffect(() => setChecked(args.checked), [args.checked]);
  return (
    <TriStateCheckbox
      {...args}
      checked={checked}
      onChange={(next) => {
        setChecked(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof TriStateCheckbox> = {
  title: 'Inputs/TriStateCheckbox',
  component: TriStateCheckbox,
  argTypes: { ...TriStateCheckboxArgTypes },
  args: {
    checked: false,
    indeterminate: false,
    disabled: false,
    label: '이 페이지의 회원 전체 선택',
    onChange: fn(),
  },
  render: (args) => <ControlledTriState {...args} />,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof TriStateCheckbox>;

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

/* ── combinationMatrix 전수 (checked × indeterminate × disabled = 8) ───────── */

/** off — 미선택 */
export const Off: Story = { args: { checked: false, indeterminate: false } };

/** on — 전체 선택 */
export const On: Story = { args: { checked: true, indeterminate: false } };

/** mixed — 일부 선택 (aria-checked="mixed") */
export const Mixed: Story = { args: { checked: false, indeterminate: true } };

/** on + mixed — indeterminate 가 checked 보다 우선 표시된다 */
export const OnMixed: Story = { args: { checked: true, indeterminate: true } };

/** off + disabled */
export const OffDisabled: Story = {
  args: { checked: false, indeterminate: false, disabled: true },
};

/** on + disabled */
export const OnDisabled: Story = { args: { checked: true, indeterminate: false, disabled: true } };

/** mixed + disabled — 잠기면 indeterminate 표시를 끈다 */
export const MixedDisabled: Story = {
  args: { checked: false, indeterminate: true, disabled: true },
};

/** on + mixed + disabled */
export const OnMixedDisabled: Story = {
  args: { checked: true, indeterminate: true, disabled: true },
};

/* ── 계약 events.onChange.blockedWhen 전수 검증 (disabled) ──────────────────── */

/** TriStateCheckbox: disabled 에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabled: Story = {
  name: 'TriStateCheckbox: disabled 상태에서 onChange 가 발화하지 않는다',
  args: { checked: false, indeterminate: false, disabled: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('checkbox'), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** TriStateCheckbox: 활성 상태에서는 onChange 가 발화한다 (비발생 단언이 공허하지 않음을 보인다) */
export const FiresWhenEnabled: Story = {
  name: 'TriStateCheckbox: 활성 상태에서는 onChange 가 발화한다',
  args: { checked: false, indeterminate: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('checkbox'));
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { checked: false, indeterminate: true },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { checked: true, indeterminate: false, label: 'تحديد الكل' },
  decorators: [rtlFrame],
};
