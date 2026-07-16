// 로그 관리 4화면의 규칙 회귀 테스트 (apps/admin/src/pages/logs/**)
//
// [무엇을 고정하는가] 이 섹션의 동작은 순수 규칙에 있다 — 필터/정렬/페이지(query-engine),
// 마스킹(masking), 시각 환산(time), 기간(period/validation), 불변성(data-source 의 공개 표면).
// 화면 컴포넌트는 그 결과를 **그리기만** 한다. 그래서 여기서 규칙을 고정하면 동작이 고정된다.
// (DOM 단언은 list-state.test.tsx · components/LogTable.test.tsx 가 갖는다.)
//
// [불변성은 '없음'을 단언한다]
// 감사 로그의 핵심 성질은 **삭제·수정 경로가 존재하지 않는다**는 것이다. 없는 것은 눈으로
// 확인할 수 없으므로 — 4개 어댑터의 공개 표면을 전수로 훑어 단언한다. 누군가 `deleteAdminLog`
// 를 추가하는 순간 이 테스트가 빨개진다.
import { describe, expect, it } from 'vitest';

import { dayCount, formatDate } from '../../shared/format';
import * as adminSource from './admin/data-source';
import { adminLogSpec, toCsv as adminToCsv } from './admin/data-source';
import { ADMIN_LOGS } from './admin/fixtures';
import * as apiSource from './api/data-source';
import { apiLogSpec } from './api/data-source';
import { API_LOGS } from './api/fixtures';
import * as errorSource from './errors/data-source';
import { errorLogSpec } from './errors/data-source';
import { ERROR_LOGS } from './errors/fixtures';
import {
  formatMaskedPayload,
  maskEmail,
  maskPayload,
  maskPhone,
  maskTail,
  REDACTED_LABEL,
} from './masking';
import * as memberSource from './member-activity/data-source';
import { memberActivitySpec } from './member-activity/data-source';
import { MEMBER_ACTIVITY_LOGS } from './member-activity/fixtures';
import { presetRange, withinRange } from './period';
import { applyLogQuery, runLogQuery } from './query-engine';
import type { LogDataSpec } from './query-engine';
import { formatLogTime } from './time';
import { ALL_FILTER, DEFAULT_SORT } from './types';
import type { LogEntryBase, LogQuery } from './types';
import { validateCustomRange } from './validation';

/* ── 감사 로그 불변성 — 쓰기 경로가 존재하지 않는다 ──────────────────────── */

describe('불변성 — 4개 어댑터에 쓰기 경로가 없다', () => {
  const adapters = [
    ['관리자 로그', adminSource, 'fetchAdminLogs', 'fetchAdminLogsForExport', 'adminLogSpec'],
    [
      '회원 활동 로그',
      memberSource,
      'fetchMemberActivityLogs',
      'fetchMemberActivityLogsForExport',
      'memberActivitySpec',
    ],
    ['API 로그', apiSource, 'fetchApiLogs', 'fetchApiLogsForExport', 'apiLogSpec'],
    ['오류 로그', errorSource, 'fetchErrorLogs', 'fetchErrorLogsForExport', 'errorLogSpec'],
  ] as const;

  it.each(adapters)(
    '%s — 공개 표면은 조회·내보내기·규칙뿐이다',
    (_label, source, page, exp, spec) => {
      // 없는 것을 화면이 부를 수는 없다 — 이 목록이 곧 불변성의 방어선이다
      expect(Object.keys(source).sort()).toEqual([spec, exp, page, 'toCsv'].sort());
    },
  );

  it.each(adapters)('%s — 삭제·수정을 뜻하는 이름의 export 가 하나도 없다', (_label, source) => {
    const mutating = Object.keys(source).filter((name) =>
      /^(delete|remove|update|patch|save|create|purge|clear|resolve|archive)/i.test(name),
    );
    expect(mutating).toEqual([]);
  });
});

