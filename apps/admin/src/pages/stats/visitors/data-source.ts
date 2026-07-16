// 방문자 통계 조회 — 픽스처 (A40 소유)
//
// [백엔드 0] 지금은 결정론적 픽스처다. 백엔드가 붙으면 buildStats 안쪽만 fetch 로 바꾼다 —
// 지연·실패·빈 상태의 재현 경로(_shared/mock.ts)와 화면은 그대로다.
//
// TODO(backend): GET /api/stats/visitors?start&end&segment
// TODO(backend): GET /api/stats/visitors/hourly?start&end
// TODO(backend): GET /api/stats/visitors/weekday?start&end
import { eachDay, formatDayLabel } from '../_shared/period';
import type { StatsPeriod } from '../_shared/period';
import { loadStats, seededRandom, seededSeries } from '../_shared/mock';
import { EMPTY_VISITOR_STATS } from './types';
import type { VisitorRow, VisitorStats } from './types';

const SCOPE = 'stats-visitors';

/** 요일 이름 — 표의 요일별 축 */
const WEEKDAY_LABELS: readonly string[] = [
  '일요일',
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
  '토요일',
];

const WEEKDAY_IDS: readonly string[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** 시간대 곡선 — 새벽은 바닥, 점심·저녁에 봉우리. 평평한 픽스처는 '시간대별'을 무의미하게 만든다 */
const HOUR_WEIGHTS: readonly number[] = [
  0.2, 0.12, 0.08, 0.06, 0.05, 0.06, 0.12, 0.28, 0.45, 0.62, 0.74, 0.85, 0.92, 0.86, 0.8, 0.78,
  0.76, 0.8, 0.9, 1.0, 0.98, 0.86, 0.62, 0.36,
];

function rowOf(id: string, label: string, visits: number, seed: string): VisitorRow {
  const random = seededRandom(seed);
  // 재방문 비중은 35~55% 사이 — 커머스의 현실적인 대역
  const returningVisitors = Math.round(visits * (0.35 + random() * 0.2));
  const newVisitors = visits - returningVisitors;
  // 순 방문자는 방문 수보다 작거나 같다 (같은 사람의 재방문이 겹친다)
  const uniqueVisitors = Math.max(newVisitors, Math.round(visits * (0.78 + random() * 0.15)));
  return {
    id,
    label,
    visits,
    uniqueVisitors,
    pageViews: Math.round(visits * (2.4 + random() * 3.2)),
    newVisitors,
    returningVisitors,
    durationSeconds: Math.round(70 + random() * 210),
  };
}

function dailyRowsOf(period: StatsPeriod): readonly VisitorRow[] {
  const days = eachDay(period);
  const visits = seededSeries(SCOPE, days, 320, 180);
  return days.map((day, index) => rowOf(day, formatDayLabel(day), visits[index] ?? 0, `v:${day}`));
}

function hourlyRowsOf(daily: readonly VisitorRow[]): readonly VisitorRow[] {
  const totalVisits = daily.reduce((sum, row) => sum + row.visits, 0);
  const weightSum = HOUR_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  return HOUR_WEIGHTS.map((weight, hour) => {
    const visits = weightSum === 0 ? 0 : Math.round((totalVisits * weight) / weightSum);
    return rowOf(String(hour), `${String(hour)}시`, visits, `h:${String(hour)}`);
  });
}

function weekdayRowsOf(daily: readonly VisitorRow[]): readonly VisitorRow[] {
  return WEEKDAY_IDS.map((id, index) => {
    // 같은 요일의 방문을 모아 평균한다 — '화요일이 원래 센가?'에 답하는 축이다
    const sameWeekday = daily.filter(
      (row) => new Date(`${row.id}T00:00:00Z`).getUTCDay() === index,
    );
    const visits =
      sameWeekday.length === 0
        ? 0
        : Math.round(sameWeekday.reduce((sum, row) => sum + row.visits, 0) / sameWeekday.length);
    return rowOf(id, WEEKDAY_LABELS[index] ?? id, visits, `w:${id}`);
  });
}

interface VisitorQuery {
  readonly period: StatsPeriod;
  readonly comparePeriod: StatsPeriod | null;
}

export function fetchVisitorStats(query: VisitorQuery, signal: AbortSignal): Promise<VisitorStats> {
  return loadStats<VisitorStats>(
    SCOPE,
    signal,
    () => {
      const daily = dailyRowsOf(query.period);
      return {
        daily,
        compareDaily: query.comparePeriod === null ? null : dailyRowsOf(query.comparePeriod),
        hourly: hourlyRowsOf(daily),
        weekday: weekdayRowsOf(daily),
      };
    },
    () => EMPTY_VISITOR_STATS,
  );
}
