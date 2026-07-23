/**
 * Design System/Templates/Statistics/Revenue Stats — 실제 어드민 /stats/revenue 화면을 그대로 비추는 조립 스토리.
 * (조립 전용 · 담당: 스토리북 페이지 · 게이트 G5)
 *
 * `../../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 원본 화면: apps/admin/src/pages/stats/revenue/RevenueStatsPage.tsx (+ _shared/StatsPageShell·StatsKpiRow·StatsTrendCard·StatsTable)
 *   구성(원본 순서 그대로): 설명 → 조회 조건 바 → 부가세 고지(Alert) → KPI 5장 → 매출 추이(차트) → 일자별/결제수단별 상세 표
 *
 * 사용 DS 컴포넌트: SegmentedControl · SelectField · Button · Icon · Alert · StatsCard · LineAreaChart · Table · Pagination · Empty
 * 재현 상태: Default(정상) · Loading(재조회 스켈레톤) · Empty(집계 0건)
 *
 * [레이어 경계] 원본은 StatsPageShell/StatsKpiRow/StatsTrendCard/StatsTable(=apps/admin 로컬 조립)을 쓴다.
 *   그 조립들은 여기서 import 할 수 없어(레이어 역방향 금지), 같은 시각을 공개 DS 컴포넌트로 다시 조립한다:
 *   - StatsTrendChart(Recharts)는 진입 청크 때문에 통계 로컬이다 → 여기서는 DS LineAreaChart 로 대응한다.
 *   - StatsTable(정렬·페이지 자작 표)은 DS Table(정렬 헤더) + Pagination 으로 대응한다.
 *   - DeltaText(증감 3중 인코딩)는 스토리 로컬 표시 헬퍼로 옮긴다(색 토큰 + ▲/▼ + sr 문장).
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Empty,
  Icon,
  LineAreaChart,
  Pagination,
  SegmentedControl,
  SelectField,
  StatsCard,
  Table,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Statistics/Revenue Stats',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/** 화면 전체가 재현하는 상태 (원본 useStatsQuery 의 최초 로드/성공/빈 응답) */
type ScreenState = 'default' | 'loading' | 'empty';

/* ── 표시 포맷 (원본 _shared/format.ts 의 표시용 축소본 — 순수 함수라 값으로 옮긴다) ─────── */

type MetricUnit = 'won' | 'count' | 'percent';
const numberFormat = new Intl.NumberFormat('ko-KR');
const formatWon = (value: number): string => numberFormat.format(Math.round(value));
const formatPercentValue = (value: number): string => value.toFixed(1);

function formatMetric(value: number, unit: MetricUnit): string {
  if (unit === 'won') return `${formatWon(value)}원`;
  if (unit === 'percent') return `${formatPercentValue(value)}%`;
  return `${numberFormat.format(value)}건`;
}

type DeltaTone = 'positive' | 'negative' | 'neutral';
interface Delta {
  readonly text: string;
  readonly description: string;
  readonly tone: DeltaTone;
}

/** 현재 vs 비교 기간 — isLowerBetter 는 증가가 나쁨인 지표(환불)의 색을 뒤집는다 (원본 deltaOf) */
function deltaOf(
  current: number,
  previous: number,
  unit: MetricUnit,
  isLowerBetter = false,
): Delta {
  const diff = current - previous;
  const percent = previous === 0 ? null : (diff / Math.abs(previous)) * 100;
  const isGood = isLowerBetter ? diff < 0 : diff > 0;
  const tone: DeltaTone = diff === 0 ? 'neutral' : isGood ? 'positive' : 'negative';
  if (diff === 0) return { text: '변동 없음', description: '비교 기간과 변동 없음', tone };
  const arrow = diff > 0 ? '▲' : '▼';
  const word = diff > 0 ? '증가' : '감소';
  const pctText = percent === null ? '—' : `${Math.abs(percent).toFixed(1)}%`;
  return {
    text: `${arrow} ${pctText}`,
    description: `비교 기간 대비 ${pctText} (${formatMetric(Math.abs(diff), unit)}) ${word}`,
    tone,
  };
}

