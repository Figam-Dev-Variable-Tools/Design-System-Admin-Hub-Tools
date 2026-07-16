// 알림 관리 도메인 회귀 테스트 — 조사·트리거·변수·광고성 감지·바이트 판정·규칙(순수)
import { describe, expect, it } from 'vitest';

import {
  applyVariableSamples,
  byteLengthOf,
  classifySms,
  countByCategory,
  countEnabled,
  detectAdWords,
  FILTER_ALL,
  filterByCategory,
  hasDuplicateRule,
  LMS_MAX_BYTES,
  parseCategoryFilter,
  searchRules,
  searchTemplates,
  smsByteLimit,
  smsKindLabel,
  SMS_MAX_BYTES,
  sortByTrigger,
  sortRules,
  triggerCategoryOf,
  triggerLabel,
  unknownVariablesFor,
  variablesFor,
} from './notification';
import type { NotificationRule, SmsTemplate } from './notification';

function ruleOf(overrides: Partial<NotificationRule> & { id: string }): NotificationRule {
  return {
    trigger: 'order.placed',
    channel: 'email',
    templateId: 'ntf-email-1',
    enabled: true,
    retryPolicy: 'once',
    updatedAt: '2026-07-10T10:00:00.000Z',
    ...overrides,
  };
}

function templateOf(overrides: Partial<SmsTemplate> & { id: string }): SmsTemplate {
  return {
    name: '주문 접수 안내',
    trigger: 'order.placed',
    body: '#{이름}님, 주문이 접수되었습니다.',
    updatedAt: '2026-07-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('트리거', () => {
  it('트리거 id 를 라벨·분류로 옮긴다', () => {
    expect(triggerLabel('order.placed')).toBe('주문 접수');
    expect(triggerLabel('security.verification-code')).toBe('인증번호 발송');
    expect(triggerCategoryOf('delivery.started')).toBe('delivery');
    expect(triggerCategoryOf('security.login-new-device')).toBe('security');
  });

  it('분류 필터 문자열을 좁힌다 — 모르는 값·null 은 전체', () => {
    expect(parseCategoryFilter('order')).toBe('order');
    expect(parseCategoryFilter('security')).toBe('security');
    expect(parseCategoryFilter('bogus')).toBe(FILTER_ALL);
    expect(parseCategoryFilter(null)).toBe(FILTER_ALL);
  });
});

describe('치환변수 — 트리거 종속', () => {
  it('공통 변수는 모든 트리거에서 쓸 수 있다', () => {
    const tokens = variablesFor('security.login-new-device').map((variable) => variable.token);
    expect(tokens).toContain('#{이름}');
  });

  it('그 이벤트가 주는 변수만 후보에 든다', () => {
    const delivery = variablesFor('delivery.started').map((variable) => variable.token);
    expect(delivery).toContain('#{송장번호}');
    expect(delivery).not.toContain('#{인증번호}');
  });

  it('그 이벤트가 주지 않는 변수를 잡아낸다', () => {
    expect(unknownVariablesFor('#{이름}님 #{인증번호}', 'delivery.started')).toEqual([
      '#{인증번호}',
    ]);
    expect(unknownVariablesFor('#{이름}님 #{송장번호}', 'delivery.started')).toEqual([]);
  });

  it('미리보기는 알려진 변수를 표본값으로 치환하고 모르는 것은 남긴다', () => {
    expect(applyVariableSamples('#{이름}님 안녕하세요')).toBe('홍길동님 안녕하세요');
    expect(applyVariableSamples('#{없는변수}')).toBe('#{없는변수}');
  });
});

describe('광고성 문구 감지 — 정보성 위장 광고 차단', () => {
  it('광고성 낱말이 섞이면 잡아낸다', () => {
    expect(detectAdWords('#{이름}님, 주문이 접수되었습니다.')).toEqual([]);
    expect(detectAdWords('#{이름}님, 30% 할인 쿠폰을 드립니다.')).toEqual(['할인', '쿠폰']);
  });

  it('순수 거래 문구는 통과한다 — 트랜잭션 알림엔 (광고) 표기가 필요 없다', () => {
    expect(detectAdWords('[스페이스플래닝] 인증번호 482913 을 입력해 주세요.')).toEqual([]);
  });
});

