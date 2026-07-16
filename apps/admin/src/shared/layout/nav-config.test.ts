// 화면 제목의 규칙 (IA-02) — apps/admin/src/shared/layout/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// findNavLabel 이 내는 문자열은 앱에서 가장 많이 보이는 <h1> 이고(AppHeader), 라우트가 바뀔 때
// 스크린리더가 읽는 이름이다(RouteFocusAnnouncer). 즉 '내가 어느 화면에 있는가' 의 유일한 답이다.
//
// 예전에는 **정확히 일치하는 잎**만 찾고 못 찾으면 **가지 라벨**로 떨어뜨렸다. 그래서 잎이 아닌
// 라우트 — 모든 /new · /:id/edit — 이 자기 이름 대신 섹션 이름을 달았다. 26개 화면 대부분이
// '기업 관리'·'상품 관리' 로 announce 됐고, 스크린리더 사용자는 어느 폼에 들어왔는지 알 수 없었다.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';

import { collectNavRoutes, findCoveringLeaf, findNavLabel } from './nav-config';

describe('findNavLabel — 서브라우트도 자기 이름을 갖는다 (IA-02)', () => {
  it('사이드바 잎은 자기 라벨을 그대로 쓴다', () => {
    expect(findNavLabel('/company/history')).toBe('연혁');
    expect(findNavLabel('/settings/api-keys')).toBe('API Key 관리');
  });

  /** 이것이 IA-02 의 본체다 — 예전엔 전부 가지 라벨('기업 관리')로 떨어졌다 */
  it('등록·수정 라우트는 자기를 감싸는 잎의 이름을 상속한다 (가지 라벨로 떨어지지 않는다)', () => {
    expect(findNavLabel('/company/history/new')).toBe('연혁');
    expect(findNavLabel('/company/history/12/edit')).toBe('연혁');
    expect(findNavLabel('/content/notices/3/edit')).toBe('공지사항');

    // 회귀 방어: 이 경로들이 다시 섹션 이름을 달면 안 된다
    expect(findNavLabel('/company/history/new')).not.toBe('기업 관리');
  });

  it('더 구체적인(긴) 잎이 이긴다', () => {
    expect(findCoveringLeaf('/products/categories')?.to).toBe('/products/categories');
    // '/products/9/edit' 는 '/products/categories' 가 아니라 '/products' 에 속한다
    expect(findCoveringLeaf('/products/9/edit')?.to).toBe('/products');
  });

  it('세그먼트 경계에서만 매칭한다 — 접두사가 겹치는 남남을 삼키지 않는다', () => {
    // '/products' 가 '/products-archive' 를 삼키면 남남인 화면이 같은 이름을 갖는다
    expect(findCoveringLeaf('/products-archive')).toBeNull();
  });

  it('어떤 잎에도 속하지 않으면 경로를 그대로 돌려준다 — 지어내지 않는다', () => {
    expect(findCoveringLeaf('/')).toBeNull();
    expect(findNavLabel('/nowhere')).toBe('/nowhere');
  });

  /** 스캔 자기 방어 — 잎이 0개면 위 단언들이 조용히 무의미해진다 */
  it('nav 잎이 실제로 로드된다', () => {
    const leaves = collectNavRoutes();
    expect(leaves.length).toBeGreaterThan(20);
    expect(leaves.every((leaf) => leaf.to.startsWith('/') && leaf.label !== '')).toBe(true);
  });
});
