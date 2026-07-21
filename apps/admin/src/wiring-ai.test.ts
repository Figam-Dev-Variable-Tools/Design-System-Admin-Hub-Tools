// AI 도메인 배선 회귀 테스트 — 값 목록의 정본과 프로그램 제공자
//
// [무엇이 틀려 있었나]
//   ① 처리상태 5종·우선순위 4종·판매상태 3종을 AI 화면이 손으로 다시 타이핑해 갖고 있었다.
//      정본은 고객센터·상품이 갖는다. 두 벌은 반드시 갈라지고, 갈라져도 **아무 일도 일어나지
//      않는다** — 화면은 멀쩡히 돌고 사용자가 읽은 말로 질의만 조용히 안 걸린다.
//   ② 프로그램(후원형 펀딩) 모듈이 생긴 뒤에도 AI 는 상품·문의·회원 셋만 알았다.
//      '@프로그램' 은 '모르는 도메인' 으로 거절됐다 — 앱에 있는 화면을 앱의 조수만 몰랐다.
//
// [왜 pages/ai 안이 아니라 여기인가] 정본과 사본이 같은지 보려면 **양쪽을 한 파일에서** 들여와야
// 하는데, `pages/ai/**` 안에서 `pages/products` 를 들여오면 그것이 바로 이 배선이 없애려던 결합이다
// (code-quality 축1, blocker — 테스트 파일도 스캔 대상이다). 두 도메인을 모두 알아도 되는 자리는
// 배선 지점 하나뿐이라, 그 계약을 확인하는 자리도 여기다.
//
// [이 파일이 공허하지 않은 이유] 라벨 문자열을 여기 다시 적지 않는다. 각 도메인의 `*_OPTIONS` 를
// 그대로 들고 와 **같은지**를 본다 — 정본이 바뀌면 이 테스트가 자동으로 새 값을 요구한다.
import { beforeAll, describe, expect, it } from 'vitest';

import { findDomainById, resetDomainFieldValues } from './pages/ai/_shared/domains';
import type { DomainDef, DomainId, DomainOption } from './pages/ai/_shared/domains';
import { executeQuery } from './pages/ai/_shared/execute';
import { parseQuery } from './pages/ai/_shared/parser';
import type { ParsedQuery } from './pages/ai/_shared/parser';
import { SALE_STATUS_OPTIONS } from './pages/products/items/types';
import { PROGRAM_STATUS_OPTIONS } from './pages/programs/types';
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_OPTIONS } from './pages/support/_shared/domain';
import { wireAiDomains, wireAiDomainValues } from './wiring-ai';

/** id·라벨만 남긴다 — 도메인 옵션 표에는 tone 같은 화면 전용 칸이 더 있다 */
function pairs(options: readonly DomainOption[]): readonly DomainOption[] {
  return options.map((option) => ({ id: option.id, label: option.label }));
}

function domainOf(id: DomainId): DomainDef {
  const domain = findDomainById(id);
  if (domain === null) throw new Error(`도메인 '${id}' 가 레지스트리에 없다`);
  return domain;
}

function valuesOf(id: DomainId, fieldId: string): readonly DomainOption[] {
  const field = domainOf(id).fields.find((candidate) => candidate.id === fieldId);
  if (field === undefined) throw new Error(`필드 '${id}.${fieldId}' 가 없다`);
  return pairs(field.values);
}

/** 성공한 질의만 꺼낸다 — 실패면 그 자리에서 세운다 */
function expectQuery(input: string): ParsedQuery {
  const result = parseQuery(input);
  if (result.kind !== 'ok') throw new Error(`파싱이 성공해야 하는데 '${result.kind}' 였다`);
  return result.query;
}

beforeAll(() => {
  wireAiDomains();
});

