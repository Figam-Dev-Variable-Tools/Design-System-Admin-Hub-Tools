// ListRow — Storybook 스토리 (CSF3 · Molecules/ListRow)
//
// [고정 IA] Docs · Overview · Playground · States(Hover) · Content(Minimal·With Icon·Long Content) ·
// Examples(Link Row) · Accessibility(Keyboard·RTL) · Interaction(Row Click·Link Navigation).
// href 유무·아이콘 유무 등 세부 조합은 낱개 스토리로 폭발시키지 않고 Playground Controls 로 넘긴다.
// 계약 states 전수(hover·focus-visible 의 스타일 규칙)는 ListRow.test.tsx 가 소유한다.
// 목록 컨테이너(ul/li)는 organism(ListCard)이 소유한다 — 여기선 행 하나만 렌더한다.
//
// argTypes 는 계약 생성물(generated/argtypes/ListRow.argtypes)을 spread 한다 (수기 작성 금지 — G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ListRowArgTypes } from '../../../generated/argtypes/ListRow.argtypes';
import { ListRow } from './ListRow';

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

const meta: Meta<typeof ListRow> = {
  title: 'Design System/Components/ListRow',
  component: ListRow,
  argTypes: { ...ListRowArgTypes },
  args: {
    title: '신규 주문이 접수되었어요',
    meta: '김담당 · 2026-07-14',
    href: '',
    icon: null,
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ListRow>;

/** href 가 있으면 link, 없으면 button 으로 렌더된다 */
const rowOf = (canvasElement: HTMLElement) =>
  within(canvasElement).queryByRole('button') ?? within(canvasElement).getByRole('link');

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새. href 없는 클릭 가능한 행(button) + 제목 + 메타 */
export const Overview: Story = {
  args: { href: '' },
};

/* ── Playground ─────────────────────────────────────────────────────────── */

/** Playground — title·meta·href 를 Controls 로 바꿔 본다. href 를 채우면 링크 행이 된다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** Hover — 포인터가 올라가면 표면(raised) 배경이 깔린다 */
export const Hover: Story = {
  name: 'States/Hover',
  args: { href: '' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const row = rowOf(canvasElement);
    await userEvent.hover(row);
    await expect(row).toHaveClass('tds-listrow');
  },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최소 — 아이콘 없음 + meta 없음 (제목만) */
export const Minimal: Story = {
  name: 'Content/Minimal',
  args: { icon: null, meta: '', title: '주문 1024번' },
};

/** 좌측 아이콘 — 아이콘 슬롯이 채워진 행 */
export const WithIcon: Story = {
  name: 'Content/With Icon',
  args: { icon: <DocumentGlyph /> },
};

/** 긴 콘텐츠 — 아주 긴 제목/메타. 아이콘은 첫 줄에 고정되고 본문만 줄바꿈된다(overflow-wrap: anywhere) */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    icon: <DocumentGlyph />,
    title:
      '고객이 등록한 문의 제목이 아주 길어서 한 줄에 담기지 않는 경우에도 아이콘은 첫 줄에 고정되고 본문만 줄바꿈되어야 해요 — overflowwrapanywhere',
    meta: '고객센터 · 담당자 미지정 · 2026-07-14 09:31 · 우선순위 높음 · 재문의 3회',
    href: '#/inquiries/8821',
  },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 링크 행 — href 가 있으면 행 전체가 링크(<a>)가 된다. onClick 은 라우팅 가로채기용으로 함께 발화 */
export const AsLink: Story = {
  name: 'Examples/Link Row',
  args: { href: '#/orders/1024' },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** 키보드 — Tab 으로 행에 포커스가 들어오고 :focus-visible 포커스 링이 그려진다 */
export const FocusVisible: Story = {
  name: 'Accessibility/Keyboard',
  args: { href: '' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const row = rowOf(canvasElement);
    await userEvent.tab();
    row.focus();
    await expect(row).toHaveFocus();
  },
};

/** RTL — 아이콘이 논리 속성에 따라 우측으로 간다(문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    icon: <DocumentGlyph />,
    title: '신규 주문이 접수되었어요',
    meta: '담당자 · 2026-07-14',
  },
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 행을 누르면 onClick 이 발화한다 — 계약상 blockedWhen 이 없어 어떤 상태에서도 발화한다 */
export const RowClick: Story = {
  name: 'Interaction/Row Click',
  args: { href: '', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(rowOf(canvasElement));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/**
 * 링크 행을 눌러도 onClick 이 함께 발화한다(라우팅 가로채기·계측).
 * jsdom 은 실제 내비게이션을 구현하지 않아 클릭 시 "Not implemented: navigation" 이 날 수 있다 — 무해.
 */
export const LinkNavigation: Story = {
  name: 'Interaction/Link Navigation',
  args: { href: '#/orders/1024', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('link'));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
