// 예약 달력·시간슬롯 순수 헬퍼 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// [라이브러리 없이 직접] 날짜/시간 계산은 전부 순수 함수다(외부 캘린더 라이브러리 미도입 —
// shared/format.ts 가 이미 날짜 포매팅을 손으로 구현한 선례를 따른다). 예약 일정의 일/주 뷰,
// 더블부킹 판정(시간 겹침), 과거 일시 판정이 여기 한 곳을 쓴다. 모두 순수라 테스트로 고정한다.
//
// [표기 규약] 날짜는 'YYYY-MM-DD', 시각은 'HH:mm'(24시간). 로컬 타임존 기준.

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 시각('HH:mm')을 자정 기준 분으로 — 겹침 판정·정렬에 쓴다. 형식이 어긋나면 NaN */
export function toMinutes(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (match === null) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return Number.NaN;
  return hours * 60 + minutes;
}

/** 두 시간 구간이 겹치는가(분 단위, 경계 접함은 겹침 아님: [09,10)·[10,11) 은 안 겹침) */
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** 'YYYY-MM-DD' → Date(로컬 자정). 형식이 어긋나면 Invalid Date */
function parseDate(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (match === null) return new Date(Number.NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** 실재하는 날짜 문자열인가('YYYY-MM-DD' + 달력상 존재) */
export function isRealDate(date: string): boolean {
  const parsed = parseDate(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return toDateString(parsed) === date.trim();
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Date → 'YYYY-MM-DD'(로컬) */
export function toDateString(date: Date): string {
  return `${String(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 'YYYY-MM-DD' 에 일수를 더한다(음수 가능) */
export function addDays(date: string, days: number): string {
  const base = parseDate(date);
  if (Number.isNaN(base.getTime())) return date;
  base.setDate(base.getDate() + days);
  return toDateString(base);
}

/** 그 주의 월요일('YYYY-MM-DD') — 주 뷰의 시작 열 */
export function startOfWeek(date: string): string {
  const base = parseDate(date);
  if (Number.isNaN(base.getTime())) return date;
  // getDay(): 0=일 … 6=토. 월요일 시작이므로 일요일은 6칸 뒤로.
  const offset = (base.getDay() + 6) % 7;
  return addDays(date, -offset);
}

/** 월~일 7일치 날짜 배열 — 주 뷰의 열 */
export function weekDates(anchor: string): readonly string[] {
  const monday = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** 요일 라벨('월'·'화' …) */
export function weekdayLabel(date: string): string {
  const parsed = parseDate(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return WEEKDAY_LABELS[parsed.getDay()] ?? '';
}

/** 사람이 읽는 날짜 — '7월 14일 (월)' */
export function formatDayLabel(date: string): string {
  const parsed = parseDate(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${String(parsed.getMonth() + 1)}월 ${String(parsed.getDate())}일 (${weekdayLabel(date)})`;
}

/** 오늘인가(주입된 now 기준 — 테스트 고정 가능) */
export function isToday(date: string, now: Date = new Date()): boolean {
  return date === toDateString(now);
}

/**
 * 날짜+시각이 과거인가 — 과거 일시 예약을 막는 경계값 판정.
 * now 는 테스트에서 고정할 수 있게 주입 가능(기본은 현재 시각).
 */
export function isPastDateTime(date: string, time: string, now: Date = new Date()): boolean {
  const base = parseDate(date);
  const minutes = toMinutes(time);
  if (Number.isNaN(base.getTime()) || Number.isNaN(minutes)) return false;
  base.setMinutes(base.getMinutes() + minutes);
  return base.getTime() < now.getTime();
}
