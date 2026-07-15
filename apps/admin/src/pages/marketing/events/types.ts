// 이벤트 도메인 타입 · 순수 규칙 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// 마케팅 이벤트: 기간·대상·혜택(쿠폰/적립)·배너 연동·상태(예정/진행/종료). 상태/혜택 enum·기간 규칙은
// _shared/campaign 에서 온다(프로모션과 공용).
import type { BenefitType, CampaignPhase } from '../_shared/campaign';

export interface MarketingEvent {
  readonly id: string;
  readonly title: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly phase: CampaignPhase;
  /** 참여 대상 설명 — '전체 회원'·'VIP 등급' 등 */
  readonly target: string;
  readonly benefitType: BenefitType;
  /** 혜택 상세 — 쿠폰명/적립액 등(혜택 없음이면 '') */
  readonly benefitDetail: string;
  /** 배너 연동 여부 */
  readonly bannerLinked: boolean;
  /** 연동 배너명(연동 시) */
  readonly bannerLabel: string;
  readonly description: string;
}

export type MarketingEventInput = Omit<MarketingEvent, 'id'>;

export const EVENT_TITLE_MAX = 80;
export const EVENT_DESC_MAX = 1000;

export const EVENT_FILTER_ALL = 'all';
export type EventPhaseFilter = typeof EVENT_FILTER_ALL | CampaignPhase;

export function filterEvents(
  list: readonly MarketingEvent[],
  phase: EventPhaseFilter,
): readonly MarketingEvent[] {
  if (phase === EVENT_FILTER_ALL) return list;
  return list.filter((event) => event.phase === phase);
}

export function searchEvents(
  list: readonly MarketingEvent[],
  keyword: string,
): readonly MarketingEvent[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (event) =>
      event.title.toLowerCase().includes(needle) || event.target.toLowerCase().includes(needle),
  );
}

/** 시작일 내림차순(최근이 위). 같은 날짜는 id 안정 정렬. */
export function sortEvents(list: readonly MarketingEvent[]): readonly MarketingEvent[] {
  return [...list].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt < b.startAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function toEventInput(event: MarketingEvent): MarketingEventInput {
  return {
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    phase: event.phase,
    target: event.target,
    benefitType: event.benefitType,
    benefitDetail: event.benefitDetail,
    bannerLinked: event.bannerLinked,
    bannerLabel: event.bannerLabel,
    description: event.description,
  };
}
