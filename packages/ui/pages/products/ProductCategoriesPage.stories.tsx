/**
 * Design System/Templates/Products/Product Categories — 상품 카테고리 관리 화면
 * (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Products"(상품 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Products 그룹, `/products/categories` → 화면 en = "Categories" 에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/products/categories/ProductCategoriesPage.tsx
 * (라우트 /products/categories). 좌측 사용 여부 필터 + **2Depth 트리 목록** + 추가/수정 모달 +
 * 삭제 확인. 카테고리는 **최대 2단계**(대분류 → 중분류)이며, 대분류 행은 하위를 접었다 폈다 하는
 * 드롭다운 토글과 '하위 N개' 배지, '하위 카테고리 추가' 액션을 갖는다. 기본은 전부 펼침이다
 * (숨겨진 정보 없이 시작한다). **삭제 차단 사유는 둘이다**: 카테고리를 쓰는 상품이 1건이라도
 * 있거나(고아 상품 방지), 하위 카테고리가 달려 있거나(계층이 끊긴다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 조각을 DS 표면으로 갈음한다:
 *   좌측 사용 여부 필터(CategoryUsageFilter → FilterRail/FilterPanel)
 *                          → Panel + 토큰만 쓴 <nav>/<ul>/<li>(button[aria-pressed] + 건수 배지)
 *   요약 + 추가 CTA         → 토큰만 쓴 <p> + Button(primary) + Icon(plus-circle)
 *   카드 표면               → Card
 *   2Depth 트리 목록        → 토큰만 쓴 <ul>/<li> (대분류 행 + 들여쓴 중분류 <ul id=…>)
 *   하위 펼침/접기 토글      → IconButton + Icon(chevron-down / chevron-right) + aria-expanded/aria-controls
 *   사용량 배지 · 하위 수 배지 → StatusBadge ×2 (usageLabel 미러: '미사용' / 'N개 상품' · '하위 N개')
 *   하위 카테고리 추가       → IconButton + Icon(plus-circle) — 대분류 행에만(2단계 제한)
 *   수정/삭제 버튼          → IconButton + Icon(pencil/trash) (사용 중·하위 있음이면 삭제 disabled)
 *   조회 실패 배너          → Alert(danger) + Button(secondary)
 *   추가/수정 모달          → Modal + TextField + FormField/SelectField(상위 카테고리 · '없음 (대분류)')
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
  FormField,
  Icon,
  IconButton,
  Modal,
  Panel,
  SelectField,
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
  /** 상위 카테고리 id. null 이면 최상위(1Depth · 대분류) */
  readonly parentId: string | null;
  /** 이 카테고리를 쓰는 상품 수 — 1 이상이면 삭제 잠금 */
  readonly productCount: number;
  /** 하위(2Depth)를 가진 대분류인가 — 있으면 삭제를 막는다 */
  readonly hasChildren: boolean;
}

/**
 * 실화면 store 의 2Depth 카테고리 픽스처를 미러한다 — 대분류 5개(아우터·상의·하의·신발·액세서리)와
 * 그 아래 중분류 6개. 세 가지 경우가 한 화면에 모두 보이게 사용량을 잡았다:
 *   (a) 하위가 있어 못 지우는 대분류, (b) 쓰는 상품이 있어 못 지우는 카테고리, (c) 지울 수 있는 것.
 */
