// 뉴스레터 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
//
// 발송 경계값: 발신자 선택·검증 · 빈 수신자 · 제목/본문 필수 · 예약 과거시각. 구독형이라 (광고) 표기는
// 강제하지 않지만 수신거부 링크는 미리보기·발송 시 항상 포함된다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { listSenderEmails } from '../_shared/store';
import { NEWSLETTER_BODY_MAX, NEWSLETTER_TITLE_MAX } from './types';

function senderIsVerified(id: string): boolean {
  const sender = listSenderEmails().find((item) => item.id === id);
  return sender !== undefined && sender.verified;
}

function isPastLocal(value: string): boolean {
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return false;
  return at < Date.now();
}

export const newsletterSchema = z
  .object({
    title: requiredText('제목', NEWSLETTER_TITLE_MAX),
    senderId: z.string(),
    segmentIds: z.array(z.string()),
    body: requiredText('본문', NEWSLETTER_BODY_MAX),
    status: z.enum(['draft', 'scheduled']),
    scheduledAt: z.string(),
  })
  .check((ctx) => {
    if (ctx.value.senderId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderId,
        path: ['senderId'],
        message: '발신자를 선택하세요.',
      });
    } else if (!senderIsVerified(ctx.value.senderId)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderId,
        path: ['senderId'],
        message: '검증이 완료된 발신자만 사용할 수 있습니다.',
      });
    }
  })
  .check((ctx) => {
    if (ctx.value.segmentIds.length === 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.segmentIds,
        path: ['segmentIds'],
        message: '구독자 세그먼트를 하나 이상 선택하세요.',
      });
    }
  })
  .check((ctx) => {
    if (ctx.value.status !== 'scheduled') return;
    if (ctx.value.scheduledAt.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.scheduledAt,
        path: ['scheduledAt'],
        message: '예약 발송 일시를 입력하세요.',
      });
      return;
    }
    if (isPastLocal(ctx.value.scheduledAt)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.scheduledAt,
        path: ['scheduledAt'],
        message: '예약 일시는 현재 시각 이후여야 합니다.',
      });
    }
  });

export type NewsletterFormValues = z.infer<typeof newsletterSchema>;
