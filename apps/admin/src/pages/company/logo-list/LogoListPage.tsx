// 로고 목록 페이지 — 파트너사·고객사 공유 (A41 소유 — apps/admin/src/pages/company/logo-list/**)
//
// 목록 + 추가/수정 모달 + 삭제팝업. 배치·패턴은 콘텐츠 목록(FAQ)을 따른다: 검색 + 등록 버튼 + 선택
// 일괄 삭제(SelectionBar) + 표 + 확인 다이얼로그. 파트너사/고객사는 config(resource·라벨·adapter)만 다르다.
//
// [조회 상태의 소유자] 검색어와 선택은 shared/crud/useListState 가 **URL 쿼리스트링**으로 소유한다
// (IA-13). 이 화면에 직렬화할 상태는 검색어뿐이다 — 필터가 없고, 페이지네이션도 없다(로고는 순서가
// 곧 의미라 전부 한 화면에 그리고 드래그로 옮긴다). 여기 있던 사본(검색 디바운스 · 선택 해제)은
// 그 훅으로 갔다. 두 라우트(/company/partners · /company/clients)가 이 컴포넌트를 공유하지만
// 각자 자기 URL 을 가지므로 검색어가 서로 섞이지 않는다.
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import { useListState } from '../../../shared/crud';
import { formatNumber, objectParticle } from '../../../shared/format';
import {
  Alert,
  Button,
  ConfirmDialog,
  hintStyle,
  PlusCircleIcon,
  SearchField,
  SelectionBar,
  useToast,
} from '../../../shared/ui';
import type { LogoAdapter } from './adapter';
import { LogoFormModal } from './LogoFormModal';
import { LogoListTable } from './LogoListTable';
import {
  useBulkDeleteLogos,
  useDeleteLogo,
  useLogosQuery,
  useReorderLogos,
  useSetLogoActive,
} from './queries';
import { filterLogos } from './types';
import type { LogoItem } from './types';

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

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

/** 등록/수정 모달 상태 — 닫힘 / 등록 / 수정(대상) */
type ModalState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; item: LogoItem };

interface LogoListConfig {
  /** 쿼리 키 루트 겸 요소 프리픽스 — 'partners' / 'clients' */
  readonly resource: string;
  /** 도메인 명칭 — '파트너사' / '고객사' */
  readonly entityLabel: string;
  readonly adapter: LogoAdapter;
}

