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
import type { PolicyDraft } from './types';
import { validateDraft } from './validation';

function draftOf(rows: {
  normal?: [string, string];
  vip?: [string, string];
  vvip?: [string, string];
}): PolicyDraft {
  const [nt, nd] = rows.normal ?? ['0', '0'];
  const [vt, vd] = rows.vip ?? ['100,000', '3'];
  const [wt, wd] = rows.vvip ?? ['500,000', '5'];
  return {
    rows: {
      normal: { threshold: nt, discount: nd },
      vip: { threshold: vt, discount: vd },
      vvip: { threshold: wt, discount: wd },
    },
    period: 'all',
    allowDemotion: true,
    recalcTrigger: 'daily',
  };
}

describe('validateDraft — 에러 (저장 거부)', () => {
  it('정상 정책은 policy 를 만들어 준다', () => {
    const { policy, issues } = validateDraft(draftOf({}));
    expect(policy).not.toBeNull();
    expect(policy?.rules.vip).toEqual({ threshold: 100_000, discountPercent: 3 });
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
      'VVIP 승급 조건(50,000원)은 VIP 승급 조건(100,000원)보다 커야 합니다.',
    );
  });

  it('VIP 승급 조건 0 은 기본 등급(0)과 같아 저장을 막는다', () => {
    expect(validateDraft(draftOf({ vip: ['0', '3'] })).policy).toBeNull();
  });

  it('일반회원의 승급 조건은 입력과 무관하게 항상 0 이다 (기본 등급)', () => {
    // 입력이 쓰레기여도 에러가 나지 않는다 — 모델이 0 으로 고정한다
    const { policy } = validateDraft(draftOf({ normal: ['9999', '0'] }));
    expect(policy?.rules.normal.threshold).toBe(0);
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
    expect(warnings[0]?.message).toContain('등급이 올라가는데 혜택이 줄어듭니다');
  });
});
