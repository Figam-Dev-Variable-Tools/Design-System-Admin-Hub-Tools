// 동의 이력의 순수 규칙 (pages/users/consents/rules.ts)
//
// [왜 화면 테스트가 아니라 규칙 테스트인가] 여기 걸린 것은 법적 의무다 — 마케팅 수신 동의를
// 필수로 강제하면 최대 1,000만 원의 과태료이고, 재동의 대상을 빠뜨리면 개정 약관에 동의하지
// 않은 사람에게 계속 발송된다. '화면에서 눌러 봤다' 로는 그 판정을 전수로 확인할 수 없다.
import { describe, expect, it } from 'vitest';

import * as dataSource from './data-source';
import {
  addMonths,
  currentDecision,
  filterConsentEvents,
  historyStateOf,
  itemsSaveBlock,
  latestDecisions,
  necessityChangeBlock,
  newestFirst,
  purgeTargets,
  reconsentTargets,
  searchConsentEvents,
} from './rules';
import { CONSENT_FILTER_ALL } from './types';
import type { ConsentEvent, ConsentItemDef } from './types';

/* ── 픽스처 (이 파일 안에서만) ───────────────────────────────────────────── */

const SERVICE: ConsentItemDef = {
  id: 'terms-service',
  label: '이용약관 동의',
  description: '',
  purpose: 'service',
  necessity: 'required',
  termsTypeId: 'service',
  retentionMonths: 60,
};

const MARKETING: ConsentItemDef = {
  id: 'marketing-email',
  label: '광고성 정보 수신 동의 (이메일)',
  description: '',
  purpose: 'marketing',
  necessity: 'optional',
  termsTypeId: 'marketing',
  retentionMonths: 12,
};

const OPTIONAL_PRIVACY: ConsentItemDef = {
  ...MARKETING,
  id: 'privacy-optional',
  label: '개인정보 수집·이용 동의 (선택)',
  purpose: 'privacy-optional',
  termsTypeId: null,
};

const ITEMS: readonly ConsentItemDef[] = [SERVICE, MARKETING, OPTIONAL_PRIVACY];

let seq = 0;
function event(overrides: Partial<ConsentEvent>): ConsentEvent {
  seq += 1;
  return {
    id: `cev-${String(seq).padStart(3, '0')}`,
    subjectId: 'mem-1',
    subjectLabel: '한** (h***@example.com)',
    itemId: MARKETING.id,
    action: 'granted',
    occurredAt: '2026-01-10T01:00:00.000Z',
    termsVersion: 'v1.1',
    source: 'signup',
    ...overrides,
  };
}

/* ── ① 필수/선택 가드 ────────────────────────────────────────────────────── */

describe('necessityChangeBlock — 선택 항목은 필수가 될 수 없다', () => {
  it('마케팅 동의를 필수로 바꾸려 하면 막고 사유를 말한다', () => {
    const reason = necessityChangeBlock(MARKETING, 'required');

    expect(reason).not.toBeNull();
    // 사유는 '왜' 를 담아야 한다 — '변경할 수 없습니다' 만으로는 다음에 할 일을 알 수 없다
    expect(reason ?? '').toContain('1,000만 원');
    expect(reason ?? '').toContain(MARKETING.label);
  });

  it('선택 개인정보·제3자 제공도 같은 이유로 막힌다', () => {
    expect(necessityChangeBlock(OPTIONAL_PRIVACY, 'required')).not.toBeNull();
    expect(
      necessityChangeBlock({ ...OPTIONAL_PRIVACY, purpose: 'third-party' }, 'required'),
    ).not.toBeNull();
  });

  it('선택으로 내리는 것은 언제나 허용된다 — 막을 이유가 없다', () => {
    expect(necessityChangeBlock(SERVICE, 'optional')).toBeNull();
    expect(necessityChangeBlock(MARKETING, 'optional')).toBeNull();
  });

  it('이용약관·필수 개인정보는 필수로 둘 수 있다', () => {
    expect(necessityChangeBlock(SERVICE, 'required')).toBeNull();
    expect(
      necessityChangeBlock({ ...SERVICE, purpose: 'privacy-essential' }, 'required'),
    ).toBeNull();
  });
});

