// 뉴스·보도자료 순수 규칙 회귀 테스트
//
// [무엇을 못 박는가]
//   ① 고정글이 발행일에 밀려 내려가는 것 — 고정의 의미가 사라진다
//   ② '예약' 을 저장값으로 착각하는 것 (파생 상태는 시간이 만든다)
//   ③ 첨부가 가리키는 자산이 사라졌는데 조용히 넘어가는 것, 그리고 그 반대(모르는데 삭제라고 말하는 것)
import { describe, expect, it } from 'vitest';

import type { CatalogMediaAsset } from '../../../shared/domain/media-library';
import {
  ATTACHMENT_MISSING,
  ATTACHMENT_UNKNOWN,
  attachmentViews,
  attachmentWarning,
  CATEGORY_FILTER_ALL,
  categoryLabelOf,
  countByCategory,
  filterNewsPosts,
  newsStatus,
  sortNewsPosts,
  withAttachment,
  withoutAttachment,
} from './types';
import type { NewsCategory, NewsPost } from './types';

const post = (overrides: Partial<NewsPost> = {}): NewsPost => ({
  id: 'nw-1',
  title: '첫 소식',
  categoryId: 'press',
  pinned: false,
  status: 'published',
  publishAt: '2026-03-01T09:00',
  body: '본문',
  attachmentIds: [],
  updatedAt: '2026-03-01T09:00',
  ...overrides,
});

const CATEGORIES: readonly NewsCategory[] = [
  { id: 'press', label: '언론보도' },
  { id: 'award', label: '수상·인증' },
];

const CATALOG: readonly CatalogMediaAsset[] = [
  { id: 'md-1', fileName: 'press-kit.zip', url: '/x.svg', alt: '보도자료 묶음', sizeBytes: 100 },
];

const NOW = new Date('2026-07-01T00:00:00');

describe('sortNewsPosts', () => {
  it('고정글이 언제나 위다 — 발행일이 더 오래됐어도', () => {
    const pinnedOld = post({ id: 'nw-1', pinned: true, publishAt: '2025-01-01T09:00' });
    const freshest = post({ id: 'nw-2', publishAt: '2026-06-01T09:00' });
    expect(sortNewsPosts([freshest, pinnedOld]).map((item) => item.id)).toEqual(['nw-1', 'nw-2']);
  });

  it('고정끼리·일반끼리는 발행일 내림차순이다', () => {
    const a = post({ id: 'nw-1', publishAt: '2026-01-01T09:00' });
    const b = post({ id: 'nw-2', publishAt: '2026-05-01T09:00' });
    expect(sortNewsPosts([a, b]).map((item) => item.id)).toEqual(['nw-2', 'nw-1']);
  });

  it('공개 일시가 없는 글은 최근 수정으로 자리를 잡는다 — 맨 아래로 몰리지 않는다', () => {
    const draft = post({
      id: 'nw-1',
      status: 'draft',
      publishAt: '',
      updatedAt: '2026-06-30T10:00',
    });
    const published = post({ id: 'nw-2', publishAt: '2026-05-01T09:00' });
    expect(sortNewsPosts([published, draft]).map((item) => item.id)).toEqual(['nw-1', 'nw-2']);
  });
});

describe('상태 파생', () => {
  it('미래 공개 일시는 예약으로 읽힌다 — 저장값에는 예약이 없다', () => {
    expect(newsStatus(post({ publishAt: '2026-12-01T09:00' }), NOW)).toBe('scheduled');
    expect(newsStatus(post({ publishAt: '2026-01-01T09:00' }), NOW)).toBe('published');
    expect(newsStatus(post({ status: 'draft', publishAt: '' }), NOW)).toBe('draft');
  });
});

describe('필터 · 건수', () => {
  const press = post({ id: 'nw-1', categoryId: 'press' });
  const award = post({ id: 'nw-2', categoryId: 'award', title: '인증 획득' });
  const scheduled = post({ id: 'nw-3', categoryId: 'press', publishAt: '2026-12-01T09:00' });
  const all = [press, award, scheduled];

  it('카테고리 건수는 전체를 함께 센다', () => {
    expect(countByCategory(all, CATEGORIES)).toEqual({
      [CATEGORY_FILTER_ALL]: 3,
      press: 2,
      award: 1,
    });
  });

  it('상태 필터는 파생 상태로 거른다', () => {
    expect(
      filterNewsPosts(all, 'scheduled', CATEGORY_FILTER_ALL, '', NOW).map((p) => p.id),
    ).toEqual(['nw-3']);
  });

  it('카테고리와 키워드가 함께 걸린다', () => {
    expect(filterNewsPosts(all, 'all', 'award', '', NOW).map((p) => p.id)).toEqual(['nw-2']);
    expect(filterNewsPosts(all, 'all', CATEGORY_FILTER_ALL, '인증', NOW).map((p) => p.id)).toEqual([
      'nw-2',
    ]);
  });

  it('모르는 분류는 지어내지 않는다', () => {
    expect(categoryLabelOf(CATEGORIES, 'press')).toBe('언론보도');
    expect(categoryLabelOf(CATEGORIES, '없음')).toBe('미분류');
  });
});

describe('첨부', () => {
  it('살아 있는 자산과 이어 준다', () => {
    const views = attachmentViews(['md-1'], CATALOG);
    expect(views[0]?.asset?.fileName).toBe('press-kit.zip');
    expect(attachmentWarning(['md-1'], CATALOG)).toBeNull();
  });

  it('사라진 자산은 경고한다', () => {
    expect(attachmentViews(['md-없음'], CATALOG)[0]?.asset).toBeNull();
    expect(attachmentWarning(['md-없음'], CATALOG)).toBe(ATTACHMENT_MISSING);
  });

  it('카탈로그를 모르면 삭제됐다고 말하지 않는다 — 다른 문장을 쓴다', () => {
    expect(attachmentWarning(['md-1'], null)).toBe(ATTACHMENT_UNKNOWN);
    expect(attachmentViews(['md-1'], null)[0]?.asset).toBeNull();
  });

  it('첨부가 없으면 경고할 것도 없다', () => {
    expect(attachmentWarning([], null)).toBeNull();
  });

  it('같은 파일을 두 번 붙이지 않는다 (멱등)', () => {
    expect(withAttachment(['md-1'], 'md-1')).toEqual(['md-1']);
    expect(withAttachment(['md-1'], 'md-2')).toEqual(['md-1', 'md-2']);
    expect(withoutAttachment(['md-1', 'md-2'], 'md-1')).toEqual(['md-2']);
  });
});
