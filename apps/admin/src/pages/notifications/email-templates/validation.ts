// 이메일 템플릿 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// SMS 템플릿과 같은 두 축(광고성 문구 차단 · 트리거가 주지 않는 변수 차단)을 보되, 이메일은 바이트가
// 아니라 글자수 상한이고 제목이 필수다. 야간 제한·(광고) 표기 검사는 여기 없다 — 정보성 알림이라
// 정보통신망법 제50조 적용 대상이 아니다.
import * as z from 'zod/mini';

import {
  detectAdWords,
  EMAIL_BODY_MAX,
  EMAIL_SUBJECT_MAX,
  TEMPLATE_NAME_MAX,
  TRIGGER_ID_VALUES,
  unknownVariablesFor,
} from '../_shared/notification';
import { requiredText } from '../../../shared/crud';

export const emailTemplateSchema = z
  .object({
    name: requiredText('템플릿명', TEMPLATE_NAME_MAX),
    trigger: z.enum(TRIGGER_ID_VALUES),
    subject: requiredText('제목', EMAIL_SUBJECT_MAX),
    body: requiredText('본문', EMAIL_BODY_MAX),
  })
  .check((ctx) => {
    // 광고성 문구 혼입 — 제목·본문 어느 쪽이든 광고가 섞이면 메시지 전체가 광고성이 된다.
    // 제목은 수신함에서 가장 먼저 읽히는 자리라 특히 광고 판정에 직결된다.
    const subjectWords = detectAdWords(ctx.value.subject);
    if (subjectWords.length > 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.subject,
        path: ['subject'],
        message: `제목에 광고성 문구(${subjectWords.join(', ')})가 있어 정보성 알림으로 보낼 수 없습니다. 광고성 발송은 마케팅 관리에서 하세요.`,
      });
    }
  })
  .check((ctx) => {
    const bodyWords = detectAdWords(ctx.value.body);
    if (bodyWords.length > 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: `본문에 광고성 문구(${bodyWords.join(', ')})가 있어 정보성 알림으로 보낼 수 없습니다. 광고성 발송은 마케팅 관리에서 하세요.`,
      });
    }
  })
  .check((ctx) => {
    // 트리거가 주지 않는 변수 — 제목·본문을 한 번에 본다(둘 다 치환 대상이다).
    const unknown = unknownVariablesFor(
      `${ctx.value.subject}\n${ctx.value.body}`,
      ctx.value.trigger,
    );
    if (unknown.length > 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: `이 이벤트가 주지 않는 변수(${unknown.join(', ')})가 있습니다. 아래 삽입 바에 있는 변수만 쓸 수 있습니다.`,
      });
    }
  });

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;
