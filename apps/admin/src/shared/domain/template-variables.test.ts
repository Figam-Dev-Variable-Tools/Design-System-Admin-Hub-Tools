// 치환 변수 — 카탈로그 자기검사 + 치환/검증 규칙
//
// [왜 카탈로그를 전수 검사하나] 항목이 150여 개고 손으로 늘어난다. 규칙(영문 점 표기·표본값
// 필수·중복 금지)을 사람의 주의력에 맡기면 반드시 새는데, 새는 방식이 조용하다 — 한글 키를
// 하나 섞어 넣어도 화면은 멀쩡히 그려지고 발송 단계에서야 치환이 안 된다. 규칙을 코드가 지킨다.
import { describe, expect, it, beforeEach } from 'vitest';

import { TEMPLATE_VARIABLE_CATALOG } from './template-variable-catalog';
import {
  applyTemplateVariableSamples,
  filterTemplateVariableGroups,
  findTemplateVariable,
  hasLengthShiftingVariables,
  isTemplateVariableKey,
  registerTemplateVariableCatalog,
  sampleSubstitutedCharCount,
  templateVariableCatalog,
  templateVariableKeysOf,
  templateVariableToken,
  unknownTemplateVariableKeys,
} from './template-variables';

const allVariables = TEMPLATE_VARIABLE_CATALOG.flatMap((group) => group.variables);

