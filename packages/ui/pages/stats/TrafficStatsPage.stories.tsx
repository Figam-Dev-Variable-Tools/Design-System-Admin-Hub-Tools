/**
 * Design System/Templates/Statistics/Traffic Stats — 실제 어드민 /stats/traffic 화면을 그대로 비추는 조립 스토리.
 * (조립 전용 · 담당: 스토리북 페이지 · 게이트 G5)
 *
 * `../../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 원본 화면: apps/admin/src/pages/stats/traffic/TrafficStatsPage.tsx (+ _shared/StatsPageShell·StatsFilterBar·
 *   StatsKpiRow·StatsTrendCard·StatsTable·ShareBarList·StatsEmpty)
 *   구성(원본 순서 그대로): 설명 → 조회 조건 바 → (검색엔진별일 때 info 고지) → KPI 4장 → 유입 추이 카드 →
 *     드릴다운 카드(채널별=구성비 막대 · 검색엔진별/랜딩페이지별=표).
 *
 * [원본과의 레이어 차이]
 *   · 조회 조건 바: 프리셋 토글을 DS `SegmentedControl`, 비교/세그먼트를 `SelectField` 로 대응.
 *   · 유입 추이: Recharts 기반 StatsTrendChart 를 DS `LineAreaChart`(외부 라이브러리 0)로 대응 — 현재(면적)+비교(선).
 *   · 구성비 막대(ShareBarList)·KPI 증감(DeltaText): 앱 로컬이라 토큰 마크업으로 재현(색+▲/▼+SR 문장 · WCAG 1.4.1).
 *
 * 사용 DS 컴포넌트: StatsCard · LineAreaChart · DataTable · SegmentedControl · SelectField · DateRangeField ·
 *   Button · Icon · Alert · Empty
 * 재현 상태: Default(정상 · 비교 기간 겹침) · Loading(최초 로드 스켈레톤) · Empty(집계 0건)
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  DataTable,
  DateRangeField,
  Empty,
  Icon,
  LineAreaChart,
  SegmentedControl,
  SelectField,
  StatsCard,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Statistics/Traffic Stats',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

type ScreenState = 'default' | 'loading' | 'empty';
type DeltaTone = 'positive' | 'negative' | 'neutral';

/* ── 조회 조건 (원본 period.ts / StatsFilterBar) ─────────────────────────────── */

interface PresetDef {
  readonly id: string;
  readonly label: string;
  readonly range: string;
}

const PERIOD_PRESETS: readonly PresetDef[] = [
  { id: 'today', label: '오늘', range: '2026.07.16' },
  { id: 'yesterday', label: '어제', range: '2026.07.15' },
  { id: 'last7', label: '최근 7일', range: '2026.07.10 ~ 2026.07.16 (7일)' },
  { id: 'last30', label: '최근 30일', range: '2026.06.17 ~ 2026.07.16 (30일)' },
  { id: 'thisMonth', label: '이번 달', range: '2026.07.01 ~ 2026.07.16 (16일)' },
  { id: 'lastMonth', label: '지난 달', range: '2026.06.01 ~ 2026.06.30 (30일)' },
  { id: 'custom', label: '직접 입력', range: '2026.07.10 ~ 2026.07.16 (7일)' },
];

const COMPARE_MODES: readonly { id: string; label: string }[] = [
  { id: 'none', label: '비교 안 함' },
  { id: 'previous', label: '직전 기간' },
  { id: 'lastYear', label: '전년 동기' },
];

/** 유입 채널 세그먼트 (원본 TRAFFIC_SEGMENTS — 카페24 애널리틱스 채널 5종) */
const TRAFFIC_SEGMENTS: readonly { id: string; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'search', label: '검색엔진' },
  { id: 'bookmark', label: '북마크' },
  { id: 'external', label: '외부사이트' },
  { id: 'sns', label: 'SNS' },
  { id: 'ad', label: '광고' },
];

const TREND_METRICS: readonly { id: string; label: string }[] = [
  { id: 'visits', label: '유입' },
  { id: 'orders', label: '구매' },
  { id: 'revenue', label: '매출' },
  { id: 'conversion', label: '전환율' },
];

