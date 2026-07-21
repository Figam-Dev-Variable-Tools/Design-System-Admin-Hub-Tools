/**
 * Design System/Templates/Products/Product List — 상품 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/products` → 메뉴 en = "Products"(상품 관리)
 * (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인 — Products 그룹의 Products 엔트리).
 *
 * 대응 실화면: apps/admin/src/pages/products/items/ProductListPage.tsx (라우트 /products) 와 그
 * 하위 조립(components/ProductFilterPanel.tsx) · 공용 껍데기(shared/crud/CrudListShell · CrudTable).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각(FilterRail/FilterPanel ·
 * CrudListShell/CrudTable)은 DS 표면으로 갈음한다: 좌측 카테고리/판매상태 필터 패널은 aria-pressed
 * 토글 버튼 + 건수 Badge 로, 목록 표는 DS Table(leading=선택·순번 / trailing=행 액션)로 조립한다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   검색 입력(IME 안전)        → SearchField
 *   좌측 카테고리·판매상태 필터  → aria-pressed 토글 버튼 목록 + Badge 건수 (실화면 FilterPanel×2)
 *   등록 버튼                  → Button(primary) + Icon(plus-circle)
 *   선택 일괄 삭제             → SelectionBar (실화면 CrudListShell 의 일괄 삭제 바)
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   카테고리·판매상태 배지      → StatusBadge
 *   재고 경고(품절/부족)        → StatusBadge (danger/warning)
 *   전시상태 인라인 토글        → ToggleSwitch
 *   행 액션(수정/삭제)          → RowActions
 *   목록 표(7열 + 선택·순번·액션) → Table
 *   빈 결과                    → Empty (검색 지우기 / 필터 초기화 / 등록)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Empty as EmptyState,
  Icon,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  ToggleSwitch,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Product List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 _shared/store 의 상품 모델을 목록이 쓰는 필드만 축약해 흉내) ───────────── */

type SaleStatus = 'on_sale' | 'sold_out' | 'stopped';
type DiscountType = 'none' | 'amount' | 'percent';
type CategoryId = 'all' | 'outer' | 'top' | 'bottom' | 'shoes' | 'acc';

interface DemoPricing {
  readonly price: number;
  readonly discountType: DiscountType;
  readonly discountValue: number;
}

interface DemoProduct {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly brand: string;
  readonly categoryId: Exclude<CategoryId, 'all'>;
  readonly categoryLabel: string;
  readonly pricing: DemoPricing;
  /** 총 재고(옵션별 재고 합) */
  readonly stock: number;
  readonly saleStatus: SaleStatus;
  readonly displayed: boolean;
}

/** 판매상태 → 배지 톤·문구 — 실화면 SALE_STATUS_OPTIONS 미러 */
const SALE_STATUS_META: Record<
  SaleStatus,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  on_sale: { label: '판매중', tone: 'success' },
  sold_out: { label: '품절', tone: 'warning' },
  stopped: { label: '판매중지', tone: 'neutral' },
};

/** 카테고리 → 배지 톤 — 실화면 categoryTone(id 해시) 자리를 안정 배정으로 갈음 */
const CATEGORY_TONE: Record<Exclude<CategoryId, 'all'>, StatusBadgeTone> = {
  outer: 'info',
  top: 'success',
  bottom: 'warning',
  shoes: 'neutral',
  acc: 'info',
};

/** 재고 부족 경고 임계값 — 실화면 LOW_STOCK_THRESHOLD 미러 */
const LOW_STOCK_THRESHOLD = 10;

const CATEGORY_FILTERS: readonly { readonly id: CategoryId; readonly label: string }[] = [
  { id: 'all', label: '전체 카테고리' },
  { id: 'outer', label: '아우터' },
  { id: 'top', label: '상의' },
  { id: 'bottom', label: '하의' },
  { id: 'shoes', label: '신발' },
  { id: 'acc', label: '액세서리' },
];

const STATUS_FILTERS: readonly { readonly id: SaleStatus | 'all'; readonly label: string }[] = [
  { id: 'all', label: '전체 상태' },
  { id: 'on_sale', label: '판매중' },
  { id: 'sold_out', label: '품절' },
  { id: 'stopped', label: '판매중지' },
];

