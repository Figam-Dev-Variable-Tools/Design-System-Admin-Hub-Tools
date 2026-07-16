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

/* ── 조사(助詞) — ERP-13 ──────────────────────────────────────────────────────
 *
 * [무엇을 고치나] `'제목' + '을(를) 입력하세요'` 는 문법을 사람에게 떠넘긴 문장이다. 괄호를 읽는
 * 사람은 없다 — 눈에 걸릴 뿐이고, 그 순간 화면은 '대충 만든 것'이 된다. 한국어 조사는 앞말의
 * **받침 유무**로 갈리고, 그건 런타임에 계산할 수 있다. 계산할 수 있는 것을 사용자에게 미루지 않는다.
 *
 * [왜 여기 한 벌인가] 이 헬퍼가 없는 동안 세 곳이 각자 사본을 만들었다 — logs/josa.ts ·
 * notifications/_shared/notification.ts · @tds/ui 의 Empty. 앞의 둘은 이 모듈로 수렴됐다.
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
