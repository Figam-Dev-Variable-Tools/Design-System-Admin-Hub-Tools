/**
 * Design System/Templates/Statistics/Order Stats — 실제 어드민 /stats/orders 화면을 그대로 비추는 조립 스토리.
 * (조립 전용 · 담당: 스토리북 페이지 · 게이트 G5)
 *
 * `../../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 원본 화면: apps/admin/src/pages/stats/orders/OrderStatsPage.tsx (+ _shared/StatsPageShell·StatsKpiRow·StatsTrendCard·StatsTable·ShareBarList)
 *   구성(원본 순서 그대로): 설명 → 조회 조건 바 → KPI 5장 → 주문 추이(차트) → 상세: 일자별 표 ↔ 상태별 구성비 막대
 *
 * 사용 DS 컴포넌트: SegmentedControl · SelectField · Button · Icon · StatsCard · LineAreaChart · Table · Pagination · Empty
 * 재현 상태: Default(정상) · Loading(재조회 스켈레톤) · Empty(집계 0건)
 *
 * [레이어 경계] 원본 조립(StatsPageShell/StatsKpiRow/StatsTrendCard/StatsTable/ShareBarList)은 apps/admin 로컬이라
 *   여기서 import 할 수 없다(레이어 역방향 금지). 같은 시각을 공개 DS 로 다시 조립한다:
 *   - StatsTrendChart(Recharts) → DS LineAreaChart. StatsTable → DS Table + Pagination.
 *   - ShareBarList(구성비 막대) → 스토리 로컬 표시 헬퍼(토큰 track + fill). DeltaText → 스토리 로컬 헬퍼.
 *
 * [선행 조건] `pnpm codegen` 선행 필요. 하드코딩 색상(hex)/px 리터럴 0건 — 토큰(cssVar/typography)만 참조.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
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
  title: 'Design System/Templates/Statistics/Order Stats',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

type ScreenState = 'default' | 'loading' | 'empty';

/* ── 표시 포맷 (원본 _shared/format.ts 축소본) ─────────────────────────────────────────── */

type MetricUnit = 'count' | 'percent';
const numberFormat = new Intl.NumberFormat('ko-KR');
const formatPercentValue = (value: number): string => value.toFixed(1);
const formatMetric = (value: number, unit: MetricUnit): string =>
  unit === 'percent' ? `${formatPercentValue(value)}%` : `${numberFormat.format(value)}건`;

type DeltaTone = 'positive' | 'negative' | 'neutral';
interface Delta {
  readonly text: string;
  readonly description: string;
  readonly tone: DeltaTone;
}

/** 취소·반품·취소율·반품률은 증가가 나쁨이라 isLowerBetter 로 색을 뒤집는다 (원본 deltaOf) */
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

/* ── 도메인 데이터 (원본 orders/types.ts + data-source 의 대표 표본) ───────────────────── */

type OrderStatus =
  'pending' | 'preparing' | 'holding' | 'waiting' | 'shipping' | 'delivered' | 'confirmed';

interface OrderRow {
  readonly id: string;
  readonly label: string;
  readonly orders: number;
  readonly canceled: number;
  readonly returned: number;
  readonly exchanged: number;
  readonly statusCounts: Readonly<Record<OrderStatus, number>>;
}

/** 카페24의 주문 상태 — 입금 전부터 구매확정까지 흐르는 순서 그대로 */
const ORDER_STATUSES: readonly { id: OrderStatus; label: string }[] = [
  { id: 'pending', label: '입금전' },
  { id: 'preparing', label: '배송준비중' },
  { id: 'holding', label: '배송보류' },
  { id: 'waiting', label: '배송대기' },
  { id: 'shipping', label: '배송중' },
  { id: 'delivered', label: '배송완료' },
  { id: 'confirmed', label: '구매확정' },
];

