// 마케팅/메시징 순수 규칙 회귀 테스트 — 바이트·SMS 판정·야간·광고요건·치환변수·발송상태
import { describe, expect, it } from 'vitest';

import {
  applyVariableSamples,
  byteLengthOf,
  classifySms,
  countVariables,
  hasAdPrefix,
  hasOptOut,
  isEditableSend,
  isNightAt,
  isNightHour,
  isPhoneNumber,
  isSendableTemplate,
  isVariableOnlyBody,
  meetsAdRequirements,
  smsByteLimit,
  successRate,
  totalRecipients,
} from './messaging';
import type { Segment } from './messaging';

describe('byteLengthOf · classifySms (SMS 90 / LMS 2000)', () => {
  it('한글은 2byte, ASCII 는 1byte', () => {
    expect(byteLengthOf('abc')).toBe(3);
    expect(byteLengthOf('가나다')).toBe(6);
    expect(byteLengthOf('a가')).toBe(3);
  });
  it('90byte 이하는 SMS, 초과는 LMS', () => {
    expect(classifySms(90, false)).toBe('sms');
    expect(classifySms(91, false)).toBe('lms');
  });
  it('이미지가 있으면 MMS', () => {
    expect(classifySms(10, true)).toBe('mms');
  });
  it('유형별 바이트 한도', () => {
    expect(smsByteLimit('sms')).toBe(90);
    expect(smsByteLimit('lms')).toBe(2000);
    expect(smsByteLimit('mms')).toBe(2000);
  });
});

describe('야간 광고 전송 제한 (21~08시)', () => {
  it('21시부터 익일 8시 전까지 야간', () => {
    expect(isNightHour(21)).toBe(true);
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(7)).toBe(true);
    expect(isNightHour(8)).toBe(false);
    expect(isNightHour(20)).toBe(false);
  });
  it('예약 시각 문자열을 판정한다', () => {
    expect(isNightAt('2026-07-16T22:30')).toBe(true);
    expect(isNightAt('2026-07-16T14:00')).toBe(false);
    expect(isNightAt('잘못된값')).toBe(false);
  });
});

describe('광고 요건 ((광고) 표기 + 무료수신거부)', () => {
  it('(광고) 접두 판정', () => {
    expect(hasAdPrefix('(광고) 여름세일')).toBe(true);
    expect(hasAdPrefix('여름세일')).toBe(false);
  });
  it('무료수신거부 문구 판정', () => {
    expect(hasOptOut('무료수신거부 080-123-4567')).toBe(true);
    expect(hasOptOut('수신거부 080')).toBe(true);
    expect(hasOptOut('본문만 있음')).toBe(false);
  });
  it('둘 다 갖춰야 광고 요건 충족', () => {
    expect(meetsAdRequirements('(광고) 할인 무료수신거부 080')).toBe(true);
    expect(meetsAdRequirements('(광고) 할인')).toBe(false);
    expect(meetsAdRequirements('할인 무료수신거부')).toBe(false);
  });
});

describe('치환변수 (#{...})', () => {
  it('변수 개수를 센다', () => {
    expect(countVariables('#{이름}님 #{주문번호}')).toBe(2);
    expect(countVariables('변수 없음')).toBe(0);
  });
  it('변수만으로 이뤄진 본문을 가려낸다', () => {
    expect(isVariableOnlyBody('#{이름} #{쿠폰명}')).toBe(true);
    expect(isVariableOnlyBody('#{이름}님 안녕하세요')).toBe(false);
    expect(isVariableOnlyBody('')).toBe(false);
  });
  it('미리보기는 표본값으로 치환한다', () => {
    expect(applyVariableSamples('#{이름}님')).toBe('홍길동님');
  });
});

describe('발신번호 형식', () => {
  it('숫자 9~11자리를 허용한다', () => {
    expect(isPhoneNumber('025771000')).toBe(true);
    expect(isPhoneNumber('010-1234-5678')).toBe(true);
    expect(isPhoneNumber('12345')).toBe(false);
  });
});

describe('발송 상태 · 통계', () => {
  it('초안·예약만 편집 가능', () => {
    expect(isEditableSend('draft')).toBe(true);
    expect(isEditableSend('scheduled')).toBe(true);
    expect(isEditableSend('sent')).toBe(false);
    expect(isEditableSend('sending')).toBe(false);
  });
  it('성공률은 성공÷전체(0 방어)', () => {
    expect(successRate({ total: 100, success: 95, failed: 5 })).toBe(95);
    expect(successRate({ total: 0, success: 0, failed: 0 })).toBe(0);
  });
});

describe('알림톡 발송 가능 판정', () => {
  it('알림톡은 승인만 발송 가능', () => {
    expect(isSendableTemplate('alimtalk', 'approved')).toBe(true);
    expect(isSendableTemplate('alimtalk', 'inspecting')).toBe(false);
    expect(isSendableTemplate('alimtalk', 'rejected')).toBe(false);
  });
  it('SMS·이메일은 승인 개념 없이 항상 발송 가능', () => {
    expect(isSendableTemplate('sms', 'draft')).toBe(true);
    expect(isSendableTemplate('email', 'draft')).toBe(true);
  });
});

describe('세그먼트 수신자 합산', () => {
  const segments: readonly Segment[] = [
    { id: 'a', label: 'A', recipientCount: 100, description: '' },
    { id: 'b', label: 'B', recipientCount: 250, description: '' },
    { id: 'c', label: 'C', recipientCount: 30, description: '' },
  ];
  it('선택한 세그먼트 수신자 수를 합한다', () => {
    expect(totalRecipients(segments, ['a', 'c'])).toBe(130);
    expect(totalRecipients(segments, [])).toBe(0);
  });
});
