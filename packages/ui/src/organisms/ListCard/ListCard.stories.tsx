// ListCard — Storybook 스토리 (CSF3 · Organisms/ListCard)
//
// argTypes 는 계약 생성물(generated/argtypes/ListCard.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 2: default/loading) + boolean(loading) true/false
//           + 슬롯(icon) 최소/최대 + empty + Dark/RTL.
// rows 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ListCardArgTypes } from '../../../generated/argtypes/ListCard.argtypes';
import { ListCard } from './ListCard';

/** 아이콘 슬롯 예시 — 장식용(aria-hidden). currentColor · 1em 기준 인라인 SVG */
function DocumentGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

const ROWS = [
  {
    id: '1024',
    title: '스마트 도어락 SL-300 주문',
    meta: '김담당 · 2026-07-14',
    href: '#/orders/1024',
  },
  { id: '1023', title: '무선 청소기 V9 주문', meta: '박담당 · 2026-07-13', href: '#/orders/1023' },
  { id: '1022', title: '공기청정기 AP-7 주문', meta: '이담당 · 2026-07-13', href: '#/orders/1022' },
];

const meta: Meta<typeof ListCard> = {
  title: 'Organisms/ListCard',
  component: ListCard,
  argTypes: { ...ListCardArgTypes },
  args: {
    title: '최근 주문',
    count: 12,
    rows: ROWS,
    loading: false,
    empty: '표시할 항목이 없습니다.',
    icon: null,
    onRowClick: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ListCard>;

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

/** default — 제목 + 카운트 뱃지 + 행 목록 */
export const Default: Story = {
  args: { loading: false },
};

/** loading — 스켈레톤 행 + aria-busy. onRowClick 발화 금지 (계약 blockedWhen) */
export const Loading: Story = {
  args: { loading: true },
};

/** 아이콘 슬롯 — 각 행 앞에 목록 성격 아이콘이 붙는다 */
export const WithIcon: Story = {
  args: { icon: <DocumentGlyph /> },
};

/** 슬롯 최소 — 아이콘 없음 + meta 없는 행 */
export const SlotMinimal: Story = {
  args: {
    icon: null,
    count: 1,
    rows: [{ id: '1', title: '주문 1024번' }],
  },
};

/** empty — rows 가 빈 배열이면 empty 문구를 렌더한다 */
export const EmptyRows: Story = {
  args: { rows: [], count: 0 },
};

/** empty 문구 커스텀 */
export const EmptyCustomMessage: Story = {
  args: { rows: [], count: 0, empty: '아직 접수된 주문이 없습니다.' },
};

/** count=0 — Badge 는 hideWhenZero 기본값에 따라 렌더되지 않는다 */
export const WithoutCount: Story = {
  args: { count: 0 },
};

/**
 * 행 클릭 — onRowClick 에 { id, event } 를 전달한다 (2.0.0).
 * event 가 있어야 호출부가 preventDefault() 후 navigate() 로 SPA 내비를 할 수 있다 —
 * 1.x 처럼 id 문자열만 넘기면 href 있는 행은 전체 페이지 새로고침이 된다.
 */
export const RowClick: Story = {
  args: { icon: <DocumentGlyph /> },
  play: async ({ canvasElement, args }) => {
    const [first] = within(canvasElement).getAllByRole('link');
    await expect(first).toBeDefined();
    await userEvent.click(first as HTMLElement);

    await expect(args.onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ROWS[0]?.id,
        event: expect.objectContaining({ type: 'click' }),
      }),
    );
  },
};

/* ── 계약 events.onRowClick.blockedWhen 전수 검증 (loading) ─────────────────── */

/** ListCard: loading 상태에서 onRowClick 이 발화하지 않는다 (계약 blockedWhen: loading) */
export const BlockedWhenLoadingOnRowClick: Story = {
  name: 'ListCard: loading 상태에서 onRowClick 이 발화하지 않는다',
  args: { loading: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // loading 중에는 행 자체가 렌더되지 않는다 — 그 사실을 못박고,
    // 카드 표면을 실제로 클릭해도 콜백이 발화하지 않음을 스파이로 단언한다.
    await expect(canvas.queryAllByRole('link')).toHaveLength(0);
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(canvas.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(canvas.getByRole('region'));

    await expect(args.onRowClick).not.toHaveBeenCalled();
  },
};

/** 최대 콘텐츠 — 긴 제목/메타 + 행 다수 (행은 줄바꿈되고 카드는 흐른다) */
export const LongContent: Story = {
  args: {
    title: '최근 고객 문의 · 답변 대기 목록',
    count: 128,
    icon: <DocumentGlyph />,
    rows: [
      {
        id: 'a',
        title:
          '주문한 상품이 배송 예정일을 지나도 도착하지 않아 문의드립니다. 송장 번호 조회 시에도 상태가 갱신되지 않습니다.',
        meta: '고객센터 · 담당자 미지정 · 2026-07-14 09:31 · 재문의 3회',
        href: '#/inquiries/8821',
      },
      {
        id: 'b',
        title: '교환 접수 후 회수 일정이 잡히지 않습니다',
        meta: '고객센터 · 김담당 · 2026-07-13 18:02',
        href: '#/inquiries/8820',
      },
      { id: 'c', title: '세금계산서 재발행 요청', meta: '재무 · 박담당 · 2026-07-13' },
    ],
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { icon: <DocumentGlyph /> },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: {
    title: 'أحدث الطلبات',
    icon: <DocumentGlyph />,
    rows: [
      { id: '1', title: 'طلب قفل ذكي', meta: 'المسؤول · 2026-07-14', href: '#/orders/1' },
      { id: '2', title: 'طلب مكنسة لاسلكية', meta: 'المسؤول · 2026-07-13', href: '#/orders/2' },
    ],
  },
  decorators: [rtlFrame],
};
