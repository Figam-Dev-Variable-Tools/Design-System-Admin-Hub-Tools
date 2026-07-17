// SMS 발송 데이터 소스 어댑터
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 파생값(발신번호 라벨·대상 수·유형)은
// 저장 시 _shared 레지스트리로 비정규화한다 — 실연동 시 서버가 계산한다.
//
// [발송은 실제 전송이 아니다] 이 어댑터는 캠페인(초안/예약)을 저장할 뿐 문자를 보내지 않는다.
// 실제 발송은 // TODO(backend) POST /api/marketing/sms/:id/send (주석만 — 실제 HTTP 0건).
import { createCrudAdapter } from '../../../shared/crud';
import { listSegments, listSenderNumbers } from '../_shared/store';
import { totalRecipients } from '../_shared/messaging';
import { campaignKind, sortSmsCampaigns } from './types';
import type { SmsCampaign, SmsCampaignInput } from './types';

const SMS_SEED: readonly SmsCampaign[] = [
  {
    id: 'sms-1',
    name: '7월 여름세일 안내',
    senderId: 'snd-mkt',
    senderNumber: '025771000',
    segmentIds: ['seg-all'],
    recipientCount: 12840,
    isAd: true,
    body: '(광고) 여름맞이 최대 50% 세일! 지금 확인하세요. 무료수신거부 080-123-4567',
    hasImage: false,
    kind: 'lms',
    status: 'sent',
    scheduledAt: '2026-07-05T10:00',
    stats: { total: 12840, success: 12610, failed: 230 },
  },
  {
    id: 'sms-2',
    name: 'VIP 사은품 증정 안내',
    senderId: 'snd-mkt',
    senderNumber: '025771000',
    segmentIds: ['seg-vip'],
    recipientCount: 640,
    isAd: true,
    body: '(광고) VIP 고객님께 특별 사은품을 드립니다. 무료수신거부 080-123-4567',
    hasImage: false,
    kind: 'sms',
    status: 'scheduled',
    scheduledAt: '2026-07-20T14:00',
    stats: { total: 0, success: 0, failed: 0 },
  },
  {
    id: 'sms-3',
    name: '배송 지연 사과 안내',
    senderId: 'snd-main',
    senderNumber: '15881234',
    segmentIds: ['seg-cart'],
    recipientCount: 415,
    isAd: false,
    body: '주문하신 상품의 배송이 지연되어 안내드립니다. 빠르게 처리하겠습니다.',
    hasImage: false,
    kind: 'sms',
    status: 'draft',
    scheduledAt: '',
    stats: { total: 0, success: 0, failed: 0 },
  },
];

let seq = SMS_SEED.length;

const senderNumberOf = (senderId: string): string =>
  listSenderNumbers().find((sender) => sender.id === senderId)?.number ?? '';

const recipientsOf = (segmentIds: readonly string[]): number =>
  totalRecipients(listSegments(), [...segmentIds]);

// TODO(backend): GET/POST /api/marketing/sms · GET/PUT/DELETE /api/marketing/sms/:id
//   발송 실행: POST /api/marketing/sms/:id/send (예약은 스케줄러가 시각에 실행) — 프론트는 트리거만.
export const smsAdapter = createCrudAdapter<SmsCampaign, SmsCampaignInput>({
  scope: 'marketing-sms',
  seed: SMS_SEED,
  build: (input) => {
    seq += 1;
    return {
      id: `sms-${String(seq)}`,
      ...input,
      senderNumber: senderNumberOf(input.senderId),
      recipientCount: recipientsOf(input.segmentIds),
      kind: campaignKind(input.body, input.hasImage),
      stats: { total: 0, success: 0, failed: 0 },
    };
  },
  patch: (item, input) => ({
    ...item,
    ...input,
    senderNumber: senderNumberOf(input.senderId),
    recipientCount: recipientsOf(input.segmentIds),
    kind: campaignKind(input.body, input.hasImage),
  }),
  sort: sortSmsCampaigns,
});