const DAILY: readonly OrderRow[] = [
  {
    id: '2026-07-14',
    label: '2026.07.14',
    orders: 42,
    canceled: 3,
    returned: 1,
    exchanged: 1,
    statusCounts: {
      pending: 4,
      preparing: 8,
      holding: 2,
      waiting: 3,
      shipping: 6,
      delivered: 9,
      confirmed: 10,
    },
  },
  {
    id: '2026-07-13',
    label: '2026.07.13',
    orders: 38,
    canceled: 2,
    returned: 1,
    exchanged: 0,
    statusCounts: {
      pending: 3,
      preparing: 7,
      holding: 1,
      waiting: 2,
      shipping: 5,
      delivered: 10,
      confirmed: 10,
    },
  },
  {
    id: '2026-07-12',
    label: '2026.07.12',
    orders: 51,
    canceled: 4,
    returned: 2,
    exchanged: 1,
    statusCounts: {
      pending: 5,
      preparing: 9,
      holding: 3,
      waiting: 4,
      shipping: 7,
      delivered: 11,
      confirmed: 12,
    },
  },
  {
    id: '2026-07-11',
    label: '2026.07.11',
    orders: 33,
    canceled: 2,
    returned: 0,
    exchanged: 1,
    statusCounts: {
      pending: 2,
      preparing: 6,
      holding: 1,
      waiting: 2,
      shipping: 4,
      delivered: 9,
      confirmed: 9,
    },
  },
  {
    id: '2026-07-10',
    label: '2026.07.10',
    orders: 47,
    canceled: 3,
    returned: 2,
    exchanged: 0,
    statusCounts: {
      pending: 5,
      preparing: 8,
      holding: 2,
      waiting: 3,
      shipping: 6,
      delivered: 11,
      confirmed: 12,
    },
  },
  {
    id: '2026-07-09',
    label: '2026.07.09',
    orders: 40,
    canceled: 2,
    returned: 1,
    exchanged: 1,
    statusCounts: {
      pending: 4,
      preparing: 7,
      holding: 2,
      waiting: 3,
      shipping: 5,
      delivered: 9,
      confirmed: 10,
    },
  },
  {
    id: '2026-07-08',
    label: '2026.07.08',
    orders: 29,
    canceled: 1,
    returned: 0,
    exchanged: 0,
    statusCounts: {
      pending: 2,
      preparing: 5,
      holding: 1,
      waiting: 2,
      shipping: 4,
      delivered: 7,
      confirmed: 8,
    },
  },
];

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

const ORDER_SEGMENTS = [{ id: 'all', label: '전체' }, ...ORDER_STATUSES] as const;

const ORDER_BREAKDOWNS = [
  { id: 'daily', label: '일자별' },
  { id: 'status', label: '상태별' },
] as const;

const TREND_METRICS = [
  { id: 'orders', label: '주문', pick: (r: OrderRow) => r.orders },
  { id: 'canceled', label: '취소', pick: (r: OrderRow) => r.canceled },
  { id: 'returned', label: '반품', pick: (r: OrderRow) => r.returned },
] as const;

const sumBy = (rows: readonly OrderRow[], pick: (r: OrderRow) => number): number =>
  rows.reduce((sum, row) => sum + pick(row), 0);
const rateOf = (part: number, total: number): number => (total === 0 ? 0 : (part / total) * 100);

/* ── KPI · 컬럼 정의 ─────────────────────────────────────────────────────────────────── */

interface Kpi {
  readonly id: string;
  readonly label: string;
  readonly unit: MetricUnit;
  readonly value: number;
  readonly compareValue: number | null;
  readonly isLowerBetter?: boolean;
  readonly hint: string;
}

interface Column {
  readonly id: string;
  readonly header: string;
  readonly align: 'start' | 'end';
  readonly sortable: boolean;
  readonly sortValue: (row: OrderRow) => number | string;
  readonly cell: (row: OrderRow) => ReactNode;
}

const countColumn = (id: string, header: string, pick: (r: OrderRow) => number): Column => ({
  id,
  header,
  align: 'end',
  sortable: true,
  sortValue: pick,
  cell: (row) => numberFormat.format(pick(row)),
});

const COLUMNS: readonly Column[] = [
  {
    id: 'label',
    header: '일자',
    align: 'start',
    sortable: true,
    sortValue: (r) => r.id,
    cell: (r) => r.label,
  },
  countColumn('orders', '주문 건수', (r) => r.orders),
  countColumn('canceled', '취소', (r) => r.canceled),
  countColumn('returned', '반품', (r) => r.returned),
  countColumn('exchanged', '교환', (r) => r.exchanged),
  {
    id: 'cancelRate',
    header: '취소율 (%)',
    align: 'end',
    sortable: true,
    sortValue: (r) => rateOf(r.canceled, r.orders),
    cell: (r) => formatPercentValue(rateOf(r.canceled, r.orders)),
  },
  {
    id: 'returnRate',
    header: '반품률 (%)',
    align: 'end',
    sortable: true,
    sortValue: (r) => rateOf(r.returned, r.orders),
    cell: (r) => formatPercentValue(rateOf(r.returned, r.orders)),
  },
];

/* ── 스타일 (원본 _shared 토큰 스타일 이관) ─────────────────────────────────────────── */

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

/* ── 구성비 막대 스타일 (원본 ShareBarList 이관) ──────────────────────────────────────── */

const shareListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  margin: 0,
  paddingInlineStart: 0,
  listStyle: 'none',
};

const shareHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  ...typography('typography.label.md'),
};

const shareTrackStyle: CSSProperties = {
  blockSize: cssVar('space.2'),
  marginBlockStart: cssVar('space.1'),
  background: cssVar('color.surface.raised'),
  borderRadius: cssVar('radius.full'),
  overflow: 'hidden',
};

