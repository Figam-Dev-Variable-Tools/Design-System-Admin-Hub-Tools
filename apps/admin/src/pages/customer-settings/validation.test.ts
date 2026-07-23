// 등급 정책 검증 규칙 회귀 테스트
//
// 이 규칙들은 types.ts 의 손코딩 validateDraft() 에서 **zod 스키마로 옮겨졌다.**
// 옮기면서 지켜야 했던 두 가지를 여기서 고정한다:
//
//   ① **에러**(저장 거부)의 문구·조건이 그대로인가
//   ② **경고**(저장 허용)가 여전히 저장을 **막지 않는가**
//      — zod 에는 경고 채널이 없다. 경고를 스키마에 넣었다면 지금까지 저장되던 정책이
//        저장 거부로 바뀌었을 것이다. 그 회귀를 이 테스트가 막는다.
import { describe, expect, it } from 'vitest';

import { errorsOf, warningsOf } from './types';
import type { PolicyDraft, TierDraftRow } from './types';
import { validateDraft } from './validation';

function draftOf(
  rows: {
    normal?: [string, string];
    vip?: [string, string];
    vvip?: [string, string];
  },
  extra: readonly TierDraftRow[] = [],
): PolicyDraft {
  const [nt, nd] = rows.normal ?? ['0', '0'];
  const [vt, vd] = rows.vip ?? ['100,000', '3'];
  const [wt, wd] = rows.vvip ?? ['500,000', '5'];
  return {
    rows: [
      { id: 'normal', label: '일반회원', system: true, threshold: nt, discount: nd },
      { id: 'vip', label: 'VIP', system: true, threshold: vt, discount: vd },
      { id: 'vvip', label: 'VVIP', system: true, threshold: wt, discount: wd },
      ...extra,
    ],
    period: 'all',
    allowDemotion: true,
    recalcTrigger: 'daily',
  };
}

/** 운영자가 추가한 등급 한 줄 — 기본 제공 등급과 달리 이름·삭제가 열려 있다 */
function customRow(id: string, label: string, threshold: string, discount: string): TierDraftRow {
  return { id, label, system: false, threshold, discount };
}

function tierOf(policy: { readonly tiers: readonly { readonly id: string }[] } | null, id: string) {
  return policy?.tiers.find((tier) => tier.id === id) ?? null;
}

describe('validateDraft — 에러 (저장 거부)', () => {
  it('정상 정책은 policy 를 만들어 준다', () => {
    const { policy, issues } = validateDraft(draftOf({}));
    expect(policy).not.toBeNull();
    expect(tierOf(policy, 'vip')).toEqual({
      id: 'vip',
      label: 'VIP',
      system: true,
      threshold: 100_000,
      discountPercent: 3,
    });
    expect(issues).toHaveLength(0);
  });

  it('금액이 정수로 읽히지 않으면 저장을 막는다', () => {
    const { policy, issues } = validateDraft(draftOf({ vip: ['abc', '3'] }));
    expect(policy).toBeNull();
    expect(errorsOf(issues)[0]?.target).toBe('vip-threshold');
    expect(errorsOf(issues)[0]?.message).toBe('VIP 승급 조건은 0 이상의 정수(원)로 입력하세요.');
  });

  it('할인율이 0~100 을 벗어나면 저장을 막는다', () => {
    const { policy, issues } = validateDraft(draftOf({ vip: ['100,000', '101'] }));
    expect(policy).toBeNull();
    expect(errorsOf(issues)[0]?.target).toBe('vip-discount');
    expect(errorsOf(issues)[0]?.message).toBe('VIP 할인율은 0~100 사이의 정수(%)로 입력하세요.');
  });

  it('승급 조건이 등급 순으로 커지지 않으면 저장을 막는다 (단조 증가)', () => {
    // VVIP(50,000) <= VIP(100,000)
    const { policy, issues } = validateDraft(draftOf({ vvip: ['50,000', '5'] }));
    expect(policy).toBeNull();
    const error = errorsOf(issues)[0];
    expect(error?.target).toBe('vvip-threshold');
    expect(error?.message).toBe(
      'VVIP 승급 조건(50,000원)은 VIP 승급 조건(100,000원)보다 커야 해요.',
    );
  });

  it('VIP 승급 조건 0 은 기본 등급(0)과 같아 저장을 막는다', () => {
    expect(validateDraft(draftOf({ vip: ['0', '3'] })).policy).toBeNull();
  });

  it('일반회원의 승급 조건은 입력과 무관하게 항상 0 이다 (기본 등급)', () => {
    // 입력이 쓰레기여도 에러가 나지 않는다 — 모델이 0 으로 고정한다
    const { policy } = validateDraft(draftOf({ normal: ['9999', '0'] }));
    expect(tierOf(policy, 'normal')).toMatchObject({ threshold: 0 });
  });
});

