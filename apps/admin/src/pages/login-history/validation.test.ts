// 기간 '직접 지정' 검증 회귀 테스트
//
// 이 규칙들이 막는 것은 **사용자가 자기 입력 때문에 빈 표를 보고 "감사 기록이 지워졌다"고
// 의심하는 상황**이다. 빈 결과의 원인이 데이터가 아니라 입력임을 화면이 말해야 한다.
//
// 'now' 를 주입해 '오늘'을 고정한다 — 감사 로그의 기간 검증이 실행 시각에 따라 흔들리면 안 된다.
import { describe, expect, it } from 'vitest';

import { MAX_RANGE_DAYS } from './types';
import { issueOf, validateCustomRange } from './validation';

// 한국 시각으로 2026-07-15 12:00. **오프셋을 명시한다** — 오프셋 없는 '2026-07-15T12:00:00' 은
// 러너의 로컬 정오로 파싱되고, 그러면 뉴욕에서 '오늘'이 7/16 이 되어 '미래는 조회할 수 없다'
// 단언이 통째로 무너진다(7/16 이 더는 미래가 아니게 된다). 검증의 기준 시각이 실행 환경을
// 타면 그 검증은 아무것도 고정하지 못한다 (ERP-09).
const NOW = new Date('2026-07-15T12:00:00+09:00');

describe('validateCustomRange — 조회를 막는 규칙', () => {
  it('정상 구간은 range 를 만들어 준다', () => {
    const { range, issues } = validateCustomRange({ from: '2026-07-01', to: '2026-07-10' }, NOW);
    expect(range).toEqual({ from: '2026-07-01', to: '2026-07-10' });
    expect(issues).toHaveLength(0);
  });

  it('오늘 하루(시작=종료)도 유효하다', () => {
    const { range } = validateCustomRange({ from: '2026-07-15', to: '2026-07-15' }, NOW);
    expect(range).toEqual({ from: '2026-07-15', to: '2026-07-15' });
  });

  it('형식이 아니면 그 칸에 이슈가 붙는다', () => {
    const { range, issues } = validateCustomRange({ from: '2026/07/01', to: '2026-07-10' }, NOW);
    expect(range).toBeNull();
    expect(issueOf(issues, 'from')?.message).toBe('날짜를 YYYY-MM-DD 형식으로 입력하세요.');
    expect(issueOf(issues, 'to')).toBeUndefined();
  });

  it('빈 입력도 형식 위반이다 (조회를 걸지 않는다)', () => {
    const { range, issues } = validateCustomRange({ from: '', to: '' }, NOW);
    expect(range).toBeNull();
    expect(issueOf(issues, 'from')).toBeDefined();
    expect(issueOf(issues, 'to')).toBeDefined();
  });

  it('실재하지 않는 날짜(2026-02-31)를 통과시키지 않는다 — Date 가 3/3 으로 굴려버린다', () => {
    const { range, issues } = validateCustomRange({ from: '2026-02-31', to: '2026-03-10' }, NOW);
    expect(range).toBeNull();
    expect(issueOf(issues, 'from')).toBeDefined();
  });

  it('**미래는 조회할 수 없다** — 감사 기록에 미래는 없다', () => {
    const { range, issues } = validateCustomRange({ from: '2026-07-01', to: '2026-07-16' }, NOW);
    expect(range).toBeNull();
    expect(issueOf(issues, 'to')?.message).toBe(
      '미래 날짜는 조회할 수 없어요. 감사 기록에 미래는 없어요.',
    );
  });

  it('시작일이 종료일보다 늦으면 막는다', () => {
    const { range, issues } = validateCustomRange({ from: '2026-07-10', to: '2026-07-01' }, NOW);
    expect(range).toBeNull();
    expect(issueOf(issues, 'from')?.message).toBe('시작일은 종료일보다 늦을 수 없어요.');
  });

  it(`조회 기간은 최대 ${String(MAX_RANGE_DAYS)}일이다`, () => {
    // 2026-04-16 ~ 2026-07-15 = 91일 (양 끝 포함)
    const { range, issues } = validateCustomRange({ from: '2026-04-16', to: '2026-07-15' }, NOW);
    expect(range).toBeNull();
    expect(issueOf(issues, 'range')?.message).toBe(
      '조회 기간은 최대 90일이에요. (선택한 기간 91일)',
    );
  });

  it('정확히 최대 일수(90일)는 통과한다 — 경계에서 한 칸 어긋나지 않는다', () => {
    const { range, issues } = validateCustomRange({ from: '2026-04-17', to: '2026-07-15' }, NOW);
    expect(issues).toHaveLength(0);
    expect(range).not.toBeNull();
  });
});
