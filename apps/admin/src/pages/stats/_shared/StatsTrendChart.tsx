// 통계 추이 차트 — 현재 기간(면적) + 비교 기간(선) (A40 소유 — apps/admin/src/pages/stats/**)
//
// [왜 DS 의 LineAreaChart 가 아니라 여기인가 — 오너 확정 스택 'Recharts(통계)']
//   LineAreaChart 는 **대시보드도 쓴다**(dashboard/components/StatsSection). 그리고 DashboardPage 는
//   lazy 가 아니다 — App.tsx 가 LCP 를 이유로 즉시 로드로 못박은 셋 중 하나다. 그래서 LineAreaChart
//   안에 Recharts 를 넣으면 **140.8 kB gzip 이 진입 청크로 직행한다**(130.59 → ~271 kB).
//   게다가 FS-002-EL-031 이 대시보드 차트에 '외부 차트 라이브러리 없이 SVG' 를 **명세로 요구**한다.
//   → 통계 전용 컴포넌트로 두면 진입 청크는 그대로고 통계 라우트(전부 lazy)만 비용을 낸다.
//   같은 자리(pages/stats/_shared)의 ShareBarList 가 이미 앱 레이어 차트의 선례다. (ADR-0011)
//
// [잃지 않은 것 — LineAreaChart 가 이 카드에 주던 것 전부]
//   · 비교 기간 겹쳐 그리기: 현재를 area 로 먼저, 비교를 line 으로 나중에 (순서가 뒤집히면 면적이
//     비교선을 덮는다). Recharts 는 자식 순서대로 그리므로 Area → Line 순서가 곧 그 규약이다.
//   · 색은 chart.series-* 토큰뿐 — 라이브러리 기본 팔레트를 쓰지 않는다 (TOKEN-13).
//   · role="img" + 추세를 문장으로 기술한 aria-label (호출부가 만든다).
//   · 범례는 **진짜 텍스트**다 — 색 점만으로 계열을 구분시키지 않는다 (WCAG 1.4.1).
//
// [접근성 구조] 범례는 aria-hidden 밖의 실제 텍스트로 두고, 차트 SVG 만 role="img" 로 감싼다.
//   Recharts 가 SVG 안에 뿌리는 눈금·경로에는 접근 가능한 이름이 없으므로 aria-label 문장이
//   그것을 대신한다 — LineAreaChart 와 정확히 같은 계약이다.
import type { CSSProperties } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

/** 계열 색 — chart.series-N 토큰. 현재=1, 비교=2 (LineAreaChart 의 배열 순서와 같은 결과) */
const CURRENT_STROKE = 'var(--tds-color-chart-series-1)';
const CURRENT_FILL = 'var(--tds-color-chart-series-1-fill)';
const COMPARE_STROKE = 'var(--tds-color-chart-series-2)';
const AXIS_COLOR = 'var(--tds-color-chart-axis)';
const LABEL_COLOR = 'var(--tds-color-chart-label)';

/** 차트 높이 — LineAreaChart 의 viewBox 220 과 같은 비율감. space 토큰의 배수로 잡는다 */
const CHART_HEIGHT = 'calc(var(--tds-space-6) * 6)';

const figureStyle: CSSProperties = {
  margin: 0,
  minInlineSize: 0,
  background: 'var(--tds-color-surface-default)',
};

const legendStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-4)',
  margin: 0,
  marginBlockEnd: 'var(--tds-space-4)',
  padding: 0,
  listStyle: 'none',
  color: LABEL_COLOR,
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const legendItemStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const legendDotStyle: CSSProperties = {
  display: 'inline-block',
  inlineSize: 'var(--tds-space-2)',
  blockSize: 'var(--tds-space-2)',
  borderRadius: 'var(--tds-radius-full)',
};

const chartBoxStyle: CSSProperties = { inlineSize: '100%', blockSize: CHART_HEIGHT };

const AXIS_TICK = { fill: LABEL_COLOR, fontSize: 11 } as const;

/** 한 x 위치의 값들 — Recharts 는 계열별 배열이 아니라 '행' 배열을 먹는다 */
interface TrendRow {
  readonly label: string;
  readonly current: number;
  readonly compare?: number;
}

interface StatsTrendChartProps {
  readonly labels: readonly string[];
  readonly current: readonly number[];
  /** 비교 기간 — 비교 안 함이면 null */
  readonly compare: readonly number[] | null;
  /** role=img 의 접근 가능한 이름 — 차트가 전달하는 추세를 문장으로 */
  readonly ariaLabel: string;
}

/**
 * y축 상한 — 최댓값을 넘는 '깔끔한' 수와 그 5등분.
 *
 * LineAreaChart 의 buildScale 과 같은 규칙이다. Recharts 의 자동 도메인에 맡기지 않는 이유:
 * 자동 눈금은 데이터에 따라 개수가 흔들려 카드 높이가 들썩인다. 여기서 상한을 정하면
 * 눈금은 항상 6개(0 포함)다 — 통계 6화면이 같은 높이로 줄 맞춰 선다.
 */
function buildTicks(maxValue: number): readonly number[] {
  if (maxValue <= 0) return [0, 5, 10];
  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const step = Math.ceil(maxValue / (magnitude * 5)) * magnitude;
  return Array.from({ length: 6 }, (_, i) => i * step);
}

export function StatsTrendChart({ labels, current, compare, ariaLabel }: StatsTrendChartProps) {
  const rows: readonly TrendRow[] = labels.map((label, index) => ({
    label,
    current: current[index] ?? 0,
    ...(compare !== null && { compare: compare[index] ?? 0 }),
  }));

  const maxValue = [...current, ...(compare ?? [])].reduce((max, value) => Math.max(max, value), 0);
  const ticks = buildTicks(maxValue);
  const top = ticks[ticks.length - 1] ?? 10;

  return (
    <figure style={figureStyle}>
      {/* 범례 — 실제 텍스트. 색 점은 장식이므로 aria-hidden */}
      <ul style={legendStyle}>
        <li style={legendItemStyle}>
          <span style={{ ...legendDotStyle, background: CURRENT_STROKE }} aria-hidden="true" />
          현재 기간
        </li>
        {compare !== null ? (
          <li style={legendItemStyle}>
            <span style={{ ...legendDotStyle, background: COMPARE_STROKE }} aria-hidden="true" />
            비교 기간
          </li>
        ) : null}
      </ul>

      <div style={chartBoxStyle} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={[...rows]}>
            <CartesianGrid stroke={AXIS_COLOR} vertical={false} />
            <XAxis dataKey="label" stroke={AXIS_COLOR} tick={AXIS_TICK} tickLine={false} />
            <YAxis
              domain={[0, top]}
              ticks={[...ticks]}
              stroke={AXIS_COLOR}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            {/* 그리는 순서가 곧 겹침 순서다 — 현재(면적)를 먼저 깔고 비교(선)를 위에 얹는다 */}
            <Area
              type="monotone"
              dataKey="current"
              stroke={CURRENT_STROKE}
              strokeWidth={2}
              fill={CURRENT_FILL}
              isAnimationActive={false}
              dot={false}
            />
            {compare !== null ? (
              <Line
                type="monotone"
                dataKey="compare"
                stroke={COMPARE_STROKE}
                strokeWidth={2}
                isAnimationActive={false}
                dot={{ fill: COMPARE_STROKE, r: 3.5 }}
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
