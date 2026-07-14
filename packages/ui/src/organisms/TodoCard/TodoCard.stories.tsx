// TodoCard — Storybook 스토리 (CSF3 · Organisms/TodoCard)
//
// argTypes 는 계약 생성물(generated/argtypes/TodoCard.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 2: default/loading) + boolean(loading·showTotal) true/false
//           + 데이터 최소/최대 + Dark/RTL.
// items 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { TodoCardArgTypes } from '../../../generated/argtypes/TodoCard.argtypes';
import { TodoCard } from './TodoCard';

const ITEMS = [
  { key: 'new-order', label: '신규주문', count: 3, href: '#/orders?status=new' },
  { key: 'cancel', label: '취소', count: 1, href: '#/orders?status=cancel' },
  { key: 'return', label: '반품', count: 0, href: '#/orders?status=return' },
  { key: 'exchange', label: '교환', count: 0, href: '#/orders?status=exchange' },
];

const meta: Meta<typeof TodoCard> = {
  title: 'Organisms/TodoCard',
  component: TodoCard,
  argTypes: { ...TodoCardArgTypes },
  args: {
    title: '오늘의 할일',
    items: ITEMS,
    loading: false,
    showTotal: true,
    onItemClick: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof TodoCard>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-raised)', padding: 'var(--tds-space-5)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** default — count>0 은 강조색, 0 은 흐리게 */
export const Default: Story = {
  args: { loading: false, showTotal: true },
};

/** loading — 스켈레톤 + aria-busy. onItemClick 발화 금지 (계약 blockedWhen) */
export const Loading: Story = {
  args: { loading: true },
};

/** showTotal=true — 제목 옆에 count 합계 Badge */
export const WithTotal: Story = {
  args: { showTotal: true },
};

/** showTotal=false — 합계 Badge 를 숨긴다 */
export const WithoutTotal: Story = {
  args: { showTotal: false },
};

/** loading + showTotal=false — boolean 조합 */
export const LoadingWithoutTotal: Story = {
  args: { loading: true, showTotal: false },
};

/** 처리할 건이 전부 0 — 모든 항목이 흐리게, 합계 Badge 도 렌더되지 않는다(hideWhenZero) */
export const AllZero: Story = {
  args: {
    items: [
      { key: 'new-order', label: '신규주문', count: 0 },
      { key: 'cancel', label: '취소', count: 0 },
      { key: 'return', label: '반품', count: 0 },
    ],
  },
};

/** href 없는 항목 — 링크가 아니라 버튼으로 렌더된다 */
export const WithoutLinks: Story = {
  args: {
    items: [
      { key: 'new-inquiry', label: '신규문의', count: 5 },
      { key: 'waiting', label: '답변대기', count: 2 },
      { key: 'hold', label: '보류', count: 0 },
    ],
  },
};

/**
 * 항목 클릭 — onItemClick 에 { key, event } 를 전달한다 (2.0.0).
 * 호출부는 event.preventDefault() 후 navigate() 로 기본 내비게이션을 가로챌 수 있다.
 */
export const ItemClick: Story = {
  play: async ({ canvasElement, args }) => {
    const [first] = within(canvasElement).getAllByRole('link');
    await expect(first).toBeDefined();
    await userEvent.click(first as HTMLElement);

    await expect(args.onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        key: ITEMS[0]?.key,
        event: expect.objectContaining({ type: 'click' }),
      }),
    );
  },
};

/* ── 계약 events.onItemClick.blockedWhen 전수 검증 (loading) ────────────────── */

/** TodoCard: loading 상태에서 onItemClick 이 발화하지 않는다 (계약 blockedWhen: loading) */
export const BlockedWhenLoadingOnItemClick: Story = {
  name: 'TodoCard: loading 상태에서 onItemClick 이 발화하지 않는다',
  args: { loading: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // loading 중에는 항목 자체가 렌더되지 않는다 — 그 사실을 못박고,
    // 카드 표면을 실제로 클릭해도 콜백이 발화하지 않음을 스파이로 단언한다.
    await expect(canvas.queryAllByRole('link')).toHaveLength(0);
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(canvas.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(canvas.getByRole('region'));

    await expect(args.onItemClick).not.toHaveBeenCalled();
  },
};

/** 최소 콘텐츠 — 항목 1개 */
export const MinimalItems: Story = {
  args: { items: [{ key: 'new-order', label: '신규주문', count: 1 }] },
};

/** 최대 콘텐츠 — 제목이 길고 항목이 많다 (flex-wrap 으로 줄바꿈된다) */
export const LongContent: Story = {
  args: {
    title: '오늘의 할일 — 상품 · 문의 · 영업 전체 (담당자 미지정 포함)',
    items: [
      { key: 'new-order', label: '신규주문(결제 완료)', count: 128, href: '#/orders?status=new' },
      { key: 'cancel', label: '취소 요청', count: 14, href: '#/orders?status=cancel' },
      { key: 'return', label: '반품 회수 대기', count: 7, href: '#/orders?status=return' },
      { key: 'exchange', label: '교환 재발송 대기', count: 0, href: '#/orders?status=exchange' },
      { key: 'inquiry', label: '미답변 문의', count: 42, href: '#/inquiries' },
      { key: 'contract', label: '계약 승인 대기', count: 0, href: '#/contracts' },
    ],
  },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: {
    title: 'مهام اليوم',
    items: [
      { key: 'new-order', label: 'طلبات جديدة', count: 3, href: '#/orders' },
      { key: 'cancel', label: 'إلغاء', count: 0, href: '#/cancel' },
    ],
  },
  decorators: [rtlFrame],
};
