// 포트폴리오 카테고리 화면 전용 타입 + 뷰 헬퍼 (A41 소유 — apps/admin/src/pages/portfolio/**)
//
// 카테고리 정본(픽스처·사용 중 판정)은 ../_shared/store 다. 여기는 입력 타입과 사용량 문구만 둔다.
import { formatNumber } from '../../../shared/format';

/** 카테고리 등록/수정 입력 */
export interface PortfolioCategoryInput {
  readonly name: string;
}

export const CATEGORY_NAME_MAX = 40;

/** 사용 여부 문구 — 사용 중이면 왜 못 지우는지 알린다(삭제 차단) */
export function usageLabel(itemCount: number): string {
  return itemCount === 0 ? '미사용' : `${formatNumber(itemCount)}개 사용 중`;
}