describe('값 목록은 각 도메인의 *_OPTIONS 에서 온다 (사본 없음)', () => {
  it('배선 전에는 값을 모른다 — 빈 목록이 곧 미배선이다', () => {
    resetDomainFieldValues();
    expect(valuesOf('tickets', 'status')).toEqual([]);
    wireAiDomainValues(); // 뒷 테스트를 위해 되돌린다
  });

  it('상품 판매상태가 SALE_STATUS_OPTIONS 와 한 글자도 다르지 않다', () => {
    expect(valuesOf('products', 'saleStatus')).toEqual(pairs(SALE_STATUS_OPTIONS));
  });

  it('문의 처리상태·우선순위가 고객센터의 옵션 표와 같다', () => {
    expect(valuesOf('tickets', 'status')).toEqual(pairs(TICKET_STATUS_OPTIONS));
    expect(valuesOf('tickets', 'priority')).toEqual(pairs(TICKET_PRIORITY_OPTIONS));
  });

  it('프로그램 진행상태가 PROGRAM_STATUS_OPTIONS 와 같다', () => {
    expect(valuesOf('programs', 'status')).toEqual(pairs(PROGRAM_STATUS_OPTIONS));
  });

  /**
   * 라벨은 도메인이 주고 **별칭은 AI 화면이 갖는다.** '중지' 는 사용자의 말버릇이지 상품
   * 도메인의 사실이 아니다 — 주입이 별칭을 지워 버리면 '판매중지' 라고 다 적어야만 걸린다.
   */
  it('주입은 AI 화면의 별칭을 지우지 않는다', () => {
    const stopped = domainOf('products')
      .fields.find((field) => field.id === 'saleStatus')
      ?.values.find((value) => value.id === 'stopped');
    expect(stopped?.aliases).toContain('중지');
  });

  it('등급은 배선 없이도 안다 — 회원 도메인은 페이지가 아니라 공통 층에 있다', () => {
    resetDomainFieldValues();
    expect(valuesOf('members', 'tier')).toEqual([
      { id: 'vip', label: 'VIP' },
      { id: 'vvip', label: 'VVIP' },
      { id: 'normal', label: '일반회원' },
    ]);
    wireAiDomainValues();
  });

  it('주입된 값으로 실제 조건이 걸린다 — 목록만 채우고 파서가 못 쓰면 소용없다', () => {
    expect(expectQuery('@문의 긴급 보여줘').conditions).toContainEqual({
      kind: 'equals',
      fieldId: 'priority',
      valueId: 'urgent',
      label: '우선순위 긴급',
    });
  });
});

describe('프로그램 — 이제 질의할 수 있다', () => {
  const NOW = new Date('2026-07-21T09:00:00');

  it("'@프로그램'·'@펀딩' 이 도메인으로 읽힌다 — 예전에는 모르는 도메인이었다", () => {
    expect(expectQuery('@프로그램 보여줘').domainId).toBe('programs');
    expect(expectQuery('@펀딩 보여줘').domainId).toBe('programs');
  });

  it('제공자가 배선돼 실제 행이 나온다', () => {
    const result = executeQuery(expectQuery('@프로그램 보여줘'), NOW);
    if (result.kind !== 'ok') throw new Error(`실행이 성공해야 하는데 ${result.failure.kind} 였다`);

    expect(result.outcome.domainLabel).toBe('프로그램');
    expect(result.outcome.columns).toEqual([
      '프로그램명',
      '카테고리',
      '창작자',
      '진행상태',
      '목표금액',
      '달성률',
    ]);
    expect(result.outcome.total).toBeGreaterThan(0);
    expect(result.outcome.listUrl).toBe('/programs');
    expect(result.outcome.rows[0]?.href).toMatch(/^\/programs\//);
  });

  it('진행상태로 거른다 — 걸러진 행은 전부 그 상태다', () => {
    const filtered = expectQuery('@프로그램 진행 중 보여줘');
    expect(filtered.conditions.find((condition) => condition.fieldId === 'status')?.kind).toBe(
      'equals',
    );

    const all = executeQuery(expectQuery('@프로그램 보여줘'), NOW);
    const live = executeQuery(filtered, NOW);
    if (all.kind !== 'ok' || live.kind !== 'ok') throw new Error('실행이 성공해야 한다');

    expect(live.outcome.total).toBeGreaterThan(0);
    expect(live.outcome.total).toBeLessThan(all.outcome.total);
    for (const row of live.outcome.rows) expect(row.cells[3]).toBe('진행 중');
  });

  /**
   * 모금액에는 기간이 없다 — 저장된 값은 '지금까지 얼마' 하나뿐이다. 회원의 누적 구매액과 같은
   * 사정이고, 같은 방식으로 **실행 전에** 거절해야 한다(계산해 주는 척하면 그것이 거짓 답이다).
   */
  it("'이번달 모금' 은 계산하지 않고 그렇게 말한다", () => {
    const query = expectQuery('@프로그램 이번달 모금 보여줘');
    expect(query.conditions.some((condition) => condition.kind === 'period')).toBe(false);
    expect(query.notices[0]?.code).toBe('period-unsupported');
    expect(query.notices[0]?.message).toContain('모금액');
  });
});
