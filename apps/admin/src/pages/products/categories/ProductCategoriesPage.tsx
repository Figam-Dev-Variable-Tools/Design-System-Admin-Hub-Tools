// ProductCategoriesPage — 상품 카테고리 관리 (라우트: /products/categories)
//
// **좌측 사용 여부 필터** + 목록 + 추가/수정 모달 + 삭제팝업. **사용 중 차단**: 카테고리를 쓰는
// 상품이 1건이라도 있으면 삭제 버튼을 잠그고 'N개 상품'을 알린다(고아 상품 방지 — 포트폴리오
// 카테고리와 같은 안전 기본값). 데이터 배선은 승격된 CRUD 프레임워크의 저수준 훅(useCrudListQuery/Delete)이다.
//
// [좌측 필터] 이 화면의 핵심 제약이 '사용 중인 카테고리는 삭제할 수 없다' 라, 정리하려는 운영자는
// '지울 수 있는 것만 보기' 를 먼저 원한다. 회원 목록의 등급/그룹 필터와 같은 골격(건수 배지 +
// aria-pressed)이며, 고른 값은 URL 이 소유한다 (IA-13 — 필터를 건 화면을 그대로 공유할 수 있다).
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  buttonStyle,
  Card,
  ConfirmDialog,
  Empty,
  hintStyle,
  Icon,
  StatusBadge,
  useToast,
} from '../../../shared/ui';
import {
  DetailCellLink,
  parseFilter,
  useCrudDelete,
  useCrudListQuery,
  useListState,
} from '../../../shared/crud';
import {
  useRouteWritePermissions,
  WRITE_DENIED,
} from '../../../shared/permissions/RequirePermission';
import { CATEGORY_RESOURCE, productCategoryAdapter } from './data-source';
import { CategoryUsageFilter } from './components/CategoryUsageFilter';
import { ProductCategoryFormModal } from './components/ProductCategoryFormModal';
import {
  CATEGORY_USAGE_ALL,
  CATEGORY_USAGE_FILTER_VALUES,
  countCategoriesByUsage,
  filterCategoriesByUsage,
  usageLabel,
} from './types';
import type { CategoryUsageFilter as UsageFilter } from './types';
import type { ProductCategoryUsage } from '../_shared/store';
import { cssVar } from '@tds/ui';

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (회원·상품 목록과 같은 그리드) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
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
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: cssVar('color.feedback.danger.text'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 2Depth 행은 상위 아래에 들여쓴다 — 계층이 한눈에 보이게 */
const childListStyle: CSSProperties = {
  ...listStyle,
  marginTop: cssVar('space.2'),
  paddingLeft: cssVar('space.6'),
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

/** 펼침 토글 — 아이콘만 있는 작은 버튼 */
const disclosureStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
};

/** 토글이 없는 행의 자리맞춤 — 토글 버튼과 같은 폭 */
const disclosureSpacerStyle: CSSProperties = {
  display: 'inline-block',
  inlineSize: cssVar('space.6'),
  flexShrink: 0,
};

/** 사용 건수 배지가 여는 목록 — 그 카테고리로 이미 걸러진 상품 목록 */
const PRODUCT_LIST_PATH = '/products';

type ModalState =
  | { kind: 'closed' }
  | { kind: 'create'; parentId: string | null }
  | { kind: 'edit'; category: ProductCategoryUsage };

interface CategoryRowProps {
  readonly category: ProductCategoryUsage;
  readonly deleting: boolean;
  readonly canCreate: boolean;
  /**
   * 연필/휴지통은 각각 update/remove 를 탄다 — canCreate 하나로 뭉뚱그리지 않는다.
   *
   * [행 액션이 갈리는 자리다] 이 목록은 CrudListShell 을 쓰지 않는다(2단계 트리라 표가 아니다).
   * 그래서 껍데기가 대신 해 주던 행 액션 게이팅(CrudListShell 의 canUpdate/canRemove)이 여기엔
   * 없었고, 등록만 걸린 채 **수정·삭제는 조회 권한만으로 열려 있었다**.
   */
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  /** 하위를 펼쳤나 — 대분류에만 준다. undefined 면 펼침 토글 자체가 없다(중분류 행) */
  readonly expanded?: boolean;
  readonly childPanelId?: string;
  readonly childCount?: number;
  readonly onToggle?: () => void;
  readonly onEdit: (category: ProductCategoryUsage) => void;
  readonly onDelete: (category: ProductCategoryUsage) => void;
  readonly onAddChild: (parent: ProductCategoryUsage) => void;
}

function CategoryRow({
  category,
  deleting,
  canCreate,
  canUpdate,
  canRemove,
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
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={disclosureStyle}
            aria-expanded={expanded}
            aria-controls={childPanelId}
            aria-label={`${category.label} 하위 카테고리 ${expanded ? '접기' : '펼치기'} (${String(childCount)}개)`}
            onClick={onToggle}
          >
            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
          </button>
        ) : (
          // 토글이 없는 행도 라벨 시작점을 맞춘다(들쭉날쭉하지 않게)
          <span aria-hidden="true" style={disclosureSpacerStyle} />
        )}
        <span style={labelTextStyle}>{category.label}</span>
        {/* 사용 건수는 **삭제를 막는 근거**다 — 그 근거를 확인할 길이 같은 자리에 있어야 한다.
            상품 목록은 이미 ?category= 를 URL 로 소유하므로(IA-13) 링크 하나면 '그 상품들'에 닿는다.
            미사용(0건)은 링크로 만들지 않는다 — 열어 봐야 빈 목록이다. */}
        {inUse ? (
          <DetailCellLink
            to={`${PRODUCT_LIST_PATH}?category=${encodeURIComponent(category.id)}`}
            ariaLabel={`'${category.label}' 카테고리를 쓰는 상품 ${usage} 보기`}
          >
            <StatusBadge tone="info" label={usage} />
          </DetailCellLink>
        ) : (
          <StatusBadge tone="neutral" label={usage} />
        )}
        {category.hasChildren && (
          <StatusBadge tone="neutral" label={`하위 ${String(childCount)}개`} />
        )}
      </span>
      <span style={actionsStyle}>
        {/* 하위(2Depth) 추가는 대분류에만 — 2Depth 아래로는 만들지 않는다(2단계 제한) */}
        {isRoot && canCreate && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={buttonStyle('ghost')}
            aria-label={`${category.label} 하위 카테고리 추가`}
            title="하위 카테고리 추가"
            onClick={() => onAddChild(category)}
          >
            <Icon name="plus-circle" />
          </button>
        )}
        {/* 권한이 없으면 '비활성' 이 아니라 '부재' 다. 아래 휴지통의 disabled 와 헷갈리지 말 것:
            그쪽은 **권한은 있는데 이 대상에는 못 한다**(사용 중·하위 있음)는 뜻이라 남아서 이유를
            말한다. 권한 없음은 그 일 자체가 내 것이 아니라는 뜻이라 컨트롤이 사라진다. */}
        {canUpdate && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={buttonStyle('ghost')}
            aria-label={`${category.label} 수정`}
            onClick={() => onEdit(category)}
          >
            <Icon name="pencil" />
          </button>
        )}
        {canRemove && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={blocked ? buttonStyle('ghost', true) : dangerGhostStyle}
            aria-label={
              blocked
                ? `${category.label} — ${blockReason}이라 삭제할 수 없어요`
                : `${category.label} 삭제`
            }
            title={blocked ? `${blockReason} — 삭제할 수 없어요` : undefined}
            disabled={blocked || deleting}
            onClick={() => onDelete(category)}
          >
            <Icon name="trash" />
          </button>
        )}
      </span>
    </li>
  );
}

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { usage: CATEGORY_USAGE_ALL } as const;