describe('바이트 · SMS/LMS 자동 판정 — COMP-12', () => {
  it('한글은 2byte, ASCII 는 1byte 로 센다', () => {
    expect(byteLengthOf('abc')).toBe(3);
    expect(byteLengthOf('가나다')).toBe(6);
    expect(byteLengthOf('a가')).toBe(3);
    expect(byteLengthOf('')).toBe(0);
  });

  it('90byte 경계에서 SMS→LMS 로 승격한다', () => {
    expect(classifySms(SMS_MAX_BYTES)).toBe('sms');
    expect(classifySms(SMS_MAX_BYTES + 1)).toBe('lms');
    expect(smsKindLabel(classifySms(10))).toBe('SMS');
    expect(smsKindLabel(classifySms(200))).toBe('LMS');
  });

  it('유형별 한도를 돌려준다', () => {
    expect(smsByteLimit('sms')).toBe(SMS_MAX_BYTES);
    expect(smsByteLimit('lms')).toBe(LMS_MAX_BYTES);
  });

  it('한글 45자면 이미 SMS 한도다 — 글자수와 바이트는 다른 축이다', () => {
    const text = '가'.repeat(45);
    expect(byteLengthOf(text)).toBe(90);
    expect(classifySms(byteLengthOf(text))).toBe('sms');
    expect(classifySms(byteLengthOf(`${text}가`))).toBe('lms');
  });
});

describe('필터 · 검색 · 정렬(순수)', () => {
  const rules = [
    ruleOf({ id: 'r1', trigger: 'order.placed', channel: 'email' }),
    ruleOf({ id: 'r2', trigger: 'delivery.started', channel: 'sms', enabled: false }),
    ruleOf({ id: 'r3', trigger: 'security.verification-code', channel: 'sms' }),
  ];

  it('분류로 거른다 — 전체는 그대로', () => {
    expect(filterByCategory(rules, FILTER_ALL)).toHaveLength(3);
    expect(filterByCategory(rules, 'delivery').map((rule) => rule.id)).toEqual(['r2']);
    expect(filterByCategory(rules, 'account')).toHaveLength(0);
  });

  it('분류별 건수를 센다 — 전체 포함', () => {
    const counts = countByCategory(rules);
    expect(counts[FILTER_ALL]).toBe(3);
    expect(counts.order).toBe(1);
    expect(counts.delivery).toBe(1);
    expect(counts.security).toBe(1);
    expect(counts.account).toBe(0);
  });

  it('켜진 규칙 수를 센다', () => {
    expect(countEnabled(rules)).toBe(2);
    expect(countEnabled([])).toBe(0);
  });

  it('규칙을 이벤트명·템플릿명으로 찾는다', () => {
    const nameOf = (rule: NotificationRule) => (rule.id === 'r3' ? '인증번호 문구' : '기타');
    expect(searchRules(rules, '배송', nameOf).map((rule) => rule.id)).toEqual(['r2']);
    expect(searchRules(rules, '인증번호 문구', nameOf).map((rule) => rule.id)).toEqual(['r3']);
    expect(searchRules(rules, '', nameOf)).toHaveLength(3);
  });

  it('규칙을 트리거 순서(주문→배송→계정→보안)로 정렬한다', () => {
    expect(sortRules(rules).map((rule) => rule.trigger)).toEqual([
      'order.placed',
      'delivery.started',
      'security.verification-code',
    ]);
  });

  it('템플릿을 트리거 순서로 정렬하고 같은 트리거는 이름순으로 둔다', () => {
    const templates = [
      templateOf({ id: 't1', trigger: 'security.verification-code', name: '인증번호' }),
      templateOf({ id: 't2', trigger: 'order.placed', name: '나 주문' }),
      templateOf({ id: 't3', trigger: 'order.placed', name: '가 주문' }),
    ];
    expect(sortByTrigger(templates).map((template) => template.id)).toEqual(['t3', 't2', 't1']);
  });

  it('템플릿을 이름·이벤트명으로 찾는다', () => {
    const templates = [
      templateOf({ id: 't1', name: '주문 접수 안내', trigger: 'order.placed' }),
      templateOf({ id: 't2', name: '배송 문구', trigger: 'delivery.started' }),
    ];
    expect(searchTemplates(templates, '배송 출발').map((template) => template.id)).toEqual(['t2']);
    expect(searchTemplates(templates, '주문 접수').map((template) => template.id)).toEqual(['t1']);
    expect(searchTemplates(templates, '')).toHaveLength(2);
  });
});

describe('중복 규칙 — 한 이벤트에 같은 채널 규칙은 하나뿐', () => {
  const rules = [
    ruleOf({ id: 'r1', trigger: 'order.placed', channel: 'email' }),
    ruleOf({ id: 'r2', trigger: 'order.placed', channel: 'sms' }),
  ];

  it('같은 트리거+채널이면 중복이다', () => {
    expect(hasDuplicateRule(rules, 'order.placed', 'email', null)).toBe(true);
  });

  it('채널이 다르면 중복이 아니다 — 한 이벤트에 이메일·SMS 를 하나씩 둘 수 있다', () => {
    expect(hasDuplicateRule(rules, 'order.paid', 'email', null)).toBe(false);
  });

  it('수정 중인 자기 자신은 중복으로 세지 않는다', () => {
    expect(hasDuplicateRule(rules, 'order.placed', 'email', 'r1')).toBe(false);
    expect(hasDuplicateRule(rules, 'order.placed', 'email', 'r2')).toBe(true);
  });
});