/** 드릴다운 축 (원본 TRAFFIC_BREAKDOWNS) */
const TRAFFIC_BREAKDOWNS: readonly { id: string; label: string }[] = [
  { id: 'channel', label: '채널별' },
  { id: 'engine', label: '검색엔진별' },
  { id: 'landing', label: '랜딩페이지별' },
];

/* ── 데모 데이터 (원본 data-source.ts 픽스처의 대표 표본) ─────────────────────── */

const nf = new Intl.NumberFormat('ko-KR');

const DAY_LABELS = ['07.10', '07.11', '07.12', '07.13', '07.14', '07.15', '07.16'] as const;

/** 지표 토글이 고르는 현재/비교 계열 — 추이 차트의 원천 */
const TREND_SERIES: Record<string, { current: readonly number[]; compare: readonly number[] }> = {
  visits: {
    current: [2010, 1760, 1990, 2210, 2050, 1720, 2380],
    compare: [1780, 1560, 1720, 1980, 1810, 1520, 2090],
  },
  orders: { current: [58, 44, 61, 72, 66, 49, 78], compare: [51, 39, 54, 63, 58, 42, 68] },
  revenue: {
    current: [4120, 3240, 4680, 5510, 5020, 3610, 6040],
    compare: [3610, 2980, 4020, 4780, 4310, 3120, 5210],
  },
  conversion: {
    current: [2.9, 2.5, 3.1, 3.3, 3.2, 2.8, 3.3],
    compare: [2.9, 2.5, 3.1, 3.2, 3.2, 2.8, 3.3],
  },
};

/** 채널별 구성비 막대의 원천 (원본 channelItems) */
interface ShareRow {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly compareValue: number;
}

const CHANNEL_ITEMS: readonly ShareRow[] = [
  { id: 'search', label: '검색엔진', value: 4820, compareValue: 4210 },
  { id: 'sns', label: 'SNS', value: 3240, compareValue: 2980 },
  { id: 'bookmark', label: '북마크', value: 2610, compareValue: 2740 },
  { id: 'external', label: '외부사이트', value: 1890, compareValue: 1620 },
  { id: 'ad', label: '광고', value: 1560, compareValue: 1180 },
];

/** 검색엔진별·랜딩페이지별 표 (원본 stats.engines / stats.landings) — 표시용 포맷 문자열 */
const ENGINE_ROWS: readonly Record<string, string | number>[] = [
  { label: '네이버', visits: '3,180', orders: '132', revenue: '9,840,000', conversion: '4.2' },
  { label: '구글', visits: '1,020', orders: '28', revenue: '1,760,000', conversion: '2.7' },
  { label: '다음', visits: '480', orders: '14', revenue: '820,000', conversion: '2.9' },
  { label: '기타', visits: '140', orders: '3', revenue: '190,000', conversion: '2.1' },
];

const LANDING_ROWS: readonly Record<string, string | number>[] = [
  { label: '메인', visits: '5,120', orders: '96', revenue: '6,240,000', conversion: '1.9' },
  { label: '상품 상세', visits: '3,860', orders: '188', revenue: '13,520,000', conversion: '4.9' },
  { label: '기획전', visits: '2,140', orders: '72', revenue: '5,180,000', conversion: '3.4' },
  { label: '검색 결과', visits: '1,010', orders: '21', revenue: '1,410,000', conversion: '2.1' },
];

/** 표 컬럼 — 첫 칸 헤더만 축마다 다르다 (원본 columnsOf) */
function tableColumns(head: string) {
  return [
    { key: 'label', label: head, align: 'left' },
    { key: 'visits', label: '유입수' },
    { key: 'orders', label: '구매건수' },
    { key: 'revenue', label: '매출액 (원)' },
    { key: 'conversion', label: '구매전환율 (%)' },
  ] as const;
}

interface KpiDef {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly zero: string;
  readonly deltaText: string;
  readonly deltaTone: DeltaTone;
  readonly describe: string;
  readonly hint: string;
}

