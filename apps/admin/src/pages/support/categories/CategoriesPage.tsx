// CategoriesPage — 문의 유형 관리 (라우트: /support/categories) · A41 소유
//
// 목록 + 추가/수정 모달 + 삭제팝업. **사용 중 차단**: 그 유형을 쓰는 티켓/템플릿이 1건이라도 있으면
// 삭제 버튼을 잠근다(고아 참조 방지 — 국내 CS 관례: 참조되는 데이터는 하드 삭제하지 않는다).
// 사용여부(active) 소프트 비활성으로 신규 선택에서만 숨길 수 있다. 배선은 CRUD 저수준 훅이다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  buttonStyle,
  Card,
  ConfirmDialog,
  hintStyle,
  PencilIcon,
  PlusCircleIcon,
  StatusBadge,
  TrashIcon,
  useToast,
} from '../../../shared/ui';
import { useCrudDelete, useCrudListQuery } from '../../../shared/crud';
import { CATEGORY_RESOURCE, supportCategoryAdapter } from './data-source';
import { CategoryFormModal } from './components/CategoryFormModal';
import { categoryInUse, categoryUsageLabel } from '../_shared/domain';
import type { SupportCategoryUsage } from '../_shared/domain';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  listStyleType: 'none',
  margin: 0,
  padding: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const rowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
  flexWrap: 'wrap',
};

const labelTextStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  overflowWrap: 'anywhere',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: 'var(--tds-color-feedback-danger-text)',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

type ModalState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'create' }
  | { readonly kind: 'edit'; readonly category: SupportCategoryUsage };

interface CategoryRowProps {
  readonly category: SupportCategoryUsage;
  readonly deleting: boolean;
  readonly onEdit: (category: SupportCategoryUsage) => void;
  readonly onDelete: (category: SupportCategoryUsage) => void;
}

function CategoryRow({ category, deleting, onEdit, onDelete }: CategoryRowProps) {
  const inUse = categoryInUse(category);
  const usage = categoryUsageLabel(category);
  return (
    <li style={rowStyle}>
      <span style={rowLeftStyle}>
        <span style={labelTextStyle}>{category.label}</span>
        <StatusBadge
          tone={category.active ? 'success' : 'neutral'}
          label={category.active ? '사용' : '미사용'}
        />
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
          <PencilIcon />
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
          <TrashIcon />
        </button>
      </span>
    </li>
  );
}

export default function CategoriesPage() {
  const toast = useToast();
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<SupportCategoryUsage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const {
    data,
    isFetching: loading,
    error,
    refetch,
  } = useCrudListQuery(CATEGORY_RESOURCE, supportCategoryAdapter);
  const deleteCategory = useCrudDelete(CATEGORY_RESOURCE, supportCategoryAdapter);
  const deleting = deleteCategory.isPending;
  const categories = data ?? [];

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
          toast.success(`'${target.label}' 유형을 삭제했습니다.`);
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
    toast.success(isEdit ? `'${name}' 유형을 저장했습니다.` : `'${name}' 유형을 추가했습니다.`);
  };

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <p style={hintStyle}>
          {loading ? '불러오는 중…' : `전체 ${formatNumber(categories.length)}개`}
        </p>
        <Button variant="primary" size="md" onClick={() => setModal({ kind: 'create' })}>
          <PlusCircleIcon />
          유형 추가
        </Button>
      </div>

      {error !== null ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>문의 유형을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      ) : (
        <Card>
          {categories.length === 0 ? (
            <p style={hintStyle}>{loading ? '불러오는 중…' : '등록된 문의 유형이 없습니다.'}</p>
          ) : (
            <ul style={listStyle}>
              {categories.map((category) => (
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
            사용 중인 유형은 삭제할 수 없습니다 — 먼저 그 티켓·템플릿의 유형을 바꾸거나, 사용여부를
            꺼서 신규 선택에서 숨기세요.
          </p>
        </Card>
      )}

      {modal.kind !== 'closed' && (
        <CategoryFormModal
          editing={modal.kind === 'edit' ? modal.category : null}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={onSaved}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="문의 유형 삭제"
          message={`'${pendingDelete.label}' 유형을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="유형 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
