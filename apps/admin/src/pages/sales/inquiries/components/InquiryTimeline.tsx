// 문의 대화 타임라인
//
// 접수·내부메모·고객답변·상태변경 이벤트를 시간순으로 보여준다. 렌더는 공통 프리미티브(shared/ui Timeline)를
// 쓰고, 이 어댑터는 문의 이벤트를 표시용(배지 톤·라벨)으로 매핑하는 일만 한다(고객센터 티켓과 공유하는 결).
import { Timeline } from '../../../../shared/ui';
import type { StatusTone, TimelineEvent } from '../../../../shared/ui';
import { inquiryEventLabel } from '../types';
import type { InquiryEvent, InquiryEventKind } from '../types';

function kindTone(kind: InquiryEventKind): StatusTone {
  if (kind === 'reply') return 'success';
  if (kind === 'status') return 'info';
  if (kind === 'note') return 'warning';
  return 'neutral';
}

function toTimelineEvent(event: InquiryEvent): TimelineEvent {
  return {
    id: event.id,
    at: event.at,
    author: event.author,
    badgeTone: kindTone(event.kind),
    badgeLabel: inquiryEventLabel(event.kind),
    text: event.text,
  };
}

interface InquiryTimelineProps {
  readonly events: readonly InquiryEvent[];
}

export function InquiryTimeline({ events }: InquiryTimelineProps) {
  return <Timeline events={events.map(toTimelineEvent)} label="문의 처리 이력" />;
}