const DEMO_PRODUCTS: readonly DemoProduct[] = [
  {
    id: 'prd-1',
    name: '루미엔 경량 패딩 점퍼',
    code: 'LMN-PAD-001',
    brand: '루미엔',
    categoryId: 'outer',
    categoryLabel: '아우터',
    pricing: { price: 129000, discountType: 'percent', discountValue: 20 },
    stock: 41,
    saleStatus: 'on_sale',
    displayed: true,
  },
  {
    id: 'prd-2',
    name: '노바 베이직 코튼 티셔츠',
    code: 'NVA-TEE-014',
    brand: '노바',
    categoryId: 'top',
    categoryLabel: '상의',
    pricing: { price: 19900, discountType: 'none', discountValue: 0 },
    stock: 204,
    saleStatus: 'on_sale',
    displayed: true,
  },
  {
    id: 'prd-3',
    name: '테라 스니커즈 데일리',
    code: 'TRA-SNK-207',
    brand: '테라',
    categoryId: 'shoes',
    categoryLabel: '신발',
    pricing: { price: 89000, discountType: 'amount', discountValue: 10000 },
    stock: 7,
    saleStatus: 'on_sale',
    displayed: true,
  },
  {
    id: 'prd-4',
    name: '카밀 워시드 데님 팬츠',
    code: 'CML-DNM-051',
    brand: '카밀',
    categoryId: 'bottom',
    categoryLabel: '하의',
    pricing: { price: 59000, discountType: 'none', discountValue: 0 },
    stock: 0,
    saleStatus: 'sold_out',
    displayed: true,
  },
  {
    id: 'prd-5',
    name: '오브제 미니멀 크로스백',
    code: 'OBJ-BAG-338',
    brand: '오브제',
    categoryId: 'acc',
    categoryLabel: '액세서리',
    pricing: { price: 45000, discountType: 'percent', discountValue: 15 },
    stock: 30,
    saleStatus: 'stopped',
    displayed: false,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 최종 판매가(할인 반영) — 실화면 store.finalPrice 미러 */
const finalPrice = (pricing: DemoPricing): number => {
  if (pricing.discountType === 'amount') return Math.max(0, pricing.price - pricing.discountValue);
  if (pricing.discountType === 'percent') {
    return Math.round((pricing.price * (100 - pricing.discountValue)) / 100);
  }
  return pricing.price;
};

/** 재고 부족(품절은 아니지만 임계값 미만) — 실화면 store.isLowStock 미러 */
const isLowStock = (product: DemoProduct): boolean => {
  if (product.saleStatus === 'stopped') return false;
  return product.stock > 0 && product.stock < LOW_STOCK_THRESHOLD;
};

/* 건수 배지는 **필터 이전** 전체 집합에서 센다 — 두 축이 서로의 건수를 흔들지 않게 한다 */
const CATEGORY_COUNTS: Record<CategoryId, number> = (() => {
  const counts: Record<CategoryId, number> = {
    all: DEMO_PRODUCTS.length,
    outer: 0,
    top: 0,
    bottom: 0,
    shoes: 0,
    acc: 0,
  };
  for (const product of DEMO_PRODUCTS) counts[product.categoryId] += 1;
  return counts;
})();

const STATUS_COUNTS: Record<SaleStatus | 'all', number> = (() => {
  const counts: Record<SaleStatus | 'all', number> = {
    all: DEMO_PRODUCTS.length,
    on_sale: 0,
    sold_out: 0,
    stopped: 0,
  };
  for (const product of DEMO_PRODUCTS) counts[product.saleStatus] += 1;
  return counts;
})();

/* ── 표 열 정의(데이터 열 7개 — 선택/순번/액션 열은 leading·trailing 으로 별도) ─────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '상품명' },
  { id: 'code', header: 'SKU', nowrap: true },
  { id: 'category', header: '카테고리', nowrap: true },
  { id: 'price', header: '판매가', align: 'end' },
  { id: 'stock', header: '재고', align: 'end' },
  { id: 'displayed', header: '전시', nowrap: true },
  { id: 'saleStatus', header: '판매상태', nowrap: true },
];

/** 헤더 전체선택의 보이지 않는 라벨 id — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'product-select-all-label';

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
  marginBottom: cssVar('space.5'),
};

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부(minmax(0,…) 이라야 표가 그리드를 밀지 않는다 — 실화면과 같다) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const railStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const filterGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const filterHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const filterButtonStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: active ? cssVar('color.border.default') : 'transparent',
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.text.default') : cssVar('color.text.muted'),
  cursor: 'pointer',
  textAlign: 'start',
  ...typography('typography.label.md'),
});

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const nameCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const brandTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const priceCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: cssVar('space.1'),
};

const strikeStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  textDecorationLine: 'line-through',
};

const stockCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const actionCellWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 좌측 필터 패널 조립(FilterPanel 미러: 제목 + 목록 + aria-pressed + 건수 Badge) ─────────── */

interface FilterGroupProps<V extends string> {
  readonly heading: string;
  readonly navLabel: string;
  readonly options: readonly { readonly id: V; readonly label: string }[];
  readonly value: V;
  readonly counts: Readonly<Record<string, number>> | null;
  readonly onChange: (value: V) => void;
}

function FilterGroup<V extends string>({
  heading,
  navLabel,
  options,
  value,
  counts,
  onChange,
}: FilterGroupProps<V>) {
  return (
    <nav aria-label={navLabel} style={filterGroupStyle}>
      <p style={filterHeadingStyle}>{heading}</p>
      <ul style={filterListStyle}>
        {options.map((option) => {
          const active = option.id === value;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={active}
                style={filterButtonStyle(active)}
                onClick={() => onChange(option.id)}
              >
                <span>{option.label}</span>
                {/* 건수를 아직 모르면 '—' 를 둔다(0 과 '모름' 은 다르다) — 여기선 항상 안다 */}
                {counts === null ? (
                  <span aria-hidden>—</span>
                ) : (
                  <Badge count={counts[option.id] ?? 0} hideWhenZero={false} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Decorator 화살표가 아닌 Capitalized 컴포넌트에서 useState) ── */

interface ProductListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty 상태(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
}

function ProductListScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: ProductListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [category, setCategory] = useState<CategoryId>('all');
  const [status, setStatus] = useState<SaleStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );

  // 카테고리 + 판매상태(AND) + 상품명/SKU/브랜드 키워드 — 실화면 filter 파이프라인 미러
  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_PRODUCTS.filter((product) => {
      if (category !== 'all' && product.categoryId !== category) return false;
      if (status !== 'all' && product.saleStatus !== status) return false;
      if (kw === '') return true;
      return (
        product.name.toLowerCase().includes(kw) ||
        product.code.toLowerCase().includes(kw) ||
        product.brand.toLowerCase().includes(kw)
      );
    });
  }, [keyword, category, status]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;
  const hasActiveFilters = category !== 'all' || status !== 'all';

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const product of visible) {
        if (checked) next.add(product.id);
        else next.delete(product.id);
      }
      return next;
    });
  };

  // 보고 있는 행 집합이 바뀌면 선택은 무의미해진다 — 조건이 바뀌면 선택을 비운다 (STATE-04-b)
  const changeCategory = (next: CategoryId): void => {
    setCategory(next);
    setSelectedIds(new Set());
  };
  const changeStatus = (next: SaleStatus | 'all'): void => {
    setStatus(next);
    setSelectedIds(new Set());
  };
  const changeKeyword = (next: string): void => {
    setKeyword(next);
    setSelectedIds(new Set());
  };

  const createButton = (
    <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
      상품 등록
    </Button>
  );

  const rows: TableProps['rows'] = visible.map((product) => {
    const final = finalPrice(product.pricing);
    const discounted = product.pricing.discountType !== 'none' && final < product.pricing.price;
    const statusMeta = SALE_STATUS_META[product.saleStatus];
    return {
      id: product.id,
      selected: selectedIds.has(product.id),
      onActivate: () => {
        /* 실화면에서는 상품 수정(/products/:id/edit)으로 이동한다 — 템플릿에서는 조작 없음 */
      },
      leading: [
        <RowSelectCell
          key="select"
          id={product.id}
          label={`${product.name} 선택`}
          checked={selectedIds.has(product.id)}
          onToggle={(checked) => toggleOne(product.id, checked)}
        />,
        <SeqCell key="seq" seq={visible.indexOf(product) + 1} />,
      ],
      cells: [
        <span style={nameCellStyle}>
          <span>{product.name}</span>
          {product.brand.trim() !== '' && <span style={brandTextStyle}>{product.brand}</span>}
        </span>,
        product.code,
        <StatusBadge tone={CATEGORY_TONE[product.categoryId]} label={product.categoryLabel} />,
        <span style={priceCellStyle}>
          <span>{`${fmt(final)}원`}</span>
          {discounted && <span style={strikeStyle}>{`${fmt(product.pricing.price)}원`}</span>}
        </span>,
        <span style={stockCellStyle}>
          <span>{fmt(product.stock)}</span>
          {product.stock === 0 ? (
            <StatusBadge tone="danger" label="품절" />
          ) : isLowStock(product) ? (
            <StatusBadge tone="warning" label="부족" />
          ) : null}
        </span>,
        <ToggleSwitch
          checked={product.displayed}
          onChange={() => {
            /* 실화면: 인라인 토글이 전시/숨김을 즉시 저장한다 — 템플릿에서는 표시만 */
          }}
          label={`${product.name} 전시 여부`}
          onLabel="전시중"
          offLabel="숨김"
        />,
        <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />,
      ],
      trailing: [
        <td key="actions" className="tds-table__cell tds-table__cell--end">
          <span style={actionCellWrapStyle}>
            <RowActions
              label={product.name}
              onEdit={() => {
                /* 실화면: 상품 수정 화면으로 이동 */
              }}
              onDelete={() => {
                /* 실화면: 확인 다이얼로그를 연다 */
              }}
            />
          </span>
        </td>,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>상품 관리</h1>

      <div style={layoutStyle}>
        {/* 좌측 필터 레일 — 카테고리 + 판매상태(서로 AND) */}
        <aside style={railStyle}>
          <FilterGroup
            heading="카테고리"
            navLabel="상품 카테고리 필터"
            options={CATEGORY_FILTERS}
            value={category}
            counts={loading ? null : CATEGORY_COUNTS}
            onChange={changeCategory}
          />
          <FilterGroup
            heading="판매상태"
            navLabel="상품 판매상태 필터"
            options={STATUS_FILTERS}
            value={status}
            counts={loading ? null : STATUS_COUNTS}
            onChange={changeStatus}
          />
        </aside>

        {/* 우측 목록 본문 — 툴바 + 요약 + 일괄 삭제 바 + 표 */}
        <div style={columnStyle}>
          <div style={toolbarStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                label="상품명·SKU·브랜드 검색"
                value={keyword}
                placeholder="상품명 · SKU · 브랜드 검색"
                onChange={changeKeyword}
              />
            </span>
            {createButton}
          </div>

          {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
          <SelectionBar count={selectedCount} noun="건" onClear={() => setSelectedIds(new Set())}>
            <Button variant="danger" size="sm">
              {`선택 ${fmt(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <p style={summaryStyle}>
            {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
            {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
          </p>

          <Table
            caption="상품 목록 — 행을 누르면 상품 수정 화면으로 이동합니다. 체크박스·전시 토글·수정·삭제 버튼은 각자의 동작을 수행합니다."
            columns={COLUMNS}
            rows={rows}
            leadingHead={[
              <SelectAllHeaderCell
                key="select-all"
                label="이 페이지의 상품 전체 선택"
                labelId={SELECT_ALL_LABEL_ID}
                selection={selection}
                onToggleAll={toggleAll}
              />,
              <SeqHeaderCell key="seq" />,
            ]}
            trailingHead={[
              <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
                <span style={visuallyHidden}>행 액션</span>
              </th>,
            ]}
            loading={loading}
            skeletonRows={DEMO_PRODUCTS.length}
            empty={
              <EmptyState
                label="상품"
                hasQuery={keyword.trim() !== ''}
                hasActiveFilters={hasActiveFilters}
                action={createButton}
                onClearSearch={() => setKeyword('')}
                onResetFilters={() => {
                  setCategory('all');
                  setStatus('all');
                }}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

/** 정상: 상품 목록이 채워진 기본 상태(선택 없음 · 필터 없음) */
export const Default: Story = {
  render: () => <ProductListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ProductListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ProductListScreen initialKeyword="등록되지 않은 상품" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <ProductListScreen initialSelectedIds={['prd-1', 'prd-3']} />,
};
