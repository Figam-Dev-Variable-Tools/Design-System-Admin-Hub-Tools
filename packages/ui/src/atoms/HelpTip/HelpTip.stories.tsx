// HelpTip — Storybook 스토리 (CSF3 · Overlay 계열 IA)
//
// [고정 IA — Overlay 계열] Docs·Overview·Playground·States·Content·Accessibility·Interaction.
// 열림 상태는 내부 useState 가 소유하고 open/defaultOpen prop·Escape 핸들러가 없다 —
// 정적 States/Open·Interaction/Escape Close 는 해당 없어 생략한다. 여는 시나리오는 Interaction/Open 이 소유.
// argTypes 는 계약 생성물(generated/argtypes/HelpTip.argtypes)을 spread 한다 (수기 작성 금지 — G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { HelpTipArgTypes } from '../../../generated/argtypes/HelpTip.argtypes';
import { HelpTip } from './HelpTip';

const meta: Meta<typeof HelpTip> = {
  title: 'Design System/Components/HelpTip',
  component: HelpTip,
  argTypes: { ...HelpTipArgTypes },
  args: {
    label: '그룹 유형 설명',
    children: '시스템 역할은 슈퍼어드민 전용이며 권한을 수정할 수 없어요.',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof HelpTip>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-6)' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새. 라벨 옆 ⓘ 트리거(닫힘). Controls 에서 label·children 을 바꿔 본다 */
export const Overview: Story = {};

/** Playground — label·children 을 Controls 로 바꿔 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** closed — 트리거만 보이고 패널은 hidden, aria-expanded=false */
export const Default: Story = {
  name: 'States/Closed',
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '그룹 유형 설명' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 긴 설명도 패널 안에서 줄바꿈된다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    label: '적립금 정책 설명',
    children:
      '적립금은 구매 확정 시점에 지급되며, 지급된 적립금은 다음 결제부터 사용할 수 있어요. 유효기간이 지난 적립금은 자동 소멸해요.',
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '적립금 정책 설명' }));
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** 키보드(Tab)로 트리거에 포커스가 들어온다 */
export const FocusVisible: Story = {
  name: 'Accessibility/Focus',
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '그룹 유형 설명' });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
  },
};

/** RTL — dir="rtl" 컨테이너에서 트리거·패널이 문서 방향을 따른다(문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 트리거를 누르면 패널이 열린다 (aria-expanded=true, 패널 노출) */
export const Opened: Story = {
  name: 'Interaction/Open',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: '그룹 유형 설명' });
    await userEvent.click(trigger);

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(
      canvas.getByText('시스템 역할은 슈퍼어드민 전용이며 권한을 수정할 수 없어요.'),
    ).toBeVisible();
  },
};
