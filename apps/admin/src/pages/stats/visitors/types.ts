// 방문자 통계 도메인 타입
//
// [용어는 업계 관례를 따른다 — 카페24 접속통계/애널리틱스 어휘]
//   전체 방문 수   같은 사람이 두 번 오면 2로 센다
//   순 방문자 수   중복을 제거한 실제 사람 수 (UV)
//   전체 페이지뷰  열람한 페이지 개수의 합 (PV)
//   처음 온 방문자 / 다시 온 방문자
//   재방문율       전체 방문 중 '다시 온 방문'의 비율
// '이탈률'은 쓰지 않는다 — 국내 플랫폼(카페24·메이크샵·고도몰)의 자체 통계 화면에는 없는
// 용어이고, 같은 개념을 쓰는 곳(아임웹+에이스카운터)은 '반송률'이라 부른다. 근거 없는 지표를
// 만들어 넣는 대신 실제로 집계 가능한 것만 둔다.
import type { SegmentOption } from '../_shared/types';

/** 방문자 유형 세그먼트 — 신규/재방문을 갈라 보는 것이 통계 화면의 기본 축이다 */
export type VisitorSegment = 'all' | 'new' | 'returning';

export const VISITOR_SEGMENTS: readonly SegmentOption[] = [
  { id: 'all', label: '전체' },
  { id: 'new', label: '처음 온 방문자' },
  { id: 'returning', label: '다시 온 방문자' },
];

export function isVisitorSegment(value: unknown): value is VisitorSegment {
  return typeof value === 'string' && VISITOR_SEGMENTS.some((option) => option.id === value);
}

/**
 * 드릴다운 축 — 일자별에서 시간대별·요일별로 파고든다 (카페24 고객분석과 같은 축).
 * 값을 좁히는 일은 useStatsParams 가 parseFilter 로 이미 한다(URL 은 사용자가 손댈 수 있으므로
 * 모르는 값은 첫 축으로 떨어진다). 그래서 여기 별도 타입가드를 두지 않는다 — 두면 같은 판정이
 * 두 곳에 생기고 한쪽만 갱신되는 순간 갈라진다.
 */
export const VISITOR_BREAKDOWNS: readonly SegmentOption[] = [
  { id: 'daily', label: '일자별' },
  { id: 'hourly', label: '시간대별' },
  { id: 'weekday', label: '요일별' },
];

/** 한 구간(하루·한 시간·한 요일)의 방문 지표 */
export interface VisitorRow {
  /** 구간 식별자 — 일자('2026-07-16')·시각('14')·요일('mon') */
  readonly id: string;
  /** 표에 보이는 이름 — '2026.07.16' · '14시' · '월요일' */
  readonly label: string;
  readonly visits: number;
  readonly uniqueVisitors: number;
  readonly pageViews: number;
  readonly newVisitors: number;
  readonly returningVisitors: number;
  /** 평균 체류시간(초) */
  readonly durationSeconds: number;
}

export interface VisitorStats {
  /** 일자별 — 추이 차트와 기본 표의 원천 */
  readonly daily: readonly VisitorRow[];
  /** 비교 기간의 일자별. 비교 안 함이면 null */
  readonly compareDaily: readonly VisitorRow[] | null;
  readonly hourly: readonly VisitorRow[];
  readonly weekday: readonly VisitorRow[];
}

export const EMPTY_VISITOR_STATS: VisitorStats = {
  daily: [],
  compareDaily: null,
  hourly: [],
  weekday: [],
};

/** 재방문율(%) — 전체 방문 중 '다시 온 방문'의 비율 */
export function revisitRate(rows: readonly VisitorRow[]): number {
  const visits = sumOf(rows, (row) => row.visits);
  return visits === 0 ? 0 : (sumOf(rows, (row) => row.returningVisitors) / visits) * 100;
}

/** 평균 체류시간(초) — 방문 수로 가중평균한다. 단순 평균은 방문이 적은 날을 과대평가한다 */
export function averageDuration(rows: readonly VisitorRow[]): number {
  const visits = sumOf(rows, (row) => row.visits);
  if (visits === 0) return 0;
  const weighted = rows.reduce((sum, row) => sum + row.durationSeconds * row.visits, 0);
  return weighted / visits;
}

export function sumOf(rows: readonly VisitorRow[], pick: (row: VisitorRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

/** 세그먼트가 고른 '방문 수' — 전체/처음/다시 */
export function visitsOfSegment(row: VisitorRow, segment: VisitorSegment): number {
  if (segment === 'new') return row.newVisitors;
  if (segment === 'returning') return row.returningVisitors;
  return row.visits;
}
