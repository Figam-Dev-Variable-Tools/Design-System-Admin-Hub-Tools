// Checkbox — Storybook 스토리 (CSF3 · Atoms/Checkbox)
//
// argTypes 는 계약 생성물(generated/argtypes/Checkbox.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 5: default/hover/focus-visible/disabled/checked) 전수
//           + boolean(checked·disabled) true/false + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { CheckboxArgTypes } from '../../../generated/argtypes/Checkbox.argtypes';
import { Checkbox } from './Checkbox';
import type { CheckboxProps } from '../../../generated/types/Checkbox.types';

/** 제어 컴포넌트라 스토리에서 checked 를 실제로 토글해 보여준다 (계약: 비제어 미지원) */
function ControlledCheckbox(args: CheckboxProps) {
  const [checked, setChecked] = useState(args.checked);
  useEffect(() => setChecked(args.checked), [args.checked]);
  return (
    <Checkbox
      {...args}
      checked={checked}
      onChange={(event) => {
        setChecked(event.target.checked);
        args.onChange?.(event);
      }}
    />
  );
}

const meta: Meta<typeof Checkbox> = {
  title: 'Inputs/Checkbox',
  component: Checkbox,
  argTypes: { ...CheckboxArgTypes },
  args: {
    id: 'remember-me',
    label: '로그인 상태 유지',
    checked: false,
    disabled: false,
    onChange: fn(),
  },
  render: (args) => <ControlledCheckbox {...args} />,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

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

/** default — 미체크 */
export const Default: Story = {
  args: { checked: false },
};

/** hover — 포인터를 올린 상태 */
export const Hover: Story = {
  args: { checked: false },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const box = within(canvasElement).getByRole('checkbox');
    await userEvent.hover(box);
    await expect(box).toBeEnabled();
  },
};

/** focus-visible — 키보드(Tab)로 포커스 */
export const FocusVisible: Story = {
  args: { checked: false },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const box = within(canvasElement).getByRole('checkbox');
    await userEvent.tab();
    box.focus();
    await expect(box).toHaveFocus();
  },
};

/** checked — 제어 값이 true */
export const Checked: Story = {
  args: { checked: true },
};

/** disabled — onChange 발화 금지 (계약 blockedWhen) */
export const Disabled: Story = {
  args: { checked: false, disabled: true },
};

/* ── 계약 events.onChange.blockedWhen 전수 검증 (disabled) ──────────────────── */

/** Checkbox: disabled 상태에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnChange: Story = {
  name: 'Checkbox: disabled 상태에서 onChange 가 발화하지 않는다',
  args: { checked: false, disabled: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 컨트롤과 라벨 — 두 히트 경로 모두에서 비발생을 확인한다
    await userEvent.click(canvas.getByRole('checkbox'), { pointerEventsCheck: 0 });
    await userEvent.click(canvas.getByText('로그인 상태 유지'), { pointerEventsCheck: 0 });

    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('checkbox')).not.toBeChecked();
  },
};

/** Checkbox: 활성 상태에서는 onChange 가 발화한다 — 위 비발생 단언이 공허하지 않음을 보인다 */
export const OnChangeFiresWhenEnabled: Story = {
  name: 'Checkbox: 활성 상태에서는 onChange 가 발화한다',
  args: { checked: false, disabled: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('checkbox'));

    await expect(args.onChange).toHaveBeenCalledTimes(1);
  },
};

/** checked + disabled */
export const CheckedDisabled: Story = {
  args: { checked: true, disabled: true },
};

/** name — 폼 제출 키 (LoginForm: rememberEmail). 빈 문자열이면 속성을 부여하지 않는다 */
export const WithName: Story = {
  args: { checked: true, name: 'rememberEmail' },
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox');

    await expect(box).toHaveAttribute('name', 'rememberEmail');
  },
};

/** 라벨 클릭이 히트 영역 — 라벨을 눌러 토글된다 (htmlFor={id}) */
export const LabelClickTogglesIt: Story = {
  args: { checked: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('로그인 상태 유지'));

    await expect(canvas.getByRole('checkbox')).toBeChecked();
  },
};

/** 최대 콘텐츠 — 긴 라벨 */
export const LongLabel: Story = {
  args: {
    checked: true,
    label:
      '개인정보 수집·이용에 동의합니다 (수집 항목: 이름·이메일·연락처 / 보유 기간: 회원 탈퇴 시까지)',
  },
  parameters: { layout: 'padded' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { checked: true },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { checked: true, label: 'تذكرني' },
  decorators: [rtlFrame],
};
