// 라우트 → 권한 리소스 매핑 (EXC-03)
//
// 이 매핑이 틀리면 **가드가 조용히 무력해진다** — 잘못된 리소스를 물으면 늘 통과하거나 늘 막는다.
// 특히 상세/폼 라우트(사이드바에 없는 경로)가 부모 잎의 권한을 상속하는지가 핵심이다: deep-link 가
// 실제로 열리는 곳이 바로 그 라우트들이다.
import { describe, expect, it } from 'vitest';

import { resourceIdForPath } from './route-resource';

describe('resourceIdForPath', () => {
  it('사이드바 잎은 자기 리소스로 해석된다', () => {
    expect(resourceIdForPath('/users/members')).toBe('page:/users/members');
    expect(resourceIdForPath('/content/notices')).toBe('page:/content/notices');
  });

  /** 상세·폼은 사이드바에 없다 — 그래도 게이팅돼야 한다 */
  it('상세/폼 라우트는 자기를 감싸는 잎의 권한을 상속한다', () => {
    expect(resourceIdForPath('/users/members/M-00001')).toBe('page:/users/members');
    expect(resourceIdForPath('/content/notices/new')).toBe('page:/content/notices');
    expect(resourceIdForPath('/content/notices/12/edit')).toBe('page:/content/notices');
  });

  /**
   * '/products' 와 '/products/categories' 는 **둘 다 잎이다**. 더 긴 잎이 이기지 않으면
   * 카테고리 화면이 상품 권한으로 열린다 — 서로 다른 두 권한이 하나로 뭉개진다.
   */
  it('더 구체적인(긴) 잎이 이긴다', () => {
    expect(resourceIdForPath('/products/categories')).toBe('page:/products/categories');
    expect(resourceIdForPath('/products')).toBe('page:/products');
    expect(resourceIdForPath('/products/9/edit')).toBe('page:/products');
  });

  /**
   * 세그먼트 경계 검사가 없으면 startsWith 가 '/products' 로 '/products-archive' 를 삼킨다 —
   * 남남인 화면이 권한을 공유하게 된다.
   */
  it('세그먼트 경계에서만 매칭한다 — 접두사 문자열이 우연히 겹치는 경로를 삼키지 않는다', () => {
    expect(resourceIdForPath('/products-archive')).toBeNull();
    expect(resourceIdForPath('/users/membership')).toBeNull();
  });

  /**
   * null 은 '차단' 이 아니라 '권한 모델에 없음' 이다. 이것을 403 으로 처리하면 인덱스
   * 리다이렉트('/')가 막혀 앱이 스스로를 잠근다.
   */
  it('어떤 잎에도 속하지 않는 경로는 null 이다', () => {
    expect(resourceIdForPath('/')).toBeNull();
    expect(resourceIdForPath('/login')).toBeNull();
  });
});
