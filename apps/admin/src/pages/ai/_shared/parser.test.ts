// 파서 계약 — 이 화면이 **거짓말하지 않는다**는 사실을 여기서 못 박는다
//
// [무엇을 지키는가] 이 앱에는 LLM 이 없다. 그래서 파서가 못 알아들은 문장을 그럴듯한 답으로
// 메우면 그것은 곧 조작된 답이다. 아래 테스트는 두 가지를 대칭으로 고정한다.
//   1) 알아듣는 문장은 **정확히** 그 질의가 된다 (지어낸 조건이 붙지 않는다)
//   2) 못 알아듣는 문장은 **실패로 남는다** (kind 가 'ok' 가 되지 않는다)
//
// [왜 이 테스트가 공허하지 않은가] 조건 배열을 통째로 비교한다. 파서가 조건을 하나 더 만들어
// 붙이거나(과잉 해석) 빠뜨리면(과소 해석) 배열 비교가 깨진다 — 개수만 세면 둘 다 놓친다.
import { beforeAll, describe, expect, it } from 'vitest';

// 값으로 거는 조건(판매상태·처리상태·우선순위·진행상태)의 목록은 각 도메인이 소유하고
// 배선이 꽂는다 — 파서 안에는 그 어휘가 없다(pages/ai/_shared/domains.ts 머리말).
// 배선하지 않고 돌리면 이 파일은 제품이 아니라 '값을 모르는 상태' 를 검증하게 된다.
import { wireAiDomainValues } from '../../../wiring-ai';
import { parseQuery } from './parser';
import type { Condition, ParseResult } from './parser';

beforeAll(() => {
  wireAiDomainValues();
});

/** 성공 결과만 꺼낸다 — 실패면 그 자리에서 테스트를 세운다(뒤에서 optional chaining 으로 조용히 통과하지 않게) */
function expectOk(result: ParseResult) {
  if (result.kind !== 'ok') {
    throw new Error(`파싱이 성공해야 하는데 '${result.kind}' 였다`);
  }
  return result.query;
}

function conditionOf(conditions: readonly Condition[], fieldId: string): Condition | undefined {
  return conditions.find((condition) => condition.fieldId === fieldId);
}

describe('parseQuery — 사용자 예시 질의 (누적 구매액에는 기간이 없다)', () => {
  const INPUT = '@고객목록 의 이번달 구매 VIP 뽑아줘';

  it("'@고객목록' 을 회원 도메인으로 읽고 목록 의도로 본다", () => {
    const query = expectOk(parseQuery(INPUT));
    expect(query.domainId).toBe('members');
    expect(query.intent).toBe('list');
  });

  it("'이번달' 을 누적 구매액에 걸지 않고, 걸 수 없다고 통지한다", () => {
    const query = expectOk(parseQuery(INPUT));

    // 기간 조건이 **만들어지지 않았다** — 이것이 핵심이다.
    // 만들어졌다면 화면은 누적 구매액을 '이번달 구매' 인 척 보여주게 된다.
    expect(conditionOf(query.conditions, 'joinedAt')).toBeUndefined();
    expect(query.conditions.some((condition) => condition.kind === 'period')).toBe(false);

    expect(query.notices).toHaveLength(1);
    expect(query.notices[0]?.code).toBe('period-unsupported');
    expect(query.notices[0]?.message).toContain('누적 구매액');
    expect(query.notices[0]?.message).toContain('이번달');
  });

  it('기간을 뺀 나머지 조건(등급 VIP · 구매 이력 있음)은 그대로 실행된다', () => {
    const query = expectOk(parseQuery(INPUT));

    expect(query.conditions).toEqual([
      { kind: 'equals', fieldId: 'tier', valueId: 'vip', label: '등급 VIP' },
      { kind: 'present', fieldId: 'totalPurchase', label: '누적 구매액 있음' },
    ]);
  });

  it('대신 해볼 수 있는 질의를 제안한다 (가입일은 기간으로 걸린다)', () => {
    const query = expectOk(parseQuery(INPUT));
    const suggestion = query.notices[0]?.suggestion;
    expect(suggestion).not.toBeNull();
    expect(suggestion).toContain('가입');

    // 제안이 실제로 파싱되는 질의여야 한다 — 막다른 길을 제안하지 않는다
    const followUp = parseQuery(suggestion ?? '');
    const followUpQuery = expectOk(followUp);
    expect(followUpQuery.notices).toEqual([]);
    expect(conditionOf(followUpQuery.conditions, 'joinedAt')?.kind).toBe('period');
  });
});

