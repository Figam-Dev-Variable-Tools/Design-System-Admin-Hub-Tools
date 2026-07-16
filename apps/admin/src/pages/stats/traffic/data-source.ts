// 유입 분석 조회 — 픽스처 (A40 소유)
//
// [백엔드 0] 지금은 결정론적 픽스처다. 백엔드가 붙으면 buildStats 안쪽만 fetch 로 바꾼다 —
// 지연·실패·빈 상태의 재현 경로(_shared/mock.ts)와 화면은 그대로다.
//
// TODO(backend): GET /api/stats/traffic?start&end&channel
// TODO(backend): GET /api/stats/traffic/engines?start&end
// TODO(backend): GET /api/stats/traffic/landings?start&end
import { eachDay, formatDayLabel } from '../_shared/period';
import type { StatsPeriod } from '../_shared/period';
import { loadStats, seededRandom, seededSeries } from '../_shared/mock';
import { EMPTY_TRAFFIC_STATS } from './types';
import type {
  TrafficChannel,
  TrafficDayRow,
  TrafficMetrics,
  TrafficRow,
  TrafficStats,
} from './types';

const SCOPE = 'stats-traffic';

/** 채널별 유입 비중 — 합이 1 이다. 검색엔진이 가장 두껍고 광고가 가장 얇은 국내 쇼핑몰의 모양 */
const CHANNEL_WEIGHTS: Readonly<Record<TrafficChannel, number>> = {
  search: 0.38,
  bookmark: 0.22,
  external: 0.16,
  sns: 0.15,
  ad: 0.09,
};

/**
 * 채널별 구매전환율 대역.
 * 북마크(= 리퍼러 없는 직접 유입)가 가장 높다 — 주소를 외워 찾아오는 사람은 이미 아는 고객이다.
 * 광고·SNS 는 낮다 — 아직 사려고 온 게 아니라 보러 온 유입이 섞인다.
 * 채널마다 같은 값을 주면 '어느 채널이 실제로 파는가'라는 이 화면의 물음이 사라진다.
 */
const CHANNEL_CONVERSION: Readonly<Record<TrafficChannel, number>> = {
  search: 0.021,
  bookmark: 0.045,
  external: 0.018,
  sns: 0.012,
  ad: 0.009,
};

interface BreakdownDef {
  readonly id: string;
  readonly label: string;
  /** 전체 대비 비중 */
  readonly share: number;
  /** 구매전환율 — 항목마다 다르다 */
  readonly rate: number;
}

/**
 * 검색엔진별 — 국내 점유율 순서.
 *
 * [구글의 참조검색어] 구글은 개인정보 보호정책에 따라 검색어를 리퍼러로 넘기지 않는다. 그래서
 * 카페24는 구글 유입의 검색어를 '참조검색어 없음'으로 집계한다. **유입수 자체는 정상으로 잡히고
 * 검색어만 비는 것**이라, 이 표는 유입수·구매건수·매출액·구매전환율만 갖고 검색어 컬럼을 두지
 * 않는다. 검색어는 검색어 분석(/stats/keywords) 의 일이다.
 */
const SEARCH_ENGINES: readonly BreakdownDef[] = [
  { id: 'naver', label: '네이버', share: 0.52, rate: 0.024 },
  { id: 'google', label: '구글', share: 0.3, rate: 0.019 },
  { id: 'daum', label: '다음', share: 0.12, rate: 0.016 },
  { id: 'etc', label: '기타', share: 0.06, rate: 0.011 },
];

/** 랜딩페이지 — 유입이 처음 닿는 페이지. 상품 상세로 바로 떨어진 유입이 가장 잘 산다 */
const LANDING_PAGES: readonly BreakdownDef[] = [
  { id: 'home', label: '메인 페이지 (/)', share: 0.34, rate: 0.018 },
  { id: 'best', label: '베스트 상품 (/product/best)', share: 0.18, rate: 0.028 },
  { id: 'new', label: '신상품 (/product/new)', share: 0.14, rate: 0.022 },
  { id: 'detail', label: '상품 상세 (/product/detail)', share: 0.13, rate: 0.041 },
  { id: 'event', label: '이벤트 (/board/event)', share: 0.11, rate: 0.013 },
  { id: 'search', label: '상품 검색 결과 (/product/search)', share: 0.06, rate: 0.034 },
  { id: 'login', label: '로그인 (/member/login)', share: 0.04, rate: 0.052 },
];