/* ── 도메인 데이터 (원본 revenue/types.ts + data-source 의 대표 표본) ───────────────────── */

interface RevenueRow {
  readonly id: string;
  readonly label: string;
  readonly paymentTotal: number;
  readonly refundTotal: number;
  readonly netRevenue: number;
  readonly orderCount: number;
  readonly taxable: number;
  readonly taxFree: number;
  readonly zeroRated: number;
}

/** 일자별 — 추이 차트와 기본 표의 원천 (결제수단 '전체') */
const DAILY: readonly RevenueRow[] = [
  {
    id: '2026-07-14',
    label: '2026.07.14',
    paymentTotal: 1240000,
    refundTotal: 80000,
    netRevenue: 1160000,
    orderCount: 18,
    taxable: 1000000,
    taxFree: 120000,
    zeroRated: 40000,
  },
  {
    id: '2026-07-13',
    label: '2026.07.13',
    paymentTotal: 980000,
    refundTotal: 0,
    netRevenue: 980000,
    orderCount: 14,
    taxable: 900000,
    taxFree: 60000,
    zeroRated: 20000,
  },
  {
    id: '2026-07-12',
    label: '2026.07.12',
    paymentTotal: 1520000,
    refundTotal: 150000,
    netRevenue: 1370000,
    orderCount: 22,
    taxable: 1200000,
    taxFree: 150000,
    zeroRated: 20000,
  },
  {
    id: '2026-07-11',
    label: '2026.07.11',
    paymentTotal: 760000,
    refundTotal: 0,
    netRevenue: 760000,
    orderCount: 11,
    taxable: 700000,
    taxFree: 60000,
    zeroRated: 0,
  },
  {
    id: '2026-07-10',
    label: '2026.07.10',
    paymentTotal: 2100000,
    refundTotal: 220000,
    netRevenue: 1880000,
    orderCount: 27,
    taxable: 1700000,
    taxFree: 150000,
    zeroRated: 30000,
  },
  {
    id: '2026-07-09',
    label: '2026.07.09',
    paymentTotal: 1340000,
    refundTotal: 60000,
    netRevenue: 1280000,
    orderCount: 19,
    taxable: 1150000,
    taxFree: 100000,
    zeroRated: 30000,
  },
  {
    id: '2026-07-08',
    label: '2026.07.08',
    paymentTotal: 890000,
    refundTotal: 0,
    netRevenue: 890000,
    orderCount: 13,
    taxable: 820000,
    taxFree: 70000,
    zeroRated: 0,
  },
];

/** 결제수단별 — 기간 합계 한 줄씩 (드릴다운 '결제수단별') */
const BY_METHOD: readonly RevenueRow[] = [
  {
    id: 'card',
    label: '신용카드',
    paymentTotal: 5200000,
    refundTotal: 300000,
    netRevenue: 4900000,
    orderCount: 68,
    taxable: 4200000,
    taxFree: 500000,
    zeroRated: 200000,
  },
  {
    id: 'easy',
    label: '간편결제',
    paymentTotal: 2100000,
    refundTotal: 120000,
    netRevenue: 1980000,
    orderCount: 34,
    taxable: 1700000,
    taxFree: 200000,
    zeroRated: 80000,
  },
  {
    id: 'transfer',
    label: '계좌이체',
    paymentTotal: 980000,
    refundTotal: 60000,
    netRevenue: 920000,
    orderCount: 14,
    taxable: 800000,
    taxFree: 90000,
    zeroRated: 30000,
  },
  {
    id: 'vbank',
    label: '가상계좌',
    paymentTotal: 550000,
    refundTotal: 30000,
    netRevenue: 520000,
    orderCount: 8,
    taxable: 460000,
    taxFree: 50000,
    zeroRated: 10000,
  },
];

/** 비교 기간(직전 기간) — 현재보다 대략 10% 낮은 표본. 증감 색이 살아나는 최소 데이터다 */
const compareOf = (row: RevenueRow): RevenueRow => ({
  ...row,
  paymentTotal: Math.round(row.paymentTotal * 0.9),
  refundTotal: Math.round(row.refundTotal * 0.9),
  netRevenue: Math.round(row.netRevenue * 0.9),
  orderCount: Math.round(row.orderCount * 0.9),
});

