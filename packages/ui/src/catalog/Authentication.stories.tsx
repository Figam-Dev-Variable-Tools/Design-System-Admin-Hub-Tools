/**
 * Authentication/📋 Catalog — 13. Authentication (인증) 구현 체크리스트.
 * 데이터 원천은 generated/taxonomy.ts, 렌더는 CatalogTable.tsx 하나를 공유한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CatalogTable } from './CatalogTable';

const meta: Meta<typeof CatalogTable> = {
  title: 'Authentication/📋 Catalog',
  component: CatalogTable,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof CatalogTable>;

export const Catalog: Story = {
  args: { categoryKey: 'authentication' },
};
