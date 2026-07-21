// StatusBadge — Storybook 스토리 (CSF3 · Atoms/StatusBadge)
//
// [고정 IA] 비대화형 표시 배지라 Playground/Interaction 이 없다. 아래 카테고리만 쓴다:
//   Overview        — 실제 쓰임새 한눈에(목록 상태 열에 놓이는 대표 상태들)
//   Variants        — 의미 tone(neutral·success·warning·danger·info)을 한 화면에 비교(토큰 검증)
//   Examples/       — 실제 사용 사례(긴 라벨)
//   Accessibility/  — RTL (dir=rtl · 한국어)
// argTypes 는 계약 생성물(generated/argtypes/StatusBadge.argtypes)을 spread 한다 (수기 작성 금지 — G5).
import type { CSSProperties } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { StatusBadgeArgTypes } from '../../../generated/argtypes/StatusBadge.argtypes';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Design System/Components/StatusBadge',
  component: StatusBadge,
  argTypes: { ...StatusBadgeArgTypes },
  args: { tone: 'neutral', label: '임시저장' },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof StatusBadge>;

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 실제 쓰임새 한눈에. 목록의 상태 열에 도메인 상태들이 나란히 놓이는 것이 가장 흔하다 */
export const Overview: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <StatusBadge {...args} tone="success" label="게시" />
      <StatusBadge {...args} tone="warning" label="예약" />
      <StatusBadge {...args} tone="danger" label="만료" />
      <StatusBadge {...args} tone="neutral" label="임시저장" />
    </div>
  ),
};

/**
 * Variants — 의미 tone 을 한 화면에 비교(디자인 토큰 검증). neutral 은 회색 표면,
 * 나머지 4종은 feedback 토큰 페어(surface/border/text)로 그려진다.
 */
export const Variants: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <StatusBadge {...args} tone="neutral" label="임시저장" />
      <StatusBadge {...args} tone="success" label="게시" />
      <StatusBadge {...args} tone="warning" label="예약" />
      <StatusBadge {...args} tone="danger" label="만료" />
      <StatusBadge {...args} tone="info" label="진행중" />
    </div>
  ),
};

/** 긴 라벨도 pill 이 nowrap 으로 한 줄을 유지한다 */
export const LongLabel: Story = {
  name: 'Examples/Long Label',
  args: { tone: 'info', label: '검수 대기 · 담당자 배정 필요' },
  parameters: { layout: 'padded' },
};

/** RTL — dir=rtl 컨테이너에서 한국어 라벨이 우측 정렬 문맥으로 그려진다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { tone: 'warning', label: '검토 대기' },
  decorators: [rtlFrame],
};
