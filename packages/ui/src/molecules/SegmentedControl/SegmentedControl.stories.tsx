// SegmentedControl — Storybook 스토리 (CSF3 · Molecules/SegmentedControl)
//
// argTypes 는 계약 생성물(generated/argtypes/SegmentedControl.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(size 2 × state 5 = 10) 전수 + boolean(disabled) true/false + Dark/RTL.
// options 는 데이터 prop 이라 control 이 비활성 — Story args 로 직접 준다 (ADR-0003).
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { SegmentedControlArgTypes } from '../../../generated/argtypes/SegmentedControl.argtypes';
import { SegmentedControl } from './SegmentedControl';
import type { SegmentedControlProps } from '../../../generated/types/SegmentedControl.types';

const RANGE_OPTIONS = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
];

/** 제어 컴포넌트 — 선택 값을 스토리가 잡는다 */
function ControlledSegmentedControl(args: SegmentedControlProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <SegmentedControl
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof SegmentedControl> = {
  title: 'Molecules/SegmentedControl',
  component: SegmentedControl,
  argTypes: { ...SegmentedControlArgTypes },
  args: {
    value: 'day',
    options: RANGE_OPTIONS,
    size: 'md',
    disabled: false,
    ariaLabel: '조회 기간',
    onChange: fn(),
  },
  render: (args) => <ControlledSegmentedControl {...args} />,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof SegmentedControl>;

/** 첫 세그먼트(비선택 상태 확인용은 두 번째) — 라디오 목록에서 집는다 */
const segments = (canvasElement: HTMLElement) => within(canvasElement).getAllByRole('radio');

/**
 * play 컨텍스트 — 구조 분해를 파라미터에서 하지 않는다.
 *
 * [왜 이렇게 쓰는가] 테스트 커버리지의 정적 스캐너는 `play: hover` 같은 **참조형 play** 를
 * 모듈 스코프 함수 본문까지 따라가 단언을 센다. 그런데 파라미터에서 구조 분해하면
 * (`async ({ canvasElement }) => {`) 스캐너가 선언 직후의 첫 `{` 를 **함수 본문으로 오인**해
 * 구조 분해 괄호를 본문으로 잡고, 진짜 본문의 expect 를 보지 못한다.
 * 단언은 존재하는데 보이지 않는 것 — 그것도 초록불 위조와 같은 결과를 낸다.
 * 그래서 파라미터를 통째로 받고 본문에서 꺼내 쓴다 (동작은 동일하다).
 */
interface PlayCtx {
  readonly canvasElement: HTMLElement;
}

const hover = async (ctx: PlayCtx) => {
  const [, second] = segments(ctx.canvasElement);
  await expect(second).toBeDefined();
  await userEvent.hover(second as HTMLElement);
  await expect(second).toHaveAttribute('aria-checked', 'false');
};

/** focus-visible — 로빙 tabindex 상 탭 진입점(선택된 세그먼트)이 포커스를 받는다 */
const focusVisible = async (ctx: PlayCtx) => {
  await userEvent.tab();
  const focused = ctx.canvasElement.querySelector('[role="radio"][tabindex="0"]');
  await expect(focused).not.toBeNull();
  await expect(focused).toHaveFocus();
};

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

// --- size=sm × state 5 -------------------------------------------------------
/** sm · default */
export const SmDefault: Story = { args: { size: 'sm' } };
/** sm · hover (비선택 세그먼트 위) */
export const SmHover: Story = { args: { size: 'sm' }, play: hover };
/** sm · focus-visible */
export const SmFocusVisible: Story = { args: { size: 'sm' }, play: focusVisible };
/** sm · disabled — onChange 발화 금지 (계약 blockedWhen) */
export const SmDisabled: Story = { args: { size: 'sm', disabled: true } };
/** sm · selected — value 와 일치하는 세그먼트가 알약으로 뜬다 (aria-checked=true) */
export const SmSelected: Story = { args: { size: 'sm', value: 'month' } };

// --- size=md × state 5 -------------------------------------------------------
/** md · default */
export const MdDefault: Story = { args: { size: 'md' } };
/** md · hover */
export const MdHover: Story = { args: { size: 'md' }, play: hover };
/** md · focus-visible */
export const MdFocusVisible: Story = { args: { size: 'md' }, play: focusVisible };
/** md · disabled */
export const MdDisabled: Story = { args: { size: 'md', disabled: true } };
/** md · selected */
export const MdSelected: Story = { args: { size: 'md', value: 'week' } };

// --- 키보드 / 데이터 / 테마 ---------------------------------------------------
/** ArrowRight — 선택과 포커스를 함께 옮긴다 (라디오 그룹 관례 · 키 핸들러는 radio 가 소유한다) */
export const ArrowKeyNavigation: Story = {
  args: { value: 'day' },
  play: async ({ canvasElement, args }) => {
    const [first, second] = segments(canvasElement);
    first?.focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect(args.onChange).toHaveBeenLastCalledWith('week');
    await expect(second).toHaveFocus();
    await expect(second).toHaveAttribute('aria-checked', 'true');
  },
};

/* ── 계약 events.onChange.blockedWhen 전수 검증 (disabled) ──────────────────── */

/** SegmentedControl: disabled 상태에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnChange: Story = {
  name: 'SegmentedControl: disabled 상태에서 onChange 가 발화하지 않는다',
  args: { value: 'day', disabled: true },
  play: async ({ canvasElement, args }) => {
    const [first, second] = segments(canvasElement);

    // 클릭 경로 — disabled 속성을 지우고 CSS 로만 흐리게 처리하면 이 단언이 깨진다
    await userEvent.click(second as HTMLElement, { pointerEventsCheck: 0 });

    // 키보드 경로 — 화살표 키도 차단돼야 한다 (선택이 포커스를 따르는 라디오 그룹이므로).
    // disabled 요소는 포커스를 받지 못하므로 keydown 을 직접 디스패치해 차단 로직 자체를 시험한다.
    first?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );

    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(first).toHaveAttribute('aria-checked', 'true'); // 선택이 옮겨가지 않았다
  },
};

/** SegmentedControl: 활성 상태에서는 onChange 가 발화한다 — 위 비발생 단언이 공허하지 않음을 보인다 */
export const OnChangeFiresWhenEnabled: Story = {
  name: 'SegmentedControl: 활성 상태에서는 onChange 가 발화한다',
  args: { value: 'day', disabled: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('radio', { name: '월' }));

    await expect(args.onChange).toHaveBeenCalledWith('month');
  },
};

/** 최소 콘텐츠 — 세그먼트 2개 */
export const MinimalOptions: Story = {
  args: {
    value: 'on',
    options: [
      { id: 'on', label: '노출' },
      { id: 'off', label: '숨김' },
    ],
    ariaLabel: '노출 여부',
  },
};

/** 최대 콘텐츠 — 세그먼트가 많고 라벨이 길 때 (트랙이 넘치지 않고 늘어난다) */
export const LongOptions: Story = {
  args: {
    value: 'quarter',
    options: [
      { id: 'day', label: '오늘' },
      { id: 'week', label: '이번 주' },
      { id: 'month', label: '이번 달' },
      { id: 'quarter', label: '이번 분기(3개월)' },
      { id: 'year', label: '올해 전체(12개월)' },
    ],
    ariaLabel: '조회 기간',
  },
  parameters: { layout: 'padded' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { value: 'week' },
  decorators: [darkFrame],
};

/** RTL — 세그먼트 순서가 문서 방향을 따른다 */
export const RightToLeft: Story = {
  args: {
    value: 'week',
    options: [
      { id: 'day', label: 'يوم' },
      { id: 'week', label: 'أسبوع' },
      { id: 'month', label: 'شهر' },
    ],
    ariaLabel: 'نطاق التاريخ',
  },
  decorators: [rtlFrame],
};
