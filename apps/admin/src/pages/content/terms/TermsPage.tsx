// TermsPage — 약관 관리 (라우트: /content/terms) · A41 소유
//
// 좌: 약관 종류 선택 / 우: 현재 시행본 + 버전 이력(VersionHistoryTable 공통) + 등록/수정 인라인 폼.
// 개인정보 처리방침(/content/privacy)과 '버전 문서 쌍'이며 버전 이력 표를 공유한다.
//
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 저장/삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  hintStyle,
  PlusCircleIcon,
  useToast,
  VersionHistoryTable,
} from '../../../shared/ui';
import type { VersionRow } from '../../../shared/ui';
import { VersionForm } from './components/VersionForm';
import { useDeleteTermsVersion, useTermsTypesQuery, useTermsVersionsQuery } from './queries';
import { isCurrent, STATUS_LABEL, STATUS_TONE } from './types';
import type { TermsVersion } from './types';

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

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const bodyTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
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

type FormTarget = TermsVersion | 'new' | null;

export default function TermsPage() {
  const toast = useToast();

  const { data: types } = useTermsTypesQuery();
  const [selectedTypeId, setSelectedTypeId] = useState('');

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

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [pendingDelete, setPendingDelete] = useState<TermsVersion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteVersion = useDeleteTermsVersion();
  const deleting = deleteVersion.isPending;

  // 종류를 바꾸면 열려 있던 폼을 닫는다
  useEffect(() => {
    setFormTarget(null);
  }, [selectedTypeId]);

  const versionList = useMemo(() => versions ?? [], [versions]);
  const current = versionList.find((version) => isCurrent(version)) ?? null;
  const rows = versionList.map(toRow);

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
          setFormTarget((cur) =>
            cur !== null && cur !== 'new' && cur.id === target.id ? null : cur,
          );
          toast.success(`${target.version} 버전을 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('버전을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const openEdit = (id: string) => {
    const version = versionList.find((item) => item.id === id);
    if (version !== undefined) setFormTarget(version);
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
              <Card>
                <div style={headerRowStyle}>
                  <CardTitle>현재 시행본</CardTitle>
                  <Button variant="primary" onClick={() => setFormTarget('new')}>
                    <PlusCircleIcon />새 버전 등록
                  </Button>
                </div>
                {loading && current === null ? (
                  <span className="tds-ui-skeleton" aria-hidden="true" />
                ) : current === null ? (
                  <p style={hintStyle}>시행 중인 버전이 없습니다. 새 버전을 등록해 시행하세요.</p>
                ) : (
                  <p style={bodyTextStyle}>{current.body}</p>
                )}
              </Card>

              {formTarget !== null && selectedTypeId !== '' && (
                <VersionForm
                  typeId={selectedTypeId}
                  editing={formTarget === 'new' ? null : formTarget}
                  onSaved={() => setFormTarget(null)}
                  onCancel={() => setFormTarget(null)}
                />
              )}

              <Card>
                <CardTitle>버전 이력</CardTitle>
                <VersionHistoryTable
                  versions={rows}
                  caption="약관 버전 이력 — 수정/삭제 버튼으로 각 버전을 관리합니다."
                  onEdit={openEdit}
                  onDelete={openDelete}
                  deletingId={deleting ? (pendingDelete?.id ?? null) : null}
                  emptyMessage={loading ? '불러오는 중…' : '등록된 버전이 없습니다.'}
                />
              </Card>
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
    </div>
  );
}
