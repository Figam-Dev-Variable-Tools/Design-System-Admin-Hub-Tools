// 로그인 이력 화면의 동작 회귀 테스트 (A40)
//
// [무엇을 고정하는가] 이 화면의 동작은 세 곳에 있다 — 필터 규칙(data-source.applyQuery),
// 표시 규칙(types), 기간 계산(period). 화면 컴포넌트는 그 결과를 **그리기만** 한다.
// 그래서 여기서 규칙을 고정하면 화면의 동작이 고정된다.
//
// [렌더 테스트가 없는 이유 — 자백]
// `apps/admin` 에는 jsdom·@testing-library 가 없다 (packages/ui 에만 있다). 추가는
// `apps/admin/package.json` 변경이고 그것은 **A80(Dependency Manager)의 소유**다 —
// A40 이 임의로 의존성을 늘리지 않는다(frontend-conventions §4). 그래서 이 앱의 기존 테스트
// (login·members·customer-settings)와 같은 방식으로 **순수 규칙**을 단언한다.
// 렌더 단언(행 클릭이 실제로 navigate 하는가)은 A80 이 devDependency 를 넣어주면 그때 붙인다.
//
// [불변성은 '없음'을 단언한다]
// 감사 로그의 핵심 성질은 **삭제·수정 경로가 존재하지 않는다**는 것이다. 없는 것은 눈으로
// 확인할 수 없으므로 — 모듈의 공개 표면을 전수로 훑어 단언한다. 누군가 `deleteLoginHistory`
// 를 추가하는 순간 이 테스트가 빨개진다.
import { describe, expect, it } from 'vitest';

import * as dataSource from './data-source';
import { applyQuery, toCsv } from './data-source';
import type { LoginHistoryQuery } from './data-source';
import { LOGIN_HISTORY, withConsecutiveFailures } from './fixtures';
import type { RawAttempt } from './fixtures';
import { dayCount, presetRange, shiftDays, withinRange } from './period';
import { consecutiveFailureLabel, detailPathOf, FAILURE_STREAK_BADGE_MIN } from './types';
import type { AccountKind, LoginFailureReason, LoginHistoryEntry, LoginOutcome } from './types';

/* ── 테스트용 표본 ────────────────────────────────────────────────────────── */

const RANGE = { from: '2026-07-01', to: '2026-07-10' };

function entryOf(overrides: Partial<LoginHistoryEntry> & { id: string }): LoginHistoryEntry {
  return {
    occurredAtIso: '2026-07-05T10:00:00',
    account: 'user1@example.com',
    name: '김**',
    accountKind: 'member' as AccountKind,
    outcome: 'success' as LoginOutcome,
    failureReason: null,
    consecutiveFailures: 0,
    ip: '203.0.113.10',
    browser: 'Chrome 126',
    os: 'Windows 11',
    subjectId: 'M-00001',
    ...overrides,
  };
}

/** 성공(회원) · 실패(회원, 3연속) · 성공(운영자) · 실패(미등록) */
const SAMPLE: readonly LoginHistoryEntry[] = [
  entryOf({ id: '1' }),
  entryOf({
    id: '2',
    account: 'user2@example.com',
    name: '이**',
    outcome: 'failure',
    failureReason: 'invalid_password' as LoginFailureReason,
    consecutiveFailures: 3,
    ip: '198.51.100.22',
    subjectId: 'M-00002',
  }),
  entryOf({
    id: '3',
    account: 'ops01@example.com',
    name: '한**',
    accountKind: 'admin',
    ip: '203.0.113.77',
    subjectId: 'A-00001',
  }),
  entryOf({
    id: '4',
    account: 'root@example.com',
    name: '',
    outcome: 'failure',
    failureReason: 'unknown_account',
    consecutiveFailures: 1,
    ip: '198.51.100.22',
    subjectId: null,
  }),
  // 구간 밖 — 기간 필터가 걸러내야 한다
  entryOf({ id: '5', occurredAtIso: '2026-06-30T23:59:00', account: 'old@example.com' }),
];

