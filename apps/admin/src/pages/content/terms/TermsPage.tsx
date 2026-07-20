// TermsPage — 약관 관리 (라우트: /content/terms)
//
// [오너 피드백 ⑦] 문서 전문 dump 를 없애고 다른 목록(공지 등)과 같은 툴바 패턴으로 통일했다.
//   좌: 약관 종류 필터 / 우: 툴바(검색 + '새 버전 등록') + 버전 이력 표(VersionHistoryTable 공통).
//   현재 시행본은 목록에서 '현재' 배지로 강조한다(전문은 행을 눌러 상세 페이지에서 본다).
//   등록/수정은 별도 폼 페이지, 행 클릭은 상세 페이지로 간다.
//
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
//
// [조회 상태의 소유자] 약관 종류·검색어와 선택은 shared/crud/useListState 가 **URL 쿼리스트링**으로
// 소유한다 (IA-13). 페이지네이션은 없다(한 종류의 버전 이력은 몇 건뿐이라 전부 그린다) — page 는
// 쓰지 않는다. 여기 있던 사본(검색 디바운스 · 선택 해제)은 그 훅으로 갔다.
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { useListState } from '../../../shared/crud';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  ConfirmDialog,
  FilterPanel,
  FilterRail,
  Icon,
  SearchField,
  SelectionBar,
  useToast,
  VersionHistoryTable,
} from '../../../shared/ui';
import type { FilterOption, VersionRow } from '../../../shared/ui';
import {
  useBulkDeleteTermsVersions,
  useDeleteTermsVersion,
  useTermsTypesQuery,
  useTermsVersionsQuery,
} from './queries';
import { isCurrent, STATUS_LABEL, STATUS_TONE } from './types';
import type { TermsVersion } from './types';
import { cssVar } from '@tds/ui';

/**
 * URL 파라미터 기본값.
 *
 * 종류의 기본값이 '' 인 이유: 기본 화면은 '첫 종류' 인데 그 id 는 서버가 준다 — 컴파일 시점에
 * 이름을 알 수 없다. '' 를 '아직 안 고름' 센티넬로 두면 기본 화면의 URL 은 파라미터가 없고
 * (`/content/terms`), 종류를 고른 순간에만 `?type=…` 이 붙는다.
 */
const FILTER_DEFAULTS = { type: '' } as const;

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'calc(var(--tds-space-6) * 9) minmax(0, 1fr)',
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

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

function toRow(version: TermsVersion): VersionRow {
  return {
    id: version.id,
    version: version.version,
    effectiveDate: version.effectiveDate,
    statusTone: STATUS_TONE[version.status],
    statusLabel: STATUS_LABEL[version.status],
    current: isCurrent(version),
  };
}

