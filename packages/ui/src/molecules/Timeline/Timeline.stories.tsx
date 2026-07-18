// Timeline — Storybook 스토리 (CSF3 · Molecules/Timeline)
//
// argTypes 는 계약 생성물(generated/argtypes/Timeline.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix = 1 (enum/boolean prop 없음) + 빈 상태 + 다양한 배지 톤 + Dark.
// events 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import type { Meta, StoryObj } from '@storybook/react';

import { TimelineArgTypes } from '../../../generated/argtypes/Timeline.argtypes';
import { Timeline } from './Timeline';

const EVENTS = [
  {
    id: '1',
    at: '2026-07-14T09:31:00+09:00',
    badgeTone: 'neutral' as const,
    badgeLabel: '접수',
    author: '고객센터',
    text: '주문한 상품이 배송 예정일을 지나도 도착하지 않아 문의드립니다.',
  },
  {
    id: '2',
    at: '2026-07-14T10:02:00+09:00',
    badgeTone: 'warning' as const,
    badgeLabel: '내부메모',
    author: '김담당',
    text: '택배사에 송장 조회 요청함. 회신 대기 중.',
  },
  {
    id: '3',
    at: '2026-07-14T14:20:00+09:00',
    badgeTone: 'success' as const,
    badgeLabel: '고객답변',
    author: '김담당',
    text: '송장 재발행 완료. 내일 도착 예정으로 안내드렸습니다.',
  },
  {
    id: '4',
    at: '2026-07-14T14:22:00+09:00',
    badgeTone: 'info' as const,
    badgeLabel: '상태변경',
    author: '시스템',
    text: '처리 상태가 완료로 변경되었습니다.',
  },
];

const meta: Meta<typeof Timeline> = {
  title: 'Data Display/Timeline',
  component: Timeline,
  argTypes: { ...TimelineArgTypes },
  args: {
    events: EVENTS,
    label: '문의 처리 이력',
    emptyLabel: '기록된 이력이 없습니다.',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Timeline>;

/** default — 여러 톤의 이벤트를 시간순으로 (접수·내부메모·고객답변·상태변경) */
export const Default: Story = {};

/** 빈 상태 — events 가 빈 배열이면 emptyLabel 을 렌더한다 */
export const Empty: Story = {
  args: { events: [] },
};

/** 단일 이벤트 */
export const SingleEvent: Story = {
  args: { events: EVENTS.slice(0, 1) },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [
    (StoryFn) => (
      <div data-theme="dark" style={{ padding: 'var(--tds-space-5)' }}>
        <StoryFn />
      </div>
    ),
  ],
};
