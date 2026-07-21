// ColorField — Storybook 스토리 (CSF3)
//
// [구조 — 운영 가이드] Default · States/ · Values/(hex 형식 예) · Behavior/(짧은 이름) · Accessibility/RTL.
// argTypes 는 계약 생성물 spread(수기 금지 — G5). 색 리터럴 남기지 않는다(hexOf 로 조립).
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ColorFieldArgTypes } from '../../../generated/argtypes/ColorField.argtypes';
import { ColorField } from './ColorField';
import type { ColorFieldProps } from '../../../generated/types/ColorField.types';

/** 자릿수 문자열 → `#` 붙인 hex — 구현과 같은 이유로 스토리에도 색 리터럴을 남기지 않는다 */
const hexOf = (digits: string) => `#${digits}`;

/** 제어 컴포넌트 — 스토리에서 실제로 색이 바뀌도록 값을 로컬 상태로 잡는다 */
function ControlledColorField(args: ColorFieldProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <ColorField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

/** 스와치+hex 는 가로로 늘어나는 껍데기라 폭을 주지 않으면 캔버스 전체로 퍼진다 */
const widthFrame: Decorator = (Story) => (
  <div style={{ inlineSize: '14rem' }}>
    <Story />
  </div>
);

const meta: Meta<typeof ColorField> = {
  title: 'Design System/Components/ColorField',
  component: ColorField,
  argTypes: { ...ColorFieldArgTypes },
  args: {
    value: hexOf('6B4EFF'),
    label: 'Canvas color',
    id: '',
    disabled: false,
    onChange: fn(),
  },
  render: (args) => <ControlledColorField {...args} />,
  decorators: [widthFrame],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof ColorField>;

/** 기본 — 스와치와 hex 텍스트가 같은 값을 본다 */
export const Default: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 잠김 — 스와치와 텍스트가 함께 잠긴다 */
export const Disabled: Story = { name: 'States/Disabled', args: { disabled: true } };

/* ── Values (hex 형식) ──────────────────────────────────────────────────── */

/** 3자리 축약(#RGB) — 스와치는 6자리로 펼쳐 받는다(그러지 않으면 네이티브가 검정으로 떨어진다) */
export const ShorthandHex: Story = { name: 'Values/Shorthand Hex', args: { value: hexOf('6B4') } };

/** 8자리(알파 포함) — 데이터는 원본 그대로 두고 스와치만 알파를 잘라 본다 */
export const HexWithAlpha: Story = {
  name: 'Values/Hex With Alpha',
  args: { value: hexOf('6B4EFF80') },
};

/** 빈 값(엣지) — 아직 색이 정해지지 않은 자리. 스와치는 폴백(검정)으로 떨어진다 */
export const EmptyValue: Story = { name: 'Values/Empty Value', args: { value: '' } };

/* ── Behavior ───────────────────────────────────────────────────────────── */

/** 유효한 hex 가 됐을 때만 onChange 가 발화한다(입력 도중 부분 문자열은 올리지 않는다) */
export const EnabledChange: Story = {
  name: 'Behavior/Enabled Change',
  args: { value: '' },
  play: async ({ canvasElement, args }) => {
    const hex = within(canvasElement).getByRole('textbox');

    await userEvent.clear(hex);
    // '#', '#6', '#6B' 은 아직 색이 아니다 — 세 자리가 차는 순간 처음으로 올라간다
    await userEvent.type(hex, hexOf('6B4'));

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(hexOf('6B4'));
  },
};

/** disabled 면 입력해도 onChange 가 발화하지 않는다 (계약 blockedWhen) */
export const DisabledChange: Story = {
  name: 'Behavior/Disabled Change',
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const hex = within(canvasElement).getByRole('textbox');

    await expect(hex).toBeDisabled();
    await userEvent.type(hex, hexOf('FFFFFF'), { pointerEventsCheck: 0 });

    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 스와치·입력의 좌우가 문서 방향을 따른다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { label: '캔버스 색' },
  decorators: [
    (Story) => (
      <div dir="rtl" style={{ padding: 'var(--tds-space-5)', inlineSize: '14rem' }}>
        <Story />
      </div>
    ),
  ],
};