/** 유입수 → 구매건수·매출액. 객단가는 3.2만~5.2만 원 대역이다 */
function metricsOf(visits: number, rate: number, seed: string): TrafficMetrics {
  const random = seededRandom(seed);
  const orders = Math.round(visits * rate * (0.8 + random() * 0.4));
  return { visits, orders, revenue: Math.round(orders * (32000 + random() * 20000)) };
}

function channelsOf(visits: number, day: string): Readonly<Record<TrafficChannel, TrafficMetrics>> {
  const random = seededRandom(`c:${day}`);
  // 비중에 ±15% 흔들림 — 날마다 같은 비율이면 '채널별'이 날짜와 무관해 보인다
  const split = (weight: number): number => Math.round(visits * weight * (0.85 + random() * 0.3));

  return {
    search: metricsOf(split(CHANNEL_WEIGHTS.search), CHANNEL_CONVERSION.search, `m:search:${day}`),
    bookmark: metricsOf(
      split(CHANNEL_WEIGHTS.bookmark),
      CHANNEL_CONVERSION.bookmark,
      `m:bookmark:${day}`,
    ),
    external: metricsOf(
      split(CHANNEL_WEIGHTS.external),
      CHANNEL_CONVERSION.external,
      `m:external:${day}`,
    ),
    sns: metricsOf(split(CHANNEL_WEIGHTS.sns), CHANNEL_CONVERSION.sns, `m:sns:${day}`),
    ad: metricsOf(split(CHANNEL_WEIGHTS.ad), CHANNEL_CONVERSION.ad, `m:ad:${day}`),
  };
}

function dayRowOf(day: string, visits: number): TrafficDayRow {
  const channels = channelsOf(visits, day);
  const parts = [channels.search, channels.bookmark, channels.external, channels.sns, channels.ad];

  // 하루 전체는 채널 합으로 낸다 — 따로 계산하면 KPI(전체)와 채널별 구성비가 서로 다른 말을 한다
  return {
    id: day,
    label: formatDayLabel(day),
    visits: parts.reduce((sum, part) => sum + part.visits, 0),
    orders: parts.reduce((sum, part) => sum + part.orders, 0),
    revenue: parts.reduce((sum, part) => sum + part.revenue, 0),
    channels,
  };
}

function dailyRowsOf(period: StatsPeriod): readonly TrafficDayRow[] {
  const days = eachDay(period);
  const visits = seededSeries(SCOPE, days, 4200, 1600);
  return days.map((day, index) => dayRowOf(day, visits[index] ?? 0));
}

/** 검색엔진별·랜딩페이지별은 모양이 같다 — 비중으로 쪼개고 항목별 전환율을 입힌다 */
function breakdownRowsOf(
  defs: readonly BreakdownDef[],
  totalVisits: number,
  seed: string,
): readonly TrafficRow[] {
  return defs.map((def) => ({
    id: def.id,
    label: def.label,
    ...metricsOf(Math.round(totalVisits * def.share), def.rate, `${seed}:${def.id}`),
  }));
}

/** 호출부는 객체 리터럴로 넘긴다 — 공개 표면을 넓히지 않으려고 export 하지 않는다 */
interface TrafficQuery {
  readonly period: StatsPeriod;
  readonly comparePeriod: StatsPeriod | null;
}

export function fetchTrafficStats(query: TrafficQuery, signal: AbortSignal): Promise<TrafficStats> {
  return loadStats<TrafficStats>(
    SCOPE,
    signal,
    () => {
      const daily = dailyRowsOf(query.period);
      // 검색엔진별의 모수는 전체 유입이 아니라 **검색엔진 채널의 유입**이다
      const searchVisits = daily.reduce((sum, row) => sum + row.channels.search.visits, 0);
      const visits = daily.reduce((sum, row) => sum + row.visits, 0);

      return {
        daily,
        compareDaily: query.comparePeriod === null ? null : dailyRowsOf(query.comparePeriod),
        engines: breakdownRowsOf(SEARCH_ENGINES, searchVisits, 'e'),
        landings: breakdownRowsOf(LANDING_PAGES, visits, 'l'),
      };
    },
    () => EMPTY_TRAFFIC_STATS,
  );
}
