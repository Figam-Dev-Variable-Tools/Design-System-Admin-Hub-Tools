// ReviewDetailPage — 리뷰 상세 (라우트: /products/reviews/:id)
//
// 왼쪽: 리뷰 메타(상품·작성자·별점·신고사유) + 노출/숨김 토글 + 관리자 답변 편집.
// 오른쪽: 고객 화면 렌더 미리보기. 저장은 프레임워크 저수준 훅(useCrudUpdate), 삭제는 useCrudDelete.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

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
  fieldLabelStyle,
  fieldStyle,
  Icon,
  pageTitleStyle,
  StatusBadge,
  TextareaField,
  ToggleSwitch,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { useCrudDelete, useCrudUpdate } from '../../../shared/crud';
import { reviewAdapter } from './data-source';
import { ReviewPreview } from './components/ReviewPreview';
import { REVIEW_REPLY_MAX, starText, toReviewInput } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'reviews';
const LIST_PATH = '/products/reviews';
const UNSAVED_MESSAGE =
  '리뷰에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
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

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const starStyle: CSSProperties = {
  color: cssVar('color.feedback.warning.text'),
  letterSpacing: '0.05em',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const rightActionsStyle: CSSProperties = {
  display: 'inline-flex',
  gap: cssVar('space.2'),
};

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => reviewAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const review = detailQuery.data;

  const update = useCrudUpdate(RESOURCE, reviewAdapter);
  const remove = useCrudDelete(RESOURCE, reviewAdapter);
  const saving = update.isPending;

  const [reply, setReply] = useState('');
  const [visible, setVisible] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 로드되면 편집 상태를 채운다
  useEffect(() => {
    if (review === undefined) return;
    setReply(review.reply);
    setVisible(review.visible);
  }, [review]);

  const dirty = review !== undefined && (reply !== review.reply || visible !== review.visible);
  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE });

  const onSave = () => {
    if (review === undefined || id === undefined) return;
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      {
        id,
        input: { ...toReviewInput(review), reply: reply.trim(), visible },
        signal: controller.signal,
      },
      {
        onSuccess: () => {
          toast.success('리뷰를 저장했습니다.');
          void detailQuery.refetch();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    remove.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const onConfirmDelete = () => {
    if (id === undefined) return;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);
    remove.mutate(
      { id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('리뷰를 삭제했습니다.');
          navigate(LIST_PATH, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  if (detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>리뷰를 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>리뷰 상세</h1>
      </div>

      {review === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: cssVar('color.text.muted') }}>불러오는 중…</p>
        </Card>
      ) : (
        <div style={layoutStyle}>
          <Card>
            <CardTitle>리뷰 정보</CardTitle>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            <dl style={dlStyle}>
              <dt style={dtStyle}>상품</dt>
              <dd style={ddStyle}>{review.productName}</dd>
              <dt style={dtStyle}>작성자</dt>
              <dd style={ddStyle}>{review.author}</dd>
              <dt style={dtStyle}>별점</dt>
              <dd style={ddStyle}>
                <span
                  style={starStyle}
                  role="img"
                  aria-label={`5점 만점에 ${String(review.rating)}점`}
                >
                  {starText(review.rating)}
                </span>
              </dd>
              <dt style={dtStyle}>작성일</dt>
              <dd style={ddStyle}>{review.createdAt}</dd>
            </dl>

            {review.reported && (
              <Alert tone="warning">
                <span>
                  신고 접수됨 — {review.reportReason === '' ? '사유 미기재' : review.reportReason}
                </span>
              </Alert>
            )}

            <div style={fieldStyle}>
              <span style={fieldLabelStyle}>노출 상태</span>
              <ToggleSwitch
                checked={visible}
                onChange={setVisible}
                disabled={saving}
                label="리뷰 노출 여부"
                onLabel="노출"
                offLabel="숨김"
              />
            </div>

            <TextareaField
              label="관리자 답변"
              value={reply}
              onChange={setReply}
              maxLength={REVIEW_REPLY_MAX}
              disabled={saving}
              placeholder="고객에게 보일 판매자 답변을 입력하세요. 비우면 답변이 노출되지 않습니다."
              rows={5}
            />

            <div style={actionsStyle}>
              <Button
                variant="danger"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmingDelete(true);
                }}
              >
                리뷰 삭제
              </Button>
              <span style={rightActionsStyle}>
                <Button variant="secondary" disabled={saving} onClick={() => navigate(LIST_PATH)}>
                  목록으로
                </Button>
                <Button variant="primary" size="md" disabled={saving || !dirty} onClick={onSave}>
                  {saving ? '저장 중…' : '저장'}
                </Button>
              </span>
            </div>
          </Card>

          <Card>
            <CardTitle>
              고객 화면 미리보기
              {review.reported && <StatusBadge tone="danger" label="신고" />}
            </CardTitle>
            <ReviewPreview
              author={review.author}
              rating={review.rating}
              createdAt={review.createdAt}
              content={review.content}
              imageUrls={review.imageUrls}
              reply={reply}
              visible={visible}
            />
          </Card>
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          intent="delete"
          title="리뷰 삭제"
          message={`${review?.productName ?? ''} 리뷰를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="리뷰 삭제"
          busy={remove.isPending}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}

      {unsavedDialog}
    </div>
  );
}
