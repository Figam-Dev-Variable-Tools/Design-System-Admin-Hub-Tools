// 목록형 화면 컨트롤러 훅 (앱 공용 선언적 CRUD 프레임워크)
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

/** 409 가 들고 온 사람이 읽을 수 있는 사유 — 없으면 null */
function conflictReason(cause: unknown): string | null {
  if (isConflict(cause) && cause instanceof Error && cause.message !== '') return cause.message;
  return null;
}

/**
 * 일괄 삭제 실패를 사람에게 옮긴다 — 단건(deleteErrorMessage)과 **같은 원칙**으로.
 *
 * [무엇이 틀렸었나] 예전에는 사유와 무관하게 한 줄이었다:
 *   'N건 중 M건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'
 * 단건은 이미 409 를 갈라 놓고 있었는데 일괄만 그러지 못한 이유는 **건수(number)밖에 못 받아서**다.
 * 그래서 '규칙 3건이 이 템플릿을 쓰고 있어 삭제할 수 없습니다' 를 어댑터가 이미 문장으로 만들어
 * 던졌는데도, 화면은 그것을 버리고 재시도를 권했다 — 재시도하면 똑같이 409 인 실패에 대고.
 * 잘못된 복구 수단을 권하는 것은 아무 말도 안 하는 것보다 나쁘다.
 *
 * [지금] 사유별로 다르게 말한다:
 *   · 409 사유가 있으면 그 문장을 **그대로** 보여 준다 (같은 사유는 한 번만 — 10건이 같은 이유로
 *     막혔을 때 같은 문장을 10줄 쌓는 것은 정보가 아니라 소음이다).
 *   · 409 가 아닌 실패(500·네트워크)가 섞여 있을 때만 재시도를 권한다 — 그건 실제로 시간이 푼다.
 *   · 둘 다 있으면 둘 다 말한다. 사용자는 한쪽만 고쳐서는 끝낼 수 없기 때문이다.
 * 서버 원문을 그대로 노출하지 않는 규약(EXC-20)은 단건과 동일하게 409 문장에만 적용된다 —
 * 그 문장은 어댑터가 사용자에게 보이려고 쓴 것이다.
 */
export function bulkDeleteErrorMessage(
  total: number,
  failures: readonly { reason: unknown }[],
): string {
  const head = `${formatNumber(total)}건 중 ${formatNumber(failures.length)}건을 삭제하지 못했습니다.`;

  const reasons = [...new Set(failures.map((f) => conflictReason(f.reason)).filter(isPresent))];
  const hasRetryable = failures.some((f) => conflictReason(f.reason) === null);

  if (reasons.length === 0) return `${head} 잠시 후 다시 시도해 주세요.`;

  const why = reasons.join(' ');
  return hasRetryable ? `${head} ${why} 나머지는 잠시 후 다시 시도해 주세요.` : `${head} ${why}`;
}

/** null 을 걸러 내며 타입도 좁힌다 */
function isPresent(value: string | null): value is string {
  return value !== null;
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
        onSuccess: ({ failed, failures }) => {
          if (controller.signal.aborted) return;
          if (failed > 0) {
            setBulkError(bulkDeleteErrorMessage(ids.length, failures));
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
