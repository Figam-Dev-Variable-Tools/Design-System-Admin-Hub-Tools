/**
 * Pages/Statistics/Overview — 이 메뉴에 속한 어드민 화면 목록.
 *
 * 데이터 원천: ../_data/pages.ts (apps/admin nav-config.ts 의 값 복사본).
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 전부 토큰 CSS 변수(var(--tds-*)).
 */
import type { Meta, StoryObj } from '@storybook/react';
import { MenuOverview } from '../_data/menu-overview';

const meta: Meta = {
  title: 'Pages/Statistics/Overview',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

export const Overview: Story = {
  render: () => <MenuOverview menuEn="Statistics" />,
};
