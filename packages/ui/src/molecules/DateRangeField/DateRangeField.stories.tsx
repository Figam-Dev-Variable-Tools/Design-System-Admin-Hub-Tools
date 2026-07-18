// DateRangeField — Storybook 스토리 (CSF3 · Molecules/DateRangeField)
//
// argTypes 는 계약 생성물(generated/argtypes/DateRangeField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(required 2 × disabled 2 = 4) 전수 + states(default/focus-visible/disabled/error)
//           + 값 콜백 + Dark/RTL.
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { DateRangeFieldArgTypes } from '../../../generated/argtypes/DateRangeField.argtypes';
import { DateRangeField } from './DateRangeField';

/** 제어 컴포넌트 — 시작/종료 값은 스토리가 잡는다 */
function ControlledDateRangeField(args: ComponentProps<typeof DateRangeField>) {
  const [start, setStart] = useState(args.startValue);
  const [end, setEnd] = useState(args.endValue);
  useEffect(() => setStart(args.startValue), [args.startValue]);
  useEffect(() => setEnd(args.endValue), [args.endValue]);
  return (
    <DateRangeField
      {...args}
      startValue={start}
      endValue={end}
      onStartChange={(next) => {
        setStart(next);
        args.onStartChange?.(next);
      }}
      onEndChange={(next) => {
        setEnd(next);
        args.onEndChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof DateRangeField> = {
  title: 'Inputs/DateRangeField',
  component: DateRangeField,
  argTypes: { ...DateRangeFieldArgTypes },
  args: {
    label: '노출 기간',
    startValue: '2026-07-01',
    endValue: '2026-07-31',
    required: false,
    disabled: false,
    error: '',
    hint: '',
    onStartChange: fn(),
    onEndChange: fn(),
  },
  render: (args) => <ControlledDateRangeField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof DateRangeField>;

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

/** default — 두 날짜 칸 + '~' */
export const Default: Story = {
  args: { required: false, disabled: false, hint: '비워 두면 상시 노출됩니다' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText('노출 기간 시작일')).toHaveValue('2026-07-01');
    await expect(canvas.queryByRole('alert')).toBeNull();
  },
};

/** focus-visible — 키보드 포커스 */
export const FocusVisible: Story = {
  name: 'DateRangeField: focus-visible 상태',
  args: { required: false, disabled: false },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByLabelText('노출 기간 시작일')).toHaveFocus();
  },
};

/** required=true / disabled=false */
export const RequiredField: Story = {
  args: { required: true, disabled: false },
};

/** disabled — 두 입력 모두 native disabled */
export const Disabled: Story = {
  args: { required: false, disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('노출 기간 시작일')).toBeDisabled();
  },
};

/** required=true / disabled=true (조합 전수) */
export const RequiredDisabled: Story = {
  args: { required: true, disabled: true },
};

/** error — 종료<시작 규칙 위반을 스키마가 내려준 상태 (role=alert) */
export const Error: Story = {
  name: 'DateRangeField: error 상태',
  args: {
    startValue: '2026-07-31',
    endValue: '2026-07-01',
    error: '종료일은 시작일 이후여야 합니다',
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      '종료일은 시작일 이후여야 합니다',
    );
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { hint: '비워 두면 상시 노출됩니다' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { label: 'فترة العرض' },
  decorators: [rtlFrame],
};
