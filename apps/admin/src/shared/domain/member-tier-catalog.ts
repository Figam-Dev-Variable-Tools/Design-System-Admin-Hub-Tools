// 회원 등급 카탈로그 이음매 — **자리만** 만든다 (정본은 고객 설정 화면이 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 member.ts 가 아니라 여기인가]
// `member.ts` 의 `MemberTier`(= 'normal' | 'vip' | 'vvip')는 **닫힌 유니온**이다. 회원 목록·CSV·
// 쿠폰 발급 기준·회원 상세가 그 유니온을 키로 쓰는 Record 를 들고 있어서(TIER_LABEL 등), 운영자가
// 등급을 추가하는 순간 그 세 개는 더 이상 '등급의 전부' 가 아니게 된다. 그렇다고 유니온을 string
// 으로 열면 그 Record 들이 전부 깨진다 — 한 번에 갈아엎을 수 없는 표면이다.
//
// 그래서 경계를 이렇게 그었다:
//   - `member.ts`      : **기본 제공 등급 3종**의 정의 (닫힌 유니온 · 라벨의 정본)
//   - 이 파일           : **운영자가 정의한 등급 전부**를 읽는 계약 (열린 문자열 id)
// 기본 제공 등급의 id 는 두 곳에서 같은 값이다('normal'·'vip'·'vvip') — 회원이 들고 있는 참조가
// 그 값이기 때문이다. 그래서 이 카탈로그를 읽는 쪽은 기존 참조를 그대로 해석할 수 있다.
//
// [왜 고객 설정 화면이 정본인가]
// 등급을 만들고 고치는 화면이 거기 하나다(/users/settings). 다른 화면이 그 화면을 import 하면
// pages ↔ pages 결합이고 code-quality 축1(page-coupling, 임계값 0건)이 blocker 로 잡는다.
// 그래서 공통 층이 계약과 등록기만 갖고, 두 도메인을 아는 `src/wiring.ts` 가 구현을 꽂는다 —
// coupon-issuance.ts · permission-store.ts(역할 배정 수)와 **같은 이음매·같은 규약**이다.
//
// [미배선은 '모른다(null)' 다 — 방향이 둘로 갈린다]
//   - 카탈로그(memberTierCatalog)      : null = '등급 목록을 모른다'. 빈 배열로 뭉개면 읽는 화면이
//     '등록된 등급이 없습니다' 라는 **완결된 거짓말**을 그린다.
//   - 사용 수(memberTierUsage)          : null = '몇 명이 쓰는지 모른다'. 0 으로 읽으면 회원이 붙어
//     있는 등급이 조용히 삭제된다 — 그래서 삭제 가드가 그때도 거절한다(fail-closed).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 등급 한 건 — **읽는 쪽이 그대로 그릴 수 있는 값만** 담는다.
 *
 * 집계 기간·강등 허용·재계산 시점은 여기 없다. 그것들은 등급 하나의 속성이 아니라 정책 전체의
 * 축이고, 등급 목록을 읽는 화면(회원 목록의 필터·통계의 세그먼트)이 답해야 하는 질문이 아니다.
 */
export interface MemberTierEntry {
  /** 회원이 들고 있는 참조값과 같은 id — 기본 제공 등급이면 'normal' | 'vip' | 'vvip' */
  readonly id: string;
  readonly label: string;
  /** 기본 제공 등급인가 — 이름 변경·삭제가 잠긴다 */
  readonly system: boolean;
  /** 승급 조건 — 누적 구매금액(원). 기본 등급은 항상 0 */
  readonly threshold: number;
  readonly discountPercent: number;
}

type MemberTierCatalogLookup = () => readonly MemberTierEntry[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let catalogLookup: MemberTierCatalogLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerMemberTierCatalogLookup(next: MemberTierCatalogLookup): void {
  catalogLookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetMemberTierCatalogLookup(): void {
  catalogLookup = null;
}

/** 지금 운영 중인 등급 목록(낮은 등급 → 높은 등급) — **배선되지 않았으면 null** */
export function memberTierCatalog(): readonly MemberTierEntry[] | null {
  return catalogLookup === null ? null : catalogLookup();
}

/* ── 반대 방향: 이 등급을 쓰는 회원이 몇 명인가 ────────────────────────────────
 *
 * 카탈로그가 '고객 설정 → 다른 화면' 이라면 이쪽은 '회원 명부 → 고객 설정' 이다. 등급 삭제 가드가
 * 물어보는 유일한 질문이고, 답은 회원 명부가 갖고 있다(역할 삭제 가드가 운영자 명부에 묻는 것과
 * 정확히 같은 모양 — permission-store.ts 의 registerRoleAssigneeCountLookup).
 */

type MemberTierUsageLookup = (tierId: string) => number;

let usageLookup: MemberTierUsageLookup | null = null;

export function registerMemberTierUsageLookup(next: MemberTierUsageLookup): void {
  usageLookup = next;
}

export function resetMemberTierUsageLookup(): void {
  usageLookup = null;
}

/** 이 등급을 쓰는 회원 수 — 조회기가 없으면 null(확인 불가). 0 과 섞지 않는다 */
export function memberTierUsage(tierId: string): number | null {
  return usageLookup === null ? null : usageLookup(tierId);
}
