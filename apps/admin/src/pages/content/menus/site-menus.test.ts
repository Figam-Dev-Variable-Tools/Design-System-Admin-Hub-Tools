// 메뉴 관리 순수 규칙 회귀 테스트
//
// [무엇을 못 박는가] 이 화면의 사고는 셋이다.
//   ① 3단계가 생겨 홈페이지가 그리지 못하는 트리가 저장되는 것
//   ② 대상이 사라졌는데 메뉴가 살아 있다고 말하는 것 (그리고 그 반대 — 모르는데 죽었다고 하는 것)
//   ③ 부모를 지워 자식이 어디에도 속하지 않은 채 남는 것
import { describe, expect, it } from 'vitest';

import type { CatalogSitePage } from '../../../shared/domain/site-page-catalog';
import {
  brokenMenuCount,
  canDeleteMenu,
  canUseMenuParent,
  childMenus,
  MENU_DELETE_HAS_CHILDREN,
  MENU_DEPTH_LIMIT,
  MENU_PAGE_REQUIRED,
  MENU_PARENT_LOCATION,
  MENU_PARENT_MISSING,
  MENU_PARENT_SELF,
  MENU_URL_FORMAT,
  MENU_URL_REQUIRED,
  menuDeleteBlock,
  menuLinkHealth,
  menuParentBlock,
  menuTargetBlock,
  menuTargetLabel,
  nextMenuOrder,
  parentCandidates,
  renumberSiblings,
  rootMenus,
} from './types';
import type { SiteMenu } from './types';

const menu = (id: string, overrides: Partial<SiteMenu> = {}): SiteMenu => ({
  id,
  location: 'header',
  parentId: null,
  label: id,
  target: { kind: 'board', boardId: 'news' },
  visible: true,
  order: 1,
  ...overrides,
});

const ROOT = menu('mn-1', { label: '사업영역', order: 1 });
const CHILD = menu('mn-2', { label: '공간 기획', parentId: 'mn-1', order: 1 });
const ROOT2 = menu('mn-3', { label: '뉴스', order: 2 });
const FOOTER = menu('mn-4', { label: '이용약관', location: 'footer', order: 1 });
const MENUS: readonly SiteMenu[] = [ROOT, CHILD, ROOT2, FOOTER];

const CATALOG: readonly CatalogSitePage[] = [
  { id: 'pg-1', title: '사업영역', slug: 'business', published: true },
  { id: 'pg-2', title: '준비 중', slug: 'coming', published: false },
];

describe('menuParentBlock — 2단계 제한', () => {
  it('부모가 없으면(1뎁스) 언제나 통과한다', () => {
    expect(menuParentBlock(MENUS, null, 'header', null)).toBeNull();
  });

  it('1뎁스 아래는 만들 수 있다', () => {
    expect(canUseMenuParent(MENUS, 'mn-1', 'header', null)).toBe(true);
  });

  it('2뎁스 아래는 3단계라 막는다', () => {
    expect(menuParentBlock(MENUS, 'mn-2', 'header', null)).toBe(MENU_DEPTH_LIMIT);
  });

  it('자식을 가진 메뉴를 남의 하위로 옮기면 손자가 3단계가 된다 — 막는다', () => {
    expect(menuParentBlock(MENUS, 'mn-3', 'header', 'mn-1')).toBe(MENU_DEPTH_LIMIT);
  });

  it('자기 자신을 부모로 두면 트리가 고리가 된다 — 막는다', () => {
    expect(menuParentBlock(MENUS, 'mn-1', 'header', 'mn-1')).toBe(MENU_PARENT_SELF);
  });

  it('없는 부모와 다른 위치의 부모는 막는다', () => {
    expect(menuParentBlock(MENUS, 'mn-없음', 'header', null)).toBe(MENU_PARENT_MISSING);
    expect(menuParentBlock(MENUS, 'mn-4', 'header', null)).toBe(MENU_PARENT_LOCATION);
  });

  it('후보 목록은 같은 위치의 1뎁스만 준다', () => {
    expect(parentCandidates(MENUS, 'header', null).map((item) => item.id)).toEqual([
      'mn-1',
      'mn-3',
    ]);
  });
});

