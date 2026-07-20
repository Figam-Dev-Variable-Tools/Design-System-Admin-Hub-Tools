// BannersPage — 배너 관리 (라우트: /content/banners)
//
// '목록 + 등록'이 한 화면에 있다 — 팝업 관리와 같은 구조(위치 필터만 메인/서브로 다르다).
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 저장/삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
//
// [조회 상태의 소유자] placement·keyword·page 와 선택은 shared/crud/useListState 가 **URL
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
import { BannersTable } from './components/BannersTable';
import {
  useBannersQuery,
  useBulkDeleteBanners,
  useBulkSetBannerEnabled,
  useDeleteBanner,
  useReorderBanners,
  useSetBannerEnabled,
} from './queries';
import { PAGE_SIZE, PLACEMENT_FILTERS } from './types';
import type { Banner, PlacementFilter } from './types';

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(같은 화면이 두 개의 URL 을 갖지 않게) */
const FILTER_DEFAULTS = { placement: 'all' } as const;
const PLACEMENT_FILTER_VALUES: readonly PlacementFilter[] = PLACEMENT_FILTERS.map(
  (filter) => filter.id,
);

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

export default function BannersPage() {
  const toast = useToast();
  const navigate = useNavigate();

  /**
   * [IA-13] 위치 필터·검색어·페이지의 단일 원천 = URL.
   *
   * 배너는 노출 사고가 나면 '메인 배너 2페이지의 그 배너' 를 서로 링크로 주고받으며 확인한다.
   * 상태가 useState 에만 있으면 그 링크가 존재하지 않고, F5 한 번에 필터가 전부 풀린다.
   * 검색 입력은 훅이 IME 안전하게 다룬다 (COMP-10) — 한글 배너 제목을 찾는 화면이다.
   */
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const placement: PlacementFilter = parseFilter(
    list.filters['placement'] ?? 'all',
    PLACEMENT_FILTER_VALUES,
    'all',
  );
  const { keyword, page, selectedIds, clearSelection } = list;

  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteBanner = useDeleteBanner();
  const deleting = deleteBanner.isPending;

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);
  const bulkDelete = useBulkDeleteBanners();
  const bulkDeleting = bulkDelete.isPending;

  const [togglingIds, setTogglingIds] = useState<ReadonlySet<string>>(new Set());
  const enabledMutation = useSetBannerEnabled();
  const bulkEnabled = useBulkSetBannerEnabled();
  const bulkTogglingEnabled = bulkEnabled.isPending;

  // 재정렬은 필터/검색이 없는 자연 순서 화면에서만 (FAQ 와 동일 규칙)
  const reorderable = placement === 'all' && keyword === '';
  const reorderControllerRef = useRef<AbortController | null>(null);
  const reorderBanners = useReorderBanners();
  const reordering = reorderBanners.isPending;

  const onReorder = (orderedIds: readonly string[]) => {
    reorderControllerRef.current?.abort();
    const controller = new AbortController();
    reorderControllerRef.current = controller;
    reorderBanners.mutate(
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

  const query = useMemo(() => ({ placement, keyword, page }), [placement, keyword, page]);
  const { data, isFetching, error, refetch } = useBannersQuery(query);
  /**
   * [STATE-01] 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 이 화면은 노출 토글과 삭제가
   * 일상이고 둘 다 목록을 invalidate 한다 — 그때마다 표가 스켈레톤으로 덮여 방금 만지던 배너가
   * 사라졌다. queries.ts 가 placeholderData 로 이전 행을 들고 있는 이유를 화면이 스스로 버렸다.
   */
  const firstLoading = isFetching && data === undefined;

  const banners = useMemo(() => data?.banners ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 다른 관리자가 지워 총 페이지가 줄면 현재 페이지를 마지막으로 보정한다 (STATE-04-a · 훅이 소유)
  const { clampPage } = list;
  useEffect(() => {
    if (data === undefined) return;
    clampPage(Math.ceil(data.total / PAGE_SIZE));
  }, [data, clampPage]);

  const openDelete = (banner: Banner) => {
    setDeleteError(null);
    setPendingDelete(banner);
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteBanner.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteBanner.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success('배너를 삭제했습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('배너를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
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

  const onToggleEnabled = (banner: Banner, next: boolean) => {
    if (togglingIds.has(banner.id)) return;
    markToggling(banner.id, true);
    enabledMutation.mutate(
      { id: banner.id, enabled: next },
      {
        onSuccess: () => {
          toast.success(next ? `'${banner.title}' 을 켰습니다.` : `'${banner.title}' 을 껐습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.', {
            retry: () => onToggleEnabled(banner, next),
          });
        },
        onSettled: () => markToggling(banner.id, false),
      },
    );
  };

  const onBulkEnabled = (enabled: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkTogglingEnabled) return;
    bulkEnabled.mutate(
      { ids, enabled },
      {
        onSuccess: (failed) => {
          const label = enabled ? 'ON' : 'OFF';
          if (failed > 0) {
            toast.error(
              `배너 ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 ${label} 처리하지 못했습니다.`,
              { retry: () => onBulkEnabled(enabled) },
            );
            return;
          }
          clearSelection();
          toast.success(`배너 ${formatNumber(ids.length)}건을 ${label} 처리했습니다.`);
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
              `배너 ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clearSelection();
          toast.success(`배너 ${formatNumber(ids.length)}건을 삭제했습니다.`);
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
            label="배너 제목 검색"
            {...list.searchInputProps}
          />
          <SegmentedControl
            value={placement}
            options={PLACEMENT_FILTERS.map((filter) => ({ id: filter.id, label: filter.label }))}
            ariaLabel="배너 위치 필터"
            onChange={(id) => list.setFilter('placement', id)}
          />
        </div>
        <Button variant="primary" size="md" onClick={() => navigate('/content/banners/new')}>
          <Icon name="plus-circle" />
          배너 등록
        </Button>
      </div>

      {error === null ? (
        <>
          <div style={summaryRowStyle}>
            <p style={hintStyle}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(total)}건`}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
            </p>
          </div>

          <SelectionBar count={selectedCount} onClear={clearSelection}>
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
            <Button variant="danger" disabled={bulkDeleting} onClick={() => setBulkOpen(true)}>
              {`선택 ${formatNumber(selectedCount)}건 삭제`}
            </Button>
          </SelectionBar>

          <BannersTable
            banners={banners}
            loading={firstLoading}
            onEdit={(banner) => navigate(`/content/banners/${banner.id}/edit`)}
            onDelete={openDelete}
            deletingId={deleting ? (pendingDelete?.id ?? null) : null}
            selectedIds={selectedIds}
            onToggleOne={list.toggleOne}
            onToggleAll={(checked) =>
              list.toggleAll(
                banners.map((banner) => banner.id),
                checked,
              )
            }
            startIndex={(page - 1) * PAGE_SIZE}
            onToggleEnabled={onToggleEnabled}
            togglingIds={togglingIds}
            reorderable={reorderable}
            onReorder={onReorder}
            reordering={reordering}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={list.setPage}
            label="배너 페이지"
          />
        </>
      ) : (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>배너 목록을 불러오지 못했습니다.</span>
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
          title="배너 삭제"
          message={`'${pendingDelete.title}' 배너를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="배너 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="배너 일괄 삭제"
          message={`선택한 배너 ${formatNumber(selectedCount)}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
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
