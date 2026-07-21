// 배너 참조 회귀 테스트 — 조회기 배선('모른다' vs '없다')·목록 변환·색인 조회(순수)
//
// [무엇을 지키나] 이벤트의 '배너 연동' 은 배너명 자유 텍스트였다. 오탈자를 막지 못했고, 저쪽에서
// 이름이 바뀌어도 이벤트는 옛 문구를 들고 있었다. 이제 참조는 id 이고 표시값은 카탈로그가 정본이다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  bannerCatalog,
  bannerEditPath,
  findCatalogBanner,
  registerBannerCatalogLookup,
  resetBannerCatalogLookup,
  toBannerCatalog,
} from './banner-catalog';
import type { CatalogBanner } from './banner-catalog';

const CATALOG: readonly CatalogBanner[] = [
  { id: 'BN-001', title: '봄 시즌 기획전 (001)' },
  { id: 'BN-002', title: '신상품 입고 (002)' },
];

afterEach(() => {
  resetBannerCatalogLookup();
});

describe('조회기 배선 — 모른다(null)와 없다([])는 다르다', () => {
  it('배선 전에는 null 이다 — 빈 배열이 아니다', () => {
    expect(bannerCatalog()).toBeNull();
  });
  it('배선하면 조회기가 준 목록을 그대로 돌려준다', () => {
    registerBannerCatalogLookup(() => CATALOG);
    expect(bannerCatalog()?.map((banner) => banner.id)).toEqual(['BN-001', 'BN-002']);
  });
});

describe('목록 변환·참조 해소(순수)', () => {
  // [회귀] 노출 OFF 를 걸러 내면 이미 그 배너를 연동해 둔 이벤트가 '삭제된 배너' 로 보인다 —
  // 꺼 둔 것과 없는 것은 다르다.
  it('노출 여부와 무관하게 전량을 카탈로그로 만든다 — 순서도 그대로', () => {
    const source = [
      { id: 'BN-001', title: '봄 시즌 기획전 (001)' },
      { id: 'BN-002', title: '신상품 입고 (002)' },
    ];
    expect(toBannerCatalog(source)).toEqual(CATALOG);
  });
  it('id 로 찾는다 — 못 찾으면 null(아무거나 고르지 않는다)', () => {
    expect(findCatalogBanner(CATALOG, 'BN-002')?.title).toBe('신상품 입고 (002)');
    expect(findCatalogBanner(CATALOG, 'BN-없음')).toBeNull();
  });
  it('상세 경로는 id 로 만든다 — 화면 사이를 잇는 유일한 실이다', () => {
    expect(bannerEditPath('BN-002')).toBe('/content/banners/BN-002/edit');
  });
});
