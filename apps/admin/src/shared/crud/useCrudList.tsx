// 목록형 화면 컨트롤러 훅 (A41 소유 — apps/admin/src/shared/crud/** · 앱 공용 선언적 CRUD 프레임워크)
//
// 목록 + 삭제팝업 + 일괄 삭제(SelectionBar) 를 갖는 화면(연혁·인증서·ESG)이 같은 선택/삭제 배선을
// 쓴다. 조회·선택·단건 삭제·일괄 삭제와 확인 다이얼로그(단건/일괄)를 여기 한 벌로 모은다. 화면은
// 툴바·표·필터만 자기 방식으로 그리고, 여기서 돌려주는 상태와 dialogs(ReactNode)를 얹는다.
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { isAbort } from '../async';
import { isConflict } from '../errors/http-error';
import { formatNumber, objectParticle } from '../format';
import { ConfirmDialog, useRowSelection, useToast } from '../ui';
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
  /**
   * **최초 로드만** true (data === undefined) — 스켈레톤의 유일한 조건 (STATE-01).
   *
   * 예전 이름은 `loading` 이었고 값은 `isFetching` 이었다. 그래서 **재조회 때도 true** 가 되어
   * 이미 화면에 있던 행이 스켈레톤으로 덮였다 — 표를 훑던 운영자 밑에서 데이터가 사라진다.
   * 'refetch 중에는 이전 행을 유지한다' 가 react-query 를 도입한 이유 그 자체인데(ADR-0008 §3.2)
   * 그 이득을 화면이 스스로 버리고 있었다.
   */
  readonly firstLoading: boolean;
  /** 데이터가 있는 채로 백그라운드 재조회 중 — 가벼운 인디케이터용, 표를 비우지 않는다 (STATE-03) */
  readonly refreshing: boolean;
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

/**
 * 삭제 실패를 사람에게 옮긴다.
 *
 * [왜 409 만 다른가] 예전에는 무엇이 실패하든 '잠시 후 다시 시도해 주세요' 한 줄이었다. 그런데
 * 409 는 **재시도하면 또 409 인** 실패다 — 참조가 남아 있어서(규칙이 쓰는 템플릿) 혹은 이미
 * 남이 지워서 막힌 것이라, 시간이 푸는 문제가 아니다. 잘못된 복구 수단을 권하는 셈이고, 그건
 * http-error.ts 머리말이 이 오류 타입을 만든 이유 그 자체다. 409 는 어댑터가 왜 막혔는지 이미
 * 문장으로 들고 온다 — 그 문장을 그대로 보여 준다.
 *
 * 나머지(500·네트워크 등)는 실제로 시간이 풀 수 있으니 재시도를 권한다. 서버 원문을 그대로
 * 노출하지 않는 것도 그대로 지킨다 (EXC-20).
 */
function deleteErrorMessage(cause: unknown): string {
  if (isConflict(cause) && cause instanceof Error && cause.message !== '') return cause.message;
  return '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
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

  const { data, isFetching, error, refetch } = useCrudListQuery(resource, adapter);
  // STATE-01 의 핵심 한 줄: 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
  const firstLoading = isFetching && data === undefined;
  const refreshing = isFetching && data !== undefined;
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
          // ERP-13 — 조사는 이름의 받침이 고른다 ('홍길동'을 / '카페'를)
          toast.success(`'${nameOf(target)}'${objectParticle(nameOf(target))} 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError(deleteErrorMessage(cause));
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
          message={`'${nameOf(pendingDelete)}'${objectParticle(nameOf(pendingDelete))} 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
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
    firstLoading,
    refreshing,
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
