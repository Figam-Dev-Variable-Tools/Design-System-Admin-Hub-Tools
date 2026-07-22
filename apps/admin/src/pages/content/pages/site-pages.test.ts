// 페이지 관리 순수 규칙 회귀 테스트
//
// [무엇을 못 박는가] 이 화면의 사고는 둘이다.
//   ① 주소를 바꾸고 옛 주소를 버려서 기존 링크를 조용히 죽이는 것
//   ② 되돌리다가 이력을 잘라 되돌리기를 되돌릴 수 없게 만드는 것
// 나머지(형식·중복·필터)는 그 둘로 가는 길목이다.
import { describe, expect, it } from 'vitest';

import {
  applyRevert,
  canRevert,
  canUseSlug,
  filterSitePages,
  nextVersionNumber,
  previewPath,
  REVERT_NOT_FOUND,
  REVERT_SAME,
  SLUG_CHANGE_WARNING,
  SLUG_FORMAT,
  SLUG_REQUIRED,
  SLUG_RESERVED,
  slugBlock,
  slugChangeWarning,
  slugRetiredMessage,
  slugTakenMessage,
  snapshotOf,
  sitePageStatus,
  sortSitePages,
  toCatalogSitePage,
  withRetiredSlug,
} from './types';
import type { SitePage } from './types';

const BASE: SitePage = {
  id: 'pg-1',
  title: '사업영역',
  slug: 'business',
  status: 'published',
  publishAt: '',
  body: '<p>본문</p>',
  firstPublishedAt: '2026-03-02T10:00',
  previousSlugs: [],
  previewToken: '',
  versions: [],
  updatedAt: '2026-06-01T09:00',
};

const withVersions = (page: SitePage): SitePage => {
  const v1 = snapshotOf(
    { ...page, title: '옛 제목', body: '<p>옛 본문</p>' },
    '2026-05-01T09:00',
    '콘텐츠 운영팀',
    '최초 등록',
  );
  const v2 = snapshotOf(
    { ...page, versions: [v1] },
    '2026-06-01T09:00',
    '콘텐츠 운영팀',
    '내용 수정',
  );
  return { ...page, versions: [v2, v1] };
};

describe('slugBlock', () => {
  it('비면 막는다', () => {
    expect(slugBlock('  ', [])).toBe(SLUG_REQUIRED);
  });

  it('대문자·공백·언더스코어는 주소가 아니다', () => {
    expect(slugBlock('Business', [])).toBe(SLUG_FORMAT);
    expect(slugBlock('our business', [])).toBe(SLUG_FORMAT);
    expect(slugBlock('our_business', [])).toBe(SLUG_FORMAT);
    expect(slugBlock('-business', [])).toBe(SLUG_FORMAT);
  });

  it('시스템이 이미 쓰는 주소는 막는다', () => {
    expect(slugBlock('admin', [])).toBe(SLUG_RESERVED);
  });

  it('다른 페이지가 쓰는 주소는 누가 쓰는지까지 말한다', () => {
    expect(slugBlock('business', [BASE])).toBe(slugTakenMessage('사업영역'));
  });

  it('남이 예전에 쓰던 주소도 막는다 — 리다이렉트 근거를 빼앗지 않는다', () => {
    const retired: SitePage = { ...BASE, id: 'pg-2', slug: 'brand-2025', previousSlugs: ['brand'] };
    expect(slugBlock('brand', [retired])).toBe(slugRetiredMessage(retired.title));
  });

  it('겹치지 않으면 통과한다', () => {
    expect(canUseSlug('business-planning', [BASE])).toBe(true);
  });
});

describe('slugChangeWarning', () => {
  it('한 번도 공개된 적이 없으면 경고하지 않는다', () => {
    const draft: SitePage = { ...BASE, firstPublishedAt: '' };
    expect(slugChangeWarning(draft, 'anything')).toBeNull();
  });

  it('주소가 그대로면 경고하지 않는다', () => {
    expect(slugChangeWarning(BASE, ' business ')).toBeNull();
  });

  it('공개된 주소를 바꾸면 무엇을 잃는지 말한다 — 다만 막지 않는다', () => {
    expect(slugChangeWarning(BASE, 'biz')).toBe(SLUG_CHANGE_WARNING);
  });
});

describe('withRetiredSlug', () => {
  it('옛 주소를 앞에 쌓는다', () => {
    expect(withRetiredSlug([], 'business', 'biz')).toEqual(['business']);
    expect(withRetiredSlug(['old'], 'business', 'biz')).toEqual(['business', 'old']);
  });

  it('같은 값을 두 번 담지 않는다 (멱등)', () => {
    expect(withRetiredSlug(['business'], 'business', 'biz')).toEqual(['business']);
  });

  it('되돌아온 주소는 보관 목록에서 뺀다 — 자기 주소를 옛 주소로 들지 않는다', () => {
    expect(withRetiredSlug(['biz'], 'business', 'biz')).toEqual(['business']);
  });

  it('바뀌지 않았으면 그대로다', () => {
    expect(withRetiredSlug(['old'], 'business', 'business')).toEqual(['old']);
  });
});

