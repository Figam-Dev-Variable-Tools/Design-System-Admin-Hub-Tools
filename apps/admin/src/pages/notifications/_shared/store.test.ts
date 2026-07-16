// 알림 관리 저장소 회귀 테스트 — 규칙↔템플릿 조회(화면 간 연결)와 정렬
//
// 쓰기 함수는 모듈 상태를 바꾸므로 테스트 간 순서 의존을 만들지 않도록 조회·연결 규칙만 검증한다
// (폼 검증은 각 화면의 *.test.ts, 순수 규칙은 notification.test.ts).
import { describe, expect, it } from 'vitest';

import {
  listEmailTemplates,
  listRules,
  listSmsTemplates,
  rulesUsingTemplate,
  templateNameOf,
  templateOptionsFor,
} from './store';

describe('템플릿 목록', () => {
  it('트리거 순서(주문→배송→계정→보안)로 정렬해 돌려준다', () => {
    const first = listEmailTemplates()[0];
    expect(first?.trigger.startsWith('order.')).toBe(true);
  });

  it('이메일·SMS 저장소가 서로 섞이지 않는다', () => {
    expect(listEmailTemplates().every((template) => template.id.startsWith('ntf-email-'))).toBe(
      true,
    );
    expect(listSmsTemplates().every((template) => template.id.startsWith('ntf-sms-'))).toBe(true);
  });
});

describe('규칙 ↔ 템플릿 연결', () => {
  it('규칙 폼 후보는 채널과 트리거가 둘 다 맞는 템플릿뿐이다', () => {
    const options = templateOptionsFor('sms', 'delivery.started');
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((option) => option.id.startsWith('ntf-sms-'))).toBe(true);

    // 그 이벤트의 SMS 템플릿이 없으면 후보가 비어야 한다(화면이 안내 배너를 띄운다)
    expect(templateOptionsFor('sms', 'account.dormant')).toHaveLength(0);
  });

  it('템플릿명을 채널별로 찾는다 — 없는 id 는 빈 문자열(화면이 경고를 띄운다)', () => {
    expect(templateNameOf('email', 'ntf-email-1')).toBe('주문 접수 안내');
    expect(templateNameOf('email', 'does-not-exist')).toBe('');
    // 채널이 어긋나면 찾지 못한다 — 이메일 저장소에서 SMS 템플릿 id 를 찾을 수 없다
    expect(templateNameOf('email', 'ntf-sms-1')).toBe('');
  });

  it('그 템플릿을 쓰는 규칙 수를 센다 — 끊어진 규칙 예방용', () => {
    expect(rulesUsingTemplate('ntf-email-1')).toBeGreaterThan(0);
    expect(rulesUsingTemplate('does-not-exist')).toBe(0);
  });
});

describe('규칙 목록', () => {
  it('모든 규칙이 실재하는 템플릿을 가리킨다(픽스처 무결성)', () => {
    for (const rule of listRules()) {
      expect(templateNameOf(rule.channel, rule.templateId)).not.toBe('');
    }
  });
});
