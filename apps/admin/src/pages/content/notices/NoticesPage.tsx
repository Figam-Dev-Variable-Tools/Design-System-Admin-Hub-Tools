// NoticesPage — 공지사항 목록 (라우트: /content/notices) · A41 소유
//
// 좌: 분류 + 상태 필터 / 우: 검색 + 등록 + 표 + 페이지네이션.
// 배치·스타일·패턴은 회원 관리(MembersPage)를 그대로 따른다 — 콘텐츠 목록의 정본이 된다.
//
// [실패는 조용히 삼키지 않는다 — shared/ui/README.md]
//   - 목록 조회 실패 → 인라인 배너(다시 시도). 화면이 비어 있고 할 일이 '다시 시도'뿐이라 사라지면 안 된다.
//   - 삭제(방금 시작한 쓰기)의 성공/실패 → 토스트. 삭제 실패는 다이얼로그 안 배너 + 재클릭 = 재시도.
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 백엔드가 붙어도 이 파일은 바뀌지 않는다.
//
// [조회 상태의 소유자] category·status·keyword·page 와 선택은 이 파일의 useState 가 아니라
// shared/crud/useListState 가 **URL 쿼리스트링**으로 소유한다 (IA-13). 여기 있던 사본
// (검색 디바운스 · 조건 변경 시 page=1 · 페이지 보정 · 선택 해제)은 전부 그 훅으로 갔다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { parseFilter, useListState } from '../../../shared/crud';
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
  useToast,
} from '../../../shared/ui';
import { NoticeFilters } from './components/NoticeFilters';
import { NoticesTable } from './components/NoticesTable';
import { useBulkDeleteNotices, useDeleteNotice, useNoticesQuery } from './queries';
import { CATEGORY_FILTERS, PAGE_SIZE, STATUS_FILTERS } from './types';
import type { CategoryFilter, NoticeSummary, StatusFilter } from './types';

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(같은 화면이 두 개의 URL 을 갖지 않게) */
const FILTER_DEFAULTS = { category: 'all', status: 'all' } as const;

/** URL 문자열 → 도메인 유니온. 허용 목록은 좌측 필터가 그리는 항목 전체다 (캐스팅 금지) */
const CATEGORY_FILTER_VALUES: readonly CategoryFilter[] = CATEGORY_FILTERS.map(
  (filter) => filter.id,
);
const STATUS_FILTER_VALUES: readonly StatusFilter[] = STATUS_FILTERS.map((filter) => filter.id);

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'calc(var(--tds-space-6) * 9) minmax(0, 1fr)',
  gap: 'var(--tds-space-6)',
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
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

export default function NoticesPage() {
  const toast = useToast();
  const navigate = useNavigate();

  /**
   * [IA-13] 분류·상태·검색어·페이지의 단일 원천 = URL.
   *
   * 이 화면의 일상은 '점검 · 예약' 을 걸고 3페이지에서 공지를 열어 본 뒤 Back 하는 것이다.
   * 상태가 useState 에만 있으면 그 Back 은 **필터 없는 1페이지**에 착지한다 — 조건을 손으로 다시
   * 만들어야 하고, '이 조건 좀 봐주세요' 하며 공유할 링크도 존재하지 않는다.
   * 검색 입력은 훅이 IME 안전하게 다룬다 (COMP-10) — 한글 제목을 찾는 화면이라 특히 중요하다.
   */
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const category: CategoryFilter = parseFilter(
    list.filters['category'] ?? 'all',
    CATEGORY_FILTER_VALUES,
    'all',
  );
  const status: StatusFilter = parseFilter(
    list.filters['status'] ?? 'all',
    STATUS_FILTER_VALUES,
    'all',
  );
  const { keyword, page, selectedIds, clearSelection } = list;

  const [pendingDelete, setPendingDelete] = useState<NoticeSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteNotice = useDeleteNotice();
  const deleting = deleteNotice.isPending;

  // 일괄 삭제 (선택 자체는 useListState 가 쥔다 — 조건이 바뀌면 자동으로 해제된다)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);
  const bulkDelete = useBulkDeleteNotices();
  const bulkDeleting = bulkDelete.isPending;

  const query = useMemo(
    () => ({ category, status, keyword, page }),
    [category, status, keyword, page],
  );
  const { data, isFetching, error, refetch } = useNoticesQuery(query);
  /**
   * [STATE-01] 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 그래서 노출 토글·삭제·일괄
   * 삭제가 목록을 invalidate 할 때마다, 그리고 필터/페이지를 바꿀 때마다(queries.ts 가
   * placeholderData 로 이전 행을 들고 있는데도) 표가 스켈레톤으로 덮였다 — 방금 만지던 행이
   * 운영자 눈앞에서 사라진다. NoticesTable 자신은 옳았다: 버그는 무엇을 loading 이라 부르며
   * 넘겼는가에 있었다.
   */
  const firstLoading = isFetching && data === undefined;

  const notices = useMemo(() => data?.notices ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 다른 관리자가 지워 총 페이지가 줄면 현재 페이지를 마지막으로 보정한다 (STATE-04-a · 훅이 소유)
  const { clampPage } = list;
  useEffect(() => {
    if (data === undefined) return;
    clampPage(Math.ceil(data.total / PAGE_SIZE));
  }, [data, clampPage]);

  const openDelete = (notice: NoticeSummary) => {
    setDeleteError(null);
    setPendingDelete(notice);
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteNotice.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;

    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteNotice.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${target.title}' 공지를 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('공지를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const selectedCount = selectedIds.size;

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
              `공지 ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clearSelection();
          toast.success(`공지 ${formatNumber(ids.length)}건을 삭제했습니다.`);
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <NoticeFilters
          category={category}
          status={status}
          categoryCounts={data?.categoryCounts ?? null}
          statusCounts={data?.statusCounts ?? null}
          onCategoryChange={(next) => list.setFilter('category', next)}
          onStatusChange={(next) => list.setFilter('status', next)}
        />

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <SearchField
              value={list.searchInput}
              onChange={list.setSearchInput}
              label="공지 제목 검색"
              {...list.searchInputProps}
            />
            <Button variant="primary" size="md" onClick={() => navigate('/content/notices/new')}>
              <PlusCircleIcon />
              공지 등록
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
                <Button variant="danger" disabled={bulkDeleting} onClick={() => setBulkOpen(true)}>
                  {`선택 ${formatNumber(selectedCount)}건 삭제`}
                </Button>
              </SelectionBar>

              <NoticesTable
                notices={notices}
                loading={firstLoading}
                onDelete={openDelete}
                deletingId={deleting ? (pendingDelete?.id ?? null) : null}
                selectedIds={selectedIds}
                onToggleOne={list.toggleOne}
                onToggleAll={(checked) =>
                  list.toggleAll(
                    notices.map((notice) => notice.id),
                    checked,
                  )
                }
                startIndex={(page - 1) * PAGE_SIZE}
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={list.setPage}
                label="공지사항 페이지"
              />
            </>
          ) : (
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>공지사항을 불러오지 못했습니다.</span>
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
        </div>
      </div>

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="공지 삭제"
          message={`'${pendingDelete.title}' 공지를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="공지 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="공지 일괄 삭제"
          message={`선택한 공지 ${formatNumber(selectedCount)}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
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