function queryOf(overrides: Partial<LoginHistoryQuery> = {}): LoginHistoryQuery {
  return { outcome: 'all', accountKind: 'all', range: RANGE, keyword: '', page: 1, ...overrides };
}

const idsOf = (entries: readonly LoginHistoryEntry[]) => entries.map((entry) => entry.id);

/* ── 필터 ─────────────────────────────────────────────────────────────────── */

describe('applyQuery — 필터', () => {
  it('기본(전체·전체)은 기간 안의 모든 시도를 돌려준다', () => {
    expect(idsOf(applyQuery(queryOf(), SAMPLE))).toEqual(['1', '2', '3', '4']);
  });

  it('결과 필터 — 실패만 고르면 성공이 사라진다', () => {
    const failures = applyQuery(queryOf({ outcome: 'failure' }), SAMPLE);
    expect(idsOf(failures)).toEqual(['2', '4']);
    expect(failures.every((entry) => entry.outcome === 'failure')).toBe(true);
  });

  it('결과 필터 — 성공만 고르면 실패가 사라진다', () => {
    expect(idsOf(applyQuery(queryOf({ outcome: 'success' }), SAMPLE))).toEqual(['1', '3']);
  });

  it('계정 유형 필터 — 운영자만', () => {
    expect(idsOf(applyQuery(queryOf({ accountKind: 'admin' }), SAMPLE))).toEqual(['3']);
  });

  it('기간 필터 — 구간 밖의 시도는 나오지 않는다 (id 5 는 6/30)', () => {
    expect(idsOf(applyQuery(queryOf(), SAMPLE))).not.toContain('5');
    expect(
      idsOf(applyQuery(queryOf({ range: { from: '2026-06-01', to: '2026-06-30' } }), SAMPLE)),
    ).toEqual(['5']);
  });

  it('결과 × 계정 유형 × 기간은 AND 로 걸린다', () => {
    const result = applyQuery(queryOf({ outcome: 'failure', accountKind: 'admin' }), SAMPLE);
    expect(result).toHaveLength(0);
  });
});

/* ── 검색 ─────────────────────────────────────────────────────────────────── */

describe('applyQuery — 검색 (계정 · 이름 · IP)', () => {
  it('계정(이메일)으로 찾는다', () => {
    expect(idsOf(applyQuery(queryOf({ keyword: 'user2' }), SAMPLE))).toEqual(['2']);
  });

  it('이름으로 찾는다', () => {
    expect(idsOf(applyQuery(queryOf({ keyword: '한**' }), SAMPLE))).toEqual(['3']);
  });

  it('IP 로 찾는다 — 한 IP 가 무엇을 두드렸는지가 감사의 첫 질문이다', () => {
    // 198.51.100.22 는 실패 2건(회원 1건 + 미등록 1건)에서 왔다
    expect(idsOf(applyQuery(queryOf({ keyword: '198.51.100.22' }), SAMPLE))).toEqual(['2', '4']);
  });

  it('대소문자를 가리지 않고, 앞뒤 공백은 무시한다', () => {
    expect(idsOf(applyQuery(queryOf({ keyword: '  OPS01@EXAMPLE.COM ' }), SAMPLE))).toEqual(['3']);
  });

  it('검색과 필터는 함께 걸린다 (AND)', () => {
    const result = applyQuery(queryOf({ outcome: 'failure', keyword: '198.51.100.22' }), SAMPLE);
    expect(idsOf(result)).toEqual(['2', '4']);
  });

  it('빈 상태 — 걸리는 것이 없으면 빈 배열이다 (표는 "조회된 로그인 이력이 없습니다."를 그린다)', () => {
    expect(applyQuery(queryOf({ keyword: '없는계정' }), SAMPLE)).toEqual([]);
  });
});

