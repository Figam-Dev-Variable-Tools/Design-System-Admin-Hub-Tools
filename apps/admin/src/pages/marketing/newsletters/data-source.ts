// 뉴스레터 데이터 소스 어댑터
//
// [백엔드 연동 지점] createCrudAdapter 에 시드를 넣는다. 회차번호는 저장 시 자동 채번하고, 발신자 라벨·
// 대상 수는 _shared 레지스트리로 비정규화한다. **발송은 실제 전송이 아니다** — 회차만 저장한다.
import { createCrudAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { listSegments, listSenderEmails } from '../_shared/store';
import { sendActionsFor, totalRecipients } from '../_shared/messaging';
import { nextIssueNo, sortNewsletters } from './types';
import type { NewsletterIssue, NewsletterIssueInput } from './types';

const NEWSLETTER_SEED: readonly NewsletterIssue[] = [
  {
    id: 'nl-1',
    issueNo: 12,
    title: '스페이스플래닝 6월 뉴스레터',
    senderId: 'from-news',
    senderEmail: 'news@spaceplanning.ai',
    senderName: '스페이스플래닝 뉴스',
    segmentIds: ['seg-newsletter'],
    recipientCount: 5180,
    body: '#{이름}님, 6월의 소식을 전해드립니다.',
    status: 'sent',
    scheduledAt: '2026-06-01T09:00',
    stats: { total: 5180, success: 5100, failed: 80, opened: 2295, clicked: 510 },
  },
  {
    id: 'nl-2',
    issueNo: 13,
    title: '스페이스플래닝 7월 뉴스레터',
    senderId: 'from-news',
    senderEmail: 'news@spaceplanning.ai',
    senderName: '스페이스플래닝 뉴스',
    segmentIds: ['seg-newsletter'],
    recipientCount: 5320,
    body: '#{이름}님, 7월의 새로운 소식과 혜택을 전해드립니다.',
    status: 'scheduled',
    scheduledAt: '2026-07-25T09:00',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
  },
  {
    id: 'nl-3',
    issueNo: 14,
    title: '스페이스플래닝 8월 뉴스레터(초안)',
    senderId: 'from-news',
    senderEmail: 'news@spaceplanning.ai',
    senderName: '스페이스플래닝 뉴스',
    segmentIds: ['seg-newsletter'],
    recipientCount: 5320,
    body: '#{이름}님, 8월의 소식을 준비 중입니다.',
    status: 'draft',
    scheduledAt: '',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
  },
];

let seq = NEWSLETTER_SEED.length;

const senderOf = (senderId: string) => listSenderEmails().find((sender) => sender.id === senderId);

const recipientsOf = (segmentIds: readonly string[]): number =>
  totalRecipients(listSegments(), [...segmentIds]);

// TODO(backend): GET/POST /api/marketing/newsletters · GET/PUT/DELETE /api/marketing/newsletters/:id
//   발송 실행: POST /api/marketing/newsletters/:id/send (예약은 스케줄러가 실행) — 프론트는 트리거만.
export const newsletterAdapter = createCrudAdapter<NewsletterIssue, NewsletterIssueInput>({
  scope: 'marketing-newsletters',
  seed: NEWSLETTER_SEED,
  build: (input, existing) => {
    seq += 1;
    const sender = senderOf(input.senderId);
    return {
      id: `nl-${String(seq)}`,
      issueNo: nextIssueNo(existing),
      ...input,
      senderEmail: sender?.email ?? '',
      senderName: sender?.name ?? '',
      recipientCount: recipientsOf(input.segmentIds),
      stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
    };
  },
  patch: (item, input) => {
    /* 발송 상태가 편집을 가둔다 (BE-033 §7.1 `ISSUE_NOT_EDITABLE`) — SMS·이메일 어댑터와 같은 이유다.
       판정은 item(저장된 현재 상태)으로 한다: 폼이 보낸 input.status 를 믿으면 '초안' 강등이 통과한다. */
    if (!sendActionsFor(item.status).canEdit) {
      throw new HttpError(
        HTTP_STATUS.unprocessable,
        '발송중·발송완료·취소된 회차는 수정할 수 없어요.',
      );
    }
    const sender = senderOf(input.senderId);
    return {
      ...item,
      ...input,
      senderEmail: sender?.email ?? '',
      senderName: sender?.name ?? '',
      recipientCount: recipientsOf(input.segmentIds),
    };
  },
  sort: sortNewsletters,
});
