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
  ChevronLeftIcon,
  fieldLabelStyle,
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

const LIST_PATH = '/support/tickets';
const NO_TEMPLATE = '';
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

  const onSave = () => {
    if (ticket === undefined || id === undefined) return;
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
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>문의 처리</h1>
      </div>

      {ticket === undefined ? (
        <Card>
          <p style={{ ...fieldLabelStyle, color: 'var(--tds-color-text-muted)' }}>불러오는 중…</p>
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
          onSave={onSave}
          onBack={() => navigate(LIST_PATH)}
        />
      )}

      {unsavedDialog}
    </div>
  );
}
