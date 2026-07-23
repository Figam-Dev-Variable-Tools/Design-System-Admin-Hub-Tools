// 표시용 포매터
//
// [공통 모듈] 회원·운영자·고객 설정이 같은 규칙으로 숫자/날짜를 보여준다.
//
// 데이터 소스는 원본 값(ISO 날짜, 숫자)만 돌려준다. '4시간전' / '10,000 포인트' 같은
// 사람이 읽는 문자열로 바꾸는 일은 전부 여기 모은다 — 백엔드가 붙어도 그대로 쓴다.

/* ── 시각 표기 정책 — **고정 표시 타임존** (ERP-09) ───────────────────────────
 *
 * [표시 타임존은 Asia/Seoul 로 고정한다 — 보는 사람이 정하지 않는다]
 *
 * 이 파일의 날짜 함수는 원래 브라우저 로컬 게터(getFullYear/getHours)로 만들어져 있었다.
 * 즉 **보는 사람의 OS 타임존이 곧 표시 기준**이었다. 그것이 ERP-09 가 지적한 결함의 뿌리다:
 *
 *   · 서울의 운영자와 베를린의 운영자가 **같은 사건을 다른 시각으로** 본다.
 *     "새벽 3시에 로그인 실패 6회"가 누군가에게는 "저녁 7시"다 — 두 사람이 같은 사고를
 *     이야기하면서 서로 다른 시각을 말하면 감사는 성립하지 않는다.
 *   · 서버 시각은 UTC 다. 감사 로그는 **법적 증거**다. '언제'가 읽는 사람에 따라 달라지는
 *     기록은 증거가 아니다.
 *
 * 그래서 서버가 UTC 로 주든 오프셋을 달아 주든 **화면에는 언제나 KST 로 찍힌다.** 운영자의
 * 노트북 시계가 어디에 맞춰져 있든 같은 값이다.
 * (acceptance: "포맷 함수 정의 TZ, UTC 입력이 OS TZ 무관 동일")
 *
 * 이 정책은 **화면에도 적힌다** (TIME_ZONE_NOTICE) — 규칙이 코드에만 있으면 운영자는 자기가
 * 보는 시각이 무슨 기준인지 알 수 없고, **모르는 기준은 없는 기준과 같다.** 그래서 그 문구는
 * DISPLAY_TIME_ZONE 바로 옆에 산다: 떨어뜨려 놓으면 화면은 'KST' 라 적고 코드는 다른 존을
 * 쓰는 날이 온다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [사본이 셋이었다 — 여기로 수렴했다]
 *
 *   · pages/logs/time.ts             — KST 고정 · Intl · 앵커 **UTC 정오** · isCalendarDate 는 boolean
 *   · pages/stats/_shared/period.ts  — 서울 고정 · Intl · 앵커 **UTC 자정** · isCalendarDate 는 타입가드
 *   · pages/login-history/period.ts  — **브라우저 로컬** (ERP-09 를 아예 안 지켰다)
 *
 * 승급은 '파일을 옮기는 일'이 아니라 **사본들의 불일치를 판정하는 일**이었다. 판정 결과와 근거:
 *
 * ① **달력 산술의 앵커는 UTC 정오다.**
 *    정오 앵커와 자정 앵커를 1970–2100 의 날짜 × 오프셋 29,224 조합으로 맞대어 봤다 —
 *    **차이가 하나도 없었다.** 둘 다 UTC 에 앵커하고 UTC 에는 서머타임이 없으니 당연하다.
 *    logs/time.ts 가 적어 둔 정오의 근거("자정이 존재하지 않는 날") 는 실재하는 위험이지만
 *    그것은 **로컬 시각 앵커**의 위험이지 UTC 앵커의 위험이 아니다 — 즉 두 사본을 가르는
 *    근거가 되지 못한다. 그럼에도 정오를 고른다: **더 안전한 불변식**이기 때문이다.
 *    앵커 순간이 언젠가 존(zone)이 붙은 포매터로 읽히면, UTC 정오는 UTC-11..UTC+12 의 모든
 *    존에서 **같은 달력일**로 읽히지만 UTC 자정은 음수 오프셋 존 전부에서 **전날로 밀린다.**
 *    (이 수렴으로 현재 출력이 바뀌는 곳은 **없다** — 두 앵커가 동치이므로.)
 *
 * ② **isCalendarDate 는 타입가드다** — `(value: unknown): value is string`.
 *    stats 사본의 시그니처다. 진짜 타입가드는 logs 사본의 `(value: string): boolean` 을
 *    포함한다(넓게 받고 좁혀 준다). URL 파라미터처럼 `string | null` 이 들어오는 자리에서
 *    호출부가 캐스팅 없이 그대로 쓸 수 있다.
 *
 * ③ **달력일은 문자열로 다룬다** ('YYYY-MM-DD'). 구간의 양 끝은 전부 이 표현이다 —
 *    표·CSV·필터·(백엔드가 붙으면) 쿼리 파라미터가 **같은 표현**을 쓴다. 중간에 로컬 Date 로
 *    왕복하면 타임존 때문에 하루가 밀린다. 비교도 문자열 사전순으로 정확하다(고정 폭 0패딩).
 *
 * [새 라이브러리 없음] date-fns·dayjs 를 도입하지 않는다. 플랫폼의 Intl 이 이미 IANA
 * 타임존 데이터베이스를 갖고 있다 — 타임존 환산에 라이브러리가 필요한 시대는 지났다.
 * ───────────────────────────────────────────────────────────────────────────── */