/* ── 실패 표시 ────────────────────────────────────────────────────────────── */

describe('consecutiveFailureLabel — 연속 실패 배지', () => {
  it('성공 행에는 배지가 붙지 않는다', () => {
    expect(consecutiveFailureLabel(entryOf({ id: 's' }))).toBeNull();
  });

  it('첫 실패(1회)에는 배지가 붙지 않는다 — 1회는 오타다', () => {
    const first = entryOf({ id: 'f1', outcome: 'failure', consecutiveFailures: 1 });
    expect(consecutiveFailureLabel(first)).toBeNull();
  });

  it(`${String(FAILURE_STREAK_BADGE_MIN)}회부터 배지가 붙는다 — 여기서부터가 신호다`, () => {
    const second = entryOf({
      id: 'f2',
      outcome: 'failure',
      consecutiveFailures: FAILURE_STREAK_BADGE_MIN,
    });
    expect(consecutiveFailureLabel(second)).toBe('실패 2회 연속');
  });

  it('연속 횟수를 그대로 읽어준다 (계정 탈취 시도의 신호)', () => {
    const fifth = entryOf({ id: 'f5', outcome: 'failure', consecutiveFailures: 5 });
    expect(consecutiveFailureLabel(fifth)).toBe('실패 5회 연속');
  });
});

/* ── 행 이동 ──────────────────────────────────────────────────────────────── */

describe('detailPathOf — 행 클릭 목적지', () => {
  it('회원 → 회원 상세', () => {
    expect(detailPathOf(entryOf({ id: 'm', subjectId: 'M-00042' }))).toBe('/users/members/M-00042');
  });

  it('운영자 → 운영자 상세', () => {
    const admin = entryOf({ id: 'a', accountKind: 'admin', subjectId: 'A-00003' });
    expect(detailPathOf(admin)).toBe('/users/admins/A-00003');
  });

  it('미등록 계정 → null — 존재하지 않는 계정의 상세는 없다 (행이 이동하지 않는다)', () => {
    const unknown = entryOf({
      id: 'u',
      outcome: 'failure',
      failureReason: 'unknown_account',
      subjectId: null,
    });
    expect(detailPathOf(unknown)).toBeNull();
  });
});

/* ── 감사 로그 불변성 ─────────────────────────────────────────────────────── */

describe('감사 로그 불변성 — 쓰기 경로가 존재하지 않는다', () => {
  it('data-source 의 공개 표면은 조회·내보내기뿐이다 (삭제·수정 함수 0건)', () => {
    // 없는 것을 화면이 부를 수는 없다 — 이 목록이 곧 불변성의 방어선이다
    expect(Object.keys(dataSource).sort()).toEqual([
      'applyQuery',
      'fetchLoginHistory',
      'fetchLoginHistoryForExport',
      'toCsv',
    ]);
  });

  it('삭제·수정을 뜻하는 이름의 export 가 하나도 없다', () => {
    const mutating = Object.keys(dataSource).filter((name) =>
      /^(delete|remove|update|patch|save|create|purge|clear)/i.test(name),
    );
    expect(mutating).toEqual([]);
  });
});

/* ── 내보내기 (CSV) ───────────────────────────────────────────────────────── */

