/**
 * Design System/Templates/Products/Product Categories — 상품 카테고리 관리 화면
 * (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Products"(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Products 그룹, `/products/categories` → 화면 en = "Categories" 에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/categories/ProductCategoriesPage.tsx
 * (라우트 /products/categories). 좌측 사용 여부 필터 + 목록 + 추가/수정 모달 + 삭제 확인.
 * **사용 중 차단**: 카테고리를 쓰는 상품이 1건이라도 있으면 삭제 버튼을 잠그고 'N개 상품'을
 * 알린다(고아 상품 방지). 포트폴리오 카테고리와 같은 안전 기본값이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 조각을 DS 표면으로 갈음한다:
 *   좌측 사용 여부 필터(CategoryUsageFilter → FilterRail/FilterPanel)
 *                          → Panel + 토큰만 쓴 <nav>/<ul>/<li>(button[aria-pressed] + 건수 배지)
 *   요약 + 추가 CTA         → 토큰만 쓴 <p> + Button(primary) + Icon(plus-circle)
 *   카드 표면               → Card
 *   행 목록                 → 토큰만 쓴 <ul>/<li> (라벨 + StatusBadge + IconButton ×2)
 *   사용량 배지             → StatusBadge (usageLabel 미러: '미사용' / 'N개 상품')
 *   수정/삭제 버튼          → IconButton + Icon(pencil/trash) (사용 중이면 삭제 disabled)
 *   조회 실패 배너          → Alert(danger) + Button(secondary)
 *   추가/수정 모달          → Modal + TextField
 *   삭제 확인               → ConfirmDialog(intent=delete, busy/error)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useRef, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  IconButton,
  Modal,
  Panel,
  StatusBadge,
  TextField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Product Categories',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 _shared/store 픽스처 + 사용량 미러) ─────────────────────────────────────── */

const CATEGORY_NAME_MAX = 40;

interface DemoCategory {
  readonly id: string;
  readonly label: string;
  /** 이 카테고리를 쓰는 상품 수 — 1 이상이면 삭제 잠금 */
  readonly productCount: number;
}

const DEMO_CATEGORIES: readonly DemoCategory[] = [
  { id: 'outer', label: '아우터', productCount: 8 },
  { id: 'top', label: '상의', productCount: 12 },
  { id: 'bottom', label: '하의', productCount: 5 },
  { id: 'shoes', label: '신발', productCount: 0 },
  { id: 'accessory', label: '액세서리', productCount: 0 },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 사용 여부 문구 — 실화면 categories/types.usageLabel 미러('N개 상품') */
const usageLabel = (productCount: number): string =>
  productCount === 0 ? '미사용' : `${fmt(productCount)}개 상품`;

/* ── 좌측 사용 여부 필터(실화면 types.CATEGORY_USAGE_FILTERS 미러) ─────────────────────────────── */

type UsageFilter = 'all' | 'in-use' | 'unused';

const USAGE_FILTERS: readonly { readonly id: UsageFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'in-use', label: '사용 중' },
  { id: 'unused', label: '미사용' },
];

/** 사용 여부별 건수 — 좌측 필터의 배지(실화면 countCategoriesByUsage 미러) */
function countByUsage(list: readonly DemoCategory[]): Readonly<Record<UsageFilter, number>> {
  const inUse = list.filter((category) => category.productCount > 0).length;
  return { all: list.length, 'in-use': inUse, unused: list.length - inUse };
}

/** 사용 여부로 거르기(실화면 filterCategoriesByUsage 미러) */
function filterByUsage(
  list: readonly DemoCategory[],
  filter: UsageFilter,
): readonly DemoCategory[] {
  if (filter === 'all') return list;
  if (filter === 'in-use') return list.filter((category) => category.productCount > 0);
  return list.filter((category) => category.productCount === 0);
}

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (실화면 layoutStyle 미러) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const filterNavStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const filterHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: cssVar('space.3'),
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

/** 선택 시 배경 강조 + 파란 텍스트(실화면 filterItemStyle 미러). aria-pressed 로 상태를 말한다(A11Y-12) */
const filterItemStyle = (active: boolean): CSSProperties => ({
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
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
  ...typography('typography.label.md'),
  fontWeight: active
    ? cssVar('primitive.typography.font-weight.bold')
    : cssVar('primitive.typography.font-weight.regular'),
  textAlign: 'left',
  cursor: 'pointer',
});

const countBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  minWidth: cssVar('space.5'),
  height: cssVar('space.5'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
  lineHeight: '1',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  margin: 0,
  padding: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const rowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const labelTextStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  overflowWrap: 'anywhere',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
};

const errorRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const modalBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