export default function TermsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const { data: types } = useTermsTypesQuery();

  /**
   * [IA-13] 약관 종류·검색어의 단일 원천 = URL.
   *
   * 운영자는 '이용약관 v2.1 좀 봐주세요' 하며 링크를 준다. 종류가 useState 에만 있으면 그 링크는
   * 언제나 첫 종류를 열어 상대가 종류를 다시 고르게 만든다 — 버전 상세에서 Back 해도 같다.
   * 검색 입력의 IME 처리(COMP-10)도 이 훅이 함께 준다.
   */
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const typeParam = list.filters['type'] ?? '';
  const { keyword, selectedIds, clearSelection } = list;

  /**
   * 화면에 걸린 종류 — URL 이 비면 첫 종류(기존 자동 선택 동작 그대로).
   *
   * [effect 로 쓰지 않고 파생시킨다] URL 을 원천으로 삼으면 '첫 종류' 는 계산할 수 있는 값이지
   * 저장할 값이 아니다. effect 로 URL 에 써 넣으면 목록에 들어서기만 해도 `?type=…` 이 붙어
   * 기본 화면의 URL 이 둘로 갈린다.
   *
   * [목록에 없는 종류는 첫 종류로 접는다] URL 은 사람이 고친다 — 삭제된 종류나 오타(`?type=x`)로
   * 아무 종류도 선택되지 않은 빈 화면에 착지하지 않게 한다. types 가 오기 전에는 검증할 수
   * 없으므로 URL 값을 그대로 믿는다(그래야 첫 조회가 옳은 종류로 나간다).
   */
  const selectedTypeId = useMemo(() => {
    if (types === undefined) return typeParam;
    if (typeParam !== '' && types.some((type) => type.id === typeParam)) return typeParam;
    return types[0]?.id ?? '';
  }, [types, typeParam]);

  const {
    data: versions,
    isFetching: loading,
    error,
    refetch,
  } = useTermsVersionsQuery(selectedTypeId);

  const [pendingDelete, setPendingDelete] = useState<TermsVersion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteVersion = useDeleteTermsVersion();
  const deleting = deleteVersion.isPending;

  // 일괄 삭제 (선택 자체는 useListState 가 쥔다 — 종류/검색이 바뀌면 자동으로 해제된다)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);
  const bulkDelete = useBulkDeleteTermsVersions();
  const bulkDeleting = bulkDelete.isPending;

  /** 약관 종류에는 건수 배지가 없다 — 세는 것은 버전이지 종류가 아니다 (hideCount) */
  const typeOptions = useMemo<readonly FilterOption<string>[]>(
    () => (types ?? []).map((type) => ({ id: type.id, label: type.label, hideCount: true })),
    [types],
  );

  const versionList = useMemo(() => versions ?? [], [versions]);
  const rows = useMemo(() => {
    const trimmed = keyword.trim().toLowerCase();
    const filtered =
      trimmed === ''
        ? versionList
        : versionList.filter((version) => version.version.toLowerCase().includes(trimmed));
    return filtered.map(toRow);
  }, [versionList, keyword]);

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteVersion.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteVersion.mutate(
      { id: target.id, typeId: selectedTypeId, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`${target.version} 버전을 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('버전을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const openDelete = (id: string) => {
    const version = versionList.find((item) => item.id === id);
    if (version === undefined) return;
    setDeleteError(null);
    setPendingDelete(version);
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
      { ids, typeId: selectedTypeId, signal: controller.signal },
      {
        onSuccess: (failed) => {
          if (controller.signal.aborted) return;
          if (failed > 0) {
            setBulkError(
              `버전 ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clearSelection();
          toast.success(`버전 ${formatNumber(ids.length)}건을 삭제했습니다.`);
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <FilterRail>
          <FilterPanel
            navLabel="약관 종류"
            heading="약관 종류"
            options={typeOptions}
            value={selectedTypeId}
            counts={null}
            onChange={(next) => list.setFilter('type', next)}
          />
        </FilterRail>

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <SearchField
              value={list.searchInput}
              onChange={list.setSearchInput}
              label="약관 버전 검색"
              {...list.searchInputProps}
            />
            <Button
              variant="primary"
              size="md"
              disabled={selectedTypeId === ''}
              onClick={() => navigate(`/content/terms/new?type=${selectedTypeId}`)}
            >
              <Icon name="plus-circle" />새 버전 등록
            </Button>
          </div>

          {error !== null ? (
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>약관을 불러오지 못했습니다.</span>
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
          ) : (
            <>
              <SelectionBar count={selectedCount} onClear={clearSelection}>
                <Button variant="danger" disabled={bulkDeleting} onClick={() => setBulkOpen(true)}>
                  {`선택 ${formatNumber(selectedCount)}건 삭제`}
                </Button>
              </SelectionBar>

              <VersionHistoryTable
                versions={rows}
                caption="약관 버전 이력 — 체크박스로 선택하고, 행을 누르면 전문을 봅니다. 수정/삭제 버튼으로 각 버전을 관리합니다."
                onEdit={(id) => navigate(`/content/terms/${id}/edit`)}
                onDelete={openDelete}
                deletingId={deleting ? (pendingDelete?.id ?? null) : null}
                detailPathOf={(id) => `/content/terms/${id}`}
                emptyMessage={loading ? '불러오는 중…' : '등록된 버전이 없습니다.'}
                selectedIds={selectedIds}
                onToggleOne={list.toggleOne}
                onToggleAll={(checked) =>
                  list.toggleAll(
                    rows.map((row) => row.id),
                    checked,
                  )
                }
              />
            </>
          )}
        </div>
      </div>

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="약관 버전 삭제"
          message={`${pendingDelete.version} 버전을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="버전 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}

      {bulkOpen && (
        <ConfirmDialog
          intent="delete"
          title="약관 버전 일괄 삭제"
          message={`선택한 버전 ${formatNumber(selectedCount)}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
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
