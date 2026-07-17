// 예약 달력·시간슬롯 순수 헬퍼
//
// [라이브러리 없이 직접] 날짜/시간 계산은 전부 순수 함수다(외부 캘린더 라이브러리 미도입 —
// shared/format.ts 가 이미 날짜 포매팅을 손으로 구현한 선례를 따른다). 예약 일정의 일/주 뷰,
// 더블부킹 판정(시간 겹침), 과거 일시 판정이 여기 한 곳을 쓴다. 모두 순수라 테스트로 고정한다.
//
// [표기 규약] 날짜는 'YYYY-MM-DD', 시각은 'HH:mm'(24시간).
//
// ─────────────────────────────────────────────────────────────────────────────
// [타임존 — 무엇이 로컬이고 무엇이 아닌가 (ERP-09)]
//
// 이 파일의 날짜 문자열 산술(addDays·startOfWeek·weekDates·weekdayLabel·formatDayLabel·
// isRealDate)은 **타임존과 무관하다.** parseDate 가 로컬 파츠로 Date 를 만들고 toDateString 이
// 로컬 게터로 되읽으므로 오프셋이 상쇄된다 — 들어온 문자열과 나가는 문자열 사이에 순간(instant)이
// 개입하지 않는다. 실측으로 확인했다: 1990~2033 의 16,000일 × 10개 타임존(UTC·서울·뉴욕·
// Midway(-11)·Santiago/Tehran/Havana(자정 DST)·Lord_Howe(+10:30)·Chatham(+12:45)·베를린)에서
// 전 출력이 **바이트 단위로 동일**했다. 그래서 이 함수들은 UTC 정오 표현으로 바꿔도 얻는 것이 없다.
//
// 타임존이 개입하는 것은 **실재하는 순간(now)을 달력 날짜로 떨어뜨릴 때**뿐이다 — isToday 와
// isPastDateTime. 그 둘은 브라우저 로컬 기준으로 판정하고 있었고, 그것은 앱 정책과 어긋난다
// (shared/format 머리말: "표시 타임존은 Asia/Seoul 로 고정한다 — 보는 사람이 정하지 않는다").
// 베를린 운영자에게 이미 30분 지난 07:00 슬롯이 예약 가능으로 보였고, 뉴욕 운영자의 달력에서는
// '오늘' 배지가 엉뚱한 칸에 붙었다. 그 둘만 KST 로 고정한다.
// ─────────────────────────────────────────────────────────────────────────────
import { formatDate } from '../../../shared/format';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/**
 * 예약 슬롯의 벽시계 시각(KST)을 실재하는 순간으로 — 'YYYY-MM-DD' + 'HH:mm' → epoch ms.
 *
 * 예약 시각은 **서울의 벽시계**다('7월 18일 07:00' 은 어디서 보든 KST 07:00 이다). 한국은
 * 서머타임이 없으므로 고정 오프셋 +09:00 이 정확하다. 읽을 수 없으면 NaN.
 */
function seoulInstantOf(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00+09:00`);
}

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

/**
 * 오늘인가 — **서울의 오늘**(주입된 now 기준 · 테스트 고정 가능).
 *
 * toDateString(now) 로 판정하면 보는 사람의 OS 타임존이 '오늘'을 정한다 — 뉴욕 운영자의
 * 달력에서는 '오늘' 배지가 하루 어긋난 칸에 붙는다. 기준은 shared/format 한 벌이다.
 */
export function isToday(date: string, now: Date = new Date()): boolean {
  return date === formatDate(now);
}

/**
 * 날짜+시각이 과거인가 — 과거 일시 예약을 막는 경계값 판정.
 * now 는 테스트에서 고정할 수 있게 주입 가능(기본은 현재 시각).
 *
 * 예약 시각은 서울의 벽시계이므로 KST 로 고정한 순간과 비교한다. 로컬 파츠로 Date 를 만들어
 * 비교하면 베를린 운영자에게 **이미 지난 슬롯이 예약 가능으로** 보인다(07:30 KST 에 07:00 슬롯이
 * 미래로 판정됐다) — 그 예약은 서버에서 거절되거나, 더 나쁘게는 과거로 들어간다.
 */
export function isPastDateTime(date: string, time: string, now: Date = new Date()): boolean {
  const instant = seoulInstantOf(date, time);
  if (Number.isNaN(instant) || Number.isNaN(toMinutes(time))) return false;
  return instant < now.getTime();
}
