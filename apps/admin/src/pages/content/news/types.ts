// 뉴스·보도자료 화면 전용 타입 + 순수 규칙
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 공지사항과 따로인가] 공지(/content/notices)는 **서비스 이용자에게 알리는 글**이고, 뉴스는
// 회사가 밖으로 내보내는 소식이다. 독자·톤·수명이 다르고, 홈페이지에서 서는 자리도 다르다.
// 한 게시판에 섞으면 방문자가 점검 안내와 수상 소식을 같은 목록에서 보게 된다.
//
// [발행 예약은 여기서 판정하지 않는다] '예약중' 은 status + publishAt + 지금 시각의 파생값이다.
// 규칙이 두 벌이 되지 않도록 shared/domain/publish-schedule.ts 한 곳에만 둔다 —
// 이 파일은 그것을 쓸 뿐 다시 계산하지 않는다.
//
// [첨부는 없다] 예전에는 미디어 라이브러리의 자산 id 를 참조로 들었다. 그 화면이 IA 에서 빠지면서
// 참조가 가리킬 정본이 사라졌고, 모델만 남기면 어떤 화면도 그것을 해석할 수 없다 — 해석되지 않는
// id 목록은 데이터가 아니라 잔해다. 그래서 필드째 걷었다.
// ─────────────────────────────────────────────────────────────────────────────
import {
  effectivePublishStatus,
  isPubliclyVisible,
  type PublishStatus,
  type StoredPublishStatus,
} from '../../../shared/domain/publish-schedule';

/* ── 카테고리 (1뎁스) ────────────────────────────────────────────────────── */

/**
 * 분류는 **한 단계뿐**이다.
 *
 * 보도자료의 분류는 '언론보도 / 수상·인증 / 공시' 처럼 열 개를 넘지 않는다. 그 규모에 2뎁스를
 * 열면 운영자가 어디에 넣을지 매번 고민하고, 방문자는 두 번 눌러야 목록에 닿는다.
 */
export interface NewsCategory {
  readonly id: string;
  readonly label: string;
}

/* ── 글 ──────────────────────────────────────────────────────────────────── */

export interface NewsPost {
  readonly id: string;
  readonly title: string;
  readonly categoryId: string;
  /** 상단 고정 — 목록 맨 위에 붙는다. 발행일과 무관하다 */
  readonly pinned: boolean;
  readonly status: StoredPublishStatus;
  /** 공개 시각 'YYYY-MM-DDTHH:mm' — '' 면 즉시(발행 상태일 때) */
  readonly publishAt: string;
  readonly body: string;
  readonly updatedAt: string;
}

export type NewsPostInput = Omit<NewsPost, 'id'>;

export const NEWS_TITLE_MAX = 100;
export const NEWS_BODY_MAX = 10_000;
export const NEWS_LIST_PATH = '/content/news';

export function toNewsPostInput(post: NewsPost): NewsPostInput {
  return {
    title: post.title,
    categoryId: post.categoryId,
    pinned: post.pinned,
    status: post.status,
    publishAt: post.publishAt,
    body: post.body,
    updatedAt: post.updatedAt,
  };
}

/** 지금 이 글의 상태 — 저장값이 아니라 파생값이다(머리말) */
export function newsStatus(post: NewsPost, now: Date = new Date()): PublishStatus {
  return effectivePublishStatus(post, now);
}

/** 홈페이지에서 볼 수 있는가 */
export function isNewsPublic(post: NewsPost, now: Date = new Date()): boolean {
  return isPubliclyVisible(post, now);
}

export function categoryLabelOf(categories: readonly NewsCategory[], categoryId: string): string {
  return categories.find((category) => category.id === categoryId)?.label ?? '미분류';
}

/* ── 목록 정렬 ───────────────────────────────────────────────────────────── */

/**
 * 고정 → 발행일 내림차순.
 *
 * 고정을 발행일보다 먼저 보는 이유: 고정은 '날짜와 무관하게 위' 라는 뜻이다. 순서가 뒤집히면
 * 오래된 고정글이 최신글 아래로 밀려 고정의 의미가 사라진다.
 * 공개 시각이 비어 있는 글(즉시 공개·초안)은 최근 수정 시각을 대신 본다 — 정렬 기준이 비어
 * 있다고 목록 맨 아래로 몰리면 방금 쓴 초안을 찾을 수 없다.
 */
export function sortNewsPosts(list: readonly NewsPost[]): readonly NewsPost[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const left = a.publishAt === '' ? a.updatedAt : a.publishAt;
    const right = b.publishAt === '' ? b.updatedAt : b.publishAt;
    if (left !== right) return right.localeCompare(left);
    return a.id.localeCompare(b.id);
  });
}

/* ── 목록 필터 ───────────────────────────────────────────────────────────── */

export type NewsStatusFilter = PublishStatus | 'all';

export const NEWS_STATUS_FILTERS: readonly {
  readonly id: NewsStatusFilter;
  readonly label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'scheduled', label: '예약' },
  { id: 'published', label: '발행' },
  { id: 'archived', label: '보관' },
];

export const NEWS_STATUS_FILTER_VALUES: readonly NewsStatusFilter[] = NEWS_STATUS_FILTERS.map(
  (filter) => filter.id,
);

export const CATEGORY_FILTER_ALL = 'all';

/** 카테고리별 건수 — 좌측 필터의 배지가 읽는다 */
export function countByCategory(
  posts: readonly NewsPost[],
  categories: readonly NewsCategory[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = { [CATEGORY_FILTER_ALL]: posts.length };
  for (const category of categories) {
    counts[category.id] = posts.filter((post) => post.categoryId === category.id).length;
  }
  return counts;
}

/** 상태 + 카테고리 + 제목 키워드 — 서버 쿼리로 대체될 자리 */
export function filterNewsPosts(
  posts: readonly NewsPost[],
  status: NewsStatusFilter,
  categoryId: string,
  keyword: string,
  now: Date = new Date(),
): readonly NewsPost[] {
  const needle = keyword.trim().toLowerCase();
  return posts.filter((post) => {
    if (status !== 'all' && newsStatus(post, now) !== status) return false;
    if (categoryId !== CATEGORY_FILTER_ALL && post.categoryId !== categoryId) return false;
    if (needle === '') return true;
    return post.title.toLowerCase().includes(needle);
  });
}
