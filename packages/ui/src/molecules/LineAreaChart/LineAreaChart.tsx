// LineAreaChart — 범용 선 + 면적 차트 (molecule · contracts/LineAreaChart.contract.json@1.1.0)
//
// 외부 차트 라이브러리 의존 0 — SVG 좌표를 직접 계산하고 Catmull-Rom → 3차 베지어로 스무딩한다.
// 색은 전부 chart.* 토큰. SVG 내부 좌표는 viewBox 기준의 무단위 수라 px 리터럴이 아니다
// (뷰포트 크기와 무관하게 스케일된다 — VisitorChart 참조 구현과 동일한 규약).
import type { LineAreaChartProps } from '../../../generated/types/LineAreaChart.types';
import './LineAreaChart.css';

/** viewBox 좌표계 — 실제 표시 크기는 CSS 가 정한다 (무단위 사용자 좌표) */
const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 220;
const PADDING_LEFT = 44;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;
const PLOT_WIDTH = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const AXIS_LABEL_SIZE = 11;
const POINT_RADIUS = 3.5;
const STROKE = 2;

/**
 * 계열 색 — chart.series-N 토큰을 순환 참조한다 (계약 tokens.lineColor / areaColor).
 * 6계열까지 서로 다른 hue 를 낸다 (TOKEN-13) — 매출/채널/상태 분포 같은 다범주 ERP 차트가
 * 3번째 계열부터 1번 색으로 되돌아오는 일이 없어야 한다.
 */
const DEFAULT_STROKE = 'var(--tds-color-chart-series-1)';
const DEFAULT_FILL = 'var(--tds-color-chart-series-1-fill)';
const SERIES_STROKE: readonly string[] = [
  DEFAULT_STROKE,
  'var(--tds-color-chart-series-2)',
  'var(--tds-color-chart-series-3)',
  'var(--tds-color-chart-series-4)',
  'var(--tds-color-chart-series-5)',
  'var(--tds-color-chart-series-6)',
];
const SERIES_FILL: readonly string[] = [
  DEFAULT_FILL,
  'var(--tds-color-chart-series-2-fill)',
  'var(--tds-color-chart-series-3-fill)',
  'var(--tds-color-chart-series-4-fill)',
  'var(--tds-color-chart-series-5-fill)',
  'var(--tds-color-chart-series-6-fill)',
];

/** 계열 인덱스 → 선/점 색 (계열이 토큰 수를 넘으면 순환) */
function strokeOf(index: number): string {
  return SERIES_STROKE[index % SERIES_STROKE.length] ?? DEFAULT_STROKE;
}

/** 계열 인덱스 → 면적 채움 색 */
function fillOf(index: number): string {
  return SERIES_FILL[index % SERIES_FILL.length] ?? DEFAULT_FILL;
}

interface XY {
  readonly x: number;
  readonly y: number;
}

/** y축 눈금 — 최댓값을 넘는 '깔끔한' 상한과 그 등분 */
function buildScale(maxValue: number): { readonly top: number; readonly ticks: readonly number[] } {
  if (maxValue <= 0) return { top: 10, ticks: [0, 5, 10] };
  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const step = Math.ceil(maxValue / (magnitude * 5)) * magnitude;
  return { top: step * 5, ticks: Array.from({ length: 6 }, (_, i) => i * step) };
}

function toPoints(values: readonly number[], top: number): readonly XY[] {
  const lastIndex = Math.max(values.length - 1, 1);
  return values.map((value, index) => ({
    x: PADDING_LEFT + (index / lastIndex) * PLOT_WIDTH,
    y: PADDING_TOP + (1 - value / top) * PLOT_HEIGHT,
  }));
}

/** Catmull-Rom → 3차 베지어 — 점을 그대로 통과하면서도 꺾이지 않는 곡선 */
function toSmoothPath(points: readonly XY[]): string {
  const first = points[0];
  if (first === undefined) return '';
  if (points.length === 1) return `M ${first.x} ${first.y}`;

  const segments = [`M ${first.x} ${first.y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    if (p0 === undefined || p1 === undefined || p2 === undefined || p3 === undefined) continue;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    segments.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
  }
  return segments.join(' ');
}

/** 곡선 아래를 baseline 까지 닫아 면적을 만든다 */
function toAreaPath(points: readonly XY[]): string {
  const line = toSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  if (line === '' || first === undefined || last === undefined) return '';
  const baseline = PADDING_TOP + PLOT_HEIGHT;
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

export function LineAreaChart({
  series,
  labels,
  showLegend = true,
  ariaLabel,
}: LineAreaChartProps) {
  const maxValue = series.reduce(
    (max, item) => item.values.reduce((inner, value) => Math.max(inner, value), max),
    0,
  );
  const { top, ticks } = buildScale(maxValue);

  const plotted = series.map((item, index) => ({
    ...item,
    stroke: strokeOf(index),
    fill: fillOf(index),
    points: toPoints(item.values, top),
  }));

  const xPositions = toPoints(
    labels.map(() => 0),
    top,
  );

  return (
    <figure className="tds-chart">
      {showLegend ? (
        <ul className="tds-chart__legend">
          {plotted.map((item) => (
            <li key={item.id} className="tds-chart__legend-item">
              <span
                className="tds-chart__legend-dot"
                style={{ background: item.stroke }}
                aria-hidden="true"
              />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      <svg
        className="tds-chart__svg"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
      >
        {/* y축 눈금선 + 라벨 */}
        {ticks.map((tick) => {
          const y = PADDING_TOP + (1 - tick / top) * PLOT_HEIGHT;
          return (
            <g key={tick}>
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={VIEW_WIDTH - PADDING_RIGHT}
                y2={y}
                stroke="var(--tds-color-chart-axis)"
                strokeWidth={1}
              />
              <text
                x={PADDING_LEFT - PADDING_RIGHT / 2}
                y={y + AXIS_LABEL_SIZE / 3}
                textAnchor="end"
                fill="var(--tds-color-chart-label)"
                fontSize={AXIS_LABEL_SIZE}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* 계열 — kind=area 는 면적 + 윤곽선, kind=line 은 선 + 점 */}
        {plotted.map((item) =>
          item.kind === 'area' ? (
            <g key={item.id}>
              <path d={toAreaPath(item.points)} fill={item.fill} />
              <path
                d={toSmoothPath(item.points)}
                fill="none"
                stroke={item.stroke}
                strokeWidth={STROKE}
              />
            </g>
          ) : (
            <g key={item.id}>
              <path
                d={toSmoothPath(item.points)}
                fill="none"
                stroke={item.stroke}
                strokeWidth={STROKE}
              />
              {item.points.map((point, index) => (
                <circle
                  key={labels[index] ?? index}
                  cx={point.x}
                  cy={point.y}
                  r={POINT_RADIUS}
                  fill={item.stroke}
                />
              ))}
            </g>
          ),
        )}

        {/* x축 라벨 */}
        {labels.map((label, index) => {
          const x = xPositions[index]?.x;
          if (x === undefined) return null;
          return (
            <text
              key={label}
              x={x}
              y={VIEW_HEIGHT - PADDING_BOTTOM / 4}
              textAnchor="middle"
              fill="var(--tds-color-chart-label)"
              fontSize={AXIS_LABEL_SIZE}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
