// 티켓 대화 타임라인
//
// 접수·배정·내부메모·고객답변·상태변경을 시간순으로 보여준다. 렌더는 공통 프리미티브(shared/ui Timeline),
// 이 어댑터는 티켓 이벤트를 표시용(배지 톤·라벨)으로 매핑만 한다(영업 문의 타임라인과 공유하는 결).
import { Timeline } from '../../../../shared/ui';
import type { StatusTone, TimelineEvent } from '../../../../shared/ui';
import { ticketEventLabel } from '../../_shared/domain';
import type { TicketEvent, TicketEventKind } from '../../_shared/domain';

function kindTone(kind: TicketEventKind): StatusTone {
  if (kind === 'reply') return 'success';
  if (kind === 'status' || kind === 'assign') return 'info';
  if (kind === 'note') return 'warning';
  return 'neutral';
}

function toTimelineEvent(event: TicketEvent): TimelineEvent {
  return {
    id: event.id,
    at: event.at,
    author: event.author,
    badgeTone: kindTone(event.kind),
    badgeLabel: ticketEventLabel(event.kind),
    text: event.text,
  };
}

interface TicketTimelineProps {
  readonly events: readonly TicketEvent[];
}

export function TicketTimeline({ events }: TicketTimelineProps) {
  return <Timeline events={events.map(toTimelineEvent)} label="문의 처리 이력" />;
}
