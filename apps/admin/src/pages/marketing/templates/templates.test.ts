// 발송 템플릿 폼 검증 회귀 테스트 — 채널별 제목 요건·알림톡 심사 규칙
import { describe, expect, it } from 'vitest';

import { templateSchema } from './validation';
import type { TemplateFormValues } from './validation';

function valuesOf(overrides: Partial<TemplateFormValues> = {}): TemplateFormValues {
  return {
    name: '주문 완료 안내',
    channel: 'sms',
    title: '',
    body: '#{이름}님, 주문이 접수되었습니다.',
    approvalStatus: 'draft',
    rejectReason: '',
    ...overrides,
  };
}

function messageFor(values: TemplateFormValues, path: string): string | undefined {
  const result = templateSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('templateSchema — 발송 템플릿 검증', () => {
  it('정상 SMS 템플릿은 통과한다', () => {
    expect(templateSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('템플릿명이 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
  });
  it('이메일은 제목이 필수다', () => {
    expect(messageFor(valuesOf({ channel: 'email', title: '' }), 'title')).toContain('입력');
    expect(
      templateSchema.safeParse(valuesOf({ channel: 'email', title: '이달의 소식' })).success,
    ).toBe(true);
  });
  it('SMS 는 제목 없이도 통과한다', () => {
    expect(templateSchema.safeParse(valuesOf({ channel: 'sms', title: '' })).success).toBe(true);
  });
  it('알림톡 본문이 변수만이면 막는다', () => {
    expect(
      messageFor(
        valuesOf({ channel: 'alimtalk', title: '안내', body: '#{이름} #{쿠폰명}' }),
        'body',
      ),
    ).toContain('변수만');
  });
  it('알림톡 정상 본문은 통과한다', () => {
    expect(
      templateSchema.safeParse(
        valuesOf({ channel: 'alimtalk', title: '배송 안내', body: '#{이름}님 배송 출발' }),
      ).success,
    ).toBe(true);
  });
});
