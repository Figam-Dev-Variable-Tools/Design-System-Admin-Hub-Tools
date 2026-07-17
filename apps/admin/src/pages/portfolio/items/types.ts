// 포트폴리오 항목 화면 전용 뷰 헬퍼
//
// 도메인 모델·픽스처·순수 규칙의 정본은 ../_shared/store 다. 여기는 목록 표시(배지 색)와
// 항목 → 폼 입력 변환처럼 이 화면에만 필요한 뷰 헬퍼만 둔다.
import type { StatusTone } from '../../../shared/ui';
import type { PortfolioItem, PortfolioItemInput } from '../_shared/store';

/** 카테고리 배지 색 — 카테고리는 사용자 정의(고정 enum 아님)라 id 해시로 톤을 안정 배정한다 */
const CATEGORY_TONES: readonly StatusTone[] = ['info', 'success', 'warning', 'neutral'];

export function categoryTone(categoryId: string): StatusTone {
  let hash = 0;
  for (let index = 0; index < categoryId.length; index += 1) {
    hash = (hash + categoryId.charCodeAt(index)) % CATEGORY_TONES.length;
  }
  return CATEGORY_TONES[hash] ?? 'neutral';
}

/** 항목 → 폼/쓰기 입력(비정규화 라벨·id 제외). 목록 인라인 토글과 폼이 함께 쓴다. */
export function toPortfolioInput(item: PortfolioItem): PortfolioItemInput {
  return {
    title: item.title,
    categoryId: item.categoryId,
    client: item.client,
    summary: item.summary,
    coverImageUrl: item.coverImageUrl,
    imageUrls: [...item.imageUrls],
    published: item.published,
    date: item.date,
  };
}
