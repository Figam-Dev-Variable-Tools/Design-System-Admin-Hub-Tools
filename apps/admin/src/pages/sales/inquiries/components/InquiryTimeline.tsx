// 문의 대화 타임라인 (A41 소유 — apps/admin/src/pages/sales/**)
//
// 접수·내부메모·고객답변·상태변경 이벤트를 시간순으로 보여준다. 문의 상세 1곳만 쓰므로 페이지 전용이다.
import type { CSSProperties } from 'react';

import { formatDateTime } from '../../../../shared/format';
import { StatusBadge } from '../../../../shared/ui';
import { inquiryEventLabel } from '../types';
import type { InquiryEvent, InquiryEventKind } from '../types';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  listStyleType: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const itemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const headStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const authorStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const timeStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

const textStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  overflowWrap: 'anywhere',
};

function kindTone(kind: InquiryEventKind): 'neutral' | 'success' | 'warning' | 'info' {
  if (kind === 'reply') return 'success';
  if (kind === 'status') return 'info';
  if (kind === 'note') return 'warning';
  return 'neutral';
}

interface InquiryTimelineProps {
  readonly events: readonly InquiryEvent[];
}

export function InquiryTimeline({ events }: InquiryTimelineProps) {
  if (events.length === 0) {
    return <p style={{ ...timeStyle, marginTop: 0, marginBottom: 0 }}>기록된 이력이 없습니다.</p>;
  }

  return (
    <ol style={listStyle} aria-label="문의 처리 이력">
      {events.map((event) => (
        <li key={event.id} style={itemStyle}>
          <div style={headStyle}>
            <StatusBadge tone={kindTone(event.kind)} label={inquiryEventLabel(event.kind)} />
            <span style={authorStyle}>{event.author}</span>
            <span style={timeStyle}>{formatDateTime(event.at)}</span>
          </div>
          <p style={textStyle}>{event.text}</p>
        </li>
      ))}
    </ol>
  );
}
