// 리뷰 동작 회귀 테스트 — 별점 표기·포토·평균·필터·정렬(순수)
import { describe, expect, it } from 'vitest';

import {
  averageRating,
  filterByRating,
  isPhotoReview,
  searchReviews,
  sortReviews,
  starText,
  toReviewInput,
} from './types';
import type { Review } from './types';

function reviewOf(overrides: Partial<Review> & { id: string }): Review {
  return {
    productId: 'prd-1',
    productName: '루미엔 패딩',
    author: '민**',
    rating: 5,
    content: '좋아요',
    imageUrls: [],
    createdAt: '2026-07-10',
    visible: true,
    reported: false,
    reportReason: '',
    reply: '',
    ...overrides,
  };
}

describe('starText — 별점 표기(순수)', () => {
  it('채운 별 + 빈 별 5칸', () => {
    expect(starText(3)).toBe('★★★☆☆');
    expect(starText(5)).toBe('★★★★★');
  });
});

describe('isPhotoReview — 포토리뷰 판정(순수)', () => {
  it('이미지가 있으면 포토리뷰', () => {
    expect(isPhotoReview({ imageUrls: ['a'] })).toBe(true);
    expect(isPhotoReview({ imageUrls: [] })).toBe(false);
  });
});

describe('averageRating — 평균 별점(순수)', () => {
  it('소수 1자리로 평균', () => {
    const list = [reviewOf({ id: 'a', rating: 5 }), reviewOf({ id: 'b', rating: 2 })];
    expect(averageRating(list)).toBe(3.5);
  });
  it('비면 0', () => {
    expect(averageRating([])).toBe(0);
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    reviewOf({ id: 'a', rating: 5, createdAt: '2026-07-10', productName: '패딩', author: '민**' }),
    reviewOf({
      id: 'b',
      rating: 2,
      createdAt: '2026-07-12',
      productName: '티셔츠',
      author: '지**',
    }),
  ];

  it('별점 필터', () => {
    expect(filterByRating(list, 5).map((r) => r.id)).toEqual(['a']);
    expect(filterByRating(list, 'all')).toHaveLength(2);
  });

  it('상품명·작성자 검색', () => {
    expect(searchReviews(list, '패딩').map((r) => r.id)).toEqual(['a']);
    expect(searchReviews(list, '지').map((r) => r.id)).toEqual(['b']);
  });

  it('작성일 내림차순 정렬', () => {
    expect(sortReviews(list).map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('toReviewInput 은 id 를 뺀다', () => {
    expect(toReviewInput(reviewOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});
