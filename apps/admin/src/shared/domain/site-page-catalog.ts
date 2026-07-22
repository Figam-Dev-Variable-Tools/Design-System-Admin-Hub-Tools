// 홈페이지 페이지 카탈로그 조회기 — **자리만** 만든다 (목록의 정본은 페이지 관리가 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 메뉴가 가리키는 손가락이 없었다]
// B2C 홈페이지의 메뉴(/content/menus)는 '사업영역' 아래에 하위 페이지를 매단다. 그 대상은
// 페이지 관리(/content/pages)가 만드는 임의 페이지다. 메뉴 화면이 페이지 모듈을 직접 import 하면
// 두 모듈이 한 몸이 되고, 페이지 관리를 지우는 순간 메뉴 화면이 함께 죽는다
// (code-quality 축1 page-coupling · blocker · 임계값 0건이 노리는 바로 그 형태다).
//
// 그래서 방향을 뒤집는다: 공통 층인 여기는 **계약과 등록기**만 갖고, 실제 목록을 꽂는 일은 두
// 도메인을 모두 아는 `src/wiring.ts` 가 한다. 메뉴 화면은 끝까지 '페이지 관리' 라는 모듈을 모른 채
// pageId 만 들고 있는다. (같은 결의 선례: coupon-catalog.ts · faq-catalog.ts · banner-catalog.ts.)
//
// [왜 fail-closed 가 아니라 '모른다(null)' 인가]
// 조회기가 없을 때 빈 배열을 주면 메뉴 화면은 **모든 내부 링크를 '끊긴 링크' 로 붉게 칠한다** —
// 멀쩡한 메뉴 트리가 전부 고장 난 것처럼 보이고, 운영자는 있지도 않은 사고를 고치러 간다.
// 배선 사고를 데이터 사고처럼 보이게 만드는 화면이다. 그래서 '없다' 와 '모른다' 를 가른다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 메뉴가 가리킬 수 있는 페이지 한 건 — **만드는 쪽이 소유하는 값만** 담는다.
 *
 * 버전 이력·미리보기 토큰·본문은 여기 없다. 그것은 페이지 관리가 소유하는 축이고, 가리키는 쪽이
 * 알아야 할 이유가 없다 — 계약에 섞으면 어느 화면이 주인인지 다시 흐려진다.
 */
export interface CatalogSitePage {
  /** 페이지 관리의 id — 메뉴 레코드가 이 값을 키로 삼는다 */
  readonly id: string;
  readonly title: string;
  /** 홈페이지 경로 조각 — 메뉴가 실제로 링크할 주소를 만든다 */
  readonly slug: string;
  /**
   * 지금 공개되어 있는가 — `status` 를 그대로 넘기지 않는 이유는 파생값을 두 번 계산하지 않기
   * 위해서다. '예약중' 판정은 publish-schedule 이 소유하고, 여기 도착할 때는 이미 결론이다.
   */
  readonly published: boolean;
}

type SitePageCatalogLookup = () => readonly CatalogSitePage[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let lookup: SitePageCatalogLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerSitePageCatalogLookup(next: SitePageCatalogLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetSitePageCatalogLookup(): void {
  lookup = null;
}

/** 지금 메뉴가 가리킬 수 있는 페이지 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function sitePageCatalog(): readonly CatalogSitePage[] | null {
  if (lookup === null) return null;
  return lookup();
}

/** 페이지 관리 수정 화면으로 가는 경로 — 메뉴에서 원본으로 건너뛰는 유일한 실 */
export function sitePageEditPath(pageId: string): string {
  return `/content/pages/${pageId}/edit`;
}

/**
 * id → 페이지 색인.
 *
 * `find` 대신 Record 를 쓰는 이유는 coupon-catalog 와 같다: 조인이 목록 길이만큼 반복되고,
 * 무엇보다 `find(...) ?? list[0]` 같은 '못 찾으면 아무거나' 실수를 구조적으로 막는다.
 */
export function sitePagesById(
  catalog: readonly CatalogSitePage[],
): Readonly<Record<string, CatalogSitePage>> {
  const byId: Record<string, CatalogSitePage> = {};
  for (const page of catalog) byId[page.id] = page;
  return byId;
}

/** 카탈로그에서 한 건 — 없으면 null(삭제됐거나 아직 모르는 id) */
export function findCatalogSitePage(
  catalog: readonly CatalogSitePage[],
  pageId: string,
): CatalogSitePage | null {
  return sitePagesById(catalog)[pageId] ?? null;
}

/* ── 내부 참조의 건강 상태 ────────────────────────────────────────────────── */

/**
 * 내부 페이지 참조가 지금 어떤 상태인가.
 *
 * 셋을 가르는 이유: **복구 수단이 서로 다르다.**
 *   · 'ok'      아무것도 할 일이 없다.
 *   · 'missing' 대상이 사라졌다 — 링크가 죽는다. 메뉴를 지우거나 다른 대상을 골라야 한다.
 *   · 'hidden'  대상이 아직 공개되지 않았다 — 메뉴는 살아 있지만 방문자는 빈 화면을 만난다.
 *               페이지를 발행하면 저절로 풀린다(메뉴는 건드릴 것이 없다).
 *   · 'unknown' 카탈로그를 못 읽었다 — 데이터가 아니라 배선의 문제다(머리말).
 */
export type SitePageRefHealth = 'ok' | 'missing' | 'hidden' | 'unknown';

export function sitePageRefHealth(
  catalog: readonly CatalogSitePage[] | null,
  pageId: string,
): SitePageRefHealth {
  if (catalog === null) return 'unknown';
  const page = findCatalogSitePage(catalog, pageId);
  if (page === null) return 'missing';
  return page.published ? 'ok' : 'hidden';
}

export const SITE_PAGE_REF_MISSING =
  '연결된 페이지가 삭제되었습니다 — 이 메뉴를 누르면 없는 주소로 갑니다.';
export const SITE_PAGE_REF_HIDDEN =
  '연결된 페이지가 아직 공개되지 않았습니다 — 발행하면 저절로 풀립니다.';
export const SITE_PAGE_REF_UNKNOWN = '연결된 페이지를 확인할 수 없습니다.';

/** 사람이 읽는 경고 한 줄 — 문제가 없으면 null */
export function sitePageRefWarning(health: SitePageRefHealth): string | null {
  switch (health) {
    case 'missing':
      return SITE_PAGE_REF_MISSING;
    case 'hidden':
      return SITE_PAGE_REF_HIDDEN;
    case 'unknown':
      return SITE_PAGE_REF_UNKNOWN;
    case 'ok':
      return null;
  }
}
