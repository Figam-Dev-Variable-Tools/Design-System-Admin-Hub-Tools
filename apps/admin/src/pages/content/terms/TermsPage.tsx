// TermsPage — 약관 관리 (라우트: /content/terms) · A41 소유
//
// [오너 피드백 ⑦] 문서 전문 dump 를 없애고 다른 목록(공지 등)과 같은 툴바 패턴으로 통일했다.
//   좌: 약관 종류 필터 / 우: 툴바(검색 + '새 버전 등록') + 버전 이력 표(VersionHistoryTable 공통).
//   현재 시행본은 목록에서 '현재' 배지로 강조한다(전문은 행을 눌러 상세 페이지에서 본다).
//   등록/수정은 별도 폼 페이지, 행 클릭은 상세 페이지로 간다.
//
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import {
  Alert,
  Button,
  ConfirmDialog,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  PlusCircleIcon,
  SearchField,
  useToast,
  VersionHistoryTable,
} from '../../../shared/ui';
import type { VersionRow } from '../../../shared/ui';
import { useDeleteTermsVersion, useTermsTypesQuery, useTermsVersionsQuery } from './queries';
import { isCurrent, STATUS_LABEL, STATUS_TONE } from './types';
import type { TermsVersion } from './types';

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

const sideStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
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

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
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
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  // 종류 목록이 도착하면 첫 종류를 자동 선택한다
  useEffect(() => {
    if (selectedTypeId === '' && types !== undefined && types[0] !== undefined) {
      setSelectedTypeId(types[0].id);
    }
  }, [types, selectedTypeId]);

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

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <nav style={sideStyle} aria-label="약관 종류">
          <h2 style={filterHeadingStyle}>약관 종류</h2>
          <ul style={filterListStyle}>
            {(types ?? []).map((type) => {
              const active = type.id === selectedTypeId;
              return (
                <li key={type.id}>
                  <button
                    type="button"
                    className="tds-ui-listitem tds-ui-focusable"
                    style={filterItemStyle(active)}
                    aria-pressed={active}
                    onClick={() => setSelectedTypeId(type.id)}
                  >
                    <span>{type.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <SearchField value={keywordInput} onChange={setKeywordInput} label="약관 버전 검색" />
            <Button
              variant="primary"
              size="md"
              disabled={selectedTypeId === ''}
              onClick={() => navigate(`/content/terms/new?type=${selectedTypeId}`)}
            >
              <PlusCircleIcon />새 버전 등록
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
            <VersionHistoryTable
              versions={rows}
              caption="약관 버전 이력 — 행을 누르면 전문을 봅니다. 수정/삭제 버튼으로 각 버전을 관리합니다."
              onEdit={(id) => navigate(`/content/terms/${id}/edit`)}
              onDelete={openDelete}
              deletingId={deleting ? (pendingDelete?.id ?? null) : null}
              detailPathOf={(id) => `/content/terms/${id}`}
              emptyMessage={loading ? '불러오는 중…' : '등록된 버전이 없습니다.'}
            />
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
    </div>
  );
}