describe('itemsSaveBlock — 저장 경로가 같은 술어로 거절한다', () => {
  it('토글을 우회해 마케팅이 필수로 들어와도 저장이 막힌다', () => {
    const tampered = ITEMS.map((item) =>
      item.id === MARKETING.id ? { ...item, necessity: 'required' as const } : item,
    );

    expect(itemsSaveBlock(tampered)).not.toBeNull();
  });

  it('규칙을 지키는 묶음은 통과한다', () => {
    expect(itemsSaveBlock(ITEMS)).toBeNull();
  });
});

/* ── ② 현재 상태는 파생값이다 ────────────────────────────────────────────── */

describe('현재 동의 상태 — 이력의 마지막 줄이 정한다', () => {
  it('동의 후 철회하면 현재 상태는 철회다 (동의만 세면 알 수 없다)', () => {
    const events = [
      event({ action: 'granted', occurredAt: '2026-01-10T01:00:00.000Z' }),
      event({ action: 'withdrawn', occurredAt: '2026-03-02T09:00:00.000Z', termsVersion: null }),
    ];

    expect(currentDecision(events, 'mem-1', MARKETING.id)).toBe('withdrawn');
  });

  it('철회 후 다시 동의하면 현재 상태는 동의다 — 순서가 결과를 뒤집는다', () => {
    const events = [
      event({ action: 'withdrawn', occurredAt: '2026-03-02T09:00:00.000Z' }),
      event({ action: 'granted', occurredAt: '2026-05-01T09:00:00.000Z' }),
    ];

    expect(currentDecision(events, 'mem-1', MARKETING.id)).toBe('granted');
  });

  it('이력이 한 줄도 없으면 null — 미동의와 "받은 적 없음" 을 구분한다', () => {
    expect(currentDecision([], 'mem-1', MARKETING.id)).toBeNull();
  });

  it('latestDecisions 는 (회원 × 항목) 쌍마다 한 줄만 남긴다', () => {
    const events = [
      event({ subjectId: 'mem-1', itemId: SERVICE.id }),
      event({ subjectId: 'mem-1', itemId: MARKETING.id }),
      event({ subjectId: 'mem-1', itemId: MARKETING.id, occurredAt: '2026-04-01T01:00:00.000Z' }),
      event({ subjectId: 'mem-2', itemId: MARKETING.id }),
    ];

    expect(latestDecisions(events)).toHaveLength(3);
  });
});

/* ── ③ 재동의 대상 ───────────────────────────────────────────────────────── */

const ACTIVE = [
  { typeId: 'service', typeLabel: '이용약관', version: 'v1.1', effectiveDate: '2026-01-01' },
  { typeId: 'marketing', typeLabel: '마케팅', version: 'v2.0', effectiveDate: '2026-06-01' },
];

