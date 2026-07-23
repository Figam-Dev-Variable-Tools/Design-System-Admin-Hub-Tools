// DataTable — Storybook 스토리 (CSF3 · Data 계열 IA)
//
// [고정 IA — Data 계열] Table·Pagination·ListCard 와 같은 어휘로 문서화한다(조합 폭발 금지):
//   Docs · Overview · Playground · States/(Empty·Loading) ·
//   Features/(Dim Zero·Summary Row·Unit In Body — 이 표가 가진 데이터 역량) ·
//   Content/(Few Rows·Many Rows) · Accessibility/(ARIA·RTL)
// DataTable 은 이벤트가 없는 정적 표라 Interaction 그룹과 포커스 대상이 없어 Keyboard 는 생략한다.
// 상태·단위·스코프 전수 검증은 DataTable.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { DataTableArgTypes } from '../../../generated/argtypes/DataTable.argtypes';
import { DataTable } from './DataTable';

const COLUMNS = [
  { key: 'date', label: '일자', align: 'left' as const },
  { key: 'orders', label: '주문수', align: 'right' as const, unit: '건' },
  { key: 'revenue', label: '매출액', align: 'right' as const, unit: '원' },
  { key: 'visitors', label: '방문자', align: 'right' as const, unit: '명' },
  { key: 'signups', label: '가입', align: 'right' as const, unit: '명' },
  { key: 'inquiries', label: '문의', align: 'right' as const },
];

const ROWS = [
  { date: '2026-07-08', orders: 12, revenue: 1840000, visitors: 942, signups: 8, inquiries: 3 },
  { date: '2026-07-09', orders: 7, revenue: 990000, visitors: 811, signups: 5, inquiries: 0 },
  { date: '2026-07-10', orders: 0, revenue: 0, visitors: 512, signups: 0, inquiries: 1 },
  { date: '2026-07-11', orders: 18, revenue: 2610000, visitors: 1204, signups: 14, inquiries: 6 },
  { date: '2026-07-12', orders: 9, revenue: 1230000, visitors: 878, signups: 6, inquiries: 2 },
];

const SUMMARY_ROWS = [
  { date: '합계', orders: 46, revenue: 6670000, visitors: 4347, signups: 33, inquiries: 12 },
];

/** 긴 라벨 + 큰 수치 — 가로 스크롤 컨테이너(fluid)로 넘치는 '최대 콘텐츠'를 Many Rows 에서 쓴다 */
const LONG_COLUMNS = [
  { key: 'date', label: '집계 기준 일자(KST)', align: 'left' as const },
  { key: 'orders', label: '주문수(취소·반품 제외)', align: 'right' as const, unit: '건' },
  { key: 'revenue', label: '매출액(부가세 포함)', align: 'right' as const, unit: '원' },
  { key: 'visitors', label: '순 방문자(UV)', align: 'right' as const, unit: '명' },
  { key: 'signups', label: '신규 가입(이메일 인증 완료)', align: 'right' as const, unit: '명' },
  { key: 'inquiries', label: '고객 문의(미답변 포함)', align: 'right' as const, unit: '건' },
];

/** 14행 — 창을 넘겨 세로로 긴 표를 만든다(대시보드 기간별 분석의 2주치) */
const MANY_ROWS = Array.from({ length: 14 }, (_, i) => {
  const day = String(8 + i).padStart(2, '0');
  return {
    date: `2026-07-${day}`,
    orders: (i * 7 + 3) % 40,
    revenue: i * 431000 + 250000,
    visitors: 500 + i * 137,
    signups: (i * 3) % 20,
    inquiries: (i * 2) % 9,
  };
});

const sum = (key: keyof (typeof MANY_ROWS)[number]) =>
  MANY_ROWS.reduce((total, row) => total + Number(row[key]), 0);

const MANY_SUMMARY = [
  {
    date: '기간 합계',
    orders: sum('orders'),
    revenue: sum('revenue'),
    visitors: sum('visitors'),
    signups: sum('signups'),
    inquiries: sum('inquiries'),
  },
];

