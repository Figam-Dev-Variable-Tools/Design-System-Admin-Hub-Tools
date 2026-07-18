// ToggleSwitch — Storybook 스토리 (CSF3 · Atoms/ToggleSwitch)
//
// argTypes 는 계약 생성물(generated/argtypes/ToggleSwitch.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(checked·disabled·busy = 2^3 = 8) 전수 + blockedWhen(disabled·busy) +
//           활성 발화 대조 + 커스텀 문구 + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ToggleSwitchArgTypes } from '../../../generated/argtypes/ToggleSwitch.argtypes';
import { ToggleSwitch } from './ToggleSwitch';
import type { ToggleSwitchProps } from '../../../generated/types/ToggleSwitch.types';

/** 제어 컴포넌트라 스토리에서 checked 를 실제로 토글해 보여준다 */
function ControlledToggle(args: ToggleSwitchProps) {
  const [checked, setChecked] = useState(args.checked);
  useEffect(() => setChecked(args.checked), [args.checked]);
  return (
    <ToggleSwitch
      {...args}
      checked={checked}
      onChange={(next) => {
        setChecked(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof ToggleSwitch> = {
  title: 'Inputs/ToggleSwitch',
  component: ToggleSwitch,
  argTypes: { ...ToggleSwitchArgTypes },
  args: {
    checked: false,
    label: 'FAQ 노출 여부',
    disabled: false,
    busy: false,
    onLabel: 'ON',
    offLabel: 'OFF',
    onChange: fn(),
  },
  render: (args) => <ControlledToggle {...args} />,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof ToggleSwitch>;

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

/* ── combinationMatrix 전수 (checked × disabled × busy = 8) ────────────────── */

/** off */
export const Off: Story = { args: { checked: false } };

/** on */
export const On: Story = { args: { checked: true } };

/** off + disabled */
export const OffDisabled: Story = { args: { checked: false, disabled: true } };

/** on + disabled */
export const OnDisabled: Story = { args: { checked: true, disabled: true } };

/** off + busy (진행 중 잠금 + aria-busy) */
export const OffBusy: Story = { args: { checked: false, busy: true } };

/** on + busy */
export const OnBusy: Story = { args: { checked: true, busy: true } };

/** off + disabled + busy (둘 다 — 잠금) */
export const OffDisabledBusy: Story = { args: { checked: false, disabled: true, busy: true } };

/** on + disabled + busy */
export const OnDisabledBusy: Story = { args: { checked: true, disabled: true, busy: true } };

/* ── 계약 events.onChange.blockedWhen 전수 검증 ──────────────────────────── */

/** ToggleSwitch: disabled 에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabled: Story = {
  name: 'ToggleSwitch: disabled 상태에서 onChange 가 발화하지 않는다',
  args: { checked: false, disabled: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('switch'), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** ToggleSwitch: busy 에서 onChange 가 발화하지 않는다 (계약 blockedWhen: busy) */
export const BlockedWhenBusy: Story = {
  name: 'ToggleSwitch: busy 상태에서 onChange 가 발화하지 않는다',
  args: { checked: false, busy: true },
  play: async ({ canvasElement, args }) => {
    const sw = within(canvasElement).getByRole('switch');
    await expect(sw).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(sw, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** ToggleSwitch: 활성 상태에서는 onChange 가 다음 상태로 발화한다 (비발생 단언이 공허하지 않음을 보인다) */
export const FiresWhenEnabled: Story = {
  name: 'ToggleSwitch: 활성 상태에서는 onChange 가 발화한다',
  args: { checked: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('switch'));
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

/** 커스텀 ON/OFF 문구 (노출/숨김 등) */
export const CustomLabels: Story = {
  args: { checked: true, onLabel: '노출', offLabel: '숨김', label: 'FAQ 노출' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { checked: true },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { checked: true, label: 'إظهار', onLabel: 'تشغيل', offLabel: 'إيقاف' },
  decorators: [rtlFrame],
};
