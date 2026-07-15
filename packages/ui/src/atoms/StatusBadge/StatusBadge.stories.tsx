// StatusBadge — Storybook 스토리 (CSF3 · Atoms/StatusBadge)
//
// argTypes 는 계약 생성물(generated/argtypes/StatusBadge.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(tone 5 × state 1 = 5) 전수 + 최대 콘텐츠(긴 라벨) + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { StatusBadgeArgTypes } from '../../../generated/argtypes/StatusBadge.argtypes';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Atoms/StatusBadge',
  component: StatusBadge,
  argTypes: { ...StatusBadgeArgTypes },
  args: { tone: 'neutral', label: '임시저장' },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof StatusBadge>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{
      background: 'var(--tds-color-surface-default)',
      padding: 'var(--tds-space-5)',
      borderRadius: 'var(--tds-radius-md)',
    }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/* ── combinationMatrix 전수 (tone 5) ─────────────────────────────────────── */

/** neutral — 회색 표면 + 기본 테두리 (임시저장·초안 등) */
export const Neutral: Story = {
  args: { tone: 'neutral', label: '임시저장' },
};

/** success — 좋음 (게시·완료·노출 등) */
export const Success: Story = {
  args: { tone: 'success', label: '게시' },
};

/** warning — 주의 (예약·대기·검토중 등) */
export const Warning: Story = {
  args: { tone: 'warning', label: '예약' },
};

/** danger — 위험 (만료·반려·중단 등) */
export const Danger: Story = {
  args: { tone: 'danger', label: '만료' },
};

/** info — 정보 (진행중·확인 등) */
export const Info: Story = {
  args: { tone: 'info', label: '진행중' },
};

/** 최대 콘텐츠 — 긴 라벨도 pill 이 nowrap 으로 한 줄을 유지한다 */
export const LongLabel: Story = {
  args: { tone: 'info', label: '검수 대기 · 담당자 배정 필요' },
  parameters: { layout: 'padded' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { tone: 'success', label: '게시' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { tone: 'warning', label: 'قيد الانتظار' },
  decorators: [rtlFrame],
};