/** 표시 타임존 — IANA 식별자. 서버 시각이 무엇이든 화면은 이 기준으로 읽는다 */
const DISPLAY_TIME_ZONE = 'Asia/Seoul';

/** 화면에 적는 기준 표기 — 운영자가 '무슨 시각인지' 묻지 않아도 되게 한다 */
const TIME_ZONE_LABEL = 'KST (UTC+9)';

export const TIME_ZONE_NOTICE = `모든 시각은 ${TIME_ZONE_LABEL} 기준이에요.`;

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

// [공개 표면은 실제로 쓰이는 것만] 이 인터페이스는 **export 하지 않는다** — 호출부는
// seoulTimeParts 의 반환 타입을 추론받을 뿐 이름으로 import 하지 않는다. 내보내면 아무도 쓰지
// 않는 공개 API 가 되고 지울 때 파급 범위를 알 수 없게 된다 (죽은 코드 0).

/** KST 로 읽은 시각의 조각들. 전부 0패딩된 고정 폭 문자열이다 */
interface SeoulTimeParts {
  readonly year: string;
  readonly month: string;
  readonly day: string;
  readonly hour: string;
  readonly minute: string;
  readonly second: string;
}

/** Date → KST 조각. 파싱할 수 없으면 null (지어내지 않는다) */
function partsOfDate(date: Date): SeoulTimeParts | null {
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
 * ISO 문자열 → KST 조각. 파싱할 수 없으면 null.
 *
 * 초까지 필요한 화면(감사 로그)이 이것을 쓴다 — 분까지면 formatDateTime 으로 충분하다.
 */
export function seoulTimeParts(iso: string): SeoulTimeParts | null {
  return partsOfDate(new Date(iso));
}

/**
 * 그 시각이 속한 **KST 달력일** ('YYYY-MM-DD').
 *
 * 기간 필터가 이것을 쓴다. `iso.slice(0, 10)` 로 자르면 안 된다 — UTC 로 저장된
 * '2026-07-14T22:00:00Z' 는 KST 로 **7월 15일 오전 7시**다. 잘라 쓰면 하루가 밀리고,
 * '오늘' 필터가 오늘 아침의 사건을 어제로 보낸다.
 */
export function seoulDayOf(iso: string): string | null {
  const parts = seoulTimeParts(iso);
  if (parts === null) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** 상대 시각으로 보여줄 최대 경과 시간 — 이보다 오래되면 날짜로 떨어진다 */
const RELATIVE_LIMIT_MS = 7 * DAY_MS;

/**
 * 'YYYY-MM-DD' — **KST 기준**.
 *
 * `formatDate(new Date())` 가 곧 '서울의 오늘'이다 — 프리셋 계산의 기준점이 여기서 나온다.
 * 읽을 수 없는 Date 는 빈 문자열이다: 'NaN-NaN-NaN' 을 화면에 흘리지 않는다.
 */
export function formatDate(value: Date): string {
  const parts = partsOfDate(value);
  if (parts === null) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * 'YYYY-MM-DD HH:mm' — **KST 기준**. 동의 일시·접수 시각 등.
 * 파싱할 수 없는 값은 **그대로 돌려준다** — 지어내는 것보다 낫다.
 */
export function formatDateTime(iso: string): string {
  const parts = seoulTimeParts(iso);
  if (parts === null) return iso;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/**
 * 가입일/로그인 시각 표기.
 * 최근(7일 이내)이면 '방금 전' / 'N분전' / 'N시간전' / 'N일전', 그보다 오래되면 'YYYY-MM-DD'.
 *
 * @param now 테스트에서 고정할 수 있게 주입 가능 — 기본은 현재 시각
 */
export function formatRelativeOrDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const elapsed = now.getTime() - date.getTime();
  // 미래 시각(시계 오차 등)은 상대 표기가 어색하다 — 날짜로 떨어뜨린다
  if (elapsed < 0 || elapsed >= RELATIVE_LIMIT_MS) return formatDate(date);

  if (elapsed < MINUTE_MS) return '방금 전';
  if (elapsed < HOUR_MS) return `${String(Math.floor(elapsed / MINUTE_MS))}분전`;
  if (elapsed < DAY_MS) return `${String(Math.floor(elapsed / HOUR_MS))}시간전`;
  return `${String(Math.floor(elapsed / DAY_MS))}일전`;
}

/* ── 달력일 산술 ('YYYY-MM-DD' 문자열) ─────────────────────────────────────────
 *
 * 앵커는 **UTC 정오**다 (근거는 이 파일 머리말 ①). 시각(clock)을 더하는 게 아니라
 * 날짜(calendar day)를 더한다 — 날짜는 여기서 불투명한 civil date 다.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' → UTC 정오의 시각. 형식이 아니면 null */
function noonUtcOf(date: string): number | null {
  if (!DATE_PATTERN.test(date)) return null;
  const time = Date.parse(`${date}T12:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

/** UTC 시각 → 'YYYY-MM-DD' (앵커가 UTC 정오라 KST 달력일과 같은 날이다) */
function dayOfUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' + n일 (n < 0 이면 과거). 형식이 아니면 그대로 돌려준다 */
export function shiftDays(date: string, days: number): string {
  const noon = noonUtcOf(date);
  if (noon === null) return date;
  return dayOfUtc(noon + days * DAY_MS);
}

/** 두 날짜의 **차이** — 같은 날이면 0, to 가 과거면 음수. 형식이 아니면 null */
export function daysBetween(from: string, to: string): number | null {
  const start = noonUtcOf(from);
  const end = noonUtcOf(to);
  if (start === null || end === null) return null;
  return Math.round((end - start) / DAY_MS);
}

/** 양 끝 **포함** 일수 — 같은 날이면 1. 형식이 아니면 null */
export function dayCount(from: string, to: string): number | null {
  const diff = daysBetween(from, to);
  return diff === null ? null : diff + 1;
}

/**
 * **실재하는 날짜**인가 — 2026-02-31 은 형식은 맞지만 존재하지 않는다.
 * (Date 는 2월 31일을 3월 3일로 굴려버린다 — 되돌려 찍어 같은지 본다.)
 *
 * 타입가드인 이유는 머리말 ② 를 보라 — `string | null` 을 그대로 받아 좁혀 준다.
 */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const noon = noonUtcOf(value);
  if (noon === null) return false;
  return dayOfUtc(noon) === value;
}

/** 천 단위 구분 — '10,000' */
export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

/** 적립금 증감 — 부호를 함께 보여준다 ('+5,000' / '-1,000') */
export function formatSignedNumber(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)}`;
}

/** 아바타 이니셜 — 닉네임 첫 글자 */
export function initialOf(nickname: string): string {
  return nickname.trim().slice(0, 1) || '?';
}

/* ── 조사(助詞) — ERP-13 ──────────────────────────────────────────────────────
 *
 * [무엇을 고치나] `'제목' + '을(를) 입력하세요'` 는 문법을 사람에게 떠넘긴 문장이다. 괄호를 읽는
 * 사람은 없다 — 눈에 걸릴 뿐이고, 그 순간 화면은 '대충 만든 것'이 된다. 한국어 조사는 앞말의
 * **받침 유무**로 갈리고, 그건 런타임에 계산할 수 있다. 계산할 수 있는 것을 사용자에게 미루지 않는다.
 *
 * [왜 여기 한 벌인가] 이 헬퍼가 없는 동안 앱 곳곳(logs/josa.ts 등)이 각자 사본을 만들었다.
 * 앱 쪽 사본은 전부 이 모듈로 수렴됐다.
 * (@tds/ui 는 앱을 import 할 수 없어(레이어 경계) 자기 사본을 계속 갖는다 — 그건 의도된 자족이다.)
 *
 * [한글이 아니면] 영문·숫자로 끝나는 말('API'·'SMS')은 받침을 판정할 수 없다. 관용을 따라
 * **받침 없음**으로 본다 — 'API를' 이 'API을' 보다 자연스럽다.
 */

/** 한글 음절 영역 U+AC00–U+D7A3 */
const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

/** 한 음절 = 초성×21×28 + 중성×28 + 종성 — 나머지가 0이 아니면 종성(받침)이 있다 */
const JONGSEONG_CYCLE = 28;

/** 종성 코드 8 = 'ㄹ' — '(으)로' 는 ㄹ 받침을 받침 없음처럼 다룬다 ('서울로', '길로') */
const JONGSEONG_RIEUL = 8;

/** 마지막 글자의 종성 코드 — 한글 음절이 아니면 null(= 판정 불가) */
function jongseongOf(word: string): number | null {
  if (word.length === 0) return null;
  const code = word.charCodeAt(word.length - 1);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return null;
  return (code - HANGUL_FIRST) % JONGSEONG_CYCLE;
}

/** 마지막 글자에 받침이 있는가 — 한글이 아니거나 빈 문자열이면 false */
function hasBatchim(word: string): boolean {
  const jongseong = jongseongOf(word);
  return jongseong !== null && jongseong !== 0;
}

/** 목적격 '을/를' — '제목을 입력하세요' / '메시지를 입력하세요' */
export function objectParticle(word: string): string {
  return hasBatchim(word) ? '을' : '를';
}

/** 보조사 '은/는' — '제목은 100자를 넘을 수 없습니다' / '메시지는 …' */
export function topicParticle(word: string): string {
  return hasBatchim(word) ? '은' : '는';
}

/**
 * 방향격 '(으)로' — '답변완료로 변경' / '보류중으로 변경'.
 *
 * ㄹ 받침은 예외다: '서울으로'가 아니라 '서울로'다. 그래서 다른 조사처럼 받침 **유무**만 보면
 * 틀린다 — 종성이 무엇인지까지 봐야 한다.
 */
export function directionParticle(word: string): string {
  const jongseong = jongseongOf(word);
  if (jongseong === null || jongseong === 0 || jongseong === JONGSEONG_RIEUL) return '로';
  return '으로';
}

/** 목록의 활동 컬럼 — '0/ 0/ 0/ 0' */
export function formatActivity(counts: {
  readonly posts: number;
  readonly comments: number;
  readonly reviews: number;
  readonly inquiries: number;
}): string {
  return [counts.posts, counts.comments, counts.reviews, counts.inquiries]
    .map((count) => String(count))
    .join('/ ');
}

/* ── 바이트 길이 (EUC-KR 근사) ────────────────────────────────────────────────
 *
 * [왜 글자 수가 아니라 바이트인가] 국내 문자 발송(SMS/LMS)과 메일·SMS 발신자명은 길이를
 * **바이트**로 센다. 한글 한 글자가 2바이트라 '45자'가 이미 90바이트다 — 글자 수로 재면
 * SMS 한도를 언제 넘는지 알 수 없다.
 *
 * [왜 여기 있나] 원래 pages/marketing/_shared/messaging.ts 안에 있었고, 사이트 설정(메일·SMS
 * 전용 이름 40byte)이 그것을 가져다 쓰면서 **pages/settings → pages/marketing 결합**이 생겼다
 * (code-quality 축1 page-coupling 이 blocker 로 잡는다). 중복 구현이 답은 아니다 — 규칙이
 * 갈라지면 두 화면이 다른 한도를 말한다. 도메인에 매이지 않는 계측이므로 공통 모듈로 올린다.
 */
export function byteLengthOf(text: string): number {
  let bytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code > 0x7f ? 2 : 1;
  }
  return bytes;
}
