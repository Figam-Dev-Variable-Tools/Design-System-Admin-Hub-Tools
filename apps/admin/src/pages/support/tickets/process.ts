// 티켓 처리 순수 규칙
//
// 상세 화면의 저장 로직에서 순수 부분(변경 여부·담당 요건·타임라인 조립)을 떼어낸다. 컴포넌트는 상태와
// 배선만 갖고, 규칙은 여기서 테스트 가능한 순수 함수로 둔다.
import { directionParticle } from '../../../shared/format';
import { appendEvent, statusRequiresAssignee, ticketStatusLabel } from '../_shared/domain';
import type { Ticket, TicketEvent, TicketEventKind, TicketStatus } from '../_shared/domain';

const ADMIN_AUTHOR = '관리자';

export interface ProcessDraft {
  readonly assignee: string;
  readonly status: TicketStatus;
  readonly composer: string;
  readonly composerKind: TicketEventKind;
}

/** 담당/상태/작성 중 하나라도 원본과 다르면 미저장 변경 있음 */
export function isProcessDirty(ticket: Ticket, draft: ProcessDraft): boolean {
  return (
    draft.assignee !== ticket.assignee ||
    draft.status !== ticket.status ||
    draft.composer.trim() !== ''
  );
}

/** 처리중·답변완료인데 담당이 비면 안내 문구, 아니면 null */
export function assigneeError(status: TicketStatus, assignee: string): string | null {
  if (statusRequiresAssignee(status) && assignee.trim() === '') {
    return `'${ticketStatusLabel(status)}' 상태는 담당 배정이 필요합니다.`;
  }
  return null;
}

/** 배정·상태변경·답변/메모 이벤트를 원본 타임라인에 덧붙인 새 타임라인 */
export function buildTimeline(
  ticket: Ticket,
  draft: ProcessDraft,
  now: string,
): readonly TicketEvent[] {
  let timeline = ticket.timeline;
  const seq = String(Date.now());
  const assignee = draft.assignee.trim();
  if (assignee !== ticket.assignee.trim() && assignee !== '') {
    timeline = appendEvent(timeline, event(`ev-${seq}-a`, now, 'assign', `${assignee} 배정`));
  }
  if (draft.status !== ticket.status) {
    timeline = appendEvent(
      timeline,
      event(
        `ev-${seq}-s`,
        now,
        'status',
        `상태를 '${ticketStatusLabel(draft.status)}'${directionParticle(ticketStatusLabel(draft.status))} 변경`,
      ),
    );
  }
  if (draft.composer.trim() !== '') {
    timeline = appendEvent(
      timeline,
      event(`ev-${seq}-c`, now, draft.composerKind, draft.composer.trim()),
    );
  }
  return timeline;
}

function event(id: string, at: string, kind: TicketEventKind, text: string): TicketEvent {
  return { id, at, author: ADMIN_AUTHOR, kind, text };
}
