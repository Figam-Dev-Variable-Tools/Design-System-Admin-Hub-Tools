/**
 * Actions/📋 Catalog — 01. Actions (액션) 구현 체크리스트.
 * 데이터 원천은 generated/taxonomy.ts, 렌더는 CatalogTable.tsx 하나를 공유한다.
 * Storybook title 은 정적 문자열이어야 하므로 카테고리마다 이 얇은 파일이 존재한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CatalogTable } from './CatalogTable';

const meta: Meta<typeof CatalogTable> = {
  title: 'Actions/📋 Catalog',
  component: CatalogTable,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof CatalogTable>;

export const Catalog: Story = {
  args: { categoryKey: 'actions' },
};