describe('menuTargetBlock', () => {
  it('내부 페이지를 고르지 않으면 막는다', () => {
    expect(menuTargetBlock({ kind: 'page', pageId: ' ' })).toBe(MENU_PAGE_REQUIRED);
  });

  it('외부 주소는 비거나 http(s) 가 아니면 막는다', () => {
    expect(menuTargetBlock({ kind: 'external', url: '' })).toBe(MENU_URL_REQUIRED);
    expect(menuTargetBlock({ kind: 'external', url: 'example.com' })).toBe(MENU_URL_FORMAT);
    expect(menuTargetBlock({ kind: 'external', url: 'https://example.com' })).toBeNull();
  });

  it('게시판은 어휘가 닫혀 있어 언제나 통과한다', () => {
    expect(menuTargetBlock({ kind: 'board', boardId: 'faq' })).toBeNull();
  });
});

describe('내부 참조의 건강 상태', () => {
  it('살아 있는 공개 페이지는 문제가 없다', () => {
    expect(menuLinkHealth({ kind: 'page', pageId: 'pg-1' }, CATALOG)).toBe('ok');
  });

  it('사라진 페이지는 끊긴 링크다', () => {
    expect(menuLinkHealth({ kind: 'page', pageId: 'pg-없음' }, CATALOG)).toBe('missing');
  });

  it('공개 전 페이지는 끊긴 링크와 구분한다 — 발행하면 저절로 풀린다', () => {
    expect(menuLinkHealth({ kind: 'page', pageId: 'pg-2' }, CATALOG)).toBe('hidden');
  });

  it('외부 링크·게시판은 판정하지 않는다 — 알 수 없는 것을 죽었다고 말하지 않는다', () => {
    expect(menuLinkHealth({ kind: 'external', url: 'https://example.com' }, CATALOG)).toBe('ok');
    expect(menuLinkHealth({ kind: 'board', boardId: 'news' }, null)).toBe('ok');
  });

  it('카탈로그를 모르면 끊김으로 세지 않는다 — 배선 사고를 데이터 사고로 만들지 않는다', () => {
    const withPage = [menu('mn-9', { target: { kind: 'page', pageId: 'pg-없음' } })];
    expect(brokenMenuCount(withPage, CATALOG)).toBe(1);
    expect(brokenMenuCount(withPage, null)).toBe(0);
  });

  it('대상 표기는 카탈로그가 없을 때 지어내지 않는다', () => {
    expect(menuTargetLabel({ kind: 'page', pageId: 'pg-1' }, CATALOG)).toBe('사업영역 (/business)');
    expect(menuTargetLabel({ kind: 'page', pageId: 'pg-1' }, null)).toBe('(확인 불가)');
    expect(menuTargetLabel({ kind: 'page', pageId: 'pg-없음' }, CATALOG)).toBe('(삭제된 페이지)');
  });
});

describe('트리 · 순서', () => {
  it('위치별 1뎁스만 order 순으로 준다', () => {
    expect(rootMenus(MENUS, 'header').map((item) => item.id)).toEqual(['mn-1', 'mn-3']);
    expect(rootMenus(MENUS, 'footer').map((item) => item.id)).toEqual(['mn-4']);
    expect(childMenus(MENUS, 'mn-1').map((item) => item.id)).toEqual(['mn-2']);
  });

  it('새 형제는 맨 뒤에 붙는다', () => {
    expect(nextMenuOrder(MENUS, 'header', null)).toBe(3);
    expect(nextMenuOrder(MENUS, 'header', 'mn-1')).toBe(2);
    expect(nextMenuOrder(MENUS, 'mobile', null)).toBe(1);
  });

  it('번호를 다시 매길 때 형제가 아닌 메뉴는 건드리지 않는다', () => {
    const next = renumberSiblings(MENUS, ['mn-3', 'mn-1']);
    expect(next.find((item) => item.id === 'mn-3')?.order).toBe(1);
    expect(next.find((item) => item.id === 'mn-1')?.order).toBe(2);
    // 다른 위치·다른 부모의 메뉴는 그대로다
    expect(next.find((item) => item.id === 'mn-4')?.order).toBe(FOOTER.order);
    expect(next.find((item) => item.id === 'mn-2')?.order).toBe(CHILD.order);
  });
});

describe('menuDeleteBlock', () => {
  it('하위가 있으면 지울 수 없다 — 자식이 유령이 되지 않게', () => {
    expect(menuDeleteBlock(MENUS, 'mn-1')).toBe(MENU_DELETE_HAS_CHILDREN);
    expect(canDeleteMenu(MENUS, 'mn-1')).toBe(false);
  });

  it('하위가 없으면 지울 수 있다', () => {
    expect(canDeleteMenu(MENUS, 'mn-2')).toBe(true);
    expect(canDeleteMenu(MENUS, 'mn-3')).toBe(true);
  });
});