describe('parseQuery — 기간 결합(binding)', () => {
  it("'이번달 가입한 VIP' 는 가입일에 기간을 건다", () => {
    const query = expectOk(parseQuery('@회원목록 이번달 가입한 VIP 보여줘'));
    const period = conditionOf(query.conditions, 'joinedAt');
    expect(period?.kind).toBe('period');
    expect(query.notices).toEqual([]);
  });

  it('기간이 어떤 필드도 지목하지 않으면 도메인 기본 날짜 필드에 붙는다', () => {
    const query = expectOk(parseQuery('@회원목록 이번달 VIP 보여줘'));
    expect(conditionOf(query.conditions, 'joinedAt')?.kind).toBe('period');
    expect(query.notices).toEqual([]);
  });

  it('지난달 · 최근 30일 같은 다른 기간 표현도 같은 규칙을 탄다', () => {
    const lastMonth = expectOk(parseQuery('@회원목록 지난달 가입 회원 보여줘'));
    const lastMonthCondition = conditionOf(lastMonth.conditions, 'joinedAt');
    expect(lastMonthCondition?.kind === 'period' ? lastMonthCondition.period.kind : null).toBe(
      'last-month',
    );

    const recent = expectOk(parseQuery('@회원목록 최근 30일 가입 회원 보여줘'));
    const recentCondition = conditionOf(recent.conditions, 'joinedAt');
    expect(recentCondition?.kind === 'period' ? recentCondition.period.days : null).toBe(30);
  });

  it('날짜 필드가 아예 없는 도메인(상품)에서는 기간을 빼고 그 사실을 통지한다', () => {
    // 기간이 어떤 필드도 지목하지 않았고, 상품에는 기본 날짜 필드도 없다 → 도메인 단위 통지
    const query = expectOk(parseQuery('@상품 이번달 보여줘'));
    expect(query.conditions.some((condition) => condition.kind === 'period')).toBe(false);
    expect(query.notices[0]?.code).toBe('period-domain-unsupported');
    expect(query.notices[0]?.message).toContain('상품 목록');
  });

  it('기간이 기간 없는 필드를 지목하면 그 필드 이름으로 통지한다', () => {
    // '이번달 판매중' — 판매상태에는 기간 정보가 없다. 도메인 단위가 아니라 **필드 단위** 통지가 맞다.
    const query = expectOk(parseQuery('@상품 이번달 판매중 보여줘'));
    expect(query.conditions.some((condition) => condition.kind === 'period')).toBe(false);
    expect(query.notices[0]?.code).toBe('period-unsupported');
    expect(query.notices[0]?.message).toContain('판매상태');
    // 기간을 뺀 나머지는 그대로 실행된다
    expect(conditionOf(query.conditions, 'saleStatus')?.kind).toBe('equals');
  });
});

describe('parseQuery — 등급 어휘', () => {
  it("'VVIP' 를 VIP 로 잘못 읽지 않는다 (부분문자열 함정)", () => {
    const query = expectOk(parseQuery('@회원목록 VVIP 보여줘'));
    const tier = conditionOf(query.conditions, 'tier');
    expect(tier?.kind === 'equals' ? tier.valueId : null).toBe('vvip');
  });

  it('일반회원도 등급으로 걸린다', () => {
    const query = expectOk(parseQuery('@회원목록 일반회원 몇 명이야'));
    const tier = conditionOf(query.conditions, 'tier');
    expect(tier?.kind === 'equals' ? tier.valueId : null).toBe('normal');
    expect(query.intent).toBe('count');
  });
});

describe('parseQuery — 알아듣지 못하는 요청은 실패로 남는다', () => {
  it('멘션이 없으면 no-mention 이다 (가장 흔한 경우)', () => {
    expect(parseQuery('이번달 매출이 왜 떨어졌어?').kind).toBe('no-mention');
    expect(parseQuery('안녕').kind).toBe('no-mention');
    expect(parseQuery('').kind).toBe('no-mention');
  });

  it('모르는 도메인을 멘션하면 그 이름을 되돌려준다', () => {
    const result = parseQuery('@배송목록 이번달 보여줘');
    expect(result.kind).toBe('unknown-domain');
    expect(result.kind === 'unknown-domain' ? result.alias : null).toBe('배송목록');
  });

  it('분석·예측·추천처럼 조회로 답할 수 없는 요청은 거절한다', () => {
    for (const input of [
      '@회원목록 이탈 원인 분석해줘',
      '@회원목록 다음달 가입자 예측해줘',
      '@상품 잘 팔릴 상품 추천해줘',
    ]) {
      const result = parseQuery(input);
      expect(result.kind).toBe('unsupported-intent');
    }
  });

  it('실패한 파싱은 절대 질의를 만들어 내지 않는다', () => {
    for (const input of ['매출 알려줘', '@없는도메인 보여줘', '@회원목록 원인 알려줘']) {
      const result = parseQuery(input);
      expect(result.kind).not.toBe('ok');
    }
  });
});

describe('parseQuery — 순수성', () => {
  it('같은 입력은 언제나 같은 결과다', () => {
    const input = '@고객목록 의 이번달 구매 VIP 뽑아줘';
    expect(parseQuery(input)).toEqual(parseQuery(input));
  });

  it('조건이 없는 멘션은 전체 목록 조회다', () => {
    const query = expectOk(parseQuery('@회원목록 보여줘'));
    expect(query.conditions).toEqual([]);
    expect(query.notices).toEqual([]);
  });
});
