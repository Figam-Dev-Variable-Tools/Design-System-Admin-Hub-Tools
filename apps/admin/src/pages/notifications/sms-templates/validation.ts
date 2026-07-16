// SMS 템플릿 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 마케팅 SMS 검증과 겹치지 않는 축만 본다:
//   · 마케팅에 있고 여기 없는 것 — (광고) 표기·무료수신거부 문구·야간(21~08시) 예약 차단.
//     정보성 알림엔 그 의무가 없다(정보통신망법 제50조는 광고성 정보에만 적용).
//   · 여기 있고 마케팅에 없는 것 — 광고성 문구 혼입 차단, 트리거가 주지 않는 변수 차단.
import * as z from 'zod/mini';

import {
  byteLengthOf,
  detectAdWords,
  LMS_MAX_BYTES,
  SMS_BODY_MAX,
  TEMPLATE_NAME_MAX,
  TRIGGER_ID_VALUES,
  unknownVariablesFor,
} from '../_shared/notification';
import { requiredText } from '../../../shared/crud';

export const smsTemplateSchema = z
  .object({
    name: requiredText('템플릿명', TEMPLATE_NAME_MAX),
    trigger: z.enum(TRIGGER_ID_VALUES),
    body: requiredText('본문', SMS_BODY_MAX),
  })
  .check((ctx) => {
    // 바이트 상한 — LMS 2,000byte 를 넘으면 발송사가 거절한다. 글자수(maxLength)와 다른 축이라 따로 본다.
    const bytes = byteLengthOf(ctx.value.body);
    if (bytes > LMS_MAX_BYTES) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: `본문이 ${String(bytes)} byte 라 LMS 한도(${String(LMS_MAX_BYTES)} byte)를 넘습니다. 문구를 줄여 주세요.`,
      });
    }
  })
  .check((ctx) => {
    // 광고성 문구 혼입 — 정보성 알림에 광고를 섞으면 메시지 전체가 광고성이 되어 (광고) 표기·야간제한·
    // 수신거부 의무가 생긴다. 이 섹션은 그 의무를 다루지 않으므로 저장을 막고 마케팅 관리로 보낸다.
    const words = detectAdWords(ctx.value.body);
    if (words.length > 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: `광고성 문구(${words.join(', ')})가 있어 정보성 알림으로 보낼 수 없습니다. 광고성 발송은 마케팅 관리에서 하세요.`,
      });
    }
  })
  .check((ctx) => {
    // 트리거가 주지 않는 변수 — 발송 때 빈칸으로 나가는 사고를 저장 전에 막는다.
    const unknown = unknownVariablesFor(ctx.value.body, ctx.value.trigger);
    if (unknown.length > 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: `이 이벤트가 주지 않는 변수(${unknown.join(', ')})가 있습니다. 아래 삽입 바에 있는 변수만 쓸 수 있습니다.`,
      });
    }
  });

export type SmsTemplateFormValues = z.infer<typeof smsTemplateSchema>;
