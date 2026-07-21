// 배너 카탈로그 조회기 — **자리만** 만든다 (목록의 정본은 콘텐츠 관리 배너가 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 배너를 가리키는 손가락이 없었다]
// 마케팅 이벤트는 '배너 연동' 을 **배너명 자유 텍스트**로 받았다. 그래서 '메인 상단 여름 배너'
// 라고 적어 두면, 콘텐츠 관리에서 그 배너의 이름이 바뀌어도·삭제돼도 이벤트는 옛 문구를 그대로
// 들고 있었다. 오탈자는 아무도 막지 못했고, 이벤트에서 그 배너로 건너뛸 길도 없었다.
// 사람이 눈으로 맞추는 연결은 연결이 아니다.
//
// [왜 이벤트가 배너를 직접 import 하지 않나]
// `pages/marketing` → `pages/content` 는 페이지 간 결합이고 code-quality 축1(page-coupling,
// blocker, 임계값 0건)이 그대로 잡는다. 공통 층인 여기는 **계약과 등록기**만 갖고, 실제 목록을
// 꽂는 일은 두 도메인을 모두 아는 `src/wiring.ts` 가 한다
// (같은 결의 선례: shared/domain/faq-catalog.ts · shared/domain/coupon-catalog.ts).
//
// [왜 '모른다(null)' 인가] 배선이 없을 때 빈 배열을 주면 이벤트 폼이 '연동할 배너가 없습니다'
// 라는 완결된 문장을 그린다 — 배선 사고가 데이터 사고처럼 보인다. 그래서 둘을 가른다
// (자세한 이유는 shared/domain/faq-catalog.ts 머리말).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 연동 대상으로 고를 수 있는 배너 한 건 — **콘텐츠 쪽이 소유하는 값만** 담는다.
 *
 * 노출 위치·기간·정렬 순서는 여기 없다. 그것은 배너 관리가 소유하는 축이고, 연동하는 쪽이
 * 판단에 쓰지 않는다.
 */
export interface CatalogBanner {
  /** 콘텐츠 배너의 id — 연동 레코드가 이 값을 키로 삼는다 */
  readonly id: string;
  readonly title: string;
}

/**
 * 카탈로그가 필요로 하는 배너의 **최소 모양**.
 *
 * 배너 모듈의 `Banner` 타입을 import 하지 않는다 — 구조적 타입으로 받으면 공통 층이 페이지
 * 모듈을 향해 화살표를 그리지 않는다. 꽂는 쪽(wiring)이 자기 배열을 그대로 넘기면 된다.
 */
export interface BannerLike {
  readonly id: string;
  readonly title: string;
}

/**
 * 배너 목록 → 카탈로그. 원래 순서(정렬 순서) 그대로, **전량**.
 *
 * 노출 OFF 인 배너를 빼지 않는 이유: 카탈로그는 선택 목록이자 **표시값의 정본**이다. 걸러 내면
 * 이미 그 배너를 연동해 둔 이벤트가 조인에 실패해 '삭제된 배너' 로 보인다 — 꺼 둔 것과 없는 것은
 * 다르다. 연동 시점의 노출 여부 판단은 배너 관리 화면의 몫이다.
 */
export function toBannerCatalog(banners: readonly BannerLike[]): readonly CatalogBanner[] {
  return banners.map(({ id, title }) => ({ id, title }));
}

type BannerCatalogLookup = () => readonly CatalogBanner[];

/** 미배선 상태 — null 은 '없다' 가 아니라 '모른다' 다(머리말) */
let lookup: BannerCatalogLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 호출자는 `src/wiring.ts` 하나다 */
export function registerBannerCatalogLookup(next: BannerCatalogLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetBannerCatalogLookup(): void {
  lookup = null;
}

/** 지금 연동할 수 있는 배너 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function bannerCatalog(): readonly CatalogBanner[] | null {
  if (lookup === null) return null;
  return lookup();
}

/** 배너 관리 상세로 가는 경로 — 연동한 값을 눌러 원본으로 건너뛰는 유일한 실 */
export function bannerEditPath(bannerId: string): string {
  return `/content/banners/${bannerId}/edit`;
}

/** 카탈로그에서 한 건 — 없으면 null(삭제됐거나 아직 모르는 id). 색인으로 조회한다 */
export function findCatalogBanner(
  catalog: readonly CatalogBanner[],
  bannerId: string,
): CatalogBanner | null {
  const byId: Record<string, CatalogBanner> = {};
  for (const banner of catalog) byId[banner.id] = banner;
  return byId[bannerId] ?? null;
}
