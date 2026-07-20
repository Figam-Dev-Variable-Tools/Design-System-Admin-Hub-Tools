// ReturnDetailPage — 교환/반품 상세·처리 (라우트: /products/returns/:id)
//
// 요청 정보(주문·상품·옵션·사유·환불금액) + 처리 상태 스텝퍼 + 상태 전이 선택 + 교환 옵션(재발송) 선택 +
// 재고 이동 이력 + 처리 메모 저장. 저장은 프레임워크 저수준 훅(useCrudUpdate). 삭제는 없다(감사 성격).
//
// [재고] 옵션·재고의 정본은 상품이다 — 이 화면은 상품을 조회해 선택지를 그리고, 실제 증감은 어댑터가
// 요청 갱신과 한 덩이로 처리한다(./data-source). 재고 부족은 422 로 되돌아와 필드 인라인 오류가 된다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { cssVar, Stepper } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import {
  isHttpError,
  isNotFound,
  isUnprocessable,
  referenceOf,
} from '../../../shared/errors/http-error';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
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
  FormField,
  hintStyle,
  Icon,
  pageTitleStyle,
  SelectField,
  StatusBadge,
  TextareaField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { useCrudUpdate } from '../../../shared/crud';
import { fetchReturnProduct, returnAdapter } from './data-source';
import { ExchangeOptionField } from './components/ExchangeOptionField';
import { StockMovementTable } from './components/StockMovementTable';
import {
  isReturnStatus,
  isStockApplied,
  kindLabel,
  kindTone,
  movesStock,
  optionLabel,
  RETURN_FLOW,
  RETURN_NOTE_MAX,
  statusLabel,
  statusMeta,
  STATUS_FILTER_OPTIONS,
  stockIssueMessage,
  toReturnInput,
  validateStockPlan,
} from './types';
import type { ReturnStatus } from './types';

const RESOURCE = 'returns';
const LIST_PATH = '/products/returns';
const UNSAVED_MESSAGE =
  '처리 내용에 저장하지 않은 변경이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const STATUS_OPTIONS = STATUS_FILTER_OPTIONS.filter((option) => option.id !== 'all');

// DS Stepper 는 도메인을 모른다 — 흐름(정본은 RETURN_FLOW)을 라벨과 짝지어 넘긴다.
// 반려는 흐름 밖 종료라 여기 없다: 호출부가 StatusBadge 로 따로 알린다.
const RETURN_STEPS = RETURN_FLOW.map((status) => ({ id: status, label: statusLabel(status) }));

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

const stepperWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => returnAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const request = detailQuery.data;

  // 옵션·재고의 정본은 상품이다 — 요청이 로드된 뒤에만 조회한다.
  const productQuery = useQuery({
    queryKey: [RESOURCE, 'product', request?.productId ?? ''],
    queryFn: ({ signal }) => fetchReturnProduct(request?.productId ?? '', signal),
    enabled: request !== undefined,
  });
  const product = productQuery.data;

  const update = useCrudUpdate(RESOURCE, returnAdapter);
  const saving = update.isPending;

  const [status, setStatus] = useState<ReturnStatus>('requested');
  const [note, setNote] = useState('');
  const [exchangeValues, setExchangeValues] = useState<readonly string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errorReference, setErrorReference] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (request === undefined) return;
    setStatus(request.status);
    setNote(request.adminNote);
    setExchangeValues(request.exchangeOptionValues);
  }, [request]);

  const applied = request !== undefined && isStockApplied(request);
  const isExchange = request?.kind === 'exchange';
  // 재고가 이미 반영된 요청은 교환 옵션을 다시 고를 수 없다 — 이동은 한 번뿐이다(중복 반영 방지).
  const optionLocked = applied || !canUpdate;

  const dirty =
    request !== undefined &&
    (status !== request.status ||
      note !== request.adminNote ||
      optionLabel(exchangeValues) !== optionLabel(request.exchangeOptionValues));
  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE });

  // 완료로 넘길 때만 재고 유효성이 걸린다 — 진행·반려는 재고를 건드리지 않는다(도메인 규칙 재사용).
  const pendingIssue = useMemo(() => {
    if (request === undefined || product === undefined) return null;
    if (!movesStock(status) || applied) return null;
    return validateStockPlan(
      { ...request, exchangeOptionValues: exchangeValues },
      product.variants,
    );
  }, [request, product, status, exchangeValues, applied]);

  const blockedMessage = pendingIssue === null ? null : stockIssueMessage(pendingIssue);
  const exchangeFieldError =
    stockError ??
    (pendingIssue !== null && pendingIssue !== 'unknown-origin' ? blockedMessage : null);

  /* [EXC-11] 이 저장이 **재고를 실제로 움직이는가**.
     movesStock(status) 이면서 아직 반영 전이면, 저장 순간 재고가 이동하고 stockAppliedAt 이
     못박혀 **되돌릴 수 없다**(applied 이후 optionLocked 로 옵션도 잠긴다 — :148-149).
     지금까지는 그 되돌릴 수 없는 이동이 '처리 저장' 클릭 한 번으로 곧장 커밋됐다.
     StockMovementTable 은 무엇이 움직일지 **예고**할 뿐 게이트가 아니었다. */
  const willMoveStock = movesStock(status) && !applied;
  const [confirmStock, setConfirmStock] = useState(false);

  const onSave = () => {
    if (request === undefined || id === undefined || pendingIssue !== null) return;
    setConfirmStock(false);
    setServerError(null);
    setErrorReference(null);
    setStockError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      {
        id,
        input: {
          ...toReturnInput(request),
          status,
          adminNote: note.trim(),
          exchangeOptionValues: [...exchangeValues],
        },
        signal: controller.signal,
      },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success(
            movesStock(status) && !applied
              ? '처리 내용을 저장하고 재고를 반영했습니다.'
              : '처리 내용을 저장했습니다.',
          );
          void detailQuery.refetch();
          // 재고가 움직였으면 상품 쪽 조회도 낡았다 — 선택지의 재고 수치를 즉시 되맞춘다.
          void productQuery.refetch();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 422 는 어느 입력이 틀렸는지 아는 실패다 — 폼 배너가 아니라 그 필드로 되돌린다 (EXC-07).
          if (isUnprocessable(cause) && isHttpError(cause)) {
            setStockError(cause.violations[0]?.message ?? cause.message);
            return;
          }
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          setErrorReference(referenceOf(cause));
        },
      },
    );
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 요청에 '다시 시도'는 영원히 실패한다.
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '요청을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '요청을 불러오지 못했습니다.'}
            </span>
            {!notFound && (
              <Button variant="secondary" onClick={() => void detailQuery.refetch()}>
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
        <h1 style={pageTitleStyle}>교환/반품 처리</h1>
      </div>

      {request === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: cssVar('color.text.muted') }}>불러오는 중…</p>
        </Card>
      ) : (
        <>
          <Card>
            <CardTitle>
              요청 정보
              <StatusBadge tone={kindTone(request.kind)} label={kindLabel(request.kind)} />
            </CardTitle>

            {serverError !== null && (
              <Alert tone="danger">
                <div style={alertActionRowStyle}>
                  <span>{serverError}</span>
                  {errorReference !== null && (
                    <span style={hintStyle}>오류 코드 {errorReference}</span>
                  )}
                </div>
              </Alert>
            )}

            <div style={stepperWrapStyle}>
              <span style={fieldLabelStyle}>처리 진행</span>
              {status === 'rejected' ? (
                <StatusBadge tone={statusMeta('rejected').tone} label="반려 — 처리 종료" />
              ) : (
                <Stepper steps={RETURN_STEPS} current={status} ariaLabel="처리 진행 단계" />
              )}
            </div>

            <dl style={dlStyle}>
              <dt style={dtStyle}>접수번호</dt>
              <dd style={ddStyle}>{request.orderNo}</dd>
              <dt style={dtStyle}>상품</dt>
              <dd style={ddStyle}>{request.productName}</dd>
              <dt style={dtStyle}>주문 옵션</dt>
              <dd style={ddStyle}>{optionLabel(request.optionValues)}</dd>
              <dt style={dtStyle}>신청자</dt>
              <dd style={ddStyle}>{request.customer}</dd>
              <dt style={dtStyle}>수량</dt>
              <dd style={ddStyle}>{formatNumber(request.quantity)}개</dd>
              <dt style={dtStyle}>사유</dt>
              <dd style={ddStyle}>{request.reason}</dd>
              <dt style={dtStyle}>상세 사유</dt>
              <dd style={ddStyle}>{request.reasonDetail}</dd>
              {request.kind === 'return' && (
                <>
                  <dt style={dtStyle}>환불 예정액</dt>
                  <dd style={ddStyle}>{formatNumber(request.refundAmount)}원</dd>
                </>
              )}
              <dt style={dtStyle}>접수일</dt>
              <dd style={ddStyle}>{request.requestedAt}</dd>
            </dl>

            <FormField htmlFor="return-status" label="처리 상태">
              <SelectField
                id="return-status"
                value={status}
                disabled={saving || !canUpdate}
                onChange={(event) => {
                  if (isReturnStatus(event.target.value)) setStatus(event.target.value);
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <TextareaField
              label="처리 메모"
              value={note}
              onChange={setNote}
              maxLength={RETURN_NOTE_MAX}
              disabled={saving || !canUpdate}
              placeholder="수거·검수·환불 등 처리 내역을 기록하세요."
              rows={4}
            />

            {!canUpdate && (
              <Alert tone="info">이 요청을 처리할 권한이 없습니다. 조회만 가능합니다.</Alert>
            )}

            <div style={actionsStyle}>
              <Button variant="secondary" disabled={saving} onClick={() => navigate(LIST_PATH)}>
                목록으로
              </Button>
              {canUpdate && (
                <Button
                  variant="primary"
                  size="md"
                  loading={saving}
                  disabled={saving || !dirty || pendingIssue !== null}
                  onClick={() => {
                    // 재고를 움직이지 않는 저장(진행·반려·메모 수정)은 확인을 묻지 않는다 —
                    // 되돌릴 수 있는 일에까지 확인을 붙이면 정작 중요한 확인이 무시된다.
                    if (willMoveStock) setConfirmStock(true);
                    else onSave();
                  }}
                >
                  처리 저장
                </Button>
              )}
            </div>
          </Card>

          {isExchange && (
            <Card>
              <CardTitle>
                교환 재발송 · 재고
                {applied && <StatusBadge tone="success" label="재고 반영 완료" />}
              </CardTitle>

              {productQuery.error !== null ? (
                <Alert tone="danger">
                  <div style={alertActionRowStyle}>
                    <span>
                      {isNotFound(productQuery.error)
                        ? '연결된 상품을 찾을 수 없어 교환 옵션을 불러오지 못했습니다.'
                        : '상품 옵션을 불러오지 못했습니다.'}
                    </span>
                    {!isNotFound(productQuery.error) && (
                      <Button variant="secondary" onClick={() => void productQuery.refetch()}>
                        다시 시도
                      </Button>
                    )}
                  </div>
                </Alert>
              ) : product === undefined ? (
                <p style={hintStyle}>옵션·재고를 불러오는 중…</p>
              ) : applied ? (
                <p style={hintStyle}>
                  {`재고가 이미 반영되어 교환 옵션을 바꿀 수 없습니다. 재발송 옵션: ${optionLabel(request.exchangeOptionValues)}`}
                </p>
              ) : (
                <ExchangeOptionField
                  variants={product.variants}
                  originValues={request.optionValues}
                  value={exchangeValues}
                  quantity={request.quantity}
                  disabled={saving || optionLocked}
                  error={exchangeFieldError ?? undefined}
                  onChange={setExchangeValues}
                />
              )}

              {pendingIssue === 'unknown-origin' && blockedMessage !== null && (
                <Alert tone="danger">{blockedMessage}</Alert>
              )}
            </Card>
          )}

          <Card>
            <CardTitle>재고 이동 이력</CardTitle>
            <StockMovementTable movements={request.stockMovements} />
          </Card>
        </>
      )}

      {/* 되돌릴 수 없는 재고 이동의 확인 창구. intent='update' 인 이유: 이것은 삭제가 아니라
          '확정' 이다. 문구가 무엇이 얼마나 움직이는지와 되돌릴 수 없다는 사실을 함께 밝힌다.
          실패해도 다이얼로그는 닫히지 않는다(error 배너 + 재클릭이 곧 재시도 — ConfirmDialog 계약). */}
      {confirmStock && request !== undefined && (
        <ConfirmDialog
          intent="update"
          title={isExchange ? '교환 재고 반영' : '반품 재고 반영'}
          message={`'${request.productName}' ${formatNumber(request.quantity)}개의 재고가 이동합니다. 재고 반영은 되돌릴 수 없으며, 반영 후에는 교환 옵션을 바꿀 수 없습니다.`}
          confirmLabel="재고 반영"
          busy={saving}
          {...(serverError !== null && { error: serverError })}
          onConfirm={onSave}
          onCancel={() => {
            controllerRef.current?.abort();
            setConfirmStock(false);
          }}
        />
      )}

      {unsavedDialog}
    </div>
  );
}
