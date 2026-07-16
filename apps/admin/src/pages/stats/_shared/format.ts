// 통계 표시 포맷 — 지표 단위 · 증감(delta) (A40 소유 — apps/admin/src/pages/stats/**)
//
// [왜 여기 있나] 6개 통계 화면이 같은 규칙으로 숫자를 보여준다. 단위를 화면마다 인라인으로
// 붙이면 '원'이 어디는 붙고 어디는 안 붙는 drift 가 난다 (ERP-08).
//
// [shared/format.ts 와의 관계] 천 단위 구분(formatNumber)·부호(formatSignedNumber)는 앱 공통
// 포매터를 **그대로 쓴다**. 여기 있는 것은 앱 공통에 **없는 것**뿐이다: 금액(원)·비율(%)·
// 체류시간(초)·증감 계산. 앱 공통에 formatWon 은 존재하지 않고, 존재하는 유일한 구현은
// pages/sales/_shared/business.ts 라서 가져올 수 없다 — 페이지 간 import 는 A83 축1 blocker 다.
// (보고: 이 넷은 shared/format 으로 올라가야 한다 — 지금은 shared/** 를 건드릴 수 없다.)
//
// [ERP-07 — 금액 단위 분리] 우측 정렬 금액 칸에 '원'을 붙이면 단위가 마지막 자릿수를 따라다녀
// tabular-nums 세로 정렬이 깨진다. 그래서 **표의 금액 칸은 숫자만** 담고 단위는 컬럼 헤더가
// 이름표로 갖는다('매출액 (원)'). formatWonValue 가 숫자만 내는 이유다.
import { formatNumber } from '../../../shared/format';

/** 지표 단위 — 표시 포맷의 단일 원천 */
export type MetricUnit = 'count' | 'people' | 'won' | 'percent' | 'seconds';

/** 컬럼 헤더에 붙는 단위 이름표 — 값이 아니라 헤더가 단위를 갖는다 (ERP-07) */
const UNIT_SUFFIX: Readonly<Record<MetricUnit, string>> = {
  count: '건',
  people: '명',
  won: '원',
  percent: '%',
  seconds: '',
};

/** '매출액' + won → '매출액 (원)' */
export function withUnitSuffix(header: string, unit: MetricUnit): string {
  const suffix = UNIT_SUFFIX[unit];
  return suffix === '' ? header : `${header} (${suffix})`;
}

/** 금액 — 숫자만. 단위는 헤더/라벨이 갖는다 (ERP-07) */
export function formatWonValue(amount: number): string {
  return formatNumber(Math.round(amount));
}

/** 비율 — 소수 첫째 자리. '12.3' (단위는 헤더가 갖는다) */
export function formatPercentValue(ratio: number): string {
  return ratio.toFixed(1);
}

/** 체류시간 — '3분 24초' / '24초' */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${String(rest)}초`;
  return `${String(minutes)}분 ${String(rest)}초`;
}

/** 단위까지 붙인 완성형 — KPI 카드처럼 헤더가 없는 자리에서 쓴다 */
export function formatMetric(value: number, unit: MetricUnit): string {
  switch (unit) {
    case 'won':
      return `${formatWonValue(value)}원`;
    case 'percent':
      return `${formatPercentValue(value)}%`;
    case 'seconds':
      return formatDuration(value);
    case 'people':
      return `${formatNumber(value)}명`;
    default:
      return `${formatNumber(value)}건`;
  }
}

/* ── 증감(delta) ─────────────────────────────────────────────────────────── */

type DeltaDirection = 'up' | 'down' | 'flat';

/** 증감의 '좋음/나쁨' — 색과 아이콘이 여기서 갈린다 */
export type DeltaTone = 'positive' | 'negative' | 'neutral';

export interface Delta {
  readonly direction: DeltaDirection;
  /** 증감률(%). 직전 값이 0 이면 나눌 수 없어 null — '—' 로 표시한다 */
  readonly percent: number | null;
  readonly diff: number;
  readonly tone: DeltaTone;
}

/**
 * 현재 vs 비교 기간.
 *
 * @param isLowerBetter 낮을수록 좋은 지표(이탈률·취소율·탈퇴)는 증가가 '나쁨'이다 —
 *                      색을 뒤집지 않으면 이탈률 상승이 초록으로 보인다.
 */
export function deltaOf(current: number, previous: number, isLowerBetter = false): Delta {
  const diff = current - previous;
  const direction: DeltaDirection = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  // 직전이 0 이면 증감률은 정의되지 않는다 (0 → 5 는 '무한 % 증가'가 아니다)
  const percent = previous === 0 ? null : (diff / Math.abs(previous)) * 100;

  const isGood = isLowerBetter ? diff < 0 : diff > 0;
  const tone: DeltaTone = diff === 0 ? 'neutral' : isGood ? 'positive' : 'negative';

  return { direction, percent, diff, tone };
}

/** '▲ 12.3%' / '▼ 4.0%' / '변동 없음' / '—' (비교 불가) */
export function formatDeltaPercent(delta: Delta): string {
  if (delta.direction === 'flat') return '변동 없음';
  if (delta.percent === null) return '—';
  const arrow = delta.direction === 'up' ? '▲' : '▼';
  return `${arrow} ${Math.abs(delta.percent).toFixed(1)}%`;
}

/** 스크린리더용 — 화살표는 읽히지 않으므로 말로 푼다 (A11Y: 색·기호만으로 전달 금지) */
export function describeDelta(delta: Delta, unit: MetricUnit): string {
  if (delta.direction === 'flat') return '비교 기간과 변동 없음';
  const word = delta.direction === 'up' ? '증가' : '감소';
  const amount = formatMetric(Math.abs(delta.diff), unit);
  if (delta.percent === null) return `비교 기간 대비 ${amount} ${word}`;
  return `비교 기간 대비 ${Math.abs(delta.percent).toFixed(1)}% (${amount}) ${word}`;
}

/* ── 구성비 ─────────────────────────────────────────────────────────────── */

/** 항목 값 / 전체 — 전체가 0 이면 0 (0으로 나누지 않는다) */
export function shareOf(value: number, total: number): number {
  return total === 0 ? 0 : (value / total) * 100;
}
