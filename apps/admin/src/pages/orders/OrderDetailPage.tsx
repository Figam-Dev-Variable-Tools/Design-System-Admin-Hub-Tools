// OrderDetailPage — 주문 상세·처리 (라우트: /orders/:id)
//
// 주문 요약(상태 + 전이 액션) · 주문자/수령인 · 주문 품목 · 결제 정보 · 처리 이력.
// 등록 폼이 없는 화면 유형 E(처리 워크플로)다 — 관리자가 여기서 만드는 것은 없고, 옮기고 남길 뿐이다.
//
// [버튼과 저장이 같은 술어를 읽는다] 어떤 단계로 갈 수 있는지는 도메인의 nextOrderStatuses 가
// 정하고, 그 목록이 곧 버튼 목록이다. 갈 수 없는 단계는 버튼이 아예 없고, 왜 없는지는 요약 줄이
// orderTransitionBlock 의 문장을 그대로 말한다 — '눌리는데 거부당하는 버튼' 을 만들지 않는다.
//
// [되돌릴 수 없는 것에만 확인을 묻는다] 상태 전이·입금 확인·취소는 되돌릴 수 없어 확인 창을 지난다.
// 처리 메모 저장은 되돌릴 수 있으므로 곧바로 저장한다 — 되돌릴 수 있는 일에까지 확인을 붙이면
// 정작 중요한 확인이 무시된다(ReturnDetailPage 와 같은 판단).
//
// [금액은 화면이 더하지 않는다] 상품금액·배송비·할인·쿠폰·적립금에서 최종 결제금액을 내는 것은
// 도메인의 orderAmounts 하나다. 여기서 한 번 더 더하면 목록과 상세가 다른 금액을 말하게 된다.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cssVar, Table, Timeline } from '@tds/ui';
import type { TimelineEvent } from '../../shared/ui';

import { isAbort } from '../../shared/async';
import { formatDateTime, formatNumber } from '../../shared/format';
import { isNotFound, referenceOf } from '../../shared/errors/http-error';
import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
import { useCrudItem, useCrudUpdate } from '../../shared/crud';
import { PAYMENT_METHOD_LABEL } from '../../shared/commerce/pg-catalog';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  hintStyle,
  Icon,
  Modal,
  pageTitleStyle,
  StatusBadge,
  TextareaField,
  useModalDirtyGuard,
  useToast,
  useUnsavedChangesDialog,
} from '../../shared/ui';
import {
  applyOrderCancel,
  applyOrderPaid,
  applyOrderStatus,
  lineAmount,
  linePoint,
  nextOrderStatuses,
  orderAmounts,
  orderCancelBlock,
  orderStatusLabel,
  orderTransitionBlock,
  ORDER_CANCEL_REASON_MAX,
  ORDER_NOTE_MAX,
  STOCK_DEDUCT_LABEL,
  toOrderInput,
} from '../../shared/domain/order';
import type { Order, OrderStatus } from '../../shared/domain/order';
import { ORDER_RESOURCE, orderAdapter } from './data-source';
import { readStockDeductAt } from './_shared/store';
import { isCanceled, orderEventTone, orderStatusTone, partialShipmentLabel } from './types';
import { orderCancelReasonError, orderNoteError } from './validation';

const LIST_PATH = '/orders';
const UNSAVED_MESSAGE =
  '처리 메모에 저장하지 않은 변경이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

/** 확인 창을 지나야 하는 되돌릴 수 없는 조작 — 취소는 사유를 받아야 해서 별도 모달이다 */
type PendingAction =
  { readonly kind: 'status'; readonly to: OrderStatus } | { readonly kind: 'paid' };

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

/**
 * 제목 줄 — 주문번호와 배지들이 한 줄에 선다.
 *
 * 배지 묶음 **안**에만 간격이 있어서, 번호와 첫 배지가 붙어 한 낱말처럼 읽혔다.
 * 그리고 글자와 배지는 높이가 달라 기준선에 맡기면 배지가 살짝 내려앉는다 —
 * 가운데로 맞춘다. 좁아지면 배지가 다음 줄로 흐르되 번호는 그대로 앞에 남는다.
 */
const titleRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const badgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const spreadActionsStyle: CSSProperties = {
  ...actionsStyle,
  justifyContent: 'space-between',
};

