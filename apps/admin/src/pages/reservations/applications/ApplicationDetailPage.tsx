// ApplicationDetailPage — 신청서 상세·처리 (라우트: /reservations/applications/:id) · A41 소유
//
// 신청 내용(커스텀 폼 필드) + 처리 상태 전이(허용 전이만) + 처리 메모 + 처리 이력 타임라인.
// 저장은 프레임워크 저수준 훅(useCrudUpdate). 상태가 바뀌면 이력에 한 칸을 남긴다. 삭제는 없다(감사 성격).
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { formatDateTime } from '../../../shared/format';
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
  Timeline,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { useCrudUpdate } from '../../../shared/crud';
import { applicationAdapter } from './data-source';
import {
  APPLICATION_NOTE_MAX,
  applicationStatusLabel,
  applicationStatusTone,
  applicationTypeLabel,
  isApplicationStatus,
  isTerminalStatus,
  statusChoices,
  toApplicationInput,
  toTimelineEvents,
} from './types';
import type { Application, ApplicationEvent, ApplicationStatus } from './types';

const RESOURCE = 'reservation-applications';
const LIST_PATH = '/reservations/applications';
const PROCESSED_BY = '관리자';
const UNSAVED_MESSAGE =
  '처리 내용에 저장하지 않은 변경이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

/** 상태가 바뀌었으면 이력에 한 칸을 덧붙인다(변경 없으면 그대로) */
function appendHistory(
  application: Application,
  nextStatus: ApplicationStatus,
  note: string,
): readonly ApplicationEvent[] {
  if (nextStatus === application.status) return application.history;
  const event: ApplicationEvent = {
    id: `${application.id}-h${String(application.history.length + 1)}`,
    at: new Date().toISOString(),
    status: nextStatus,
    by: PROCESSED_BY,
    note: note.trim(),
  };
  return [...application.history, event];
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const detailQuery = useQuery({
    queryKey: [RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => applicationAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const application = detailQuery.data;

  const update = useCrudUpdate(RESOURCE, applicationAdapter);
  const saving = update.isPending;

  const [status, setStatus] = useState<ApplicationStatus>('received');
  const [note, setNote] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (application === undefined) return;
    setStatus(application.status);
    setNote(application.adminNote);
  }, [application]);

  const choices = useMemo(
    () => (application === undefined ? [] : statusChoices(application.status)),
    [application],
  );
  const dirty =
    application !== undefined && (status !== application.status || note !== application.adminNote);
  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE });

  const onSave = () => {
    if (application === undefined || id === undefined) return;
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      {
        id,
        input: {
          ...toApplicationInput(application),
          status,
          adminNote: note.trim(),
          history: appendHistory(application, status, note),
        },
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
          <span>신청서를 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  const terminal = application !== undefined && isTerminalStatus(application.status);

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
        <h1 style={pageTitleStyle}>신청서 처리</h1>
      </div>

      {application === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: 'var(--tds-color-text-muted)' }}>불러오는 중…</p>
        </Card>
      ) : (
        <>
          <Card>
            <CardTitle>
              {applicationTypeLabel(application.type)}
              <StatusBadge
                tone={applicationStatusTone(application.status)}
                label={applicationStatusLabel(application.status)}
              />
            </CardTitle>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            <dl style={dlStyle}>
              <dt style={dtStyle}>신청번호</dt>
              <dd style={ddStyle}>{application.code}</dd>
              <dt style={dtStyle}>신청자</dt>
              <dd style={ddStyle}>{application.applicantName}</dd>
              <dt style={dtStyle}>연락처</dt>
              <dd style={ddStyle}>{application.applicantContact}</dd>
              <dt style={dtStyle}>접수일시</dt>
              <dd style={ddStyle}>{formatDateTime(application.submittedAt)}</dd>
              {application.fields.map((field) => (
                <Fragment key={field.label}>
                  <dt style={dtStyle}>{field.label}</dt>
                  <dd style={ddStyle}>{field.value}</dd>
                </Fragment>
              ))}
            </dl>
          </Card>

          <Card>
            <CardTitle>처리</CardTitle>

            <FormField htmlFor="app-status" label="처리 상태">
              <SelectField
                id="app-status"
                value={status}
                disabled={saving || terminal}
                onChange={(event) => {
                  if (isApplicationStatus(event.target.value)) setStatus(event.target.value);
                }}
              >
                {choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {applicationStatusLabel(choice)}
                  </option>
                ))}
              </SelectField>
            </FormField>
            {terminal && (
              <Alert tone="info">
                {`'${applicationStatusLabel(application.status)}' 은 종료 상태라 더 이상 전이할 수 없습니다.`}
              </Alert>
            )}

            <TextareaField
              label="처리 메모"
              value={note}
              onChange={setNote}
              maxLength={APPLICATION_NOTE_MAX}
              disabled={saving}
              placeholder="검토·승인·반려 사유 등 처리 내역을 기록하세요."
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

          <Card>
            <CardTitle>처리 이력</CardTitle>
            <Timeline events={toTimelineEvents(application.history)} label="신청서 처리 이력" />
          </Card>
        </>
      )}

      {unsavedDialog}
    </div>
  );
}
