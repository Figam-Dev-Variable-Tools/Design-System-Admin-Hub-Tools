// ProductListPage — 상품 목록 (라우트: /products)
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 **좌측 카테고리·판매상태 필터** + 검색 +
// 재고/상태 배지 + 전시상태 인라인 토글을 얹는다. 목록엔 이미지 열을 넣지 않는다(전 섹션 규칙).
//
// [좌측 필터 — 회원 화면이 정본] 예전에는 카테고리/판매상태가 툴바의 <select> 두 개였다. 선택지가
// 드롭다운 안에 숨어 있어 '지금 무엇으로 걸러져 있는지'와 '각 조건에 몇 건이 있는지'를 볼 수 없었다.
// 회원 목록의 등급/그룹 필터와 같은 좌측 aside(건수 배지 + aria-pressed)로 바꾼다.
//
// [조회 상태의 소유자] category·status·keyword 는 이 파일의 useState 3개였다. 이제 shared/crud 의
// useListState 가 **URL 쿼리스트링**으로 소유한다 (IA-13) — 필터를 건 채 상세로 갔다 Back 하면
// 그 필터가 그대로 살아 있고, 그 URL 을 그대로 공유할 수 있다. 검색은 IME 안전이다 (COMP-10).
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { formatNumber, objectParticle } from '../../../shared/format';
import { Button, PlusCircleIcon, SearchField, StatusBadge, ToggleSwitch } from '../../../shared/ui';
import {
  CrudListShell,
  parseFilter,
  useCrudList,
  useCrudRowUpdate,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { fetchProductCategoryOptions, productAdapter } from './data-source';
import { ProductFilterPanel } from './components/ProductFilterPanel';
import {
  categoryTone,
  SALE_STATUS_FILTERS,
  saleStatusLabel,
  saleStatusTone,
  toProductInput,
} from './types';
import type { SaleStatusFilter } from './types';
import {
  countProductsByCategory,
  countProductsBySaleStatus,
  filterBySaleStatus,
  filterProducts,
  finalPrice,
  isLowStock,
  PRODUCT_FILTER_ALL,
  searchProducts,
  totalStock,
} from '../_shared/store';
import type { Product, ProductInput } from '../_shared/store';

const RESOURCE = 'products';
const ENTITY_LABEL = '상품';
const LIST_PATH = '/products';
const SALE_STATUS_FILTER_VALUES: readonly SaleStatusFilter[] = SALE_STATUS_FILTERS.map(
  (option) => option.id,
);

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다 — 회원 화면과 같다) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'calc(var(--tds-space-6) * 9) minmax(0, 1fr)',
  gap: 'var(--tds-space-6)',
  alignItems: 'start',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: 'calc(var(--tds-space-6) * 14)',
};

const nameCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
};

const brandTextStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
};

const priceCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: 'var(--tds-space-1)',
};

const strikeStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  textDecorationLine: 'line-through',
};

const stockCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  justifyContent: 'flex-end',
};

const nameOf = (item: Product) => item.name;

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { category: PRODUCT_FILTER_ALL, status: PRODUCT_FILTER_ALL } as const;

