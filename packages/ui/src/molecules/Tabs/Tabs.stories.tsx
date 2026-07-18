// Tabs — Storybook 스토리 (CSF3 · Molecules/Tabs)
//
// argTypes 는 계약 생성물(generated/argtypes/Tabs.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 4: default/hover/focus-visible/selected) 전수 + Dark/RTL.
// items 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
//
// 탭 패널은 Tabs 가 렌더하지 않는다 — aria-controls 가 가리키는 패널을 스토리(조립 측)가 렌더한다.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { TabsArgTypes } from '../../../generated/argtypes/Tabs.argtypes';
import { Tabs, tabId, tabPanelId } from './Tabs';
import type { TabsProps } from '../../../generated/types/Tabs.types';

const WORK_TABS = [
  { id: 'product', label: '상품' },
  { id: 'inquiry', label: '문의' },
  { id: 'sales', label: '영업' },
];

/** 제어 컴포넌트 + 바깥 tabpanel — aria-controls 가 실제 요소를 가리키게 한다 */
function ControlledTabs(args: TabsProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  const current = args.items.find((item) => item.id === value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tds-space-4)' }}>
      <Tabs
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange?.(next);
        }}
      />
      <div
        id={tabPanelId(value)}
        role="tabpanel"
        aria-labelledby={tabId(value)}
        tabIndex={0}
        style={{
          color: 'var(--tds-color-text-default)',
          fontFamily: 'var(--tds-typography-body-md-font-family)',
          fontSize: 'var(--tds-typography-body-md-font-size)',
        }}
      >
        {current?.label ?? ''} 패널 내용
      </div>
    </div>
  );
}

const meta: Meta<typeof Tabs> = {
  title: 'Navigation/Tabs',
  component: Tabs,
  argTypes: { ...TabsArgTypes },
  args: { value: 'product', items: WORK_TABS, ariaLabel: '업무 영역' },
  render: (args) => <ControlledTabs {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Tabs>;

const tabsOf = (canvasElement: HTMLElement) => within(canvasElement).getAllByRole('tab');

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

/** default — 첫 탭 선택 */
export const Default: Story = {
  args: { value: 'product' },
};

/** hover — 비선택 탭 위에 포인터 */
export const Hover: Story = {
  args: { value: 'product' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const [, second] = tabsOf(canvasElement);
    await expect(second).toBeDefined();
    await userEvent.hover(second as HTMLElement);
    await expect(second).toHaveAttribute('aria-selected', 'false');
  },
};

/** focus-visible — 키보드 포커스 (로빙 tabindex: 선택 탭만 탭 순서에 있다) */
export const FocusVisible: Story = {
  args: { value: 'product' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const [first, second] = tabsOf(canvasElement);
    await expect(first).toHaveAttribute('tabindex', '0');
    await expect(second).toHaveAttribute('tabindex', '-1');

    await userEvent.tab();
    first?.focus();
    await expect(first).toHaveFocus();
  },
};

/** selected — 다른 탭이 선택된 상태 (aria-selected=true + 액션 컬러 밑줄) */
export const Selected: Story = {
  args: { value: 'sales' },
};

/** ArrowRight/Home/End — 화살표로 선택과 포커스를 함께 옮긴다 */
export const ArrowKeyNavigation: Story = {
  args: { value: 'product', onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const [first, second] = tabsOf(canvasElement);
    first?.focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect(args.onChange).toHaveBeenLastCalledWith('inquiry');
    await expect(second).toHaveFocus();
    await expect(second).toHaveAttribute('aria-selected', 'true');
  },
};

/** 최소 콘텐츠 — 탭 2개 */
export const MinimalItems: Story = {
  args: {
    value: 'all',
    items: [
      { id: 'all', label: '전체' },
      { id: 'mine', label: '내 담당' },
    ],
    ariaLabel: '목록 범위',
  },
};

/** 최대 콘텐츠 — 탭이 많고 라벨이 길 때 */
export const LongItems: Story = {
  args: {
    value: 'consult',
    items: [
      { id: 'product', label: '상품 관리' },
      { id: 'inquiry', label: '고객 문의 · 답변 대기' },
      { id: 'sales', label: '영업 · 계약 진행' },
      { id: 'consult', label: '상담 이력 및 재방문 예약' },
    ],
    ariaLabel: '업무 영역',
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { value: 'inquiry' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: {
    value: 'inquiry',
    items: [
      { id: 'product', label: 'المنتجات' },
      { id: 'inquiry', label: 'الاستفسارات' },
      { id: 'sales', label: 'المبيعات' },
    ],
    ariaLabel: 'مجالات العمل',
  },
  decorators: [rtlFrame],
};
