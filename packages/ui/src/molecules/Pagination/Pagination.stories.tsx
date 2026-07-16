// Pagination — Storybook 스토리 (CSF3 · Molecules/Pagination)
//
// argTypes 는 계약 생성물(generated/argtypes/Pagination.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: states(default/hover/focus-visible/disabled) + onChange(값) + 단일 페이지 미렌더 + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { PaginationArgTypes } from '../../../generated/argtypes/Pagination.argtypes';
import { Pagination } from './Pagination';
import type { PaginationProps } from '../../../generated/types/Pagination.types';

/** 제어 컴포넌트 — page 는 스토리가 잡는다 */
function ControlledPagination(args: PaginationProps) {
  const [page, setPage] = useState(args.page);
  useEffect(() => setPage(args.page), [args.page]);
  return (
    <Pagination
      {...args}
      page={page}
      onChange={(next) => {
        setPage(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof Pagination> = {
  title: 'Molecules/Pagination',
  component: Pagination,
  argTypes: { ...PaginationArgTypes },
  args: {
    page: 3,
    totalPages: 10,
    label: '회원 목록 페이지',
    onChange: fn(),
  },
  render: (args) => <ControlledPagination {...args} />,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Pagination>;

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

/** default — 가운데 페이지 (양쪽 버튼 활성) */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '이전 페이지' }));
    await expect(args.onChange).toHaveBeenCalledWith(2);
    await userEvent.click(canvas.getByRole('button', { name: '5' }));
    await expect(args.onChange).toHaveBeenCalledWith(5);
  },
};

/** disabled — 첫 페이지에서 '이전'이 잠긴다 */
export const AtFirstPage: Story = {
  name: 'Pagination: 첫 페이지 — 이전 버튼 disabled',
  args: { page: 1 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: '이전 페이지' })).toBeDisabled();
  },
};

/** disabled — 마지막 페이지에서 '다음'이 잠긴다 */
export const AtLastPage: Story = {
  name: 'Pagination: 마지막 페이지 — 다음 버튼 disabled',
  args: { page: 10 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: '다음 페이지' })).toBeDisabled();
  },
};

/** focus-visible — 키보드 포커스 링 */
export const FocusVisible: Story = {
  name: 'Pagination: focus-visible 상태',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('button', { name: '이전 페이지' })).toHaveFocus();
  },
};

/** 단일 페이지 — 렌더하지 않는다 (nav 없음) */
export const SinglePageHidden: Story = {
  name: 'Pagination: totalPages ≤ 1 이면 렌더하지 않는다',
  args: { totalPages: 1, page: 1 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('navigation')).toBeNull();
  },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [darkFrame],
};

/** RTL — 화살표가 논리 흐름을 따라 뒤집힌다 */
export const RightToLeft: Story = {
  args: { label: 'صفحات' },
  decorators: [rtlFrame],
};
