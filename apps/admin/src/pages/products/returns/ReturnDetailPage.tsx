// ReturnDetailPage — 교환/반품 상세·처리 (라우트: /products/returns/:id) · A41 소유
//
// 요청 정보(주문·상품·사유·환불금액) + 처리 상태 스텝퍼 + 상태 전이 선택 + 처리 메모 저장.
// 저장은 프레임워크 저수준 훅(useCrudUpdate). 삭제는 없다(감사 성격 — 상태만 진행한다).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  ddStyle,
  dlStyle,
  dtStyle,
  fieldLabelStyle,
  FormField,
  pageTitleStyle,
  SelectField,
  StatusBadge,
  TextareaField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { useCrudUpdate } from '../../../shared/crud';
import { returnAdapter } from './data-source';
import { ReturnStatusStepper } from './components/ReturnStatusStepper';
import {
  isReturnStatus,
  kindLabel,
  kindTone,
  RETURN_NOTE_MAX,
  statusMeta,
  STATUS_FILTER_OPTIONS,
  toReturnInput,
} from './types';
import type { ReturnStatus } from './types';

const RESOURCE = 'returns';
const LIST_PATH = '/products/returns';
const UNSAVED_MESSAGE =
  '처리 내용에 저장하지 않은 변경이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const STATUS_OPTIONS = STATUS_FILTER_OPTIONS.filter((option) => option.id !== 'all');

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
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

const stepperWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => returnAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const request = detailQuery.data;

  const update = useCrudUpdate(RESOURCE, returnAdapter);
  const saving = update.isPending;

  const [status, setStatus] = useState<ReturnStatus>('requested');
  const [note, setNote] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (request === undefined) return;
    setStatus(request.status);
    setNote(request.adminNote);
  }, [request]);

  const dirty = request !== undefined && (status !== request.status || note !== request.adminNote);
  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE });

  const onSave = () => {
    if (request === undefined || id === undefined) return;
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      {
        id,
        input: { ...toReturnInput(request), status, adminNote: note.trim() },
        signal: controller.signal,
      },
      {
        onSuccess: () => {
          toast.success('처리 내용을 저장했습니다.');
          void detailQuery.refetch();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  if (detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>요청을 불러오지 못했습니다. </span>
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
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>교환/반품 처리</h1>
      </div>

      {request === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: 'var(--tds-color-text-muted)' }}>불러오는 중…</p>
        </Card>
      ) : (
        <Card>
          <CardTitle>
            요청 정보
            <StatusBadge tone={kindTone(request.kind)} label={kindLabel(request.kind)} />
          </CardTitle>

          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <div style={stepperWrapStyle}>
            <span style={fieldLabelStyle}>처리 진행</span>
            {status === 'rejected' ? (
              <StatusBadge tone={statusMeta('rejected').tone} label="반려 — 처리 종료" />
            ) : (
              <ReturnStatusStepper status={status} />
            )}
          </div>

          <dl style={dlStyle}>
            <dt style={dtStyle}>접수번호</dt>
            <dd style={ddStyle}>{request.orderNo}</dd>
            <dt style={dtStyle}>상품</dt>
            <dd style={ddStyle}>{request.productName}</dd>
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
              disabled={saving}
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
            disabled={saving}
            placeholder="수거·검수·환불 등 처리 내역을 기록하세요."
            rows={4}
          />

          <div style={actionsStyle}>
            <Button variant="secondary" disabled={saving} onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
            <Button variant="primary" size="md" disabled={saving || !dirty} onClick={onSave}>
              {saving ? '저장 중…' : '처리 저장'}
            </Button>
          </div>
        </Card>
      )}

      {unsavedDialog}
    </div>
  );
}
