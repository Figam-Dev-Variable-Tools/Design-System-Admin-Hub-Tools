// 목록형 화면 컨트롤러 훅 (A41 소유 — apps/admin/src/pages/company/**)
//
// 목록 + 삭제팝업 + 일괄 삭제(SelectionBar) 를 갖는 화면(연혁·인증서·ESG)이 같은 선택/삭제 배선을
// 쓴다. 조회·선택·단건 삭제·일괄 삭제와 확인 다이얼로그(단건/일괄)를 여기 한 벌로 모은다. 화면은
// 툴바·표·필터만 자기 방식으로 그리고, 여기서 돌려주는 상태와 dialogs(ReactNode)를 얹는다.
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import { ConfirmDialog, useRowSelection, useToast } from '../../../shared/ui';
import { useCrudBulkDelete, useCrudDelete, useCrudListQuery } from './crud';
import type { CrudAdapter } from './crud';

interface CrudListConfig<T extends { id: string }, Input> {
  readonly resource: string;
  readonly adapter: CrudAdapter<T, Input>;
  /** 도메인 명칭 — '연혁'/'인증서/특허'/'ESG 활동' */
  readonly entityLabel: string;
  /** 확인 문구·토스트에 쓸 항목 이름 */
  readonly nameOf: (item: T) => string;
}

interface CrudListController<T extends { id: string }> {
  readonly items: readonly T[];
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
  readonly selectedIds: ReadonlySet<string>;
  readonly toggleOne: (id: string, checked: boolean) => void;
  readonly toggleAll: (ids: readonly string[], checked: boolean) => void;
  readonly clear: () => void;
  readonly selectedCount: number;
  /** 행 삭제 버튼 잠금용 — 삭제 진행 중인 id */
  readonly deletingId: string | null;
  readonly requestDelete: (item: T) => void;
  readonly requestBulkDelete: () => void;
  /** 단건/일괄 삭제 확인 다이얼로그 — 화면 어딘가에 그대로 렌더한다 */
  readonly dialogs: ReactNode;
}

export function useCrudList<T extends { id: string }, Input>({
  resource,
  adapter,
  entityLabel,
  nameOf,
}: CrudListConfig<T, Input>): CrudListController<T> {
  const toast = useToast();
  const { selectedIds, toggleOne, toggleAll, clear } = useRowSelection();

  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);

  const { data, isFetching: loading, error, refetch } = useCrudListQuery(resource, adapter);
  const deleteItem = useCrudDelete(resource, adapter);
  const deleting = deleteItem.isPending;
  const bulkDelete = useCrudBulkDelete(resource, adapter);
  const bulkDeleting = bulkDelete.isPending;

  const items = data ?? [];
  const selectedCount = selectedIds.size;

  const requestDelete = (item: T) => {
    setDeleteError(null);
    setPendingDelete(item);
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteItem.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteItem.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${nameOf(target)}' 을(를) 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const closeBulk = () => {
    bulkControllerRef.current?.abort();
    bulkControllerRef.current = null;
    bulkDelete.reset();
    setBulkError(null);
    setBulkOpen(false);
  };

  const onConfirmBulkDelete = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const controller = new AbortController();
    bulkControllerRef.current = controller;
    setBulkError(null);

    bulkDelete.mutate(
      { ids, signal: controller.signal },
      {
        onSuccess: (failed) => {
          if (controller.signal.aborted) return;
          if (failed > 0) {
            setBulkError(
              `${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clear();
          toast.success(`${entityLabel} ${formatNumber(ids.length)}건을 삭제했습니다.`);
        },
      },
    );
  };

  const dialogs = (
    <>
      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title={`${entityLabel} 삭제`}
          message={`'${nameOf(pendingDelete)}' 을(를) 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title={`${entityLabel} 일괄 삭제`}
          message={`선택한 ${entityLabel} ${formatNumber(selectedCount)}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel={`${formatNumber(selectedCount)}건 삭제`}
          busy={bulkDeleting}
          error={bulkError}
          onConfirm={onConfirmBulkDelete}
          onCancel={closeBulk}
        />
      )}
    </>
  );

  return {
    items,
    loading,
    error,
    refetch: () => void refetch(),
    selectedIds,
    toggleOne,
    toggleAll,
    clear,
    selectedCount,
    deletingId: deleting ? (pendingDelete?.id ?? null) : null,
    requestDelete,
    requestBulkDelete: () => setBulkOpen(true),
    dialogs,
  };
}
