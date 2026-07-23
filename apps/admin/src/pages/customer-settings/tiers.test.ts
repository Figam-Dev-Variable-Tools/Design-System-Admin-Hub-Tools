// 등급 추가·이름 수정·삭제의 규칙 (모델) — apps/admin/src/pages/customer-settings/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 고정하나]
// 이 세 연산은 **거부 사유 문자열**을 돌려준다 — boolean 이 아니다. 같은 문자열이 두 곳에서 쓰인다:
// 화면이 버튼을 잠그며 다는 사유(title/aria-label)와, 연산이 거절하며 돌려주는 오류.
// 그래서 여기서 고정하는 것은 '막히는가' 가 아니라 **'무엇이라고 말하는가'** 다 —
// 문구가 갈라지면 운영자는 잠긴 버튼과 거절 배너에서 서로 다른 이유를 읽는다.
//
// [가장 위험한 한 줄: memberCount === null]
// 조회기가 배선되지 않으면 '이 등급을 쓰는 회원 수' 는 0 이 아니라 **null(확인 불가)** 이다.
// 그것을 0 으로 읽는 순간 회원이 붙어 있는 등급이 조용히 지워지고, 그 회원들의 등급은 존재하지
// 않는 id 를 가리킨다(고아 참조). 역할 삭제 가드가 같은 이유로 fail-closed 다.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';

import {
  addTier,
  removeTier,
  renameTier,
  SYSTEM_TIER_REASON,
  tierDeletionBlock,
  validateTierLabel,
} from './types';
import type { PolicyDraft, TierDraftRow } from './types';

const BUILT_IN: readonly TierDraftRow[] = [
  { id: 'normal', label: '일반회원', system: true, threshold: '0', discount: '0' },
  { id: 'vip', label: 'VIP', system: true, threshold: '1,000,000', discount: '3' },
  { id: 'vvip', label: 'VVIP', system: true, threshold: '5,000,000', discount: '5' },
];

const GOLD: TierDraftRow = {
  id: 'tier-gold',
  label: '골드',
  system: false,
  threshold: '3,000,000',
  discount: '4',
};

function draftOf(extra: readonly TierDraftRow[] = []): PolicyDraft {
  return {
    rows: [...BUILT_IN, ...extra],
    period: 'all',
    allowDemotion: false,
    recalcTrigger: 'order-completed',
  };
}

describe('validateTierLabel — 이름 규칙', () => {
  it('빈 이름을 거절한다', () => {
    expect(validateTierLabel('   ', BUILT_IN, null)).toBe('등급 이름을 입력하세요.');
  });

  it('20자를 넘는 이름을 거절한다', () => {
    expect(validateTierLabel('가'.repeat(21), BUILT_IN, null)).toBe(
      '등급 이름은 20자를 넘을 수 없어요.',
    );
  });

  it('기본 제공 등급의 이름과도 겹칠 수 없다 (대소문자 무시)', () => {
    expect(validateTierLabel('vip', BUILT_IN, null)).toBe('이미 같은 이름의 등급이 있어요.');
  });

  it('수정에서는 자기 자신을 중복으로 보지 않는다', () => {
    const rows = [...BUILT_IN, GOLD];
    expect(validateTierLabel('골드', rows, GOLD.id)).toBeNull();
  });
});

describe('addTier — 등급 추가', () => {
  it('이름만 받고, 승급 조건은 비운 채로 만든다 (금액을 지어내지 않는다)', () => {
    const result = addTier(draftOf(), '골드');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const added = result.draft.rows[result.draft.rows.length - 1];
    expect(added?.label).toBe('골드');
    expect(added?.system).toBe(false);
    // 비어 있으면 검증이 저장을 막는다 — 지어낸 금액이 정책이 되는 것보다 낫다
    expect(added?.threshold).toBe('');
    expect(added?.discount).toBe('0');
  });

  it('기존 행을 건드리지 않는다 (초안은 갈아끼운다)', () => {
    const before = draftOf();
    const result = addTier(before, '골드');
    expect(before.rows).toHaveLength(3);
    expect(result.ok && result.draft.rows).toHaveLength(4);
  });

  it('이름 규칙을 어기면 사유를 돌려준다', () => {
    const result = addTier(draftOf(), 'VIP');
    expect(result).toEqual({ ok: false, error: '이미 같은 이름의 등급이 있어요.' });
  });
});

describe('renameTier — 이름 수정', () => {
  it('추가한 등급의 이름을 바꾼다 — id 는 그대로다 (회원 참조가 따라온다)', () => {
    const result = renameTier(draftOf([GOLD]), GOLD.id, ' 플래티넘 ');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const renamed = result.draft.rows.find((row) => row.id === GOLD.id);
    expect(renamed?.label).toBe('플래티넘');
    // 참조가 id 라서 개명이 고아 참조를 만들지 않는다 — 그 사실을 여기서 못 박는다
    expect(renamed?.id).toBe(GOLD.id);
  });

  it('기본 제공 등급은 이름을 바꿀 수 없다 — 사유가 화면과 같은 문자열이다', () => {
    const result = renameTier(draftOf(), 'vip', '우수회원');
    expect(result).toEqual({ ok: false, error: `'VIP' 은(는) ${SYSTEM_TIER_REASON}` });
  });
});

describe('tierDeletionBlock — 삭제를 막는 이유', () => {
  it('기본 제공 등급은 잠겨 있다', () => {
    expect(tierDeletionBlock(BUILT_IN[1] as TierDraftRow, 0)).toBe(
      `'VIP' 은(는) ${SYSTEM_TIER_REASON}`,
    );
  });

  it("회원 수를 '확인할 수 없으면' 막는다 — 0명과 섞지 않는다 (fail-closed)", () => {
    expect(tierDeletionBlock(GOLD, null)).toBe(
      "'골드' 등급을 쓰는 회원을 확인하지 못해 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.",
    );
  });

  it('쓰는 회원이 있으면 몇 명인지와 어디서 바꾸는지를 함께 말한다', () => {
    expect(tierDeletionBlock(GOLD, 1234)).toBe(
      "'골드' 등급을 쓰는 회원이 1,234명 있어 삭제할 수 없어요. 회원 관리(/users/members)에서 이 회원들의 등급을 먼저 바꾼 뒤 다시 삭제해 주세요.",
    );
  });

  it('쓰는 회원이 0명인 추가 등급만 막지 않는다', () => {
    expect(tierDeletionBlock(GOLD, 0)).toBeNull();
  });
});

describe('removeTier — 삭제는 참조 검사 뒤에', () => {
  it('쓰는 회원이 없으면 목록에서 뺀다', () => {
    const result = removeTier(draftOf([GOLD]), GOLD.id, 0);
    expect(result.ok).toBe(true);
    expect(result.ok && result.draft.rows.map((row) => row.id)).toEqual(['normal', 'vip', 'vvip']);
  });

  it('쓰는 회원이 있으면 같은 사유로 거절한다 — 버튼 잠금과 저장 거부가 한 문장이다', () => {
    const result = removeTier(draftOf([GOLD]), GOLD.id, 3);
    expect(result).toEqual({ ok: false, error: tierDeletionBlock(GOLD, 3) });
  });

  it('회원 수를 모르면 거절한다 (미배선 조회기)', () => {
    const result = removeTier(draftOf([GOLD]), GOLD.id, null);
    expect(result).toEqual({ ok: false, error: tierDeletionBlock(GOLD, null) });
  });

  it('기본 제공 등급은 지울 수 없다', () => {
    const result = removeTier(draftOf(), 'normal', 0);
    expect(result.ok).toBe(false);
  });
});
