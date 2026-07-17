// 기간 프리셋 → 조회 구간
//
// ─────────────────────────────────────────────────────────────────────────────
// [ERP-09 — 이 화면은 타임존을 틀리고 있었다]
//
// 이 파일에는 달력 산술의 **세 번째 사본**이 있었고, 셋 중 유일하게 **브라우저 로컬**이었다.
// 두 군데가 틀렸다:
//
//   ① 'YYYY-MM-DD' 를 `new Date(`${date}T00:00:00`)` 로 되읽었다 — 오프셋이 없는 ISO 는
//      **로컬 자정**으로 파싱된다. 그래서 '최근 7일'이 보는 사람의 노트북 시계를 따라갔다.
//   ② `withinRange` 가 `occurredAtIso.slice(0, 10)` 이었다. 문자열을 잘라 날짜를 얻은 것이다.
//      UTC 로 저장된 '2026-07-14T22:00:00Z' 는 KST 로 **7월 15일 오전 7시**인데, 잘라 쓰면
//      7월 14일로 접수된다. **'오늘' 필터가 오늘 아침의 로그인을 어제로 보냈다** — 감사 화면에서
//      이것은 표기 오류가 아니라 **사건을 놓치는 일**이다.
//
// 이제 산술도 달력일 환산도 shared/format.ts 한 벌을 쓴다 (판정과 근거는 그 파일 머리말).
// 여기 남는 것은 이 화면 고유의 것 — **프리셋 id 와 그 구간**뿐이다.
//
// [now 를 주입받는다] 모든 함수가 기준 시각을 인자로 받는다 — 그래야 테스트가
// '오늘'을 고정할 수 있다. 감사 로그의 기간 계산이 실행 시점에 따라 흔들리면 안 된다.
// ─────────────────────────────────────────────────────────────────────────────
import { formatDate, seoulDayOf, shiftDays } from '../../shared/format';
import { PERIOD_DAYS } from './types';
import type { DateRange, PeriodId } from './types';

/**
 * 프리셋 → 조회 구간.
 *
 * 끝은 **언제나 오늘**이다 — 감사 로그에 미래는 없다. 그 '오늘'은 **서울의 오늘**이다
 * (formatDate 는 KST 고정이다 — ERP-09).
 * '최근 7일' 은 오늘을 포함한 7일이다 (PERIOD_DAYS 가 그 수를 갖는다).
 * 'custom' 은 여기서 만들지 않는다 — 사용자 입력이므로 validation.ts 가 검증하며 만든다.
 */
export function presetRange(
  period: Exclude<PeriodId, 'custom'>,
  now: Date = new Date(),
): DateRange {
  const to = formatDate(now);
  return { from: shiftDays(to, -(PERIOD_DAYS[period] - 1)), to };
}

/**
 * 시도 시각(ISO date-time)이 구간 안인가 — 양 끝 포함.
 *
 * 비교는 **KST 달력일**로 한다. 자르기(slice)가 아니다 — 머리말 ② 가 그 이유다.
 * 읽을 수 없는 시각은 구간 밖으로 본다: 날짜를 모르는 기록을 '이 기간의 것'이라 우길 수 없다.
 */
export function withinRange(occurredAtIso: string, range: DateRange): boolean {
  const day = seoulDayOf(occurredAtIso);
  if (day === null) return false;
  return day >= range.from && day <= range.to;
}
