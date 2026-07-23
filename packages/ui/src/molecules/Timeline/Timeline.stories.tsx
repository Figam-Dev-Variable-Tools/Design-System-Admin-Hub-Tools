// Timeline — Storybook 스토리 (CSF3 · Design System/Components/Timeline)
//
// 고정 IA(오너 확정): Docs · Overview · Variants(배지 톤) · States(Empty) ·
//   Content(Single Event · Long Content) · Examples(주문 이력) · Accessibility(RTL · ARIA).
// Timeline 은 정적 이력 목록(keyboard: none)이라 Playground·Interaction 은 생략한다.
// argTypes 는 계약 생성물(generated/argtypes/Timeline.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// events 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { TimelineArgTypes } from '../../../generated/argtypes/Timeline.argtypes';
import { Timeline } from './Timeline';

/** 대표 데이터 — 문의 처리 이력. 여러 톤이 시간순으로 섞인다 */
const EVENTS = [
  {
    id: '1',
    at: '2026-07-14T09:31:00+09:00',
    badgeTone: 'neutral' as const,
    badgeLabel: '접수',
    author: '고객센터',
    text: '주문한 상품이 배송 예정일을 지나도 도착하지 않아 문의드려요.',
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
    text: '송장 재발행 완료. 내일 도착 예정으로 안내드렸어요.',
  },
  {
    id: '4',
    at: '2026-07-14T14:22:00+09:00',
    badgeTone: 'info' as const,
    badgeLabel: '상태변경',
    author: '시스템',
    text: '처리 상태가 완료로 변경되었어요.',
  },
];

/** 배지 톤 전량 — 계약 enum(neutral·success·warning·danger·info)을 한 화면에 */
const TONE_EVENTS = [
  {
    id: 't1',
    at: '2026-07-14T09:00:00+09:00',
    badgeTone: 'neutral' as const,
    badgeLabel: '접수',
    author: '고객센터',
    text: 'neutral — 중립 톤. 접수·등록처럼 상태색이 필요 없는 기록.',
  },
  {
    id: 't2',
    at: '2026-07-14T09:10:00+09:00',
    badgeTone: 'info' as const,
    badgeLabel: '진행중',
    author: '시스템',
    text: 'info — 정보 톤. 상태 변경·자동 처리 알림.',
  },
  {
    id: 't3',
    at: '2026-07-14T09:20:00+09:00',
    badgeTone: 'warning' as const,
    badgeLabel: '보류',
    author: '김담당',
    text: 'warning — 주의 톤. 확인·회신 대기 등 유의가 필요한 단계.',
  },
  {
    id: 't4',
    at: '2026-07-14T09:30:00+09:00',
    badgeTone: 'danger' as const,
    badgeLabel: '반려',
    author: '박팀장',
    text: 'danger — 위험 톤. 반려·실패·오류처럼 부정적 결과.',
  },
  {
    id: 't5',
    at: '2026-07-14T09:40:00+09:00',
    badgeTone: 'success' as const,
    badgeLabel: '완료',
    author: '김담당',
    text: 'success — 성공 톤. 처리 완료·승인.',
  },
];

/** 실제 사용 사례 — 주문 상태 이력 */
const ORDER_EVENTS = [
  {
    id: 'o1',
    at: '2026-07-18T11:02:00+09:00',
    badgeTone: 'neutral' as const,
    badgeLabel: '접수',
    author: '주문시스템',
    text: '주문이 접수되었어요. 주문번호 20260718-0042.',
  },
  {
    id: 'o2',
    at: '2026-07-18T11:05:00+09:00',
    badgeTone: 'info' as const,
    badgeLabel: '결제완료',
    author: '결제게이트웨이',
    text: '카드 결제가 승인되었어요. 승인금액 128,000원.',
  },
  {
    id: 'o3',
    at: '2026-07-18T15:40:00+09:00',
    badgeTone: 'warning' as const,
    badgeLabel: '상품준비',
    author: '물류센터',
    text: '상품을 포장하고 있어요. 오늘 중 출고 예정.',
  },
  {
    id: 'o4',
    at: '2026-07-19T09:12:00+09:00',
    badgeTone: 'info' as const,
    badgeLabel: '배송중',
    author: '택배사',
    text: '상품이 배송을 시작했어요. 송장번호 6621-8890-1123.',
  },
  {
    id: 'o5',
    at: '2026-07-20T13:27:00+09:00',
    badgeTone: 'success' as const,
    badgeLabel: '배송완료',
    author: '택배사',
    text: '상품이 문 앞에 도착했어요. 수령 확인 부탁드려요.',
  },
];

