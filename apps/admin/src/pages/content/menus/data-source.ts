// 메뉴 관리 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다. 지금은 픽스처를
// 돌려준다. 백엔드가 붙으면 **이 파일의 함수 본문만** 실제 HTTP 호출로 바꾼다.
//
// [가드는 순수 규칙이 갖는다] 깊이 제한·삭제 차단은 types.ts 의 술어가 판정하고, 여기서는 그것을
// 부를 뿐이다. 화면의 버튼과 저장소의 거절이 **같은 함수**를 읽어야 '눌리는데 거부당하는 버튼'
// 이 생기지 않는다 (shared/domain/order.ts 의 규약).
import { wait } from '../../../shared/async';
import { createStoreAdapter, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import {
  menuDeleteBlock,
  menuParentBlock,
  menuTargetBlock,
  nextMenuOrder,
  renumberSiblings,
} from './types';
import type { SiteMenu, SiteMenuInput } from './types';

export const MENU_RESOURCE = 'site-menus';

/* ── 픽스처 (표시용 더미 — 가상 회사) ────────────────────────────────────── */

const SEED: readonly SiteMenu[] = [
  {
    id: 'mn-001',
    location: 'header',
    parentId: null,
    label: '회사소개',
    target: { kind: 'page', pageId: 'pg-001' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-002',
    location: 'header',
    parentId: null,
    label: '사업영역',
    target: { kind: 'page', pageId: 'pg-001' },
    visible: true,
    order: 2,
  },
  {
    id: 'mn-003',
    location: 'header',
    parentId: 'mn-002',
    label: '공간 기획',
    target: { kind: 'page', pageId: 'pg-002' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-004',
    location: 'header',
    parentId: 'mn-002',
    label: '시공 관리',
    target: { kind: 'page', pageId: 'pg-003' },
    visible: true,
    order: 2,
  },
  {
    id: 'mn-005',
    location: 'header',
    parentId: 'mn-002',
    label: '데이터 분석',
    // 아직 발행되지 않은 페이지를 가리킨다 — '공개 전' 경고 경로를 화면에서 실제로 밟게 한다
    target: { kind: 'page', pageId: 'pg-004' },
    visible: false,
    order: 3,
  },
  {
    id: 'mn-006',
    location: 'header',
    parentId: null,
    label: '뉴스',
    target: { kind: 'board', boardId: 'news' },
    visible: true,
    order: 3,
  },
  {
    id: 'mn-007',
    location: 'header',
    parentId: null,
    label: '채용',
    // 삭제된 페이지를 가리킨다 — 끊긴 링크 경고 경로를 화면에서 실제로 밟게 한다
    target: { kind: 'page', pageId: 'pg-사라짐' },
    visible: true,
    order: 4,
  },
  {
    id: 'mn-008',
    location: 'footer',
    parentId: null,
    label: '이용약관',
    target: { kind: 'page', pageId: 'pg-005' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-009',
    location: 'footer',
    parentId: null,
    label: '고객센터',
    target: { kind: 'board', boardId: 'faq' },
    visible: true,
    order: 2,
  },
  {
    id: 'mn-010',
    location: 'mobile',
    parentId: null,
    label: '회사소개',
    target: { kind: 'page', pageId: 'pg-001' },
    visible: true,
    order: 1,
  },
  {
    id: 'mn-011',
    location: 'mobile',
    parentId: null,
    label: '블로그',
    target: { kind: 'external', url: 'https://example.com/blog' },
    visible: true,
    order: 2,
  },
];

/** mutable — 등록·수정·삭제·순서 이동·노출 토글이 이 배열을 갱신한다 */
let MENUS: readonly SiteMenu[] = SEED;

let seq = SEED.length;

/* ── 저장소 표면 ─────────────────────────────────────────────────────────── */

export function listSiteMenus(): readonly SiteMenu[] {
  return MENUS;
}

export function getSiteMenu(id: string): SiteMenu {
  const menu = MENUS.find((item) => item.id === id);
  if (menu === undefined) throw new Error('메뉴를 찾을 수 없습니다.');
  return menu;
}

/** 저장 전 마지막 문 — 깊이와 대상은 화면이 이미 물었지만, 손으로 만든 요청은 여기서 막힌다 */
function assertSavable(input: SiteMenuInput, selfId: string | null): void {
  const depth = menuParentBlock(MENUS, input.parentId, input.location, selfId);
  if (depth !== null) throw new HttpError(HTTP_STATUS.unprocessable, depth);
  const target = menuTargetBlock(input.target);
  if (target !== null) throw new HttpError(HTTP_STATUS.unprocessable, target);
}

export function addSiteMenu(input: SiteMenuInput): void {
  assertSavable(input, null);
  seq += 1;
  MENUS = [
    ...MENUS,
    {
      id: `mn-${String(seq).padStart(3, '0')}`,
      ...input,
      // 순서는 저장소가 정한다 — 폼이 정하게 두면 두 메뉴가 같은 자리를 갖는다
      order: nextMenuOrder(MENUS, input.location, input.parentId),
    },
  ];
}

export function updateSiteMenu(id: string, input: SiteMenuInput): void {
  assertSavable(input, id);
  MENUS = MENUS.map((menu) => (menu.id === id ? { ...menu, ...input } : menu));
}

export function removeSiteMenu(id: string): void {
  // 하위가 남은 메뉴를 지우면 그 하위가 홈페이지 어디에도 없는 유령이 된다 (types.ts)
  const blocked = menuDeleteBlock(MENUS, id);
  if (blocked !== null) throw new HttpError(HTTP_STATUS.conflict, blocked);
  MENUS = MENUS.filter((menu) => menu.id !== id);
}

/* ── 순서 이동 · 노출 토글 ───────────────────────────────────────────────── */

// TODO(backend): PUT /api/site-menus/reorder  { orderedIds }
export async function reorderSiteMenus(
  orderedIds: readonly string[],
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested(MENU_RESOURCE, 'save');
  MENUS = renumberSiblings(MENUS, orderedIds);
}

// TODO(backend): PATCH /api/site-menus/:id/visible  { visible }
export async function setSiteMenuVisible(
  id: string,
  visible: boolean,
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested(MENU_RESOURCE, 'save');
  MENUS = MENUS.map((menu) => (menu.id === id ? { ...menu, visible } : menu));
}

/* ── CRUD 어댑터 ─────────────────────────────────────────────────────────── */

// TODO(backend): GET/POST /api/site-menus · GET/PUT/DELETE /api/site-menus/:id
export const siteMenuAdapter = createStoreAdapter<SiteMenu, SiteMenuInput>({
  scope: MENU_RESOURCE,
  list: listSiteMenus,
  getOne: getSiteMenu,
  add: addSiteMenu,
  update: updateSiteMenu,
  remove: removeSiteMenu,
});