export default function ProductListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // category·status·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const category = list.filters['category'] ?? PRODUCT_FILTER_ALL;
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체'로 되돌린다
  const status: SaleStatusFilter = parseFilter(
    list.filters['status'] ?? PRODUCT_FILTER_ALL,
    SALE_STATUS_FILTER_VALUES,
    PRODUCT_FILTER_ALL,
  );
  const { keyword } = list;

  const controller = useCrudList<Product, ProductInput>({
    resource: RESOURCE,
    adapter: productAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;
  const toggle = useCrudRowUpdate<Product, ProductInput>(RESOURCE, productAdapter);

  const categoriesQuery = useQuery({
    queryKey: [RESOURCE, 'category-options'],
    queryFn: ({ signal }) => fetchProductCategoryOptions(signal),
  });
  const categories = categoriesQuery.data ?? [];

  // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다 — 화면에 없는 행이 선택된 채
  // '선택 3건 삭제' 가 되지 않게 한다 (STATE-04-b)
  useEffect(() => {
    clear();
  }, [category, status, keyword, clear]);

  // 건수 배지는 **필터 이전** 전체 집합에서 센다 — 두 축이 서로의 건수를 흔들지 않게 한다
  const loaded = !controller.firstLoading && controller.error === null;
  const categoryCounts = useMemo(
    () => (loaded ? countProductsByCategory(controller.items) : null),
    [controller.items, loaded],
  );
  const statusCounts = useMemo(
    () => (loaded ? countProductsBySaleStatus(controller.items) : null),
    [controller.items, loaded],
  );

  const visible = useMemo(() => {
    const byCategory = filterProducts(controller.items, category);
    const byStatus = filterBySaleStatus(byCategory, status);
    return searchProducts(byStatus, keyword);
  }, [controller.items, category, status, keyword]);

  const columns: readonly CrudColumn<Product>[] = [
    {
      header: '상품명',
      render: (item) => (
        <span style={nameCellStyle}>
          <span>{item.name}</span>
          {item.brand.trim() !== '' && <span style={brandTextStyle}>{item.brand}</span>}
        </span>
      ),
    },
    { header: 'SKU', nowrap: true, render: (item) => item.code },
    {
      header: '카테고리',
      nowrap: true,
      render: (item) => (
        <StatusBadge tone={categoryTone(item.categoryId)} label={item.categoryLabel} />
      ),
    },
    {
      header: '판매가',
      numeric: true,
      render: (item) => {
        const final = finalPrice(item.pricing);
        const discounted = item.pricing.discountType !== 'none' && final < item.pricing.price;
        return (
          <span style={priceCellStyle}>
            <span>{formatNumber(final)}원</span>
            {discounted && <span style={strikeStyle}>{formatNumber(item.pricing.price)}원</span>}
          </span>
        );
      },
    },
    {
      header: '재고',
      numeric: true,
      render: (item) => {
        const stock = totalStock(item);
        return (
          <span style={stockCellStyle}>
            <span>{formatNumber(stock)}</span>
            {stock === 0 ? (
              <StatusBadge tone="danger" label="품절" />
            ) : isLowStock(item) ? (
              <StatusBadge tone="warning" label="부족" />
            ) : null}
          </span>
        );
      },
    },
    {
      header: '전시',
      nowrap: true,
      render: (item) => (
        <ToggleSwitch
          checked={item.displayed}
          busy={toggle.pendingId === item.id}
          onChange={(next) =>
            toggle.run(
              item.id,
              { ...toProductInput(item), displayed: next },
              {
                success: next
                  ? `'${item.name}'${objectParticle(item.name)} 전시했습니다.`
                  : `'${item.name}'${objectParticle(item.name)} 숨겼습니다.`,
              },
            )
          }
          label={`${item.name} 전시 여부`}
          onLabel="전시중"
          offLabel="숨김"
        />
      ),
    },
    {
      header: '판매상태',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={saleStatusTone(item.saleStatus)}
          label={saleStatusLabel(item.saleStatus)}
        />
      ),
    },
  ];

  // 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03)
  const createButton = canCreate ? (
    <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
      <PlusCircleIcon />
      상품 등록
    </Button>
  ) : null;

  const toolbar = (
    <div style={toolbarStyle}>
      <span style={searchWrapStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="상품명·SKU·브랜드 검색"
          placeholder="상품명 · SKU · 브랜드 검색"
          // 조합 중 커밋 금지 + Enter 차단 — '패딩' 을 치는 도중 자모마다 조회가 나가지 않는다 (COMP-10)
          {...list.searchInputProps}
        />
      </span>
      {createButton}
    </div>
  );

  return (
    <div style={layoutStyle}>
      <ProductFilterPanel
        category={category}
        status={status}
        categories={categories}
        categoryCounts={categoryCounts}
        statusCounts={statusCounts}
        total={loaded ? controller.items.length : null}
        onCategoryChange={(next) => list.setFilter('category', next)}
        onStatusChange={(next) => list.setFilter('status', next)}
        categoriesFailed={categoriesQuery.error !== null}
        onRetryCategories={() => void categoriesQuery.refetch()}
      />

      <CrudListShell
        entityLabel={ENTITY_LABEL}
        controller={controller}
        visibleItems={visible}
        columns={columns}
        nameOf={nameOf}
        // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 / 등록 (STATE-05)
        empty={{
          hasQuery: list.hasQuery,
          hasActiveFilters: list.hasActiveFilters,
          onClearSearch: list.clearSearch,
          onResetFilters: list.resetFilters,
          ...(createButton !== null && { createAction: createButton }),
        }}
        selectAllLabelId="product-select-all"
        toolbar={toolbar}
        onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
      />
    </div>
  );
}
