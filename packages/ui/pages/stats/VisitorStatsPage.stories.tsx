/**
 * Design System/Templates/Statistics/Visitor Stats — 실제 어드민 /stats/visitors 화면을 그대로 비추는 조립 스토리.
 * (조립 전용 · 담당: 스토리북 페이지 · 게이트 G5)
 *
 * `../../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 원본 화면: apps/admin/src/pages/stats/visitors/VisitorStatsPage.tsx (+ _shared/StatsPageShell·StatsFilterBar·
 *   StatsKpiRow·StatsTrendCard·StatsTable·StatsEmpty)
 *   구성(원본 순서 그대로 · StatsPageShell): 설명 → 조회 조건 바 → KPI 5장 → 방문 추이 카드 → 드릴다운 표 카드.
 *
 * [원본과의 레이어 차이]
 *   · 조회 조건 바: 원본 StatsFilterBar 의 프리셋 토글(aria-pressed <button> 목록)을 DS `SegmentedControl`
 *     (단일 선택 radiogroup)로 대응한다 — 같은 '기간 하나 고르기' 시맨틱이다. 비교/세그먼트는 `SelectField`.
 *   · 방문 추이: 원본 StatsTrendChart 는 Recharts(ADR-0011)라 앱 전용이다 — 여기서는 대시보드와 같은 DS
 *     `LineAreaChart`(외부 라이브러리 0)로 현재(면적)+비교(선)를 겹쳐 같은 그림을 낸다.
 *   · KPI 증감·구성비 막대: 원본 StatsKpiRow(DeltaText)·ShareBarList 는 앱 로컬이라, 그 시각을 토큰 마크업으로
 *     재현한다(색 + ▲/▼ 글리프 + 스크린리더 문장의 3중 인코딩 · WCAG 1.4.1).
 *
 * 사용 DS 컴포넌트: StatsCard · LineAreaChart · DataTable · SegmentedControl · SelectField · DateRangeField ·
 *   Button · Icon · Empty
 * 재현 상태: Default(정상 · 비교 기간 겹침) · Loading(최초 로드 스켈레톤) · Empty(집계 0건)
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
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
  title: 'Design System/Templates/Statistics/Visitor Stats',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/** 화면 전체가 재현하는 상태 (원본 useStatsQuery 의 isFirstLoad + 집계 0건 흐름) */
type ScreenState = 'default' | 'loading' | 'empty';

/** 증감의 '좋음/나쁨' — 색과 글리프가 여기서 갈린다 (원본 format.ts DeltaTone) */
type DeltaTone = 'positive' | 'negative' | 'neutral';

/* ── 조회 조건 (원본 period.ts / StatsFilterBar) ─────────────────────────────── */

interface PresetDef {
  readonly id: string;
  readonly label: string;
  /** '2026.07.10 ~ 2026.07.16 (7일)' — 조회 범위 요약 (formatPeriodLabel) */
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

/** 방문자 유형 세그먼트 (원본 VISITOR_SEGMENTS) */
const VISITOR_SEGMENTS: readonly { id: string; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'new', label: '처음 온 방문자' },
  { id: 'returning', label: '다시 온 방문자' },
];

/** 추이 지표 (원본 TREND_METRICS) */
const TREND_METRICS: readonly { id: string; label: string }[] = [
  { id: 'visits', label: '방문' },
  { id: 'pageViews', label: '페이지뷰' },
  { id: 'unique', label: '순 방문자' },
  { id: 'duration', label: '체류시간' },
];

/** 드릴다운 축 (원본 VISITOR_BREAKDOWNS) */
const VISITOR_BREAKDOWNS: readonly { id: string; label: string }[] = [
  { id: 'daily', label: '일자별' },
  { id: 'hourly', label: '시간대별' },
  { id: 'weekday', label: '요일별' },
];

/* ── 데모 데이터 (원본 data-source.ts 픽스처의 대표 표본) ─────────────────────── */

const nf = new Intl.NumberFormat('ko-KR');

/** '3분 4초' / '54초' (원본 format.ts formatDuration) */
function fmtDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes === 0 ? `${String(rest)}초` : `${String(minutes)}분 ${String(rest)}초`;
}

