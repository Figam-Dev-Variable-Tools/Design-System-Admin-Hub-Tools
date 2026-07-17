// 이메일 발송 도메인 타입 · 순수 규칙
//
// 이메일 발송 캠페인: 발송명·제목·발신자·수신자 세그먼트·본문·수신거부 링크·예약. 발송 상태·통계(오픈/
// 클릭)·세그먼트·발신자·광고((광고) 표기)는 _shared/messaging 에서 온다. SMS 발송과 형제 구조다.
import type { MailStats, SendStatus } from '../_shared/messaging';

export interface EmailCampaign {
  readonly id: string;
  readonly name: string;
  readonly subject: string;
  /** 발신자 id(_shared 발신 이메일 레지스트리 참조) */
  readonly senderId: string;
  /** 조회 시점 발신 이메일·이름(비정규화) */
  readonly senderEmail: string;
  readonly senderName: string;
  readonly segmentIds: readonly string[];
  readonly recipientCount: number;
  /** 광고성 여부 — true 면 제목에 (광고) 표기가 필요하다 */
  readonly isAd: boolean;
  readonly body: string;
  /** 수신거부 링크 포함 여부 — 마케팅 이메일 필수 */
  readonly includeUnsubscribe: boolean;
  readonly status: SendStatus;
  readonly scheduledAt: string;
  readonly stats: MailStats;
}

// 저장 입력 — 파생값(발신자 라벨·대상 수)과 발송 결과(stats)는 서버가 계산/누적한다.
export type EmailCampaignInput = Omit<
  EmailCampaign,
  'id' | 'senderEmail' | 'senderName' | 'recipientCount' | 'stats'
>;

export const EMAIL_NAME_MAX = 60;
export const EMAIL_SUBJECT_MAX = 120;
export const EMAIL_BODY_MAX = 5000;

export const EMAIL_FILTER_ALL = 'all';
export type EmailStatusFilter = typeof EMAIL_FILTER_ALL | SendStatus;

export function filterEmailCampaigns(
  list: readonly EmailCampaign[],
  status: EmailStatusFilter,
): readonly EmailCampaign[] {
  if (status === EMAIL_FILTER_ALL) return list;
  return list.filter((campaign) => campaign.status === status);
}

export function searchEmailCampaigns(
  list: readonly EmailCampaign[],
  keyword: string,
): readonly EmailCampaign[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(needle) ||
      campaign.subject.toLowerCase().includes(needle),
  );
}

/** 예약일시 내림차순(최근/미래가 위). 예약 없는 초안은 뒤로. 같은 값은 id 안정 정렬. */
export function sortEmailCampaigns(list: readonly EmailCampaign[]): readonly EmailCampaign[] {
  return [...list].sort((a, b) => {
    if (a.scheduledAt !== b.scheduledAt) return a.scheduledAt < b.scheduledAt ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

export function toEmailInput(campaign: EmailCampaign): EmailCampaignInput {
  return {
    name: campaign.name,
    subject: campaign.subject,
    senderId: campaign.senderId,
    segmentIds: campaign.segmentIds,
    isAd: campaign.isAd,
    body: campaign.body,
    includeUnsubscribe: campaign.includeUnsubscribe,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt,
  };
}
