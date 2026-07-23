// ListCard — Storybook 스토리 (CSF3 · Data 계열 IA)
//
// [고정 IA — Data 계열] Table·DataTable·Pagination 과 같은 어휘로 문서화한다(조합 폭발 금지):
//   Docs · Overview · Playground · States/(Empty·Loading) ·
//   Features/(Row Icon·Count Badge·Custom Empty Message — 데이터 고유 역량) ·
//   Content/(Few Items·Many Items·Long Content) ·
//   Accessibility/(Keyboard·RTL) · Interaction/(Row Click·Loading Blocks Click)
// 계약 states·blockedWhen 전수 검증은 ListCard.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
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

const MANY_ROWS = [
  {
    id: '1024',
    title: '스마트 도어락 SL-300 주문',
    meta: '김담당 · 2026-07-14',
    href: '#/orders/1024',
  },
  { id: '1023', title: '무선 청소기 V9 주문', meta: '박담당 · 2026-07-13', href: '#/orders/1023' },
  { id: '1022', title: '공기청정기 AP-7 주문', meta: '이담당 · 2026-07-13', href: '#/orders/1022' },
  { id: '1021', title: '로봇청소기 R2 주문', meta: '최담당 · 2026-07-12', href: '#/orders/1021' },
  { id: '1020', title: '식기세척기 DW-8 주문', meta: '정담당 · 2026-07-12', href: '#/orders/1020' },
  { id: '1019', title: '스타일러 SW-4 주문', meta: '한담당 · 2026-07-11', href: '#/orders/1019' },
  { id: '1018', title: '건조기 DR-9 주문', meta: '윤담당 · 2026-07-11', href: '#/orders/1018' },
  { id: '1017', title: '전기레인지 IH-3 주문', meta: '오담당 · 2026-07-10', href: '#/orders/1017' },
];

const meta: Meta<typeof ListCard> = {
  title: 'Design System/Components/ListCard',
  component: ListCard,
  argTypes: { ...ListCardArgTypes },
  args: {
    title: '최근 주문',
    count: 12,
    rows: ROWS,
    loading: false,
    empty: '표시할 항목이 없어요.',
    icon: null,
    onRowClick: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ListCard>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새. 제목 + 카운트 뱃지 + 행 목록이 가장 흔하다 */
export const Overview: Story = {
  args: { loading: false },
};

/** Playground — title·count·loading·empty 를 Controls 로 바꿔 전 조합을 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 빈 상태 — rows 가 빈 배열이면 empty 문구를 렌더한다 */
export const EmptyRows: Story = {
  name: 'States/Empty',
  args: { rows: [], count: 0 },
};

/** 로딩 — 스켈레톤 행 + aria-busy. onRowClick 발화 금지 (계약 blockedWhen) */
export const Loading: Story = {
  name: 'States/Loading',
  args: { loading: true },
};

/* ── Features ───────────────────────────────────────────────────────────── */

/** 행 아이콘 — 각 행 앞에 목록 성격(주문·문의·상담) 아이콘이 붙는다 */
export const WithIcon: Story = {
  name: 'Features/Row Icon',
  args: { icon: <DocumentGlyph /> },
};

/** 카운트 뱃지 — count=0 이면 Badge 는 hideWhenZero 기본값에 따라 렌더되지 않는다 */
export const WithoutCount: Story = {
  name: 'Features/Count Badge',
  args: { count: 0 },
};

/** 빈 문구 커스텀 — empty prop 으로 도메인 문구를 준다 */
export const EmptyCustomMessage: Story = {
  name: 'Features/Custom Empty Message',
  args: { rows: [], count: 0, empty: '아직 접수된 주문이 없어요.' },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 적은 항목 — 단일 행 + meta 없는 최소 콘텐츠 */
export const FewItems: Story = {
  name: 'Content/Few Items',
  args: {
    icon: null,
    count: 1,
    rows: [{ id: '1', title: '주문 1024번' }],
  },
};

/** 많은 항목 — 행이 여러 개여도 카드가 목록을 그대로 흐른다 */
export const ManyItems: Story = {
  name: 'Content/Many Items',
  args: {
    count: 128,
    icon: <DocumentGlyph />,
    rows: MANY_ROWS,
  },
};

/** 긴 콘텐츠 — 긴 제목/메타 + 행 다수 (행은 줄바꿈되고 카드는 흐른다) */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    title: '최근 고객 문의 · 답변 대기 목록',
    count: 128,
    icon: <DocumentGlyph />,
    rows: [
      {
        id: 'a',
        title:
          '주문한 상품이 배송 예정일을 지나도 도착하지 않아 문의드려요. 송장 번호 조회 시에도 상태가 갱신되지 않아요.',
        meta: '고객센터 · 담당자 미지정 · 2026-07-14 09:31 · 재문의 3회',
        href: '#/inquiries/8821',
      },
      {
        id: 'b',
        title: '교환 접수 후 회수 일정이 잡히지 않아요',
        meta: '고객센터 · 김담당 · 2026-07-13 18:02',
        href: '#/inquiries/8820',
      },
      { id: 'c', title: '세금계산서 재발행 요청', meta: '재무 · 박담당 · 2026-07-13' },
    ],
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** 키보드 — Tab 으로 첫 행 링크에 포커스가 들어오고 :focus-visible 링을 받는다 */
export const Keyboard: Story = {
  name: 'Accessibility/Keyboard',
  args: { icon: <DocumentGlyph /> },
  play: async ({ canvasElement }) => {
    const [firstLink] = within(canvasElement).getAllByRole('link');
    await expect(firstLink).toBeDefined();
    await userEvent.tab();
    await expect(firstLink).toHaveFocus();
  },
};

/** RTL — 방향이 논리 흐름을 따라 뒤집힌다 (문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    title: '최근 주문',
    icon: <DocumentGlyph />,
    rows: [
      { id: '1', title: '스마트 도어락 주문', meta: '김담당 · 2026-07-14', href: '#/orders/1' },
      { id: '2', title: '무선 청소기 주문', meta: '박담당 · 2026-07-13', href: '#/orders/2' },
    ],
  },
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/**
 * 행 클릭 — onRowClick 에 { id, event } 를 전달한다 (2.0.0).
 * event 가 있어야 호출부가 preventDefault() 후 navigate() 로 SPA 내비를 할 수 있다 —
 * 1.x 처럼 id 문자열만 넘기면 href 있는 행은 전체 페이지 새로고침이 된다.
 */
export const RowClick: Story = {
  name: 'Interaction/Row Click',
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

/** loading 상태에서는 행이 렌더되지 않고 onRowClick 도 발화하지 않는다 (계약 blockedWhen: loading) */
export const BlockedWhenLoadingOnRowClick: Story = {
  name: 'Interaction/Loading Blocks Click',
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