const DAY_LABELS = ['07.10', '07.11', '07.12', '07.13', '07.14', '07.15', '07.16'] as const;
const VISITS_CURRENT = [2312, 1980, 2140, 2660, 2410, 1890, 2540];
const VISITS_COMPARE = [2010, 1760, 1990, 2210, 2050, 1720, 2180];
const PAGE_VIEWS = [6120, 5010, 5680, 7020, 6440, 4980, 6710];
const UNIQUE = [1980, 1710, 1850, 2210, 2040, 1650, 2130];
const DURATION = [184, 172, 176, 201, 190, 165, 195];

/** 지표 토글이 고르는 현재/비교 계열 — 추이 차트의 원천 */
const TREND_SERIES: Record<string, { current: readonly number[]; compare: readonly number[] }> = {
  visits: { current: VISITS_CURRENT, compare: VISITS_COMPARE },
  pageViews: { current: PAGE_VIEWS, compare: [5510, 4620, 5210, 6180, 5720, 4510, 6020] },
  unique: { current: UNIQUE, compare: [1740, 1520, 1660, 1870, 1780, 1470, 1830] },
  duration: { current: DURATION, compare: [176, 168, 170, 188, 181, 160, 187] },
};

/** 드릴다운 표 한 축의 행 — 이미 표시용으로 포맷된 문자열 (원본 StatsColumn.render) */
function dailyRows(): readonly Record<string, string | number>[] {
  return DAY_LABELS.map((label, index) => {
    const visits = VISITS_CURRENT[index] ?? 0;
    const newV = Math.round(visits * 0.58);
    const returningV = visits - newV;
    const revisit = visits === 0 ? 0 : (returningV / visits) * 100;
    return {
      label: `2026.${label}`,
      visits: nf.format(visits),
      unique: nf.format(UNIQUE[index] ?? 0),
      pageViews: nf.format(PAGE_VIEWS[index] ?? 0),
      newV: nf.format(newV),
      returningV: nf.format(returningV),
      revisit: revisit.toFixed(1),
      duration: fmtDuration(DURATION[index] ?? 0),
    };
  });
}

const HOURLY_ROWS: readonly Record<string, string | number>[] = [
  {
    label: '09시',
    visits: '1,240',
    unique: '1,010',
    pageViews: '3,180',
    newV: '690',
    returningV: '550',
    revisit: '44.4',
    duration: '2분 41초',
  },
  {
    label: '12시',
    visits: '2,180',
    unique: '1,760',
    pageViews: '5,620',
    newV: '1,190',
    returningV: '990',
    revisit: '45.4',
    duration: '3분 12초',
  },
  {
    label: '15시',
    visits: '1,970',
    unique: '1,590',
    pageViews: '5,020',
    newV: '1,110',
    returningV: '860',
    revisit: '43.7',
    duration: '2분 58초',
  },
  {
    label: '19시',
    visits: '2,540',
    unique: '2,060',
    pageViews: '6,910',
    newV: '1,420',
    returningV: '1,120',
    revisit: '44.1',
    duration: '3분 20초',
  },
  {
    label: '22시',
    visits: '2,010',
    unique: '1,650',
    pageViews: '5,240',
    newV: '1,090',
    returningV: '920',
    revisit: '45.8',
    duration: '3분 4초',
  },
];

