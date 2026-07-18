/**
 * Foundation/📋 Catalog — 23. Foundation (기초 요소) 구현 체크리스트.
 * 데이터 원천은 generated/taxonomy.ts, 렌더는 CatalogTable.tsx 하나를 공유한다.
 *
 * [주의] 사이드바의 `Foundations`(토큰 문서)와 다른 최상위 항목이다.
 * 여기는 분류표 23번 카테고리(Foundation)의 체크리스트이며 이름은 taxonomy 의 name 정본을 따른다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { CatalogTable } from './CatalogTable';

const meta: Meta<typeof CatalogTable> = {
  // 계약 category 는 'Foundation' 이지만 사이드바 그룹은 토큰 문서와 같은 'Foundations' 를 쓴다.
  // 두 이름을 다 노출하면 사이드바에 거의 같은 그룹이 둘로 갈라져 보인다(Foundation / Foundations).
  title: 'Foundations/📋 Catalog',
  component: CatalogTable,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof CatalogTable>;

export const Catalog: Story = {
  args: { categoryKey: 'foundation' },
};