const PERIOD_PRESETS = [
  { id: '7d', label: '최근 7일' },
  { id: '30d', label: '최근 30일' },
  { id: 'thisMonth', label: '이번 달' },
  { id: 'custom', label: '직접 입력' },
] as const;

const COMPARE_MODES = [
  { id: 'previous', label: '직전 기간' },
  { id: 'lastYear', label: '전년 동기' },
  { id: 'none', label: '비교 안 함' },
] as const;

const PAY_METHODS = [
  { id: 'all', label: '전체' },
  { id: 'card', label: '신용카드' },
  { id: 'transfer', label: '계좌이체' },
  { id: 'vbank', label: '가상계좌' },
  { id: 'easy', label: '간편결제' },
] as const;

const REVENUE_BREAKDOWNS = [
  { id: 'daily', label: '일자별' },
  { id: 'method', label: '결제수단별' },
] as const;

/** 추이가 그릴 수 있는 지표 (원본 TREND_METRICS) */
const TREND_METRICS = [
  { id: 'net', label: '순매출', unit: 'won' as const, pick: (r: RevenueRow) => r.netRevenue },
  {
    id: 'payment',
    label: '결제합계',
    unit: 'won' as const,
    pick: (r: RevenueRow) => r.paymentTotal,
  },
  { id: 'refund', label: '환불합계', unit: 'won' as const, pick: (r: RevenueRow) => r.refundTotal },
  {
    id: 'orders',
    label: '결제건수',
    unit: 'count' as const,
    pick: (r: RevenueRow) => r.orderCount,
  },
] as const;

/* ── KPI · 컬럼 정의 ─────────────────────────────────────────────────────────────────── */

const sumBy = (rows: readonly RevenueRow[], pick: (r: RevenueRow) => number): number =>
  rows.reduce((sum, row) => sum + pick(row), 0);

interface Kpi {
  readonly id: string;
  readonly label: string;
  readonly unit: MetricUnit;
  readonly value: number;
  readonly compareValue: number | null;
  readonly isLowerBetter?: boolean;
  readonly hint: string;
}

/** 정렬·표시를 한 곳에서 정의하는 컬럼 (원본 StatsColumn 축소 — sortValue 있으면 정렬 가능) */
interface Column {
  readonly id: string;
  readonly header: string;
  readonly align: 'start' | 'end';
  readonly sortable: boolean;
  readonly sortValue: (row: RevenueRow) => number | string;
  readonly cell: (row: RevenueRow) => ReactNode;
}

const wonCell = (pick: (r: RevenueRow) => number, header: string, id: string): Column => ({
  id,
  header,
  align: 'end',
  sortable: true,
  sortValue: pick,
  cell: (row) => formatWon(pick(row)),
});

const MONEY_COLUMNS: readonly Column[] = [
  wonCell((r) => r.paymentTotal, '결제합계 (원)', 'paymentTotal'),
  wonCell((r) => r.refundTotal, '환불합계 (원)', 'refundTotal'),
  wonCell((r) => r.netRevenue, '순매출 (원)', 'netRevenue'),
  {
    id: 'orderCount',
    header: '결제건수',
    align: 'end',
    sortable: true,
    sortValue: (r) => r.orderCount,
    cell: (r) => numberFormat.format(r.orderCount),
  },
  wonCell((r) => (r.orderCount === 0 ? 0 : r.netRevenue / r.orderCount), '객단가 (원)', 'aov'),
];

const TAX_COLUMNS: readonly Column[] = [
  wonCell((r) => r.taxable, '과세 (원)', 'taxable'),
  wonCell((r) => r.taxFree, '면세 (원)', 'taxFree'),
  wonCell((r) => r.zeroRated, '영세 (원)', 'zeroRated'),
];

const LABEL_COLUMN = (header: string): Column => ({
  id: 'label',
  header,
  align: 'start',
  sortable: true,
  sortValue: (r) => r.id,
  cell: (r) => r.label,
});