describe('reconsentTargets — 개정되면 누구에게 다시 물어야 하나', () => {
  it('약관 버전을 모르면 null 이다 — 0명이라고 말하지 않는다', () => {
    expect(reconsentTargets([event({})], ITEMS, null)).toBeNull();
  });

  it('옛 버전에 동의한 채 남아 있는 사람이 대상이다', () => {
    const events = [
      event({ subjectId: 'mem-old', itemId: MARKETING.id, termsVersion: 'v1.0' }),
      event({ subjectId: 'mem-new', itemId: MARKETING.id, termsVersion: 'v2.0' }),
    ];

    const report = reconsentTargets(events, ITEMS, ACTIVE);
    const group = report?.groups.find((entry) => entry.item.id === MARKETING.id);

    expect(group?.subjects.map((subject) => subject.subjectId)).toEqual(['mem-old']);
    expect(group?.version).toBe('v2.0');
  });

  it('철회한 사람은 대상이 아니다 — 개정을 이유로 다시 권유하지 않는다', () => {
    const events = [
      event({ subjectId: 'mem-out', itemId: MARKETING.id, termsVersion: 'v1.0' }),
      event({
        subjectId: 'mem-out',
        itemId: MARKETING.id,
        action: 'withdrawn',
        occurredAt: '2026-06-10T01:00:00.000Z',
        termsVersion: null,
      }),
    ];

    const report = reconsentTargets(events, ITEMS, ACTIVE);
    expect(report?.groups).toHaveLength(0);
  });

  it('시행 중 버전을 못 찾은 항목은 조용히 빠지지 않고 이름으로 보고된다', () => {
    const events = [event({ subjectId: 'mem-1', itemId: MARKETING.id, termsVersion: 'v1.0' })];
    const onlyService = ACTIVE.filter((entry) => entry.typeId === 'service');

    const report = reconsentTargets(events, ITEMS, onlyService);

    expect(report?.unresolvedItems).toContain(MARKETING.label);
  });

  it('약관 문서가 없는 항목(termsTypeId: null)은 애초에 판정 대상이 아니다', () => {
    const events = [event({ itemId: OPTIONAL_PRIVACY.id, termsVersion: null })];

    const report = reconsentTargets(events, ITEMS, ACTIVE);

    expect(report?.groups.some((group) => group.item.id === OPTIONAL_PRIVACY.id)).toBe(false);
    expect(report?.unresolvedItems).not.toContain(OPTIONAL_PRIVACY.label);
  });
});

/* ── ④ 파기 대상 ─────────────────────────────────────────────────────────── */

describe('addMonths — 말일은 그 달의 마지막 날로 붙는다', () => {
  it('1월 31일 + 1개월은 2월 28/29일이다 (3월로 넘기면 보관 기간이 길어진다)', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('해를 넘기는 덧셈이 맞다', () => {
    expect(addMonths('2025-08-15', 12)).toBe('2026-08-15');
    expect(addMonths('2025-11-30', 14)).toBe('2027-01-30');
  });
});

describe('purgeTargets — 보관 기간이 지난 철회만 뽑는다', () => {
  const withdrawn = (subjectId: string, at: string): ConsentEvent =>
    event({
      subjectId,
      itemId: MARKETING.id,
      action: 'withdrawn',
      occurredAt: at,
      termsVersion: null,
    });

  it('기간이 지나면 대상이다', () => {
    // 2025-01-10 철회 + 12개월 = 2026-01-10 부터 파기 가능
    const targets = purgeTargets(
      [withdrawn('mem-1', '2025-01-10T01:00:00.000Z')],
      ITEMS,
      '2026-03-01',
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]?.purgeableFrom).toBe('2026-01-10');
  });

  it('기간 안이면 대상이 아니다', () => {
    const targets = purgeTargets(
      [withdrawn('mem-1', '2025-01-10T01:00:00.000Z')],
      ITEMS,
      '2025-12-31',
    );
    expect(targets).toHaveLength(0);
  });

  it('동의 중인 사람은 대상이 아니다 — 보관 기간은 관계가 끝난 뒤부터 흐른다', () => {
    const events = [
      event({ subjectId: 'mem-1', itemId: MARKETING.id, occurredAt: '2020-01-01T01:00:00.000Z' }),
    ];

    expect(purgeTargets(events, ITEMS, '2026-07-01')).toHaveLength(0);
  });

  it('철회 후 재동의했으면 대상이 아니다 (마지막 줄이 이긴다)', () => {
    const events = [
      withdrawn('mem-1', '2024-01-10T01:00:00.000Z'),
      event({ subjectId: 'mem-1', itemId: MARKETING.id, occurredAt: '2024-06-01T01:00:00.000Z' }),
    ];

    expect(purgeTargets(events, ITEMS, '2026-07-01')).toHaveLength(0);
  });

  it('함께 사라지는 이력 줄 수를 센다 — 지우면 무엇이 없어지는지 알고 지운다', () => {
    const events = [
      event({ subjectId: 'mem-1', itemId: MARKETING.id, occurredAt: '2024-01-01T01:00:00.000Z' }),
      withdrawn('mem-1', '2025-01-10T01:00:00.000Z'),
    ];

    expect(purgeTargets(events, ITEMS, '2026-07-01')[0]?.eventCount).toBe(2);
  });
});

