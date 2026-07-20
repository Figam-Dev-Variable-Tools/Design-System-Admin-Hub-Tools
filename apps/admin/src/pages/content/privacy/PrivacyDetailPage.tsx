// PrivacyDetailPage — 처리방침 버전 상세(전문) 조회 (라우트: /content/privacy/:id)
//
// [오너 피드백 ⑦] 목록에서 문서 전문을 dump 하지 않는다 — 버전 행을 눌러 여기서 전문을 본다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  ddStyle,
  dlStyle,
  dtStyle,
  Icon,
  StatusBadge,
  useToast,
} from '../../../shared/ui';
import { useDeletePrivacyVersion, usePrivacyVersionQuery } from './queries';
import { isCurrent, STATUS_LABEL, STATUS_TONE } from './types';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const topRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const titleGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const bodyTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const LIST_PATH = '/content/privacy';

export default function PrivacyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const versionId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  // [STATE-01] 스켈레톤 조건은 `data === undefined` **하나뿐이다** — 아래 본문 분기를 보라.
  // 예전엔 `isFetching || data === undefined` 라 재조회마다 읽고 있던 방침 본문이 사라졌다.
  const { data, error, refetch } = usePrivacyVersionQuery(versionId);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteVersion = useDeletePrivacyVersion();
  const deleting = deleteVersion.isPending;

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteVersion.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const onConfirmDelete = () => {
    if (data === undefined) return;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteVersion.mutate(
      { id: versionId, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success(`${data.version} 버전을 삭제했습니다.`);
          navigate(LIST_PATH, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('버전을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
        <button
          type="button"
          className="tds-ui-focusable"
          style={backLinkStyle}
          onClick={() => navigate(LIST_PATH)}
        >
          <Icon name="chevron-left" />
          목록으로
        </button>

        {data !== undefined && (
          <div style={actionsStyle}>
            <Button
              variant="secondary"
              onClick={() => navigate(`/content/privacy/${versionId}/edit`)}
            >
              수정
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteError(null);
                setConfirmingDelete(true);
              }}
            >
              삭제
            </Button>
          </div>
        )}
      </div>

      {error !== null ? (
        <Alert tone="danger">
          <div style={topRowStyle}>
            <span>처리방침 버전을 불러오지 못했습니다.</span>
            <span style={actionsStyle}>
              <Button
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                다시 시도
              </Button>
              <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
                목록으로
              </Button>
            </span>
          </div>
        </Alert>
      ) : data === undefined ? (
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>
            <span style={titleGroupStyle}>
              {data.version}
              {isCurrent(data) && <StatusBadge tone="info" label="현재" />}
              <StatusBadge tone={STATUS_TONE[data.status]} label={STATUS_LABEL[data.status]} />
            </span>
          </CardTitle>

          <dl style={dlStyle}>
            <dt style={dtStyle}>시행일</dt>
            <dd style={ddStyle}>{data.effectiveDate}</dd>
          </dl>

          <p style={bodyTextStyle}>{data.body}</p>
        </Card>
      )}

      {confirmingDelete && data !== undefined && (
        <ConfirmDialog
          intent="delete"
          title="처리방침 버전 삭제"
          message={`${data.version} 버전을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
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
