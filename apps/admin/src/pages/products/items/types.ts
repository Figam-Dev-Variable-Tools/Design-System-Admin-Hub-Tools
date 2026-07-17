// 상품 화면 전용 뷰 헬퍼 · 상수 (A41 소유 — apps/admin/src/pages/products/**)
//
// 도메인 모델·픽스처·순수 규칙의 정본은 ../_shared/store 다. 여기는 목록 표시(상태 배지 색·문구)와
// 항목 → 폼 입력 변환처럼 이 화면에만 필요한 뷰 헬퍼만 둔다.
import { ensureRichText } from '@tds/ui';

import type { StatusTone } from '../../../shared/ui';
import { PRODUCT_FILTER_ALL } from '../_shared/store';
import type { PointsEarnMode, Product, ProductInput, ProductSaleStatus } from '../_shared/store';

/** 판매상태 → 배지 톤·문구 (다중 상태 배지) */
interface SaleStatusMeta {
  readonly id: ProductSaleStatus;
  readonly label: string;
  readonly tone: StatusTone;
}

export const SALE_STATUS_OPTIONS: readonly SaleStatusMeta[] = [
  { id: 'on_sale', label: '판매중', tone: 'success' },
  { id: 'sold_out', label: '품절', tone: 'warning' },
  { id: 'stopped', label: '판매중지', tone: 'neutral' },
];

export function saleStatusLabel(status: ProductSaleStatus): string {
  return SALE_STATUS_OPTIONS.find((option) => option.id === status)?.label ?? status;
}

export function saleStatusTone(status: ProductSaleStatus): StatusTone {
  return SALE_STATUS_OPTIONS.find((option) => option.id === status)?.tone ?? 'neutral';
}

/** 카테고리 배지 색 — 카테고리는 사용자 정의(고정 enum 아님)라 id 해시로 톤을 안정 배정한다 */
const CATEGORY_TONES: readonly StatusTone[] = ['info', 'success', 'warning', 'neutral'];

export function categoryTone(categoryId: string): StatusTone {
  let hash = 0;
  for (let index = 0; index < categoryId.length; index += 1) {
    hash = (hash + categoryId.charCodeAt(index)) % CATEGORY_TONES.length;
  }
  return CATEGORY_TONES[hash] ?? 'neutral';
}

/** 판매상태 필터 값 — '전체' + 개별 상태 */
export type SaleStatusFilter = typeof PRODUCT_FILTER_ALL | ProductSaleStatus;

export const SALE_STATUS_FILTERS: readonly {
  readonly id: SaleStatusFilter;
  readonly label: string;
}[] = [
  { id: PRODUCT_FILTER_ALL, label: '전체 상태' },
  { id: 'on_sale', label: '판매중' },
  { id: 'sold_out', label: '품절' },
  { id: 'stopped', label: '판매중지' },
];

/** 적립 방식 선택지 — 상품 폼의 '적립금' 카드가 쓴다 (F: 상품별 적립률/고정액/미적용) */
export const POINTS_MODE_OPTIONS: readonly {
  readonly id: PointsEarnMode;
  readonly label: string;
}[] = [
  { id: 'rate', label: '정률 적립(%)' },
  { id: 'fixed', label: '정액 적립(원)' },
  { id: 'none', label: '적립 미적용' },
];

/**
 * 항목 → 폼/쓰기 입력(id·비정규화 라벨 제외). 목록 인라인 토글과 폼이 함께 쓴다.
 *
 * [상세설명 마이그레이션 지점] description 은 이제 HTML 이다. textarea 시절에 저장된 평문이
 * 남아 있을 수 있으므로 여기서 ensureRichText 로 승격한다 — 값을 읽는 모든 경로가 이 함수를
 * 지나므로 여기 한 곳이면 된다. 이미 HTML 인 값에는 멱등이라 인라인 토글이 반복해 불러도 안전하다.
 */
export function toProductInput(product: Product): ProductInput {
  return {
    name: product.name,
    code: product.code,
    categoryId: product.categoryId,
    brand: product.brand,
    pricing: { ...product.pricing },
    saleStatus: product.saleStatus,
    displayed: product.displayed,
    shipping: { ...product.shipping },
    points: { ...product.points },
    optionGroups: product.optionGroups.map((group) => ({ ...group, values: [...group.values] })),
    variants: product.variants.map((variant) => ({
      ...variant,
      optionValues: [...variant.optionValues],
    })),
    coverImageUrl: product.coverImageUrl,
    imageUrls: [...product.imageUrls],
    description: ensureRichText(product.description),
    tags: [...product.tags],
  };
}
