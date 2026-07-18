// 상품 목록 좌측 필터
//
// 좌측 필터의 골격은 shared/ui 의 FilterPanel/FilterRail 한 벌이다 — 여기서 다시 만들지 않는다:
//   · 제목 + 목록 + 건수 배지 (COMP-05)
//   · 선택 상태는 aria-pressed 하나로만 말한다 (A11Y-12 — aria-current 금지)
//   · 건수를 아직 모르면 '—' 를 둔다 (0 과 '모름' 은 다르다)
//
// 카테고리와 판매상태는 서로 다른 축이며, 함께 고르면 AND 로 걸린다(등급 × 그룹과 같다).
import { useMemo } from 'react';

import { FilterPanel, FilterRail } from '../../../../shared/ui';
import type { FilterOption } from '../../../../shared/ui';
import { SALE_STATUS_FILTERS } from '../types';
import type { SaleStatusFilter } from '../types';
import { PRODUCT_FILTER_ALL } from '../../_shared/store';
import type { ProductCategory, ProductSaleStatus } from '../../_shared/store';

interface ProductFilterPanelProps {
  readonly category: string;
  readonly status: SaleStatusFilter;
  readonly categories: readonly ProductCategory[];
  /** 아직 안 불러왔으면 null — 건수 자리에 '—' 를 둔다 */
  readonly categoryCounts: Readonly<Record<string, number>> | null;
  readonly statusCounts: Readonly<Record<ProductSaleStatus, number>> | null;
  /** 전체 상품 수 — '전체' 항목의 배지 */
  readonly total: number | null;
  readonly onCategoryChange: (categoryId: string) => void;
  readonly onStatusChange: (status: SaleStatusFilter) => void;
  /** 카테고리 목록 조회 실패 — 전용 재시도 경로를 연다(상품 목록 조회와 별개의 요청이다) */
  readonly categoriesFailed?: boolean;
  readonly onRetryCategories?: () => void;
}

export function ProductFilterPanel({
  category,
  status,
  categories,
  categoryCounts,
  statusCounts,
  total,
  onCategoryChange,
  onStatusChange,
  categoriesFailed = false,
  onRetryCategories,
}: ProductFilterPanelProps) {
  const categoryOptions = useMemo<readonly FilterOption<string>[]>(
    () => [
      { id: PRODUCT_FILTER_ALL, label: '전체 카테고리' },
      ...categories.map((option) => ({ id: option.id, label: option.label })),
    ],
    [categories],
  );

  /**
   * '전체' 두 항목의 배지는 카테고리별/상태별 건수가 아니라 **전체 상품 수**다 —
   * counts 맵에 그 값을 얹어 배지 하나로 합류시킨다.
   */
  const categoryBadges = useMemo<Readonly<Record<string, number>> | null>(
    () =>
      categoryCounts === null || total === null
        ? null
        : { ...categoryCounts, [PRODUCT_FILTER_ALL]: total },
    [categoryCounts, total],
  );

  const statusBadges = useMemo<Readonly<Record<string, number>> | null>(
    () =>
      statusCounts === null || total === null
        ? null
        : { ...statusCounts, [PRODUCT_FILTER_ALL]: total },
    [statusCounts, total],
  );

  return (
    <FilterRail>
      {/* 카테고리 수에는 상한이 없다 — 사이드바가 카테고리 수만큼 늘어나지 않게 목록만 스크롤시킨다 */}
      <FilterPanel
        navLabel="상품 카테고리 필터"
        heading="카테고리"
        options={categoryOptions}
        value={category}
        counts={categoryBadges}
        onChange={onCategoryChange}
        scroll
        failed={categoriesFailed}
        // exactOptionalPropertyTypes — 없는 것과 'undefined 를 넘긴 것'은 다르다. 있을 때만 넘긴다
        {...(onRetryCategories !== undefined ? { onRetry: onRetryCategories } : {})}
      />

      <FilterPanel
        navLabel="상품 판매상태 필터"
        heading="판매상태"
        options={SALE_STATUS_FILTERS}
        value={status}
        counts={statusBadges}
        onChange={onStatusChange}
      />
    </FilterRail>
  );
}
