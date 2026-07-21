// 쿠폰 카탈로그 조회기 — **자리만** 만든다 (목록의 정본은 상품 관리 쿠폰이 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 쿠폰을 가리키는 손가락이 없었다]
// 쿠폰을 말하는 화면은 셋이다.
//   · 상품 관리 쿠폰(/products/coupons) — **정의**한다. 코드·할인·수량·기간의 정본.
//   · 마케팅 프로모션(/marketing/promotions) — 쿠폰을 **연동**한다.
//   · 회원 상세의 보유 쿠폰(/users/members/:id) — 회원이 그 쿠폰을 **발급받았다**.
// 그런데 프로모션은 쿠폰코드를 자유 텍스트로 받았고, 회원 보유 쿠폰은 자기 픽스처를 지어냈다.
// 그래서 존재하지 않는 코드가 조용히 저장됐고, 프로모션에서 쿠폰으로 넘어갈 길이 없었고,
// 쿠폰 관리의 발급 수량과 회원 상세의 보유 쿠폰은 **영원히 서로 다른 이야기**를 했다.
//
// [왜 소비자가 상품 쿠폰을 직접 import 하지 않나]
// `pages/marketing` → `pages/products`, `pages/members` → `pages/products` 는 페이지 간 결합이고
// code-quality 축1(page-coupling, blocker, 임계값 0건)이 그대로 잡는다. 그래서 방향을 뒤집는다:
// 공통 층인 여기는 **계약과 등록기**만 갖고, 실제 목록을 꽂는 일은 두 도메인을 모두 아는
// `src/wiring.ts` 가 한다. 소비 화면은 끝까지 '상품 관리' 라는 모듈을 모른 채 id 만 들고 있는다.
// (같은 결의 선례: shared/domain/faq-catalog.ts · shared/fixtures/admin-groups.ts.)
//
// [왜 링크 경로가 여기 있나] 화면 사이를 잇는 실은 이제 **경로 문자열 하나뿐**이다. 경로는 모듈
// import 가 아니라서 결합이 아니고, 한 곳에 모아 두어야 라우트가 바뀔 때 한 번만 고친다.
//
// [왜 fail-closed 가 아니라 '모른다(null)' 인가]
// 조회기가 없을 때 빈 배열을 주면 프로모션 폼은 **'선택할 쿠폰이 없습니다'** 라는 완결된 문장을
// 그린다 — 운영자는 그것을 사실로 읽고 쿠폰을 다시 만들러 간다. 배선 사고를 데이터 사고처럼
// 보이게 만드는 화면이다. 그래서 '없다' 와 '모른다' 를 가른다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 연동 대상으로 고를 수 있는 쿠폰 한 건 — **정의하는 쪽이 소유하는 값만** 담는다.
 *
 * 발급수량·소진율·사용조건은 여기 없다. 그것은 쿠폰 관리가 소유하는 축이고, 연동하는 쪽이 알아야
 * 할 이유가 없다 — 계약에 섞으면 어느 화면이 주인인지 다시 흐려진다.
 */
export interface CatalogCoupon {
  /** 상품 관리 쿠폰의 id — 연동 레코드가 이 값을 키로 삼는다 */
  readonly id: string;
  readonly name: string;
  /** 고객이 입력하는 쿠폰 코드 — 선택 목록에서 동명이쿠폰을 가른다 */
  readonly code: string;
  /** 할인 요약 문구('15% 할인') — 표기 규칙의 정본은 쿠폰 모듈의 discountLabel 이다 */
  readonly benefitLabel: string;
  /**
   * 캠페인 종료일 'YYYY-MM-DD' — 보유 쿠폰의 '언제까지' 가 이 값이다.
   *
   * [알려진 한계] 쿠폰이 '발급일 기준 N일' 사용 기간을 쓰면 한 장의 실제 만료일은 회원마다 다르고
   * 이 값보다 이르다(쿠폰 모듈의 couponExpiryFor 가 정본). 여기는 발급일을 모르므로 캠페인
   * 종료일을 준다 — **상한으로는 언제나 참**이다. 정확한 만료일이 필요해지면 계약에 사용기간을
   * 얹지 말고 조인하는 쪽(joinIssuedCoupons)에 발급일을 함께 넘기는 방향이 맞다.
   */
  readonly endAt: string;
}

type CouponCatalogLookup = () => readonly CatalogCoupon[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let lookup: CouponCatalogLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerCouponCatalogLookup(next: CouponCatalogLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetCouponCatalogLookup(): void {
  lookup = null;
}

/** 지금 연동할 수 있는 쿠폰 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function couponCatalog(): readonly CatalogCoupon[] | null {
  if (lookup === null) return null;
  return lookup();
}

/** 쿠폰 관리 상세로 가는 경로 — 연동한 값을 눌러 원본으로 건너뛰는 유일한 실 */
export function couponEditPath(couponId: string): string {
  return `/products/coupons/${couponId}/edit`;
}

/**
 * id → 쿠폰 색인.
 *
 * `find` 대신 Record 를 쓰는 이유: 조인은 목록 길이만큼 반복되고, 무엇보다 `find(...) ?? list[0]`
 * 같은 '못 찾으면 아무거나' 실수를 구조적으로 막는다 — 못 찾은 것은 undefined 로 드러나야 한다.
 */
export function couponsById(
  catalog: readonly CatalogCoupon[],
): Readonly<Record<string, CatalogCoupon>> {
  const byId: Record<string, CatalogCoupon> = {};
  for (const coupon of catalog) byId[coupon.id] = coupon;
  return byId;
}

/** 카탈로그에서 한 건 — 없으면 null(삭제됐거나 아직 모르는 id) */
export function findCatalogCoupon(
  catalog: readonly CatalogCoupon[],
  couponId: string,
): CatalogCoupon | null {
  return couponsById(catalog)[couponId] ?? null;
}
