// 공지사항 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다.
// 지금은 아래 픽스처(브라우저 안 더미)를 돌려준다. 백엔드가 준비되면 **이 파일의 함수 본문만**
// 실제 HTTP 호출로 교체하면 되고, 화면 코드는 한 줄도 바뀌지 않는다.
// 서버·DB·엔드포인트·비즈니스 로직을 여기에 구현하지 않는다.
//
// [실명 금지] 작성자는 개인 실명이 아니라 운영 조직 역할명이다.
import { wait } from '../../../shared/async';
import { PAGE_SIZE } from './types';
import type {
  CategoryCounts,
  Notice,
  NoticeCategory,
  NoticeListResult,
  NoticeStatus,
  NoticeSummary,
  StatusCounts,
} from './types';

/** 네트워크 왕복 체감 — 화면의 로딩/스켈레톤 경로를 실제로 타게 하는 최소한의 지연 */
const LATENCY_MS = 400;

/**
 * 실패 경로 재현 스위치 (개발용) — 회원/로그인 이력 어댑터와 같은 규약이다.
 *
 *   /content/notices?fail=list     → 목록 조회 실패 (인라인 배너 + 다시 시도)
 *   /content/notices/1?fail=detail → 상세 조회 실패
 *   /content/notices/new?fail=save → 저장 실패 (폼 인라인/토스트)
 *   ?fail=all                      → 이 화면의 모든 호출이 실패
 *
 * 백엔드가 붙으면 이 함수와 호출부는 함께 사라진다.
 */
type FailureOp = 'all' | 'list' | 'detail' | 'save' | 'delete';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;
  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

/* ── 픽스처 (표시용 더미 — 결정적으로 생성) ──────────────────────────────── */

const AUTHORS = ['콘텐츠 운영팀', '시스템 관리자', '마케팅팀'] as const;
const CATEGORIES: readonly NoticeCategory[] = ['notice', 'event', 'maintenance'];
const STATUSES: readonly NoticeStatus[] = ['published', 'draft', 'scheduled'];

const TITLE_SEED: Record<NoticeCategory, string> = {
  notice: '서비스 이용 안내',
  event: '가입 축하 이벤트',
  maintenance: '정기 점검 안내',
};

/** 인덱스로부터 결정적으로 만든다 — 새로고침해도 목록이 흔들리지 않는다 */
function makeNotice(index: number): Notice {
  const category = CATEGORIES[index % CATEGORIES.length] ?? 'notice';
  const status = STATUSES[index % STATUSES.length] ?? 'published';
  const day = ((index * 3) % 27) + 1;
  const month = (index % 12) + 1;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  // 예약 상태는 미래 시각으로 둔다 — 그래야 '예약'이 말이 된다
  const year = status === 'scheduled' ? 2027 : 2026;
  const seq = String(index + 1).padStart(3, '0');

  return {
    id: `NT-${seq}`,
    title: `[${TITLE_SEED[category]}] ${seq}호`,
    category,
    status,
    pinned: index % 7 === 0,
    author: AUTHORS[index % AUTHORS.length] ?? '시스템 관리자',
    publishedAtIso: `${String(year)}-${mm}-${dd}T09:00:00`,
    views: status === 'published' ? (index * 37) % 4000 : 0,
    body:
      `${TITLE_SEED[category]} 관련 상세 내용입니다.\n\n` +
      '안녕하세요. 콘텐츠 운영팀입니다. 아래 내용을 확인해 주세요.\n' +
      '· 적용 대상: 전체 회원\n· 문의: 고객센터 1:1 문의\n\n감사합니다.',
  };
}

/** 픽스처 원본 — 상단 고정 항목이 목록 맨 위로 오도록 정렬한다(고정 → 최신순) */
export const NOTICES: readonly Notice[] = Array.from({ length: 24 }, (_, index) =>
  makeNotice(index),
).sort((a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.publishedAtIso.localeCompare(a.publishedAtIso);
});