describe('validateDraft — 등급을 추가할 수 있게 되면서 늘어난 규칙', () => {
  it('정책의 등급 목록은 승급 조건 오름차순으로 세워진다 (순서는 저장된 값이 아니라 파생값)', () => {
    // 추가한 등급을 목록 맨 뒤에 붙여도, 정책은 금액 순서로 다시 세운다
    const { policy } = validateDraft(draftOf({}, [customRow('tier-gold', '골드', '300,000', '4')]));
    expect(policy?.tiers.map((tier) => tier.id)).toEqual(['normal', 'vip', 'tier-gold', 'vvip']);
  });

  it('승급 조건이 비어 있으면 저장을 막는다 — 추가 직후의 등급이 그 상태다', () => {
    const { policy, issues } = validateDraft(
      draftOf({}, [customRow('tier-gold', '골드', '', '0')]),
    );
    expect(policy).toBeNull();
    const error = errorsOf(issues).find((issue) => issue.target === 'tier-gold-threshold');
    expect(error?.message).toBe('골드 승급 조건은 0 이상의 정수(원)로 입력하세요.');
  });

  it('승급 조건이 다른 등급과 같으면 저장을 막는다 (서열이 정해지지 않는다)', () => {
    const { policy, issues } = validateDraft(
      draftOf({}, [customRow('tier-gold', '골드', '100,000', '4')]),
    );
    expect(policy).toBeNull();
    const error = errorsOf(issues).find((issue) => issue.target === 'tier-gold-threshold');
    expect(error?.message).toBe(
      '골드 승급 조건(100,000원)이 VIP 과(와) 같아요. 등급마다 다른 금액이어야 어느 등급이 위인지 정해져요.',
    );
  });

  it('기본 제공 등급이 목록에서 사라지면 저장을 막는다 (회원이 그 id 를 들고 있다)', () => {
    const full = draftOf({});
    const withoutVvip: PolicyDraft = {
      ...full,
      rows: full.rows.filter((row) => row.id !== 'vvip'),
    };

    const { policy, issues } = validateDraft(withoutVvip);
    expect(policy).toBeNull();
    const error = errorsOf(issues).find((issue) => issue.target === 'policy');
    expect(error?.message).toBe(
      "기본 제공 등급 'VVIP' 이(가) 목록에 없어요. 이 등급을 쓰는 회원이 존재하므로 지울 수 없어요.",
    );
  });

  it('추가한 등급의 할인율 역전도 경고로 잡는다 (기본 등급 사이에 끼어 있어도)', () => {
    // 골드(300,000원, 1%)는 VIP(100,000원, 3%) 위인데 혜택이 더 적다
    const { policy, issues } = validateDraft(
      draftOf({}, [customRow('tier-gold', '골드', '300,000', '1')]),
    );
    expect(policy).not.toBeNull();
    expect(warningsOf(issues).map((issue) => issue.message)).toContain(
      '골드 할인율(1%)이 VIP 할인율(3%)보다 낮아요. 등급이 올라가는데 혜택이 줄어들어요 — 의도한 정책인지 확인하세요.',
    );
  });
});

describe('validateDraft — 경고 (저장 허용)', () => {
  it('할인율 역전은 경고일 뿐 저장을 막지 않는다', () => {
    // VVIP 할인율(1%) < VIP 할인율(3%) — 정책상 가능하지만 대개 실수다
    const { policy, issues } = validateDraft(draftOf({ vvip: ['500,000', '1'] }));

    // **핵심**: policy 가 null 이 아니다 = 저장할 수 있다
    expect(policy).not.toBeNull();
    expect(errorsOf(issues)).toHaveLength(0);

    const warnings = warningsOf(issues);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.target).toBe('policy');
    expect(warnings[0]?.message).toContain('등급이 올라가는데 혜택이 줄어들어요');
  });
});
