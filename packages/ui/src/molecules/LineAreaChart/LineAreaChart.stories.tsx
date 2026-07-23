// LineAreaChart — Storybook 스토리 (CSF3 · Data 계열 IA)
//
// [고정 IA — Data 계열] Table·DataTable·ListCard·Pagination 과 같은 어휘로 문서화한다(조합 폭발 금지):
//   Docs · Overview · Playground · States/(Empty·Loading·Single Point) ·
//   Features/(Area Fill·Line·Multiple Series·Legend — 차트 고유 역량) · Content/(Few Points·Many Points) ·
//   Accessibility/(ARIA·RTL)
// 차트는 이벤트가 없어(계약에 events 없음) Interaction 그룹을 두지 않는다.
// 계열 색·6계열 순환·states[] 전수 검증은 LineAreaChart.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

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
  title: 'Design System/Components/LineAreaChart',
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

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새. 면적(페이지뷰) + 선(방문자) 2계열이 가장 흔하다 */
export const Overview: Story = {
  args: { showLegend: true },
};

/** Playground — series·labels·showLegend·ariaLabel 을 Controls 로 바꿔 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 빈 상태 — 값이 전부 0 이라 그릴 추세가 없다. buildScale 폴백으로 축은 유지된다 */
export const ZeroValues: Story = {
  name: 'States/Empty',
  args: {
    series: [
      { id: 'visitors', label: '방문자', kind: 'area' as const, values: [0, 0, 0, 0, 0, 0, 0] },
    ],
    ariaLabel: '방문자 없음',
  },
};

/** 로딩 — 데이터가 아직 없을 때 (계열 값이 비어도 축은 유지된다) */
export const Loading: Story = {
  name: 'States/Loading',
  args: {
    series: [{ id: 'visitors', label: '방문자', kind: 'line' as const, values: [] }],
    labels: [],
    ariaLabel: '데이터를 불러오는 중이에요',
  },
};

/** 단일 관측점 — 점이 하나뿐이라 곡선 없이 점만 찍힌다 (toSmoothPath 단일점 분기) */
export const SinglePoint: Story = {
  name: 'States/Single Point',
  args: {
    labels: ['오늘'],
    series: [{ id: 'visitors', label: '방문자', kind: 'line' as const, values: [880] }],
    ariaLabel: '오늘 방문자 — 단일 관측점',
  },
};

/* ── Features ───────────────────────────────────────────────────────────── */

/** 면적 채움 — kind=area 는 곡선 아래를 baseline 까지 닫아 면적을 그린다 */
export const SingleArea: Story = {
  name: 'Features/Area Fill',
  args: {
    series: [SERIES[0]].filter((item) => item !== undefined),
    ariaLabel: '요일별 페이지뷰 추이',
  },
};

/** 선 — kind=line 은 선 + 점만 그린다 (면적 없음) */
export const SingleLine: Story = {
  name: 'Features/Line',
  args: {
    series: [SERIES[1] ?? SERIES[0]].filter((item) => item !== undefined),
    ariaLabel: '요일별 방문자 추이',
  },
};

/**
 * 다계열 — 6계열이 서로 다른 hue 로 구분된다 (하드코딩 색 0건 · chart.series-1..6 토큰).
 * 다범주 ERP 차트(매출/채널/상태 분포)의 실사용 형태다 — 3번째 계열부터 1번 색으로 되돌아오면 안 된다(TOKEN-13).
 */
export const SixSeries: Story = {
  name: 'Features/Multiple Series',
  args: {
    labels: LABELS,
    series: CHANNEL_SERIES,
    ariaLabel: '요일별 채널 6종 유입 추이 — 채널마다 다른 색으로 구분된다',
  },
};

/** 범례 숨김 — showLegend=false 면 계열 범례를 감춘다 (축·계열은 그대로) */
export const LegendHidden: Story = {
  name: 'Features/Legend',
  args: { showLegend: false },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 적은 점 — 관측점 2개 (어제 대비 오늘) */
export const MinimalData: Story = {
  name: 'Content/Few Points',
  args: {
    labels: ['어제', '오늘'],
    series: [{ id: 'visitors', label: '방문자', kind: 'line' as const, values: [420, 880] }],
    ariaLabel: '어제 대비 오늘 방문자 추이 — 두 배 증가',
  },
};

/** 많은 점 — 30일치 + 큰 수치. 창이 촘촘해도 곡선이 무너지지 않는다 */
export const LongData: Story = {
  name: 'Content/Many Points',
  args: {
    labels: Array.from({ length: 30 }, (_, index) => `${String(index + 1)}일`),
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

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** ARIA — role=img 가 ariaLabel 로 이름을 갖고, 범례 색 점은 장식이라 aria-hidden 이다 */
export const Accessibility: Story = {
  name: 'Accessibility/ARIA',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 차트 전체가 role=img 로 ariaLabel(추세 문장)을 접근 가능한 이름으로 가진다
    const chart = canvas.getByRole('img', {
      name: '요일별 방문자와 페이지뷰 추이 — 목요일에 정점, 주말에 감소',
    });
    await expect(chart).toHaveAttribute('role', 'img');

    // 범례 색 점은 장식용이므로 스크린리더에서 감춰진다
    const dots = canvasElement.querySelectorAll('.tds-chart__legend-dot');
    await expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      await expect(dot).toHaveAttribute('aria-hidden', 'true');
    }
  },
};

/** RTL — dir=rtl 컨테이너에서 축·범례가 논리 흐름을 따라 뒤집힌다 (문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { ariaLabel: '요일별 방문자와 페이지뷰 추이 (RTL 검수)' },
  decorators: [rtlFrame],
};
