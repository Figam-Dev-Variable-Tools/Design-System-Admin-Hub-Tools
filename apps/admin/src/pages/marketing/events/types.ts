// 이벤트 도메인 타입 · 순수 규칙
//
// 마케팅 이벤트: 기간·대상·혜택(쿠폰/적립)·배너 연동·상태(예정/진행/종료). 상태/혜택 enum·기간 규칙은
// _shared/campaign 에서 온다(프로모션과 공용).
//
// [배너 연동은 참조다] 연동 대상 목록은 콘텐츠 관리 배너가 갖는다. 이 모듈은 그 모듈을 import 하지
// 않고(페이지 간 결합) shared/domain/banner-catalog 조회기가 주는 것만 고른다.
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
  /**
   * 연동 배너 id — **'' 면 미연동**. 정본은 콘텐츠 관리 배너다(shared/domain/banner-catalog).
   *
   * [예전엔 배너명 자유 텍스트였다] '메인 상단 여름 배너' 를 손으로 적었다. 그런 배너가 없어도
   * 저장됐고, 저쪽에서 이름이 바뀌거나 배너가 사라져도 이벤트는 옛 문구를 들고 있었다.
   * 사람이 눈으로 맞추는 연결은 연결이 아니다 — 이제 선택 목록이 카탈로그에서 온다.
   *
   * [bannerLinked 불리언은 사라졌다] '연동함' 과 '연동 배너가 있음' 이 따로 저장되면 둘이 어긋난
   * 상태를 만들 수 있다. 연동 여부는 이 값 하나에서 파생한다.
   */
  readonly bannerId: string;
  /**
   * 조회 시점 배너명(비정규화) — 목록이 카탈로그 조인 없이 바로 그린다.
   *
   * 이 저장소의 관례다(고객센터 티켓의 categoryLabel, 영업 정산의 accountName 과 같은 결).
   * **정본은 id 쪽**이라 이름이 바뀌면 다음 조회에서 새 값으로 덮인다 — 판단·링크는 id 로 한다.
   */
  readonly bannerTitle: string;
  readonly description: string;
}

/** 배너가 연동된 이벤트인가 — 상태값 리터럴('')을 화면마다 흩뿌리지 않는다 */
export function hasLinkedBanner(event: Pick<MarketingEvent, 'bannerId'>): boolean {
  return event.bannerId !== '';
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
    bannerId: event.bannerId,
    bannerTitle: event.bannerTitle,
    description: event.description,
  };
}
