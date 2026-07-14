// 표시용 포매터 (A40 소유 — apps/admin/src/shared/**)
//
// [공통 모듈] 회원·운영자·고객 설정이 같은 규칙으로 숫자/날짜를 보여준다.
//
// 데이터 소스는 원본 값(ISO 날짜, 숫자)만 돌려준다. '4시간전' / '10,000 포인트' 같은
// 사람이 읽는 문자열로 바꾸는 일은 전부 여기 모은다 — 백엔드가 붙어도 그대로 쓴다.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** 상대 시각으로 보여줄 최대 경과 시간 — 이보다 오래되면 날짜로 떨어진다 */
const RELATIVE_LIMIT_MS = 7 * DAY_MS;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 'YYYY-MM-DD' — 로컬 타임존 기준 */
export function formatDate(value: Date): string {
  return `${String(value.getFullYear())}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

/** 'YYYY-MM-DD HH:mm' — 동의 일시 등 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${formatDate(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
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
