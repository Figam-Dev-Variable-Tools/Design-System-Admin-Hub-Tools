// SMS 템플릿 폼 검증 회귀 테스트 — 바이트 한도·광고성 문구 차단·트리거 변수 종속·조사
import { describe, expect, it } from 'vitest';

import { smsTemplateSchema } from './validation';
import type { SmsTemplateFormValues } from './validation';

function valuesOf(overrides: Partial<SmsTemplateFormValues> = {}): SmsTemplateFormValues {
  return {
    name: '주문 접수 안내(SMS)',
    trigger: 'order.placed',
    body: '[스페이스플래닝] #{이름}님, 주문(#{주문번호})이 접수되었습니다.',
    ...overrides,
  };
}

function messageFor(values: SmsTemplateFormValues, path: string): string | undefined {
  const result = smsTemplateSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('smsTemplateSchema — SMS 템플릿 검증', () => {
  it('정상 템플릿은 통과한다', () => {
    expect(smsTemplateSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('템플릿명이 비면 막는다 — 조사는 받침에 맞춘다(ERP-13)', () => {
    const message = messageFor(valuesOf({ name: '' }), 'name');
    expect(message).toBe('템플릿명을 입력하세요.');
    expect(message).not.toContain('을(를)');
  });

  it('본문이 비면 막는다 — 조사는 받침에 맞춘다(ERP-13)', () => {
    expect(messageFor(valuesOf({ body: '' }), 'body')).toBe('본문을 입력하세요.');
  });

  it('LMS 한도(2,000byte)를 넘으면 막는다', () => {
    // 한글 1자 = 2byte → 1,001자면 2,002byte
    const message = messageFor(valuesOf({ body: '가'.repeat(1001) }), 'body');
    expect(message).toContain('LMS 한도');
  });

  it('제약은 글자수가 아니라 바이트다 — 2,000자 영문(2,000byte)은 통과한다', () => {
    // 글자수 cap 을 1,000 으로 잡으면 적법한 영문 본문이 이유 없이 막힌다(회귀 방지).
    expect(smsTemplateSchema.safeParse(valuesOf({ body: 'a'.repeat(2000) })).success).toBe(true);
    // 같은 글자수라도 한글이면 2배라 막힌다
    expect(smsTemplateSchema.safeParse(valuesOf({ body: '가'.repeat(2000) })).success).toBe(false);
  });

  it('90byte 를 넘어도 LMS 로 승격될 뿐 저장은 막지 않는다', () => {
    expect(smsTemplateSchema.safeParse(valuesOf({ body: '가'.repeat(100) })).success).toBe(true);
  });

  it('광고성 문구가 섞이면 막고 마케팅 관리로 보낸다', () => {
    const message = messageFor(
      valuesOf({ body: '#{이름}님, 할인 쿠폰이 발급되었습니다.' }),
      'body',
    );
    expect(message).toContain('광고성 문구');
    expect(message).toContain('마케팅 관리');
  });

  it('그 이벤트가 주지 않는 변수를 쓰면 막는다', () => {
    const message = messageFor(
      valuesOf({ trigger: 'order.placed', body: '#{이름}님 #{송장번호}' }),
      'body',
    );
    expect(message).toContain('#{송장번호}');
  });

  it('그 이벤트가 주는 변수는 통과한다', () => {
    expect(
      smsTemplateSchema.safeParse(
        valuesOf({ trigger: 'delivery.started', body: '#{이름}님 #{송장번호} 출발' }),
      ).success,
    ).toBe(true);
  });
});