/* ── 행 ───────────────────────────────────────────────────────────────────────────────────── */

interface CategoryRowProps {
  readonly category: DemoCategory;
  readonly deleting: boolean;
  readonly onEdit: (category: DemoCategory) => void;
  readonly onDelete: (category: DemoCategory) => void;
}

function CategoryRow({ category, deleting, onEdit, onDelete }: CategoryRowProps) {
  const inUse = category.productCount > 0;
  const usage = usageLabel(category.productCount);
  return (
    <li style={rowStyle}>
      <span style={rowLeftStyle}>
        <span style={labelTextStyle}>{category.label}</span>
        <StatusBadge tone={inUse ? 'info' : 'neutral'} label={usage} />
      </span>
      <span style={actionsStyle}>
        <IconButton
          icon={<Icon name="pencil" />}
          label={`${category.label} 수정`}
          size="sm"
          onClick={() => onEdit(category)}
        />
        {/* 사용 중이면 삭제를 잠근다 — 배지의 'N개 상품'이 이유를 함께 전달한다(색만으로 전달 금지) */}
        <IconButton
          icon={<Icon name="trash" />}
          label={
            inUse ? `${category.label} — ${usage}라 삭제할 수 없습니다` : `${category.label} 삭제`
          }
          size="sm"
          disabled={inUse || deleting}
          onClick={() => onDelete(category)}
        />
      </span>
    </li>
  );
}

/* ── 추가/수정 모달 ────────────────────────────────────────────────────────────────────────── */

interface CategoryModalProps {
  readonly editing: DemoCategory | null;
  readonly onClose: () => void;
}

