// 뉴스레터 도메인 타입 · 순수 규칙 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// 뉴스레터 발송회차(issue): 회차번호·제목·발신자·구독자 세그먼트·본문·예약 + 결과(오픈율/클릭율).
// 구독형이라 수신거부 링크는 항상 포함한다. 이메일 발송과 사촌 구조이며 통계는 MailStats 를 공유한다.
import type { MailStats, SendStatus } from '../_shared/messaging';

export interface NewsletterIssue {
  readonly id: string;
  /** 발송회차 번호 — 저장 시 자동 채번 */
  readonly issueNo: number;
  readonly title: string;
  readonly senderId: string;
  readonly senderEmail: string;
  readonly senderName: string;
  readonly segmentIds: readonly string[];
  readonly recipientCount: number;
  readonly body: string;
  readonly status: SendStatus;
  readonly scheduledAt: string;
  readonly stats: MailStats;
}

// 저장 입력 — 회차번호·발신자 라벨·대상 수·결과는 서버가 채번/계산/누적한다.
export type NewsletterIssueInput = Omit<
  NewsletterIssue,
  'id' | 'issueNo' | 'senderEmail' | 'senderName' | 'recipientCount' | 'stats'
>;

export const NEWSLETTER_TITLE_MAX = 120;
export const NEWSLETTER_BODY_MAX = 5000;

export const NEWSLETTER_FILTER_ALL = 'all';
export type NewsletterStatusFilter = typeof NEWSLETTER_FILTER_ALL | SendStatus;

export function filterNewsletters(
  list: readonly NewsletterIssue[],
  status: NewsletterStatusFilter,
): readonly NewsletterIssue[] {
  if (status === NEWSLETTER_FILTER_ALL) return list;
  return list.filter((issue) => issue.status === status);
}

export function searchNewsletters(
  list: readonly NewsletterIssue[],
  keyword: string,
): readonly NewsletterIssue[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter((issue) => issue.title.toLowerCase().includes(needle));
}

/** 회차번호 내림차순(최신 회차가 위). 같은 값은 id 안정 정렬. */
export function sortNewsletters(list: readonly NewsletterIssue[]): readonly NewsletterIssue[] {
  return [...list].sort((a, b) => {
    if (a.issueNo !== b.issueNo) return a.issueNo < b.issueNo ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 다음 발송회차 번호 — 현재 최대 회차 + 1(비어 있으면 1) */
export function nextIssueNo(list: readonly NewsletterIssue[]): number {
  return list.reduce((max, issue) => Math.max(max, issue.issueNo), 0) + 1;
}

export function toNewsletterInput(issue: NewsletterIssue): NewsletterIssueInput {
  return {
    title: issue.title,
    senderId: issue.senderId,
    segmentIds: issue.segmentIds,
    body: issue.body,
    status: issue.status,
    scheduledAt: issue.scheduledAt,
  };
}