const meta: Meta<typeof Timeline> = {
  title: 'Design System/Components/Timeline',
  component: Timeline,
  argTypes: { ...TimelineArgTypes },
  args: {
    events: EVENTS,
    label: '문의 처리 이력',
    emptyLabel: '기록된 이력이 없어요.',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Timeline>;

/** Overview — 대표 쓰임새. 여러 톤의 이벤트가 시간순으로 쌓인다 (접수·내부메모·고객답변·상태변경) */
export const Overview: Story = {};

/* ── Variants ───────────────────────────────────────────────────────────── */

/** Variants/Tones — 배지 톤 전량을 한 화면에. 상태색은 StatusBadge 가 소유한다 */
export const Tones: Story = {
  name: 'Variants/Tones',
  args: { events: TONE_EVENTS, label: '배지 톤 예시' },
};

/* ── States ─────────────────────────────────────────────────────────────── */

/** States/Empty — events 가 빈 배열이면 목록 대신 emptyLabel 문구를 렌더한다 */
export const Empty: Story = {
  name: 'States/Empty',
  args: { events: [] },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** Content/Single Event — 이력이 한 칸뿐인 최소 형태 */
export const SingleEvent: Story = {
  name: 'Content/Single Event',
  args: { events: EVENTS.slice(0, 1) },
};

/** Content/Long Content — 긴 본문이 줄바꿈되어도 레이아웃이 무너지지 않는다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    label: '긴 본문 예시',
    events: [
      {
        id: 'l1',
        at: '2026-07-14T09:31:00+09:00',
        badgeTone: 'info' as const,
        badgeLabel: '상세메모',
        author: '김담당',
        text: '고객이 배송 지연 사유와 보상 정책을 상세히 문의하여, 택배사 지연 확인 결과와 재발송 일정, 그리고 지연 보상 쿠폰 지급 절차를 순서대로 안내했어요. 추가로 향후 동일 사례 방지를 위해 출고 알림 수신 동의 여부도 재확인하였고, 고객이 동의하여 알림 설정을 갱신했어요.',
      },
    ],
  },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** Examples/Order History — 주문 상태 이력. 각 페이지가 도메인 이벤트를 이 형태로 매핑해 넘긴다 */
export const OrderHistory: Story = {
  name: 'Examples/Order History',
  args: { events: ORDER_EVENTS, label: '주문 처리 이력' },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** Accessibility/RTL — 치수를 논리 속성으로 그리므로 방향이 뒤집혀도 같은 목록이다. 문서 방향만 뒤집는다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  decorators: [
    (Story) => (
      <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
        <Story />
      </div>
    ),
  ],
};

/** Accessibility/ARIA — <ol> 이 role=list 와 label(aria-label)로 이름을 갖는다. 정적 목록이라 탭 순서엔 없다 */
export const Aria: Story = {
  name: 'Accessibility/ARIA',
  play: async ({ canvasElement, args }) => {
    const list = within(canvasElement).getByRole('list', { name: args.label });

    // 계약 a11y — <ol> 이 목록 role 과 label 로 이름을 갖는다
    await expect(list.tagName).toBe('OL');
    // 상태는 색뿐 아니라 배지 문구로도 이중 전달한다 (dependencies: StatusBadge)
    await expect(within(canvasElement).getByText('접수')).toBeInTheDocument();
  },
};
