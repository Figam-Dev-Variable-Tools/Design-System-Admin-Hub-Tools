// FaqPage — FAQ 목록 (라우트: /content/faq)
//
// 좌: 카테고리 + 노출 여부 필터 / 우: 검색 + 카테고리 등록(모달) + FAQ 등록 + 표 + 페이지네이션.
// 배치·패턴은 회원 관리(MembersPage)/공지사항을 따른다.
//
// [카테고리 등록은 모달] members 의 CreateGroupModal 패턴 — 목록에서 모달을 열어 만든다.
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 삭제 결과=토스트(실패는 다이얼로그 배너).
//
// [조회 상태의 소유자] category·visibility·keyword·page 와 선택은 shared/crud/useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13). 여기 있던 사본(검색 디바운스 · 조건 변경 시 page=1 ·
// 페이지 보정 · 선택 해제)은 전부 그 훅으로 갔다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

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
import { FaqFilters } from './components/FaqFilters';
import { FaqTable } from './components/FaqTable';
import { ManageFaqCategoriesModal } from './components/ManageFaqCategoriesModal';
import {
  useBulkDeleteFaqs,
  useBulkSetFaqVisibility,
  useDeleteFaq,
  useFaqCategoriesQuery,
  useFaqsQuery,
  useReorderFaqs,
  useSetFaqVisibility,
} from './queries';
import { CATEGORY_ALL, PAGE_SIZE, VISIBILITY_FILTERS } from './types';
import type { FaqSummary, VisibilityFilter } from './types';
import { cssVar } from '@tds/ui';

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(같은 화면이 두 개의 URL 을 갖지 않게) */
const FILTER_DEFAULTS = { category: CATEGORY_ALL, visibility: 'all' } as const;

/** URL 문자열 → 도메인 유니온. 허용 목록은 좌측 필터가 그리는 항목 전체다 (캐스팅 금지) */
const VISIBILITY_FILTER_VALUES: readonly VisibilityFilter[] = VISIBILITY_FILTERS.map(
  (filter) => filter.id,
);

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const toolbarActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
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

