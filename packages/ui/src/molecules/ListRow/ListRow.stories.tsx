// ListRow — Storybook 스토리 (CSF3 · Molecules/ListRow)
//
// argTypes 는 계약 생성물(generated/argtypes/ListRow.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 3: default/hover/focus-visible) 전수 + 슬롯 최소/최대 + Dark/RTL.
// 목록 컨테이너(ul/li)는 organism(ListCard)이 소유한다 — 여기선 행 하나만 렌더한다.
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
  title: 'Molecules/ListRow',
  component: ListRow,
  argTypes: { ...ListRowArgTypes },
  args: {
    title: '신규 주문이 접수되었습니다',
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

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-default)', padding: 'var(--tds-space-5)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** default — href 없음 → 클릭 가능한 행(button) */
export const Default: Story = {
  args: { href: '' },
};

/** hover — 표면(raised) 배경이 깔린다 */
export const Hover: Story = {
  args: { href: '' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const row = rowOf(canvasElement);
    await userEvent.hover(row);
    await expect(row).toHaveClass('tds-listrow');
  },
};

/** focus-visible — 키보드 포커스 링 */
export const FocusVisible: Story = {
  args: { href: '' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const row = rowOf(canvasElement);
    await userEvent.tab();
    row.focus();
    await expect(row).toHaveFocus();
  },
};

/** ListRow: onClick 은 계약상 blockedWhen 이 없다 — 어떤 상태에서도 클릭하면 발화한다 */
export const OnClickAlwaysFires: Story = {
  name: 'ListRow: onClick 은 클릭 시 발화한다 (blockedWhen 없음)',
  args: { href: '', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(rowOf(canvasElement));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** href 있음 — 행 전체가 링크(<a>)가 된다. onClick 은 라우팅 가로채기용으로 함께 발화 */
export const AsLink: Story = {
  args: { href: '#/orders/1024' },
};

/** 슬롯 최소 — 아이콘 없음 + meta 없음 (제목만) */
export const SlotMinimal: Story = {
  args: { icon: null, meta: '', title: '주문 1024번' },
};

/** 슬롯 — 좌측 아이콘 있음 */
export const WithIcon: Story = {
  args: { icon: <DocumentGlyph /> },
};

/** 최대 콘텐츠 — 아주 긴 제목/메타 (overflow-wrap: anywhere 로 줄바꿈된다) */
export const SlotLongContent: Story = {
  args: {
    icon: <DocumentGlyph />,
    title:
      '고객이 등록한 문의 제목이 아주 길어서 한 줄에 담기지 않는 경우에도 아이콘은 첫 줄에 고정되고 본문만 줄바꿈되어야 합니다 — overflowwrapanywhere',
    meta: '고객센터 · 담당자 미지정 · 2026-07-14 09:31 · 우선순위 높음 · 재문의 3회',
    href: '#/inquiries/8821',
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { icon: <DocumentGlyph />, href: '#/orders/1024' },
  decorators: [darkFrame],
};

/** RTL — 아이콘이 논리 속성에 따라 우측으로 간다 */
export const RightToLeft: Story = {
  args: {
    icon: <DocumentGlyph />,
    title: 'تم استلام طلب جديد',
    meta: 'المسؤول · 2026-07-14',
  },
  decorators: [rtlFrame],
};