/* ── 시각 — 표시 타임존 고정 (ERP-09) ──────────────────────────────────────
 *
 * 타임존 고정·달력일 환산·달력 산술 자체의 단언은 이제 **구현이 사는 곳**에 있다
 * (shared/format.test.ts). 사본이 하나로 합쳐졌으므로 그 사본을 검증하던 테스트도 합친다 —
 * 여기 남는 것은 이 섹션 고유의 요구, 즉 **초 정밀도**뿐이다.
 */

describe('time — 표시는 언제나 KST 다 (초까지)', () => {
  it('UTC 로 들어온 시각을 KST 로 환산해 그린다 (+9시간)', () => {
    // 실행 OS 의 타임존이 무엇이든 같은 값이 나와야 한다 — 그것이 이 함수의 존재 이유다
    expect(formatLogTime('2026-07-14T02:31:09Z')).toBe('2026-07-14 11:31:09');
  });

  it('자정을 넘는 환산에서 날짜가 함께 넘어간다', () => {
    // UTC 22:00 은 서울의 **다음 날** 오전 7시다
    expect(formatLogTime('2026-07-14T22:00:00Z')).toBe('2026-07-15 07:00:00');
  });

  it('오프셋이 붙은 ISO 도 같은 순간으로 읽는다', () => {
    // 같은 순간을 다르게 적은 두 문자열 — 화면에는 같은 시각으로 나와야 한다
    expect(formatLogTime('2026-07-14T11:31:09+09:00')).toBe(formatLogTime('2026-07-14T02:31:09Z'));
  });

  it('**초를 버리지 않는다** — 1초 안의 연쇄를 분 단위로 뭉개면 순서가 사라진다', () => {
    // 이것이 이 섹션이 shared 의 formatDateTime('분까지')을 쓰지 않는 유일한 이유다
    expect(formatLogTime('2026-07-14T02:31:09Z')).not.toBe(formatLogTime('2026-07-14T02:31:41Z'));
    expect(formatLogTime('2026-07-14T02:31:41Z')).toBe('2026-07-14 11:31:41');
  });

  it('파싱할 수 없는 값은 지어내지 않고 그대로 돌려준다', () => {
    expect(formatLogTime('not-a-date')).toBe('not-a-date');
  });
});

/* ── 기간 ─────────────────────────────────────────────────────────────────── */

describe('period — 기간 프리셋', () => {
  // 한국 시각으로 2026-07-15 12:00 (UTC 03:00)
  const now = new Date('2026-07-15T03:00:00Z');

  it("'오늘'은 오늘 하루다", () => {
    expect(presetRange('today', now)).toEqual({ from: '2026-07-15', to: '2026-07-15' });
  });

  it("'최근 7일'은 오늘을 포함한 7일이다 (6일이 아니다)", () => {
    expect(presetRange('last-7d', now)).toEqual({ from: '2026-07-09', to: '2026-07-15' });
  });

  it("'최근 30일'은 오늘을 포함한 30일이다", () => {
    const range = presetRange('last-30d', now);
    expect(range).toEqual({ from: '2026-06-16', to: '2026-07-15' });
    expect(dayCount(range.from, range.to)).toBe(30);
  });

  it('구간의 끝은 언제나 오늘이다 — 감사 로그에 미래는 없다', () => {
    expect(presetRange('last-30d', now).to).toBe(formatDate(now));
  });

  it('withinRange 는 KST 달력일로 양 끝을 포함해 판정한다', () => {
    const range = { from: '2026-07-01', to: '2026-07-10' };
    expect(withinRange('2026-06-30T15:00:00Z', range)).toBe(true); // = KST 7/1 00:00
    expect(withinRange('2026-06-30T14:59:00Z', range)).toBe(false); // = KST 6/30 23:59
    expect(withinRange('2026-07-10T14:59:00Z', range)).toBe(true); // = KST 7/10 23:59
    expect(withinRange('2026-07-10T15:00:00Z', range)).toBe(false); // = KST 7/11 00:00
  });
});

/* ── 기간 직접 지정 검증 (COMP-11) ───────────────────────────────────────── */