const KPIS: readonly KpiDef[] = [
  {
    id: 'visits',
    label: '총 유입수',
    value: '14,120건',
    zero: '0건',
    deltaText: '▲ 9.6%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 9.6% (1,240건) 증가',
    hint: '방문(유입) 기준입니다.',
  },
  {
    id: 'orders',
    label: '구매건수',
    value: '428건',
    zero: '0건',
    deltaText: '▲ 12.1%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 12.1% (46건) 증가',
    hint: '해당 유입으로 들어와 결제까지 이어진 건수입니다.',
  },
  {
    id: 'revenue',
    label: '매출액',
    value: '32,210,000원',
    zero: '0원',
    deltaText: '▲ 14.8%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 14.8% 증가',
    hint: '해당 유입에서 발생한 결제 금액의 합입니다.',
  },
  {
    id: 'conversion',
    label: '구매전환율',
    value: '3.0%',
    zero: '0.0%',
    deltaText: '▲ 0.2%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 0.2%p 증가',
    hint: '구매건수 ÷ 방문수 × 100 으로 계산합니다.',
  },
];

/* ── 스타일 (원본 각 _shared 컴포넌트의 토큰 스타일을 옮긴다) ───────────────────── */

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

const mutedLineStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const kpiRowStyle: CSSProperties = {
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

const TONE_COLOR: Readonly<Record<DeltaTone, string>> = {
  positive: cssVar('color.feedback.success.text'),
  negative: cssVar('color.feedback.danger.text'),
  neutral: cssVar('color.text.muted'),
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

const exportWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  marginInlineStart: 'auto',
};

const trendEmptyStyle: CSSProperties = {
  margin: 0,
  paddingBlock: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
  ...typography('typography.label.md'),
};

/** 구성비 막대 (원본 ShareBarList) — 순위가 본질인 데이터는 단색 길이 비교가 파이보다 안전하다 */
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
};

const shareValueStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: cssVar('space.2'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
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

const shareShareStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

/* ── 조각 ──────────────────────────────────────────────────────────────────── */

/** 두 값의 증감 한 조각 — 색 + ▲/▼ + 스크린리더 문장 (원본 DeltaText) */
function Delta({ value, compareValue }: { readonly value: number; readonly compareValue: number }) {
  const diff = value - compareValue;
  const tone: DeltaTone = diff === 0 ? 'neutral' : diff > 0 ? 'positive' : 'negative';
  const percent = compareValue === 0 ? null : (diff / Math.abs(compareValue)) * 100;
  const glyph =
    diff === 0
      ? '변동 없음'
      : `${diff > 0 ? '▲' : '▼'} ${percent === null ? '—' : `${Math.abs(percent).toFixed(1)}%`}`;
  const describe =
    diff === 0
      ? '비교 기간과 변동 없음'
      : `비교 기간 대비 ${percent === null ? '' : `${Math.abs(percent).toFixed(1)}% `}${diff > 0 ? '증가' : '감소'}`;
  return (
    <span style={{ color: TONE_COLOR[tone] }}>
      <span aria-hidden="true">{glyph}</span>
      <span style={srOnlyStyle}>{describe}</span>
    </span>
  );
}

/** 구성비 막대 목록 (원본 ShareBarList) */
function ShareBars({
  items,
  showCompare,
}: {
  readonly items: readonly ShareRow[];
  readonly showCompare: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <ul style={shareListStyle}>
      {items.map((item) => {
        const share = total === 0 ? 0 : (item.value / total) * 100;
        return (
          <li key={item.id}>
            <div style={shareHeadStyle}>
              <span style={{ ...typography('typography.label.md') }}>{item.label}</span>
              <span style={shareValueStyle}>
                <span>{`${nf.format(item.value)}건`}</span>
                <span style={shareShareStyle}>{`${share.toFixed(1)}%`}</span>
                {showCompare ? <Delta value={item.value} compareValue={item.compareValue} /> : null}
              </span>
            </div>
            <div style={shareTrackStyle}>
              <div
                aria-hidden="true"
                style={{ ...shareFillStyle, inlineSize: `${share.toFixed(1)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** KPI 한 장 (원본 StatsKpiRow) */
function KpiCard({
  kpi,
  state,
  showCompare,
}: {
  readonly kpi: KpiDef;
  readonly state: ScreenState;
  readonly showCompare: boolean;
}) {
  const loading = state === 'loading';
  const empty = state === 'empty';
  return (
    <StatsCard
      title={kpi.label}
      value={loading ? '' : empty ? kpi.zero : kpi.value}
      loading={loading}
      error=""
    >
      <div style={kpiBodyStyle}>
        {showCompare && !empty ? (
          <p style={{ ...deltaStyle, margin: 0, color: TONE_COLOR[kpi.deltaTone] }}>
            <span aria-hidden="true">{kpi.deltaText}</span>
            <span style={srOnlyStyle}>{kpi.describe}</span>
          </p>
        ) : (
          <p style={{ ...deltaStyle, margin: 0, color: cssVar('color.text.muted') }}>비교 안 함</p>
        )}
        <p style={hintStyle}>{kpi.hint}</p>
      </div>
    </StatsCard>
  );
}

/**
 * 유입 분석 화면 조립 — 조회 조건·지표·드릴다운 축은 controlled(useState)로 이 Capitalized 컴포넌트
 * 안에서 다룬다 (rules-of-hooks).
 */
function TrafficStatsScreen({ state }: { state: ScreenState }) {
  const [preset, setPreset] = useState('last7');
  const [compare, setCompare] = useState('previous');
  const [segment, setSegment] = useState('all');
  const [metric, setMetric] = useState('visits');
  const [view, setView] = useState('channel');

  const loading = state === 'loading';
  const empty = state === 'empty';
  const showCompare = compare !== 'none';

  const presetDef = PERIOD_PRESETS.find((item) => item.id === preset) ?? PERIOD_PRESETS[2];
  const rangeLabel = presetDef?.range ?? '';

  const isChannelView = view === 'channel';
  const isEngineView = view === 'engine';
  const viewLabel = TRAFFIC_BREAKDOWNS.find((item) => item.id === view)?.label ?? '채널별';

  const tableRows = empty ? [] : isEngineView ? ENGINE_ROWS : LANDING_ROWS;
  const channelItems = empty ? [] : CHANNEL_ITEMS;
  const exportCount = isChannelView ? channelItems.length : tableRows.length;

  const series = TREND_SERIES[metric] ?? TREND_SERIES.visits;
  const metricLabel = TREND_METRICS.find((item) => item.id === metric)?.label ?? '유입';
  const chartSeries = [
    {
      id: 'current',
      label: '현재 기간',
      kind: 'area' as const,
      values: [...(series?.current ?? [])],
    },
    ...(showCompare
      ? [
          {
            id: 'compare',
            label: '비교 기간',
            kind: 'line' as const,
            values: [...(series?.compare ?? [])],
          },
        ]
      : []),
  ];

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        유입이 어디서 왔고 그중 무엇이 실제로 팔았는지 보는 화면입니다. 방문자 통계가 '몇 명이
        왔나'라면 여기서는 채널마다 유입수 옆에 구매건수와 매출액을 붙여 '어느 유입이 매출로
        이어졌는지'를 봅니다.
      </p>

      {/* 조회 조건 바 (원본 StatsFilterBar) */}
      <section style={barStyle} aria-label="조회 조건">
        <div style={barRowStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: cssVar('space.2') }}>
            <span style={labelStyle}>조회 기간</span>
            <SegmentedControl
              value={preset}
              options={PERIOD_PRESETS.map((item) => ({ id: item.id, label: item.label }))}
              size="sm"
              ariaLabel="조회 기간"
              onChange={setPreset}
            />
          </div>

          {preset === 'custom' ? (
            <DateRangeField label="조회 기간" startValue="2026-07-10" endValue="2026-07-16" />
          ) : null}
        </div>

        <div style={barRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="traffic-compare">
              비교 기준
            </label>
            <SelectField
              id="traffic-compare"
              value={compare}
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
            <label style={labelStyle} htmlFor="traffic-segment">
              유입 채널
            </label>
            <SelectField
              id="traffic-segment"
              value={segment}
              onChange={(event) => {
                setSegment(event.target.value);
              }}
            >
              {TRAFFIC_SEGMENTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div style={exportWrapStyle}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Icon name="download" />}
              disabled={exportCount === 0}
            >
              {`엑셀 내보내기 (${String(exportCount)}건)`}
            </Button>
          </div>
        </div>

        <p style={mutedLineStyle}>
          {`조회 범위 ${rangeLabel} · 내보내기는 현재 조건 전체를 담습니다.`}
        </p>
      </section>

      {/* 검색엔진별일 때만 뜨는 지속 고지 (원본 notice — 구글 참조검색어 없음) */}
      {isEngineView ? (
        <Alert tone="info">
          구글 유입은 개인정보 보호정책에 따라 검색어가 전달되지 않아 카페24에서 '참조검색어
          없음'으로 집계됩니다. 아래 유입수·매출액은 정상으로 잡히지만, 어떤 검색어로 들어왔는지는
          확인할 수 없습니다.
        </Alert>
      ) : null}

      {/* KPI 4장 (원본 StatsKpiRow) */}
      <div style={kpiRowStyle}>
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} state={state} showCompare={showCompare} />
        ))}
      </div>

      {/* 유입 추이 카드 (원본 StatsTrendCard) */}
      <StatsCard
        title="유입 추이"
        action={
          <SegmentedControl
            value={metric}
            options={TREND_METRICS.map((item) => ({ id: item.id, label: item.label }))}
            size="sm"
            ariaLabel="추이 지표"
            disabled={loading}
            onChange={setMetric}
          />
        }
        loading={loading}
        error=""
      >
        {empty ? (
          <p style={trendEmptyStyle}>선택한 기간에 집계된 값이 없습니다.</p>
        ) : (
          <LineAreaChart
            series={chartSeries}
            labels={[...DAY_LABELS]}
            ariaLabel={`${rangeLabel} ${metricLabel} 추이${showCompare ? ' — 비교 기간이 함께 표시됩니다.' : ''}`}
          />
        )}
      </StatsCard>

      {/* 드릴다운 카드 — 채널별=구성비 막대 · 검색엔진별/랜딩페이지별=표 (원본 Card + CardTitle) */}
      <StatsCard
        title={`${viewLabel} 상세`}
        action={
          <SegmentedControl
            value={view}
            options={TRAFFIC_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
            size="sm"
            ariaLabel="드릴다운 축"
            disabled={loading}
            onChange={setView}
          />
        }
        loading={loading}
        error=""
      >
        {empty ? (
          <Empty label="유입 기록" createVerb="집계" />
        ) : isChannelView ? (
          <ShareBars items={channelItems} showCompare={showCompare} />
        ) : (
          <DataTable
            columns={tableColumns(isEngineView ? '검색엔진' : '랜딩페이지')}
            rows={tableRows}
            rowKey="label"
            caption={`${viewLabel} 유입 상세`}
          />
        )}
      </StatsCard>
    </div>
  );
}

/** 정상 — 조회 조건 · KPI 4장 · 유입 추이(현재+비교) · 채널별 구성비 막대 (원본 성공 응답) */
export const Default: Story = {
  render: () => <TrafficStatsScreen state="default" />,
};

/** 로딩 — 최초 로드. KPI·추이·드릴다운 모두 스켈레톤, 지표/축 토글은 떠 있는 채 비활성 (STATE-01) */
export const Loading: Story = {
  render: () => <TrafficStatsScreen state="loading" />,
};

/** 빈 상태 — 조회는 성공했으나 집계된 값이 0건. KPI 0 · 추이 안내 문구 · 드릴다운 Empty (STATE-01) */
export const Empty_: Story = {
  name: 'Empty',
  render: () => <TrafficStatsScreen state="empty" />,
};
