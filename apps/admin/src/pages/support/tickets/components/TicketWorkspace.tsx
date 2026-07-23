// 티켓 처리 작업 영역
//
// 상세 화면의 로딩 완료 상태 본문(정보·SLA·담당·상태·답변/메모·템플릿 삽입 + 타임라인)을 담는다.
// 상태·핸들러는 부모(TicketDetailPage)가 쥐고, 여기는 표시와 입력만 한다(부모 복잡도를 낮춘다).
//
// [EXC-03] 처리 권한(update)이 없으면 편집 컨트롤이 통째로 사라지고 담당자·상태는 **값으로만** 남는다.
// 이 화면은 폼 껍데기를 쓰지 않는 상세라 껍데기의 403 을 못 받았고, 조회 권한만 가진 역할이 담당자를
// 바꾸고 고객답변을 남기고 문의를 **종결**(되돌릴 수 없다)까지 할 수 있었다.
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
  formRowStyle,
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
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 12), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
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
  /**
   * 처리 권한 (EXC-03) — 이 작업 영역의 쓰기는 전부 한 update 뮤테이션으로 나가므로 한 값이다.
   * false 면 담당·상태·답변 컨트롤과 '처리 저장' 이 사라진다(값은 조회 목록에 남는다).
   */
  readonly canUpdate: boolean;
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
  canUpdate,
}: TicketWorkspaceProps) {
  const sla = ticketSlaState(ticket);
  const showTemplatePicker = canUpdate && composerKind === 'reply' && templates.length > 0;

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
          {/* 처리 권한이 없으면 편집 컨트롤은 '부재' 다 — 그러나 담당자·상태는 **조회 사실**이라
              사라지지 않는다. 컨트롤을 통째로 지우면 그 사실까지 사라진다(RowToggle 과 같은 규칙). */}
          {!canUpdate && (
            <>
              <dt style={dtStyle}>담당자</dt>
              <dd style={ddStyle}>{ticket.assignee === '' ? '미배정' : ticket.assignee}</dd>
              <dt style={dtStyle}>처리 상태</dt>
              <dd style={ddStyle}>{ticketStatusLabel(ticket.status)}</dd>
            </>
          )}
        </dl>

        {canUpdate && (
          <div style={formRowStyle}>
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
        )}

        {canUpdate && (
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
                  ? '고객에게 전달할 답변을 입력하세요. 템플릿을 골라 채운 뒤 수정할 수 있어요.'
                  : '내부 공유용 처리 메모를 입력하세요.'
              }
              rows={4}
            />
          </div>
        )}

        <div style={actionsStyle}>
          <Button variant="secondary" disabled={saving} onClick={onBack}>
            목록으로
          </Button>
          {canUpdate && (
            <Button
              variant="primary"
              size="md"
              disabled={saving || !dirty || assigneeRequiredError !== null}
              onClick={onSave}
            >
              {saving ? '저장 중…' : '처리 저장'}
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>처리 이력</CardTitle>
        <TicketTimeline events={ticket.timeline} />
      </Card>
    </div>
  );
}
