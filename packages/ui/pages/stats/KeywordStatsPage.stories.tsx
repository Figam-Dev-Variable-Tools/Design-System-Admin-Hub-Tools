/**
 * Design System/Templates/Statistics/Keyword Stats — 실제 어드민 /stats/keywords 화면을 그대로 비추는 조립 스토리.
 * (조립 전용 · 담당: 스토리북 페이지 · 게이트 G5)
 *
 * `../../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 원본 화면: apps/admin/src/pages/stats/keywords/KeywordStatsPage.tsx (+ _shared/StatsPageShell·StatsKpiRow·StatsTrendCard·StatsTable)
 *   구성(원본 순서 그대로): 설명 → 조회 조건 바(검색 입력 포함) → KPI 5장 → 전체 검색 추이(차트) → 검색어 순위 표
 *
 * [이 화면의 본체는 순위다] 다른 통계가 '얼마나 왔나'를 세는 데 반해 여기서는 순위가 본체다 —
 *   검색수 내림차순이 기본 정렬이고 모든 수치 열이 정렬 가능하다(ERP-04). 검색결과 0개인 검색어는
 *   '결과 없음' 배지로 지금 손댈 자리를 표시한다. 통계 화면 중 유일하게 검색 입력이 있다.
 *
 * 사용 DS 컴포넌트: SegmentedControl · SelectField · SearchField · Button · Icon · StatusBadge · StatsCard · LineAreaChart · Table · Pagination · Empty
 * 재현 상태: Default(정상) · Loading(재조회 스켈레톤) · Empty(집계 0건)
 *
 * [레이어 경계] 원본 조립(StatsPageShell/StatsKpiRow/StatsTrendCard/StatsTable)은 apps/admin 로컬이라
 *   여기서 import 할 수 없다(레이어 역방향 금지). 같은 시각을 공개 DS 로 다시 조립한다:
 *   StatsTrendChart(Recharts) → DS LineAreaChart. StatsTable(정렬 표) → DS Table + Pagination. DeltaText → 스토리 로컬 헬퍼.
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
  SearchField,
  SegmentedControl,
  SelectField,
  StatsCard,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Statistics/Keyword Stats',
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

/** 검색결과 없음 검색어는 증가가 나쁨이라 isLowerBetter 로 색을 뒤집는다 (원본 deltaOf) */
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

/* ── 도메인 데이터 (원본 keywords/types.ts + data-source 의 대표 표본) ───────────────────── */

interface KeywordRow {
  readonly id: string;
  readonly keyword: string;
  readonly searchCount: number;
  readonly resultCount: number;
  readonly clickCount: number;
  readonly purchaseCount: number;
  readonly visitCount: number;
  /** 참조검색어 없음 — 검색어를 모르니 '결과 수'가 성립하지 않는다('—'). '결과 없음'과 다르다 */
  readonly isUnknownReferrer: boolean;
}

/** 검색어별 합계 — 검색수 내림차순(원본 기본 정렬). '방음 패널'·'유선 이어폰'이 결과 0개 검색어다 */
const ROWS: readonly KeywordRow[] = [
  {
    id: 'k1',
    keyword: '헤드폰',
    searchCount: 1240,
    resultCount: 32,
    clickCount: 980,
    purchaseCount: 86,
    visitCount: 1100,
    isUnknownReferrer: false,
  },
  {
    id: 'k2',
    keyword: '스피커',
    searchCount: 980,
    resultCount: 41,
    clickCount: 720,
    purchaseCount: 54,
    visitCount: 890,
    isUnknownReferrer: false,
  },
  {
    id: 'k3',
    keyword: '오디오 인터페이스',
    searchCount: 760,
    resultCount: 18,
    clickCount: 540,
    purchaseCount: 38,
    visitCount: 690,
    isUnknownReferrer: false,
  },
  {
    id: 'k4',
    keyword: '콘덴서 마이크',
    searchCount: 620,
    resultCount: 12,
    clickCount: 410,
    purchaseCount: 27,
    visitCount: 560,
    isUnknownReferrer: false,
  },
  {
    id: 'k5',
    keyword: '방음 패널',
    searchCount: 540,
    resultCount: 0,
    clickCount: 120,
    purchaseCount: 0,
    visitCount: 300,
    isUnknownReferrer: false,
  },
  {
    id: 'k6',
    keyword: 'DJ 컨트롤러',
    searchCount: 430,
    resultCount: 9,
    clickCount: 300,
    purchaseCount: 19,
    visitCount: 380,
    isUnknownReferrer: false,
  },
  {
    id: 'k7',
    keyword: '모니터 스피커',
    searchCount: 380,
    resultCount: 22,
    clickCount: 260,
    purchaseCount: 21,
    visitCount: 340,
    isUnknownReferrer: false,
  },
  {
    id: 'k8',
    keyword: '오디오케이블',
    searchCount: 320,
    resultCount: 15,
    clickCount: 180,
    purchaseCount: 12,
    visitCount: 280,
    isUnknownReferrer: false,
  },
  {
    id: 'k9',
    keyword: '유선 이어폰',
    searchCount: 290,
    resultCount: 0,
    clickCount: 60,
    purchaseCount: 0,
    visitCount: 150,
    isUnknownReferrer: false,
  },
  {
    id: 'k10',
    keyword: '참조검색어 없음',
    searchCount: 210,
    resultCount: 0,
    clickCount: 40,
    purchaseCount: 3,
    visitCount: 190,
    isUnknownReferrer: true,
  },
  {
    id: 'k11',
    keyword: '믹서',
    searchCount: 180,
    resultCount: 7,
    clickCount: 110,
    purchaseCount: 8,
    visitCount: 160,
    isUnknownReferrer: false,
  },
  {
    id: 'k12',
    keyword: '앰프',
    searchCount: 150,
    resultCount: 14,
    clickCount: 95,
    purchaseCount: 9,
    visitCount: 140,
    isUnknownReferrer: false,
  },
];

