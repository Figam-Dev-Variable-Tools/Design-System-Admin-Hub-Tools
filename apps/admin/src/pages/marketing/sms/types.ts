// SMS 발송 도메인 타입 · 순수 규칙 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// SMS 발송 캠페인: 발송명·발신번호·수신자 세그먼트·본문(바이트→SMS/LMS/MMS 자동판정)·광고성·예약.
// 발송 상태·통계·세그먼트·발신번호·바이트/야간/광고 규칙은 _shared/messaging 에서 온다(전 채널 공용).
import { byteLengthOf, classifySms } from '../_shared/messaging';
import type { SendStats, SendStatus, SmsKind } from '../_shared/messaging';

export interface SmsCampaign {
  readonly id: string;
  readonly name: string;
  /** 발신번호 id(_shared 발신번호 레지스트리 참조) */
  readonly senderId: string;
  /** 조회 시점 발신번호(비정규화) — 목록·미리보기에 바로 쓴다 */
  readonly senderNumber: string;
  readonly segmentIds: readonly string[];
  /** 저장 시점 대상 수(비정규화) */
  readonly recipientCount: number;
  /** 광고성 여부 — true 면 (광고) 표기·무료수신거부·야간발송 제한을 적용한다 */
  readonly isAd: boolean;
  readonly body: string;
  /** 이미지 첨부 여부 — 있으면 MMS */
  readonly hasImage: boolean;
  /** 저장 시점 자동판정 유형 */
  readonly kind: SmsKind;
  readonly status: SendStatus;
  /** 예약일시(datetime-local) — 즉시/미정이면 '' */
  readonly scheduledAt: string;
  readonly stats: SendStats;
}

// 저장 입력 — 파생값(발신번호 라벨·대상 수·유형)과 발송 결과(stats)는 서버가 계산/누적한다.
export type SmsCampaignInput = Omit<
  SmsCampaign,
  'id' | 'senderNumber' | 'recipientCount' | 'kind' | 'stats'
>;

export const SMS_NAME_MAX = 60;
export const SMS_BODY_MAX = 2000;

/** 본문 바이트로 유형을 판정한다 — 폼·목록이 공유 */
export function campaignKind(body: string, hasImage: boolean): SmsKind {
  return classifySms(byteLengthOf(body), hasImage);
}

export const SMS_FILTER_ALL = 'all';
export type SmsStatusFilter = typeof SMS_FILTER_ALL | SendStatus;

export function filterSmsCampaigns(
  list: readonly SmsCampaign[],
  status: SmsStatusFilter,
): readonly SmsCampaign[] {
  if (status === SMS_FILTER_ALL) return list;
  return list.filter((campaign) => campaign.status === status);
}

export function searchSmsCampaigns(
  list: readonly SmsCampaign[],
  keyword: string,
): readonly SmsCampaign[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(needle) ||
      campaign.senderNumber.toLowerCase().includes(needle),
  );
}

/** 예약일시 내림차순(최근/미래가 위). 예약 없는 초안은 뒤로. 같은 값은 id 안정 정렬. */
export function sortSmsCampaigns(list: readonly SmsCampaign[]): readonly SmsCampaign[] {
  return [...list].sort((a, b) => {
    const aKey = a.scheduledAt === '' ? '' : a.scheduledAt;
    const bKey = b.scheduledAt === '' ? '' : b.scheduledAt;
    if (aKey !== bKey) return aKey < bKey ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function toSmsInput(campaign: SmsCampaign): SmsCampaignInput {
  return {
    name: campaign.name,
    senderId: campaign.senderId,
    segmentIds: campaign.segmentIds,
    isAd: campaign.isAd,
    body: campaign.body,
    hasImage: campaign.hasImage,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt,
  };
}