describe('validateCustomRange — 조회를 막는 규칙', () => {
  const now = new Date('2026-07-15T03:00:00Z');

  it('올바른 구간은 그대로 통과한다', () => {
    const result = validateCustomRange({ from: '2026-07-01', to: '2026-07-10' }, now);
    expect(result.range).toEqual({ from: '2026-07-01', to: '2026-07-10' });
    expect(result.issues).toEqual([]);
  });

  it('미래 날짜는 조회할 수 없다 — 감사 기록에 미래는 없다', () => {
    const result = validateCustomRange({ from: '2026-07-01', to: '2026-08-01' }, now);
    expect(result.range).toBeNull();
    expect(result.issues.map((issue) => issue.target)).toContain('to');
  });

  it('시작일이 종료일보다 늦으면 **빈 결과가 아니라 오류**다 (silent empty 금지)', () => {
    const result = validateCustomRange({ from: '2026-07-10', to: '2026-07-01' }, now);
    expect(result.range).toBeNull();
    expect(result.issues.some((issue) => issue.target === 'from')).toBe(true);
  });

  it('최대 조회 기간(90일)을 넘으면 막는다', () => {
    const result = validateCustomRange({ from: '2026-01-01', to: '2026-06-30' }, now);
    expect(result.range).toBeNull();
    expect(result.issues.some((issue) => issue.target === 'range')).toBe(true);
  });

  it('형식이 아니면 그 칸을 짚는다', () => {
    const result = validateCustomRange({ from: '2026-02-31', to: '2026-07-10' }, now);
    expect(result.range).toBeNull();
    expect(result.issues[0]?.target).toBe('from');
  });
});

/* ── 마스킹 — 이 섹션의 심장 ─────────────────────────────────────────────── */

