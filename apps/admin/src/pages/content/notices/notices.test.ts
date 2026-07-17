// 공지사항 화면의 동작 회귀 테스트
//
// [무엇을 고정하는가] 목록의 동작은 필터 규칙(data-source.applyQuery)에, 폼의 동작은 검증
// 규칙(validation.noticeSchema)에 있다. 화면은 그 결과를 그리기만 한다 — 여기서 규칙을 고정한다.
import { describe, expect, it } from 'vitest';

import { applyQuery, NOTICES } from './data-source';
import type { NoticeQuery } from './data-source';
import { noticeSchema } from './validation';
import type { NoticeFormValues } from './validation';
import type { Notice } from './types';

/* ── 표본 ─────────────────────────────────────────────────────────────────── */

function noticeOf(overrides: Partial<Notice> & { id: string }): Notice {
  return {
    title: '서비스 이용 안내',
    category: 'notice',
    status: 'published',
    pinned: false,
    author: '시스템 관리자',
    publishedAtIso: '2026-05-01T09:00:00',
    views: 100,
    body: '본문',
    ...overrides,
  };
}

const SAMPLE: readonly Notice[] = [
  noticeOf({ id: '1', title: '가입 축하 이벤트', category: 'event', status: 'published' }),
  noticeOf({ id: '2', title: '정기 점검 안내', category: 'maintenance', status: 'scheduled' }),
  noticeOf({ id: '3', title: '서비스 이용 안내', category: 'notice', status: 'draft' }),
  noticeOf({ id: '4', title: '추가 이벤트', category: 'event', status: 'draft' }),
];

function queryOf(overrides: Partial<NoticeQuery> = {}): NoticeQuery {
  return { category: 'all', status: 'all', keyword: '', page: 1, ...overrides };
}

const idsOf = (notices: readonly Notice[]) => notices.map((n) => n.id);

/* ── 필터 ─────────────────────────────────────────────────────────────────── */

describe('applyQuery — 필터', () => {
  it('기본(전체·전체)은 모든 공지를 돌려준다', () => {
    expect(idsOf(applyQuery(queryOf(), SAMPLE))).toEqual(['1', '2', '3', '4']);
  });

  it('분류 필터 — 이벤트만', () => {
    expect(idsOf(applyQuery(queryOf({ category: 'event' }), SAMPLE))).toEqual(['1', '4']);
  });

  it('상태 필터 — 임시저장만', () => {
    expect(idsOf(applyQuery(queryOf({ status: 'draft' }), SAMPLE))).toEqual(['3', '4']);
  });

  it('분류 × 상태는 AND 로 걸린다', () => {
    const result = applyQuery(queryOf({ category: 'event', status: 'draft' }), SAMPLE);
    expect(idsOf(result)).toEqual(['4']);
  });

  it('제목 검색 — 대소문자·앞뒤 공백 무시', () => {
    expect(idsOf(applyQuery(queryOf({ keyword: '  이벤트 ' }), SAMPLE))).toEqual(['1', '4']);
  });

  it('빈 상태 — 걸리는 것이 없으면 빈 배열', () => {
    expect(applyQuery(queryOf({ keyword: '없는제목' }), SAMPLE)).toEqual([]);
  });
});

/* ── 픽스처 — 상단 고정 정렬 ──────────────────────────────────────────────── */

describe('NOTICES 픽스처', () => {
  it('상단 고정 공지가 목록 맨 앞에 온다', () => {
    const firstUnpinned = NOTICES.findIndex((notice) => !notice.pinned);
    const pinnedAfter = NOTICES.slice(firstUnpinned).filter((notice) => notice.pinned);
    expect(pinnedAfter).toEqual([]);
  });

  it('작성자에 개인 실명이 없다 — 운영 조직 역할명만 쓴다', () => {
    const allowed = new Set(['콘텐츠 운영팀', '시스템 관리자', '마케팅팀']);
    expect(NOTICES.every((notice) => allowed.has(notice.author))).toBe(true);
  });
});

/* ── 폼 검증 ──────────────────────────────────────────────────────────────── */

function valuesOf(overrides: Partial<NoticeFormValues> = {}): NoticeFormValues {
  return {
    title: '제목',
    category: 'notice',
    status: 'draft',
    pinned: false,
    publishedAt: '',
    body: '본문',
    ...overrides,
  };
}

function messageFor(values: NoticeFormValues, field: keyof NoticeFormValues): string | undefined {
  const result = noticeSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('noticeSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(noticeSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('제목이 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '   ' }), 'title')).toBe('제목을 입력하세요.');
  });

  it('제목이 100자를 넘으면 막는다', () => {
    expect(messageFor(valuesOf({ title: 'ㄱ'.repeat(101) }), 'title')).toContain('100자');
  });

  it('본문이 비면 막는다', () => {
    expect(messageFor(valuesOf({ body: '' }), 'body')).toBe('본문을 입력하세요.');
  });

  it('임시저장/게시는 게시일을 강제하지 않는다', () => {
    expect(noticeSchema.safeParse(valuesOf({ status: 'published', publishedAt: '' })).success).toBe(
      true,
    );
  });

  it('예약인데 게시일이 없으면 막는다', () => {
    expect(messageFor(valuesOf({ status: 'scheduled', publishedAt: '' }), 'publishedAt')).toContain(
      'YYYY-MM-DD',
    );
  });

  it('예약 게시일이 과거면 막는다', () => {
    expect(
      messageFor(valuesOf({ status: 'scheduled', publishedAt: '2020-01-01' }), 'publishedAt'),
    ).toBe('예약 게시일은 오늘 이후여야 합니다.');
  });

  it('실재하지 않는 날짜(2026-02-31)는 통과시키지 않는다', () => {
    expect(
      messageFor(valuesOf({ status: 'scheduled', publishedAt: '2026-02-31' }), 'publishedAt'),
    ).toContain('YYYY-MM-DD');
  });

  it('예약 + 미래 게시일은 통과한다', () => {
    expect(
      noticeSchema.safeParse(valuesOf({ status: 'scheduled', publishedAt: '2099-12-31' })).success,
    ).toBe(true);
  });
});
