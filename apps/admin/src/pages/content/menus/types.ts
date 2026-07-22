// 메뉴 관리 화면 전용 타입 + 순수 규칙
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇의 메뉴인가 — 혼동하기 쉬운 지점]
// 여기서 만드는 것은 **B2C 홈페이지의 메뉴**다. 어드민 자신의 사이드바는
// `shared/layout/nav-config.ts` 가 소유하고 코드로 고정돼 있다 — 운영자가 바꾸는 것이 아니다.
// 이름이 같아 헷갈리지만 둘은 다른 세계이고, 이 파일은 nav-config 를 알지 못한다.
//
// [2뎁스까지다 — 상품·프로그램 카테고리와 같은 규약]
// 대분류 아래 중분류까지만 만든다. 3단계를 여는 순간 '어디에 있는지' 를 사람이 추적하지 못하고,
// 홈페이지의 드롭다운도 그 깊이를 그리지 못한다. 그래서 규칙을 **데이터가 아니라 함수로** 못
// 박는다(menuParentBlock) — 화면이 버튼을 숨기는 것만으로는 손으로 만든 요청을 막지 못한다.
//
// [내부 참조는 끊길 수 있다 — 이 파일에서 가장 중요한 판단]
// 메뉴가 가리키는 페이지는 다른 화면(페이지 관리)이 소유하고, 그쪽에서 지워질 수 있다. 그 사실을
// 메뉴가 모르면 홈페이지 방문자가 404 를 만나고 나서야 알게 된다. 그래서 **매번 조회해서**
// 상태를 판정한다 — 끊김 여부를 메뉴 레코드에 저장하지 않는다(저장하면 그 순간부터 낡는다).
// 조회기는 shared/domain/site-page-catalog.ts 에 있고 배선은 src/wiring.ts 가 한다.
// ─────────────────────────────────────────────────────────────────────────────
import {
  sitePageRefHealth,
  sitePageRefWarning,
  type CatalogSitePage,
  type SitePageRefHealth,
} from '../../../shared/domain/site-page-catalog';

/* ── 위치 ────────────────────────────────────────────────────────────────── */

/** 어느 메뉴 영역인가 — 같은 트리를 세 곳이 나눠 쓴다 */
export type MenuLocation = 'header' | 'footer' | 'mobile';

export const MENU_LOCATIONS: readonly MenuLocation[] = ['header', 'footer', 'mobile'];

export const MENU_LOCATION_LABEL: Readonly<Record<MenuLocation, string>> = {
  header: '상단',
  footer: '하단',
  mobile: '모바일',
};

export function isMenuLocation(value: unknown): value is MenuLocation {
  return typeof value === 'string' && value in MENU_LOCATION_LABEL;
}

/* ── 링크 대상 ───────────────────────────────────────────────────────────── */

/** 게시판 — 홈페이지가 이미 갖고 있는 목록 화면들. 어휘의 정본은 여기다 */
export type BoardId = 'news' | 'notices' | 'faq';

export const BOARD_LABEL: Readonly<Record<BoardId, string>> = {
  news: '뉴스·보도자료',
  notices: '공지사항',
  faq: 'FAQ',
};

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === 'string' && value in BOARD_LABEL;
}

/**
 * 메뉴가 가리키는 곳 — **판별 유니온**이다.
 *
 * 셋을 한 문자열 필드에 뭉치지 않는 이유는 rowTarget 과 같다: 종류를 밝히지 않고는 만들 수
 * 없어야 '내부 페이지인 줄 알았는데 외부 URL' 같은 상태가 생기지 않는다. 무엇보다 **끊긴 링크
 * 판정은 내부 참조에만 해당**하는데, 종류가 섞여 있으면 그 판정을 걸 자리가 사라진다.
 */
export type MenuTarget =
  | { readonly kind: 'page'; readonly pageId: string }
  | { readonly kind: 'external'; readonly url: string }
  | { readonly kind: 'board'; readonly boardId: BoardId };

export const MENU_TARGET_KIND_LABEL: Readonly<Record<MenuTarget['kind'], string>> = {
  page: '내부 페이지',
  external: '외부 링크',
  board: '게시판',
};

/* ── 메뉴 ────────────────────────────────────────────────────────────────── */

