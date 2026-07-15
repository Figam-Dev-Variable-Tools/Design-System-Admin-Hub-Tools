// 이메일 발송 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
//
// 발송 경계값을 스키마에서 막는다: 발신자 선택·검증 · 빈 수신자 · 제목/본문 필수 · 광고 제목 (광고)
// 표기 · 수신거부 링크 누락 · 예약 과거시각.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { hasAdPrefix } from '../_shared/messaging';
import { listSenderEmails } from '../_shared/store';
import { EMAIL_BODY_MAX, EMAIL_NAME_MAX, EMAIL_SUBJECT_MAX } from './types';

function senderIsVerified(id: string): boolean {
  const sender = listSenderEmails().find((item) => item.id === id);
  return sender !== undefined && sender.verified;
}

function isPastLocal(value: string): boolean {
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return false;
  return at < Date.now();
}

export const emailSchema = z
  .object({
    name: requiredText('발송명', EMAIL_NAME_MAX),
    subject: requiredText('제목', EMAIL_SUBJECT_MAX),
    senderId: z.string(),
    segmentIds: z.array(z.string()),
    isAd: z.boolean(),
    body: requiredText('본문', EMAIL_BODY_MAX),
    includeUnsubscribe: z.boolean(),
    status: z.enum(['draft', 'scheduled']),
    scheduledAt: z.string(),
  })
  .check((ctx) => {
    // 발신자 — 선택 + 검증(SPF/DKIM 등) 완료여야 발송 가능.
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
        message: '수신자 세그먼트를 하나 이상 선택하세요.',
      });
    }
  })
  .check((ctx) => {
    // 광고성 — 제목에 (광고) 표기 필수(정보통신망법 제50조 제4항).
    if (ctx.value.isAd && !hasAdPrefix(ctx.value.subject)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.subject,
        path: ['subject'],
        message: '광고성 이메일은 제목이 "(광고)"로 시작해야 합니다.',
      });
    }
  })
  .check((ctx) => {
    // 수신거부 링크 — 마케팅 이메일 필수.
    if (!ctx.value.includeUnsubscribe) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.includeUnsubscribe,
        path: ['includeUnsubscribe'],
        message: '마케팅 이메일에는 수신거부 링크를 포함해야 합니다.',
      });
    }
  })
  .check((ctx) => {
    // 예약 — 예약 상태면 일시 필수 + 과거 금지.
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

export type EmailFormValues = z.infer<typeof emailSchema>;