export function LogoListPage({ resource, entityLabel, adapter }: LogoListConfig) {
  const toast = useToast();

  /**
   * [IA-13] 검색어의 단일 원천 = URL — 새로고침해도 걸어 둔 검색이 남고, 그 화면에 링크가 생긴다.
   * [COMP-10] 검색 입력의 IME 처리 — '파트너사 이름' 은 대부분 한글이라 조합 중 조회가 나가면
   * 자모 단위로 요청이 붙고, 조합 확정용 Enter 가 반쯤 조합된 낱말로 제출된다.
   */
  const list = useListState();
  const { keyword, selectedIds, clearSelection } = list;
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });

  const [pendingDelete, setPendingDelete] = useState<LogoItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  const reorderControllerRef = useRef<AbortController | null>(null);

  // 일괄 삭제 (선택 자체는 useListState 가 쥔다 — 검색어가 바뀌면 자동으로 해제된다)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);

  const deleteLogo = useDeleteLogo(resource, adapter);
  const deleting = deleteLogo.isPending;
  const bulkDelete = useBulkDeleteLogos(resource, adapter);
  const bulkDeleting = bulkDelete.isPending;
  const reorderLogos = useReorderLogos(resource, adapter);
  const reordering = reorderLogos.isPending;
  const setActiveLogo = useSetLogoActive(resource, adapter);
  const [togglingIds, setTogglingIds] = useState<ReadonlySet<string>>(new Set());

  const { data, isFetching, error, refetch } = useLogosQuery(resource, adapter);
  const all = useMemo(() => data ?? [], [data]);

  /**
   * [STATE-01] 스켈레톤은 **최초 로드에만** 뜬다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 이 화면은 노출 토글과 순서
   * 이동이 일상이고 둘 다 invalidate 를 건다 — 그때마다 **이미 채워져 있던 행이 스켈레톤으로
   * 지워졌다.** 로고를 한 칸 내리려던 운영자 밑에서 표가 통째로 사라진다.
   * (정의는 공유 useCrudList 와 글자까지 같다 — 이 화면은 순서 이동 때문에 그 훅을 쓰지 않는다.)
   */
  const firstLoading = isFetching && data === undefined;
  /** 데이터가 있는 채로 백그라운드 재조회 중 — 가벼운 인디케이터용, 표를 비우지 않는다 (STATE-03) */
  const refreshing = isFetching && data !== undefined;

  const visible = useMemo(() => filterLogos(all, keyword), [all, keyword]);
  const total = visible.length;
  const selectedCount = selectedIds.size;
  // 재정렬은 검색어가 없는 자연 순서에서만 켠다
  const reorderable = keyword === '';

  const onReorder = (orderedIds: readonly string[]) => {
    reorderControllerRef.current?.abort();
    const controller = new AbortController();
    reorderControllerRef.current = controller;
    reorderLogos.mutate(
      { orderedIds, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('정렬 순서를 변경했습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('정렬 순서를 변경하지 못했습니다.', { retry: () => onReorder(orderedIds) });
        },
      },
    );
  };

  const onToggleActive = (item: LogoItem, next: boolean) => {
    const controller = new AbortController();
    setTogglingIds((prev) => new Set(prev).add(item.id));
    setActiveLogo.mutate(
      { id: item.id, active: next, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success(
            next
              ? `'${item.name}'${objectParticle(item.name)} 노출합니다.`
              : `'${item.name}'${objectParticle(item.name)} 숨깁니다.`,
          );
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('노출 여부를 변경하지 못했습니다.', {
            retry: () => onToggleActive(item, next),
          });
        },
        onSettled: () => {
          setTogglingIds((prev) => {
            const nextSet = new Set(prev);
            nextSet.delete(item.id);
            return nextSet;
          });
        },
      },
    );
  };

  const openDelete = (item: LogoItem) => {
    setDeleteError(null);
    setPendingDelete(item);
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteLogo.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteLogo.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${target.name}'${objectParticle(target.name)} 삭제했습니다.`);
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
          clearSelection();
          toast.success(`${entityLabel} ${formatNumber(ids.length)}건을 삭제했습니다.`);
        },
      },
    );
  };

  const onSaved = (name: string, isEdit: boolean) => {
    setModal({ kind: 'closed' });
    toast.success(
      isEdit
        ? `'${name}'${objectParticle(name)} 저장했습니다.`
        : `'${name}'${objectParticle(name)} 추가했습니다.`,
    );
  };

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label={`${entityLabel} 이름 검색`}
          {...list.searchInputProps}
        />
        <Button variant="primary" size="md" onClick={() => setModal({ kind: 'create' })}>
          <PlusCircleIcon />
          {entityLabel} 추가
        </Button>
      </div>

      {error === null ? (
        <>
          <div style={summaryRowStyle}>
            <p style={hintStyle} aria-busy={refreshing}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(total)}건`}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
              {refreshing && ' · 새로고침 중…'}
            </p>
          </div>

          <SelectionBar count={selectedCount} onClear={clearSelection}>
            <Button variant="danger" disabled={bulkDeleting} onClick={() => setBulkOpen(true)}>
              {`선택 ${formatNumber(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <LogoListTable
            items={visible}
            loading={firstLoading}
            entityLabel={entityLabel}
            onEdit={(item) => setModal({ kind: 'edit', item })}
            onDelete={openDelete}
            deletingId={deleting ? (pendingDelete?.id ?? null) : null}
            reorderable={reorderable}
            onReorder={onReorder}
            reordering={reordering}
            selectedIds={selectedIds}
            onToggleOne={list.toggleOne}
            onToggleAll={(checked) =>
              list.toggleAll(
                visible.map((item) => item.id),
                checked,
              )
            }
            onToggleActive={onToggleActive}
            togglingIds={togglingIds}
          />
        </>
      ) : (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>{entityLabel} 목록을 불러오지 못했습니다.</span>
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      {modal.kind !== 'closed' && (
        <LogoFormModal
          resource={resource}
          adapter={adapter}
          entityLabel={entityLabel}
          editing={modal.kind === 'edit' ? modal.item : null}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={onSaved}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title={`${entityLabel} 삭제`}
          message={`'${pendingDelete.name}'${objectParticle(pendingDelete.name)} 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
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
    </div>
  );
}