export interface SiteMenu {
  readonly id: string;
  readonly location: MenuLocation;
  /** 상위 메뉴 id — null 이면 1뎁스. 2뎁스 아래는 만들지 않는다 */
  readonly parentId: string | null;
  readonly label: string;
  readonly target: MenuTarget;
  /** 홈페이지에 보이는가 — 지우지 않고 잠깐 내리는 손잡이 */
  readonly visible: boolean;
  /** 형제 사이의 순서 — 1부터. 위치·부모가 같은 것끼리만 비교한다 */
  readonly order: number;
}

export type SiteMenuInput = Omit<SiteMenu, 'id'>;

export const MENU_LABEL_MAX = 30;
export const MENU_URL_MAX = 300;
export const MENU_LIST_PATH = '/content/menus';

export function toSiteMenuInput(menu: SiteMenu): SiteMenuInput {
  return {
    location: menu.location,
    parentId: menu.parentId,
    label: menu.label,
    target: { ...menu.target },
    visible: menu.visible,
    order: menu.order,
  };
}

/* ── 깊이 규칙 (버튼의 disabled 와 저장의 거절이 같은 술어를 읽는다) ───────── */

export const MENU_DEPTH_LIMIT = '메뉴는 2단계까지만 만들 수 있습니다.';
export const MENU_PARENT_MISSING = '상위 메뉴를 찾을 수 없습니다.';
export const MENU_PARENT_LOCATION = '상위 메뉴와 다른 위치에는 하위 메뉴를 둘 수 없습니다.';
export const MENU_PARENT_SELF = '자기 자신을 상위 메뉴로 둘 수 없습니다.';

/**
 * 이 부모 밑에 넣을 수 없는 이유 — 넣을 수 있으면 null.
 *
 * `selfId` 는 수정 중인 메뉴다(등록이면 null). 자기 자신·자기 자식을 부모로 고르면 트리가
 * 고리가 되어 렌더가 무한히 돈다 — 그것을 여기서 끊는다.
 */
export function menuParentBlock(
  menus: readonly SiteMenu[],
  parentId: string | null,
  location: MenuLocation,
  selfId: string | null,
): string | null {
  if (parentId === null) return null;
  if (parentId === selfId) return MENU_PARENT_SELF;

  const parent = menus.find((menu) => menu.id === parentId);
  if (parent === undefined) return MENU_PARENT_MISSING;
  // 부모가 이미 2뎁스면 그 아래는 3뎁스다
  if (parent.parentId !== null) return MENU_DEPTH_LIMIT;
  if (parent.location !== location) return MENU_PARENT_LOCATION;
  // 자식을 가진 메뉴를 남의 하위로 넣으면 그 손자가 3뎁스가 된다
  if (selfId !== null && menus.some((menu) => menu.parentId === selfId)) return MENU_DEPTH_LIMIT;
  return null;
}

export function canUseMenuParent(
  menus: readonly SiteMenu[],
  parentId: string | null,
  location: MenuLocation,
  selfId: string | null,
): boolean {
  return menuParentBlock(menus, parentId, location, selfId) === null;
}

/** 하위를 매달 수 있는 메뉴들 — 같은 위치의 1뎁스만. 폼의 선택지가 이것에서 나온다 */
export function parentCandidates(
  menus: readonly SiteMenu[],
  location: MenuLocation,
  selfId: string | null,
): readonly SiteMenu[] {
  return menus.filter(
    (menu) => canUseMenuParent(menus, menu.id, location, selfId) && menu.location === location,
  );
}

/* ── 링크 대상 규칙 ──────────────────────────────────────────────────────── */

const HTTP_URL_RE = /^https?:\/\/\S+$/;

export const MENU_URL_REQUIRED = '외부 링크 주소를 입력하세요.';
export const MENU_URL_FORMAT = '주소는 http:// 또는 https:// 로 시작해야 합니다.';
export const MENU_PAGE_REQUIRED = '연결할 페이지를 고르세요.';

/** 이 대상을 저장할 수 없는 이유 — 저장할 수 있으면 null */
export function menuTargetBlock(target: MenuTarget): string | null {
  switch (target.kind) {
    case 'page':
      return target.pageId.trim() === '' ? MENU_PAGE_REQUIRED : null;
    case 'external': {
      const url = target.url.trim();
      if (url === '') return MENU_URL_REQUIRED;
      return HTTP_URL_RE.test(url) ? null : MENU_URL_FORMAT;
    }
    case 'board':
      return null;
  }
}

/**
 * 이 메뉴의 링크가 지금 건강한가 — 내부 참조에만 해당한다.
 *
 * 외부 URL 은 여기서 판정하지 않는다: 남의 서버가 살아 있는지는 이 앱이 알 수 없고,
 * 알 수 없는 것을 '끊겼다' 고 말하면 멀쩡한 링크가 붉게 칠해진다.
 */
