// AUTO-GENERATED from contracts/Timeline.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Data Display · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type TimelineState = 'default';

/**
 * 이벤트 타임라인 — 시간순 이력 목록. StatusBadge 를 조립해 각 이벤트를 배지 톤·라벨·작성자·시각·본문으로 보여준다 (ADR-0003). 도메인을 모른다 — 무슨 이벤트인지 알지 못하고, 각 페이지가 자기 이벤트(문의·티켓·예약)를 표시용 TimelineEvent 로 매핑해 넘긴다.

[시각 포맷] at 은 ISO 문자열이고 컴포넌트가 'YYYY-MM-DD HH:mm' 로 표기한다(로컬 타임존). 포맷터는 외부 의존이 없는 순수 함수로 컴포넌트에 co-locate 한다(앱 shared/format 을 끌어오지 않는다 — @tds/ui 자립).

[events 는 데이터 prop] Figma Component Property 대응이 없다 (ADR-0003). 빈 배열이면 emptyLabel 문구를 렌더한다.
 */
export interface TimelineProps {
  /**
   * 표시용으로 환산된 타임라인 이벤트 목록. at 은 ISO 시각, badgeTone/badgeLabel 은 StatusBadge 로 렌더, author/text 는 작성자/본문. 빈 배열이면 emptyLabel 을 렌더한다. 데이터 prop — Figma 대응 없음 (ADR-0003)
   */
  events: ReadonlyArray<{ id: string; at: string; badgeTone: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; badgeLabel: string; author: string; text: string }>;
  /**
   * 스크린 리더용 목록 이름 — '문의 처리 이력' 등. <ol> 의 aria-label 이 된다
   */
  label: string;
  /**
   * events 가 빈 배열일 때 표시할 문구
   * @default "기록된 이력이 없습니다."
   */
  emptyLabel?: string;
}