const WEEKDAY_ROWS: readonly Record<string, string | number>[] = [
  {
    label: '월요일',
    visits: '2,140',
    unique: '1,760',
    pageViews: '5,510',
    newV: '1,240',
    returningV: '900',
    revisit: '42.1',
    duration: '2분 56초',
  },
  {
    label: '화요일',
    visits: '2,310',
    unique: '1,880',
    pageViews: '5,980',
    newV: '1,340',
    returningV: '970',
    revisit: '42.0',
    duration: '3분 1초',
  },
  {
    label: '수요일',
    visits: '2,260',
    unique: '1,840',
    pageViews: '5,820',
    newV: '1,310',
    returningV: '950',
    revisit: '42.0',
    duration: '3분 3초',
  },
  {
    label: '목요일',
    visits: '2,480',
    unique: '2,010',
    pageViews: '6,440',
    newV: '1,440',
    returningV: '1,040',
    revisit: '41.9',
    duration: '3분 10초',
  },
  {
    label: '금요일',
    visits: '2,660',
    unique: '2,150',
    pageViews: '7,020',
    newV: '1,540',
    returningV: '1,120',
    revisit: '42.1',
    duration: '3분 18초',
  },
  {
    label: '토요일',
    visits: '1,890',
    unique: '1,540',
    pageViews: '4,980',
    newV: '1,100',
    returningV: '790',
    revisit: '41.8',
    duration: '2분 45초',
  },
  {
    label: '일요일',
    visits: '1,720',
    unique: '1,410',
    pageViews: '4,510',
    newV: '1,000',
    returningV: '720',
    revisit: '41.9',
    duration: '2분 41초',
  },
];

const ROWS_BY_VIEW: Record<string, readonly Record<string, string | number>[]> = {
  daily: dailyRows(),
  hourly: HOURLY_ROWS,
  weekday: WEEKDAY_ROWS,
};

/** DataTable 컬럼 — 원본 StatsTable columns 를 도메인 중립 표 계약으로 옮긴다 (단위는 헤더가 갖는다 · ERP-07) */
const TABLE_COLUMNS = [
  { key: 'label', label: '구간', align: 'left' },
  { key: 'visits', label: '전체 방문 수' },
  { key: 'unique', label: '순 방문자 수' },
  { key: 'pageViews', label: '페이지뷰' },
  { key: 'newV', label: '처음 온 방문자' },
  { key: 'returningV', label: '다시 온 방문자' },
  { key: 'revisit', label: '재방문율 (%)' },
  { key: 'duration', label: '평균 체류시간' },
] as const;

