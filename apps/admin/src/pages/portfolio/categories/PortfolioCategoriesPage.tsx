// PortfolioCategoriesPage — 포트폴리오 카테고리 관리 (라우트: /portfolio/categories) · A41 소유
//
// 목록 + 추가/수정 모달 + 삭제팝업. **사용 중 차단**: 카테고리를 쓰는 포트폴리오가 1건이라도 있으면
// 삭제 버튼을 잠그고 'N개 사용 중'을 알린다(고아 항목 방지 — FAQ 카테고리 패턴과 같은 안전 기본값).
// 데이터 배선은 승격된 CRUD 프레임워크의 저수준 훅(useCrudListQuery/Delete)이다.
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
import { CATEGORY_RESOURCE, portfolioCategoryAdapter } from './data-source';
import { PortfolioCategoryFormModal } from './components/PortfolioCategoryFormModal';
import { usageLabel } from './types';
import type { PortfolioCategoryUsage } from '../_shared/store';

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
  { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; category: PortfolioCategoryUsage };

interface CategoryRowProps {
  readonly category: PortfolioCategoryUsage;
  readonly deleting: boolean;
  readonly onEdit: (category: PortfolioCategoryUsage) => void;
  readonly onDelete: (category: PortfolioCategoryUsage) => void;
}

function CategoryRow({ category, deleting, onEdit, onDelete }: CategoryRowProps) {
  const inUse = category.itemCount > 0;
  const usage = usageLabel(category.itemCount);
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

export default function PortfolioCategoriesPage() {
  const toast = useToast();
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<PortfolioCategoryUsage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const { data, isFetching, error, refetch } = useCrudListQuery(
    CATEGORY_RESOURCE,
    portfolioCategoryAdapter,
  );

  /**
   * [STATE-01] 스켈레톤은 **최초 로드에만** 뜬다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 그래서 invalidate 가 걸릴
   * 때마다 **이미 채워져 있던 행이 스켈레톤으로 지워졌다** — 표를 훑던 운영자 밑에서 데이터가
   * 사라진다. 'refetch 중에는 이전 행을 유지한다' 가 react-query 를 쓰는 이유 그 자체인데
   * (ADR-0008 §3.2) 화면이 그 이득을 스스로 버리고 있었다.
   * (정의는 공유 useCrudList 와 글자까지 같다 — 이 화면은 그 훅을 쓰지 않아 규칙만 같이 둔다.)
   */
  const firstLoading = isFetching && data === undefined;
  /** 데이터가 있는 채로 백그라운드 재조회 중 — 가벼운 인디케이터용, 표를 비우지 않는다 (STATE-03) */
  const refreshing = isFetching && data !== undefined;
  const deleteCategory = useCrudDelete(CATEGORY_RESOURCE, portfolioCategoryAdapter);
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

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <p style={hintStyle}>
          {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(categories.length)}개`}
          {refreshing && ' · 새로고침 중…'}
        </p>
        <Button variant="primary" size="md" onClick={() => setModal({ kind: 'create' })}>
          <PlusCircleIcon />
          카테고리 추가
        </Button>
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
          {categories.length === 0 ? (
            <p style={hintStyle}>{firstLoading ? '불러오는 중…' : '등록된 카테고리가 없습니다.'}</p>
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
            사용 중인 카테고리는 삭제할 수 없습니다 — 먼저 그 포트폴리오들의 분류를 바꾸거나
            삭제하세요.
          </p>
        </Card>
      )}

      {modal.kind !== 'closed' && (
        <PortfolioCategoryFormModal
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
  );
}
