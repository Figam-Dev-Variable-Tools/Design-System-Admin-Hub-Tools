// 티켓 처리 작업 영역
//
// 상세 화면의 로딩 완료 상태 본문(정보·SLA·담당·상태·답변/메모·템플릿 삽입 + 타임라인)을 담는다.
// 상태·핸들러는 부모(TicketDetailPage)가 쥐고, 여기는 표시와 입력만 한다(부모 복잡도를 낮춘다).
import type { CSSProperties } from 'react';

import { formatDateTime } from '../../../../shared/format';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  controlStyle,
  ddStyle,
  dlStyle,
  dtStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  SelectField,
  StatusBadge,
  TextareaField,
} from '../../../../shared/ui';
import { TicketTimeline } from './TicketTimeline';
import {
  slaRemainingLabel,
  slaStateLabel,
  slaTone,
  TICKET_REPLY_MAX,
  ticketChannelLabel,
  ticketPriorityLabel,
  ticketPriorityTone,
  ticketSlaState,
  ticketStatusLabel,
} from '../../_shared/domain';
import type { ReplyTemplate, Ticket, TicketEventKind, TicketStatus } from '../../_shared/domain';
import { cssVar } from '@tds/ui';

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 12), 1fr))',
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: cssVar('space.4'),
};

const composerHeadStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const NO_TEMPLATE = '';

interface TicketWorkspaceProps {
  readonly ticket: Ticket;
  readonly serverError: string | null;
  readonly assignee: string;
  readonly onAssigneeChange: (value: string) => void;
  readonly status: TicketStatus;
  readonly onStatusChange: (value: string) => void;
  readonly statusOptions: readonly TicketStatus[];
  readonly assigneeRequiredError: string | null;
  readonly composerKind: TicketEventKind;
  readonly onComposerKindChange: (kind: TicketEventKind) => void;
  readonly composer: string;
  readonly onComposerChange: (value: string) => void;
  readonly templateId: string;
  readonly templates: readonly ReplyTemplate[];
  readonly onSelectTemplate: (id: string) => void;
  readonly saving: boolean;
  readonly dirty: boolean;
  readonly onSave: () => void;
  readonly onBack: () => void;
}

export function TicketWorkspace({
  ticket,
  serverError,
  assignee,
  onAssigneeChange,
  status,
  onStatusChange,
  statusOptions,
  assigneeRequiredError,
  composerKind,
  onComposerKindChange,
  composer,
  onComposerChange,
  templateId,
  templates,
  onSelectTemplate,
  saving,
  dirty,
  onSave,
  onBack,
}: TicketWorkspaceProps) {
  const sla = ticketSlaState(ticket);
  const showTemplatePicker = composerKind === 'reply' && templates.length > 0;

  return (
    <div style={layoutStyle}>
      <Card>
        <CardTitle>
          {ticket.title}
          <StatusBadge
            tone={ticketPriorityTone(ticket.priority)}
            label={ticketPriorityLabel(ticket.priority)}
          />
        </CardTitle>

        {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

        <div style={badgeRowStyle}>
          <StatusBadge tone="neutral" label={ticket.categoryLabel} />
          <StatusBadge tone="info" label={ticketChannelLabel(ticket.channel)} />
          <StatusBadge
            tone={slaTone(sla)}
            label={`${slaStateLabel(sla)} · ${slaRemainingLabel(ticket)}`}
          />
        </div>

        <dl style={dlStyle}>
          <dt style={dtStyle}>문의번호</dt>
          <dd style={ddStyle}>{ticket.ticketNo}</dd>
          <dt style={dtStyle}>고객</dt>
          <dd style={ddStyle}>{ticket.customerName}</dd>
          <dt style={dtStyle}>연락처</dt>
          <dd style={ddStyle}>{ticket.contact}</dd>
          <dt style={dtStyle}>접수일시</dt>
          <dd style={ddStyle}>{formatDateTime(ticket.receivedAt)}</dd>
          <dt style={dtStyle}>문의내용</dt>
          <dd style={ddStyle}>{ticket.body}</dd>
        </dl>

        <div style={rowStyle}>
          <FormField
            htmlFor="ticket-assignee"
            label="담당 배정"
            error={assigneeRequiredError ?? undefined}
          >
            <input
              id="ticket-assignee"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(assigneeRequiredError !== null)}
              value={assignee}
              placeholder="담당자 이름"
              disabled={saving}
              aria-invalid={assigneeRequiredError !== null}
              aria-describedby={
                assigneeRequiredError !== null ? errorIdOf('ticket-assignee') : undefined
              }
              onChange={(event) => onAssigneeChange(event.target.value)}
            />
          </FormField>
          <FormField htmlFor="ticket-status" label="처리 상태">
            <SelectField
              id="ticket-status"
              value={status}
              disabled={saving}
              onChange={(event) => onStatusChange(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {ticketStatusLabel(option)}
                </option>
              ))}
            </SelectField>
          </FormField>
        </div>

        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>답변 · 메모 작성</span>
          <div style={composerHeadStyle}>
            <Button
              type="button"
              variant={composerKind === 'reply' ? 'primary' : 'secondary'}
              disabled={saving}
              onClick={() => onComposerKindChange('reply')}
            >
              고객답변
            </Button>
            <Button
              type="button"
              variant={composerKind === 'note' ? 'primary' : 'secondary'}
              disabled={saving}
              onClick={() => onComposerKindChange('note')}
            >
              내부메모
            </Button>
          </div>

          {showTemplatePicker && (
            <FormField htmlFor="ticket-template" label="답변 템플릿 삽입">
              <SelectField
                id="ticket-template"
                value={templateId}
                disabled={saving}
                onChange={(event) => onSelectTemplate(event.target.value)}
              >
                <option value={NO_TEMPLATE}>템플릿 선택…</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {`[${template.categoryLabel}] ${template.title}`}
                  </option>
                ))}
              </SelectField>
            </FormField>
          )}

          <TextareaField
            label={composerKind === 'reply' ? '고객답변 내용' : '내부메모 내용'}
            value={composer}
            onChange={onComposerChange}
            maxLength={TICKET_REPLY_MAX}
            disabled={saving}
            placeholder={
              composerKind === 'reply'
                ? '고객에게 전달할 답변을 입력하세요. 템플릿을 골라 채운 뒤 수정할 수 있습니다.'
                : '내부 공유용 처리 메모를 입력하세요.'
            }
            rows={4}
          />
        </div>

        <div style={actionsStyle}>
          <Button variant="secondary" disabled={saving} onClick={onBack}>
            목록으로
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={saving || !dirty || assigneeRequiredError !== null}
            onClick={onSave}
          >
            {saving ? '저장 중…' : '처리 저장'}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>처리 이력</CardTitle>
        <TicketTimeline events={ticket.timeline} />
      </Card>
    </div>
  );
}