interface KeywordDailyRow {
  readonly id: string;
  readonly label: string;
  readonly searchCount: number;
  readonly zeroResultSearchCount: number;
  readonly purchaseCount: number;
  readonly visitCount: number;
}

/** 전체 검색 추이의 원천 — 검색어별로 쪼개지 않은 기간 전체의 하루치 집계 */
const DAILY: readonly KeywordDailyRow[] = [
  {
    id: '2026-07-14',
    label: '2026.07.14',
    searchCount: 940,
    zeroResultSearchCount: 120,
    purchaseCount: 62,
    visitCount: 820,
  },
  {
    id: '2026-07-13',
    label: '2026.07.13',
    searchCount: 780,
    zeroResultSearchCount: 90,
    purchaseCount: 48,
    visitCount: 700,
  },
  {
    id: '2026-07-12',
    label: '2026.07.12',
    searchCount: 1120,
    zeroResultSearchCount: 160,
    purchaseCount: 74,
    visitCount: 980,
  },
  {
    id: '2026-07-11',
    label: '2026.07.11',
    searchCount: 640,
    zeroResultSearchCount: 70,
    purchaseCount: 33,
    visitCount: 560,
  },
  {
    id: '2026-07-10',
    label: '2026.07.10',
    searchCount: 1010,
    zeroResultSearchCount: 140,
    purchaseCount: 68,
    visitCount: 900,
  },
  {
    id: '2026-07-09',
    label: '2026.07.09',
    searchCount: 820,
    zeroResultSearchCount: 100,
    purchaseCount: 51,
    visitCount: 730,
  },
  {
    id: '2026-07-08',
    label: '2026.07.08',
    searchCount: 560,
    zeroResultSearchCount: 60,
    purchaseCount: 29,
    visitCount: 500,
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

const KEYWORD_SEGMENTS = [
  { id: 'all', label: '전체' },
  { id: 'hasResult', label: '결과 있음' },
  { id: 'zeroResult', label: '결과 없음' },
] as const;

const TREND_METRICS = [
  {
    id: 'search',
    label: '검색수',
    unit: 'count' as const,
    pick: (r: KeywordDailyRow) => r.searchCount,
  },
  {
    id: 'zeroResult',
    label: '검색결과 없음',
    unit: 'count' as const,
    pick: (r: KeywordDailyRow) => r.zeroResultSearchCount,
  },
  {
    id: 'conversion',
    label: '구매전환율',
    unit: 'percent' as const,
    pick: (r: KeywordDailyRow) => (r.visitCount === 0 ? 0 : (r.purchaseCount / r.visitCount) * 100),
  },
] as const;

/* ── 파생 계산 (원본 keywords/types.ts) ──────────────────────────────────────────────── */

const rateOf = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : (numerator / denominator) * 100;
const clickRateOf = (row: KeywordRow): number => rateOf(row.clickCount, row.searchCount);
const conversionRateOf = (row: KeywordRow): number => rateOf(row.purchaseCount, row.visitCount);
const isZeroResultKeyword = (row: KeywordRow): boolean =>
  !row.isUnknownReferrer && row.resultCount === 0;
const sumBy = (rows: readonly KeywordRow[], pick: (r: KeywordRow) => number): number =>
  rows.reduce((sum, row) => sum + pick(row), 0);

/** 세그먼트·검색어를 한 곳에서 건다 — 표·KPI 가 같은 집합을 본다 (원본 filterKeywordRows) */
function filterKeywordRows(
  rows: readonly KeywordRow[],
  segment: string,
  keyword: string,
): readonly KeywordRow[] {
  const needle = keyword.trim().toLowerCase();
  return rows.filter((row) => {
    if (needle !== '' && !row.keyword.toLowerCase().includes(needle)) return false;
    if (segment === 'zeroResult') return isZeroResultKeyword(row);
    if (segment === 'hasResult') return !row.isUnknownReferrer && row.resultCount > 0;
    return true;
  });
}

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

/** 참조검색어 없음 행의 '검색결과 수' — 0 으로 적으면 '결과가 0개'라는 거짓말이 된다 */
const NOT_APPLICABLE = '—';

interface Column {
  readonly id: string;
  readonly header: string;
  readonly align: 'start' | 'end';
  readonly sortable: boolean;
  readonly sortValue: (row: KeywordRow) => number | string;
  readonly cell: (row: KeywordRow) => ReactNode;
}

const keywordCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

/** 결과 없음 검색어는 색이 아니라 배지 문구로 '지금 손대야 하는' 행을 말한다 (원본 KeywordCell) */
function KeywordCell({ row }: { readonly row: KeywordRow }) {
  return (
    <span style={keywordCellStyle}>
      {row.keyword}
      {isZeroResultKeyword(row) ? <StatusBadge tone="warning" label="결과 없음" /> : null}
    </span>
  );
}

const numCell = (
  id: string,
  header: string,
  pick: (r: KeywordRow) => number,
  render?: (r: KeywordRow) => ReactNode,
): Column => ({
  id,
  header,
  align: 'end',
  sortable: true,
  sortValue: pick,
  cell: render ?? ((row) => numberFormat.format(pick(row))),
});

const COLUMNS: readonly Column[] = [
  {
    id: 'keyword',
    header: '검색어',
    align: 'start',
    sortable: true,
    sortValue: (r) => r.keyword,
    cell: (row) => <KeywordCell row={row} />,
  },
  numCell('searchCount', '검색수', (r) => r.searchCount),
  numCell(
    'resultCount',
    '검색결과 수',
    (r) => r.resultCount,
    (row) => (row.isUnknownReferrer ? NOT_APPLICABLE : numberFormat.format(row.resultCount)),
  ),
  numCell('clickCount', '클릭수', (r) => r.clickCount),
  numCell(
    'clickRate',
    '클릭률 (%)',
    (r) => clickRateOf(r),
    (row) => formatPercentValue(clickRateOf(row)),
  ),
  numCell('purchaseCount', '구매건수', (r) => r.purchaseCount),
  numCell(
    'conversionRate',
    '구매전환율 (%)',
    (r) => conversionRateOf(r),
    (row) => formatPercentValue(conversionRateOf(row)),
  ),
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

function DeltaLine({ delta }: { readonly delta: Delta }) {
  return (
    <p style={{ ...deltaStyle, color: DELTA_COLOR[delta.tone] }}>
      <span aria-hidden="true">{delta.text}</span>
      <span style={srOnlyStyle}>{delta.description}</span>
    </p>
  );
}

function sortRows(
  rows: readonly KeywordRow[],
  sort: { key: string; direction: 'asc' | 'desc' },
): readonly KeywordRow[] {
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

function KeywordStatsScreen({ state }: { state: ScreenState }) {
  const [preset, setPreset] = useState<string>('7d');
  const [compare, setCompare] = useState<string>('previous');
  const [segment, setSegment] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [metric, setMetric] = useState<string>('search');
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'searchCount',
    direction: 'desc',
  });
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);

  const loading = state === 'loading';
  const isEmpty = state === 'empty';

  const rows = useMemo(
    () => (isEmpty ? [] : filterKeywordRows(ROWS, segment, keyword)),
    [isEmpty, segment, keyword],
  );
  const daily = isEmpty ? [] : DAILY;

  const kpis = useMemo<readonly Kpi[]>(() => {
    const search = sumBy(rows, (r) => r.searchCount);
    const zeroResult = rows.filter(isZeroResultKeyword).length;
    const clicks = sumBy(rows, (r) => r.clickCount);
    const purchases = sumBy(rows, (r) => r.purchaseCount);
    const visits = sumBy(rows, (r) => r.visitCount);
    const compareOn = compare !== 'none' && !isEmpty;
    const cmp = (value: number): number | null => (compareOn ? Math.round(value * 0.9) : null);
    return [
      {
        id: 'search',
        label: '총 검색수',
        unit: 'count',
        value: search,
        compareValue: cmp(search),
        hint: '조회 조건에 걸린 검색어로 유입된 검색 횟수의 합입니다.',
      },
      {
        id: 'unique',
        label: '순 검색어 수',
        unit: 'count',
        value: rows.length,
        compareValue: cmp(rows.length),
        hint: '중복을 제거한 서로 다른 검색어의 개수입니다.',
      },
      {
        id: 'zeroResult',
        label: '검색결과 없음 검색어',
        unit: 'count',
        value: zeroResult,
        compareValue: cmp(zeroResult),
        isLowerBetter: true,
        hint: '걸리는 상품이 0개인 검색어입니다. 상품을 추가하거나 동의어를 걸면 줄어듭니다.',
      },
      {
        id: 'clickRate',
        label: '평균 클릭률',
        unit: 'percent',
        value: rateOf(clicks, search),
        compareValue: compareOn ? rateOf(Math.round(clicks * 0.9), search) : null,
        hint: '클릭수를 검색수로 나눈 값이며, 검색수로 가중평균합니다.',
      },
      {
        id: 'conversion',
        label: '구매전환율',
        unit: 'percent',
        value: rateOf(purchases, visits),
        compareValue: compareOn ? rateOf(Math.round(purchases * 0.9), visits) : null,
        hint: '구매건수를 방문수로 나눈 값입니다.',
      },
    ];
  }, [rows, compare, isEmpty]);

  const activeMetric = TREND_METRICS.find((item) => item.id === metric) ?? TREND_METRICS[0];
  const chartLabels = daily.map((row) => row.label);
  const currentSeries = daily.map((row) => activeMetric.pick(row));
  const compareSeries =
    compare === 'none' || isEmpty
      ? null
      : daily.map((row) => Math.round(activeMetric.pick(row) * 0.9));

  const sorted = sortRows(rows, sort);
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

  const hasQuery = keyword.trim() !== '';

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        손님이 무엇을 찾아 들어왔는지, 그중 우리 카탈로그가 받아내지 못한 검색어가 무엇인지 봅니다.
        결과 없음으로 표시된 검색어는 상품을 추가하거나 동의어를 걸어 지금 메울 수 있는 자리입니다.
      </p>

      {/* 조회 조건 바 — 통계 중 유일하게 검색 입력이 있다 (원본 StatsFilterBar) */}
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
            <label style={labelStyle} htmlFor="keyword-compare">
              비교 기준
            </label>
            <SelectField
              id="keyword-compare"
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
            <label style={labelStyle} htmlFor="keyword-segment">
              검색어 유형
            </label>
            <SelectField
              id="keyword-segment"
              value={segment}
              disabled={loading}
              onChange={(event) => {
                setSegment(event.target.value);
                setPage(1);
              }}
            >
              {KEYWORD_SEGMENTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div style={fieldStyle}>
            <SearchField
              label="검색어"
              placeholder="검색어"
              value={keyword}
              onChange={(next) => {
                setKeyword(next);
                setPage(1);
              }}
            />
          </div>

          <div style={spacerStyle} />

          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Icon name="download" />}
            disabled={loading || sorted.length === 0}
          >
            {`엑셀 내보내기 (${String(sorted.length)}건)`}
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

      {/* 전체 검색 추이 — 검색어를 걸어 표를 좁혀도 이 차트는 가게 전체를 그린다 (원본 StatsTrendCard) */}
      <StatsCard
        title="전체 검색 추이"
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
            선택한 기간에 집계된 값이 없습니다.
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

      {/* 검색어 순위 — 모든 수치 열이 정렬 가능, 기본 검색수 내림차순 (원본 Card + StatsTable) */}
      <section style={cardStyle} aria-label="검색어 순위">
        <h2 style={cardTitleStyle}>검색어 순위</h2>

        <div style={scrollStyle}>
          <Table
            caption="검색어 순위 상세"
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
            empty={
              // '검색해서 안 나온 것'과 '필터로 걸러진 것'은 복구 방법이 다르다 (원본 STATE-05)
              <Empty
                label="검색어"
                createVerb="집계"
                hasQuery={hasQuery}
                onClearSearch={() => {
                  setKeyword('');
                }}
              />
            }
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
              label="검색어 순위 페이지"
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

/** 정상 — 조회 조건(검색 포함) · KPI · 추이 · 검색어 순위 표 (원본 성공 응답) */
export const Default: Story = {
  render: () => <KeywordStatsScreen state="default" />,
};

/** 로딩 — 최초 조회. KPI/추이/표 모두 스켈레톤, 조회 조건은 떠 있는 채 비활성 */
export const Loading: Story = {
  render: () => <KeywordStatsScreen state="loading" />,
};

/** 빈 상태 — 조회는 성공했으나 집계된 검색어가 0건 (원본 STATE-01) */
export const Empty_: Story = {
  render: () => <KeywordStatsScreen state="empty" />,
};
