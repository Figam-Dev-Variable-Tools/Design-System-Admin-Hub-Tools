// 알림 발송 규칙 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 마케팅 발송 폼과 겹치는 검증이 하나도 없다 — 저긴 발신번호 사전등록·세그먼트 선택·예약시각 과거/야간
// 검사를 하고, 여긴 그 어느 것도 없다(수신자·시점을 이벤트가 정하므로 고를 값 자체가 없다).
// 대신 이 도메인 고유의 두 가지를 본다: 템플릿 연결 필수 · 트리거+채널 중복 금지.
//
// [왜 팩토리인가] '중복 금지'는 한 레코드만 봐서는 판정할 수 없다 — 다른 규칙들과 견줘야 한다.
//   그래서 스키마가 저장소 목록을 읽고, 수정 중인 자신은 제외해야 하므로 selfId 를 받아 스키마를 만든다.
//   (실 백엔드라면 서버가 409 로 거절할 규칙이다 — 백엔드가 없는 동안 픽스처 저장소로 같은 규칙을 지킨다.)
import * as z from 'zod/mini';

import {
  hasDuplicateRule,
  notificationChannelLabel,
  NOTIFICATION_CHANNEL_VALUES,
  RETRY_POLICY_VALUES,
  triggerLabel,
  TRIGGER_ID_VALUES,
} from '../_shared/notification';
import { listRules } from '../_shared/store';

/** selfId — 수정 중인 규칙 id(등록이면 null). 중복 검사에서 자기 자신을 제외한다 */
export function createRuleSchema(selfId: string | null) {
  return z
    .object({
      trigger: z.enum(TRIGGER_ID_VALUES),
      channel: z.enum(NOTIFICATION_CHANNEL_VALUES),
      templateId: z.string(),
      enabled: z.boolean(),
      retryPolicy: z.enum(RETRY_POLICY_VALUES),
    })
    .check((ctx) => {
      // 템플릿 연결 — 문구가 없으면 이벤트가 와도 보낼 것이 없다.
      if (ctx.value.templateId.trim() === '') {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.templateId,
          path: ['templateId'],
          message: '이 이벤트에 쓸 템플릿을 고르세요.',
        });
      }
    })
    .check((ctx) => {
      // 트리거+채널 중복 — 한 이벤트에 같은 채널 규칙이 둘이면 수신자가 같은 알림을 두 번 받는다.
      // 마케팅엔 없는 검사다(캠페인은 같은 대상에 여러 번 보내는 것이 정상이다).
      if (hasDuplicateRule(listRules(), ctx.value.trigger, ctx.value.channel, selfId)) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.channel,
          path: ['channel'],
          message: `'${triggerLabel(ctx.value.trigger)}' 이벤트의 ${notificationChannelLabel(ctx.value.channel)} 규칙이 이미 있습니다. 수신자가 같은 알림을 두 번 받게 되므로 기존 규칙을 수정해 주세요.`,
        });
      }
    });
}

export type RuleFormValues = z.infer<ReturnType<typeof createRuleSchema>>;
