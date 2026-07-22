// 뉴스·보도자료 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다. 지금은 픽스처를
// 돌려준다. 백엔드가 붙으면 **이 파일의 함수 본문만** 실제 HTTP 호출로 바꾼다.
//
// [사용처 역참조를 여기서 내보낸다] 미디어 라이브러리는 '이 파일이 어디에 쓰이나' 를 알아야
// 삭제를 막을 수 있는데, 그 답의 절반은 뉴스가 갖고 있다. 미디어 화면이 이 파일을 직접 import
// 하면 두 모듈이 한 몸이 되므로, 조회기의 자리는 공통 층에 있고(shared/domain/media-library.ts)
// 아래 listNewsMediaUsage 를 거기에 꽂는 일은 `src/wiring.ts` 가 한다.
import { createStoreAdapter } from '../../../shared/crud';
import type { MediaUsageRef } from '../../../shared/domain/media-library';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { publishScheduleBlock } from '../../../shared/domain/publish-schedule';
import { NEWS_LIST_PATH, sortNewsPosts } from './types';
import type { NewsCategory, NewsPost, NewsPostInput } from './types';

export const NEWS_RESOURCE = 'news-posts';

/**
 * 분류 — 1뎁스 고정 목록.
 *
 * TODO(backend): GET/POST /api/news-categories — 운영자가 분류를 늘릴 수 있게 되면 이 상수는
 * 조회로 바뀐다. 지금 CRUD 화면을 만들지 않는 이유는 분류가 세 개인데 관리 화면이 먼저 생기면
 * 쓰이지 않는 화면을 유지하게 되기 때문이다.
 */
export const NEWS_CATEGORIES: readonly NewsCategory[] = [
  { id: 'press', label: '언론보도' },
  { id: 'award', label: '수상·인증' },
  { id: 'notice', label: '공시·알림' },
];

/* ── 픽스처 (표시용 더미 — 가상 회사) ────────────────────────────────────── */

const SEED: readonly NewsPost[] = [
  {
    id: 'nw-001',
    title: '공간 데이터 분석 솔루션 정식 출시',
    categoryId: 'press',
    pinned: true,
    status: 'published',
    publishAt: '2026-05-12T09:00',
    body: '운영 데이터를 모아 다음 공간의 근거로 만드는 분석 솔루션을 정식 출시했습니다.',
    attachmentIds: ['md-005'],
    updatedAt: '2026-05-12T09:00',
  },
  {
    id: 'nw-002',
    title: '기업부설 연구소 인증 획득',
    categoryId: 'award',
    pinned: false,
    status: 'published',
    publishAt: '2026-04-03T10:00',
    body: '연구개발 조직을 정비해 기업부설 연구소 인증을 받았습니다.',
    attachmentIds: ['md-003'],
    updatedAt: '2026-04-03T10:00',
  },
  {
    id: 'nw-003',
    title: '본사 이전 안내',
    categoryId: 'notice',
    pinned: false,
    status: 'published',
    publishAt: '2026-02-20T14:00',
    body: '더 넓은 작업 공간으로 본사를 옮겼습니다. 방문 전 약속을 잡아 주세요.',
    attachmentIds: [],
    updatedAt: '2026-02-20T14:00',
  },
  {
    id: 'nw-004',
    title: '하반기 채용 브랜딩 캠페인 시작',
    categoryId: 'press',
    pinned: false,
    status: 'published',
    // 미래 시각 — '예약' 상태 경로를 목록에서 실제로 밟게 하는 씨앗이다
    publishAt: '2026-12-15T09:00',
    body: '함께 일할 분을 찾는 캠페인을 준비하고 있습니다.',
    attachmentIds: [],
    updatedAt: '2026-07-01T11:20',
  },
  {
    id: 'nw-005',
    title: '연말 결산 자료 (작성 중)',
    categoryId: 'notice',
    pinned: false,
    status: 'draft',
    publishAt: '',
    body: '내용을 정리하고 있습니다.',
    // 삭제된 자산을 가리킨다 — 끊긴 첨부 경고 경로를 화면에서 실제로 밟게 한다
    attachmentIds: ['md-사라짐'],
    updatedAt: '2026-07-05T16:40',
  },
];

/** mutable — 등록·수정·삭제가 이 배열을 갱신한다 */
let POSTS: readonly NewsPost[] = sortNewsPosts(SEED);

let seq = SEED.length;

/* ── 저장소 표면 ─────────────────────────────────────────────────────────── */

export function listNewsPosts(): readonly NewsPost[] {
  return POSTS;
}

export function getNewsPost(id: string): NewsPost {
  const post = POSTS.find((item) => item.id === id);
  if (post === undefined) throw new Error('글을 찾을 수 없습니다.');
  return post;
}

/** 저장 전 마지막 문 — 예약 규칙의 정본은 공통 층이 갖는다(화면도 같은 함수를 읽는다) */
function assertSavable(input: NewsPostInput): void {
  const blocked = publishScheduleBlock(input);
  if (blocked === null) return;
  throw new HttpError(HTTP_STATUS.unprocessable, blocked, {
    violations: [{ field: 'publishAt', message: blocked }],
  });
}

export function addNewsPost(input: NewsPostInput): void {
  assertSavable(input);
  seq += 1;
  POSTS = sortNewsPosts([...POSTS, { id: `nw-${String(seq).padStart(3, '0')}`, ...input }]);
}

export function updateNewsPost(id: string, input: NewsPostInput): void {
  assertSavable(input);
  POSTS = sortNewsPosts(POSTS.map((post) => (post.id === id ? { ...post, ...input } : post)));
}

export function removeNewsPost(id: string): void {
  POSTS = POSTS.filter((post) => post.id !== id);
}

/* ── 배선용 조회기 (미디어 라이브러리가 읽는다 — src/wiring.ts 가 꽂는다) ─── */

/**
 * 이 자산을 첨부로 쓰는 글들 — 삭제 차단의 근거 절반이다.
 *
 * 초안·보관 글도 센다. '아직 공개되지 않았으니 지워도 된다' 는 틀렸다 — 그 글을 발행하는 날
 * 첨부가 비어 있게 되고, 그때는 무엇이 붙어 있었는지 아무도 모른다.
 */
// TODO(backend): GET /api/news?attachmentId= — 서버가 역인덱스로 답한다
export function listNewsMediaUsage(assetId: string): readonly MediaUsageRef[] {
  return POSTS.filter((post) => post.attachmentIds.includes(assetId)).map((post) => ({
    id: post.id,
    domainLabel: '뉴스',
    label: post.title,
    path: `${NEWS_LIST_PATH}/${post.id}/edit`,
  }));
}

/** 'YYYY-MM-DDTHH:mm' — 저장 시각의 표기를 한 곳에서만 만든다 */
export function stampNow(): string {
  return new Date().toISOString().slice(0, 16);
}

/* ── CRUD 어댑터 ─────────────────────────────────────────────────────────── */

// TODO(backend): GET/POST /api/news · GET/PUT/DELETE /api/news/:id
export const newsPostAdapter = createStoreAdapter<NewsPost, NewsPostInput>({
  scope: NEWS_RESOURCE,
  list: listNewsPosts,
  getOne: getNewsPost,
  add: addNewsPost,
  update: updateNewsPost,
  remove: removeNewsPost,
});
