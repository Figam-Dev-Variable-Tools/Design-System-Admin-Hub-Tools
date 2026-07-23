// PrivacyPage — 개인정보 처리방침 (라우트: /content/privacy)
//
// [오너 피드백 ⑦] 문서 전문 dump 를 없애고 다른 목록(공지 등)과 같은 툴바 패턴으로 통일했다.
//   상단 툴바(검색 + '새 버전 등록') + 버전 이력 표(VersionHistoryTable 공통). 단일 문서라 종류 선택은 없다.
//   현재 시행본은 목록에서 '현재' 배지로 강조한다(전문은 행을 눌러 상세 페이지에서 본다).
//
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
//
// [조회 상태의 소유자] 검색어와 선택은 shared/crud/useListState 가 **URL 쿼리스트링**으로 소유한다
// (IA-13). 단일 문서라 종류 필터가 없고, 버전 이력은 몇 건뿐이라 페이지네이션도 없다 — 이 화면이
// 직렬화할 조회 상태는 검색어 하나뿐이다. 여기 있던 사본(검색 디바운스 · 선택 해제)은 그 훅으로 갔다.
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { useListState } from '../../../shared/crud';
import { formatNumber } from '../../../shared/format';
import {
  useRouteWritePermissions,
  WRITE_DENIED,
} from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  ConfirmDialog,
  Icon,
  SearchField,
  SelectionBar,
  useToast,
  VersionHistoryTable,
} from '../../../shared/ui';
import type { VersionRow } from '../../../shared/ui';
import {
  useBulkDeletePrivacyVersions,
  useDeletePrivacyVersion,
  usePrivacyVersionsQuery,
} from './queries';
import { isCurrent, STATUS_LABEL, STATUS_TONE } from './types';
import type { PrivacyVersion } from './types';
import { cssVar } from '@tds/ui';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
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

function toRow(version: PrivacyVersion): VersionRow {
  return {
    id: version.id,
    version: version.version,
    effectiveDate: version.effectiveDate,
    statusTone: STATUS_TONE[version.status],
    statusLabel: STATUS_LABEL[version.status],
    current: isCurrent(version),
  };
}

export default function PrivacyPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const { data: versions, isFetching: loading, error, refetch } = usePrivacyVersionsQuery();

  /**
   * [IA-13] 검색어의 단일 원천 = URL — 버전 전문(상세)에서 Back 하면 걸어 둔 검색이 살아 있어야 한다.
   * [COMP-10] 검색 입력의 IME 조합 판정과 조합 중 Enter 차단도 이 훅이 함께 준다.
   */
  const list = useListState();
  const { keyword, selectedIds, clearSelection } = list;

  /**
   * [EXC-03] 이 화면의 쓰기 권한 — 한 번 읽어 CTA · 일괄 삭제 바 · 표의 행 액션/체크박스 ·
   * 두 삭제 뮤테이션으로 흘린다. 손으로 만든 목록이라 껍데기의 게이팅을 하나도 받지 못했다.
   *
   * 처리방침은 **법적 문서**다 — 조회 권한만 가진 사람이 시행본을 지울 수 있으면 안 된다.
   */
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();

  const [pendingDelete, setPendingDelete] = useState<PrivacyVersion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteVersion = useDeletePrivacyVersion();
  const deleting = deleteVersion.isPending;

  // 일괄 삭제 (선택 자체는 useListState 가 쥔다 — 검색어가 바뀌면 자동으로 해제된다)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkControllerRef = useRef<AbortController | null>(null);
  const bulkDelete = useBulkDeletePrivacyVersions();
  const bulkDeleting = bulkDelete.isPending;

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
    // 휴지통을 없앤 술어와 **같은 술어**가 저장 경로도 막는다
    if (!canRemove) {
      setDeleteError(WRITE_DENIED.remove);
      return;
    }
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteVersion.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`${target.version} 버전을 삭제했어요.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('버전을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
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
              `버전 ${formatNumber(ids.length)}건 중 ${formatNumber(failed)}건을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }
          setBulkOpen(false);
          clearSelection();
          toast.success(`버전 ${formatNumber(ids.length)}건을 삭제했어요.`);
        },
      },
    );
  };

  if (error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>개인정보 처리방침을 불러오지 못했어요.</span>
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
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="처리방침 버전 검색"
          {...list.searchInputProps}
        />
        {/* 등록 권한이 없으면 CTA 는 '비활성' 이 아니라 '부재' 다 (EXC-03) */}
        {canCreate && (
          <Button variant="primary" size="md" onClick={() => navigate('/content/privacy/new')}>
            <Icon name="plus-circle" />새 버전 등록
          </Button>
        )}
      </div>

      {/* 이 바의 유일한 액션이 일괄 삭제다 — 삭제 권한이 없으면 바 자체가 없다 */}
      {canRemove && (
        <SelectionBar count={selectedCount} onClear={clearSelection}>
          <Button variant="danger" disabled={bulkDeleting} onClick={() => setBulkOpen(true)}>
            {`선택 ${formatNumber(selectedCount)}건 삭제`}
          </Button>
        </SelectionBar>
      )}

      {/* 권한은 **콜백의 유무**로 표현한다 — 표는 canUpdate/canRemove 를 모른다 */}
      <VersionHistoryTable
        versions={rows}
        caption={
          canRemove
            ? '개인정보 처리방침 버전 이력 — 체크박스로 선택하고, 행을 누르면 전문을 봐요. 수정/삭제 버튼으로 각 버전을 관리해요.'
            : '개인정보 처리방침 버전 이력 — 행을 누르면 전문을 봐요.'
        }
        {...(canUpdate && {
          onEdit: (id: string) => navigate(`/content/privacy/${id}/edit`),
        })}
        {...(canRemove && { onDelete: openDelete })}
        deletingId={deleting ? (pendingDelete?.id ?? null) : null}
        detailPathOf={(id) => `/content/privacy/${id}`}
        emptyMessage={loading ? '불러오는 중…' : '등록된 버전이 없어요.'}
        {...(canRemove && {
          selectedIds,
          onToggleOne: list.toggleOne,
          onToggleAll: (checked: boolean) =>
            list.toggleAll(
              rows.map((row) => row.id),
              checked,
            ),
        })}
      />

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="처리방침 버전 삭제"
          message={`${pendingDelete.version} 버전을 삭제할까요? 되돌릴 수 없어요.`}
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
          title="처리방침 버전 일괄 삭제"
          message={`선택한 버전 ${formatNumber(selectedCount)}건을 삭제할까요? 되돌릴 수 없어요.`}
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
