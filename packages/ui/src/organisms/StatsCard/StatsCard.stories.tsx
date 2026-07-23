// StatsCard — Storybook 스토리 (CSF3 · Organisms/StatsCard)
//
// [고정 IA] Overview · States(Loading·Error) · Content(본문 형태) · Examples(대시보드 조립) ·
// Accessibility(RTL·ARIA). StatsCard 는 헤더+본문 슬롯만 소유하는 껍데기라 Variants/Sizes 가 없고,
// 이벤트가 없어 Interaction 도 없다 — 세부 조합은 Docs 의 Controls 로 조작한다.
// argTypes 는 계약 생성물(generated/argtypes/StatsCard.argtypes)을 spread 한다 (수기 작성 금지 — G5).
//
// 본문/액션에 무엇이 오는지는 조립하는 쪽이 정한다 — 여기서는 molecule(LineAreaChart/DataTable/
// SegmentedControl)을 주입해 실제 조립 형태를 보여준다 (organism → molecule 은 허용 방향).
import type { CSSProperties } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

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
  title: 'Design System/Components/StatsCard',
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

const dashboardRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
  gap: 'var(--tds-space-5)',
};

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 사용. 헤더(제목 + 기간 토글) + 본문(차트) */
export const Overview: Story = {
  args: { loading: false, error: '' },
};

/* ── States ─────────────────────────────────────────────────────────────── */

/**
 * loading — 본문만 스켈레톤으로 대체된다 (+ aria-busy). **액션 슬롯은 떠 있는 채 유지된다** (계약 1.0.1):
 * 그 액션은 기간 토글 자신이라, 로딩 중에 사라지면 자기 클릭에 자기가 없어진다.
 * 로딩 중 비활성은 호출부가 슬롯 컴포넌트에 disabled 를 줘서 만든다.
 */
export const Loading: Story = {
  name: 'States/Loading',
  args: { loading: true },
};

/** loading + 비활성 토글 — 호출부가 <SegmentedControl disabled={loading}> 로 비활성을 준다 */
export const LoadingWithDisabledAction: Story = {
  name: 'States/Loading (Disabled Action)',
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
  name: 'States/Error',
  args: { error: '통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
};

/** error + loading — error 가 우선한다 */
export const ErrorTakesPrecedence: Story = {
  name: 'States/Error Precedence',
  args: { loading: true, error: '통계 서버에 연결할 수 없어요.' },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/**
 * value(KPI 수치) — 1.1.0. 본문 위에 display tier(typography.display.sm)로 지배적 숫자를 세운다.
 * 제목(label.md)·본문(body.md)과 크기대가 갈려 대시보드에서 숫자가 먼저 읽힌다 (TOKEN-05).
 * 포맷팅은 호출부가 끝낸 문자열을 넘긴다 — 카드는 숫자를 모른다.
 */
export const WithValue: Story = {
  name: 'Content/With Value',
  args: { value: '12,345' },
};

/** 본문 슬롯 교체 — 같은 껍데기에 표(DataTable)를 주입한다 (도메인 중립 · ADR-0003) */
export const WithTableBody: Story = {
  name: 'Content/Table Body',
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

/** 최소 본문 — 액션 없이 제목 + 본문만 */
export const SlotMinimal: Story = {
  name: 'Content/Minimal',
  args: {
    title: '오늘 매출',
    action: null,
    children: <p style={{ margin: 0 }}>2,610,000원</p>,
  },
};

/** 긴 본문 — 긴 제목 + 액션 + 긴 본문 (헤더가 wrap 된다) */
export const SlotLongContent: Story = {
  name: 'Content/Long Content',
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

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 대시보드 조립 — KPI 카드가 한 행에 나란히 놓이는 가장 흔한 실사용 형태 */
export const ExampleDashboardRow: Story = {
  name: 'Examples/Dashboard Row',
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={dashboardRowStyle}>
      <StatsCard title="오늘 방문자" value="12,345">
        <LineAreaChart series={CHART_SERIES} labels={CHART_LABELS} ariaLabel="요일별 방문자 추이" />
      </StatsCard>
      <StatsCard title="오늘 매출" value="2,610,000원">
        <p style={{ margin: 0 }}>어제 대비 +8.2%</p>
      </StatsCard>
      <StatsCard title="신규 가입" value="128">
        <p style={{ margin: 0 }}>주간 목표의 64%</p>
      </StatsCard>
    </div>
  ),
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 문서 방향만 뒤집는다. 치수는 논리 속성이라 같은 카드가 우측 정렬로 흐른다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    title: '방문자',
    action: null,
    children: (
      <LineAreaChart
        series={CHART_SERIES}
        labels={CHART_LABELS}
        ariaLabel="요일별 방문자와 페이지뷰 추이"
      />
    ),
  },
  decorators: [rtlFrame],
};

/**
 * ARIA — region 은 제목으로 접근성 이름을 얻고(aria-labelledby), error 는 role="alert" 로
 * 즉시 통지된다. 스크린리더가 카드를 이름으로 짚고 실패를 곧바로 읽는다.
 */
export const Accessibility: Story = {
  name: 'Accessibility/ARIA',
  args: { error: '통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // region 이 제목으로 접근성 이름을 얻는다
    await expect(canvas.getByRole('region', { name: '방문자' })).toBeInTheDocument();
    // error 는 role=alert 로 즉시 통지된다
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      '통계를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    );
  },
};
