// FaqDetailPage — FAQ 조회 (라우트: /content/faq/:id)
//
// 읽기 전용 뷰 + 상단 액션(수정 → 폼 / 삭제 → 확인 다이얼로그). 패턴은 공지 상세를 따른다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
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
import { useDeleteFaq, useFaqQuery } from './queries';
import { visibilityLabel, visibilityTone } from './types';

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

const answerTextStyle: CSSProperties = {
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

export default function FaqDetailPage() {
  const { id } = useParams<{ id: string }>();
  const faqId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  // [STATE-01] 스켈레톤 조건은 `data === undefined` **하나뿐이다** — 아래 본문 분기를 보라.
  // 예전엔 `isFetching || data === undefined` 라 재조회마다 읽고 있던 답변이 스켈레톤이 됐다.
  const { data, error, refetch } = useFaqQuery(faqId);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deleteFaq = useDeleteFaq();
  const deleting = deleteFaq.isPending;

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteFaq.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const onConfirmDelete = () => {
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteFaq.mutate(
      { id: faqId, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success('FAQ 를 삭제했습니다.');
          navigate('/content/faq', { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('FAQ 를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
          onClick={() => navigate('/content/faq')}
        >
          <Icon name="chevron-left" />
          목록으로
        </button>

        {data !== undefined && (
          <div style={actionsStyle}>
            <Button variant="secondary" onClick={() => navigate(`/content/faq/${faqId}/edit`)}>
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
              {error.message === 'FAQ 를 찾을 수 없습니다'
                ? 'FAQ 를 찾을 수 없습니다.'
                : 'FAQ 를 불러오지 못했습니다.'}
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
              <Button variant="secondary" onClick={() => navigate('/content/faq')}>
                목록으로
              </Button>
            </span>
          </div>
        </Alert>
      ) : data === undefined ? (
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>
            <span style={titleGroupStyle}>
              {data.question}
              <StatusBadge
                tone={visibilityTone(data.visible)}
                label={visibilityLabel(data.visible)}
              />
            </span>
          </CardTitle>

          <dl style={dlStyle}>
            <dt style={dtStyle}>카테고리</dt>
            <dd style={ddStyle}>{data.categoryLabel}</dd>

            <dt style={dtStyle}>정렬 순서</dt>
            <dd style={ddStyle}>{formatNumber(data.order)}</dd>
          </dl>

          <p style={answerTextStyle}>{data.answer}</p>
        </Card>
      )}

      {confirmingDelete && data !== undefined && (
        <ConfirmDialog
          intent="delete"
          title="FAQ 삭제"
          message={`'${data.question}' FAQ 를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="FAQ 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
