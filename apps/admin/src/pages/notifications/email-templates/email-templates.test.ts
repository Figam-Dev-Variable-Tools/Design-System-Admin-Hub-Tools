// 이메일 템플릿 폼 검증 회귀 테스트 — 제목 필수·광고성 문구 차단(제목/본문)·트리거 변수 종속
import { describe, expect, it } from 'vitest';

import { emailTemplateSchema } from './validation';
import type { EmailTemplateFormValues } from './validation';

function valuesOf(overrides: Partial<EmailTemplateFormValues> = {}): EmailTemplateFormValues {
  return {
    name: '주문 접수 안내',
    trigger: 'order.placed',
    subject: '[스페이스플래닝] 주문이 접수되었습니다 (#{주문번호})',
    body: '#{이름}님, 주문이 정상 접수되었습니다.',
    ...overrides,
  };
}

function messageFor(values: EmailTemplateFormValues, path: string): string | undefined {
  const result = emailTemplateSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('emailTemplateSchema — 이메일 템플릿 검증', () => {
  it('정상 템플릿은 통과한다', () => {
    expect(emailTemplateSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('제목이 비면 막는다 — 조사는 받침에 맞춘다(ERP-13)', () => {
    const message = messageFor(valuesOf({ subject: '' }), 'subject');
    expect(message).toBe('제목을 입력하세요.');
    expect(message).not.toContain('을(를)');
  });

  it('제목 길이 상한을 넘으면 막는다 — 조사는 받침에 맞춘다', () => {
    const message = messageFor(valuesOf({ subject: '가'.repeat(101) }), 'subject');
    expect(message).toBe('제목은 100자를 넘을 수 없습니다.');
    expect(message).not.toContain('은(는)');
  });

  it('제목에 광고성 문구가 섞이면 막는다 — 수신함에서 먼저 읽히는 자리다', () => {
    const message = messageFor(valuesOf({ subject: '[스페이스플래닝] 여름 세일 안내' }), 'subject');
    expect(message).toContain('광고성 문구');
    expect(message).toContain('마케팅 관리');
  });

  it('본문에 광고성 문구가 섞이면 막는다', () => {
    const message = messageFor(valuesOf({ body: '#{이름}님, 쿠폰을 드립니다.' }), 'body');
    expect(message).toContain('광고성 문구');
  });

  it('제목·본문을 함께 보고 트리거가 주지 않는 변수를 막는다', () => {
    expect(messageFor(valuesOf({ subject: '인증 #{인증번호}' }), 'body')).toContain('#{인증번호}');
    expect(messageFor(valuesOf({ body: '#{송장번호}' }), 'body')).toContain('#{송장번호}');
  });

  it('그 이벤트가 주는 변수는 제목·본문 모두에서 통과한다', () => {
    expect(
      emailTemplateSchema.safeParse(
        valuesOf({
          trigger: 'account.password-reset',
          subject: '비밀번호 재설정 인증번호',
          body: '#{이름}님, 인증번호 #{인증번호} 를 입력해 주세요.',
        }),
      ).success,
    ).toBe(true);
  });
});