const DAILY_COLUMNS: readonly Column[] = [LABEL_COLUMN('일자'), ...MONEY_COLUMNS, ...TAX_COLUMNS];
const METHOD_COLUMNS: readonly Column[] = [LABEL_COLUMN('결제수단'), ...MONEY_COLUMNS];

/* ── 스타일 (원본 각 _shared 컴포넌트의 토큰 스타일을 옮긴다) ─────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.body.md'),
};

const barStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  padding: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const barRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  gap: cssVar('space.3'),
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  inlineSize: `calc(${cssVar('space.6')} * 7)`,
};

const labelStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const spacerStyle: CSSProperties = { marginInlineStart: 'auto' };

const kpiGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 8), 1fr))`,
  gap: cssVar('space.4'),
};

const kpiBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const deltaStyle: CSSProperties = {
  margin: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  fontVariantNumeric: 'tabular-nums',
  ...typography('typography.label.md'),
};

const hintStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  padding: cssVar('space.5'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const scrollStyle: CSSProperties = { inlineSize: '100%', minInlineSize: 0, overflowX: 'auto' };

const tableFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBlockStart: cssVar('space.4'),
};

const srOnlyStyle: CSSProperties = {
  position: 'absolute',
  inlineSize: cssVar('border-width.thin'),
  blockSize: cssVar('border-width.thin'),
  padding: 0,
  margin: `calc(${cssVar('border-width.thin')} * -1)`,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
};

const DELTA_COLOR: Readonly<Record<DeltaTone, string>> = {
  positive: cssVar('color.feedback.success.text'),
  negative: cssVar('color.feedback.danger.text'),
  neutral: cssVar('color.text.muted'),
};

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** 증감 한 조각 — 색 + ▲/▼ + sr 문장의 3중 인코딩 (원본 DeltaText) */
function DeltaLine({ delta }: { readonly delta: Delta }) {
  return (
    <p style={{ ...deltaStyle, color: DELTA_COLOR[delta.tone] }}>
      <span aria-hidden="true">{delta.text}</span>
      <span style={srOnlyStyle}>{delta.description}</span>
    </p>
  );
}

/** 정렬 결과를 실제로 계산한다 — 원본 StatsTable 의 sortRows 를 축소해 옮긴다 */
function sortRows(
  rows: readonly RevenueRow[],
  columns: readonly Column[],
  sort: { key: string; direction: 'asc' | 'desc' },
): readonly RevenueRow[] {
  const column = columns.find((item) => item.id === sort.key);
  if (column === undefined) return rows;
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = column.sortValue(a);
    const bv = column.sortValue(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv), 'ko') * factor;
  });
}

/**
 * 매출 통계 화면 조립 — 드릴다운 축·추이 지표·정렬·페이지는 controlled(useState)로
 * 이 Capitalized 컴포넌트 안에서 다룬다 (rules-of-hooks).
 */
