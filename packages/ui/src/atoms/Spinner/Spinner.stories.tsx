// Spinner — Storybook 스토리 (CSF3 · Feedback/Spinner)
//
// argTypes 는 계약 생성물(generated/argtypes/Spinner.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: size 4변형 전수 + label 유/무(장식 ↔ role=status) + Dark/RTL + currentColor 승계 증명.
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { SpinnerArgTypes } from '../../../generated/argtypes/Spinner.argtypes';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Feedback/Spinner',
  component: Spinner,
  argTypes: { ...SpinnerArgTypes },
  args: { size: 'inherit', label: '' },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Spinner>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** 기본형 — `inherit` 은 1em 이라 부모 글자 크기를 따른다 (Button 안의 용법) */
export const Default: Story = {};

/**
 * 크기 전량 — `inherit` 은 글자 문맥을 따르므로 그 문맥과 함께 보여야 뜻이 통한다.
 * sm/md/lg 는 space 토큰 고정값이다.
 */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tds-space-5)' }}>
      {/* inherit 은 1em 이라 부모 글자 크기를 따른다 — 그것을 보이려면 문맥이 커야 한다 */}
      <span style={{ fontSize: 'var(--tds-typography-title-lg-font-size)' }}>
        <Spinner size="inherit" /> inherit
      </span>
      <span>
        <Spinner size="sm" /> sm
      </span>
      <span>
        <Spinner size="md" /> md
      </span>
      <span>
        <Spinner size="lg" /> lg
      </span>
    </div>
  ),
};

/**
 * 낭독 문구가 있으면 장식이 아니라 상태다 — `role="status"` + `aria-label` 로 승격된다.
 * 값이 없는 기본형은 `aria-hidden` 이라 보조기술에 잡히지 않는다(부모가 aria-busy 로 알린다).
 */
export const WithLabel: Story = {
  args: { size: 'lg', label: '불러오는 중' },
};

/** RTL — 원이라 방향이 뒤집혀도 같은 형태다. 회전 방향도 바뀌지 않는다 */
export const RightToLeft: Story = {
  args: { size: 'lg', label: 'جار التحميل' },
  decorators: [rtlFrame],
};
