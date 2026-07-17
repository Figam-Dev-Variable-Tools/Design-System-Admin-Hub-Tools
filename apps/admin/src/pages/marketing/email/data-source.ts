// 이메일 발송 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 파생값(발신자 라벨·대상 수)은 저장
// 시 _shared 레지스트리로 비정규화한다. **발송은 실제 전송이 아니다** — 캠페인만 저장한다.
import { createCrudAdapter } from '../../../shared/crud';
import { listSegments, listSenderEmails } from '../_shared/store';
import { totalRecipients } from '../_shared/messaging';
import { sortEmailCampaigns } from './types';
import type { EmailCampaign, EmailCampaignInput } from './types';

const EMAIL_SEED: readonly EmailCampaign[] = [
  {
    id: 'em-1',
    name: '7월 뉴스레터 발송',
    subject: '[스페이스플래닝] 7월의 새로운 소식',
    senderId: 'from-news',
    senderEmail: 'news@spaceplanning.ai',
    senderName: '스페이스플래닝 뉴스',
    segmentIds: ['seg-newsletter'],
    recipientCount: 5320,
    isAd: false,
    body: '안녕하세요 #{이름}님,\n7월의 새로운 소식과 혜택을 전해드립니다.\n\n감사합니다.',
    includeUnsubscribe: true,
    status: 'sent',
    scheduledAt: '2026-07-01T09:00',
    stats: { total: 5320, success: 5240, failed: 80, opened: 2410, clicked: 620 },
  },
  {
    id: 'em-2',
    name: 'VIP 단독 할인 안내',
    subject: '(광고) VIP 고객님만을 위한 단독 혜택',
    senderId: 'from-mkt',
    senderEmail: 'marketing@spaceplanning.ai',
    senderName: '스페이스플래닝 마케팅',
    segmentIds: ['seg-vip'],
    recipientCount: 640,
    isAd: true,
    body: '#{이름}님, VIP 고객님만을 위한 단독 할인 혜택을 준비했습니다.',
    includeUnsubscribe: true,
    status: 'scheduled',
    scheduledAt: '2026-07-22T10:00',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
  },
  {
    id: 'em-3',
    name: '장바구니 리마인드',
    subject: '담아두신 상품을 잊지 않으셨나요?',
    senderId: 'from-mkt',
    senderEmail: 'marketing@spaceplanning.ai',
    senderName: '스페이스플래닝 마케팅',
    segmentIds: ['seg-cart'],
    recipientCount: 415,
    isAd: false,
    body: '#{이름}님, 장바구니에 담아두신 상품이 기다리고 있습니다.',
    includeUnsubscribe: true,
    status: 'draft',
    scheduledAt: '',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
  },
];

let seq = EMAIL_SEED.length;

const senderOf = (senderId: string) => listSenderEmails().find((sender) => sender.id === senderId);

const recipientsOf = (segmentIds: readonly string[]): number =>
  totalRecipients(listSegments(), [...segmentIds]);

// TODO(backend): GET/POST /api/marketing/email · GET/PUT/DELETE /api/marketing/email/:id
//   발송 실행: POST /api/marketing/email/:id/send (예약은 스케줄러가 실행) — 프론트는 트리거만.
export const emailAdapter = createCrudAdapter<EmailCampaign, EmailCampaignInput>({
  scope: 'marketing-email',
  seed: EMAIL_SEED,
  build: (input) => {
    seq += 1;
    const sender = senderOf(input.senderId);
    return {
      id: `em-${String(seq)}`,
      ...input,
      senderEmail: sender?.email ?? '',
      senderName: sender?.name ?? '',
      recipientCount: recipientsOf(input.segmentIds),
      stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
    };
  },
  patch: (item, input) => {
    const sender = senderOf(input.senderId);
    return {
      ...item,
      ...input,
      senderEmail: sender?.email ?? '',
      senderName: sender?.name ?? '',
      recipientCount: recipientsOf(input.segmentIds),
    };
  },
  sort: sortEmailCampaigns,
});
