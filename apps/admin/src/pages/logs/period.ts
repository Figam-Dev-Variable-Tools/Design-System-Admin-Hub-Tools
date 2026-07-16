// 기간 프리셋 → 조회 구간 (apps/admin/src/pages/logs/**)
//
// [now 를 주입받는다] 모든 함수가 기준 시각을 인자로 받는다 — 그래야 테스트가 '오늘'을
// 고정할 수 있다. 감사 로그의 기간 계산이 실행 시점에 따라 흔들리면 안 된다.
//
// [달력일은 KST 다] 프리셋의 '오늘'은 **서울의 오늘**이다 (./time.ts — ERP-09).
// 브라우저가 어느 타임존에 있든 같은 구간이 나온다.
import { kstDayOf, kstToday, shiftDays } from './time';
import { PERIOD_DAYS } from './types';
import type { DateRange, PeriodId } from './types';

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
  const to = kstToday(now);
  return { from: shiftDays(to, -(PERIOD_DAYS[period] - 1)), to };
}

/**
 * 그 사건이 구간 안인가 — 양 끝 포함.
 * 비교는 **KST 달력일** 로 한다 (UTC 로 저장된 새벽 사건이 하루 밀리지 않게 한다).
 */
export function withinRange(occurredAtIso: string, range: DateRange): boolean {
  const day = kstDayOf(occurredAtIso);
  if (day === null) return false;
  return day >= range.from && day <= range.to;
}
