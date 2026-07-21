// TriStateCheckbox — Storybook 스토리 (CSF3 · 고정 IA · Button 기준)
//
// [고정 IA] checked·indeterminate·disabled 8조합을 낱개 스토리로 폭발시키지 않는다. 대표 상태만
// 남기고(States/Unchecked·Checked·Indeterminate·Disabled), 세부 조합(On+Mixed·Mixed+Disabled …)은
// Playground Controls 로 넘긴다:
//   Docs · Overview · Playground · States/ · Accessibility/RTL · Interaction/
// 8조합 전수 검증(aria-checked=mixed 조건 포함)은 TriStateCheckbox.test.tsx 가 소유.
// argTypes 는 계약 생성물(generated/argtypes/TriStateCheckbox.argtypes)을 spread 한다 (수기 금지 — G5).
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
  title: 'Design System/Components/TriStateCheckbox',
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

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새(부분 선택). 이 컴포넌트를 일반 Checkbox 와 가르는 mixed 상태를 보인다 */
export const Overview: Story = { args: { indeterminate: true } };

/** Playground — checked·indeterminate·disabled 를 Controls 로 바꿔 전 8조합을 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** off — 미선택 */
export const Off: Story = {
  name: 'States/Unchecked',
  args: { checked: false, indeterminate: false },
};

/** on — 전체 선택 */
export const On: Story = { name: 'States/Checked', args: { checked: true, indeterminate: false } };

/** mixed — 부분 선택 (aria-checked="mixed"). indeterminate 가 checked 보다 우선 표시된다 */
export const Mixed: Story = {
  name: 'States/Indeterminate',
  args: { checked: false, indeterminate: true },
};

/** disabled (잠금) — 잠기면 indeterminate 표시를 끈다. 세부 on/off/mixed 조합은 Playground 에서 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { checked: true, indeterminate: false, disabled: true },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 체크박스가 라벨의 오른쪽에 온다(문서 방향만 뒤집는다 · 문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { checked: true, indeterminate: false, label: '이 페이지의 회원 전체 선택' },
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 활성 상태에서는 클릭이 onChange 를 다음 상태(true)로 발화한다 */
export const FiresWhenEnabled: Story = {
  name: 'Interaction/Enabled Change',
  args: { checked: false, indeterminate: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('checkbox'));
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

/** disabled 면 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabled: Story = {
  name: 'Interaction/Disabled Change',
  args: { checked: false, indeterminate: false, disabled: true },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('checkbox'), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
