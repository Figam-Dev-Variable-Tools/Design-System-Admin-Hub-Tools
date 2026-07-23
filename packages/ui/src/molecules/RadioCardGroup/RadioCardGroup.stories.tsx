// RadioCardGroup — Storybook 스토리 (CSF3)
//
// [고정 IA — Form 계열 · Button 기준] disabled 2조합·선택 위치를 낱개로 폭발시키지 않는다. 대표 상태만
// 그룹으로 남기고 세부 조합은 Playground Controls 로 넘긴다(Behavior 금지 → Interaction · Slot 금지 → Content):
//   Overview · Playground · States/(Selected·Disabled) · Content/(Many Options·With Description·Empty)
//   · Accessibility/(ARIA radiogroup·RTL) · Interaction/(Select Option·Arrow Navigation·Disabled Change)
// 계약 states[]·blockedWhen(disabled) 전수 검증은 RadioCardGroup.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { RadioCardGroupArgTypes } from '../../../generated/argtypes/RadioCardGroup.argtypes';
import { RadioCardGroup } from './RadioCardGroup';
import type { RadioCardGroupProps } from '../../../generated/types/RadioCardGroup.types';

const VISIBILITY = [
  { value: 'public', label: '전체 공개', description: '누구나 내 사이트에 접속할 수 있어요' },
  { value: 'private', label: '비공개', description: '관리자만 접근할 수 있어요' },
];

/** 제어 컴포넌트 — 스토리에서 실제로 선택이 옮겨 가도록 값을 로컬 상태로 잡는다 */
function ControlledRadioCardGroup(args: RadioCardGroupProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <RadioCardGroup
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof RadioCardGroup> = {
  title: 'Design System/Components/RadioCardGroup',
  component: RadioCardGroup,
  argTypes: { ...RadioCardGroupArgTypes },
  args: {
    name: 'visibility',
    legend: '사이트 접근 범위',
    value: 'public',
    options: VISIBILITY,
    disabled: false,
    onChange: fn(),
  },
  render: (args) => <ControlledRadioCardGroup {...args} />,
  // 카드가 설명 한 줄을 품는 넓이라, 폭을 주지 않으면 캔버스 전체로 퍼진다
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '28rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof RadioCardGroup>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)', inlineSize: '28rem' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새. 첫 선택지가 켜진 2지 선택 카드 그룹 */
export const Overview: Story = { args: { value: 'public' } };

/** Playground — Controls 에서 value·disabled·legend 를 바꿔 전 조합을 여기서 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 선택됨 — 첫 항목이 아니라 마지막 항목이 켜진 카드(테두리·배경·라디오 점이 함께 바뀐다) */
export const Selected: Story = {
  name: 'States/Selected',
  args: { value: 'private' },
};

/** 잠김 — 모든 카드가 잠기고 라벨이 흐려진다 (선택 표시는 그대로 남는다) */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 선택지 여럿 — 카드가 늘어도 설명이 제목과 같은 클릭 영역에 남는다 */
export const ThreeOptions: Story = {
  name: 'Content/Many Options',
  args: {
    name: 'indexing',
    legend: '검색엔진 노출',
    value: 'all',
    options: [
      { value: 'all', label: '전체 허용', description: '모든 페이지가 검색 결과에 나타나요' },
      { value: 'partial', label: '일부 허용', description: '공개 페이지만 검색 결과에 나타나요' },
      { value: 'none', label: '차단', description: '어떤 페이지도 검색 결과에 나타나지 않아요' },
    ],
  },
};

/** 긴 설명 — 두 줄로 접혀도 라디오 점이 첫 줄에 고정된다 */
export const LongDescription: Story = {
  name: 'Content/With Description',
  args: {
    options: [
      {
        value: 'public',
        label: '전체 공개',
        description:
          '누구나 내 사이트에 접속할 수 있어요. 검색엔진 수집도 함께 허용되며, 로그인하지 않은 방문자에게도 모든 공개 페이지가 그대로 보여요.',
      },
      { value: 'private', label: '비공개', description: '관리자만 접근할 수 있어요' },
    ],
  },
};

/** 선택지 없음(엣지) — legend 만 남는다. 빈 그룹을 지어내지 않는다 */
export const EmptyOptions: Story = {
  name: 'Content/Empty',
  args: { value: '', options: [] },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** ARIA radiogroup — role=radiogroup 이 legend 로 이름을 갖고, 고른 카드만 checked 로 노출된다 */
export const AriaRadiogroup: Story = {
  name: 'Accessibility/ARIA radiogroup',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('radiogroup', { name: '사이트 접근 범위' })).toBeInTheDocument();

    const radios = canvas.getAllByRole('radio');
    await expect(radios).toHaveLength(2);
    await expect(canvas.getByRole('radio', { name: '전체 공개' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: '비공개' })).not.toBeChecked();
  },
};

/** RTL — 논리 속성이라 라디오·라벨·설명의 좌우가 문서 방향을 따른다(문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    legend: '사이트 접근 범위',
    options: [
      { value: 'public', label: '전체 공개', description: '누구나 내 사이트에 접속할 수 있어요' },
      { value: 'private', label: '비공개', description: '관리자만 접근할 수 있어요' },
    ],
  },
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 카드를 고르면 그 value 로 onChange 가 발화한다 */
export const FiresWhenEnabled: Story = {
  name: 'Interaction/Select Option',
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('radio', { name: '비공개' }));
    await expect(args.onChange).toHaveBeenCalledWith('private');
  },
};

/** 화살표로 이동하면 네이티브 라디오가 다음 항목을 켠다 — onChange 가 그 value 로 발화한다 */
export const ArrowNavigation: Story = {
  name: 'Interaction/Arrow Navigation',
  play: async ({ canvasElement, args }) => {
    const first = within(canvasElement).getByRole('radio', { name: '전체 공개' });
    first.focus();
    await expect(first).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenCalledWith('private');
  },
};

/** disabled 면 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabled: Story = {
  name: 'Interaction/Disabled Change',
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const radio = within(canvasElement).getByRole('radio', { name: '비공개' });

    await expect(radio).toBeDisabled();
    await userEvent.click(radio, { pointerEventsCheck: 0 });

    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
