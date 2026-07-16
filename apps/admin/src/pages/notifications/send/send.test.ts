// 발송 규칙 폼 검증 회귀 테스트 — 템플릿 연결 필수 · 트리거+채널 중복 금지(픽스처 저장소 기준)
import { describe, expect, it } from 'vitest';

import { createRuleSchema } from './validation';
import type { RuleFormValues } from './validation';
import { listRules } from '../_shared/store';

function valuesOf(overrides: Partial<RuleFormValues> = {}): RuleFormValues {
  return {
    // 픽스처에 없는 조합을 기본값으로 둔다 — 중복 검사에 걸리지 않는 '정상' 기준선
    trigger: 'order.canceled',
    channel: 'email',
    templateId: 'ntf-email-1',
    enabled: true,
    retryPolicy: 'once',
    ...overrides,
  };
}

function messageFor(
  values: RuleFormValues,
  path: string,
  selfId: string | null = null,
): string | undefined {
  const result = createRuleSchema(selfId).safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('createRuleSchema — 발송 규칙 검증', () => {
  it('정상 규칙은 통과한다', () => {
    expect(createRuleSchema(null).safeParse(valuesOf()).success).toBe(true);
  });

  it('템플릿을 고르지 않으면 막는다 — 이벤트가 와도 보낼 문구가 없다', () => {
    expect(messageFor(valuesOf({ templateId: '' }), 'templateId')).toContain('템플릿');
  });

  it('같은 이벤트+채널 규칙이 이미 있으면 막는다 — 알림이 두 번 나간다', () => {
    // 픽스처 ntf-rule-1 = order.placed + email
    const message = messageFor(valuesOf({ trigger: 'order.placed', channel: 'email' }), 'channel');
    expect(message).toContain('이미 있습니다');
    expect(message).toContain('주문 접수');
  });

  it('같은 이벤트라도 채널이 다르면 통과한다', () => {
    // 픽스처엔 account.created 의 email 규칙만 있다 → sms 는 새로 만들 수 있다
    expect(
      createRuleSchema(null).safeParse(
        valuesOf({ trigger: 'account.created', channel: 'sms', templateId: 'ntf-sms-1' }),
      ).success,
    ).toBe(true);
  });

  it('수정 중인 자기 자신은 중복으로 보지 않는다', () => {
    const self = listRules().find(
      (rule) => rule.trigger === 'order.placed' && rule.channel === 'email',
    );
    expect(self).toBeDefined();
    expect(
      messageFor(
        valuesOf({ trigger: 'order.placed', channel: 'email' }),
        'channel',
        self?.id ?? '',
      ),
    ).toBeUndefined();
  });
});
