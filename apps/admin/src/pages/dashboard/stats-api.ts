// 통계 섹션 로컬 mock API (A40 소유)
//
// 백엔드가 붙으면 fetchStats 내부만 교체한다.
//
// 재현용 쿼리 파라미터 (./api.ts 의 readMockOptions 패턴을 그대로 따른다)
//   statsDelay=<ms>  통계 조회 지연 (기본 400ms) — 로딩 스켈레톤(EL-034 · EL-039)·토글 잠금(EL-029)
//   statsError=1     통계 조회 실패 → StatsApiError — 카드별 에러 문구(EL-035 · EL-040)
//   statsEmpty=1     계열·행·합계 0건 — 빈 상태(EL-027 · EL-032 하한 규칙 · EL-037 · EL-038)
//
// 탭 데이터(api.ts)의 delay/error/empty 와 **키를 분리한다** — 두 조회는 독립이고
// (FS-002 §4.1 "한쪽 실패가 다른 쪽을 가리지 않는다") 한쪽만 실패시키는 재현이 가능해야 한다.
import { STATS_RANGES } from './stats-types';
import type { PeriodRow, PeriodSummary, StatsData, StatsRange, VisitorPoint } from './stats-types';

class StatsApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatsApiError';
  }
}

interface StatsMockOptions {
  readonly delayMs: number;
  readonly shouldFail: boolean;
  readonly isEmpty: boolean;
}

function readMockOptions(): StatsMockOptions {
  const params = new URLSearchParams(window.location.search);
  const rawDelay = Number(params.get('statsDelay'));
  return {
    delayMs: Number.isFinite(rawDelay) && rawDelay > 0 ? rawDelay : 400,
    shouldFail: params.get('statsError') === '1',
    isEmpty: params.get('statsEmpty') === '1',
  };
}

/** 빈 상태 재현용 — 계열·일자 행·합계 행을 전부 비운다 */
const EMPTY_STATS: StatsData = {
  visitors: [],
  periodRows: [],
  summaries: [],
};

/** 기간별로 x축 라벨과 표본 수가 달라진다 */
const VISITOR_SERIES: Record<StatsRange, readonly VisitorPoint[]> = {
  day: [
    { label: '7.8', visitors: 18, pageViews: 62 },
    { label: '7.9', visitors: 8, pageViews: 430 },
    { label: '7.10', visitors: 17, pageViews: 210 },
    { label: '7.11', visitors: 1, pageViews: 6 },
    { label: '7.12', visitors: 7, pageViews: 24 },
    { label: '7.13', visitors: 8, pageViews: 72 },
    { label: '7.14', visitors: 9, pageViews: 18 },
  ],
  week: [
    { label: '6월 3주', visitors: 42, pageViews: 310 },
    { label: '6월 4주', visitors: 61, pageViews: 520 },
    { label: '7월 1주', visitors: 55, pageViews: 480 },
    { label: '7월 2주', visitors: 68, pageViews: 822 },
  ],
  month: [
    { label: '3월', visitors: 180, pageViews: 1240 },
    { label: '4월', visitors: 240, pageViews: 1810 },
    { label: '5월', visitors: 205, pageViews: 1520 },
    { label: '6월', visitors: 260, pageViews: 2100 },
    { label: '7월', visitors: 80, pageViews: 940 },
  ],
};

const PERIOD_ROWS: readonly PeriodRow[] = [
  { date: '2026-07-14', orders: 0, revenue: 0, visitors: 9, signups: 0, inquiries: 0, reviews: 0 },
  { date: '2026-07-13', orders: 0, revenue: 0, visitors: 8, signups: 0, inquiries: 0, reviews: 0 },
  { date: '2026-07-12', orders: 0, revenue: 0, visitors: 7, signups: 0, inquiries: 0, reviews: 0 },
  { date: '2026-07-11', orders: 0, revenue: 0, visitors: 1, signups: 0, inquiries: 0, reviews: 0 },
  { date: '2026-07-10', orders: 1, revenue: 1, visitors: 17, signups: 0, inquiries: 0, reviews: 0 },
  {
    date: '2026-07-09',
    orders: 1,
    revenue: 150003,
    visitors: 8,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  { date: '2026-07-08', orders: 0, revenue: 0, visitors: 18, signups: 0, inquiries: 0, reviews: 0 },
];

const SUMMARIES: readonly PeriodSummary[] = [
  {
    label: '최근 7일 합계',
    orders: 2,
    revenue: 150004,
    visitors: 68,
    signups: 0,
    inquiries: 0,
    reviews: 0,
  },
  {
    label: '이번달 합계',
    orders: 12,
    revenue: 600022,
    visitors: 80,
    signups: 4,
    inquiries: 3,
    reviews: 2,
  },
];

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('요청이 취소되었습니다.', 'AbortError'));
      },
      { once: true },
    );
  });
}

function isStatsRange(value: string): value is StatsRange {
  return STATS_RANGES.some((range) => range.id === value);
}

export async function fetchStats(range: StatsRange, signal: AbortSignal): Promise<StatsData> {
  const options = readMockOptions();
  await wait(options.delayMs, signal);

  if (options.shouldFail) {
    throw new StatsApiError('통계를 불러오지 못했습니다.');
  }
  if (options.isEmpty) return EMPTY_STATS;

  const key: StatsRange = isStatsRange(range) ? range : 'day';
  return {
    visitors: VISITOR_SERIES[key],
    periodRows: PERIOD_ROWS,
    summaries: SUMMARIES,
  };
}
