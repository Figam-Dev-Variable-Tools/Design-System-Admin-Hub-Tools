// TextareaField — Storybook 스토리 (CSF3 · Molecules/TextareaField)
//
// argTypes 는 계약 생성물(generated/argtypes/TextareaField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(required 2 × disabled 2 = 4) 전수 + states(default/focus-visible/disabled/error)
//           + events.onChange.blockedWhen(disabled) 비발생 + Dark/RTL.
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { TextareaFieldArgTypes } from '../../../generated/argtypes/TextareaField.argtypes';
import { TextareaField } from './TextareaField';

/** 제어 컴포넌트 — 값은 스토리가 잡는다 */
function ControlledTextareaField(args: ComponentProps<typeof TextareaField>) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <TextareaField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof TextareaField> = {
  title: 'Inputs/TextareaField',
  component: TextareaField,
  argTypes: { ...TextareaFieldArgTypes },
  args: {
    label: '본문',
    value: '공지 본문 예시입니다.',
    maxLength: 500,
    required: false,
    disabled: false,
    error: '',
    hint: '',
    placeholder: '내용을 입력하세요',
    rows: 6,
    onChange: fn(),
  },
  render: (args) => <ControlledTextareaField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof TextareaField>;

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

/* ── combinationMatrix 전수 (required 2 × disabled 2) ─────────────────────── */

/** default — 카운터(N/max) + 힌트 */
export const Default: Story = {
  args: { required: false, disabled: false, hint: '최대 500자' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: '본문' })).toBeEnabled();
    await expect(canvas.getByText('11/500')).toBeVisible();
  },
};

/** focus-visible — 키보드 포커스 */
export const FocusVisible: Story = {
  name: 'TextareaField: focus-visible 상태',
  args: { required: false, disabled: false },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('textbox', { name: '본문' })).toHaveFocus();
  },
};

/** required=true / disabled=false */
export const RequiredField: Story = {
  args: { required: true, disabled: false },
};

/** disabled — native disabled (onChange 발화 금지) */
export const Disabled: Story = {
  args: { required: false, disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('textbox', { name: '본문' })).toBeDisabled();
  },
};

/** required=true / disabled=true (조합 전수) */
export const RequiredDisabled: Story = {
  args: { required: true, disabled: true },
};

/** error — role=alert 오류 + 붉은 테두리 */
export const Error: Story = {
  name: 'TextareaField: error 상태',
  args: { value: '', error: '본문을 입력하세요' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('본문을 입력하세요');
  },
};

/** blockedWhen — disabled 에서 onChange 가 발화하지 않는다 (스파이 비발생) */
export const BlockedWhenDisabledOnChange: Story = {
  name: 'TextareaField: disabled 상태에서 onChange 가 발화하지 않는다',
  args: { value: '', disabled: true, onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const textarea = within(canvasElement).getByRole('textbox', { name: '본문' });
    await userEvent.type(textarea, 'xyz', { pointerEventsCheck: 0 });
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** 긴 내용 — 카운터 상한 근처 */
export const LongContent: Story = {
  args: {
    value:
      '이 공지는 매우 긴 본문을 담고 있어 카운터가 상한에 가까워진 상태를 보여 줍니다. '.repeat(4),
    hint: '최대 500자',
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { hint: '최대 500자' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { label: 'المحتوى', value: 'نص تجريبي', placeholder: 'أدخل المحتوى' },
  decorators: [rtlFrame],
};
