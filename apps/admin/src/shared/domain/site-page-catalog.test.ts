// 페이지 카탈로그 회귀 테스트 — '없다' 와 '모른다' 를 가른다
import { afterEach, describe, expect, it } from 'vitest';

import {
  findCatalogSitePage,
  registerSitePageCatalogLookup,
  resetSitePageCatalogLookup,
  SITE_PAGE_REF_HIDDEN,
  SITE_PAGE_REF_MISSING,
  SITE_PAGE_REF_UNKNOWN,
  sitePageCatalog,
  sitePageEditPath,
  sitePageRefHealth,
  sitePageRefWarning,
  sitePagesById,
} from './site-page-catalog';
import type { CatalogSitePage } from './site-page-catalog';

const BUSINESS: CatalogSitePage = {
  id: 'pg-1',
  title: '사업영역',
  slug: 'business',
  published: true,
};

const DRAFT: CatalogSitePage = {
  id: 'pg-2',
  title: '준비 중인 소개',
  slug: 'coming-soon',
  published: false,
};

const CATALOG: readonly CatalogSitePage[] = [BUSINESS, DRAFT];

afterEach(() => {
  resetSitePageCatalogLookup();
});

describe('조회기', () => {
  it('배선 전에는 null 이다 — 빈 배열이 아니다', () => {
    expect(sitePageCatalog()).toBeNull();
  });

  it('꽂으면 그 목록을 그대로 돌려준다', () => {
    registerSitePageCatalogLookup(() => CATALOG);
    expect(sitePageCatalog()).toEqual(CATALOG);
  });
});

describe('색인', () => {
  it('id 로 찾고, 못 찾으면 null 이다 — 아무거나 돌려주지 않는다', () => {
    expect(findCatalogSitePage(CATALOG, 'pg-1')).toEqual(BUSINESS);
    expect(findCatalogSitePage(CATALOG, 'pg-없음')).toBeNull();
    expect(Object.keys(sitePagesById(CATALOG))).toEqual(['pg-1', 'pg-2']);
  });
});

describe('sitePageRefHealth', () => {
  it('공개된 페이지를 가리키면 문제가 없다', () => {
    expect(sitePageRefHealth(CATALOG, 'pg-1')).toBe('ok');
    expect(sitePageRefWarning('ok')).toBeNull();
  });

  it('사라진 페이지는 끊긴 링크다', () => {
    expect(sitePageRefHealth(CATALOG, 'pg-없음')).toBe('missing');
    expect(sitePageRefWarning('missing')).toBe(SITE_PAGE_REF_MISSING);
  });

  it('아직 공개되지 않은 페이지는 끊긴 링크와 구분한다 — 복구 수단이 다르다', () => {
    expect(sitePageRefHealth(CATALOG, 'pg-2')).toBe('hidden');
    expect(sitePageRefWarning('hidden')).toBe(SITE_PAGE_REF_HIDDEN);
  });

  it('카탈로그를 모르면 모든 링크를 끊겼다고 말하지 않는다', () => {
    expect(sitePageRefHealth(null, 'pg-1')).toBe('unknown');
    expect(sitePageRefWarning('unknown')).toBe(SITE_PAGE_REF_UNKNOWN);
  });
});

describe('경로', () => {
  it('원본으로 건너뛰는 실은 한 곳에서만 만들어진다', () => {
    expect(sitePageEditPath('pg-1')).toBe('/content/pages/pg-1/edit');
  });
});