describe('masking — 민감한 값은 화면에 닿지 않는다', () => {
  it('비밀번호는 전부 가린다 (부분도 남기지 않는다)', () => {
    const masked = maskPayload({ email: 'a@example.com', password: 'Sup3rSecret!2026' });
    expect(masked).toMatchObject({ password: REDACTED_LABEL });
    expect(JSON.stringify(masked)).not.toContain('Sup3rSecret');
  });

  it('토큰·Authorization·쿠키를 가린다', () => {
    const masked = maskPayload({
      authorization: 'Bearer eyJhbGciOi.payload.sig',
      refreshToken: 'rt_9f2a7c41',
      cookie: 'session=abc123',
    });
    expect(JSON.stringify(masked)).not.toContain('eyJhbGciOi');
    expect(JSON.stringify(masked)).not.toContain('rt_9f2a7c41');
    expect(JSON.stringify(masked)).not.toContain('abc123');
  });

  it('**키는 남기고 값만 가린다** — 무엇을 보냈는지가 사라지면 감사가 안 된다', () => {
    const masked = maskPayload({ password: 'x' });
    expect(Object.keys(masked as object)).toEqual(['password']);
  });

  it('API 키는 뒤 4자만 남긴다 (대조는 되고 재사용은 안 되게)', () => {
    expect(maskTail('sk_live_9f2a7c41d8e3b6a5')).toBe('●●●●b6a5');
    const masked = maskPayload({ apiKey: 'sk_live_9f2a7c41d8e3b6a5' });
    expect(masked).toEqual({ apiKey: '●●●●b6a5' });
  });

  it('**객체로 감싼 카드 정보**를 가린다 — 이 구멍이 실제로 뚫려 있었다', () => {
    // 카드는 `{ card: { number, cvc } }` 로 온다. 감싼 가지를 가리지 않으면
    // 자식 키 'number' 는 너무 흔해 규칙에 넣을 수 없고, 카드번호가 그대로 화면에 찍힌다.
    const masked = maskPayload({ card: { number: '4111-1111-1111-1234', cvc: '123' } });
    expect(JSON.stringify(masked)).not.toContain('4111-1111-1111-1234');
    expect(JSON.stringify(masked)).not.toContain('123');
    // 키는 남는다 — 카드로 결제했다는 사실은 감사에 필요하다
    expect(Object.keys(masked as object)).toEqual(['card']);
  });

  it('커넥션 문자열을 가린다 — 그 안에 비밀번호가 통째로 박혀 있다', () => {
    const masked = maskPayload({
      connectionString: 'postgres://svc_settle:Str0ngPass!@db.internal:5432/settle',
    });
    expect(JSON.stringify(masked)).not.toContain('Str0ngPass');
  });

  it('**중첩된 recipient 의 메일 주소**를 가린다 — 이 구멍이 실제로 뚫려 있었다', () => {
    // 규칙이 자격증명만 겨냥한 동안, 발송 실패 페이로드의 수신자 주소가 원문 그대로 찍혔다.
    // 'recipient' 에는 'mail' 이 없어 이메일 규칙에 걸리지 않았다.
    const masked = maskPayload({ context: { recipient: 'user1099@example.com' } });
    expect(JSON.stringify(masked)).not.toContain('user1099@example.com');
    // 가리되 지우지 않는다 — 도메인은 남아 '어느 조직인가'라는 감사의 단서가 된다
    expect(masked).toEqual({ context: { recipient: 'us●●●●●●@example.com' } });
  });

  it('짧은 값은 뒤 4자도 남기지 않는다 (전부가 드러난다)', () => {
    expect(maskTail('1234')).toBe(REDACTED_LABEL);
  });

  it('이메일은 앞 2자와 도메인만 — 도메인은 감사의 단서이고 개인을 특정하지 않는다', () => {
    expect(maskEmail('user1042@example.com')).toBe('us●●●●●●@example.com');
    expect(maskEmail('ab@example.com')).toBe('a●●●●●●@example.com');
    expect(maskEmail('not-an-email')).toBe('●●●●mail');
  });

  it('전화번호는 가운데만 가린다', () => {
    expect(maskPhone('010-1234-5678')).toBe('010-●●●●-5678');
  });

  it('중첩된 객체·배열 안까지 훑는다 — 한 겹만 보면 마스킹은 뚫린 것이다', () => {
    const masked = maskPayload({
      items: [{ payment: { card: { number: '5555-5555-5555-4444' } } }],
    });
    expect(JSON.stringify(masked)).not.toContain('5555-5555-5555-4444');
  });

  it('민감한 키의 값이 문자열이 아니어도 가린다 (숫자 카드번호로 빠져나가지 못한다)', () => {
    const masked = maskPayload({ cardNumber: 4111111111111234 });
    expect(masked).toEqual({ cardNumber: REDACTED_LABEL });
  });

  it('민감하지 않은 값은 건드리지 않는다 — 다 가리면 감사가 불가능해진다', () => {
    const payload = { method: 'POST', path: '/api/orders', amount: 128000 };
    expect(maskPayload(payload)).toEqual(payload);
  });

  it('원본을 바꾸지 않는다 — 마스킹은 표시의 일이지 기록의 일이 아니다', () => {
    const original = { password: 'secret' };
    maskPayload(original);
    expect(original.password).toBe('secret');
  });

  it('순환 참조가 있어도 죽지 않는다', () => {
    const cyclic: Record<string, unknown> = { name: 'a' };
    cyclic['self'] = cyclic;
    expect(() => formatMaskedPayload(cyclic)).not.toThrow();
  });

  it('formatMaskedPayload — 화면에 그릴 문자열도 마스킹을 거친다', () => {
    const text = formatMaskedPayload({ body: { password: 'hunter2' } });
    expect(text).not.toContain('hunter2');
    expect(text).toContain(REDACTED_LABEL);
  });
});

/* ── 픽스처의 페이로드가 실제로 가려지는가 ───────────────────────────────── */

