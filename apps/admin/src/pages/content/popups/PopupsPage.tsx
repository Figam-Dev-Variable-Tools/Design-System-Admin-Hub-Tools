// PopupsPage — 팝업 관리 (라우트: /content/popups)
//
// '목록 + 등록'이 한 화면에 있다 — '팝업 등록' 버튼이나 행의 수정 버튼을 누르면 인라인 폼이 뜬다.
// 상세 페이지는 없다(상세로 펼쳐 볼 내용이 없다 — 목록 행이 곧 요약이다).
//
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 저장/삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
//
// [조회 상태의 소유자] enabled·keyword·page 와 선택은 shared/crud/useListState 가 **URL
// 쿼리스트링**으로 소유한다 (IA-13). 여기 있던 사본(검색 디바운스 · 조건 변경 시 page=1 ·
// 페이지 보정 · 선택 해제)은 전부 그 훅으로 갔다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { cssVar, SegmentedControl } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { parseFilter, useListState } from '../../../shared/crud';
import { formatNumber } from '../../../shared/format';
import {
  useRouteWritePermissions,
  WRITE_DENIED,
} from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  ConfirmDialog,
  hintStyle,
  Icon,
  Pagination,
  SearchField,
  SelectionBar,
  useToast,
} from '../../../shared/ui';
import { PopupsTable } from './components/PopupsTable';
import {
  useBulkDeletePopups,
  useBulkSetPopupEnabled,
  useDeletePopup,
  usePopupsQuery,
  useSetPopupEnabled,
} from './queries';
import { ENABLED_FILTERS, PAGE_SIZE } from './types';
import type { EnabledFilter, Popup } from './types';

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(같은 화면이 두 개의 URL 을 갖지 않게) */
const FILTER_DEFAULTS = { enabled: 'all' } as const;
const ENABLED_FILTER_VALUES: readonly EnabledFilter[] = ENABLED_FILTERS.map((filter) => filter.id);

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const toolbarLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