/** KPI 한 칸 (원본 StatsKpi + DeltaText 의 표시 값) */
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
    label: '전체 방문 수',
    value: '15,932건',
    zero: '0건',
    deltaText: '▲ 12.3%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 12.3% (1,742건) 증가',
    hint: '같은 사람이 두 번 오면 2회로 셉니다.',
  },
  {
    id: 'unique',
    label: '순 방문자 수',
    value: '13,570명',
    zero: '0명',
    deltaText: '▲ 8.4%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 8.4% (1,051명) 증가',
    hint: '중복을 제거한 실제 방문자 수입니다.',
  },
  {
    id: 'pageViews',
    label: '전체 페이지뷰',
    value: '41,960건',
    zero: '0건',
    deltaText: '▲ 6.1%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 6.1% (2,410건) 증가',
    hint: '방문자가 열람한 페이지 수의 합입니다.',
  },
  {
    id: 'revisit',
    label: '재방문율',
    value: '41.5%',
    zero: '0.0%',
    deltaText: '▲ 1.8%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 1.8%p 증가',
    hint: '전체 방문 중 다시 온 방문의 비율입니다.',
  },
  {
    id: 'duration',
    label: '평균 체류시간',
    value: '3분 3초',
    zero: '0초',
    deltaText: '▲ 4.2%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 4.2% 증가',
    hint: '방문 수로 가중평균한 체류시간입니다.',
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

/** 조회 조건 바 — 원본 StatsFilterBar.barStyle */
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

/** KPI 그리드 — 좁은 화면에서 1열로 접힌다 (원본 StatsKpiRow.rowStyle) */
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

/** 증감 색 — 색은 글리프·문장 위에 얹는 보조 신호다 (원본 DeltaText.TONE_COLOR) */
const TONE_COLOR: Readonly<Record<DeltaTone, string>> = {
  positive: cssVar('color.feedback.success.text'),
  negative: cssVar('color.feedback.danger.text'),
  neutral: cssVar('color.text.muted'),
};

/** 시각적으로 숨기되 접근성 트리에는 남긴다 (원본 DeltaText.srOnlyStyle — px 대신 최소 토큰) */
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

/* ── 조각 ──────────────────────────────────────────────────────────────────── */

/** KPI 한 장 — 증감은 색 + ▲/▼ + 스크린리더 문장의 3중 인코딩 (원본 DeltaText) */
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
 * 방문자 통계 화면 조립 — 조회 조건·지표·드릴다운 축은 controlled(useState)로, Decorator 화살표가
 * 아니라 이 Capitalized 컴포넌트 안에서 다룬다 (rules-of-hooks).
 */
function VisitorStatsScreen({ state }: { state: ScreenState }) {
  const [preset, setPreset] = useState('last7');
  const [compare, setCompare] = useState('previous');
  const [segment, setSegment] = useState('all');
  const [metric, setMetric] = useState('visits');
  const [view, setView] = useState('daily');

  const loading = state === 'loading';
  const empty = state === 'empty';
  const showCompare = compare !== 'none';

  const presetDef = PERIOD_PRESETS.find((item) => item.id === preset) ?? PERIOD_PRESETS[2];
  const rangeLabel = presetDef?.range ?? '';

  const rows = empty ? [] : (ROWS_BY_VIEW[view] ?? []);
  const viewLabel = VISITOR_BREAKDOWNS.find((item) => item.id === view)?.label ?? '일자별';
  const exportCount = rows.length;

  // 방문 추이 — 현재를 면적으로 먼저 깔고 비교를 선으로 위에 얹는다 (원본 StatsTrendChart 그림 순서)
  const series = TREND_SERIES[metric] ?? TREND_SERIES.visits;
  const metricLabel = TREND_METRICS.find((item) => item.id === metric)?.label ?? '방문';
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
        기간을 좁혀 비교하고, 방문자 유형과 시간대·요일까지 파고드는 방문 분석입니다. 대시보드의
        방문자 위젯이 '지금 몇 명'이라면 여기서는 '지난 기간과 견주어 어떻게 달라졌는지'를 봅니다.
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

          {/* 직접 입력일 때만 날짜 칸을 연다 (원본 preset === 'custom') */}
          {preset === 'custom' ? (
            <DateRangeField label="조회 기간" startValue="2026-07-10" endValue="2026-07-16" />
          ) : null}
        </div>

        <div style={barRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="visitor-compare">
              비교 기준
            </label>
            <SelectField
              id="visitor-compare"
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
            <label style={labelStyle} htmlFor="visitor-segment">
              방문자 유형
            </label>
            <SelectField
              id="visitor-segment"
              value={segment}
              onChange={(event) => {
                setSegment(event.target.value);
              }}
            >
              {VISITOR_SEGMENTS.map((option) => (
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

      {/* KPI 5장 (원본 StatsKpiRow) */}
      <div style={kpiRowStyle}>
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} state={state} showCompare={showCompare} />
        ))}
      </div>

      {/* 방문 추이 카드 (원본 StatsTrendCard) — 지표 토글은 로딩 중에도 떠 있는 채 비활성 */}
      <StatsCard
        title="방문 추이"
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

      {/* 드릴다운 표 카드 (원본 Card + CardTitle + StatsTable) */}
      <StatsCard
        title={`${viewLabel} 상세`}
        action={
          <SegmentedControl
            value={view}
            options={VISITOR_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
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
          <Empty label="방문 기록" createVerb="집계" />
        ) : (
          <DataTable
            columns={TABLE_COLUMNS}
            rows={rows}
            rowKey="label"
            caption={`${viewLabel} 방문자 상세`}
          />
        )}
      </StatsCard>
    </div>
  );
}

/** 정상 — 조회 조건 · KPI 5장 · 방문 추이(현재+비교) · 드릴다운 표 (원본 성공 응답) */
export const Default: Story = {
  render: () => <VisitorStatsScreen state="default" />,
};

/** 로딩 — 최초 로드. KPI·추이·표 모두 스켈레톤, 지표/축 토글은 떠 있는 채 비활성 (STATE-01) */
export const Loading: Story = {
  render: () => <VisitorStatsScreen state="loading" />,
};

/** 빈 상태 — 조회는 성공했으나 집계된 값이 0건. KPI 0 · 추이 안내 문구 · 표 Empty (STATE-01) */
export const Empty_: Story = {
  name: 'Empty',
  render: () => <VisitorStatsScreen state="empty" />,
};
