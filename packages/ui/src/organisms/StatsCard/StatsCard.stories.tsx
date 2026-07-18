// StatsCard — Storybook 스토리 (CSF3 · Organisms/StatsCard)
//
// argTypes 는 계약 생성물(generated/argtypes/StatsCard.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 3: default/loading/error) 전수 + boolean(loading) true/false
//           + 슬롯(action·children) 최소/최대 + Dark/RTL.
//
// 본문/액션에 무엇이 오는지는 조립하는 쪽이 정한다 — 여기서는 molecule(LineAreaChart/DataTable/
// SegmentedControl)을 주입해 실제 조립 형태를 보여준다 (organism → molecule 은 허용 방향).
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { StatsCardArgTypes } from '../../../generated/argtypes/StatsCard.argtypes';
import { StatsCard } from './StatsCard';
import { DataTable } from '../../molecules/DataTable';
import { LineAreaChart } from '../../molecules/LineAreaChart';
import { SegmentedControl } from '../../molecules/SegmentedControl';

const RANGE_OPTIONS = [
  { id: 'day', label: '일' },
  { id: 'week', label: '주' },
  { id: 'month', label: '월' },
];

const CHART_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

const CHART_SERIES = [
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

const TABLE_COLUMNS = [
  { key: 'date', label: '일자', align: 'left' as const },
  { key: 'orders', label: '주문수', align: 'right' as const, unit: '건' },
  { key: 'revenue', label: '매출액', align: 'right' as const, unit: '원' },
];

const TABLE_ROWS = [
  { date: '2026-07-12', orders: 9, revenue: 1230000 },
  { date: '2026-07-13', orders: 0, revenue: 0 },
  { date: '2026-07-14', orders: 18, revenue: 2610000 },
];

const meta: Meta<typeof StatsCard> = {
  title: 'Data Display/StatsCard',
  component: StatsCard,
  argTypes: { ...StatsCardArgTypes },
  args: {
    title: '방문자',
    loading: false,
    error: '',
    action: (
      <SegmentedControl value="week" options={RANGE_OPTIONS} size="sm" ariaLabel="조회 기간" />
    ),
    children: (
      <LineAreaChart
        series={CHART_SERIES}
        labels={CHART_LABELS}
        ariaLabel="요일별 방문자와 페이지뷰 추이 — 목요일에 정점, 주말에 감소"
      />
    ),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof StatsCard>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-raised)', padding: 'var(--tds-space-5)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** default — 헤더(제목 + 기간 토글) + 본문(차트) */
export const Default: Story = {
  args: { loading: false, error: '' },
};

/**
 * value(KPI 수치) — 1.1.0. 본문 위에 display tier(typography.display.sm)로 지배적 숫자를 세운다.
 * 제목(label.md)·본문(body.md)과 크기대가 갈려 대시보드에서 숫자가 먼저 읽힌다 (TOKEN-05).
 * 포맷팅은 호출부가 끝낸 문자열을 넘긴다 — 카드는 숫자를 모른다.
 */
export const WithValue: Story = {
  args: { value: '12,345' },
};

/**
 * loading — 본문만 스켈레톤으로 대체된다 (+ aria-busy). **액션 슬롯은 떠 있는 채 유지된다** (계약 1.0.1):
 * 그 액션은 기간 토글 자신이라, 로딩 중에 사라지면 자기 클릭에 자기가 없어진다.
 * 로딩 중 비활성은 호출부가 슬롯 컴포넌트에 disabled 를 줘서 만든다.
 */
export const Loading: Story = {
  args: { loading: true },
};

/** loading + 비활성 토글 — 호출부가 <SegmentedControl disabled={loading}> 로 비활성을 준다 */
export const LoadingWithDisabledAction: Story = {
  args: {
    loading: true,
    action: (
      <SegmentedControl
        ariaLabel="기간 선택"
        options={RANGE_OPTIONS}
        value="week"
        size="sm"
        disabled
      />
    ),
  },
};

/** error — 본문 대신 role="alert" 문구. loading 보다 우선한다 */
export const ErrorState: Story = {
  args: { error: '통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
};

/** error + loading — error 가 우선한다 */
export const ErrorTakesPrecedence: Story = {
  args: { loading: true, error: '통계 서버에 연결할 수 없습니다.' },
};

/** 슬롯 최소 — 액션 없이 제목 + 본문만 */
export const SlotMinimal: Story = {
  args: {
    title: '오늘 매출',
    action: null,
    children: <p style={{ margin: 0 }}>2,610,000원</p>,
  },
};

/** 본문 슬롯 교체 — 같은 껍데기에 표(DataTable)를 주입한다 (도메인 중립 · ADR-0003) */
export const WithTableBody: Story = {
  args: {
    title: '기간별 분석',
    action: null,
    children: (
      <DataTable
        columns={TABLE_COLUMNS}
        rows={TABLE_ROWS}
        rowKey="date"
        summaryRows={[{ date: '합계', orders: 27, revenue: 3840000 }]}
        caption="일자별 주문수와 매출액, 기간 합계"
      />
    ),
  },
};

/** 슬롯 최대 — 긴 제목 + 액션 + 긴 본문 (헤더가 wrap 된다) */
export const SlotLongContent: Story = {
  args: {
    title: '방문자 · 페이지뷰 · 신규 가입 추이 (최근 30일, KST 기준 집계)',
    children: (
      <>
        <LineAreaChart
          series={CHART_SERIES}
          labels={CHART_LABELS}
          ariaLabel="요일별 방문자와 페이지뷰 추이"
        />
        <DataTable
          columns={TABLE_COLUMNS}
          rows={TABLE_ROWS}
          rowKey="date"
          summaryRows={[{ date: '합계', orders: 27, revenue: 3840000 }]}
          caption="일자별 주문수와 매출액, 기간 합계"
        />
      </>
    ),
  },
};

/** Dark */
export const DarkTheme: Story = {
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: {
    title: 'الزوار',
    action: null,
    children: (
      <LineAreaChart
        series={CHART_SERIES}
        labels={CHART_LABELS}
        ariaLabel="اتجاه الزوار ومشاهدات الصفحة"
      />
    ),
  },
  decorators: [rtlFrame],
};