/* ── 목록 좁히기 ─────────────────────────────────────────────────────────── */

describe('필터·검색', () => {
  const events = [
    event({ subjectId: 'mem-1', itemId: SERVICE.id, action: 'granted' }),
    event({ subjectId: 'mem-2', itemId: MARKETING.id, action: 'withdrawn', termsVersion: null }),
  ];

  it('항목과 구분이 AND 로 걸린다', () => {
    expect(filterConsentEvents(events, SERVICE.id, CONSENT_FILTER_ALL)).toHaveLength(1);
    expect(filterConsentEvents(events, CONSENT_FILTER_ALL, 'withdrawn')).toHaveLength(1);
    expect(filterConsentEvents(events, SERVICE.id, 'withdrawn')).toHaveLength(0);
  });

  it('회원 id 로도 약관 버전으로도 찾는다', () => {
    expect(searchConsentEvents(events, 'mem-2')).toHaveLength(1);
    expect(searchConsentEvents(events, 'v1.1')).toHaveLength(1);
    expect(searchConsentEvents(events, '  ')).toHaveLength(2);
  });

  it('최신이 위다', () => {
    const sorted = newestFirst([
      event({ occurredAt: '2026-01-01T00:00:00.000Z' }),
      event({ occurredAt: '2026-05-01T00:00:00.000Z' }),
    ]);

    expect(sorted[0]?.occurredAt).toBe('2026-05-01T00:00:00.000Z');
  });
});

/* ── append-only 는 표면으로 강제한다 ─────────────────────────────────────── */

describe('data-source 의 공개 표면 — 이력은 고쳐지지 않는다', () => {
  it('update·delete 에 해당하는 export 가 하나도 없다', () => {
    const surface = Object.keys(dataSource);
    const mutating = surface.filter((name) =>
      /^(update|patch|delete|remove|edit|clear|reset)/i.test(name),
    );

    // 없는 것은 부를 수 없다 — 이 단언이 그 불변성의 첫 방어선이다
    expect(mutating).toEqual([]);
  });

  it('쓰기 표면은 append 하나뿐이다', () => {
    const writes = Object.keys(dataSource).filter((name) => name.startsWith('append'));
    expect(writes).toEqual(['appendConsentEvent']);
  });
});

/* ── 이력 축의 세 상태 — '없음' 과 '모름' 은 다른 사실이다 ────────────────── */

describe('historyStateOf — 조회 중·실패를 대상 없음으로 그리지 않는다', () => {
  it('아직 못 읽었고 조회 중이면 로딩이다', () => {
    expect(historyStateOf(null, true)).toBe('loading');
  });

  it('못 읽었는데 조회도 끝났으면 실패다 — 빈 이력이 아니다', () => {
    expect(historyStateOf(null, false)).toBe('failed');
  });

  it('한 번이라도 받았으면 재조회 중이라도 그 값을 그린다 (STATE-03)', () => {
    expect(historyStateOf([], true)).toBe('ready');
    expect(historyStateOf([event({ itemId: MARKETING.id })], true)).toBe('ready');
  });

  it('진짜 0건은 ready 다 — 그때만 화면이 "없어요" 라고 말할 수 있다', () => {
    expect(historyStateOf([], false)).toBe('ready');
  });
});