export default function FaqPage() {
  const toast = useToast();
  const navigate = useNavigate();

  /**
   * [EXC-03] 이 화면의 쓰기 권한 — 한 번 읽어 **여섯 자리**로 흘린다.
   *
   * 등록 CTA · 카테고리 관리 모달 · 일괄 노출/숨김 · 일괄 삭제 · 표(체크박스·휴지통·노출
   * 스위치·순서 이동) · 그리고 그 모든 뮤테이션의 거절. 손으로 만든 목록이라 껍데기의 게이팅을
   * 하나도 받지 못했고, 조회 권한만으로 노출 스위치가 눌리고 저장까지 됐다.
   */
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();

  /**
   * [IA-13] 카테고리·노출 필터·검색어·페이지의 단일 원천 = URL.
   *
   * FAQ 는 '결제 카테고리의 숨김 항목' 처럼 좁힌 뒤 한 건을 열어 고치고 돌아오는 일이 반복된다.
   * 상태가 useState 에만 있으면 그 Back 마다 전체·1페이지로 튕겨 조건을 다시 세워야 한다.
   * 검색 입력은 훅이 IME 안전하게 다룬다 (COMP-10) — 한글 질문을 찾는 화면이다.
   *
   * [categoryId 만 parseFilter 를 쓰지 않는다] 카테고리는 서버가 만드는 값이라 컴파일 시점의
   * 유니온이 없다 — 좁힐 대상 자체가 없으므로 문자열 그대로 쓴다(캐스팅이 아니다).
   */
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const categoryId = list.filters['category'] ?? CATEGORY_ALL;
  const visibility: VisibilityFilter = parseFilter(
    list.filters['visibility'] ?? 'all',
    VISIBILITY_FILTER_VALUES,
    'all',
  );
  const { keyword, page, selectedIds, clearSelection } = list;

  const [managingCategories, setManagingCategories] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<FaqSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  const reorderControllerRef = useRef<AbortController | null>(null);

  const deleteFaq = useDeleteFaq();
  const deleting = deleteFaq.isPending;

  const reorderFaqs = useReorderFaqs();
  const reordering = reorderFaqs.isPending;

  // 일괄 삭제 (선택 자체는 useListState 가 쥔다 — 조건이 바뀌면 자동으로 해제된다)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);
  const bulkDelete = useBulkDeleteFaqs();
  const bulkDeleting = bulkDelete.isPending;

  // 노출 여부 토글 (목록에서 바로) + 일괄 노출/숨김
  const [togglingIds, setTogglingIds] = useState<ReadonlySet<string>>(new Set());
  const visibilityMutation = useSetFaqVisibility();
  const bulkVisibility = useBulkSetFaqVisibility();
  const bulkTogglingVisibility = bulkVisibility.isPending;

  // 정렬 재정렬은 필터/검색이 없는 자연 순서 화면에서만 켠다 — 필터된 부분집합을 재정렬하면 의미가 흐려진다
  const reorderable = categoryId === CATEGORY_ALL && visibility === 'all' && keyword === '';

  const onReorder = (orderedIds: readonly string[]) => {
    // 순서 변경은 수정이다 — 표가 핸들을 지운 것과 같은 술어로 저장도 거절한다
    if (!canUpdate) {
      toast.error(WRITE_DENIED.update);
      return;
    }
    reorderControllerRef.current?.abort();
    const controller = new AbortController();
    reorderControllerRef.current = controller;

    reorderFaqs.mutate(
      { orderedIds, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('정렬 순서를 변경했어요.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 낙관적 업데이트는 mutation 이 롤백했다 — 사용자에게 알리고 같은 순서로 재시도 경로를 준다
          toast.error('정렬 순서를 변경하지 못했어요.', { retry: () => onReorder(orderedIds) });
        },
      },
    );
  };

  const { data: categories } = useFaqCategoriesQuery();

  const query = useMemo(
    () => ({ categoryId, visibility, keyword, page }),
    [categoryId, visibility, keyword, page],
  );
  const { data, isFetching, error, refetch } = useFaqsQuery(query);
  /**
   * [STATE-01] 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 이 화면은 **순서 이동**이
   * 일상이고 그것이 곧 invalidate 다 — 한 칸 올릴 때마다 표 전체가 스켈레톤으로 깜빡여 방금
   * 옮긴 행을 눈으로 좇을 수 없었다.
   */
  const firstLoading = isFetching && data === undefined;

  const faqs = useMemo(() => data?.faqs ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 다른 관리자가 지워 총 페이지가 줄면 현재 페이지를 마지막으로 보정한다 (STATE-04-a · 훅이 소유)
  const { clampPage } = list;
  useEffect(() => {
    if (data === undefined) return;
    clampPage(Math.ceil(data.total / PAGE_SIZE));
  }, [data, clampPage]);

  const openDelete = (faq: FaqSummary) => {
    setDeleteError(null);
    setPendingDelete(faq);
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteFaq.reset();
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

    deleteFaq.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success('FAQ 를 삭제했어요.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('FAQ 를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
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

  const onToggleVisible = (faq: FaqSummary, next: boolean) => {
    if (togglingIds.has(faq.id)) return;
    // 스위치를 배지로 바꾼 술어와 **같은 술어**가 저장을 거절한다 (RowToggle ↔ 여기)
    if (!canUpdate) {
      toast.error(WRITE_DENIED.update);
      return;
    }
    markToggling(faq.id, true);
    visibilityMutation.mutate(
      { id: faq.id, visible: next },
      {
        onSuccess: () => {
          toast.success(next ? `'${faq.question}' 를 노출해요.` : `'${faq.question}' 를 숨겼어요.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('노출 상태를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.', {
            retry: () => onToggleVisible(faq, next),
          });
        },
        onSettled: () => markToggling(faq.id, false),
      },
    );
  };

  const onBulkVisibility = (visible: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0 || bulkTogglingVisibility) return;
    if (!canUpdate) {
      toast.error(WRITE_DENIED.update);
      return;
    }
    bulkVisibility.mutate(
      { ids, visible },
      {
        onSuccess: (failed) => {
          const label = visible ? '노출' : '숨김';
          if (failed > 0) {
            toast.error(
              `FAQ ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 ${label} 처리하지 못했어요.`,
              { retry: () => onBulkVisibility(visible) },
            );
            return;
          }
          clearSelection();
          toast.success(`FAQ ${formatNumber(ids.length)}건을 ${label} 처리했어요.`);
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
              `FAQ ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clearSelection();
          toast.success(`FAQ ${formatNumber(ids.length)}건을 삭제했어요.`);
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <FaqFilters
          categoryId={categoryId}
          visibility={visibility}
          categories={categories ?? []}
          categoryCounts={data?.categoryCounts ?? null}
          visibilityCounts={data?.visibilityCounts ?? null}
          onCategoryChange={(next) => list.setFilter('category', next)}
          onVisibilityChange={(next) => list.setFilter('visibility', next)}
        />

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <SearchField
              value={list.searchInput}
              onChange={list.setSearchInput}
              label="FAQ 질문 검색"
              {...list.searchInputProps}
            />
            <div style={toolbarActionsStyle}>
              {/* 이 모달이 하는 일은 카테고리 등록·삭제뿐이다 — 둘 다 없으면 열 이유가 없다 */}
              {(canCreate || canRemove) && (
                <Button variant="secondary" size="md" onClick={() => setManagingCategories(true)}>
                  카테고리 관리
                </Button>
              )}
              {canCreate && (
                <Button variant="primary" size="md" onClick={() => navigate('/content/faq/new')}>
                  <Icon name="plus-circle" />
                  FAQ 등록
                </Button>
              )}
            </div>
          </div>

          {error === null ? (
            <>
              <div style={summaryRowStyle}>
                <p style={hintStyle}>
                  {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(total)}건`}
                  {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
                </p>
              </div>

              {/* 선택을 소비하는 것은 일괄 노출/숨김(update)과 일괄 삭제(remove)뿐이다.
                  둘 다 없으면 바 자체를 그리지 않는다 — 표도 같은 조건에서 체크박스를 지운다 */}
              {(canUpdate || canRemove) && (
                <SelectionBar count={selectedCount} onClear={clearSelection}>
                  {canUpdate && (
                    <>
                      <Button
                        variant="secondary"
                        disabled={bulkTogglingVisibility}
                        onClick={() => onBulkVisibility(true)}
                      >
                        일괄 노출
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={bulkTogglingVisibility}
                        onClick={() => onBulkVisibility(false)}
                      >
                        일괄 숨김
                      </Button>
                    </>
                  )}
                  {canRemove && (
                    <Button
                      variant="danger"
                      disabled={bulkDeleting}
                      onClick={() => setBulkOpen(true)}
                    >
                      {`선택 ${formatNumber(selectedCount)}건 삭제`}
                    </Button>
                  )}
                </SelectionBar>
              )}

              <FaqTable
                faqs={faqs}
                loading={firstLoading}
                onDelete={openDelete}
                deletingId={deleting ? (pendingDelete?.id ?? null) : null}
                reorderable={reorderable}
                onReorder={onReorder}
                reordering={reordering}
                selectedIds={selectedIds}
                onToggleOne={list.toggleOne}
                onToggleAll={(checked) =>
                  list.toggleAll(
                    faqs.map((faq) => faq.id),
                    checked,
                  )
                }
                startIndex={(page - 1) * PAGE_SIZE}
                onToggleVisible={onToggleVisible}
                togglingIds={togglingIds}
                canUpdate={canUpdate}
                canRemove={canRemove}
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={list.setPage}
                label="FAQ 페이지"
              />
            </>
          ) : (
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>FAQ 를 불러오지 못했어요.</span>
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

      {managingCategories && (
        <ManageFaqCategoriesModal
          onClose={() => setManagingCategories(false)}
          onCreated={(name) => toast.success(`'${name}' 카테고리를 만들었어요.`)}
          onDeleted={(label) => toast.success(`'${label}' 카테고리를 삭제했어요.`)}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="FAQ 삭제"
          message={`'${pendingDelete.question}' FAQ 를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="FAQ 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="FAQ 일괄 삭제"
          message={`선택한 FAQ ${formatNumber(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
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
