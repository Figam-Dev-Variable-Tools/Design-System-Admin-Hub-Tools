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
import { parseFilter, useCrudDelete, useCrudListQuery, useListState } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
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
  gridTemplateColumns: 'calc(var(--tds-space-6) * 9) minmax(0, 1fr)',
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
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: 'var(--tds-typography-label-md-line-height)',
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

type ModalState =
  { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; category: ProductCategoryUsage };

interface CategoryRowProps {
  readonly category: ProductCategoryUsage;
  readonly deleting: boolean;
  readonly onEdit: (category: ProductCategoryUsage) => void;
  readonly onDelete: (category: ProductCategoryUsage) => void;
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
        <button
          type="button"
          className="tds-ui-btn-ghost tds-ui-focusable"
          style={buttonStyle('ghost')}
          aria-label={`${category.label} 수정`}
          onClick={() => onEdit(category)}
        >
          <Icon name="pencil" />
        </button>
        <button
          type="button"
          className="tds-ui-btn-ghost tds-ui-focusable"
          style={inUse ? buttonStyle('ghost', true) : dangerGhostStyle}
          aria-label={
            inUse ? `${category.label} — ${usage}라 삭제할 수 없습니다` : `${category.label} 삭제`
          }
          title={inUse ? `${usage} — 삭제할 수 없습니다` : undefined}
          disabled={inUse || deleting}
          onClick={() => onDelete(category)}
        >
          <Icon name="trash" />
        </button>
      </span>
    </li>
  );
}

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { usage: CATEGORY_USAGE_ALL } as const;

export default function ProductCategoriesPage() {
  const toast = useToast();
  const { canCreate } = useRouteWritePermissions();
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<ProductCategoryUsage | null>(null);
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

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteCategory.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
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
          toast.success(`'${target.label}' 카테고리를 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const onSaved = (name: string, isEdit: boolean) => {
    setModal({ kind: 'closed' });
    toast.success(
      isEdit ? `'${name}' 카테고리를 저장했습니다.` : `'${name}' 카테고리를 추가했습니다.`,
    );
  };

  // 추가 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03)
  const createButton = canCreate ? (
    <Button variant="primary" size="md" onClick={() => setModal({ kind: 'create' })}>
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
              <span>카테고리를 불러오지 못했습니다.</span>
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
                {visible.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    deleting={deleting}
                    onEdit={(target) => setModal({ kind: 'edit', category: target })}
                    onDelete={(target) => {
                      setDeleteError(null);
                      setPendingDelete(target);
                    }}
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
          <ProductCategoryFormModal
            editing={modal.kind === 'edit' ? modal.category : null}
            onClose={() => setModal({ kind: 'closed' })}
            onSaved={onSaved}
          />
        )}

        {pendingDelete !== null && (
          <ConfirmDialog
            intent="delete"
            title="카테고리 삭제"
            message={`'${pendingDelete.label}' 카테고리를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
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
