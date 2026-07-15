// 상담 예약 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
//
// 잘못된 희망일시(비실재 날짜·형식 오류)를 막는다. 상태 전이 규칙은 폼이 select 후보로 좁혀 강제한다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { isRealDate } from '../_shared/calendar';
import { CONSULT_BOOKING_NOTE_MAX, CONSULT_BOOKING_TOPIC_MAX } from './types';

const TIME_RE = /^\d{2}:\d{2}$/;

export const consultBookingSchema = z
  .object({
    customerName: requiredText('고객명', 40),
    customerPhone: requiredText('연락처', 20),
    channel: z.enum(['visit', 'phone', 'video']),
    topic: requiredText('상담 주제', CONSULT_BOOKING_TOPIC_MAX),
    preferredDate: z.string(),
    preferredTime: z.string(),
    staffId: z.string(),
    status: z.enum(['requested', 'confirmed', 'visited', 'noshow', 'cancelled']),
    note: z.string().check(
      z.refine((value) => value.trim().length <= CONSULT_BOOKING_NOTE_MAX, {
        error: `메모는 ${String(CONSULT_BOOKING_NOTE_MAX)}자를 넘을 수 없습니다.`,
      }),
    ),
  })
  .check((ctx) => {
    if (!isRealDate(ctx.value.preferredDate)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.preferredDate,
        path: ['preferredDate'],
        message: '희망 날짜를 YYYY-MM-DD 형식으로 입력하세요.',
      });
    }
  })
  .check((ctx) => {
    if (!TIME_RE.test(ctx.value.preferredTime)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.preferredTime,
        path: ['preferredTime'],
        message: '희망 시각을 HH:MM 형식으로 입력하세요.',
      });
    }
  });

export type ConsultBookingFormValues = z.infer<typeof consultBookingSchema>;
