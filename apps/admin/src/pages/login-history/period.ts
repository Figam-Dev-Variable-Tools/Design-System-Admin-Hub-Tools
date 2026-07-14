// 기간 필터의 날짜 계산 (A40 소유 — apps/admin/src/pages/login-history/**)
//
// [왜 문자열로 다루나] 날짜는 전부 'YYYY-MM-DD'(로컬) 문자열이다 —
// 표·CSV·필터·(백엔드가 붙으면) 쿼리 파라미터가 **같은 표현**을 쓴다. 중간에 Date 로 왕복하면
// 타임존 때문에 하루가 밀린다. 비교도 문자열 사전순으로 정확하다(고정 폭 0패딩).
//
// [now 를 주입받는다] 모든 함수가 기준 시각을 인자로 받는다 — 그래야 테스트가
// '오늘'을 고정할 수 있다. 감사 로그의 기간 계산이 실행 시점에 따라 흔들리면 안 된다.
import { formatDate } from '../../shared/format';
import { PERIOD_DAYS } from './types';
import type { DateRange, PeriodId } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' (로컬) */
export function todayOf(now: Date = new Date()): string {
  return formatDate(now);
}

/** 'YYYY-MM-DD' + n일 (n < 0 이면 과거). 형식이 아니면 그대로 돌려준다 */
export function shiftDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return formatDate(new Date(parsed.getTime() + days * DAY_MS));
}

/** 양 끝 포함 일수 — 같은 날이면 1. 형식이 아니면 null */
export function dayCount(range: DateRange): number | null {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
}

/**
 * 프리셋 → 조회 구간.
 *
 * 끝은 **언제나 오늘**이다 — 감사 로그에 미래는 없다.
 * '최근 7일' 은 오늘을 포함한 7일이다 (PERIOD_DAYS 가 그 수를 갖는다).
 * 'custom' 은 여기서 만들지 않는다 — 사용자 입력이므로 validation.ts 가 검증하며 만든다.
 */
export function presetRange(
  period: Exclude<PeriodId, 'custom'>,
  now: Date = new Date(),
): DateRange {
  const to = todayOf(now);
  return { from: shiftDays(to, -(PERIOD_DAYS[period] - 1)), to };
}

/** 시도 시각(ISO date-time)이 구간 안인가 — 양 끝 포함 */
export function withinRange(occurredAtIso: string, range: DateRange): boolean {
  const day = occurredAtIso.slice(0, 10);
  return day >= range.from && day <= range.to;
}