function CategoryModal({ editing, onClose }: CategoryModalProps) {
  const isEdit = editing !== null;
  const [name, setName] = useState(editing?.label ?? '');
  const nameRef = useRef<HTMLInputElement | null>(null);

  return (
    <Modal
      title={isEdit ? '카테고리 수정' : '카테고리 추가'}
      onClose={onClose}
      onSubmit={onClose}
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="md" type="submit">
            {isEdit ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      <div style={modalBodyStyle}>
        {/* TextField 가 라벨·필수 마커를 소유한다 — FormField 로 감싸면 라벨이 이중으로 그려진다 */}
        <TextField
          id="product-category-name"
          label="카테고리 이름"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 아우터"
          maxLength={CATEGORY_NAME_MAX}
        />
      </div>
    </Modal>
  );
}

/* ── 화면 ─────────────────────────────────────────────────────────────────────────────────── */

type ModalState =
  { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; category: DemoCategory };

interface CategoriesScreenProps {
  readonly loading?: boolean;
  readonly error?: boolean;
  readonly categories?: readonly DemoCategory[];
  readonly initialUsage?: UsageFilter;
  readonly initialModal?: ModalState;
  readonly initialDeleteId?: string;
  /** 삭제 진행 중 — ConfirmDialog busy */
  readonly deleting?: boolean;
  /** 삭제 실패 배너 — ConfirmDialog error */
  readonly deleteError?: string;
}

function CategoriesScreen({
  loading = false,
  error = false,
  categories = DEMO_CATEGORIES,
  initialUsage = 'all',
  initialModal = { kind: 'closed' },
  initialDeleteId,
  deleting = false,
  deleteError,
}: CategoriesScreenProps) {
  const [usage, setUsage] = useState<UsageFilter>(initialUsage);
  const [modal, setModal] = useState<ModalState>(initialModal);
  const [pendingDelete, setPendingDelete] = useState<DemoCategory | null>(
    () => categories.find((category) => category.id === initialDeleteId) ?? null,
  );

  // 아직 못 불러왔으면 건수는 null — 배지에 '—'(0 과 '모름'은 다르다)
  const counts = useMemo(() => (loading ? null : countByUsage(categories)), [categories, loading]);
  const visible = useMemo(() => filterByUsage(categories, usage), [categories, usage]);
  const hasActiveFilters = usage !== 'all';

  const createButton = (
    <Button
      variant="primary"
      size="md"
      iconLeft={<Icon name="plus-circle" />}
      onClick={() => setModal({ kind: 'create' })}
    >
      카테고리 추가
    </Button>
  );

  return (
    <div style={layoutStyle}>
      {/* 좌측 사용 여부 필터 — 실화면 CategoryUsageFilter(FilterRail/FilterPanel)를 Panel 로 갈음 */}
      <Panel>
        <nav style={filterNavStyle} aria-label="카테고리 사용 여부 필터">
          <h2 style={filterHeadingStyle}>사용 여부</h2>
          <ul style={filterListStyle}>
            {USAGE_FILTERS.map((option) => {
              const active = usage === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    style={filterItemStyle(active)}
                    aria-pressed={active}
                    onClick={() => setUsage(option.id)}
                  >
                    <span>{option.label}</span>
                    <span style={countBadgeStyle}>
                      {counts === null ? '—' : fmt(counts[option.id])}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </Panel>

      <div style={pageStyle}>
        <div style={toolbarStyle}>
          {/* 재조회 중에도 건수를 지우지 않는다 — 이전 사실을 유지한다 (STATE-01/03) */}
          <p style={summaryStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}개`}</p>
          {createButton}
        </div>

        {error ? (
          <Alert tone="danger">
            <div style={errorRowStyle}>
              <span>카테고리를 불러오지 못했습니다.</span>
              <Button variant="secondary">다시 시도</Button>
            </div>
          </Alert>
        ) : (
          <Card>
            {loading ? (
              <p style={summaryStyle}>불러오는 중…</p>
            ) : visible.length === 0 ? (
              /* 왜 비었는지에 따라 복구 수단이 다르다 — 필터 초기화 / 추가 CTA (STATE-05) */
              <EmptyState
                label="카테고리"
                hasActiveFilters={hasActiveFilters}
                onResetFilters={() => setUsage('all')}
                action={createButton}
              />
            ) : (
              <ul style={listStyle}>
                {visible.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    deleting={deleting}
                    onEdit={(target) => setModal({ kind: 'edit', category: target })}
                    onDelete={(target) => setPendingDelete(target)}
                  />
                ))}
              </ul>
            )}
            <p style={hintStyle}>
              사용 중인 카테고리는 삭제할 수 없습니다 — 먼저 그 상품들의 카테고리를 바꾸거나
              삭제하세요.
            </p>
          </Card>
        )}

        {modal.kind !== 'closed' && (
          <CategoryModal
            editing={modal.kind === 'edit' ? modal.category : null}
            onClose={() => setModal({ kind: 'closed' })}
          />
        )}

        {pendingDelete !== null && (
          <ConfirmDialog
            intent="delete"
            title="카테고리 삭제"
            message={`'${pendingDelete.label}' 카테고리를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
            confirmLabel="카테고리 삭제"
            busy={deleting}
            {...(deleteError !== undefined && { error: deleteError })}
            onConfirm={() => setPendingDelete(null)}
            onCancel={() => setPendingDelete(null)}
          />
        )}
      </div>
    </div>
  );
}

/** 정상: 사용 여부 필터 + 카테고리 목록(사용 중 배지 + 사용 중 항목의 삭제 잠금) */
export const Default: Story = {
  render: () => <CategoriesScreen />,
};

/** 최초 로드: 요약·건수 배지가 '불러오는 중…'/'—' (STATE-01, 목록을 비우지 않는다) */
export const Loading: Story = {
  render: () => <CategoriesScreen loading categories={[]} />,
};

/** 빈 상태: 등록된 카테고리 없음 → 생성 CTA */
export const Empty: Story = {
  render: () => <CategoriesScreen categories={[]} />,
};

/** 필터 결과 없음: '미사용'만 봤을 때 미사용 카테고리가 없음 → 필터 초기화 (STATE-05) */
export const FilteredEmpty: Story = {
  render: () => (
    <CategoriesScreen
      initialUsage="unused"
      categories={[
        { id: 'outer', label: '아우터', productCount: 8 },
        { id: 'top', label: '상의', productCount: 12 },
      ]}
    />
  ),
};

/** 조회 실패: danger 배너 + 다시 시도 (STATE-02) */
export const LoadError: Story = {
  render: () => <CategoriesScreen error />,
};

/** 카테고리 추가 모달 열림 */
export const AddCategory: Story = {
  render: () => <CategoriesScreen initialModal={{ kind: 'create' }} />,
};

/** 카테고리 수정 모달 열림(기존 이름 채워짐) */
export const EditCategory: Story = {
  render: () => (
    <CategoriesScreen
      initialModal={{
        kind: 'edit',
        category: { id: 'outer', label: '아우터', productCount: 8 },
      }}
    />
  ),
};

/** 삭제 확인: 미사용 카테고리에 대한 ConfirmDialog */
export const DeleteConfirm: Story = {
  render: () => <CategoriesScreen initialDeleteId="shoes" />,
};

/** 삭제 실패: ConfirmDialog 본문 아래 danger 배너 — 확인 버튼이 되살아나 재클릭이 곧 재시도 */
export const DeleteError: Story = {
  render: () => (
    <CategoriesScreen
      initialDeleteId="shoes"
      deleteError="삭제하지 못했습니다. 잠시 후 다시 시도해 주세요."
    />
  ),
};
