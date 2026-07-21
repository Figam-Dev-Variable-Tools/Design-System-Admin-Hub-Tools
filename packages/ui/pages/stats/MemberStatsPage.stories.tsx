/**
 * Design System/Templates/Statistics/Member Stats — 실제 어드민 /stats/members 화면을 그대로 비추는 조립 스토리.
 * (조립 전용 · 담당: 스토리북 페이지 · 게이트 G5)
 *
 * `../../src` public 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다 (pages/README.md).
 * 원본 화면: apps/admin/src/pages/stats/members/MemberStatsPage.tsx (+ _shared/StatsPageShell·StatsFilterBar·
 *   StatsKpiRow·StatsTrendCard·StatsTable·ShareBarList·StatsEmpty)
 *   구성(원본 순서 그대로): 설명 → 조회 조건 바 → KPI 4장 → 회원 추이 카드 →
 *     드릴다운 카드(일자별=표 · 등급별=구성비 막대).
 *
 * [원본과의 레이어 차이]
 *   · 조회 조건 바: 프리셋 토글을 DS `SegmentedControl`, 비교/세그먼트(가입 경로)를 `SelectField` 로 대응.
 *   · 회원 추이: Recharts 기반 StatsTrendChart 를 DS `LineAreaChart`(외부 라이브러리 0)로 대응 — 현재(면적)+비교(선).
 *   · 구성비 막대(ShareBarList)·KPI 증감(DeltaText): 앱 로컬이라 토큰 마크업으로 재현(색+▲/▼+SR 문장 · WCAG 1.4.1).
 *   · 탈퇴는 낮을수록 좋은 지표라 증감 색을 뒤집는다 (원본 StatsKpi.isLowerBetter) — ▼ 를 초록으로 낸다.
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
  title: 'Design System/Templates/Statistics/Member Stats',
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

/** 가입 경로 세그먼트 (원본 MEMBER_CHANNELS — 국내 커머스는 소셜 로그인으로 크게 기운다) */
const MEMBER_CHANNELS: readonly { id: string; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'email', label: '이메일' },
  { id: 'naver', label: '네이버' },
  { id: 'kakao', label: '카카오' },
  { id: 'google', label: '구글' },
];

const TREND_METRICS: readonly { id: string; label: string }[] = [
  { id: 'joins', label: '신규 가입' },
  { id: 'withdrawals', label: '탈퇴' },
  { id: 'net', label: '순증' },
  { id: 'cumulative', label: '누적' },
];

/** 드릴다운 축 (원본 MEMBER_BREAKDOWNS) */
const MEMBER_BREAKDOWNS: readonly { id: string; label: string }[] = [
  { id: 'daily', label: '일자별' },
  { id: 'tier', label: '등급별' },
];

/* ── 데모 데이터 (원본 data-source.ts 픽스처의 대표 표본) ─────────────────────── */

const nf = new Intl.NumberFormat('ko-KR');

/** '+130' / '-3' — 순증은 부호를 달고 나온다 (원본 formatSignedNumber · ERP-08) */
function fmtSigned(value: number): string {
  return value > 0 ? `+${nf.format(value)}` : nf.format(value);
}

const DAY_LABELS = ['07.10', '07.11', '07.12', '07.13', '07.14', '07.15', '07.16'] as const;
const JOINS = [142, 128, 156, 171, 160, 98, 133];
const WITHDRAWALS = [12, 9, 14, 7, 11, 5, 8];
const CUMULATIVE = [24630, 24749, 24891, 25055, 25204, 25297, 25422];
const NET = JOINS.map((join, index) => join - (WITHDRAWALS[index] ?? 0));

/** 지표 토글이 고르는 현재/비교 계열 — 추이 차트의 원천 */
const TREND_SERIES: Record<string, { current: readonly number[]; compare: readonly number[] }> = {
  joins: { current: JOINS, compare: [131, 119, 142, 160, 148, 90, 124] },
  withdrawals: { current: WITHDRAWALS, compare: [14, 11, 16, 9, 13, 7, 10] },
  net: { current: NET, compare: [117, 108, 126, 151, 135, 83, 114] },
  cumulative: { current: CUMULATIVE, compare: [23610, 23718, 23844, 23995, 24130, 24213, 24327] },
};

/** 일자별 표 (원본 dailyColumns) — 표시용 포맷 문자열 */
function dailyRows(): readonly Record<string, string | number>[] {
  return DAY_LABELS.map((label, index) => ({
    label: `2026.${label}`,
    joins: nf.format(JOINS[index] ?? 0),
    withdrawals: nf.format(WITHDRAWALS[index] ?? 0),
    net: fmtSigned(NET[index] ?? 0),
    cumulative: nf.format(CUMULATIVE[index] ?? 0),
  }));
}

const DAILY_COLUMNS = [
  { key: 'label', label: '일자', align: 'left' },
  { key: 'joins', label: '신규 가입' },
  { key: 'withdrawals', label: '탈퇴' },
  { key: 'net', label: '순증' },
  { key: 'cumulative', label: '누적 회원' },
] as const;

/** 등급별 구성비 막대의 원천 (원본 tierItems — 기간 말 시점의 스냅샷) */
interface ShareRow {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly compareValue: number;
}