/** 목록 행은 본문을 싣지 않는다 — 서버 목록 응답이 본문을 빼는 것을 흉내 낸다 */
function toSummary(notice: Notice): NoticeSummary {
  return {
    id: notice.id,
    title: notice.title,
    category: notice.category,
    status: notice.status,
    pinned: notice.pinned,
    author: notice.author,
    publishedAtIso: notice.publishedAtIso,
    views: notice.views,
  };
}

/* ── 조회 ────────────────────────────────────────────────────────────────── */

export interface NoticeQuery {
  readonly category: NoticeCategory | 'all';
  readonly status: NoticeStatus | 'all';
  readonly keyword: string;
  readonly page: number;
}

function countByCategory(notices: readonly Notice[]): CategoryCounts {
  return {
    all: notices.length,
    notice: notices.filter((n) => n.category === 'notice').length,
    event: notices.filter((n) => n.category === 'event').length,
    maintenance: notices.filter((n) => n.category === 'maintenance').length,
  };
}

function countByStatus(notices: readonly Notice[]): StatusCounts {
  return {
    all: notices.length,
    published: notices.filter((n) => n.status === 'published').length,
    draft: notices.filter((n) => n.status === 'draft').length,
    scheduled: notices.filter((n) => n.status === 'scheduled').length,
  };
}

/**
 * 분류 + 상태(AND) + 제목 키워드 — 서버 쿼리로 대체될 자리.
 * **테스트가 이 함수를 직접 부른다** — 지연·`?fail=` 스위치를 거치지 않고 필터 규칙만 검증한다.
 */
export function applyQuery(
  query: NoticeQuery,
  source: readonly Notice[] = NOTICES,
): readonly Notice[] {
  const keyword = query.keyword.trim().toLowerCase();
  return source.filter((notice) => {
    if (query.category !== 'all' && notice.category !== query.category) return false;
    if (query.status !== 'all' && notice.status !== query.status) return false;
    if (keyword === '') return true;
    return notice.title.toLowerCase().includes(keyword);
  });
}

// TODO(backend): GET /api/notices?category=&status=&keyword=&page=&size=
export async function fetchNotices(
  query: NoticeQuery,
  signal: AbortSignal,
): Promise<NoticeListResult> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');

  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;

  return {
    notices: filtered.slice(start, start + PAGE_SIZE).map(toSummary),
    // 좌측 배지 숫자는 검색과 무관하게 전체 기준이다
    categoryCounts: countByCategory(NOTICES),
    statusCounts: countByStatus(NOTICES),
    total: filtered.length,
  };
}

// TODO(backend): GET /api/notices/:id
export async function fetchNotice(id: string, signal: AbortSignal): Promise<Notice> {
  await wait(LATENCY_MS, signal);
  failIfRequested('detail');

  const notice = NOTICES.find((item) => item.id === id);
  if (notice === undefined) throw new Error('공지를 찾을 수 없습니다');
  return notice;
}

/* ── 쓰기 계열 (지금은 저장하지 않는다 — resolve 만 한다) ───────────────────── */

/** 등록/수정 폼의 제출 payload */
export interface NoticeInput {
  readonly title: string;
  readonly category: NoticeCategory;
  readonly status: NoticeStatus;
  readonly pinned: boolean;
  /** 게시일/예약 시각 — 'YYYY-MM-DD' */
  readonly publishedAt: string;
  readonly body: string;
}

// TODO(backend): POST /api/notices
export async function createNotice(input: NoticeInput, signal?: AbortSignal): Promise<void> {
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): PUT /api/notices/:id
export async function updateNotice(
  id: string,
  input: NoticeInput,
  signal?: AbortSignal,
): Promise<void> {
  void id;
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): DELETE /api/notices/:id
export async function deleteNotice(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await wait(LATENCY_MS, signal);
  failIfRequested('delete');
}
