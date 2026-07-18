// SearchField — Storybook 스토리 (CSF3 · Molecules/SearchField)
//
// argTypes 는 계약 생성물(generated/argtypes/SearchField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: states(default/focus-visible) + onChange(값) + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { SearchFieldArgTypes } from '../../../generated/argtypes/SearchField.argtypes';
import { SearchField } from './SearchField';
import type { SearchFieldProps } from '../../../generated/types/SearchField.types';

/** 제어 컴포넌트 — 값은 스토리가 잡는다 */
function ControlledSearchField(args: SearchFieldProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <SearchField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof SearchField> = {
  title: 'Inputs/SearchField',
  component: SearchField,
  argTypes: { ...SearchFieldArgTypes },
  args: {
    value: '',
    label: '공지 제목 검색',
    placeholder: '검색',
    onChange: fn(),
  },
  render: (args) => <ControlledSearchField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof SearchField>;

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

/** default — 돋보기 겹친 검색 입력 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole('searchbox', { name: '공지 제목 검색' });
    await expect(input).toHaveAttribute('type', 'search');
    await userEvent.type(input, '안내');
    await expect(input).toHaveValue('안내');
  },
};

/** focus-visible — 키보드 포커스 */
export const FocusVisible: Story = {
  name: 'SearchField: focus-visible 상태',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('searchbox')).toHaveFocus();
  },
};

/** 값이 있는 상태 */
export const WithValue: Story = {
  args: { value: '리뉴얼', label: '상품명 검색', placeholder: '상품명 · SKU · 브랜드 검색' },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [darkFrame],
};

/** RTL — 돋보기가 논리 속성(inset-inline-start)을 따라 우측으로 간다 */
export const RightToLeft: Story = {
  args: { label: 'بحث', placeholder: 'بحث' },
  decorators: [rtlFrame],
};