export default function PopupsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  /**
   * [IA-13] 노출 필터·검색어·페이지의 단일 원천 = URL.
   *
   * 'OFF 인 팝업만' 을 걸어 놓고 하나씩 손보는 것이 이 화면의 일상이다 — 수정 폼에 갔다 Back 하면
   * 그 필터가 그대로 살아 있어야 한다. useState 로는 매번 필터를 다시 건다.
   * 검색 입력은 훅이 IME 안전하게 다룬다 (COMP-10) — 한글 팝업 제목을 찾는 화면이다.
   */
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const enabled: EnabledFilter = parseFilter(
    list.filters['enabled'] ?? 'all',
    ENABLED_FILTER_VALUES,
    'all',
  );
  const { keyword, page, selectedIds, clearSelection } = list;

  /**
   * [EXC-03] 이 화면의 쓰기 권한 — 한 번 읽어 CTA · 일괄 바 · 표 · 뮤테이션 넷으로 흘린다.
   * 손으로 만든 목록이라 껍데기의 게이팅을 하나도 받지 못했다.
   */
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();

  const [pendingDelete, setPendingDelete] = useState<Popup | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deletePopup = useDeletePopup();
  const deleting = deletePopup.isPending;

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);
  const bulkDelete = useBulkDeletePopups();
  const bulkDeleting = bulkDelete.isPending;

  const [togglingIds, setTogglingIds] = useState<ReadonlySet<string>>(new Set());
  const enabledMutation = useSetPopupEnabled();
  const bulkEnabled = useBulkSetPopupEnabled();
  const bulkTogglingEnabled = bulkEnabled.isPending;

  const query = useMemo(() => ({ enabled, keyword, page }), [enabled, keyword, page]);
  const { data, isFetching, error, refetch } = usePopupsQuery(query);
  /**
   * [STATE-01] 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다 — 삭제·일괄 삭제의
   * invalidate 와 필터/페이지 전환마다 이미 보고 있던 행이 스켈레톤으로 덮였다.
   */
  const firstLoading = isFetching && data === undefined;

  const popups = useMemo(() => data?.popups ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 다른 관리자가 지워 총 페이지가 줄면 현재 페이지를 마지막으로 보정한다 (STATE-04-a · 훅이 소유)
  const { clampPage } = list;
  useEffect(() => {
    if (data === undefined) return;
    clampPage(Math.ceil(data.total / PAGE_SIZE));
  }, [data, clampPage]);

  const openDelete = (popup: Popup) => {
    setDeleteError(null);
    setPendingDelete(popup);
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deletePopup.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    if (!canRemove) {
      setDeleteError(WRITE_DENIED.remove);
      return;
    }
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deletePopup.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success('팝업을 삭제했어요.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('팝업을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const selectedCount = selectedIds.size;

  const markToggling = (id: string, busy: boolean) => {
    setTogglingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onToggleEnabled = (popup: Popup, next: boolean) => {
    if (togglingIds.has(popup.id)) return;
    // 스위치를 배지로 바꾼 술어와 **같은 술어**가 저장을 거절한다 (RowToggle ↔ 여기)
    if (!canUpdate) {
      toast.error(WRITE_DENIED.update);
      return;
    }
    markToggling(popup.id, true);
    enabledMutation.mutate(
      { id: popup.id, enabled: next },
      {
        onSuccess: () => {
          toast.success(next ? `'${popup.title}' 을 켰어요.` : `'${popup.title}' 을 껐어요.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.', {
            retry: () => onToggleEnabled(popup, next),
          });
        },
        onSettled: () => markToggling(popup.id, false),
      },
    );
  };

  const onBulkEnabled = (enabled: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkTogglingEnabled) return;
    if (!canUpdate) {
      toast.error(WRITE_DENIED.update);
      return;
    }
    bulkEnabled.mutate(
      { ids, enabled },
      {
        onSuccess: (failed) => {
          const label = enabled ? 'ON' : 'OFF';
          if (failed > 0) {
            toast.error(
              `팝업 ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 ${label} 처리하지 못했어요.`,
              { retry: () => onBulkEnabled(enabled) },
            );
            return;
          }
          clearSelection();
          toast.success(`팝업 ${formatNumber(ids.length)}건을 ${label} 처리했어요.`);
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
    if (!canRemove) {
      setBulkError(WRITE_DENIED.remove);
      return;
    }
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
              `팝업 ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clearSelection();
          toast.success(`팝업 ${formatNumber(ids.length)}건을 삭제했어요.`);
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <div style={toolbarLeftStyle}>
          <SearchField
            value={list.searchInput}
            onChange={list.setSearchInput}
            label="팝업 제목 검색"
            {...list.searchInputProps}
          />
          <SegmentedControl
            value={enabled}
            options={ENABLED_FILTERS.map((filter) => ({ id: filter.id, label: filter.label }))}
            ariaLabel="팝업 상태 필터"
            onChange={(id) => list.setFilter('enabled', id)}
          />
        </div>
        {/* 등록 권한이 없으면 CTA 는 '비활성' 이 아니라 '부재' 다 (EXC-03) */}
        {canCreate && (
          <Button variant="primary" size="md" onClick={() => navigate('/content/popups/new')}>
            <Icon name="plus-circle" />
            팝업 등록
          </Button>
        )}
      </div>

      {error === null ? (
        <>
          <div style={summaryRowStyle}>
            <p style={hintStyle}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(total)}건`}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
            </p>
          </div>

          {/* 선택을 소비하는 것은 일괄 ON/OFF(update)와 일괄 삭제(remove)뿐이다 */}
          {(canUpdate || canRemove) && (
            <SelectionBar count={selectedCount} onClear={clearSelection}>
              {canUpdate && (
                <>
                  <Button
                    variant="secondary"
                    disabled={bulkTogglingEnabled}
                    onClick={() => onBulkEnabled(true)}
                  >
                    일괄 ON
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={bulkTogglingEnabled}
                    onClick={() => onBulkEnabled(false)}
                  >
                    일괄 OFF
                  </Button>
                </>
              )}
              {canRemove && (
                <Button variant="danger" disabled={bulkDeleting} onClick={() => setBulkOpen(true)}>
                  {`선택 ${formatNumber(selectedCount)}건 삭제`}
                </Button>
              )}
            </SelectionBar>
          )}

          <PopupsTable
            popups={popups}
            loading={firstLoading}
            onEdit={(popup) => navigate(`/content/popups/${popup.id}/edit`)}
            onDelete={openDelete}
            deletingId={deleting ? (pendingDelete?.id ?? null) : null}
            selectedIds={selectedIds}
            onToggleOne={list.toggleOne}
            onToggleAll={(checked) =>
              list.toggleAll(
                popups.map((popup) => popup.id),
                checked,
              )
            }
            startIndex={(page - 1) * PAGE_SIZE}
            onToggleEnabled={onToggleEnabled}
            togglingIds={togglingIds}
            canUpdate={canUpdate}
            canRemove={canRemove}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={list.setPage}
            label="팝업 페이지"
          />
        </>
      ) : (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>팝업 목록을 불러오지 못했어요.</span>
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

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="팝업 삭제"
          message={`'${pendingDelete.title}' 팝업을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="팝업 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="팝업 일괄 삭제"
          message={`선택한 팝업 ${formatNumber(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
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