export default function ProductCategoriesPage() {
  const toast = useToast();
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<ProductCategoryUsage | null>(null);
  /** 접은 대분류 id — 기본은 전부 펼침(숨겨진 정보 없이 시작한다) */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  // 고른 필터의 단일 원천 = URL (IA-13). 손으로 고친 ?usage=거짓말 은 '전체'로 되돌린다
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const usage: UsageFilter = parseFilter(
    list.filters['usage'] ?? CATEGORY_USAGE_ALL,
    CATEGORY_USAGE_FILTER_VALUES,
    CATEGORY_USAGE_ALL,
  );

  const { data, isFetching, error, refetch } = useCrudListQuery(
    CATEGORY_RESOURCE,
    productCategoryAdapter,
  );
  const deleteCategory = useCrudDelete(CATEGORY_RESOURCE, productCategoryAdapter);
  const deleting = deleteCategory.isPending;
  const categories = useMemo(() => data ?? [], [data]);

  // [STATE-01] 스켈레톤/'불러오는 중'은 **최초 로드에만** — 재조회 때도 loading 으로 쓰면
  // 이미 보고 있던 목록이 '불러오는 중…' 으로 덮인다. 재조회 중에는 이전 행을 유지한다 (STATE-03).
  const firstLoading = isFetching && data === undefined;
  const loaded = data !== undefined && error === null;

  const counts = useMemo(
    () => (loaded ? countCategoriesByUsage(categories) : null),
    [categories, loaded],
  );
  const visible = useMemo(() => filterCategoriesByUsage(categories, usage), [categories, usage]);

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

  const toggleRoot = (rootId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteCategory.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    // 버튼을 없앤 술어와 **같은 술어**가 저장 경로도 막는다 — 감추기만 하면 막은 것이 아니다
    if (!canRemove) {
      setDeleteError(WRITE_DENIED.remove);
      return;
    }
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteCategory.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${target.label}' 카테고리를 삭제했어요.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const onSaved = (name: string, isEdit: boolean) => {
    setModal({ kind: 'closed' });
    toast.success(isEdit ? `'${name}' 카테고리를 저장했어요.` : `'${name}' 카테고리를 추가했어요.`);
  };

  // 추가 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03)
  const createButton = canCreate ? (
    <Button
      variant="primary"
      size="md"
      onClick={() => setModal({ kind: 'create', parentId: null })}
    >
      <Icon name="plus-circle" />
      카테고리 추가
    </Button>
  ) : null;

  return (
    <div style={layoutStyle}>
      <CategoryUsageFilter
        value={usage}
        counts={counts}
        onChange={(next) => list.setFilter('usage', next)}
      />

      <div style={pageStyle}>
        <div style={toolbarStyle}>
          {/* 재조회 중에도 건수를 지우지 않는다 — 이전 사실을 유지한다 (STATE-01/03) */}
          <p style={hintStyle}>
            {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}개`}
          </p>
          {createButton}
        </div>

        {error !== null ? (
          <Alert tone="danger">
            <div style={errorBodyStyle}>
              <span>카테고리를 불러오지 못했어요.</span>
              <Button variant="secondary" onClick={() => void refetch()}>
                다시 시도
              </Button>
            </div>
          </Alert>
        ) : (
          <Card>
            {firstLoading ? (
              <p style={hintStyle}>불러오는 중…</p>
            ) : visible.length === 0 ? (
              /* 왜 비었는지에 따라 복구 수단이 다르다 — 필터 초기화 / 추가 CTA (STATE-05) */
              <Empty
                label="카테고리"
                hasActiveFilters={list.hasActiveFilters}
                onResetFilters={list.resetFilters}
                action={createButton}
              />
            ) : (
              <ul style={listStyle}>
                {/* 대분류(1Depth) → 그 아래 중분류(2Depth) 를 들여써 계층을 그대로 보인다 */}
                {tree.map((group) => {
                  const panelId = `category-children-${group.root.id}`;
                  const expanded = !collapsed.has(group.root.id);
                  return (
                    <li key={group.root.id} style={groupStyle}>
                      <ul style={listStyle}>
                        <CategoryRow
                          category={group.root}
                          deleting={deleting}
                          canCreate={canCreate}
                          canUpdate={canUpdate}
                          canRemove={canRemove}
                          expanded={expanded}
                          childPanelId={panelId}
                          childCount={group.children.length}
                          onToggle={() => toggleRoot(group.root.id)}
                          onEdit={(target) => setModal({ kind: 'edit', category: target })}
                          onDelete={(target) => {
                            setDeleteError(null);
                            setPendingDelete(target);
                          }}
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
                              canCreate={canCreate}
                              canUpdate={canUpdate}
                              canRemove={canRemove}
                              onEdit={(target) => setModal({ kind: 'edit', category: target })}
                              onDelete={(target) => {
                                setDeleteError(null);
                                setPendingDelete(target);
                              }}
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
              사용 중인 카테고리는 삭제할 수 없어요 — 건수 배지를 누르면 그 카테고리로 걸러진 상품
              목록이 열려요. 거기서 카테고리를 바꾸거나 삭제하세요.
            </p>
          </Card>
        )}

        {modal.kind !== 'closed' && (
          <ProductCategoryFormModal
            editing={modal.kind === 'edit' ? modal.category : null}
            presetParentId={modal.kind === 'create' ? modal.parentId : null}
            onClose={() => setModal({ kind: 'closed' })}
            onSaved={onSaved}
          />
        )}

        {pendingDelete !== null && (
          <ConfirmDialog
            intent="delete"
            title="카테고리 삭제"
            message={`'${pendingDelete.label}' 카테고리를 삭제할까요? 되돌릴 수 없어요.`}
            confirmLabel="카테고리 삭제"
            busy={deleting}
            error={deleteError}
            onConfirm={onConfirmDelete}
            onCancel={closeDelete}
          />
        )}
      </div>
    </div>
  );
}
