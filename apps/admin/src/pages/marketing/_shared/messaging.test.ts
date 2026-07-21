// 마케팅/메시징 순수 규칙 회귀 테스트 — 바이트·SMS 판정·야간·광고요건·치환변수·발송상태
//   + 발신 표시 이름(사이트 기본 설정) 주입
import { afterEach, describe, expect, it } from 'vitest';

// 치환은 카탈로그가 배선된 뒤에만 일어난다 — 배선 전에는 '모른다' 라서 원문을 그대로 준다
// (shared/domain/template-variables.ts 머리말). 그래서 이 테스트는 배선을 명시적으로 건다.
import { wireDomains } from '../../../wiring';
import {
  registerSitePolicyLookup,
  resetSitePolicyLookup,
} from '../../../shared/domain/site-policy';
import {
  applyVariableSamples,
  byteLengthOf,
  classifySms,
  countVariables,
  hasAdPrefix,
  hasOptOut,
  isNightAt,
  isNightHour,
  isPhoneNumber,
  isSendableTemplate,
  isTemplateContentLocked,
  isVariableOnlyBody,
  meetsAdRequirements,
  messagingNameOf,
  prefixMessagingName,
  sendActionsFor,
  smsByteLimit,
  successRate,
  totalRecipients,
  withMessagingName,
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
    // 목록의 정본이 6개 도메인 카탈로그로 옮겨 가면서 토큰이 한글에서 영문 점 표기가 됐다
    // (`#{이름}` → `#{member.name}`). 규칙과 근거는 shared/domain/template-variables.ts 머리말.
    // 이 파일이 검사하는 것은 '치환이 일어나는가' 이고, 카탈로그 내용 자체는 그쪽 테스트가 본다.
    wireDomains();
    expect(applyVariableSamples('#{member.name}님')).toBe('명재우님');
  });

  it('카탈로그에 없는 토큰은 치환하지 않고 남긴다', () => {
    // 지우면 미리보기가 깨끗해지고 운영자는 오타를 못 본 채 발송한다
    wireDomains();
    expect(applyVariableSamples('#{typo.here}')).toBe('#{typo.here}');
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
    expect(sendActionsFor('draft').canEdit).toBe(true);
    expect(sendActionsFor('scheduled').canEdit).toBe(true);
    expect(sendActionsFor('sent').canEdit).toBe(false);
    expect(sendActionsFor('sending').canEdit).toBe(false);
    // 취소된 캠페인도 편집 대상이 아니다 — 되살리려면 새로 만든다(이력을 덮어쓰지 않는다)
    expect(sendActionsFor('canceled').canEdit).toBe(false);
  });

  /**
   * 예약만 취소한다 — 취소는 '아직 일어나지 않은 실행을 물린다' 는 뜻이다.
   * 초안은 물릴 실행이 없고, 발송중·발송완료는 이미 나간 것이라 물릴 수 없다.
   */
  it('예약만 취소 가능', () => {
    expect(sendActionsFor('scheduled').canCancel).toBe(true);
    expect(sendActionsFor('draft').canCancel).toBe(false);
    expect(sendActionsFor('sending').canCancel).toBe(false);
    expect(sendActionsFor('sent').canCancel).toBe(false);
    expect(sendActionsFor('canceled').canCancel).toBe(false);
  });

  /** 발송중만 삭제할 수 없다 — 실행 중인 작업의 원본을 지우면 결과를 붙일 곳이 사라진다 */
  it('발송중만 삭제 불가', () => {
    expect(sendActionsFor('sending').canDelete).toBe(false);
    expect(sendActionsFor('draft').canDelete).toBe(true);
    expect(sendActionsFor('scheduled').canDelete).toBe(true);
    expect(sendActionsFor('sent').canDelete).toBe(true);
    expect(sendActionsFor('canceled').canDelete).toBe(true);
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

describe('심사에 걸린 템플릿 내용 잠금', () => {
  it('알림톡은 승인·검수중이면 잠긴다 — 승인은 그 문구에 대한 것이라 고치면 무효가 된다', () => {
    expect(isTemplateContentLocked('alimtalk', 'approved')).toBe(true);
    expect(isTemplateContentLocked('alimtalk', 'inspecting')).toBe(true);
  });

  it('반려는 잠기지 않는다 — 고쳐서 다시 내는 것이 반려의 목적이다', () => {
    expect(isTemplateContentLocked('alimtalk', 'rejected')).toBe(false);
    expect(isTemplateContentLocked('alimtalk', 'draft')).toBe(false);
  });

  it('SMS·이메일은 심사가 없으므로 어떤 상태에서도 잠기지 않는다', () => {
    // 픽스처의 SMS 템플릿은 approvalStatus 가 'approved' 다 — 승인 개념이 없는 채널에서
    // 그 값을 잠금 근거로 삼으면 문자 템플릿이 통째로 수정 불가가 된다.
    expect(isTemplateContentLocked('sms', 'approved')).toBe(false);
    expect(isTemplateContentLocked('email', 'approved')).toBe(false);
    expect(isTemplateContentLocked('sms', 'inspecting')).toBe(false);
  });
});

/* ── 발신 표시 이름 (사이트 기본 설정 → 발송 본문/제목) ──────────────────────── */

/** 배선을 흉내 낸다 — 진짜 배선(src/wiring.ts)이 하는 일과 계약이 같다 */
function wireMessagingName(name: string): void {
  registerSitePolicyLookup(() => ({ messagingName: name, keepSignedIn: false }));
}

describe('발신 표시 이름 — 순수 규칙(prefixMessagingName)', () => {
  it('본문 앞에 `[이름] ` 을 붙인다 — 설정 화면이 약속한 바로 그 자리다', () => {
    expect(prefixMessagingName('여름세일 안내', 'TDS 고객센터')).toBe(
      '[TDS 고객센터] 여름세일 안내',
    );
  });

  it('이름이 비면 원문 그대로 — 미배선과 미사용이 같은 결과로 수렴한다', () => {
    expect(prefixMessagingName('여름세일 안내', '')).toBe('여름세일 안내');
    expect(prefixMessagingName('여름세일 안내', '   ')).toBe('여름세일 안내');
  });

  it('본문이 비면 붙이지 않는다 — 아직 아무것도 안 쓴 칸에 접두만 뜨면 미리보기가 거짓말한다', () => {
    expect(prefixMessagingName('', 'TDS 고객센터')).toBe('');
    expect(prefixMessagingName('  ', 'TDS 고객센터')).toBe('  ');
  });

  /**
   * 겹쳐 쌓이면 바이트만 먹다가 SMS 가 조용히 LMS 로 승격된다 — 화면에는 아무 사건도 없다.
   * 템플릿 불러오기·저장된 초안 다시 열기가 실제로 이 경로를 밟는다.
   */
  it('이미 그 이름으로 시작하면 다시 붙이지 않는다', () => {
    const once = prefixMessagingName('여름세일', 'TDS');
    expect(prefixMessagingName(once, 'TDS')).toBe(once);
  });

  it('다른 이름의 대괄호는 접두로 보지 않는다 — 운영자가 적은 `[공지]` 는 본문이다', () => {
    expect(prefixMessagingName('[공지] 점검', 'TDS')).toBe('[TDS] [공지] 점검');
  });
});

describe('발신 표시 이름 — 설정 주입 결과(withMessagingName)', () => {
  afterEach(() => {
    resetSitePolicyLookup();
  });

  it('배선이 없으면 원문 그대로다 — 설정 화면이 없는 곳에서도 발송 폼은 돈다', () => {
    resetSitePolicyLookup();
    expect(messagingNameOf()).toBe('');
    expect(withMessagingName('여름세일 안내')).toBe('여름세일 안내');
  });

  it('설정을 꽂으면 발송 본문에 그 이름이 나타난다', () => {
    wireMessagingName('TDS 스페이스플래닝 고객센터');
    expect(messagingNameOf()).toBe('TDS 스페이스플래닝 고객센터');
    expect(withMessagingName('여름세일 안내')).toBe('[TDS 스페이스플래닝 고객센터] 여름세일 안내');
  });

  /**
   * **이 테스트가 이 기능의 이유다.** 설정 화면이 전용 이름만 바이트로 세는 까닭은 그 이름이
   * 90byte 예산을 먼저 먹기 때문인데, 발송 화면이 접두를 모르면 운영자는 SMS 로 보이는 문자를
   * LMS 단가로 받아 든다. 접두를 포함해 세야 화면의 등급과 실제 등급이 같아진다.
   */
  it('접두가 90byte 경계를 앞당긴다 — 같은 본문이 SMS 에서 LMS 로 넘어간다', () => {
    const body = '가'.repeat(40); // 80 byte — 접두가 없으면 SMS
    expect(classifySms(byteLengthOf(body), false)).toBe('sms');

    wireMessagingName('스페이스플래닝'); // '[스페이스플래닝] ' = 14 + 2 + 1 = 17 byte
    const sendBody = withMessagingName(body);
    expect(byteLengthOf(sendBody)).toBe(97);
    expect(classifySms(byteLengthOf(sendBody), false)).toBe('lms');
  });

  it('빈 본문은 접두도 바이트도 얻지 않는다 — 보낼 것이 없으면 붙일 것도 없다', () => {
    wireMessagingName('TDS');
    expect(byteLengthOf(withMessagingName(''))).toBe(0);
  });

  it('조회기가 던져도 발송 화면은 멈추지 않는다 — 설정 쪽 사고가 여기로 번지지 않는다', () => {
    registerSitePolicyLookup(() => {
      throw new Error('설정 저장소 사고');
    });
    expect(withMessagingName('여름세일 안내')).toBe('여름세일 안내');
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
