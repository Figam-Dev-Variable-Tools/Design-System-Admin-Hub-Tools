// Empty — Storybook 스토리 (CSF3 · Molecules/Empty)
//
// argTypes 는 계약 생성물(generated/argtypes/Empty.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(hasQuery 2 × hasActiveFilters 2 = 4) 전수 + 생성 CTA 슬롯 + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { EmptyArgTypes } from '../../../generated/argtypes/Empty.argtypes';
import { Button } from '../../atoms/Button';
import { Empty } from './Empty';

const meta: Meta<typeof Empty> = {
  title: 'Feedback/Empty',
  component: Empty,
  argTypes: { ...EmptyArgTypes },
  args: {
    label: '회원',
    createVerb: '등록',
    hasQuery: false,
    hasActiveFilters: false,
    onClearSearch: fn(),
    onResetFilters: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Empty>;

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

/** 진짜 비어있음 — '등록된 회원이 없습니다' + 생성 CTA 슬롯 (받침 있는 label → '이') */
export const TrulyEmpty: Story = {
  name: 'Empty: 진짜 비어있음 — 생성 CTA',
  args: {
    action: <Button variant="primary">회원 등록</Button>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('등록된 회원이 없습니다')).not.toBeNull();
    // 생성 CTA 는 보이고, 복구(검색/필터) 버튼은 없다
    await expect(canvas.getByRole('button', { name: '회원 등록' })).not.toBeNull();
    await expect(canvas.queryByRole('button', { name: '검색 지우기' })).toBeNull();
  },
};

/** 진짜 비어있음 — 받침 없는 label('카페') → '가' (조사 자동 선택 검증, ERP-13) */
export const TrulyEmptyJosaGa: Story = {
  name: 'Empty: 받침 없는 label 은 조사 가',
  args: { label: '카페', createVerb: '등록' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('등록된 카페가 없습니다')).not.toBeNull();
  },
};

/** 검색 결과 없음 — '조건에 맞는 회원이 없습니다' + '검색 지우기' */
export const SearchNoResults: Story = {
  name: 'Empty: 검색 결과 없음 — 검색 지우기',
  args: { hasQuery: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('조건에 맞는 회원이 없습니다')).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: '검색 지우기' }));
    await expect(args.onClearSearch).toHaveBeenCalled();
  },
};

/** 필터 결과 없음 — '필터에 맞는 회원이 없습니다' + '필터 초기화' */
export const FilterNoResults: Story = {
  name: 'Empty: 필터 결과 없음 — 필터 초기화',
  args: { hasActiveFilters: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('필터에 맞는 회원이 없습니다')).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: '필터 초기화' }));
    await expect(args.onResetFilters).toHaveBeenCalled();
  },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  decorators: [rtlFrame],
};
