// PrivacyPage — 개인정보 처리방침 (라우트: /content/privacy) · A41 소유
//
// 단일 문서 — 현재 시행본 + 버전 이력(VersionHistoryTable 공통) + 등록/수정 인라인 폼.
// 약관 관리(/content/terms)와 '버전 문서 쌍'이며 버전 이력 표를 공유한다(종류 선택만 없다).
//
// [실패는 조용히 삼키지 않는다] 조회 실패=인라인 배너, 저장/삭제 결과=토스트(삭제 실패는 다이얼로그 배너).
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../../shared/async';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  hintStyle,
  PlusCircleIcon,
  useToast,
  VersionHistoryTable,
} from '../../../shared/ui';
import type { VersionRow } from '../../../shared/ui';
import { VersionForm } from './components/VersionForm';
import { useDeletePrivacyVersion, usePrivacyVersionsQuery } from './queries';
import { isCurrent, STATUS_LABEL, STATUS_TONE } from './types';
import type { PrivacyVersion } from './types';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
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

type FormTarget = PrivacyVersion | 'new' | null;

export default function PrivacyPage() {
  const toast = useToast();
  const { data: versions, isFetching: loading, error, refetch } = usePrivacyVersionsQuery();

  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [pendingDelete, setPendingDelete] = useState<PrivacyVersion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteVersion = useDeletePrivacyVersion();
  const deleting = deleteVersion.isPending;

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
      { id: target.id, signal: controller.signal },
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

  if (error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>개인정보 처리방침을 불러오지 못했습니다.</span>
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

      {formTarget !== null && (
        <VersionForm
          editing={formTarget === 'new' ? null : formTarget}
          onSaved={() => setFormTarget(null)}
          onCancel={() => setFormTarget(null)}
        />
      )}

      <Card>
        <CardTitle>버전 이력</CardTitle>
        <VersionHistoryTable
          versions={rows}
          caption="개인정보 처리방침 버전 이력 — 수정/삭제 버튼으로 각 버전을 관리합니다."
          onEdit={openEdit}
          onDelete={openDelete}
          deletingId={deleting ? (pendingDelete?.id ?? null) : null}
          emptyMessage={loading ? '불러오는 중…' : '등록된 버전이 없습니다.'}
        />
      </Card>

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="처리방침 버전 삭제"
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
