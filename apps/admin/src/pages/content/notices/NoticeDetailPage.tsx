// NoticeDetailPage — 공지 상세 조회 (라우트: /content/notices/:id)
//
// 읽기 전용 뷰 + 상단 액션(수정 → 폼 / 삭제 → 확인 다이얼로그).
// 배치·패턴은 회원 상세(MemberDetailPage)를 따른다.
//
// [실패는 조용히 삼키지 않는다]
//   - 조회 실패 → 인라인 배너(다시 시도 / 목록으로).
//   - 삭제 성공/실패 → 토스트(성공은 목록으로 이동). 삭제 실패는 다이얼로그 안 배너 + 재클릭 = 재시도.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { formatDateTime, formatNumber } from '../../../shared/format';
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
import { useDeleteNotice, useNoticeQuery } from './queries';
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE } from './types';

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

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const noticeId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  // [STATE-01] 스켈레톤 조건은 `data === undefined` **하나뿐이다** — 아래 본문 분기를 보라.
  // 예전엔 `isFetching || data === undefined` 라, 목록↔상세를 오가며 staleTime(30초)이 지나
  // 재조회가 돌면 캐시가 이미 쥐고 있던 공지 본문이 스켈레톤으로 교체됐다.
  const { data, error, refetch } = useNoticeQuery(noticeId);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteNotice = useDeleteNotice();
  const deleting = deleteNotice.isPending;

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteNotice.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const onConfirmDelete = () => {
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteNotice.mutate(
      { id: noticeId, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success(
            data === undefined ? '공지를 삭제했습니다.' : `'${data.title}' 공지를 삭제했습니다.`,
          );
          navigate('/content/notices', { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('공지를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
          onClick={() => navigate('/content/notices')}
        >
          <Icon name="chevron-left" />
          목록으로
        </button>

        {data !== undefined && (
          <div style={actionsStyle}>
            <Button
              variant="secondary"
              onClick={() => navigate(`/content/notices/${noticeId}/edit`)}
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
            <span>
              {error.message === '공지를 찾을 수 없습니다'
                ? '공지를 찾을 수 없습니다.'
                : '공지를 불러오지 못했습니다.'}
            </span>
            <span style={actionsStyle}>
              <Button
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                다시 시도
              </Button>
              <Button variant="secondary" onClick={() => navigate('/content/notices')}>
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
              {data.pinned && <StatusBadge tone="warning" label="고정" />}
              {data.title}
              <StatusBadge tone={STATUS_TONE[data.status]} label={STATUS_LABEL[data.status]} />
            </span>
          </CardTitle>

          <dl style={dlStyle}>
            <dt style={dtStyle}>분류</dt>
            <dd style={ddStyle}>{CATEGORY_LABEL[data.category]}</dd>

            <dt style={dtStyle}>작성자</dt>
            <dd style={ddStyle}>{data.author}</dd>

            <dt style={dtStyle}>게시일</dt>
            <dd style={ddStyle}>{formatDateTime(data.publishedAtIso)}</dd>

            <dt style={dtStyle}>조회수</dt>
            <dd style={ddStyle}>{formatNumber(data.views)}</dd>
          </dl>

          <p style={bodyTextStyle}>{data.body}</p>
        </Card>
      )}

      {confirmingDelete && data !== undefined && (
        <ConfirmDialog
          intent="delete"
          title="공지 삭제"
          message={`'${data.title}' 공지를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="공지 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
