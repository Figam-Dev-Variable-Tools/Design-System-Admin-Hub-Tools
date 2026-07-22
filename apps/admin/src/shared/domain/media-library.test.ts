// 미디어 라이브러리 회귀 테스트 — 카탈로그는 '모른다', 사용처는 fail-closed
//
// [무엇을 못 박는가] 두 방향의 기본값이 **일부러 다르다**는 것. 카탈로그를 못 읽으면 불편할
// 뿐이지만, 사용처를 못 읽는데 삭제를 열면 되돌릴 수 없다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  canDeleteMedia,
  findCatalogMediaAsset,
  MEDIA_DELETE_UNKNOWN,
  MEDIA_LIBRARY_PATH,
  mediaCatalog,
  mediaDeleteBlock,
  mediaDeleteInUse,
  mediaUsage,
  registerMediaCatalogLookup,
  registerMediaUsageLookup,
  resetMediaCatalogLookup,
  resetMediaUsageLookups,
} from './media-library';
import type { CatalogMediaAsset, MediaUsageRef } from './media-library';

const HERO: CatalogMediaAsset = {
  id: 'md-1',
  fileName: 'hero.jpg',
  url: '/fixtures/placeholder-image.svg',
  alt: '전시 공간 전경',
  sizeBytes: 240_000,
};

const usageOf = (label: string, id: string): MediaUsageRef => ({
  id,
  domainLabel: '뉴스',
  label,
  path: `/content/news/${id}/edit`,
});

afterEach(() => {
  resetMediaCatalogLookup();
  resetMediaUsageLookups();
});

describe('카탈로그', () => {
  it('배선 전에는 null 이다 — 빈 배열이 아니다', () => {
    expect(mediaCatalog()).toBeNull();
  });

  it('꽂으면 목록을 돌려주고 id 로 찾을 수 있다', () => {
    registerMediaCatalogLookup(() => [HERO]);
    expect(mediaCatalog()).toEqual([HERO]);
    expect(findCatalogMediaAsset([HERO], 'md-1')).toEqual(HERO);
    expect(findCatalogMediaAsset([HERO], 'md-없음')).toBeNull();
  });
});

describe('사용처 역참조', () => {
  it('조회기가 하나도 없으면 null 이다 — 0건이 아니다', () => {
    expect(mediaUsage('md-1')).toBeNull();
  });

  it('여러 도메인의 조회기가 함께 모인다 — 나중 배선이 앞의 것을 덮지 않는다', () => {
    registerMediaUsageLookup('news', (id) => (id === 'md-1' ? [usageOf('첫 소식', 'nw-1')] : []));
    registerMediaUsageLookup('pages', (id) => (id === 'md-1' ? [usageOf('사업영역', 'pg-1')] : []));
    expect(mediaUsage('md-1')).toHaveLength(2);
    expect(mediaUsage('md-2')).toEqual([]);
  });

  it('같은 이름으로 다시 꽂으면 덮어쓴다 — 배선은 멱등이다', () => {
    registerMediaUsageLookup('news', () => [usageOf('첫 소식', 'nw-1')]);
    registerMediaUsageLookup('news', () => [usageOf('첫 소식', 'nw-1')]);
    expect(mediaUsage('md-1')).toHaveLength(1);
  });
});

describe('mediaDeleteBlock', () => {
  it('모르면 지우지 못한다 (fail-closed)', () => {
    expect(mediaDeleteBlock(null)).toBe(MEDIA_DELETE_UNKNOWN);
    expect(canDeleteMedia(null)).toBe(false);
  });

  it('쓰이는 중이면 몇 곳인지까지 말한다', () => {
    const usage = [usageOf('첫 소식', 'nw-1'), usageOf('둘째 소식', 'nw-2')];
    expect(mediaDeleteBlock(usage)).toBe(mediaDeleteInUse(2));
    expect(canDeleteMedia(usage)).toBe(false);
  });

  it('아무 데도 안 쓰이면 지울 수 있다', () => {
    expect(mediaDeleteBlock([])).toBeNull();
    expect(canDeleteMedia([])).toBe(true);
  });
});

describe('경로', () => {
  it('라이브러리로 가는 실은 한 곳에서만 만들어진다', () => {
    expect(MEDIA_LIBRARY_PATH).toBe('/content/media');
  });
});