const TIER_ITEMS: readonly ShareRow[] = [
  { id: 'basic', label: '일반', value: 18240, compareValue: 17980 },
  { id: 'silver', label: '실버', value: 4120, compareValue: 3860 },
  { id: 'gold', label: '골드', value: 2360, compareValue: 2210 },
  { id: 'vip', label: 'VIP', value: 702, compareValue: 640 },
];

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
    id: 'joins',
    label: '신규 가입',
    value: '988명',
    zero: '0명',
    deltaText: '▲ 7.2%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 7.2% (66명) 증가',
    hint: '기간 안에 가입을 완료한 회원 수입니다.',
  },
  // 탈퇴는 낮을수록 좋다 — 감소(▼)가 초록(positive)이다 (원본 isLowerBetter)
  {
    id: 'withdrawals',
    label: '탈퇴',
    value: '66명',
    zero: '0명',
    deltaText: '▼ 8.0%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 8.0% (6명) 감소',
    hint: '기간 안에 탈퇴 처리된 회원 수입니다.',
  },
  {
    id: 'net',
    label: '순증',
    value: '922명',
    zero: '0명',
    deltaText: '▲ 9.1%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 9.1% 증가',
    hint: '신규 가입에서 탈퇴를 뺀 값입니다.',
  },
  {
    id: 'cumulative',
    label: '누적 회원 수',
    value: '25,422명',
    zero: '0명',
    deltaText: '▲ 3.8%',
    deltaTone: 'positive',
    describe: '비교 기간 대비 3.8% 증가',
    hint: '기간 마지막 날 마감 기준으로 남아 있는 전체 회원 수입니다.',
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

/** 구성비 막대 목록 (원본 ShareBarList) — 회원이 어느 등급에 쏠려 있나를 길이로 읽는다 */
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
                <span>{`${nf.format(item.value)}명`}</span>
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
 * 회원 통계 화면 조립 — 조회 조건·지표·드릴다운 축은 controlled(useState)로 이 Capitalized 컴포넌트
 * 안에서 다룬다 (rules-of-hooks).
 */
function MemberStatsScreen({ state }: { state: ScreenState }) {
  const [preset, setPreset] = useState('last7');
  const [compare, setCompare] = useState('previous');
  const [channel, setChannel] = useState('all');
  const [metric, setMetric] = useState('joins');
  const [view, setView] = useState('daily');

  const loading = state === 'loading';
  const empty = state === 'empty';
  const showCompare = compare !== 'none';

  const presetDef = PERIOD_PRESETS.find((item) => item.id === preset) ?? PERIOD_PRESETS[2];
  const rangeLabel = presetDef?.range ?? '';

  const isTierView = view === 'tier';
  const viewLabel = MEMBER_BREAKDOWNS.find((item) => item.id === view)?.label ?? '일자별';

  const rows = empty ? [] : dailyRows();
  const tierItems = empty ? [] : TIER_ITEMS;
  const exportCount = isTierView ? tierItems.length : rows.length;

  const series = TREND_SERIES[metric] ?? TREND_SERIES.joins;
  const metricLabel = TREND_METRICS.find((item) => item.id === metric)?.label ?? '신규 가입';
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
        가입 경로별로 신규 가입과 탈퇴를 갈라 보고, 순증과 누적 회원 수의 흐름을 비교 기간과 견주는
        회원 분석입니다. 신규 가입만 세면 탈퇴가 같은 수로 빠져나가도 성장으로 읽히므로, 순증을
        나란히 둡니다.
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
            <label style={labelStyle} htmlFor="member-compare">
              비교 기준
            </label>
            <SelectField
              id="member-compare"
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
            <label style={labelStyle} htmlFor="member-channel">
              가입 경로
            </label>
            <SelectField
              id="member-channel"
              value={channel}
              onChange={(event) => {
                setChannel(event.target.value);
              }}
            >
              {MEMBER_CHANNELS.map((option) => (
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

      {/* KPI 4장 (원본 StatsKpiRow) */}
      <div style={kpiRowStyle}>
        {KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} state={state} showCompare={showCompare} />
        ))}
      </div>

      {/* 회원 추이 카드 (원본 StatsTrendCard) */}
      <StatsCard
        title="회원 추이"
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

      {/* 드릴다운 카드 — 일자별=표 · 등급별=구성비 막대 (원본 Card + CardTitle) */}
      <StatsCard
        title={`${viewLabel} 상세`}
        action={
          <SegmentedControl
            value={view}
            options={MEMBER_BREAKDOWNS.map((item) => ({ id: item.id, label: item.label }))}
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
          <Empty label="가입 기록" createVerb="집계" />
        ) : isTierView ? (
          <ShareBars items={tierItems} showCompare={showCompare} />
        ) : (
          <DataTable
            columns={DAILY_COLUMNS}
            rows={rows}
            rowKey="label"
            caption={`${viewLabel} 회원 상세`}
          />
        )}
      </StatsCard>
    </div>
  );
}

/** 정상 — 조회 조건 · KPI 4장 · 회원 추이(현재+비교) · 일자별 표 (원본 성공 응답) */
export const Default: Story = {
  render: () => <MemberStatsScreen state="default" />,
};

/** 로딩 — 최초 로드. KPI·추이·드릴다운 모두 스켈레톤, 지표/축 토글은 떠 있는 채 비활성 (STATE-01) */
export const Loading: Story = {
  render: () => <MemberStatsScreen state="loading" />,
};

/** 빈 상태 — 조회는 성공했으나 집계된 값이 0건. KPI 0 · 추이 안내 문구 · 드릴다운 Empty (STATE-01) */
export const Empty_: Story = {
  name: 'Empty',
  render: () => <MemberStatsScreen state="empty" />,
};
