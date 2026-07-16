// TermsDetailPage — 약관 버전 상세(전문) 조회 (라우트: /content/terms/:id) · A41 소유
//
// [오너 피드백 ⑦] 목록에서 문서 전문을 dump 하지 않는다 — 버전 행을 눌러 여기서 전문을 본다.
// 읽기 전용 뷰 + 상단 액션(수정 → 폼 / 삭제 → 확인 다이얼로그). 공지 상세(NoticeDetailPage)와 같은 결.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  ConfirmDialog,
  ddStyle,
  dlStyle,
  dtStyle,
  StatusBadge,
  useToast,
} from '../../../shared/ui';
import { useDeleteTermsVersion, useTermsVersionQuery } from './queries';
import { isCurrent, STATUS_LABEL, STATUS_TONE } from './types';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const topRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--tds-space-2)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const titleGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
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

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const LIST_PATH = '/content/terms';

export default function TermsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const versionId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  // [STATE-01] 스켈레톤 조건은 `data === undefined` **하나뿐이다** — 아래 본문 분기를 보라.
  // 예전엔 `isFetching || data === undefined` 였다. 그래서 재조회가 걸리면 이미 읽고 있던
  // 약관 본문이 스켈레톤으로 교체됐다.
  const { data, error, refetch } = useTermsVersionQuery(versionId);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteVersion = useDeleteTermsVersion();
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
      { id: versionId, typeId: data.typeId, signal: controller.signal },
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
          <ChevronLeftIcon />
          목록으로
        </button>

        {data !== undefined && (
          <div style={actionsStyle}>
            <Button
              variant="secondary"
              onClick={() => navigate(`/content/terms/${versionId}/edit`)}
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
            <span>약관 버전을 불러오지 못했습니다.</span>
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
              <span key={`row-${String(row)}`} className="tds-ui-skeleton" aria-hidden="true" />
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
          title="약관 버전 삭제"
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
