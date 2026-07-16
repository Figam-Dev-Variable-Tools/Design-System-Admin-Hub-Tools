// 시각 표기 정책 — **고정 표시 타임존** (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [ERP-09 — 왜 shared/format.formatDateTime 을 쓰지 않는가]
//
// `shared/format` 의 날짜 함수는 브라우저 로컬 게터(getFullYear/getHours)로 만들어졌다.
// 즉 **보는 사람의 OS 타임존이 곧 표시 기준**이다. 회원 가입일에는 그럭저럭 통하지만
// 감사 로그에서는 통하지 않는다:
//
//   · 서울의 운영자와 베를린의 운영자가 **같은 사건을 다른 시각으로** 본다.
//     "새벽 3시에 로그인 실패 6회"가 누군가에게는 "저녁 7시"다 — 두 사람이 같은 사고를
//     이야기하면서 서로 다른 시각을 말하면 감사는 성립하지 않는다.
//   · 로그는 법적 증거다. '언제'가 보는 사람에 따라 달라지는 기록은 증거가 아니다.
//
// 그래서 이 섹션은 **표시 타임존을 KST 로 고정한다.** 서버가 UTC 로 주든 오프셋을 달아 주든
// 화면에는 언제나 KST 로 찍힌다 — 운영자의 노트북 시계가 어디에 맞춰져 있든 같은 값이다.
// (ERP-09 acceptance: "UTC ISO 입력이 runner OS timezone 과 무관하게 동일 wall-clock 시간 렌더")
//
// 이 정책은 **화면에도 적힌다** (TIME_ZONE_NOTICE) — 규칙이 코드에만 있으면 운영자는
// 자기가 보는 시각이 무슨 기준인지 알 수 없고, 모르는 기준은 없는 기준과 같다.
//
// [shared/format 으로 승격해야 하는가] 그렇다. 그러나 `shared/**` 는 이번 배치의 소유가
// 아니다 — 보고서에 승격 후보로 남긴다. 그때까지 이 파일이 로그 섹션의 정본이다.
//
// [새 라이브러리 없음] date-fns·dayjs 를 도입하지 않는다. 플랫폼의 Intl 이 이미 IANA
// 타임존 데이터베이스를 갖고 있다 — 타임존 환산에 라이브러리가 필요한 시대는 지났다.
// ─────────────────────────────────────────────────────────────────────────────

/** 표시 타임존 — IANA 식별자. 서버 시각이 무엇이든 화면은 이 기준으로 읽는다 */
const DISPLAY_TIME_ZONE = 'Asia/Seoul';

/** 화면에 적는 기준 표기 — 운영자가 '무슨 시각인지' 묻지 않아도 되게 한다 */
export const TIME_ZONE_LABEL = 'KST (UTC+9)';

export const TIME_ZONE_NOTICE = `모든 시각은 ${TIME_ZONE_LABEL} 기준입니다.`;

/**
 * 날짜/시각 조각 추출기.
 *
 * `formatToParts` 를 쓰는 이유: `format()` 의 출력 문자열은 로케일 표기(오전/오후·구분자)에
 * 묶여 있어 파싱하면 깨진다. 조각으로 받아 **우리가 조립한다** — 표기가 우리 것이 된다.
 */
const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

interface TimeParts {
  readonly year: string;
  readonly month: string;
  readonly day: string;
  readonly hour: string;
  readonly minute: string;
  readonly second: string;
}

/** ISO 문자열 → KST 조각. 파싱할 수 없으면 null (지어내지 않는다) */
function partsOf(iso: string): TimeParts | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const found: Record<string, string> = {};
  for (const part of PARTS.formatToParts(date)) {
    if (part.type !== 'literal') found[part.type] = part.value;
  }

  const { year, month, day, hour, minute, second } = found;
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    return null;
  }

  // Intl 은 자정을 '24' 로 낼 수 있다 (hourCycle h24) — '00' 으로 정규화한다
  return { year, month, day, hour: hour === '24' ? '00' : hour, minute, second };
}

/**
 * 그 시각이 속한 **KST 달력일** ('YYYY-MM-DD').
 *
 * 기간 필터가 이것을 쓴다. `iso.slice(0, 10)` 로 자르면 안 된다 — UTC 로 저장된
 * '2026-07-14T22:00:00Z' 는 KST 로 **7월 15일 오전 7시**다. 잘라 쓰면 하루가 밀리고,
 * '오늘' 필터가 오늘 아침의 사건을 어제로 보낸다.
 */
export function kstDayOf(iso: string): string | null {
  const parts = partsOf(iso);
  if (parts === null) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** '오늘' — KST 기준. 기준 시각을 주입받는다(테스트가 '오늘'을 고정할 수 있어야 한다) */
export function kstToday(now: Date = new Date()): string {
  return kstDayOf(now.toISOString()) ?? '';
}

/**
 * 표 셀의 시각 — 'YYYY-MM-DD HH:mm:ss' (KST).
 *
 * **초까지 보여준다.** 로그인 이력은 분까지로 충분했지만 감사 로그는 아니다 —
 * 1초에 40번 두드리는 API 호출은 분 단위로 보면 전부 같은 시각이 되어 순서가 사라진다.
 * 파싱할 수 없는 값은 **그대로 돌려준다** — 지어내는 것보다 낫다.
 */
export function formatLogTime(iso: string): string {
  const parts = partsOf(iso);
  if (parts === null) return iso;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/* ── 달력일 산술 ('YYYY-MM-DD' 문자열) ───────────────────────────────────── */
//
// [왜 문자열로 다루나] 구간의 양 끝은 전부 'YYYY-MM-DD' 다 — 표·CSV·필터·(백엔드가 붙으면)
// 쿼리 파라미터가 **같은 표현**을 쓴다. 중간에 로컬 Date 로 왕복하면 타임존 때문에 하루가
// 밀린다. 비교도 문자열 사전순으로 정확하다(고정 폭 0패딩).
//
// 아래 산술은 **UTC 정오**를 앵커로 쓴다. 자정이 아니라 정오인 이유: 서머타임이나 과거의
// 타임존 개정으로 자정이 존재하지 않는 날이 실제로 있다(1988년 서울의 서머타임 등).
// 정오는 어떤 타임존 이동에도 같은 날 안에 머문다.

const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' → UTC 정오의 시각. 형식이 아니면 null */
function noonUtcOf(date: string): number | null {
  if (!DATE_PATTERN.test(date)) return null;
  const time = Date.parse(`${date}T12:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

/** UTC 시각 → 'YYYY-MM-DD' (UTC 달력일 — 앵커가 UTC 정오라 KST 달력일과 같다) */
function dayOfUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' + n일 (n < 0 이면 과거). 형식이 아니면 그대로 돌려준다 */
export function shiftDays(date: string, days: number): string {
  const noon = noonUtcOf(date);
  if (noon === null) return date;
  return dayOfUtc(noon + days * DAY_MS);
}

/** 양 끝 포함 일수 — 같은 날이면 1. 형식이 아니면 null */
export function dayCount(from: string, to: string): number | null {
  const start = noonUtcOf(from);
  const end = noonUtcOf(to);
  if (start === null || end === null) return null;
  return Math.round((end - start) / DAY_MS) + 1;
}

/**
 * **실재하는 날짜**인가 — 2026-02-31 은 형식은 맞지만 존재하지 않는다.
 * (Date 는 2월 31일을 3월 3일로 굴려버린다 — 되돌려 찍어 같은지 본다.)
 */
export function isCalendarDate(value: string): boolean {
  const noon = noonUtcOf(value);
  if (noon === null) return false;
  return dayOfUtc(noon) === value;
}
