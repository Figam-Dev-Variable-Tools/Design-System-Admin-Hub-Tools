// LineAreaChart — Storybook 스토리 (CSF3 · Molecules/LineAreaChart)
//
// argTypes 는 계약 생성물(generated/argtypes/LineAreaChart.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 2: default/loading) + boolean(showLegend) true/false + 데이터 최소/최대 + Dark/RTL.
// series/labels 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { LineAreaChartArgTypes } from '../../../generated/argtypes/LineAreaChart.argtypes';
import { LineAreaChart } from './LineAreaChart';

const LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const SERIES = [
  {
    id: 'page-views',
    label: '페이지뷰',
    kind: 'area' as const,
    values: [1820, 2140, 1990, 2480, 2310, 1420, 1180],
  },
  {
    id: 'visitors',
    label: '방문자',
    kind: 'line' as const,
    values: [940, 1120, 1010, 1290, 1180, 720, 610],
  },
];

const meta: Meta<typeof LineAreaChart> = {
  title: 'Molecules/LineAreaChart',
  component: LineAreaChart,
  argTypes: { ...LineAreaChartArgTypes },
  args: {
    series: SERIES,
    labels: LABELS,
    showLegend: true,
    ariaLabel: '요일별 방문자와 페이지뷰 추이 — 목요일에 정점, 주말에 감소',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof LineAreaChart>;

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

/** default — 면적(페이지뷰) + 선(방문자) 2계열 */
export const Default: Story = {
  args: { showLegend: true },
};

/** loading — 데이터가 아직 없을 때 (계열 값이 비어도 축은 유지된다) */
export const Loading: Story = {
  args: {
    series: [{ id: 'visitors', label: '방문자', kind: 'line' as const, values: [] }],
    labels: [],
    ariaLabel: '데이터를 불러오는 중입니다',
  },
};

/** showLegend=true — 계열 식별 수단이므로 기본 노출 */
export const LegendVisible: Story = {
  args: { showLegend: true },
};

/** showLegend=false — 범례를 숨긴 상태 */
export const LegendHidden: Story = {
  args: { showLegend: false },
};

/** kind=line 단일 계열 */
export const SingleLine: Story = {
  args: {
    series: [SERIES[1] ?? SERIES[0]].filter((item) => item !== undefined),
    ariaLabel: '요일별 방문자 추이',
  },
};

/** kind=area 단일 계열 */
export const SingleArea: Story = {
  args: {
    series: [SERIES[0]].filter((item) => item !== undefined),
    ariaLabel: '요일별 페이지뷰 추이',
  },
};

/** 최소 콘텐츠 — 점 2개 */
export const MinimalData: Story = {
  args: {
    labels: ['어제', '오늘'],
    series: [{ id: 'visitors', label: '방문자', kind: 'line' as const, values: [420, 880] }],
    ariaLabel: '어제 대비 오늘 방문자 추이 — 두 배 증가',
  },
};

/** 값이 전부 0 — 스케일이 무너지지 않는다 (buildScale 폴백) */
export const ZeroValues: Story = {
  args: {
    series: [
      { id: 'visitors', label: '방문자', kind: 'area' as const, values: [0, 0, 0, 0, 0, 0, 0] },
    ],
    ariaLabel: '방문자 없음',
  },
};

/** 최대 콘텐츠 — 30일치 + 큰 수치 */
export const LongData: Story = {
  args: {
    labels: Array.from({ length: 30 }, (_, index) => `${index + 1}일`),
    series: [
      {
        id: 'page-views',
        label: '페이지뷰(누적)',
        kind: 'area' as const,
        values: Array.from(
          { length: 30 },
          (_, index) => 40000 + Math.round(Math.sin(index) * 12000),
        ),
      },
      {
        id: 'visitors',
        label: '순 방문자(UV)',
        kind: 'line' as const,
        values: Array.from(
          { length: 30 },
          (_, index) => 18000 + Math.round(Math.cos(index) * 6000),
        ),
      },
    ],
    ariaLabel: '최근 30일 페이지뷰와 순 방문자 추이 — 주기적 등락 반복',
  },
};

/** Dark — chart.* 토큰이 다크에서 자동 전환된다 */
export const DarkTheme: Story = {
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { ariaLabel: 'اتجاه الزوار ومشاهدات الصفحة' },
  decorators: [rtlFrame],
};
