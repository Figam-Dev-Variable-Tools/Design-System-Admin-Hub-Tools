// Timeline — 이벤트 타임라인 (molecule · contracts/Timeline.contract.json@1.0.0)
//
// 계약 dependencies: StatusBadge (atom). events 는 데이터 prop — 각 페이지가 도메인 이벤트를 표시용으로 매핑해 넘긴다.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 출처 인라인 스타일을 클래스로 옮긴 것.
//
// [시각 포맷] at(ISO)을 'YYYY-MM-DD HH:mm'(로컬)로 표기한다 — 외부 의존 없는 순수 함수로 co-locate 한다
// (앱 shared/format 을 끌어오면 @tds/ui 가 앱에 역의존한다. 15줄 남짓이라 복제 임계(30줄) 아래다).
import { StatusBadge } from '../../atoms/StatusBadge';
import type { TimelineProps } from '../../../generated/types/Timeline.types';
import './Timeline.css';

/** 표시용으로 환산된 타임라인 한 칸 — 도메인 이벤트를 페이지가 이 형태로 매핑한다 */
export type TimelineEvent = TimelineProps['events'][number];

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 'YYYY-MM-DD HH:mm' — 로컬 타임존. 파싱 실패면 입력 문자열을 그대로 돌려준다 */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const ymd = `${String(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `${ymd} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function Timeline({ events, label, emptyLabel = '기록된 이력이 없습니다.' }: TimelineProps) {
  if (events.length === 0) {
    return <p className="tds-timeline__empty">{emptyLabel}</p>;
  }

  return (
    <ol className="tds-timeline" aria-label={label}>
      {events.map((event) => (
        <li key={event.id} className="tds-timeline__item">
          <div className="tds-timeline__head">
            <StatusBadge tone={event.badgeTone} label={event.badgeLabel} />
            <span className="tds-timeline__author">{event.author}</span>
            <span className="tds-timeline__time">{formatDateTime(event.at)}</span>
          </div>
          <p className="tds-timeline__text">{event.text}</p>
        </li>
      ))}
    </ol>
  );
}
