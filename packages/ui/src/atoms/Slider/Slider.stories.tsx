// Slider — Storybook 스토리 (CSF3)
//
// [고정 IA — Button 기준] 값·범위·단위 조합을 낱개로 폭발시키지 않는다. min·max·step·unit 은
// Controls 로 바꾸고, 대표 상태·콘텐츠 형태만 그룹으로 남긴다(Behavior 금지 → Interaction):
//   Overview · Playground · States/ · Content/ · Examples/ · Accessibility/RTL · Interaction/
// 상태 규칙(hover·focus-visible)·blockedWhen 전수 검증은 Slider.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { SliderArgTypes } from '../../../generated/argtypes/Slider.argtypes';
import { Slider } from './Slider';
import type { SliderProps } from '../../../generated/types/Slider.types';

/** 제어 컴포넌트 — 스토리에서 실제로 손잡이가 움직이도록 값을 로컬 상태로 잡는다 */
function ControlledSlider(args: SliderProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <Slider
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof Slider> = {
  title: 'Design System/Components/Slider',
  component: Slider,
  argTypes: { ...SliderArgTypes },
  args: {
    value: 16,
    min: 0,
    max: 40,
    step: 1,
    label: 'Padding top',
    unit: 'px',
    id: '',
    disabled: false,
    onChange: fn(),
  },
  render: (args) => <ControlledSlider {...args} />,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Slider>;

/** 트랙은 컨테이너 폭을 채우는 형태라, 폭을 주지 않으면 캔버스 전체로 퍼진다 */
const FRAME_STYLE = { inlineSize: '20rem' };

const widthFrame: Decorator = (Story) => (
  <div style={FRAME_STYLE}>
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)', inlineSize: '20rem' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새. 값 표시가 트랙 옆에 붙는다 */
export const Overview: Story = {
  decorators: [widthFrame],
};

/**
 * Playground — min·max·step·unit·disabled 를 Controls 로 바꿔 전 조합을 본다.
 * min·max·step 은 서로 맞물리는 값이라(step 이 범위를 나누지 못하면 끝 값에 닿지 못한다)
 * 하나씩 고정된 스토리로는 그 상호작용이 보이지 않는다 — 여기서 같이 움직여 본다.
 */
export const Playground: Story = {
  decorators: [widthFrame],
};

/* ── States ─────────────────────────────────────────────────────────────── */

/** disabled (잠금) — 트랙과 값 표시가 함께 흐려진다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true },
  decorators: [widthFrame],
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최솟값(0) — 손잡이가 왼쪽 끝에 붙는다 */
export const AtMinimum: Story = {
  name: 'Content/At Minimum',
  args: { value: 0 },
  decorators: [widthFrame],
};

/** 최댓값 — 손잡이가 오른쪽 끝에 붙는다. 자릿수가 늘어도 트랙이 흔들리지 않는다(tabular-nums) */
export const AtMaximum: Story = {
  name: 'Content/At Maximum',
  args: { value: 40 },
  decorators: [widthFrame],
};

/** 단위 없음 — 숫자만 보인다 */
export const WithoutUnit: Story = {
  name: 'Content/Without Unit',
  args: { value: 3, min: 0, max: 10, unit: '', label: 'Divider height' },
  decorators: [widthFrame],
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 큰 step — 화살표 한 번이 10씩 움직인다 (글자 크기·미디어 크기 같은 거친 축) */
export const CoarseStep: Story = {
  name: 'Examples/Coarse Step',
  args: { value: 40, min: 0, max: 200, step: 10, label: 'Media width' },
  decorators: [widthFrame],
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 트랙 방향이 뒤집혀도 값 표시가 트랙 반대편에 붙는다(라벨은 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { label: '상단 여백' },
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 활성 상태에서는 값을 옮기면 onChange 가 발화한다 (비발생 단언이 공허하지 않음을 보인다) */
export const FiresWhenEnabled: Story = {
  name: 'Interaction/Enabled Change',
  decorators: [widthFrame],
  play: async ({ canvasElement, args }) => {
    const slider = within(canvasElement).getByRole('slider');

    await userEvent.click(slider);
    await userEvent.keyboard('{ArrowRight}');

    await expect(args.onChange).toHaveBeenCalled();
  },
};

/** disabled 면 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabled: Story = {
  name: 'Interaction/Disabled Change',
  args: { disabled: true },
  decorators: [widthFrame],
  play: async ({ canvasElement, args }) => {
    const slider = within(canvasElement).getByRole('slider');

    await expect(slider).toBeDisabled();
    await userEvent.click(slider, { pointerEventsCheck: 0 });

    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