describe('픽스처 페이로드 — 화면에 그려지는 순간 가려진다', () => {
  it('관리자 로그의 로그인 실패 페이로드에서 비밀번호·토큰이 사라진다', () => {
    const withPassword = ADMIN_LOGS.filter((entry) =>
      JSON.stringify(entry.payload).includes('Sup3rSecret'),
    );
    // 픽스처가 의도적으로 비밀번호를 담고 있어야 이 테스트가 의미를 갖는다
    expect(withPassword.length).toBeGreaterThan(0);

    for (const entry of withPassword) {
      const shown = formatMaskedPayload(entry.payload);
      expect(shown).not.toContain('Sup3rSecret');
      expect(shown).not.toContain('eyJhbGciOi');
    }
  });

  it('회원 활동 로그의 결제 페이로드에서 카드번호가 사라진다', () => {
    const withCard = MEMBER_ACTIVITY_LOGS.filter((entry) =>
      JSON.stringify(entry.payload).includes('4111-1111-1111-1234'),
    );
    expect(withCard.length).toBeGreaterThan(0);

    for (const entry of withCard) {
      expect(formatMaskedPayload(entry.payload)).not.toContain('4111-1111-1111-1234');
    }
  });

  it('API 로그의 Authorization 헤더에서 키가 사라진다', () => {
    const withKey = API_LOGS.filter((entry) => JSON.stringify(entry.payload).includes('sk_live_'));
    expect(withKey.length).toBeGreaterThan(0);

    for (const entry of withKey) {
      expect(formatMaskedPayload(entry.payload)).not.toContain('sk_live_7e4c2b9a1f6d8305');
    }
  });

  it('오류 로그의 컨텍스트에서 커넥션 문자열의 비밀번호·토큰이 사라진다', () => {
    const shown = ERROR_LOGS.map((entry) => formatMaskedPayload(entry.payload)).join('\n');
    expect(shown).not.toContain('smsp_live_4d19c7b2a8e35f60');
    expect(shown).not.toContain('pg_live_88f21c9a77b40e13');
    // 커넥션 문자열 안에 박힌 DB 비밀번호 — 스택을 그대로 그리면 이것이 화면에 뜬다
    expect(shown).not.toContain('Str0ngPass');
  });

  it('오류 로그의 수신자 메일 주소가 사라진다 (EMAIL_BOUNCED)', () => {
    // 픽스처가 정말 그 값을 품고 있는지 먼저 확인한다 — 아무것도 안 걸린 채로 초록불이 나면
    // 이 테스트는 마스킹이 아니라 자기 자신을 검증한 것이 된다.
    const withRecipient = ERROR_LOGS.filter((entry) =>
      JSON.stringify(entry.payload).includes('user1099@example.com'),
    );
    expect(withRecipient.length).toBeGreaterThan(0);

    for (const entry of withRecipient) {
      expect(formatMaskedPayload(entry.payload)).not.toContain('user1099@example.com');
    }
  });
});

/* ── 픽스처의 규율 ────────────────────────────────────────────────────────── */

describe('픽스처 — 실명 0건 · 실재 호스트 0건', () => {
  const ips = [
    ...ADMIN_LOGS.map((entry) => entry.ip),
    ...MEMBER_ACTIVITY_LOGS.map((entry) => entry.ip),
    ...API_LOGS.map((entry) => entry.clientIp),
  ];

  it('IP 는 전부 문서용 대역(RFC 5737)이다', () => {
    const outside = ips.filter(
      (ip) => !ip.startsWith('203.0.113.') && !ip.startsWith('198.51.100.'),
    );
    expect(outside).toEqual([]);
  });

  it('이름은 전부 마스킹돼 있다 (첫 글자 + *)', () => {
    const names = [
      ...ADMIN_LOGS.map((entry) => entry.actorName),
      ...MEMBER_ACTIVITY_LOGS.map((entry) => entry.memberName),
    ];
    expect(names.filter((name) => !name.includes('*'))).toEqual([]);
  });

  it('이메일 도메인은 전부 example.com (RFC 2606 예약) 이다', () => {
    const accounts = [
      ...ADMIN_LOGS.map((entry) => entry.actorAccount),
      ...MEMBER_ACTIVITY_LOGS.map((entry) => entry.memberAccount),
    ];
    expect(accounts.filter((account) => !account.endsWith('@example.com'))).toEqual([]);
  });

  it('시각은 전부 오프셋을 가진 ISO 다 — 순진한 로컬 문자열이 없다 (ERP-09)', () => {
    const all = [...ADMIN_LOGS, ...MEMBER_ACTIVITY_LOGS, ...API_LOGS, ...ERROR_LOGS];
    const naive = all.filter((entry) => !/(Z|[+-]\d{2}:\d{2})$/.test(entry.occurredAtIso));
    expect(naive).toEqual([]);
  });

  it('최신순으로 정렬돼 있다 — 감사 화면은 방금 일어난 일부터 본다', () => {
    const times = ADMIN_LOGS.map((entry) => entry.occurredAtIso);
    expect([...times].sort((a, b) => b.localeCompare(a))).toEqual(times);
  });
});