export function menuLinkHealth(
  target: MenuTarget,
  catalog: readonly CatalogSitePage[] | null,
): SitePageRefHealth {
  if (target.kind !== 'page') return 'ok';
  return sitePageRefHealth(catalog, target.pageId);
}

/** 이 메뉴에 붙일 경고 한 줄 — 문제가 없으면 null */
export function menuLinkWarning(
  target: MenuTarget,
  catalog: readonly CatalogSitePage[] | null,
): string | null {
  return sitePageRefWarning(menuLinkHealth(target, catalog));
}

/** 지금 몇 개의 메뉴가 끊겨 있는가 — 화면 상단의 요약 배너가 읽는다 */
export function brokenMenuCount(
  menus: readonly SiteMenu[],
  catalog: readonly CatalogSitePage[] | null,
): number {
  return menus.filter((menu) => menuLinkHealth(menu.target, catalog) === 'missing').length;
}

/** 링크가 실제로 가리키는 주소 표기 — 목록의 '대상' 열이 읽는다 */
export function menuTargetLabel(
  target: MenuTarget,
  catalog: readonly CatalogSitePage[] | null,
): string {
  switch (target.kind) {
    case 'external':
      return target.url;
    case 'board':
      return BOARD_LABEL[target.boardId];
    case 'page': {
      if (catalog === null) return '(확인 불가)';
      const page = catalog.find((item) => item.id === target.pageId);
      return page === undefined ? '(삭제된 페이지)' : `${page.title} (/${page.slug})`;
    }
  }
}

/* ── 트리 · 순서 ─────────────────────────────────────────────────────────── */

/** 한 위치의 1뎁스 — order 오름차순 */
export function rootMenus(menus: readonly SiteMenu[], location: MenuLocation): readonly SiteMenu[] {
  return menus
    .filter((menu) => menu.location === location && menu.parentId === null)
    .sort((a, b) => a.order - b.order);
}

/** 한 메뉴의 자식 — order 오름차순 */
export function childMenus(menus: readonly SiteMenu[], parentId: string): readonly SiteMenu[] {
  return menus.filter((menu) => menu.parentId === parentId).sort((a, b) => a.order - b.order);
}

/**
 * 형제들의 새 순서를 1..n 으로 다시 매긴다.
 *
 * `moveArrayItem` 이 배열을 옮기고, 이 함수가 그 결과를 order 로 굳힌다 — 둘을 한 함수에 섞지
 * 않는 이유는 옮기는 규칙(공용 관용구)과 번호 규칙(이 도메인)이 서로 다른 주인의 것이기 때문이다.
 * 형제가 아닌 메뉴는 손대지 않는다.
 */
export function renumberSiblings(
  menus: readonly SiteMenu[],
  orderedIds: readonly string[],
): readonly SiteMenu[] {
  const position = new Map(orderedIds.map((id, index) => [id, index + 1]));
  return menus.map((menu) => {
    const next = position.get(menu.id);
    return next === undefined ? menu : { ...menu, order: next };
  });
}

/** 새 형제가 들어갈 자리 — 지금 최대 + 1(비면 1) */
export function nextMenuOrder(
  menus: readonly SiteMenu[],
  location: MenuLocation,
  parentId: string | null,
): number {
  return (
    menus
      .filter((menu) => menu.location === location && menu.parentId === parentId)
      .reduce((max, menu) => Math.max(max, menu.order), 0) + 1
  );
}

/* ── 삭제 가드 ───────────────────────────────────────────────────────────── */

export const MENU_DELETE_HAS_CHILDREN =
  '하위 메뉴가 있어 삭제할 수 없습니다. 하위 메뉴를 먼저 정리해 주세요.';

/**
 * 지울 수 없는 이유 — 지울 수 있으면 null.
 *
 * 하위를 먼저 지우게 하는 이유는 상품 카테고리와 같다: 부모를 지우면 자식이 어디에도 속하지
 * 않은 채 남아 홈페이지 어디에도 나타나지 않는다 — 지워지지도 보이지도 않는 유령이 된다.
 */
export function menuDeleteBlock(menus: readonly SiteMenu[], menuId: string): string | null {
  return menus.some((menu) => menu.parentId === menuId) ? MENU_DELETE_HAS_CHILDREN : null;
}

export function canDeleteMenu(menus: readonly SiteMenu[], menuId: string): boolean {
  return menuDeleteBlock(menus, menuId) === null;
}