describe('카탈로그 자기검사', () => {
  it('사용자가 요구한 6개 도메인을 한국어 이름으로 모두 갖는다', () => {
    // 화면에서 고르는 층은 한국어다 — 영문 도메인명이 섞이면 그 자리만 읽는 방식이 달라진다
    expect(TEMPLATE_VARIABLE_CATALOG.map((group) => group.label)).toEqual([
      '회원',
      '영업',
      '콘텐츠',
      '상품',
      '포트폴리오',
      '고객센터',
    ]);
  });

  it('모든 키가 영문 lowerCamelCase 점 표기다', () => {
    // 한글 키는 인코딩·정규화(NFC/NFD)에서 조용히 어긋난다 — 대행사·백엔드와 주고받는 키다
    const offenders = allVariables.filter((v) => !isTemplateVariableKey(v.key));
    expect(offenders.map((v) => v.key)).toEqual([]);
  });

  it('키가 중복되지 않는다', () => {
    // 중복이 있으면 치환이 먼저 만난 것으로 덮이고, 고르는 화면에는 같은 줄이 두 번 보인다
    const keys = allVariables.map((v) => v.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('모든 항목이 한국어 라벨·표본값·근거 경로를 갖는다', () => {
    // 표본값이 비면 미리보기가 빈칸으로 나오고 '치환 후 예상 길이' 가 거짓말을 한다
    const incomplete = allVariables.filter(
      (v) => v.label.trim() === '' || v.sample.trim() === '' || v.source.trim() === '',
    );
    expect(incomplete.map((v) => v.key)).toEqual([]);
  });

  it('근거 경로가 실제 소스 트리를 가리킨다', () => {
    // 지어낸 항목을 막는 장치다 — 경로 형식이 무너지면 근거를 되짚을 수 없다
    const bad = allVariables.filter((v) => !v.source.startsWith('apps/admin/src/'));
    expect(bad.map((v) => v.key)).toEqual([]);
  });

  it('민감 값이 카탈로그에 없다', () => {
    // 비밀번호·카드번호·인증토큰·API키는 치환 변수가 되어서는 안 된다. 새 항목을 더하다가
    // 실수로 넣는 것을 여기서 막는다 (catalog 머리말 (가)).
    const forbidden = /password|passwd|secret|token|apikey|accesskey|card|cvc|resident|ssn|\bip\b/i;
    const hits = allVariables.filter((v) => forbidden.test(v.key));
    expect(hits.map((v) => v.key)).toEqual([]);
  });

  it('내부 전용 필드가 카탈로그에 없다', () => {
    /* 관리자 메모·신용등급·예상매출·실주사유 등은 고객이 보면 안 되는 값이다 (머리말 (나)).
     *
     * [왜 필드 이름이 아니라 전체 키로 적는가] 처음에는 'note' 같은 **필드 이름**으로 걸렀는데
     * `quote.note` 가 걸렸다. 그런데 그것은 내부 메모가 아니라 견적서에 **인쇄되어 고객에게
     * 그대로 가는 '비고'** 다(QuotePreview.tsx 가 그린다) — 오히려 발송 문구가 인용해야 할 값이다.
     * 같은 낱말이 도메인에 따라 정반대의 것을 가리키므로, 판단을 낱말이 아니라 엔티티까지
     * 포함한 전체 키에 건다. 낱말만 보고 막으면 멀쩡한 값이 조용히 빠진다. */
    const internal = [
      'member.memo',
      'account.note',
      'contract.note',
      'project.note',
      'project.probability',
      'project.expectedRevenue',
      'project.lostReason',
      'returnRequest.adminNote',
      'review.reportReason',
      'account.creditGrade',
      'account.creditLimit',
      'member.lastLoginIp',
      'ticket.contact',
      'ticket.body',
      'inquiry.contact',
      'inquiry.body',
    ];
    const hits = allVariables.filter((v) => internal.includes(v.key));
    expect(hits.map((v) => v.key)).toEqual([]);
  });
});

describe('토큰 표기', () => {
  it('`#{...}` 로 감싼다 — 솔라피·카카오 공통 문법', () => {
    expect(templateVariableToken('member.name')).toBe('#{member.name}');
  });

  it('규칙에 맞지 않는 키를 가려낸다', () => {
    expect(isTemplateVariableKey('member.name')).toBe(true);
    expect(isTemplateVariableKey('quote.totalAmount')).toBe(true);
    expect(isTemplateVariableKey('이름')).toBe(false); // 한글
    expect(isTemplateVariableKey('FIRST_NAME')).toBe(false); // 예전 표기
    expect(isTemplateVariableKey('member')).toBe(false); // 점이 없다
    expect(isTemplateVariableKey('a.b.c')).toBe(false); // 깊이 2 초과
    expect(isTemplateVariableKey('Member.name')).toBe(false); // 대문자 시작
  });

  it('본문에서 토큰 키를 등장 순서대로, 중복 없이 뽑는다', () => {
    expect(templateVariableKeysOf('#{member.name}님 #{quote.quoteNo} #{member.name}')).toEqual([
      'member.name',
      'quote.quoteNo',
    ]);
    expect(templateVariableKeysOf('변수 없음')).toEqual([]);
  });
});

/* ── 배선 전/후 ────────────────────────────────────────────────────────────────
 *
 * 이 구분이 이 모듈의 핵심이다 — '비었다' 와 '모른다' 를 뭉개면 알 수 없는 토큰 경고가
 * 멀쩡한 본문을 전부 오타로 신고한다. */
describe('배선되지 않았을 때 — 판정을 보류한다', () => {
  beforeEach(() => {
    // 모듈 전역이라 테스트 순서에 기대지 않도록 매번 명시적으로 되돌린다
    registerTemplateVariableCatalog([]);
  });

  it('빈 카탈로그는 null 이 아니다 — 등록은 되었고 목록이 비었을 뿐이다', () => {
    expect(templateVariableCatalog()).toEqual([]);
  });

  it('빈 카탈로그에서는 모든 토큰이 알 수 없는 토큰이다', () => {
    expect(unknownTemplateVariableKeys('#{member.name}')).toEqual(['member.name']);
  });
});

describe('배선된 뒤', () => {
  beforeEach(() => {
    registerTemplateVariableCatalog(TEMPLATE_VARIABLE_CATALOG);
  });

  it('키로 항목을 찾는다', () => {
    expect(findTemplateVariable('member.name')?.label).toBe('이름');
    expect(findTemplateVariable('quote.totalAmount')?.label).toBe('견적 합계금액');
    expect(findTemplateVariable('nope.here')).toBeUndefined();
  });

  it('아는 토큰을 표본값으로 치환한다', () => {
    expect(applyTemplateVariableSamples('#{member.name}님 안녕하세요')).toBe('명재우님 안녕하세요');
  });

  it('모르는 토큰은 지우지 않고 그대로 남긴다', () => {
    // 지우면 미리보기가 깨끗해지고, 그 깨끗함이 '문제 없음' 으로 읽힌다. 드러내는 것이 목적이다.
    expect(applyTemplateVariableSamples('#{member.name} / #{typo.here}')).toBe(
      '명재우 / #{typo.here}',
    );
  });

  it('카탈로그에 없는 토큰만 골라낸다', () => {
    expect(unknownTemplateVariableKeys('#{member.name} #{typo.here} #{quote.quoteNo}')).toEqual([
      'typo.here',
    ]);
    expect(unknownTemplateVariableKeys('#{member.name}')).toEqual([]);
  });

  it('카탈로그의 모든 토큰은 스스로 검증을 통과한다', () => {
    // 고르기 패널이 꽂아 준 것이 저장에서 막히면 기능이 자기모순이다
    const body = allVariables.map((v) => templateVariableToken(v.key)).join(' ');
    expect(unknownTemplateVariableKeys(body)).toEqual([]);
  });
});

describe('검색', () => {
  it('한국어 라벨로 찾는다', () => {
    const groups = filterTemplateVariableGroups(TEMPLATE_VARIABLE_CATALOG, '쿠폰');
    const keys = groups.flatMap((g) => g.variables.map((v) => v.key));
    expect(keys).toContain('coupon.code');
  });

  it('영문 토큰으로도 찾는다 — 본문을 검수하는 사람은 토큰을 보고 온다', () => {
    const groups = filterTemplateVariableGroups(TEMPLATE_VARIABLE_CATALOG, 'quote.total');
    expect(groups.flatMap((g) => g.variables.map((v) => v.key))).toEqual(['quote.totalAmount']);
  });

  it('도메인 이름이 걸리면 그 그룹을 통째로 남긴다', () => {
    const groups = filterTemplateVariableGroups(TEMPLATE_VARIABLE_CATALOG, '포트폴리오');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('포트폴리오');
    // '전부' 여야 한다 — 라벨에 '포트폴리오' 가 없는 caseStudy 항목까지 보여야 한다
    expect(groups[0]?.variables.some((v) => v.key.startsWith('caseStudy.'))).toBe(true);
  });

  it('빈 검색어는 전체를 준다', () => {
    expect(filterTemplateVariableGroups(TEMPLATE_VARIABLE_CATALOG, '  ')).toEqual(
      TEMPLATE_VARIABLE_CATALOG,
    );
  });
});

/* ── 치환 후 길이 ─────────────────────────────────────────────────────────────
 *
 * 문자·알림톡은 글자수 상한이 있는데 편집기가 세는 것은 '작성 중인 글자' 이고 상한이 걸리는
 * 것은 '발송되는 글자' 다. 그 둘이 다르다는 사실 자체가 이 기능의 존재 이유다. */
describe('치환 후 길이', () => {
  beforeEach(() => {
    registerTemplateVariableCatalog(TEMPLATE_VARIABLE_CATALOG);
  });

  it('토큰보다 표본값이 짧으면 줄어든다', () => {
    const body = '#{member.name}'; // 14자 → '명재우' 3자
    expect(body.length).toBe(14);
    expect(sampleSubstitutedCharCount(body)).toBe(3);
  });

  it('토큰보다 표본값이 길면 늘어난다', () => {
    // '#{member.address}' 17자 → '서울특별시 강남구 테헤란로 123' 21자
    expect(sampleSubstitutedCharCount('#{member.address}')).toBeGreaterThan(
      '#{member.address}'.length,
    );
  });

  it('토큰이 없으면 안내할 것이 없다', () => {
    expect(hasLengthShiftingVariables('토큰 없는 본문')).toBe(false);
    expect(hasLengthShiftingVariables('#{member.name}님')).toBe(true);
  });
});

/* ── 문법 경계 ────────────────────────────────────────────────────────────────
 *
 * 고객센터 답변 템플릿은 `{{고객명}}` 을 쓴다(삽입 시점 치환). 마케팅 발송 본문에 그것이
 * 섞이면 발송 경로가 모르는 문법이라 수신자에게 글자 그대로 간다 — 오타 토큰과 같은 사고다.
 * 판정은 `message-templates/validation.ts` 의 unknownVariableError 가 하고, 여기서는 그
 * 판정이 기대는 사실(카탈로그 쪽 함수가 `{{...}}` 를 토큰으로 세지 않는다)을 못 박는다. */
describe('문법 경계 — `{{...}}` 는 이 카탈로그의 토큰이 아니다', () => {
  beforeEach(() => {
    registerTemplateVariableCatalog(TEMPLATE_VARIABLE_CATALOG);
  });

  it('토큰으로 세지 않는다', () => {
    expect(templateVariableKeysOf('{{고객명}}님')).toEqual([]);
  });

  it('치환하지 않고 그대로 남긴다', () => {
    expect(applyTemplateVariableSamples('{{고객명}}님')).toBe('{{고객명}}님');
  });

  it('미지 토큰 목록에도 오르지 않는다 — 그래서 별도 검사가 필요하다', () => {
    // 이 단언이 unknownVariableError 가 `{{...}}` 를 따로 보는 이유다:
    // 여기서 잡히지 않으므로 그쪽이 잡지 않으면 아무도 잡지 않는다.
    expect(unknownTemplateVariableKeys('{{고객명}}님')).toEqual([]);
  });
});
