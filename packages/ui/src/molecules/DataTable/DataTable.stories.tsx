// DataTable — Storybook 스토리 (CSF3 · Molecules/DataTable)
//
// argTypes 는 계약 생성물(generated/argtypes/DataTable.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 2: default/loading) + boolean(dimZero) true/false + 데이터 최소/최대 + Dark/RTL.
// columns/rows/summaryRows 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import type { Decorator, Meta, StoryObj } from '@storybook/react';

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

const meta: Meta<typeof DataTable> = {
  title: 'Tables/DataTable',
  component: DataTable,
  argTypes: { ...DataTableArgTypes },
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: 'date',
    summaryRows: SUMMARY_ROWS,
    caption: '일자별 주문수 · 매출액 · 방문자 · 가입 · 문의와 기간 합계',
    dimZero: true,
    empty: '표시할 항목이 없습니다.',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof DataTable>;

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

/** default — 본문 + 합계(tfoot) 행. rowKey 컬럼은 th[scope=row] */
export const Default: Story = {
  args: { dimZero: true },
};

/** loading — 데이터가 아직 없을 때(부모가 aria-busy 를 소유한다: StatsCard/Card) */
export const Loading: Story = {
  args: { rows: [], summaryRows: [], empty: '데이터를 불러오는 중입니다…' },
};

/** dimZero=true — 0 이하 수치를 흐리게 (7/10 행의 주문수·매출액·가입) */
export const DimZeroOn: Story = {
  args: { dimZero: true },
};

/** dimZero=false — 0 도 본문 텍스트색 그대로 */
export const DimZeroOff: Story = {
  args: { dimZero: false },
};

/** 합계 행 없음 — tfoot 을 렌더하지 않는다 */
export const WithoutSummary: Story = {
  args: { summaryRows: [] },
};

/**
 * unitInBody — 이 컬럼만 **본문 행에도** 단위를 붙인다 (계약 columns.unitInBody · 기본 false).
 * 실사용: 대시보드 기간별 분석의 매출액 컬럼만 본문에 '원' 을 붙인다.
 */
export const UnitInBody: Story = {
  args: {
    columns: [
      { key: 'date', label: '일자', align: 'left' as const },
      { key: 'orders', label: '주문수', align: 'right' as const, unit: '건' },
      { key: 'revenue', label: '매출액', align: 'right' as const, unit: '원', unitInBody: true },
    ],
  },
};

/** 최소 콘텐츠 — 컬럼 2개 · 행 1개 */
export const MinimalData: Story = {
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

/** 빈 상태 — rows 가 빈 배열이면 empty 문구를 렌더한다 */
export const Empty: Story = {
  args: { rows: [], summaryRows: [] },
};

/** 최대 콘텐츠 — 긴 라벨 + 큰 수치 (가로 스크롤 컨테이너로 넘친다) */
export const LongContent: Story = {
  args: {
    columns: [
      { key: 'date', label: '집계 기준 일자(KST)', align: 'left' as const },
      { key: 'orders', label: '주문수(취소·반품 제외)', align: 'right' as const, unit: '건' },
      { key: 'revenue', label: '매출액(부가세 포함)', align: 'right' as const, unit: '원' },
      { key: 'visitors', label: '순 방문자(UV)', align: 'right' as const, unit: '명' },
      { key: 'signups', label: '신규 가입(이메일 인증 완료)', align: 'right' as const, unit: '명' },
      { key: 'inquiries', label: '고객 문의(미답변 포함)', align: 'right' as const, unit: '건' },
    ],
    rows: [
      {
        date: '2026-07-11',
        orders: 128394,
        revenue: 9812345670,
        visitors: 1204993,
        signups: 14023,
        inquiries: 6021,
      },
      { date: '2026-07-12', orders: 0, revenue: 0, visitors: 0, signups: 0, inquiries: 0 },
    ],
    summaryRows: [
      {
        date: '기간 합계',
        orders: 128394,
        revenue: 9812345670,
        visitors: 1204993,
        signups: 14023,
        inquiries: 6021,
      },
    ],
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { dimZero: true },
  decorators: [darkFrame],
};

/** RTL — 논리 정렬(start/end)이라 컬럼 정렬이 문서 방향을 따른다 */
export const RightToLeft: Story = {
  decorators: [rtlFrame],
};