/* ── 조회 엔진 ────────────────────────────────────────────────────────────── */

interface Row extends LogEntryBase {
  readonly kind: string;
  readonly name: string;
  readonly size: number;
}

const SAMPLE: readonly Row[] = [
  { id: '1', occurredAtIso: '2026-07-05T01:00:00Z', kind: 'a', name: '가나', size: 90 },
  { id: '2', occurredAtIso: '2026-07-06T01:00:00Z', kind: 'b', name: '다라', size: 1400 },
  { id: '3', occurredAtIso: '2026-07-07T01:00:00Z', kind: 'a', name: '마바', size: 300 },
  // 구간 밖 — 기간 필터가 걸러내야 한다
  { id: '4', occurredAtIso: '2026-06-30T01:00:00Z', kind: 'a', name: '가나', size: 10 },
];

const SPEC: LogDataSpec<Row> = {
  entries: SAMPLE,
  axes: [{ key: 'kind', valueOf: (entry) => entry.kind }],
  searchOf: (entry) => [entry.name],
  sortValues: {
    occurredAt: (entry) => entry.occurredAtIso,
    name: (entry) => entry.name,
    size: (entry) => entry.size,
  },
};

function queryOf(overrides: Partial<LogQuery> = {}): LogQuery {
  return {
    range: { from: '2026-07-01', to: '2026-07-10' },
    axes: {},
    keyword: '',
    sort: DEFAULT_SORT,
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

const idsOf = (rows: readonly Row[]) => rows.map((row) => row.id);

describe('applyLogQuery — 필터는 전부 AND 로 걸린다', () => {
  it('기간 밖은 나오지 않는다', () => {
    expect(idsOf(applyLogQuery(SPEC, queryOf()))).toEqual(['1', '2', '3']);
  });

  it('축을 고르면 그 칸만 남는다', () => {
    expect(idsOf(applyLogQuery(SPEC, queryOf({ axes: { kind: 'a' } })))).toEqual(['1', '3']);
  });

  it("축의 'all' 은 거르지 않는다", () => {
    expect(idsOf(applyLogQuery(SPEC, queryOf({ axes: { kind: ALL_FILTER } })))).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('검색어는 지정된 필드만 본다', () => {
    expect(idsOf(applyLogQuery(SPEC, queryOf({ keyword: '다라' })))).toEqual(['2']);
  });

  it('검색어의 앞뒤 공백은 무시하고, 대소문자를 가리지 않는다', () => {
    const spec: LogDataSpec<Row> = { ...SPEC, searchOf: (entry) => [entry.kind] };
    expect(idsOf(applyLogQuery(spec, queryOf({ keyword: '  B ' })))).toEqual(['2']);
  });

  it('축 × 검색은 함께 걸린다', () => {
    const result = applyLogQuery(SPEC, queryOf({ axes: { kind: 'a' }, keyword: '가나' }));
    expect(idsOf(result)).toEqual(['1']);
  });

  it('걸리는 것이 없으면 빈 배열이다 (화면은 Empty 를 그린다)', () => {
    expect(applyLogQuery(SPEC, queryOf({ keyword: '없는값' }))).toEqual([]);
  });
});

describe('runLogQuery — 정렬 → 자르기 순서', () => {
  it('기본 정렬은 최신순이다', () => {
    expect(idsOf(runLogQuery(SPEC, queryOf()).entries)).toEqual(['3', '2', '1']);
  });

  it('오름차순으로 뒤집을 수 있다', () => {
    const query = queryOf({ sort: { key: 'occurredAt', direction: 'asc' } });
    expect(idsOf(runLogQuery(SPEC, query).entries)).toEqual(['1', '2', '3']);
  });

  it('**숫자는 수의 크기로** 정렬한다 (문자열이면 90 이 1400 보다 크다)', () => {
    const query = queryOf({ sort: { key: 'size', direction: 'desc' } });
    expect(idsOf(runLogQuery(SPEC, query).entries)).toEqual(['2', '3', '1']);
  });

  it('한국어는 사전순으로 정렬한다', () => {
    const query = queryOf({ sort: { key: 'name', direction: 'asc' } });
    expect(idsOf(runLogQuery(SPEC, query).entries)).toEqual(['1', '2', '3']);
  });

  it('모르는 정렬 키는 원래 순서를 건드리지 않는다 (URL 은 손으로 고칠 수 있다)', () => {
    const query = queryOf({ sort: { key: 'nope', direction: 'asc' } });
    expect(idsOf(runLogQuery(SPEC, query).entries)).toEqual(['1', '2', '3']);
  });

  it('**정렬이 자르기보다 먼저다** — 2페이지의 첫 행이 1페이지의 마지막 바로 다음이다', () => {
    // 25건을 20줄씩. 페이지 크기는 **실제 값(20)** 으로 본다 — PageSize 는 20|50|100 으로 닫혀 있고
    // 그 닫힘이 곧 ERP-15 의 렌더 캡이다. 테스트 편의로 2줄짜리 페이지를 만들면 그 계약을 우회하게 된다.
    const many: readonly Row[] = Array.from({ length: 25 }, (_, index) => ({
      id: String(index + 1).padStart(2, '0'),
      occurredAtIso: `2026-07-05T01:${String(index).padStart(2, '0')}:00Z`,
      kind: 'a',
      name: `이름${String(index)}`,
      size: index,
    }));
    const spec: LogDataSpec<Row> = { ...SPEC, entries: many };

    const page1 = runLogQuery(spec, queryOf({ pageSize: 20, page: 1 }));
    const page2 = runLogQuery(spec, queryOf({ pageSize: 20, page: 2 }));

    // 최신순이므로 마지막에 만든 '25' 가 맨 위다
    expect(page1.entries).toHaveLength(20);
    expect(page1.entries[0]?.id).toBe('25');
    expect(page2.entries).toHaveLength(5);

    // 2페이지의 첫 행은 1페이지의 마지막 행 **바로 다음**이다 (건너뛰지도, 겹치지도 않는다)
    expect(page1.entries[19]?.id).toBe('06');
    expect(page2.entries[0]?.id).toBe('05');
  });

  it('total 은 필터·검색을 적용한 뒤의 건수다 (페이지네이션의 모수)', () => {
    expect(runLogQuery(SPEC, queryOf()).total).toBe(3);
    expect(runLogQuery(SPEC, queryOf({ axes: { kind: 'a' } })).total).toBe(2);
  });

  it('범위를 넘은 페이지는 빈 배열이다 (화면이 마지막 페이지로 보정한다 — STATE-04)', () => {
    expect(runLogQuery(SPEC, queryOf({ page: 9 })).entries).toEqual([]);
  });

  it('배지 숫자는 **기간 안에서만** 센다 — 축·검색과 무관하다', () => {
    const result = runLogQuery(SPEC, queryOf({ axes: { kind: 'b' }, keyword: '다라' }));
    // 축을 'b' 로 좁혔어도 'a' 의 건수(기간 안 2건)는 그대로 보인다
    expect(result.axisCounts['kind']).toEqual({ all: 3, a: 2, b: 1 });
  });
});

/* ── 4화면의 정렬 규칙 ────────────────────────────────────────────────────── */

describe('화면별 정렬 규칙', () => {
  it('컬럼 id 와 정렬 키가 어긋나지 않는다 — 헤더가 정렬 가능하다고 하면 어댑터도 알아야 한다', () => {
    // 각 spec 의 sortValues 키는 최소한 시각 컬럼을 포함한다 (기본 정렬이 최신순이므로)
    for (const spec of [adminLogSpec, memberActivitySpec, apiLogSpec, errorLogSpec]) {
      expect(Object.keys(spec.sortValues)).toContain(DEFAULT_SORT.key);
    }
  });

  it('오류 로그의 심각도는 **사전순이 아니라 심각한 순**이다', () => {
    const rank = errorLogSpec.sortValues['severity'];
    expect(rank).toBeDefined();

    const critical = ERROR_LOGS.find((entry) => entry.severity === 'critical');
    const warning = ERROR_LOGS.find((entry) => entry.severity === 'warning');
    expect(critical).toBeDefined();
    expect(warning).toBeDefined();
    if (rank === undefined || critical === undefined || warning === undefined) return;

    // 사전순이면 '경고'(warning)가 '치명'(critical)보다 앞선다 — 그것을 뒤집는다
    expect(Number(rank(critical))).toBeLessThan(Number(rank(warning)));
  });

  it('API 로그의 응답 시간은 숫자로 비교된다', () => {
    const durationOf = apiLogSpec.sortValues['durationMs'];
    expect(durationOf).toBeDefined();
    if (durationOf === undefined) return;
    expect(typeof durationOf(API_LOGS[0] ?? ({} as never))).toBe('number');
  });
});

/* ── 내보내기 (CSV · ERP-12) ─────────────────────────────────────────────── */

describe('toCsv — 내보내기', () => {
  const sample = ADMIN_LOGS.slice(0, 5);
  const lines = adminToCsv(sample).split('\n');

  it('헤더는 한국어다 (엑셀에서 그대로 읽힌다)', () => {
    expect(lines[0]).toBe('시각(KST),행위자,이름,역할,액션,대상 유형,대상,결과,실패 사유,IP');
  });

  it('시각 열은 KST 임을 헤더에 밝힌다 — 기준 없는 시각은 증거가 못 된다', () => {
    expect(lines[0]).toContain('시각(KST)');
  });

  it('**페이로드 열이 없다** — 마스킹을 거치지 않은 비밀이 파일로 나가지 않는다', () => {
    const header = lines[0] ?? '';
    expect(header).not.toContain('페이로드');
    expect(adminToCsv(ADMIN_LOGS)).not.toContain('Sup3rSecret');
  });

  it('**실패를 성공 톤으로 옮겨 적지 않는다** — 결과 칸에 "실패"가 그대로 들어간다', () => {
    const failures = ADMIN_LOGS.filter((entry) => entry.outcome === 'failure');
    expect(failures.length).toBeGreaterThan(0);

    const csv = adminToCsv(failures.slice(0, 3));
    expect(csv).toContain('실패');
    // 사유도 함께 나간다 — 색은 파일로 옮겨지지 않으므로 문자열이 스스로 말해야 한다
    expect(csv).toContain('비밀번호 불일치');
  });

  it('구분자를 품은 값은 큰따옴표로 감싼다 (열이 밀려 다른 사건으로 읽히면 안 된다)', () => {
    const entry = ADMIN_LOGS.find((row) => row.targetLabel.includes(','));
    const csv = adminToCsv([
      { ...(entry ?? ADMIN_LOGS[0] ?? ({} as never)), targetLabel: '가, 나' },
    ]);
    expect(csv).toContain('"가, 나"');
  });
});