const DEMO_CATEGORIES: readonly DemoCategory[] = [
  { id: 'outer', label: '아우터', parentId: null, productCount: 0, hasChildren: true },
  { id: 'top', label: '상의', parentId: null, productCount: 0, hasChildren: true },
  { id: 'bottom', label: '하의', parentId: null, productCount: 0, hasChildren: true },
  { id: 'shoes', label: '신발', parentId: null, productCount: 0, hasChildren: false },
  { id: 'acc', label: '액세서리', parentId: null, productCount: 3, hasChildren: false },
  { id: 'outer-coat', label: '코트', parentId: 'outer', productCount: 4, hasChildren: false },
  { id: 'outer-jacket', label: '재킷', parentId: 'outer', productCount: 3, hasChildren: false },
  { id: 'top-tee', label: '티셔츠', parentId: 'top', productCount: 9, hasChildren: false },
  { id: 'top-shirt', label: '셔츠', parentId: 'top', productCount: 3, hasChildren: false },
  { id: 'bottom-pants', label: '팬츠', parentId: 'bottom', productCount: 5, hasChildren: false },
  { id: 'bottom-skirt', label: '스커트', parentId: 'bottom', productCount: 0, hasChildren: false },
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
  aspectRatio: '1',
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

/** 2Depth 행은 상위 아래에 들여쓴다 — 계층이 한눈에 보이게(실화면 childListStyle 미러) */
const childListStyle: CSSProperties = {
  ...listStyle,
  marginTop: cssVar('space.2'),
  paddingLeft: cssVar('space.6'),
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
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

/** 토글이 없는 행의 자리맞춤 — 토글 버튼과 같은 폭(들쭉날쭉하지 않게) */
const disclosureSpacerStyle: CSSProperties = {
  display: 'inline-block',
  inlineSize: cssVar('space.6'),
  flexShrink: 0,
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
  /** 하위를 펼쳤나 — 대분류에만 준다. undefined 면 펼침 토글 자체가 없다(중분류 행) */
  readonly expanded?: boolean;
  readonly childPanelId?: string;
  readonly childCount?: number;
  readonly onToggle?: () => void;
  readonly onEdit: (category: DemoCategory) => void;
  readonly onDelete: (category: DemoCategory) => void;
  readonly onAddChild: (parent: DemoCategory) => void;
}

function CategoryRow({
  category,
  deleting,
  expanded,
  childPanelId,
  childCount = 0,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
}: CategoryRowProps) {
  const inUse = category.productCount > 0;
  const usage = usageLabel(category.productCount);
  const isRoot = category.parentId === null;
  // 삭제 차단 사유는 둘이다 — 쓰는 상품이 있거나, 하위 카테고리가 달려 있거나
  const blockReason = inUse ? usage : category.hasChildren ? '하위 카테고리 있음' : null;
  const blocked = blockReason !== null;
  const togglable = expanded !== undefined && onToggle !== undefined && childCount > 0;

  return (
    <li style={rowStyle}>
      <span style={rowLeftStyle}>
        {/* 하위를 접었다 폈다 하는 드롭다운 — 하위가 있는 대분류에만 붙는다 */}
        {togglable ? (
          <IconButton
            icon={<Icon name={expanded ? 'chevron-down' : 'chevron-right'} />}
            label={`${category.label} 하위 카테고리 ${expanded ? '접기' : '펼치기'} (${String(childCount)}개)`}
            size="sm"
            aria-expanded={expanded}
            aria-controls={childPanelId}
            onClick={onToggle}
          />
        ) : (
          <span aria-hidden="true" style={disclosureSpacerStyle} />
        )}
        <span style={labelTextStyle}>{category.label}</span>
        <StatusBadge tone={inUse ? 'info' : 'neutral'} label={usage} />
        {category.hasChildren && (
          <StatusBadge tone="neutral" label={`하위 ${String(childCount)}개`} />
        )}
      </span>
      <span style={actionsStyle}>
        {/* 하위(2Depth) 추가는 대분류에만 — 2Depth 아래로는 만들지 않는다(2단계 제한) */}
        {isRoot && (
          <IconButton
            icon={<Icon name="plus-circle" />}
            label={`${category.label} 하위 카테고리 추가`}
            size="sm"
            onClick={() => onAddChild(category)}
          />
        )}
        <IconButton
          icon={<Icon name="pencil" />}
          label={`${category.label} 수정`}
          size="sm"
          onClick={() => onEdit(category)}
        />
        {/* 잠긴 이유를 라벨이 함께 말한다 — 배지의 'N개 상품'/'하위 N개'가 같은 사실을 눈으로도 전한다 */}
        <IconButton
          icon={<Icon name="trash" />}
          label={
            blocked
              ? `${category.label} — ${blockReason ?? ''}이라 삭제할 수 없어요`
              : `${category.label} 삭제`
          }
          size="sm"
          disabled={blocked || deleting}
          onClick={() => onDelete(category)}
        />
      </span>
    </li>
  );
}

/* ── 추가/수정 모달 ────────────────────────────────────────────────────────────────────────── */

interface CategoryModalProps {
  readonly editing: DemoCategory | null;
  /** 등록 시 미리 고정할 상위 카테고리 — '하위 카테고리 추가'로 열면 채워진다 */
  readonly presetParentId: string | null;
  readonly categories: readonly DemoCategory[];
  readonly onClose: () => void;
}

function CategoryModal({ editing, presetParentId, categories, onClose }: CategoryModalProps) {
  const isEdit = editing !== null;
  const [name, setName] = useState(editing?.label ?? '');
  const [parentId, setParentId] = useState(editing?.parentId ?? presetParentId ?? '');
  const nameRef = useRef<HTMLInputElement | null>(null);

  /**
   * 상위로 고를 수 있는 것은 **1Depth 뿐**이다(2단계 제한). 수정 중이면 자기 자신을 후보에서 뺀다.
   * 하위를 이미 가진 대분류는 다른 대분류 밑으로 옮길 수 없다 — 상위 선택 자체를 잠근다.
   */
  const parentOptions = categories.filter(
    (candidate) => candidate.parentId === null && (editing === null || candidate.id !== editing.id),
  );
  const parentLocked = isEdit && editing.hasChildren;

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
          ref={nameRef}
        />

        {/* 상위 카테고리 — 없음이면 1Depth(대분류), 고르면 그 아래 2Depth(중분류)로 만들어진다 */}
        <FormField
          htmlFor="product-category-parent"
          label="상위 카테고리"
          hint={
            parentLocked
              ? '하위 카테고리가 있어 상위를 바꿀 수 없어요.'
              : '선택하지 않으면 대분류(1Depth)로 만들어져요. 카테고리는 2단계까지 만들 수 있어요.'
          }
        >
          <SelectField
            id="product-category-parent"
            value={parentId}
            disabled={parentLocked}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">없음 (대분류)</option>
            {parentOptions.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.label}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>
    </Modal>
  );
}

/* ── 화면 ─────────────────────────────────────────────────────────────────────────────────── */

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; parentId: string | null }
  | { kind: 'edit'; category: DemoCategory };

