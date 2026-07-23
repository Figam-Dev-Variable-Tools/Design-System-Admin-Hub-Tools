// 등급 카탈로그 이음매 — '없다' 와 '모른다' 를 가른다
//
// [무엇이 걸려 있나] 이 두 조회기는 미배선일 때 **null** 을 돌려준다. 그 한 줄이 무너지면
//   · 카탈로그가 [] → 읽는 화면이 '등록된 등급이 없습니다' 라는 완결된 거짓말을 그린다.
//   · 사용 수가 0  → 회원이 붙어 있는 등급이 조용히 지워진다(고아 참조).
// coupon-issuance.test.ts 가 같은 이유로 같은 모양의 검사를 들고 있다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  memberTierCatalog,
  memberTierUsage,
  registerMemberTierCatalogLookup,
  registerMemberTierUsageLookup,
  resetMemberTierCatalogLookup,
  resetMemberTierUsageLookup,
} from './member-tier-catalog';
import type { MemberTierEntry } from './member-tier-catalog';

const GOLD: MemberTierEntry = {
  id: 'tier-gold',
  label: '골드',
  system: false,
  threshold: 3_000_000,
  discountPercent: 4,
};

afterEach(() => {
  resetMemberTierCatalogLookup();
  resetMemberTierUsageLookup();
});

describe('memberTierCatalog — 등급 목록', () => {
  it('배선 전에는 null 이다 — 빈 배열이 아니다', () => {
    resetMemberTierCatalogLookup();
    expect(memberTierCatalog()).toBeNull();
  });

  it('꽂으면 그 목록을 그대로 돌려준다', () => {
    registerMemberTierCatalogLookup(() => [GOLD]);
    expect(memberTierCatalog()).toEqual([GOLD]);
  });

  it('나중에 꽂은 조회기가 앞의 것을 대신한다 (멱등 재등록)', () => {
    registerMemberTierCatalogLookup(() => [GOLD]);
    registerMemberTierCatalogLookup(() => []);
    expect(memberTierCatalog()).toEqual([]);
  });
});

describe('memberTierUsage — 이 등급을 쓰는 회원 수', () => {
  it('배선 전에는 null 이다 — 0 이 아니다(삭제 가드가 그때 막는다)', () => {
    resetMemberTierUsageLookup();
    expect(memberTierUsage('tier-gold')).toBeNull();
  });

  it('꽂으면 등급 id 로 물어본 값을 돌려준다', () => {
    registerMemberTierUsageLookup((tierId) => (tierId === 'tier-gold' ? 3 : 0));
    expect(memberTierUsage('tier-gold')).toBe(3);
    // '쓰는 회원이 없다(0)' 는 '모른다(null)' 와 다른 답이다
    expect(memberTierUsage('vip')).toBe(0);
  });
});
