// TicketDetailPage — 1:1 문의 처리 (라우트: /support/tickets/:id)
//
// 상태·저장 배선만 쥐고, 표시 본문은 TicketWorkspace, 순수 규칙은 process.ts 에 위임한다.
// SLA 배지·상태 전이 차단·답변 템플릿 삽입은 각각 domain/process/workspace 로 나눠 복잡도를 낮췄다.
// 저장은 프레임워크 저수준 훅(useCrudUpdate). 삭제는 없다(문의는 고객이 만든다).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  fieldLabelStyle,
  Icon,
  pageTitleStyle,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { useCrudUpdate } from '../../../shared/crud';
import { ticketAdapter, TICKET_RESOURCE } from './data-source';
import { listTemplates } from '../_shared/store';
import { TicketWorkspace } from './components/TicketWorkspace';
import { assigneeError, buildTimeline, isProcessDirty } from './process';
import type { ProcessDraft } from './process';
import {
  allowedNextStatuses,
  applyTemplate,
  canSetStatus,
  isTicketStatus,
  templatesForCategory,
  toTicketInput,
} from '../_shared/domain';
import type { TicketEventKind, TicketStatus } from '../_shared/domain';
import { cssVar } from '@tds/ui';

const LIST_PATH = '/support/tickets';
const NO_TEMPLATE = '';
const UNSAVED_MESSAGE =
  '처리 내용에 저장하지 않은 변경이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const detailQuery = useQuery({
    queryKey: [TICKET_RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => ticketAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const ticket = detailQuery.data;

  const update = useCrudUpdate(TICKET_RESOURCE, ticketAdapter);
  const saving = update.isPending;

  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<TicketStatus>('received');
  const [composerKind, setComposerKind] = useState<TicketEventKind>('reply');
  const [composer, setComposer] = useState('');
  const [templateId, setTemplateId] = useState<string>(NO_TEMPLATE);
  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (ticket === undefined) return;
    setAssignee(ticket.assignee);
    setStatus(ticket.status);
  }, [ticket]);

  const templates = useMemo(
    () => (ticket === undefined ? [] : templatesForCategory(listTemplates(), ticket.categoryId)),
    [ticket],
  );
  const statusOptions = useMemo(
    () => (ticket === undefined ? [] : allowedNextStatuses(ticket.status)),
    [ticket],
  );

  const draft: ProcessDraft = { assignee, status, composer, composerKind };
  const dirty = ticket !== undefined && isProcessDirty(ticket, draft);
  const assigneeRequiredError = assigneeError(status, assignee);

  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: UNSAVED_MESSAGE });

  const onSelectTemplate = (nextId: string) => {
    setTemplateId(nextId);
    if (nextId === NO_TEMPLATE || ticket === undefined) return;
    const template = templates.find((item) => item.id === nextId);
    if (template === undefined) return;
    setComposerKind('reply');
    setComposer(
      applyTemplate(template.body, {
        customerName: ticket.customerName,
        ticketNo: ticket.ticketNo,
        assignee: assignee.trim(),
      }),
    );
  };

  /* [EXC-11] 종결은 **종착**이다 — STATUS_FLOW.closed 가 빈 배열이라(`_shared/domain.ts:253`)
     한 번 종결하면 어떤 상태로도 돌아올 수 없다. 그런데 '처리 저장'은 확인 없이 곧장 커밋했다.
     되돌릴 수 있는 저장(담당 배정·답변 등록·진행중 전환)까지 확인을 붙이면 확인이 무뎌지므로,
     **이미 종결된 것이 아니라 이번 저장이 종결로 넘기는 경우에만** 묻는다. */
  const willClose = ticket !== undefined && status === 'closed' && ticket.status !== 'closed';
  const [confirmClose, setConfirmClose] = useState(false);

  const onSave = () => {
    if (ticket === undefined || id === undefined) return;
    setConfirmClose(false);
    if (!canSetStatus(ticket.status, status, assignee)) {
      setServerError(assigneeRequiredError ?? '허용되지 않는 상태 전이입니다.');
      return;
    }
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    update.mutate(
      {
        id,
        input: {
          ...toTicketInput(ticket),
          assignee: assignee.trim(),
          status,
          timeline: buildTimeline(ticket, draft, new Date().toISOString()),
        },
        signal: controller.signal,
      },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setComposer('');
          setTemplateId(NO_TEMPLATE);
          toast.success('문의 처리 내용을 저장했습니다.');
          void detailQuery.refetch();
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const onStatusChange = (value: string) => {
    if (isTicketStatus(value)) setStatus(value);
  };

  if (detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>문의를 불러오지 못했습니다. </span>
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
        <h1 style={pageTitleStyle}>문의 처리</h1>
      </div>

      {ticket === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: cssVar('color.text.muted') }}>불러오는 중…</p>
        </Card>
      ) : (
        <TicketWorkspace
          ticket={ticket}
          serverError={serverError}
          assignee={assignee}
          onAssigneeChange={setAssignee}
          status={status}
          onStatusChange={onStatusChange}
          statusOptions={statusOptions}
          assigneeRequiredError={assigneeRequiredError}
          composerKind={composerKind}
          onComposerKindChange={setComposerKind}
          composer={composer}
          onComposerChange={setComposer}
          templateId={templateId}
          templates={templates}
          onSelectTemplate={onSelectTemplate}
          saving={saving}
          dirty={dirty}
          onSave={() => {
            if (willClose) setConfirmClose(true);
            else onSave();
          }}
          onBack={() => navigate(LIST_PATH)}
        />
      )}

      {/* 종결 확인 — 되돌릴 수 없다는 사실을 문구가 직접 말한다.
          실패해도 닫히지 않고 error 배너 + 재클릭이 재시도가 된다(ConfirmDialog 계약). */}
      {confirmClose && ticket !== undefined && (
        <ConfirmDialog
          intent="update"
          title="문의 종결"
          message={`'${ticket.ticketNo}' 문의를 종결합니다. 종결한 문의는 다시 열 수 없으며, 추가 문의는 새 문의로 접수해야 합니다.`}
          confirmLabel="종결"
          busy={saving}
          {...(serverError !== null && { error: serverError })}
          onConfirm={onSave}
          onCancel={() => {
            controllerRef.current?.abort();
            setConfirmClose(false);
          }}
        />
      )}

      {unsavedDialog}
    </div>
  );
}