describe('toCsv — 내보내기', () => {
  const lines = toCsv(SAMPLE.slice(0, 4)).split('\n');

  it('헤더에 결과·실패 사유·연속 실패가 들어 있다', () => {
    expect(lines[0]).toBe('시각,계정,이름,유형,결과,실패 사유,연속 실패,IP,브라우저,OS');
  });

  it('성공 행은 결과가 "성공" 이고 실패 사유 칸이 비어 있다', () => {
    expect(lines[1]).toContain(',성공,,');
  });

  it('**실패를 성공 톤으로 옮겨 적지 않는다** — 결과 칸에 "실패"가 그대로 들어간다', () => {
    const failureLine = lines[2] ?? '';
    expect(failureLine).toContain('실패');
    expect(failureLine).not.toContain('성공');
    // 색은 파일로 옮겨지지 않는다 — 사유와 연속 횟수가 문자열로 스스로 말해야 한다
    expect(failureLine).toContain('비밀번호 불일치');
    expect(failureLine).toContain(',3,');
  });

  it('미등록 계정의 실패도 진짜 사유로 기록된다 (BE-001 — 사용자에게 보이는 문구와 다르다)', () => {
    expect(lines[4]).toContain('미등록 계정');
  });

  it('구분자를 품은 값은 큰따옴표로 감싼다 (열이 밀려 다른 계정의 실패로 읽히면 안 된다)', () => {
    const commaName = entryOf({ id: 'c', name: '김**, 테스트' });
    expect(toCsv([commaName]).split('\n')[1]).toContain('"김**, 테스트"');
  });
});

/* ── 연속 실패 계산 (서버가 하는 일을 픽스처가 흉내 낸다) ─────────────────── */

describe('withConsecutiveFailures', () => {
  const actor = {
    subjectId: 'M-00001',
    account: 'a@example.com',
    name: '김**',
    accountKind: 'member' as AccountKind,
  };
  const other = {
    subjectId: 'M-00002',
    account: 'b@example.com',
    name: '이**',
    accountKind: 'member' as AccountKind,
  };

  function attempt(
    who: typeof actor,
    iso: string,
    outcome: LoginOutcome,
    reason: LoginFailureReason | null = null,
  ): RawAttempt {
    return {
      actor: who,
      occurredAtIso: iso,
      outcome,
      failureReason: reason,
      ip: '198.51.100.5',
      browser: 'Chrome 126',
      os: 'Windows 11',
    };
  }

  it('같은 계정의 연속 실패를 시간순으로 센다', () => {
    const entries = withConsecutiveFailures([
      attempt(actor, '2026-07-05T01:00:00', 'failure', 'invalid_password'),
      attempt(actor, '2026-07-05T01:01:00', 'failure', 'invalid_password'),
      attempt(actor, '2026-07-05T01:02:00', 'failure', 'invalid_password'),
    ]);
    // 최신순으로 돌려주므로 앞이 3연속이다
    expect(entries.map((entry) => entry.consecutiveFailures)).toEqual([3, 2, 1]);
  });

  it('성공이 끼면 연쇄가 0 으로 끊긴다 — "총 5번 실패"와 "5번 연달아"는 다른 사건이다', () => {
    const entries = withConsecutiveFailures([
      attempt(actor, '2026-07-05T01:00:00', 'failure', 'invalid_password'),
      attempt(actor, '2026-07-05T01:01:00', 'failure', 'invalid_password'),
      attempt(actor, '2026-07-05T01:02:00', 'success'),
      attempt(actor, '2026-07-05T01:03:00', 'failure', 'invalid_password'),
    ]);
    const chronological = [...entries].reverse();
    expect(chronological.map((entry) => entry.consecutiveFailures)).toEqual([1, 2, 0, 1]);
  });

  it('계정마다 독립적으로 센다 — 다른 계정의 실패가 내 연쇄를 늘리지 않는다', () => {
    const entries = withConsecutiveFailures([
      attempt(actor, '2026-07-05T01:00:00', 'failure', 'invalid_password'),
      attempt(other, '2026-07-05T01:01:00', 'failure', 'invalid_password'),
      attempt(actor, '2026-07-05T01:02:00', 'failure', 'invalid_password'),
    ]);
    const mine = entries.filter((entry) => entry.account === actor.account);
    expect(mine.map((entry) => entry.consecutiveFailures)).toEqual([2, 1]);
    expect(entries.filter((e) => e.account === other.account)[0]?.consecutiveFailures).toBe(1);
  });

  it('최신순으로 정렬해 돌려준다 — 감사 화면은 방금 일어난 일부터 본다', () => {
    const entries = withConsecutiveFailures([
      attempt(actor, '2026-07-01T01:00:00', 'success'),
      attempt(actor, '2026-07-09T01:00:00', 'success'),
      attempt(actor, '2026-07-05T01:00:00', 'success'),
    ]);
    expect(entries.map((entry) => entry.occurredAtIso.slice(0, 10))).toEqual([
      '2026-07-09',
      '2026-07-05',
      '2026-07-01',
    ]);
  });
});

