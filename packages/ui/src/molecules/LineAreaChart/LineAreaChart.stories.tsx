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

/** 6계열 데모 — 채널별 유입 (TOKEN-13: series-1..6 이 서로 다른 hue 로 구분되는지 보이는 자리) */
const CHANNEL_SERIES = [
  {
    id: 'organic',
    label: '자연 검색',
    kind: 'line' as const,
    values: [820, 940, 880, 1020, 990, 540, 470],
  },
  {
    id: 'paid',
    label: '유료 광고',
    kind: 'line' as const,
    values: [640, 700, 760, 820, 780, 420, 360],
  },
  {
    id: 'social',
    label: '소셜',
    kind: 'line' as const,
    values: [480, 520, 610, 580, 640, 700, 660],
  },
  {
    id: 'referral',
    label: '리퍼럴',
    kind: 'line' as const,
    values: [320, 360, 340, 420, 400, 260, 210],
  },
  {
    id: 'email',
    label: '이메일',
    kind: 'line' as const,
    values: [210, 190, 240, 300, 280, 140, 120],
  },
  {
    id: 'direct',
    label: '직접 유입',
    kind: 'line' as const,
    values: [140, 160, 150, 180, 200, 320, 380],
  },
];

const meta: Meta<typeof LineAreaChart> = {
  title: 'Charts/LineAreaChart',
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

/**
 * TOKEN-13 — 6계열이 서로 다른 hue 로 구분된다 (하드코딩 색 0건 · chart.series-1..6 토큰).
 * 다범주 ERP 차트(매출/채널/상태 분포)의 실사용 형태다 — 3번째 계열부터 1번 색으로 되돌아오면 안 된다.
 */
export const SixSeries: Story = {
  name: 'LineAreaChart: 6계열 구분 (TOKEN-13)',
  args: {
    labels: LABELS,
    series: CHANNEL_SERIES,
    ariaLabel: '요일별 채널 6종 유입 추이 — 채널마다 다른 색으로 구분된다',
  },
};

/** TOKEN-13 — 6계열 다크. 각 series 토큰이 dark 페어로 전환된다 */
export const SixSeriesDark: Story = {
  name: 'LineAreaChart: 6계열 구분 — Dark (TOKEN-13)',
  args: {
    labels: LABELS,
    series: CHANNEL_SERIES,
    ariaLabel: '요일별 채널 6종 유입 추이 (다크)',
  },
  decorators: [darkFrame],
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
