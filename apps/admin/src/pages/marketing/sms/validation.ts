// SMS 발송 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 발송 경계값을 스키마에서 막는다: 발신번호 형식·사전등록(검증) · 빈 수신자 · 메시지 바이트 한도 ·
// 광고 요건((광고)+무료수신거부) · 예약 과거시각 · 야간(21~08시) 광고 차단.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { byteLengthOf, isNightAt, LMS_MAX_BYTES, meetsAdRequirements } from '../_shared/messaging';
import { listSenderNumbers } from '../_shared/store';
import { SMS_BODY_MAX, SMS_NAME_MAX } from './types';

function senderIsVerified(id: string): boolean {
  const sender = listSenderNumbers().find((item) => item.id === id);
  return sender !== undefined && sender.verified;
}

function isPastLocal(value: string): boolean {
  const at = new Date(value).getTime();
  if (Number.isNaN(at)) return false;
  return at < Date.now();
}

export const smsSchema = z
  .object({
    name: requiredText('발송명', SMS_NAME_MAX),
    senderId: z.string(),
    segmentIds: z.array(z.string()),
    isAd: z.boolean(),
    hasImage: z.boolean(),
    body: requiredText('본문', SMS_BODY_MAX),
    status: z.enum(['draft', 'scheduled']),
    scheduledAt: z.string(),
  })
  .check((ctx) => {
    // 발신번호 — 선택 + 사전등록(검증) 완료여야 발신 가능.
    if (ctx.value.senderId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderId,
        path: ['senderId'],
        message: '발신번호를 선택하세요.',
      });
    } else if (!senderIsVerified(ctx.value.senderId)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderId,
        path: ['senderId'],
        message: '사전등록(검증)이 완료된 발신번호만 사용할 수 있어요.',
      });
    }
  })
  .check((ctx) => {
    // 수신자 — 최소 1개 세그먼트.
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
    // 바이트 한도 — LMS/MMS 최대 2,000byte.
    if (byteLengthOf(ctx.value.body) > LMS_MAX_BYTES) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: `메시지는 ${String(LMS_MAX_BYTES)} byte(LMS)를 넘을 수 없어요.`,
      });
    }
  })
  .check((ctx) => {
    // 광고성 — (광고) 표기 + 무료수신거부 문구 필수.
    if (ctx.value.isAd && !meetsAdRequirements(ctx.value.body)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: '광고 발송은 본문에 "(광고)" 표기와 무료수신거부(예: 080) 안내를 포함해야 해요.',
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
        message: '예약 일시는 현재 시각 이후여야 해요.',
      });
      return;
    }
    // 야간 광고 차단 — 광고성 + 예약 시각이 21~08시면 막는다(정보통신망법 제50조 제3항).
    if (ctx.value.isAd && isNightAt(ctx.value.scheduledAt)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.scheduledAt,
        path: ['scheduledAt'],
        message: '광고성 메시지는 21시~익일 8시에 예약할 수 없어요(야간 광고 전송 제한).',
      });
    }
  });

export type SmsFormValues = z.infer<typeof smsSchema>;
