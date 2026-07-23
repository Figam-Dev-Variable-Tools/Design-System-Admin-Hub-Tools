// ReviewDetailPage — 리뷰 상세 (라우트: /products/reviews/:id)
//
// 왼쪽: 리뷰 메타(상품·작성자·별점·신고사유) + 노출/숨김 토글 + 관리자 답변 편집.
// 오른쪽: 고객 화면 렌더 미리보기. 저장은 프레임워크 저수준 훅(useCrudUpdate), 삭제는 useCrudDelete.
//
// [권한] 이 화면은 오랫동안 **쓰기 권한을 한 번도 묻지 않았다** — 조회 권한만 가진 사람이
// 노출/숨김을 뒤집고, 고객에게 그대로 나가는 답변을 쓰고, 리뷰를 지울 수 있었다. 이제
//   · 저장(노출 토글 + 답변) → update    · 리뷰 삭제 → remove
// 를 각각 읽고, **버튼을 없앤 술어와 저장을 거절하는 술어를 같게** 둔다(onSave/onConfirmDelete).
//
// [검증] 저장 규칙의 정본은 ./validation.ts 의 zod 스키마다. 예전에는 `<textarea maxLength>` 가
// 유일한 방어였는데 그것은 타이핑을 막는 편의일 뿐 저장을 막는 규칙이 아니다.
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
import {
  useRouteWritePermissions,
  WRITE_DENIED,
} from '../../../shared/permissions/RequirePermission';
import { reviewAdapter } from './data-source';
import { ReviewPreview } from './components/ReviewPreview';
import { REVIEW_REPLY_MAX, starText, toReviewInput } from './types';
import { reviewReplyError } from './validation';
import { cssVar } from '@tds/ui';

const RESOURCE = 'reviews';
const LIST_PATH = '/products/reviews';
const UNSAVED_MESSAGE =
  '리뷰에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

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
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
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

  const { canUpdate, canRemove } = useRouteWritePermissions();

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
    // 저장 버튼을 없앤 술어와 같은 술어다 — 감추기만 하고 저장 경로가 열려 있으면 막은 것이 아니다
    if (!canUpdate) {
      setServerError(WRITE_DENIED.update);
      return;
    }
    // 규칙의 정본은 스키마다 — 화면이 조건문으로 다시 판단하지 않는다
    const invalid = reviewReplyError(reply, visible);
    if (invalid !== null) {
      setServerError(invalid);
      return;
    }
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
          toast.success('리뷰를 저장했어요.');
          void detailQuery.refetch();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
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
    if (!canRemove) {
      setDeleteError(WRITE_DENIED.remove);
      return;
    }
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);
    remove.mutate(
      { id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('리뷰를 삭제했어요.');
          navigate(LIST_PATH, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  if (detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>리뷰를 불러오지 못했어요. </span>
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

            {/* 수정 권한이 없으면 편집 컨트롤 자체가 없다 — 그때는 지금 상태를 사실로만 보여 준다.
                토글·textarea 를 disabled 로 남기면 '고칠 수 있는데 잠깐 막힌 것' 처럼 읽힌다. */}
            {canUpdate ? (
              <>
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
                  placeholder="고객에게 보일 판매자 답변을 입력하세요. 비우면 답변이 노출되지 않아요."
                  rows={5}
                />
              </>
            ) : (
              <Alert tone="info">이 리뷰를 처리할 권한이 없어요. 조회만 가능해요.</Alert>
            )}

            <div style={actionsStyle}>
              {canRemove && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteError(null);
                    setConfirmingDelete(true);
                  }}
                >
                  리뷰 삭제
                </Button>
              )}
              <span style={rightActionsStyle}>
                <Button variant="secondary" disabled={saving} onClick={() => navigate(LIST_PATH)}>
                  목록으로
                </Button>
                {canUpdate && (
                  <Button variant="primary" size="md" disabled={saving || !dirty} onClick={onSave}>
                    {saving ? '저장 중…' : '저장'}
                  </Button>
                )}
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
          message={`${review?.productName ?? ''} 리뷰를 삭제할까요? 되돌릴 수 없어요.`}
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