const shareFillStyle: CSSProperties = {
  blockSize: '100%',
  background: cssVar('color.chart.series-1'),
  borderRadius: cssVar('radius.full'),
};

const shareValueStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: cssVar('space.2'),
  fontVariantNumeric: 'tabular-nums',
};

const shareMutedStyle: CSSProperties = { color: cssVar('color.text.muted') };

const DELTA_COLOR: Readonly<Record<DeltaTone, string>> = {
  positive: cssVar('color.feedback.success.text'),
  negative: cssVar('color.feedback.danger.text'),
  neutral: cssVar('color.text.muted'),
};

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function DeltaLine({ delta }: { readonly delta: Delta }) {
  return (
    <p style={{ ...deltaStyle, color: DELTA_COLOR[delta.tone] }}>
      <span aria-hidden="true">{delta.text}</span>
      <span style={srOnlyStyle}>{delta.description}</span>
    </p>
  );
}

interface ShareItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
}

/** 구성비 막대 목록 — 순위가 본질인 상태 분포는 한 색의 길이 비교로 읽는다 (원본 ShareBarList) */
function ShareBarList({ items }: { readonly items: readonly ShareItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <ul style={shareListStyle}>
      {items.map((item) => {
        const share = total === 0 ? 0 : (item.value / total) * 100;
        return (
          <li key={item.id}>
            <div style={shareHeadStyle}>
              <span>{item.label}</span>
              <span style={shareValueStyle}>
                <span>{numberFormat.format(item.value)}건</span>
                <span style={shareMutedStyle}>{formatPercentValue(share)}%</span>
              </span>
            </div>
            <div style={shareTrackStyle}>
              <div
                aria-hidden="true"
                style={{ ...shareFillStyle, inlineSize: `${formatPercentValue(share)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function sortRows(
  rows: readonly OrderRow[],
  sort: { key: string; direction: 'asc' | 'desc' },
): readonly OrderRow[] {
  const column = COLUMNS.find((item) => item.id === sort.key);
  if (column === undefined) return rows;
  const factor = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = column.sortValue(a);
    const bv = column.sortValue(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv), 'ko') * factor;
  });
}

function OrderStatsScreen({ state }: { state: ScreenState }) {
  const [preset, setPreset] = useState<string>('7d');
  const [compare, setCompare] = useState<string>('previous');
  const [segment, setSegment] = useState<string>('all');
  const [view, setView] = useState<string>('daily');
  const [metric, setMetric] = useState<string>('orders');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'label',
    direction: 'desc',
  });
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const loading = state === 'loading';
  const isEmpty = state === 'empty';
  const isStatusView = view === 'status';

  // 빈 상태의 `[]` 는 렌더마다 새 배열이라, 그대로 쓰면 아래 useMemo 의 deps 가 매 렌더 바뀌어
  // 메모가 무효가 된다(=KPI 를 매번 다시 계산한다). 참조를 고정해 메모를 실제로 메모이게 한다.
  const daily = useMemo<readonly OrderRow[]>(() => (isEmpty ? [] : DAILY), [isEmpty]);

  const kpis = useMemo<readonly Kpi[]>(() => {
    const ordersOf = (row: OrderRow): number =>
      segment === 'all' ? row.orders : row.statusCounts[segment as OrderStatus];
    const orders = sumBy(daily, ordersOf);
    const canceled = sumBy(daily, (r) => r.canceled);
    const returned = sumBy(daily, (r) => r.returned);
    const totalOrders = sumBy(daily, (r) => r.orders);
    const compareOn = compare !== 'none' && !isEmpty;
    const cmp = (value: number): number | null => (compareOn ? Math.round(value * 0.9) : null);
    const segLabel =
      segment === 'all'
        ? '주문 건수'
        : `${ORDER_STATUSES.find((s) => s.id === segment)?.label ?? ''} 건수`;
    return [
      {
        id: 'orders',
        label: segLabel,
        unit: 'count',
        value: orders,
        compareValue: cmp(orders),
        hint: '선택한 기간에 접수된 주문 건수예요.',
      },
      {
        id: 'canceled',
        label: '취소 건수',
        unit: 'count',
        value: canceled,
        compareValue: cmp(canceled),
        isLowerBetter: true,
        hint: '배송중 이전에 멈춘 주문이에요.',
      },
      {
        id: 'returned',
        label: '반품 건수',
        unit: 'count',
        value: returned,
        compareValue: cmp(returned),
        isLowerBetter: true,
        hint: '배송중 이후에 되돌아온 주문이에요.',
      },
      {
        id: 'cancelRate',
        label: '취소율',
        unit: 'percent',
        value: rateOf(canceled, totalOrders),
        compareValue: compareOn ? rateOf(Math.round(canceled * 0.9), totalOrders) : null,
        isLowerBetter: true,
        hint: '취소 건수 ÷ 주문 건수.',
      },
      {
        id: 'returnRate',
        label: '반품률',
        unit: 'percent',
        value: rateOf(returned, totalOrders),
        compareValue: compareOn ? rateOf(Math.round(returned * 0.9), totalOrders) : null,
        isLowerBetter: true,
        hint: '반품 건수 ÷ 주문 건수.',
      },
    ];
  }, [daily, segment, compare, isEmpty]);

  const statusItems = useMemo<readonly ShareItem[]>(
    () =>
      ORDER_STATUSES.map((status) => ({
        id: status.id,
        label: status.label,
        value: sumBy(daily, (row) => row.statusCounts[status.id]),
      })),
    [daily],
  );

  const activeMetric = TREND_METRICS.find((item) => item.id === metric) ?? TREND_METRICS[0];
  const chartLabels = daily.map((row) => row.label);
  const currentSeries = daily.map((row) => activeMetric.pick(row));
  const compareSeries =
    compare === 'none' || isEmpty
      ? null
      : daily.map((row) => Math.round(activeMetric.pick(row) * 0.9));

  const sorted = sortRows(daily, sort);
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

  const viewLabel = ORDER_BREAKDOWNS.find((item) => item.id === view)?.label ?? '일자별';
  const statusTotal = statusItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        주문이 어느 상태에 고여 있는지, 얼마나 취소·반품으로 되돌아오는지 보는 화면이에요. 개별
        주문의 처리는 주문 관리에서 하고, 여기서는 지난 기간과 견주어 무엇이 달라졌는지를 봐요.
      </p>

      {/* 조회 조건 바 — 원본 StatsFilterBar (프리셋 · 비교 기준 · 주문 상태 · 내보내기) */}
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
            <label style={labelStyle} htmlFor="order-compare">
              비교 기준
            </label>
            <SelectField
              id="order-compare"
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
            <label style={labelStyle} htmlFor="order-segment">
              주문 상태
            </label>
            <SelectField
              id="order-segment"
              value={segment}
              disabled={loading}
              onChange={(event) => {
                setSegment(event.target.value);
              }}
            >
              {ORDER_SEGMENTS.map((item) => (
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
            disabled={loading || (isStatusView ? statusTotal === 0 : sorted.length === 0)}
          >
            {`엑셀 내보내기 (${String(isStatusView ? statusItems.length : sorted.length)}건)`}
          </Button>
        </div>
      </section>

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

      {/* 주문 추이 — 현재(면적) + 비교(선) (원본 StatsTrendCard) */}
      <StatsCard
        title="주문 추이"
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

      {/* 상세 — 일자별 표 ↔ 상태별 구성비 막대 (원본 Card + StatsTable/ShareBarList) */}
      <section style={cardStyle} aria-label={`${viewLabel} 상세`}>
        <div style={cardHeaderStyle}>
          <h2 style={cardTitleStyle}>{viewLabel} 상세</h2>
          <SegmentedControl
            value={view}
            options={ORDER_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
            size="sm"
            ariaLabel="드릴다운 축"
            disabled={loading}
            onChange={(next) => {
              setView(next);
              setPage(1);
            }}
          />
        </div>

        {isStatusView ? (
          isEmpty || statusTotal === 0 ? (
            <Empty label="주문" createVerb="집계" />
          ) : (
            <ShareBarList items={statusItems} />
          )
        ) : (
          <>
            <div style={scrollStyle}>
              <Table
                caption="일자별 주문 상세"
                columns={COLUMNS.map((column) => ({
                  id: column.id,
                  header: column.header,
                  align: column.align,
                  sortable: column.sortable,
                }))}
                rows={visible.map((row) => ({
                  id: row.id,
                  cells: COLUMNS.map((column) => column.cell(row)),
                }))}
                sortKey={sort.key}
                sortDirection={sort.direction}
                loading={loading}
                skeletonRows={pageSize}
                onSortToggle={toggleSort}
                empty={<Empty label="주문 기록" createVerb="집계" />}
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
                  label="일자별 주문 상세 페이지"
                  onChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/** 정상 — 조회 조건 · KPI · 추이 · 일자별 표(상태별 막대 토글) (원본 성공 응답) */
export const Default: Story = {
  render: () => <OrderStatsScreen state="default" />,
};

/** 로딩 — 최초 조회. KPI/추이/표 모두 스켈레톤, 조회 조건은 떠 있는 채 비활성 */
export const Loading: Story = {
  render: () => <OrderStatsScreen state="loading" />,
};

/** 빈 상태 — 조회는 성공했으나 집계된 주문이 0건 (원본 STATE-01) */
export const Empty_: Story = {
  render: () => <OrderStatsScreen state="empty" />,
};