describe('previewPath', () => {
  it('토큰이 없으면 링크도 없다 — 열리지 않는 주소를 만들어 주지 않는다', () => {
    expect(previewPath({ slug: 'business', previewToken: '' })).toBeNull();
  });

  it('토큰이 있으면 주소를 만든다', () => {
    expect(previewPath({ slug: 'business', previewToken: 'abc' })).toBe(
      '/preview/business?token=abc',
    );
  });
});

describe('버전 이력 · 되돌리기', () => {
  it('판 번호는 최대값 + 1 이다', () => {
    expect(nextVersionNumber([])).toBe(1);
    expect(nextVersionNumber(withVersions(BASE).versions)).toBe(3);
  });

  it('없는 판으로는 되돌릴 수 없다', () => {
    expect(canRevert(withVersions(BASE), 'pv-없음')).toBe(false);
    expect(() => applyRevert(withVersions(BASE), 'pv-없음', '2026-07-01T09:00', '운영팀')).toThrow(
      REVERT_NOT_FOUND,
    );
  });

  it('지금과 같은 내용이면 되돌릴 것이 없다', () => {
    const page = withVersions(BASE);
    const latest = page.versions[0];
    expect(latest).toBeDefined();
    if (latest === undefined) return;
    expect(canRevert(page, latest.id)).toBe(false);
    expect(() => applyRevert(page, latest.id, '2026-07-01T09:00', '운영팀')).toThrow(REVERT_SAME);
  });

  it('되돌리면 내용이 그 판이 되고 이력은 **잘리지 않고 자란다**', () => {
    const page = withVersions(BASE);
    const oldest = page.versions[page.versions.length - 1];
    expect(oldest).toBeDefined();
    if (oldest === undefined) return;

    const reverted = applyRevert(page, oldest.id, '2026-07-01T09:00', '콘텐츠 운영팀');
    expect(reverted.title).toBe('옛 제목');
    expect(reverted.body).toBe('<p>옛 본문</p>');
    expect(reverted.versions).toHaveLength(page.versions.length + 1);
    expect(reverted.versions[0]?.note).toContain('되돌림');
    // 되돌린 판 자체는 그대로 남아 있다 — 되돌리기를 되돌릴 수 있어야 한다
    expect(reverted.versions.some((version) => version.id === oldest.id)).toBe(true);
  });
});

describe('목록 정렬 · 필터', () => {
  const published: SitePage = { ...BASE, id: 'pg-1', updatedAt: '2026-06-01T09:00' };
  const draft: SitePage = {
    ...BASE,
    id: 'pg-2',
    title: '채용 안내',
    slug: 'recruit',
    status: 'draft',
    firstPublishedAt: '',
    updatedAt: '2026-06-05T09:00',
  };
  const scheduled: SitePage = {
    ...BASE,
    id: 'pg-3',
    title: '데이터 분석',
    slug: 'analytics',
    publishAt: '2026-12-01T09:00',
    updatedAt: '2026-06-03T09:00',
  };
  const all = [published, draft, scheduled];
  const NOW = new Date('2026-07-01T00:00:00');

  it('최근 수정이 위다', () => {
    expect(sortSitePages(all).map((page) => page.id)).toEqual(['pg-2', 'pg-3', 'pg-1']);
  });

  it('상태 필터는 **파생 상태**로 거른다 — 저장값에는 예약이 없다', () => {
    expect(filterSitePages(all, 'scheduled', '', NOW).map((page) => page.id)).toEqual(['pg-3']);
    expect(filterSitePages(all, 'published', '', NOW).map((page) => page.id)).toEqual(['pg-1']);
    expect(sitePageStatus(scheduled, NOW)).toBe('scheduled');
  });

  it('검색은 제목과 주소를 함께 본다', () => {
    expect(filterSitePages(all, 'all', 'recruit', NOW).map((page) => page.id)).toEqual(['pg-2']);
    expect(filterSitePages(all, 'all', '채용', NOW).map((page) => page.id)).toEqual(['pg-2']);
  });
});

describe('toCatalogSitePage', () => {
  it('메뉴가 읽을 값만 넘긴다 — 예약중은 아직 공개가 아니다', () => {
    const NOW = new Date('2026-07-01T00:00:00');
    expect(toCatalogSitePage(BASE, NOW)).toEqual({
      id: 'pg-1',
      title: '사업영역',
      slug: 'business',
      published: true,
    });
    expect(toCatalogSitePage({ ...BASE, publishAt: '2026-12-01T09:00' }, NOW).published).toBe(
      false,
    );
  });
});