const meta: Meta<typeof DataTable> = {
  title: 'Design System/Components/DataTable',
  component: DataTable,
  argTypes: { ...DataTableArgTypes },
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: 'date',
    summaryRows: SUMMARY_ROWS,
    caption: '일자별 주문수 · 매출액 · 방문자 · 가입 · 문의와 기간 합계',
    dimZero: true,
    empty: '표시할 항목이 없어요.',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof DataTable>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새. 본문 행 + 합계(tfoot) 행, rowKey 컬럼은 th[scope=row] 로 그려진다 */
export const Default: Story = {
  name: 'Overview',
  args: { dimZero: true },
};

/** Playground — dimZero·caption·rowKey·empty 를 Controls 로 바꿔 본다 (데이터 prop 은 control 비활성) */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 빈 상태 — rows 가 빈 배열이면 표 대신 empty 문구를 렌더한다 */
export const Empty: Story = {
  name: 'States/Empty',
  args: { rows: [], summaryRows: [] },
};

/** 로딩 — 데이터가 아직 없을 때(부모가 aria-busy 를 소유한다: StatsCard/Card) */
export const Loading: Story = {
  name: 'States/Loading',
  args: { rows: [], summaryRows: [], empty: '데이터를 불러오는 중이에요…' },
};

/* ── Features ───────────────────────────────────────────────────────────── */

/** dimZero=true — 0 이하 수치를 흐리게 (7/10 행의 주문수·매출액·가입). 눈이 0을 건너뛴다 */
export const DimZeroOn: Story = {
  name: 'Features/Dim Zero On',
  args: { dimZero: true },
};

/** dimZero=false — 0 도 본문 텍스트색 그대로 (흐림 없음) */
export const DimZeroOff: Story = {
  name: 'Features/Dim Zero Off',
  args: { dimZero: false },
};

/** 합계(요약) 행 — summaryRows 를 주면 tfoot 에 강조 배경 + 단위로 렌더한다. 빈 배열이면 tfoot 을 그리지 않는다 */
export const WithoutSummary: Story = {
  name: 'Features/Summary Row',
  args: { summaryRows: [] },
};

/**
 * unitInBody — 이 컬럼만 **본문 행에도** 단위를 붙인다 (계약 columns.unitInBody · 기본 false).
 * 실사용: 대시보드 기간별 분석의 매출액 컬럼만 본문에 '원' 을 붙인다.
 */
export const UnitInBody: Story = {
  name: 'Features/Unit In Body',
  args: {
    columns: [
      { key: 'date', label: '일자', align: 'left' as const },
      { key: 'orders', label: '주문수', align: 'right' as const, unit: '건' },
      { key: 'revenue', label: '매출액', align: 'right' as const, unit: '원', unitInBody: true },
    ],
  },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 적은 행 — 컬럼 2개 · 행 1개. 합계 행 없이 최소 콘텐츠만 */
export const MinimalData: Story = {
  name: 'Content/Few Rows',
  args: {
    columns: [
      { key: 'name', label: '항목', align: 'left' as const },
      { key: 'count', label: '건수', align: 'right' as const, unit: '건' },
    ],
    rows: [{ name: '신규 주문', count: 3 }],
    summaryRows: [],
    rowKey: 'name',
    caption: '항목별 건수',
  },
};

/** 많은 행 — 14행 + 긴 라벨/큰 수치. 세로로 길고 가로로 넘쳐 fluid 스크롤 컨테이너를 보인다 */
export const LongContent: Story = {
  name: 'Content/Many Rows',
  args: {
    columns: LONG_COLUMNS,
    rows: MANY_ROWS,
    summaryRows: MANY_SUMMARY,
    caption: '2주치 일자별 지표와 기간 합계',
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** ARIA — role=table + 숨긴 caption 이 접근성 이름이 되고, 헤더는 scope=col, rowKey 셀은 scope=row */
export const Accessibility: Story = {
  name: 'Accessibility/ARIA',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // caption 은 시각적으로 숨기되 표의 접근성 이름이 된다
    const table = canvas.getByRole('table');
    await expect(table).toHaveAccessibleName(
      '일자별 주문수 · 매출액 · 방문자 · 가입 · 문의와 기간 합계',
    );

    // 헤더 셀은 th[scope=col]
    await expect(canvas.getByRole('columnheader', { name: '일자' })).toBeInTheDocument();

    // rowKey 컬럼의 본문 셀은 th[scope=row]
    await expect(canvas.getByRole('rowheader', { name: '2026-07-08' })).toHaveAttribute(
      'scope',
      'row',
    );
  },
};

/** RTL — 논리 정렬(start/end)이라 컬럼 정렬이 문서 방향을 따른다 (문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  decorators: [rtlFrame],
};
