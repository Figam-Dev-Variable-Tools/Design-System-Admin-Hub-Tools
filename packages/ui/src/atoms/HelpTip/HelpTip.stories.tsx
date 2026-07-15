// HelpTip — Storybook 스토리 (CSF3 · Atoms/HelpTip)
//
// argTypes 는 계약 생성물(generated/argtypes/HelpTip.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(enum·boolean 없음 → 1) + states(default/closed/open/focus-visible) 재현.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { HelpTipArgTypes } from '../../../generated/argtypes/HelpTip.argtypes';
import { HelpTip } from './HelpTip';

const meta: Meta<typeof HelpTip> = {
  title: 'Atoms/HelpTip',
  component: HelpTip,
  argTypes: { ...HelpTipArgTypes },
  args: {
    label: '그룹 유형 설명',
    children: '시스템 역할은 슈퍼어드민 전용이며 권한을 수정할 수 없습니다.',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof HelpTip>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-default)', padding: 'var(--tds-space-6)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-6)' }}>
    <Story />
  </div>
);

/** default(closed) — 트리거만 보이고 패널은 hidden, aria-expanded=false */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '그룹 유형 설명' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

/** focus-visible — 키보드(Tab)로 트리거에 포커스 */
export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '그룹 유형 설명' });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
  },
};

/** open — 트리거를 눌러 패널을 연다 (aria-expanded=true, 패널 노출) */
export const Opened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: '그룹 유형 설명' });
    await userEvent.click(trigger);

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(
      canvas.getByText('시스템 역할은 슈퍼어드민 전용이며 권한을 수정할 수 없습니다.'),
    ).toBeVisible();
  },
};

/** 최대 콘텐츠 — 긴 설명도 패널 안에서 줄바꿈된다 */
export const LongContent: Story = {
  args: {
    label: '적립금 정책 설명',
    children:
      '적립금은 구매 확정 시점에 지급되며, 지급된 적립금은 다음 결제부터 사용할 수 있습니다. 유효기간이 지난 적립금은 자동 소멸합니다.',
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '적립금 정책 설명' }));
  },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [darkFrame],
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '그룹 유형 설명' }));
  },
};

/** RTL */
export const RightToLeft: Story = {
  args: { label: 'شرح', children: 'هذا الدور مخصص للمشرف الأعلى فقط.' },
  decorators: [rtlFrame],
};
