// 리뷰 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 리뷰는 카테고리 결합이 없어 프레임워크 createCrudAdapter 를 그대로 쓴다. 국내 커머스 관례를 따른다:
// 별점·포토리뷰·노출/숨김·신고 처리·관리자 답변.
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface Review {
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  /** 작성자 — 마스킹된 닉네임(실명 아님) */
  readonly author: string;
  readonly rating: ReviewRating;
  readonly content: string;
  /** 포토리뷰 이미지 — 상세에서만 보여준다(목록엔 이미지 열 없음) */
  readonly imageUrls: readonly string[];
  /** 작성일 — 'YYYY-MM-DD' */
  readonly createdAt: string;
  /** 노출/숨김 — 목록·상세에서 바로 토글 */
  readonly visible: boolean;
  /** 신고 접수 여부 */
  readonly reported: boolean;
  /** 신고 사유(신고된 경우) */
  readonly reportReason: string;
  /** 관리자 답변 — 비면 미답변 */
  readonly reply: string;
}

export interface ReviewInput {
  readonly productId: string;
  readonly productName: string;
  readonly author: string;
  readonly rating: ReviewRating;
  readonly content: string;
  readonly imageUrls: readonly string[];
  readonly createdAt: string;
  readonly visible: boolean;
  readonly reported: boolean;
  readonly reportReason: string;
  readonly reply: string;
}

export const REVIEW_REPLY_MAX = 500;

export const RATING_FILTER_ALL = 'all';
export type RatingFilter = typeof RATING_FILTER_ALL | ReviewRating;

export const RATING_FILTER_OPTIONS: readonly {
  readonly id: RatingFilter;
  readonly label: string;
}[] = [
  { id: RATING_FILTER_ALL, label: '전체 별점' },
  { id: 5, label: '★ 5점' },
  { id: 4, label: '★ 4점' },
  { id: 3, label: '★ 3점' },
  { id: 2, label: '★ 2점' },
  { id: 1, label: '★ 1점' },
];

/** 별점 → 채운 별 문자열(장식). 접근성 라벨은 호출부가 '5점 만점에 N점'으로 붙인다. */
export function starText(rating: ReviewRating): string {
  return '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating);
}

/** 하나라도 포토가 있으면 포토리뷰 */
export function isPhotoReview(review: Pick<Review, 'imageUrls'>): boolean {
  return review.imageUrls.length > 0;
}

/** 별점 필터('전체'면 전체) */
export function filterByRating(list: readonly Review[], filter: RatingFilter): readonly Review[] {
  if (filter === RATING_FILTER_ALL) return list;
  return list.filter((review) => review.rating === filter);
}

/** 상품명·작성자 검색(대소문자 무시) */
export function searchReviews(list: readonly Review[], keyword: string): readonly Review[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (review) =>
      review.productName.toLowerCase().includes(needle) ||
      review.author.toLowerCase().includes(needle),
  );
}

/** 평균 별점(소수 1자리) — 비면 0 */
export function averageRating(list: readonly Review[]): number {
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / list.length) * 10) / 10;
}

/** 작성일 내림차순(최근이 위). 같은 날짜는 id 안정 정렬. 테스트가 직접 부른다. */
export function sortReviews(list: readonly Review[]): readonly Review[] {
  return [...list].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 항목 → 쓰기 입력(id 제외). 인라인 토글·상세 저장이 함께 쓴다. */
export function toReviewInput(review: Review): ReviewInput {
  return {
    productId: review.productId,
    productName: review.productName,
    author: review.author,
    rating: review.rating,
    content: review.content,
    imageUrls: [...review.imageUrls],
    createdAt: review.createdAt,
    visible: review.visible,
    reported: review.reported,
    reportReason: review.reportReason,
    reply: review.reply,
  };
}
