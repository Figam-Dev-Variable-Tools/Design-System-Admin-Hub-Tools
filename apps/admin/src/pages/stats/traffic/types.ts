// 유입 분석 도메인 타입 (A40 소유)
//
// [채널 어휘는 카페24 애널리틱스의 것을 그대로 쓴다]
//   검색엔진 · 북마크 · 외부사이트 · SNS · 광고
//
// ['북마크'가 카페24의 직접 유입이다 — 이름을 고치지 않는다]
// 이름만 보면 브라우저 즐겨찾기만 셀 것 같지만, 실제로 이 칸에 담기는 것은 **리퍼러가 없는 유입
// 전부**다: 브라우저 북마크 · 주소창 직접입력 · 앱 접속 · 리퍼러를 잃은 유입. 뜻이 '직접 유입'에
// 가깝다고 해서 라벨을 '직접 유입'으로 바꾸지 않는다 — 운영자는 카페24 화면에서 '북마크'로 보던
// 숫자를 여기서도 같은 이름으로 찾는다. 이름을 고치면 같은 값이 두 이름을 갖는다.
//
// [구매전환율 = 구매건수 ÷ 방문수 × 100 — 카페24의 정의 그대로]
// 분모는 구매건수가 아니라 **방문(유입)**이다. 분모를 주문으로 잡으면 100%를 넘는 값이 나온다.
import type { SegmentOption } from '../_shared/types';

/** 카페24 애널리틱스의 유입 채널 5종 */
export type TrafficChannel = 'search' | 'bookmark' | 'external' | 'sns' | 'ad';

interface TrafficChannelDef {
  readonly id: TrafficChannel;
  readonly label: string;
}

export const TRAFFIC_CHANNELS: readonly TrafficChannelDef[] = [
  { id: 'search', label: '검색엔진' },
  { id: 'bookmark', label: '북마크' },
  { id: 'external', label: '외부사이트' },
  { id: 'sns', label: 'SNS' },
  { id: 'ad', label: '광고' },
];

/** 유입 채널 세그먼트 — 전체 + 채널 5종 */
export type TrafficSegment = 'all' | TrafficChannel;

export const TRAFFIC_SEGMENTS: readonly SegmentOption[] = [
  { id: 'all', label: '전체' },
  ...TRAFFIC_CHANNELS,
];

export function isTrafficSegment(value: unknown): value is TrafficSegment {
  return typeof value === 'string' && TRAFFIC_SEGMENTS.some((option) => option.id === value);
}

/**
 * 드릴다운 축.
 * 검색엔진별·랜딩페이지별은 채널 세그먼트와 **독립된 축**이다 — 세그먼트가 KPI·추이를 좁히는
 * 동안에도 이 두 축은 자기 기준으로 전체를 쪼갠다 (방문자 통계의 시간대별·요일별과 같은 관계).
 */
export const TRAFFIC_BREAKDOWNS: readonly SegmentOption[] = [
  { id: 'channel', label: '채널별' },
  { id: 'engine', label: '검색엔진별' },
  { id: 'landing', label: '랜딩페이지별' },
];

/** 카페24가 유입 화면에서 함께 보여주는 지표 — 유입수·구매건수·매출액 (구매전환율은 파생) */
export interface TrafficMetrics {
  /** 유입수 — 그 경로로 들어온 방문 */
  readonly visits: number;
  readonly orders: number;
  readonly revenue: number;
}

/** 이름이 붙은 유입 한 줄 — 검색엔진별·랜딩페이지별 표의 행 */
export interface TrafficRow extends TrafficMetrics {
  readonly id: string;
  readonly label: string;
}

/** 하루치 유입 — 채널별 분해를 함께 갖는다 (세그먼트가 채널을 고른다) */
export interface TrafficDayRow extends TrafficMetrics {
  readonly id: string;
  readonly label: string;
  readonly channels: Readonly<Record<TrafficChannel, TrafficMetrics>>;
}

export interface TrafficStats {
  /** 일자별 — 추이 차트와 채널별 구성비의 원천 */
  readonly daily: readonly TrafficDayRow[];
  /** 비교 기간의 일자별. 비교 안 함이면 null */
  readonly compareDaily: readonly TrafficDayRow[] | null;
  /** 검색엔진별 — 네이버·구글·다음·기타 */
  readonly engines: readonly TrafficRow[];
  readonly landings: readonly TrafficRow[];
}

export const EMPTY_TRAFFIC_STATS: TrafficStats = {
  daily: [],
  compareDaily: null,
  engines: [],
  landings: [],
};

/** 세그먼트가 고른 채널의 지표 — 전체이거나 특정 채널 */
export function metricsOfSegment(row: TrafficDayRow, segment: TrafficSegment): TrafficMetrics {
  return segment === 'all' ? row : row.channels[segment];
}

/** 세그먼트를 적용한 기간 합계 — KPI 한 칸의 원천 */
export function totalOf(
  rows: readonly TrafficDayRow[],
  segment: TrafficSegment,
  pick: (metrics: TrafficMetrics) => number,
): number {
  return rows.reduce((sum, row) => sum + pick(metricsOfSegment(row, segment)), 0);
}

/** 한 채널의 기간 유입수 — 구성비 막대의 원천 */
export function channelVisits(rows: readonly TrafficDayRow[], channel: TrafficChannel): number {
  return rows.reduce((sum, row) => sum + row.channels[channel].visits, 0);
}

/** 구매전환율(%) = 구매건수 ÷ 방문수 × 100. 방문이 0 이면 나눌 수 없어 0 이다 */
export function conversionRate(visits: number, orders: number): number {
  return visits === 0 ? 0 : (orders / visits) * 100;
}