interface CategoriesScreenProps {
  readonly loading?: boolean;
  readonly error?: boolean;
  readonly categories?: readonly DemoCategory[];
  readonly initialUsage?: UsageFilter;
  readonly initialModal?: ModalState;
  readonly initialDeleteId?: string;
  /** 처음부터 접어 둘 대분류 id — 실화면의 collapsed 집합 미러 */
  readonly initialCollapsedIds?: readonly string[];
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
  initialCollapsedIds = [],
  deleting = false,
  deleteError,
}: CategoriesScreenProps) {
  const [usage, setUsage] = useState<UsageFilter>(initialUsage);
  const [modal, setModal] = useState<ModalState>(initialModal);
  const [pendingDelete, setPendingDelete] = useState<DemoCategory | null>(
    () => categories.find((category) => category.id === initialDeleteId) ?? null,
  );
  /** 접은 대분류 id — 기본은 전부 펼침(숨겨진 정보 없이 시작한다) */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(initialCollapsedIds),
  );

  // 아직 못 불러왔으면 건수는 null — 배지에 '—'(0 과 '모름'은 다르다)
  const counts = useMemo(() => (loading ? null : countByUsage(categories)), [categories, loading]);
  const visible = useMemo(() => filterByUsage(categories, usage), [categories, usage]);
  const hasActiveFilters = usage !== 'all';

  /**
   * 필터 결과를 2단계 트리로 묶는다. 필터에 걸린 중분류의 **부모는 화면에 남긴다** —
   * 부모가 사라지면 자식이 어디 소속인지 알 수 없다(계층이 곧 정보다).
   */
  const tree = useMemo(() => {
    const visibleIds = new Set(visible.map((category) => category.id));
    const roots = categories.filter(
      (category) =>
        category.parentId === null &&
        (visibleIds.has(category.id) ||
          categories.some((child) => child.parentId === category.id && visibleIds.has(child.id))),
    );
    return roots.map((root) => ({
      root,
      children: visible.filter((category) => category.parentId === root.id),
    }));
  }, [categories, visible]);

  const toggleRoot = (rootId: string): void => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  const createButton = (
    <Button
      variant="primary"
      size="md"
      iconLeft={<Icon name="plus-circle" />}
      onClick={() => setModal({ kind: 'create', parentId: null })}
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
              <span>카테고리를 불러오지 못했어요.</span>
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
                {/* 대분류(1Depth) → 그 아래 중분류(2Depth)를 들여써 계층을 그대로 보인다 */}
                {tree.map((group) => {
                  const panelId = `category-children-${group.root.id}`;
                  const expanded = !collapsed.has(group.root.id);
                  return (
                    <li key={group.root.id} style={groupStyle}>
                      <ul style={listStyle}>
                        <CategoryRow
                          category={group.root}
                          deleting={deleting}
                          expanded={expanded}
                          childPanelId={panelId}
                          childCount={group.children.length}
                          onToggle={() => toggleRoot(group.root.id)}
                          onEdit={(target) => setModal({ kind: 'edit', category: target })}
                          onDelete={(target) => setPendingDelete(target)}
                          onAddChild={(parent) => setModal({ kind: 'create', parentId: parent.id })}
                        />
                      </ul>
                      {group.children.length > 0 && expanded && (
                        <ul id={panelId} style={childListStyle}>
                          {group.children.map((child) => (
                            <CategoryRow
                              key={child.id}
                              category={child}
                              deleting={deleting}
                              onEdit={(target) => setModal({ kind: 'edit', category: target })}
                              onDelete={(target) => setPendingDelete(target)}
                              onAddChild={() => undefined}
                            />
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <p style={hintStyle}>
              사용 중인 카테고리는 삭제할 수 없어요 — 먼저 그 상품들의 카테고리를 바꾸거나
              삭제하세요. 하위 카테고리가 달린 대분류도 하위를 먼저 정리해야 지울 수 있어요.
            </p>
          </Card>
        )}

        {modal.kind !== 'closed' && (
          <CategoryModal
            editing={modal.kind === 'edit' ? modal.category : null}
            presetParentId={modal.kind === 'create' ? modal.parentId : null}
            categories={categories}
            onClose={() => setModal({ kind: 'closed' })}
          />
        )}

        {pendingDelete !== null && (
          <ConfirmDialog
            intent="delete"
            title="카테고리 삭제"
            message={`'${pendingDelete.label}' 카테고리를 삭제할까요? 되돌릴 수 없어요.`}
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

/** 정상: 2Depth 트리가 전부 펼쳐진 기본 상태(하위 N개 배지 + 두 가지 삭제 차단 사유) */
export const Default: Story = {
  render: () => <CategoriesScreen />,
};

/** 접힘: '아우터'와 '상의'의 하위를 접은 상태 — 토글 아이콘이 chevron-right 로 바뀐다 */
export const Collapsed: Story = {
  render: () => <CategoriesScreen initialCollapsedIds={['outer', 'top']} />,
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
        { id: 'outer', label: '아우터', parentId: null, productCount: 8, hasChildren: false },
        { id: 'top', label: '상의', parentId: null, productCount: 12, hasChildren: false },
      ]}
    />
  ),
};

/** 조회 실패: danger 배너 + 다시 시도 (STATE-02) */
export const LoadError: Story = {
  render: () => <CategoriesScreen error />,
};

/** 카테고리 추가 모달 열림 — 상위 카테고리는 '없음 (대분류)' 로 시작한다 */
export const AddCategory: Story = {
  render: () => <CategoriesScreen initialModal={{ kind: 'create', parentId: null }} />,
};

/** 하위 카테고리 추가: 대분류 행의 + 로 연 모달 — 상위가 '아우터'로 고정된 채 열린다 */
export const AddChildCategory: Story = {
  render: () => <CategoriesScreen initialModal={{ kind: 'create', parentId: 'outer' }} />,
};

/** 카테고리 수정 모달 열림(기존 이름 채워짐 · 하위가 있어 상위 선택이 잠긴 대분류) */
export const EditCategory: Story = {
  render: () => (
    <CategoriesScreen
      initialModal={{
        kind: 'edit',
        category: {
          id: 'outer',
          label: '아우터',
          parentId: null,
          productCount: 0,
          hasChildren: true,
        },
      }}
    />
  ),
};

/** 삭제 확인: 미사용·하위 없음이라 지울 수 있는 카테고리에 대한 ConfirmDialog */
export const DeleteConfirm: Story = {
  render: () => <CategoriesScreen initialDeleteId="shoes" />,
};

/** 삭제 실패: ConfirmDialog 본문 아래 danger 배너 — 확인 버튼이 되살아나 재클릭이 곧 재시도 */
export const DeleteError: Story = {
  render: () => (
    <CategoriesScreen
      initialDeleteId="shoes"
      deleteError="삭제하지 못했어요. 잠시 후 다시 시도해 주세요."
    />
  ),
};
