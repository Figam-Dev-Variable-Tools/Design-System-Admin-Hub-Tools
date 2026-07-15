// BannersPage — 배너 관리 (라우트: /content/banners) · A41 소유
//
// '목록 + 등록'이 한 화면에 있다 — 팝업 관리와 같은 구조(위치 필터만 메인/서브로 다르다).
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 저장/삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { SegmentedControl } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { parseFilter } from '../../../shared/crud';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  ConfirmDialog,
  hintStyle,
  Pagination,
  PlusCircleIcon,
  SearchField,
  SelectionBar,
  useRowSelection,
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

const SEARCH_DEBOUNCE_MS = 250;
const PLACEMENT_FILTER_VALUES: readonly PlacementFilter[] = PLACEMENT_FILTERS.map(
  (filter) => filter.id,
);

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const toolbarLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
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

export default function BannersPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [placement, setPlacement] = useState<PlacementFilter>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteBanner = useDeleteBanner();
  const deleting = deleteBanner.isPending;

  const { selectedIds, toggleOne, toggleAll, clear } = useRowSelection();
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

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    setPage(1);
  }, [placement, keyword]);

  useEffect(() => {
    clear();
  }, [placement, keyword, page, clear]);

  const query = useMemo(() => ({ placement, keyword, page }), [placement, keyword, page]);
  const { data, isFetching: loading, error, refetch } = useBannersQuery(query);

  const banners = useMemo(() => data?.banners ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (data === undefined) return;
    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (page > pages) setPage(pages);
  }, [data, page]);

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
          clear();
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
          clear();
          toast.success(`배너 ${formatNumber(ids.length)}건을 삭제했습니다.`);
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <div style={toolbarLeftStyle}>
          <SearchField value={keywordInput} onChange={setKeywordInput} label="배너 제목 검색" />
          <SegmentedControl
            value={placement}
            options={PLACEMENT_FILTERS.map((filter) => ({ id: filter.id, label: filter.label }))}
            ariaLabel="배너 위치 필터"
            onChange={(id) => setPlacement(parseFilter(id, PLACEMENT_FILTER_VALUES, 'all'))}
          />
        </div>
        <Button variant="primary" size="md" onClick={() => navigate('/content/banners/new')}>
          <PlusCircleIcon />
          배너 등록
        </Button>
      </div>

      {error === null ? (
        <>
          <div style={summaryRowStyle}>
            <p style={hintStyle}>
              {loading ? '불러오는 중…' : `전체 ${formatNumber(total)}건`}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
            </p>
          </div>

          <SelectionBar count={selectedCount} onClear={clear}>
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
            loading={loading}
            onEdit={(banner) => navigate(`/content/banners/${banner.id}/edit`)}
            onDelete={openDelete}
            deletingId={deleting ? (pendingDelete?.id ?? null) : null}
            selectedIds={selectedIds}
            onToggleOne={toggleOne}
            onToggleAll={(checked) =>
              toggleAll(
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

          <Pagination page={page} totalPages={totalPages} onChange={setPage} label="배너 페이지" />
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
