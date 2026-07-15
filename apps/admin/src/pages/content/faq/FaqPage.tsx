// FaqPage — FAQ 목록 (라우트: /content/faq) · A41 소유
//
// 좌: 카테고리 + 노출 여부 필터 / 우: 검색 + 카테고리 등록(모달) + FAQ 등록 + 표 + 페이지네이션.
// 배치·패턴은 회원 관리(MembersPage)/공지사항을 따른다.
//
// [카테고리 등록은 모달] members 의 CreateGroupModal 패턴 — 목록에서 모달을 열어 만든다.
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 삭제 결과=토스트(실패는 다이얼로그 배너).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
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
import { CATEGORY_ALL, PAGE_SIZE } from './types';
import type { FaqSummary, VisibilityFilter } from './types';

const SEARCH_DEBOUNCE_MS = 250;

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

const toolbarActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
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

export default function FaqPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [categoryId, setCategoryId] = useState<string>(CATEGORY_ALL);
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [managingCategories, setManagingCategories] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<FaqSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  const reorderControllerRef = useRef<AbortController | null>(null);

  const deleteFaq = useDeleteFaq();
  const deleting = deleteFaq.isPending;

  const reorderFaqs = useReorderFaqs();
  const reordering = reorderFaqs.isPending;

  // 선택 + 일괄 삭제
  const { selectedIds, toggleOne, toggleAll, clear } = useRowSelection();
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
    reorderControllerRef.current?.abort();
    const controller = new AbortController();
    reorderControllerRef.current = controller;

    reorderFaqs.mutate(
      { orderedIds, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('정렬 순서를 변경했습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 낙관적 업데이트는 mutation 이 롤백했다 — 사용자에게 알리고 같은 순서로 재시도 경로를 준다
          toast.error('정렬 순서를 변경하지 못했습니다.', { retry: () => onReorder(orderedIds) });
        },
      },
    );
  };

  const { data: categories } = useFaqCategoriesQuery();

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    setPage(1);
  }, [categoryId, visibility, keyword]);

  useEffect(() => {
    clear();
  }, [categoryId, visibility, keyword, page, clear]);

  const query = useMemo(
    () => ({ categoryId, visibility, keyword, page }),
    [categoryId, visibility, keyword, page],
  );
  const { data, isFetching: loading, error, refetch } = useFaqsQuery(query);

  const faqs = useMemo(() => data?.faqs ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (data === undefined) return;
    const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    if (page > pages) setPage(pages);
  }, [data, page]);

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
          toast.success('FAQ 를 삭제했습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('FAQ 를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
    markToggling(faq.id, true);
    visibilityMutation.mutate(
      { id: faq.id, visible: next },
      {
        onSuccess: () => {
          toast.success(
            next ? `'${faq.question}' 를 노출합니다.` : `'${faq.question}' 를 숨겼습니다.`,
          );
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('노출 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.', {
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
    bulkVisibility.mutate(
      { ids, visible },
      {
        onSuccess: (failed) => {
          const label = visible ? '노출' : '숨김';
          if (failed > 0) {
            toast.error(
              `FAQ ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 ${label} 처리하지 못했습니다.`,
              { retry: () => onBulkVisibility(visible) },
            );
            return;
          }
          clear();
          toast.success(`FAQ ${formatNumber(ids.length)}건을 ${label} 처리했습니다.`);
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
              `FAQ ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clear();
          toast.success(`FAQ ${formatNumber(ids.length)}건을 삭제했습니다.`);
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
          onCategoryChange={setCategoryId}
          onVisibilityChange={setVisibility}
        />

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <SearchField value={keywordInput} onChange={setKeywordInput} label="FAQ 질문 검색" />
            <div style={toolbarActionsStyle}>
              <Button variant="secondary" size="md" onClick={() => setManagingCategories(true)}>
                카테고리 관리
              </Button>
              <Button variant="primary" size="md" onClick={() => navigate('/content/faq/new')}>
                <PlusCircleIcon />
                FAQ 등록
              </Button>
            </div>
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
                <Button variant="danger" disabled={bulkDeleting} onClick={() => setBulkOpen(true)}>
                  {`선택 ${formatNumber(selectedCount)}건 삭제`}
                </Button>
              </SelectionBar>

              <FaqTable
                faqs={faqs}
                loading={loading}
                onDelete={openDelete}
                deletingId={deleting ? (pendingDelete?.id ?? null) : null}
                reorderable={reorderable}
                onReorder={onReorder}
                reordering={reordering}
                selectedIds={selectedIds}
                onToggleOne={toggleOne}
                onToggleAll={(checked) =>
                  toggleAll(
                    faqs.map((faq) => faq.id),
                    checked,
                  )
                }
                startIndex={(page - 1) * PAGE_SIZE}
                onToggleVisible={onToggleVisible}
                togglingIds={togglingIds}
              />

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                label="FAQ 페이지"
              />
            </>
          ) : (
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>FAQ 를 불러오지 못했습니다.</span>
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
          onCreated={(name) => toast.success(`'${name}' 카테고리를 만들었습니다.`)}
          onDeleted={(label) => toast.success(`'${label}' 카테고리를 삭제했습니다.`)}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="FAQ 삭제"
          message={`'${pendingDelete.question}' FAQ 를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
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
          message={`선택한 FAQ ${formatNumber(selectedCount)}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
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