/* ── 픽스처가 BE-001 을 반영하는가 ────────────────────────────────────────── */

describe('픽스처 — BE-001 §4 "미등록 이메일도 동일"', () => {
  it('미등록 계정의 시도가 이력에 남아 있다 (열거 오라클 방지의 결과다)', () => {
    const unknown = LOGIN_HISTORY.filter((entry) => entry.failureReason === 'unknown_account');
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.every((entry) => entry.subjectId === null)).toBe(true);
  });

  it('미등록 계정도 연속 실패 5회에 도달하면 잠긴다 (존재하지 않는 계정도 잠긴다)', () => {
    const lockedUnknown = LOGIN_HISTORY.filter(
      (entry) => entry.subjectId === null && entry.failureReason === 'account_locked',
    );
    expect(lockedUnknown.length).toBeGreaterThan(0);
    expect(
      Math.max(...lockedUnknown.map((entry) => entry.consecutiveFailures)),
    ).toBeGreaterThanOrEqual(5);
  });

  it('실명이 없다 — 이름은 전부 마스킹돼 있거나(첫 글자 + *) 비어 있다', () => {
    const unmasked = LOGIN_HISTORY.filter(
      (entry) => entry.name !== '' && !entry.name.includes('*'),
    );
    expect(unmasked).toEqual([]);
  });

  it('IP 는 전부 문서용 대역(RFC 5737)이다 — 실재하는 호스트를 가리키지 않는다', () => {
    const outside = LOGIN_HISTORY.filter(
      (entry) => !entry.ip.startsWith('203.0.113.') && !entry.ip.startsWith('198.51.100.'),
    );
    expect(outside).toEqual([]);
  });
});

/* ── 기간 계산 ────────────────────────────────────────────────────────────── */

describe('period — 기간 프리셋', () => {
  const now = new Date('2026-07-15T12:00:00');

  it("'오늘'은 오늘 하루다", () => {
    expect(presetRange('today', now)).toEqual({ from: '2026-07-15', to: '2026-07-15' });
  });

  it("'최근 7일'은 오늘을 포함한 7일이다 (6일이 아니다)", () => {
    const range = presetRange('last-7d', now);
    expect(range).toEqual({ from: '2026-07-09', to: '2026-07-15' });
    expect(dayCount(range)).toBe(7);
  });

  it("'최근 30일'은 오늘을 포함한 30일이다", () => {
    const range = presetRange('last-30d', now);
    expect(range).toEqual({ from: '2026-06-16', to: '2026-07-15' });
    expect(dayCount(range)).toBe(30);
  });

  it('구간의 끝은 언제나 오늘이다 — 감사 로그에 미래는 없다', () => {
    expect(presetRange('last-30d', now).to).toBe('2026-07-15');
  });

  it('withinRange 는 양 끝을 포함한다', () => {
    const range = { from: '2026-07-01', to: '2026-07-10' };
    expect(withinRange('2026-07-01T00:00:00', range)).toBe(true);
    expect(withinRange('2026-07-10T23:59:59', range)).toBe(true);
    expect(withinRange('2026-06-30T23:59:59', range)).toBe(false);
    expect(withinRange('2026-07-11T00:00:00', range)).toBe(false);
  });

  it('shiftDays 는 월·연 경계를 넘는다', () => {
    expect(shiftDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});
