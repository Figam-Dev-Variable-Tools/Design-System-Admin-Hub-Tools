// 이벤트 타임라인 (A41 소유 — apps/admin/src/shared/ui/**)
//
// [왜 공통인가] 영업 문의(InquiryTimeline)가 '접수·내부메모·고객답변·상태변경을 시간순으로 보여준다'를
// 처음 구현했고, 고객센터 1:1 문의(티켓) 상세가 같은 상호작용을 갖게 되며 **소비자가 둘**이 됐다
// (shared/ui/README 규칙 1: 2곳 이상이 쓰면 공통 모듈). 그래서 여기로 승격한다.
//
// [도메인을 모른다] 무슨 이벤트인지 알지 못한다 — 각 이벤트를 배지 톤·배지 라벨·작성자·시각·본문으로
// 이미 환산해 받는다. 문의인지 티켓인지 알지 못한다(각 페이지가 자기 이벤트를 이 형태로 매핑한다).
import type { CSSProperties } from 'react';

import { formatDateTime } from '../format';
import { StatusBadge } from '@tds/ui';
import type { StatusBadgeTone as StatusTone } from '@tds/ui';

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

const emptyStyle: CSSProperties = { ...timeStyle, marginTop: 0, marginBottom: 0 };

/** 이미 표시용으로 환산된 타임라인 한 칸 — 도메인 이벤트를 페이지가 이 형태로 매핑한다 */
export interface TimelineEvent {
  readonly id: string;
  /** 발생 시각 ISO */
  readonly at: string;
  readonly badgeTone: StatusTone;
  readonly badgeLabel: string;
  readonly author: string;
  readonly text: string;
}

interface TimelineProps {
  readonly events: readonly TimelineEvent[];
  /** 스크린 리더용 목록 이름 — '문의 처리 이력' 등 */
  readonly label: string;
  readonly emptyLabel?: string;
}

export function Timeline({ events, label, emptyLabel = '기록된 이력이 없습니다.' }: TimelineProps) {
  if (events.length === 0) {
    return <p style={emptyStyle}>{emptyLabel}</p>;
  }

  return (
    <ol style={listStyle} aria-label={label}>
      {events.map((event) => (
        <li key={event.id} style={itemStyle}>
          <div style={headStyle}>
            <StatusBadge tone={event.badgeTone} label={event.badgeLabel} />
            <span style={authorStyle}>{event.author}</span>
            <span style={timeStyle}>{formatDateTime(event.at)}</span>
          </div>
          <p style={textStyle}>{event.text}</p>
        </li>
      ))}
    </ol>
  );
}