/** 최종 결제금액 줄 — 다른 값보다 굵게. 운영자가 가장 먼저 찾는 숫자다 */
const totalValueStyle: CSSProperties = {
  ...ddStyle,
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const LINE_COLUMNS = [
  { id: 'product', header: '상품' },
  { id: 'option', header: '옵션', nowrap: true },
  { id: 'sku', header: 'SKU', nowrap: true },
  { id: 'quantity', header: '수량', align: 'end' as const, nowrap: true },
  { id: 'shipped', header: '출고', align: 'end' as const, nowrap: true },
  { id: 'unitPrice', header: '단가', align: 'end' as const, nowrap: true },
  { id: 'amount', header: '금액', align: 'end' as const, nowrap: true },
] as const;

/** 처리 이력 → DS Timeline 이 아는 모양. 도메인 사건을 표시용으로 옮기는 자리는 여기 하나다 */
function toTimelineEvents(order: Order): readonly TimelineEvent[] {
  return order.history.map((event) => ({
    id: event.id,
    at: event.at,
    badgeTone: orderEventTone(event.kind),
    badgeLabel: event.label,
    author: event.actor,
    text: event.note,
  }));
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const detailQuery = useCrudItem(ORDER_RESOURCE, orderAdapter, id ?? '');
  const order = detailQuery.data;

  const update = useCrudUpdate(ORDER_RESOURCE, orderAdapter);
  const saving = update.isPending;

  const [note, setNote] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTouched, setCancelTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errorReference, setErrorReference] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (order === undefined) return;
    setNote(order.adminNote);
  }, [order]);

  const noteDirty = order !== undefined && note !== order.adminNote;
  const noteFieldError = orderNoteError(note);
  const unsavedDialog = useUnsavedChangesDialog(noteDirty && !saving, { message: UNSAVED_MESSAGE });

  /**
   * 취소 모달의 미저장 이탈 가드 — 다른 입력 모달 셋(useModalDirtyGuard)과 같은 관용구다.
   * 사유를 쓰다 딤·Esc·×·닫기로 나가면 반쯤 쓴 사유가 조용히 사라지므로 확인을 세운다.
   * dirty = 사유를 입력했고 저장 중이 아닐 때 — 저장 중에는 곧 성공해 닫히므로 가드가 필요 없다.
   */
  const closeCancel = useCallback(() => {
    controllerRef.current?.abort();
    setCancelOpen(false);
    setCancelReason('');
    setCancelTouched(false);
  }, []);
  const cancelGuard = useModalDirtyGuard(cancelReason.trim() !== '' && !saving, closeCancel);

  /**
   * 모든 쓰기가 지나는 한 통로 — 도메인 함수가 만든 **다음 주문**을 그대로 저장한다.
   * 화면이 필드를 직접 조립하지 않는 이유: 상태와 이력이 갈라지는 저장이 생기지 않게 하려는 것이다.
   */
  const save = (next: Order, message: string, onDone?: () => void) => {
    if (id === undefined) return;
    setServerError(null);
    setErrorReference(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      { id, input: toOrderInput(next), signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success(message);
          void detailQuery.refetch();
          onDone?.();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
          setErrorReference(referenceOf(cause));
        },
      },
    );
  };

  const runPending = () => {
    if (order === undefined || pending === null) return;
    const at = new Date().toISOString();
    try {
      if (pending.kind === 'paid') {
        save(applyOrderPaid(order, at, '운영자'), '입금을 확인했어요.', () => {
          setPending(null);
        });
        return;
      }
      const to = pending.to;
      save(
        applyOrderStatus(order, to, at, '운영자'),
        `${orderStatusLabel(to)}(으)로 처리했어요.`,
        () => {
          setPending(null);
        },
      );
    } catch (cause: unknown) {
      // 술어가 먼저 걸러 주므로 여기 오는 것은 화면과 규칙이 어긋났다는 뜻이다 — 사유를 그대로 보인다
      setServerError(cause instanceof Error ? cause.message : '상태를 바꿀 수 없어요.');
    }
  };

  const runCancel = () => {
    if (order === undefined) return;
    setCancelTouched(true);
    if (orderCancelReasonError(cancelReason) !== null) return;
    try {
      save(
        applyOrderCancel(order, cancelReason, new Date().toISOString(), '운영자'),
        '주문을 취소했어요.',
        () => {
          setCancelOpen(false);
          setCancelReason('');
          setCancelTouched(false);
        },
      );
    } catch (cause: unknown) {
      setServerError(cause instanceof Error ? cause.message : '주문을 취소할 수 없어요.');
    }
  };

  const saveNote = () => {
    if (order === undefined || noteFieldError !== null) return;
    save({ ...order, adminNote: note.trim() }, '처리 메모를 저장했어요.');
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 없는 주문에 '다시 시도'는 영원히 실패한다.
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '주문을 찾을 수 없어요. 주문번호를 다시 확인해 주세요.'
                : '주문을 불러오지 못했어요.'}
            </span>
            {!notFound && (
              <Button
                variant="secondary"
                onClick={() => {
                  void detailQuery.refetch();
                }}
              >
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (order === undefined) {
    return (
      <div style={pageStyle}>
        <Card>
          <p style={hintStyle}>주문을 불러오는 중…</p>
        </Card>
      </div>
    );
  }

  const amounts = orderAmounts(order);
  const canceled = isCanceled(order);
  const partial = partialShipmentLabel(order);
  const nextStatuses = nextOrderStatuses(order);
  const cancelBlocked = orderCancelBlock(order);
  const unpaid = order.payment.paidAt === '';
  // 다음 단계가 없을 때 **왜 없는지** — 술어가 만든 문장을 그대로 쓴다(화면이 지어내지 않는다)
  const stuckReason = nextStatuses.length === 0 ? orderTransitionBlock(order, 'confirmed') : null;

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
        <h1 style={pageTitleStyle}>주문 상세</h1>
      </div>

      <Card>
        <CardTitle>
          <span style={titleRowStyle}>
            <span>{order.id}</span>
            <span style={badgeRowStyle}>
              <StatusBadge
                tone={orderStatusTone(order.status)}
                label={orderStatusLabel(order.status)}
              />
              {canceled && <StatusBadge tone="danger" label="취소" />}
              {!canceled && partial !== null && <StatusBadge tone="warning" label={partial} />}
            </span>
          </span>
        </CardTitle>

        {serverError !== null && (
          <Alert tone="danger">
            <div style={alertActionRowStyle}>
              <span>{serverError}</span>
              {errorReference !== null && <span style={hintStyle}>오류 코드 {errorReference}</span>}
            </div>
          </Alert>
        )}

        {canceled && (
          <Alert tone="warning">
            {`${formatDateTime(order.canceledAt)}에 취소된 주문이에요. 사유: ${order.cancelReason}`}
          </Alert>
        )}

        <dl style={dlStyle}>
          <dt style={dtStyle}>주문일시</dt>
          <dd style={ddStyle}>{formatDateTime(order.orderedAt)}</dd>
          <dt style={dtStyle}>입금·결제</dt>
          <dd style={ddStyle}>{unpaid ? '미확인' : formatDateTime(order.payment.paidAt)}</dd>
          <dt style={dtStyle}>재고 차감</dt>
          {/* 차감 시점은 설정값이다 — 지금 규칙과 실제 결과를 나란히 보여야 '왜 아직 안 빠졌나' 에 답한다 */}
          <dd style={ddStyle}>
            {order.stockAppliedAt === ''
              ? `아직 차감되지 않았어요 (설정: ${STOCK_DEDUCT_LABEL[readStockDeductAt()]})`
              : `${formatDateTime(order.stockAppliedAt)} 차감 (설정: ${STOCK_DEDUCT_LABEL[readStockDeductAt()]})`}
          </dd>
          {order.stockRestoredAt !== '' && (
            <>
              <dt style={dtStyle}>재고 복원</dt>
              <dd style={ddStyle}>{`${formatDateTime(order.stockRestoredAt)} 복원`}</dd>
            </>
          )}
        </dl>

        {!canUpdate && <Alert tone="info">이 주문을 처리할 권한이 없어요. 조회만 가능해요.</Alert>}

        {canUpdate && (
          <div style={spreadActionsStyle}>
            <span style={actionsStyle}>
              {unpaid && !canceled && (
                <Button
                  variant="primary"
                  size="md"
                  disabled={saving}
                  onClick={() => setPending({ kind: 'paid' })}
                >
                  입금 확인
                </Button>
              )}
              {nextStatuses.map((target, index) => (
                <Button
                  key={target}
                  // 바로 다음 단계가 기본 동작이다 — 나머지는 건너뛰는 예외 경로라 보조 버튼이다
                  variant={index === 0 && !unpaid ? 'primary' : 'secondary'}
                  size="md"
                  disabled={saving}
                  onClick={() => setPending({ kind: 'status', to: target })}
                >
                  {`${orderStatusLabel(target)} 처리`}
                </Button>
              ))}
              {stuckReason !== null && <p style={hintStyle}>{stuckReason}</p>}
            </span>

            <span style={actionsStyle}>
              {cancelBlocked === null ? (
                <Button
                  variant="danger"
                  size="md"
                  disabled={saving}
                  onClick={() => setCancelOpen(true)}
                >
                  주문 취소
                </Button>
              ) : (
                // 취소할 수 없으면 비활성 버튼 대신 **이유**를 둔다 — 없는 버튼을 찾게 하지 않는다
                <p style={hintStyle}>{cancelBlocked}</p>
              )}
            </span>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>주문자 · 수령인</CardTitle>
        <dl style={dlStyle}>
          <dt style={dtStyle}>주문자</dt>
          <dd style={ddStyle}>{`${order.customer.name} · ${order.customer.phone}`}</dd>
          <dt style={dtStyle}>이메일</dt>
          <dd style={ddStyle}>{order.customer.email}</dd>
          <dt style={dtStyle}>회원 구분</dt>
          <dd style={ddStyle}>{order.customer.memberId === '' ? '비회원 주문' : '회원 주문'}</dd>
          <dt style={dtStyle}>수령인</dt>
          <dd style={ddStyle}>{`${order.receiver.name} · ${order.receiver.phone}`}</dd>
          <dt style={dtStyle}>배송지</dt>
          <dd style={ddStyle}>
            {`(${order.receiver.zipCode}) ${order.receiver.address} ${order.receiver.addressDetail}`.trim()}
          </dd>
          <dt style={dtStyle}>요청사항</dt>
          <dd style={ddStyle}>{order.receiver.request === '' ? '없음' : order.receiver.request}</dd>
        </dl>
      </Card>

      <Card>
        <CardTitle>주문 품목</CardTitle>
        {/* 값은 주문 시점의 스냅숏이다 — 상품을 고쳐도 이 표는 움직이지 않는다(도메인 머리말) */}
        <p style={hintStyle}>
          상품명·옵션·단가는 주문 시점에 복사된 값이에요. 상품을 수정해도 지난 주문의 금액은 바뀌지
          않아요.
        </p>
        <Table
          caption="주문 품목 — 주문 시점의 상품명·옵션·단가와 수량별 금액이에요."
          columns={LINE_COLUMNS}
          rows={order.lines.map((line) => ({
            id: line.id,
            cells: [
              line.productName,
              line.optionLabel,
              line.sku,
              `${formatNumber(line.quantity)}개`,
              `${formatNumber(line.shippedQuantity)}개`,
              `${formatNumber(line.unitPrice)}원`,
              `${formatNumber(lineAmount(line))}원`,
            ],
            // 아직 다 나가지 않은 줄에 색조를 얹는다 — 뜻은 '출고' 칸의 숫자가 전한다
            ...(line.shippedQuantity < line.quantity && { tone: 'warning' as const }),
          }))}
          empty="주문 품목이 없어요."
        />
        <p style={hintStyle}>
          {`적립 예정 ${formatNumber(order.lines.reduce((sum, line) => sum + linePoint(line), 0))}원 — 주문 시점의 적립률로 계산해요.`}
        </p>
      </Card>

      <Card>
        <CardTitle>결제 정보</CardTitle>
        <dl style={dlStyle}>
          <dt style={dtStyle}>결제수단</dt>
          <dd style={ddStyle}>{PAYMENT_METHOD_LABEL[order.payment.method]}</dd>
          <dt style={dtStyle}>상품금액</dt>
          <dd style={ddStyle}>{`${formatNumber(amounts.itemsTotal)}원`}</dd>
          <dt style={dtStyle}>배송비</dt>
          <dd style={ddStyle}>
            {amounts.shippingFee === 0 ? '무료' : `${formatNumber(amounts.shippingFee)}원`}
          </dd>
          <dt style={dtStyle}>할인</dt>
          <dd style={ddStyle}>{`-${formatNumber(amounts.discount)}원`}</dd>
          <dt style={dtStyle}>쿠폰 할인</dt>
          <dd style={ddStyle}>
            {order.payment.couponName === ''
              ? `-${formatNumber(amounts.couponDiscount)}원`
              : `-${formatNumber(amounts.couponDiscount)}원 (${order.payment.couponName})`}
          </dd>
          <dt style={dtStyle}>적립금 사용</dt>
          <dd style={ddStyle}>{`-${formatNumber(amounts.pointUsed)}원`}</dd>
          <dt style={dtStyle}>최종 결제금액</dt>
          <dd style={totalValueStyle}>{`${formatNumber(amounts.total)}원`}</dd>
        </dl>
      </Card>

      <Card>
        <CardTitle>처리 이력</CardTitle>
        <Timeline
          events={toTimelineEvents(order)}
          label="주문 처리 이력"
          emptyLabel="기록된 처리 이력이 없어요."
        />
      </Card>

      <Card>
        <CardTitle>처리 메모</CardTitle>
        <TextareaField
          label="처리 메모"
          value={note}
          onChange={setNote}
          maxLength={ORDER_NOTE_MAX}
          disabled={saving || !canUpdate}
          placeholder="배송 지연 사유, 고객 통화 내용 등 처리 내역을 기록하세요."
          rows={4}
          {...(noteFieldError !== null && { error: noteFieldError })}
        />
        {canUpdate && (
          <div style={actionsStyle}>
            <Button
              variant="primary"
              size="md"
              loading={saving}
              disabled={saving || !noteDirty || noteFieldError !== null}
              onClick={saveNote}
            >
              메모 저장
            </Button>
          </div>
        )}
      </Card>

      {/* 되돌릴 수 없는 진행의 확인 창구 — 무엇이 일어나는지와 되돌릴 수 없다는 사실을 함께 밝힌다.
          실패해도 다이얼로그는 닫히지 않는다(error 배너 + 재클릭이 곧 재시도 — ConfirmDialog 계약). */}
      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title={pending.kind === 'paid' ? '입금 확인' : `${orderStatusLabel(pending.to)} 처리`}
          message={
            pending.kind === 'paid'
              ? `입금을 확인 처리해요. 재고 차감 시점이 '${STOCK_DEDUCT_LABEL.payment}'이면 이 시점에 재고가 빠지며, 되돌릴 수 없어요.`
              : `주문 ${order.id}을(를) ${orderStatusLabel(pending.to)}(으)로 진행해요. 주문 상태는 되돌릴 수 없어요.`
          }
          confirmLabel={pending.kind === 'paid' ? '입금 확인' : '진행'}
          busy={saving}
          {...(serverError !== null && { error: serverError })}
          onConfirm={runPending}
          onCancel={() => {
            controllerRef.current?.abort();
            setPending(null);
          }}
        />
      )}

      {/* 취소는 사유를 받아야 해서 확인 다이얼로그가 아니라 모달이다 — 사유 없는 취소는
          '왜 취소됐나' 라는 질문에 답할 수 없는 기록이다(validation.ts 머리말). */}
      {cancelOpen && (
        <Modal
          title="주문 취소"
          icon={<Icon name="x-circle" />}
          onClose={cancelGuard.requestClose}
          footer={
            <>
              <Button
                variant="secondary"
                size="md"
                disabled={saving}
                onClick={cancelGuard.requestClose}
              >
                닫기
              </Button>
              <Button
                variant="danger"
                size="md"
                loading={saving}
                disabled={saving}
                onClick={runCancel}
              >
                주문 취소
              </Button>
            </>
          }
        >
          <p style={fieldLabelStyle}>
            {`주문 ${order.id}을(를) 취소해요. 취소는 되돌릴 수 없으며, 이미 차감된 재고는 자동으로 복원돼요.`}
          </p>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}
          <TextareaField
            label="취소 사유"
            value={cancelReason}
            onChange={setCancelReason}
            maxLength={ORDER_CANCEL_REASON_MAX}
            disabled={saving}
            placeholder="고객 요청, 재고 소진 등 취소 사유를 남겨 주세요."
            rows={3}
            {...(cancelTouched &&
              orderCancelReasonError(cancelReason) !== null && {
                error: orderCancelReasonError(cancelReason) ?? '',
              })}
          />
        </Modal>
      )}
      {cancelGuard.discardDialog}

      {unsavedDialog}
    </div>
  );
}
