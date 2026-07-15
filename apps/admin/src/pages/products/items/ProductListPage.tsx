// ProductListPage — 상품 목록 (라우트: /products) · A41 소유
//
// 승격된 CRUD 프레임워크(useCrudList + CrudListShell) 위에 카테고리·판매상태 필터 + 검색 + 재고/상태
// 배지 + 전시상태 인라인 토글을 얹는다. 목록엔 이미지 열을 넣지 않는다(전 섹션 규칙).
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  Button,
  PlusCircleIcon,
  SearchField,
  SelectField,
  StatusBadge,
  ToggleSwitch,
} from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, useCrudRowUpdate } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { fetchProductCategoryOptions, productAdapter } from './data-source';
import {
  categoryTone,
  SALE_STATUS_FILTERS,
  saleStatusLabel,
  saleStatusTone,
  toProductInput,
} from './types';
import type { SaleStatusFilter } from './types';
import {
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

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = {
  width: 'calc(var(--tds-space-6) * 5)',
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

export default function ProductListPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState(PRODUCT_FILTER_ALL);
  const [status, setStatus] = useState<SaleStatusFilter>(PRODUCT_FILTER_ALL);
  const [keyword, setKeyword] = useState('');

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

  useEffect(() => {
    clear();
  }, [category, status, keyword, clear]);

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
                  ? `'${item.name}' 을(를) 전시했습니다.`
                  : `'${item.name}' 을(를) 숨겼습니다.`,
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

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={setKeyword}
          label="상품명·SKU·브랜드 검색"
          placeholder="상품명 · SKU · 브랜드 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="카테고리로 거르기"
          >
            <option value={PRODUCT_FILTER_ALL}>전체 카테고리</option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
        <span style={selectWrapStyle}>
          <SelectField
            value={status}
            onChange={(event) =>
              setStatus(
                parseFilter(event.target.value, SALE_STATUS_FILTER_VALUES, PRODUCT_FILTER_ALL),
              )
            }
            aria-label="판매상태로 거르기"
          >
            {SALE_STATUS_FILTERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        상품 등록
      </Button>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={columns}
      nameOf={nameOf}
      selectAllLabelId="product-select-all"
      emptyLabel="등록된 상품이 없습니다."
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
