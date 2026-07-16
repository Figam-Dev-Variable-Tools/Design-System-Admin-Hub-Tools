// 상품 목록 좌측 필터 (A41 소유 — apps/admin/src/pages/products/**)
//
// 회원 화면(TierFilter/GroupFilter)의 좌측 필터가 정본이다 — 새 패턴을 만들지 않는다:
//   · 제목 + 목록 + 건수 배지 한 벌 (승격된 filterPanel/filterNav/filterList/filterItem 스타일 — COMP-05)
//   · 선택 상태는 aria-pressed 하나로만 말한다 (A11Y-12 — aria-current 금지)
//   · 건수를 아직 모르면 '—' 를 둔다 (0 과 '모름' 은 다르다)
//
// 카테고리와 판매상태는 서로 다른 축이며, 함께 고르면 AND 로 걸린다(등급 × 그룹과 같다).
import type { CSSProperties } from 'react';

import {
  badgeStyle,
  Button,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterPanelStyle,
  hintStyle,
} from '../../../../shared/ui';
import { formatNumber } from '../../../../shared/format';
import { SALE_STATUS_FILTERS } from '../types';
import type { SaleStatusFilter } from '../types';
import { PRODUCT_FILTER_ALL } from '../../_shared/store';
import type { ProductCategory, ProductSaleStatus } from '../../_shared/store';

/** 카테고리 수에는 상한이 없다 — 사이드바가 카테고리 수만큼 늘어나지 않게 목록만 스크롤시킨다
 *  (회원 화면 GroupFilter 와 같은 처리 · 항목 높이 ≈ space-6, 약 10개 분량에서 스크롤이 시작된다) */
const categoryListStyle: CSSProperties = {
  ...filterListStyle,
  maxHeight: 'calc(var(--tds-space-6) * 10)',
  overflowY: 'auto',
};

/** 카테고리 목록 조회 실패 — 목록 자리에 문구 + 재시도 ('전체 카테고리' 항목은 남는다) */
const errorRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
};

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

/** 건수 배지 — 아직 모르면 '—' */
function countLabel(count: number | null): string {
  return count === null ? '—' : formatNumber(count);
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
  return (
    <div style={filterPanelStyle}>
      <nav style={filterNavStyle} aria-label="상품 카테고리 필터">
        <h2 style={filterHeadingStyle}>카테고리</h2>

        <ul style={categoryListStyle}>
          <li>
            <button
              type="button"
              className="tds-ui-listitem tds-ui-focusable"
              style={filterItemStyle(category === PRODUCT_FILTER_ALL)}
              aria-pressed={category === PRODUCT_FILTER_ALL}
              onClick={() => onCategoryChange(PRODUCT_FILTER_ALL)}
            >
              <span>전체 카테고리</span>
              <span style={badgeStyle}>{countLabel(total)}</span>
            </button>
          </li>

          {categoriesFailed && onRetryCategories !== undefined && (
            <li>
              <div role="alert" style={errorRowStyle}>
                <span style={hintStyle}>카테고리를 불러오지 못했습니다.</span>
                <Button variant="secondary" onClick={onRetryCategories}>
                  다시 시도
                </Button>
              </div>
            </li>
          )}

          {categories.map((option) => {
            const active = option.id === category;
            const count = categoryCounts === null ? null : (categoryCounts[option.id] ?? 0);
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onCategoryChange(option.id)}
                >
                  <span>{option.label}</span>
                  <span style={badgeStyle}>{countLabel(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav style={filterNavStyle} aria-label="상품 판매상태 필터">
        <h2 style={filterHeadingStyle}>판매상태</h2>

        <ul style={filterListStyle}>
          {SALE_STATUS_FILTERS.map((option) => {
            const active = option.id === status;
            const count =
              option.id === PRODUCT_FILTER_ALL
                ? total
                : statusCounts === null
                  ? null
                  : (statusCounts[option.id] ?? 0);
            return (
              <li key={option.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onStatusChange(option.id)}
                >
                  <span>{option.label}</span>
                  <span style={badgeStyle}>{countLabel(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