function RevenueStatsScreen({ state }: { state: ScreenState }) {
  const [preset, setPreset] = useState<string>('7d');
  const [compare, setCompare] = useState<string>('previous');
  const [method, setMethod] = useState<string>('all');
  const [view, setView] = useState<string>('daily');
  const [metric, setMetric] = useState<string>('net');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'label',
    direction: 'desc',
  });
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const loading = state === 'loading';
  const isEmpty = state === 'empty';

  // 빈 상태의 `[]` 는 렌더마다 새 배열이라, 그대로 쓰면 아래 useMemo 의 deps 가 매 렌더 바뀌어
  // 메모가 무효가 된다(=KPI 를 매번 다시 계산한다). 참조를 고정해 메모를 실제로 메모이게 한다.
  const daily = useMemo<readonly RevenueRow[]>(() => (isEmpty ? [] : DAILY), [isEmpty]);
  const isMethodView = view === 'method';
  const baseRows = isEmpty ? [] : isMethodView ? BY_METHOD : DAILY;
  const columns = isMethodView ? METHOD_COLUMNS : DAILY_COLUMNS;

  const kpis = useMemo<readonly Kpi[]>(() => {
    const net = sumBy(daily, (r) => r.netRevenue);
    const payment = sumBy(daily, (r) => r.paymentTotal);
    const refund = sumBy(daily, (r) => r.refundTotal);
    const orders = sumBy(daily, (r) => r.orderCount);
    const compareOn = compare !== 'none' && !isEmpty;
    const cmp = (value: number): number | null => (compareOn ? Math.round(value * 0.9) : null);
    return [
      {
        id: 'payment',
        label: '결제합계',
        unit: 'won',
        value: payment,
        compareValue: cmp(payment),
        hint: '기간 안에 결제가 완료된 금액의 합이에요.',
      },
      {
        id: 'refund',
        label: '환불합계',
        unit: 'won',
        value: refund,
        compareValue: cmp(refund),
        isLowerBetter: true,
        hint: '기간 안에 환불 처리된 금액의 합이에요.',
      },
      {
        id: 'net',
        label: '순매출',
        unit: 'won',
        value: net,
        compareValue: cmp(net),
        hint: '결제합계에서 환불합계를 뺀 금액이에요.',
      },
      {
        id: 'orders',
        label: '결제건수',
        unit: 'count',
        value: orders,
        compareValue: cmp(orders),
        hint: '결제가 완료된 주문 건수예요.',
      },
      {
        id: 'aov',
        label: '객단가',
        unit: 'won',
        value: orders === 0 ? 0 : net / orders,
        compareValue: compareOn ? Math.round((orders === 0 ? 0 : net / orders) * 0.9) : null,
        hint: '순매출을 결제건수로 나눈 값이에요.',
      },
    ];
  }, [daily, compare, isEmpty]);

  const activeMetric = TREND_METRICS.find((item) => item.id === metric) ?? TREND_METRICS[0];
  const chartLabels = daily.map((row) => row.label);
  const currentSeries = daily.map((row) => activeMetric.pick(row));
  const compareSeries =
    compare === 'none' || isEmpty ? null : daily.map((row) => activeMetric.pick(compareOf(row)));

  const sorted = sortRows(baseRows, columns, sort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    );
    setPage(1);
  };

  const viewLabel = REVENUE_BREAKDOWNS.find((item) => item.id === view)?.label ?? '일자별';

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        결제수단별로 결제·환불·순매출을 갈라 보고, 비교 기간과 견주는 매출 분석이에요. 순매출은
        결제합계에서 환불합계를 뺀 금액이라, 결제합계만 세는 화면과는 다른 숫자를 내요.
      </p>

      {/* 조회 조건 바 — 원본 StatsFilterBar (프리셋 · 비교 기준 · 결제수단 · 내보내기) */}
      <section style={barStyle} aria-label="조회 조건">
        <div style={{ display: 'flex', flexDirection: 'column', gap: cssVar('space.2') }}>
          <span style={labelStyle}>조회 기간</span>
          <SegmentedControl
            value={preset}
            options={PERIOD_PRESETS.map((item) => ({ id: item.id, label: item.label }))}
            size="sm"
            ariaLabel="조회 기간"
            disabled={loading}
            onChange={setPreset}
          />
        </div>

        <div style={barRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="revenue-compare">
              비교 기준
            </label>
            <SelectField
              id="revenue-compare"
              value={compare}
              disabled={loading}
              onChange={(event) => {
                setCompare(event.target.value);
              }}
            >
              {COMPARE_MODES.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="revenue-method">
              결제수단
            </label>
            <SelectField
              id="revenue-method"
              value={method}
              disabled={loading}
              onChange={(event) => {
                setMethod(event.target.value);
              }}
            >
              {PAY_METHODS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div style={spacerStyle} />

          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Icon name="download" />}
            disabled={loading || visible.length === 0}
          >
            {`엑셀 내보내기 (${String(sorted.length)}건)`}
          </Button>
        </div>
      </section>

      {/* 부가세 고지 — 화면에 상주하는 안내다(토스트가 아니다). 원본 VAT_NOTICE */}
      <Alert tone="info">
        순매출은 결제합계에서 환불합계를 뺀 금액이며, 부가세가 포함된 금액이에요. 이 통계는 쇼핑몰
        운영 참고용이며, 국세청 신고 등 제출용 자료로는 사용하실 수 없어요.
      </Alert>

      {/* KPI 5장 — 값 + 비교 기간 증감 + 정의 힌트 (원본 StatsKpiRow) */}
      <div style={kpiGridStyle}>
        {kpis.map((kpi) => (
          <StatsCard
            key={kpi.id}
            title={kpi.label}
            value={loading ? '' : formatMetric(kpi.value, kpi.unit)}
            loading={loading}
          >
            <div style={kpiBodyStyle}>
              {kpi.compareValue === null ? (
                <p style={{ ...deltaStyle, color: cssVar('color.text.muted') }}>비교 안 함</p>
              ) : (
                <DeltaLine
                  delta={deltaOf(kpi.value, kpi.compareValue, kpi.unit, kpi.isLowerBetter)}
                />
              )}
              <p style={hintStyle}>{kpi.hint}</p>
            </div>
          </StatsCard>
        ))}
      </div>

      {/* 매출 추이 — 현재(면적) + 비교(선)를 같은 x축에 겹친다 (원본 StatsTrendCard) */}
      <StatsCard
        title="매출 추이"
        loading={loading}
        action={
          <SegmentedControl
            value={activeMetric.id}
            options={TREND_METRICS.map((item) => ({ id: item.id, label: item.label }))}
            size="sm"
            ariaLabel="추이 지표"
            disabled={loading}
            onChange={setMetric}
          />
        }
      >
        {currentSeries.length === 0 ? (
          <p style={{ ...hintStyle, textAlign: 'center', paddingBlock: cssVar('space.6') }}>
            선택한 기간에 집계된 값이 없어요.
          </p>
        ) : (
          <LineAreaChart
            labels={chartLabels}
            series={[
              { id: 'current', label: '현재 기간', kind: 'area' as const, values: currentSeries },
              ...(compareSeries === null
                ? []
                : [
                    {
                      id: 'compare',
                      label: '비교 기간',
                      kind: 'line' as const,
                      values: compareSeries,
                    },
                  ]),
            ]}
            ariaLabel={`${activeMetric.label} 추이`}
          />
        )}
      </StatsCard>

      {/* 상세 표 — 드릴다운 축(일자별/결제수단별) 토글 + 정렬 헤더 + 페이지 (원본 Card + StatsTable) */}
      <section style={cardStyle} aria-label={`${viewLabel} 상세`}>
        <div style={cardHeaderStyle}>
          <h2 style={cardTitleStyle}>{viewLabel} 상세</h2>
          <SegmentedControl
            value={view}
            options={REVENUE_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
            size="sm"
            ariaLabel="드릴다운 축"
            disabled={loading}
            onChange={(next) => {
              setView(next);
              setPage(1);
              setSort({ key: 'label', direction: 'desc' });
            }}
          />
        </div>

        <div style={scrollStyle}>
          <Table
            caption={`${viewLabel} 매출 상세`}
            columns={columns.map((column) => ({
              id: column.id,
              header: column.header,
              align: column.align,
              sortable: column.sortable,
            }))}
            rows={visible.map((row) => ({
              id: row.id,
              cells: columns.map((column) => column.cell(row)),
            }))}
            sortKey={sort.key}
            sortDirection={sort.direction}
            loading={loading}
            skeletonRows={pageSize}
            onSortToggle={toggleSort}
            empty={<Empty label="매출 기록" createVerb="집계" />}
          />
        </div>

        {loading || sorted.length === 0 ? null : (
          <div style={tableFooterStyle}>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={sorted.length}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              label={`${viewLabel} 매출 상세 페이지`}
              onChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

/** 정상 — 조회 조건 · KPI · 추이 · 상세 표 (원본 성공 응답) */
export const Default: Story = {
  render: () => <RevenueStatsScreen state="default" />,
};

/** 로딩 — 최초 조회. KPI/추이/표 모두 스켈레톤, 조회 조건은 떠 있는 채 비활성 */
export const Loading: Story = {
  render: () => <RevenueStatsScreen state="loading" />,
};

/** 빈 상태 — 조회는 성공했으나 집계된 매출이 0건 (원본 STATE-01) */
export const Empty_: Story = {
  render: () => <RevenueStatsScreen state="empty" />,
};
