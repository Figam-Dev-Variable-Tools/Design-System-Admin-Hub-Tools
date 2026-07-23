// TermsDetailPage — 약관 버전 상세(전문) 조회 (라우트: /content/terms/:id)
//
// [오너 피드백 ⑦] 목록에서 문서 전문을 dump 하지 않는다 — 버전 행을 눌러 여기서 전문을 본다.
// 읽기 전용 뷰 + 상단 액션(수정 → 폼 / 삭제 → 확인 다이얼로그). 공지 상세(NoticeDetailPage)와 같은 결.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import {
  useRouteWritePermissions,
  WRITE_DENIED,
} from '../../../shared/permissions/RequirePermission';
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
import { useDeleteTermsVersion, useTermsVersionQuery } from './queries';
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
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const bodyTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.body.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
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

  /* [EXC-03] 상세의 두 액션은 서로 다른 권한을 탄다 — '수정' 은 update, '삭제' 는 remove.
     읽기는 그대로 열린다: 막는 것은 전문이 아니라 그 위에 얹힌 액션뿐이다. */
  const { canUpdate, canRemove } = useRouteWritePermissions();

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteVersion.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const onConfirmDelete = () => {
    if (data === undefined) return;
    // 버튼을 없앤 술어가 저장 경로도 막는다 (EXC-03)
    if (!canRemove) {
      setDeleteError(WRITE_DENIED.remove);
      return;
    }
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteVersion.mutate(
      { id: versionId, typeId: data.typeId, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success(`${data.version} 버전을 삭제했어요.`);
          navigate(LIST_PATH, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('버전을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
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

        {data !== undefined && (canUpdate || canRemove) && (
          <div style={actionsStyle}>
            {canUpdate && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/content/terms/${versionId}/edit`)}
              >
                수정
              </Button>
            )}
            {canRemove && (
              <Button
                variant="danger"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmingDelete(true);
                }}
              >
                삭제
              </Button>
            )}
          </div>
        )}
      </div>

      {error !== null ? (
        <Alert tone="danger">
          <div style={topRowStyle}>
            <span>약관 버전을 불러오지 못했어요.</span>
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
            {data.version}
            {isCurrent(data) && <StatusBadge tone="info" label="현재" />}
            <StatusBadge tone={STATUS_TONE[data.status]} label={STATUS_LABEL[data.status]} />
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
          message={`${data.version} 버전을 삭제할까요? 되돌릴 수 없어요.`}
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
