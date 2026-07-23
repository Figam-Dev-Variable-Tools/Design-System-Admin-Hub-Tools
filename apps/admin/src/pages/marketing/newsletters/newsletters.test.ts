// 뉴스레터 회귀 테스트 — 회차 채번·정렬·필터(순수) + 폼 검증(발신자·구독자·예약)
import { describe, expect, it } from 'vitest';

import { newsletterAdapter } from './data-source';
import {
  filterNewsletters,
  nextIssueNo,
  searchNewsletters,
  sortNewsletters,
  toNewsletterInput,
} from './types';
import type { NewsletterIssue } from './types';
import { newsletterSchema } from './validation';
import type { NewsletterFormValues } from './validation';

function issueOf(overrides: Partial<NewsletterIssue> & { id: string }): NewsletterIssue {
  return {
    issueNo: 1,
    title: '뉴스레터',
    senderId: 'from-news',
    senderEmail: 'news@spaceplanning.ai',
    senderName: '뉴스',
    segmentIds: ['seg-newsletter'],
    recipientCount: 100,
    body: '본문',
    status: 'draft',
    scheduledAt: '',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
    ...overrides,
  };
}

describe('회차 채번·정렬·필터·변환(순수)', () => {
  const list = [
    issueOf({ id: 'a', issueNo: 12, status: 'sent' }),
    issueOf({ id: 'b', issueNo: 13, title: '특집', status: 'draft' }),
  ];
  it('다음 회차는 최대+1', () => {
    expect(nextIssueNo(list)).toBe(14);
    expect(nextIssueNo([])).toBe(1);
  });
  it('회차 내림차순 정렬', () => {
    expect(sortNewsletters(list).map((n) => n.id)).toEqual(['b', 'a']);
  });
  it('상태 필터·제목 검색', () => {
    expect(filterNewsletters(list, 'sent').map((n) => n.id)).toEqual(['a']);
    expect(searchNewsletters(list, '특집').map((n) => n.id)).toEqual(['b']);
  });
  it('toNewsletterInput 은 파생값을 뺀다', () => {
    const input = toNewsletterInput(issueOf({ id: 'a' }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('issueNo');
    expect(input).not.toHaveProperty('stats');
  });
});

function valuesOf(overrides: Partial<NewsletterFormValues> = {}): NewsletterFormValues {
  return {
    title: '7월 뉴스레터',
    senderId: 'from-news',
    segmentIds: ['seg-newsletter'],
    body: '본문이에요.',
    status: 'draft',
    scheduledAt: '',
    ...overrides,
  };
}

function messageFor(values: NewsletterFormValues, path: string): string | undefined {
  const result = newsletterSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('newsletterSchema — 검증', () => {
  it('정상 초안은 통과한다', () => {
    expect(newsletterSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('제목이 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '' }), 'title')).toContain('입력');
  });
  it('미검증 발신자는 막는다', () => {
    expect(messageFor(valuesOf({ senderId: 'from-noreply' }), 'senderId')).toContain('검증');
  });
  it('구독자 세그먼트가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ segmentIds: [] }), 'segmentIds')).toContain('하나 이상');
  });
  it('예약 과거시각은 막는다', () => {
    expect(
      messageFor(valuesOf({ status: 'scheduled', scheduledAt: '2020-01-01T10:00' }), 'scheduledAt'),
    ).toContain('이후');
  });
});

/**
 * 편집 게이팅의 어댑터 강제 — 화면만 가리면 우회된다.
 *
 * 발송완료 회차가 편집으로 열려 상태가 조용히 '초안'으로 강등되던 결함(FS-033-EL-032).
 * 백엔드가 없으므로 **어댑터가 이 전이의 정본**이다(BE-033 §7.1 `ISSUE_NOT_EDITABLE`).
 */
describe('발송 상태별 편집 게이팅(어댑터)', () => {
  const signal = new AbortController().signal;

  it('초안·예약은 저장된다', async () => {
    const draft = await newsletterAdapter.fetchOne('nl-3', signal);
    await newsletterAdapter.update('nl-3', { ...toNewsletterInput(draft), title: '8월호(수정)' });
    expect((await newsletterAdapter.fetchOne('nl-3', signal)).title).toBe('8월호(수정)');
  });

  it('발송완료 회차의 수정은 422 로 거절하고 회차 이력을 지킨다', async () => {
    // nl-1: status 'sent'
    const sent = await newsletterAdapter.fetchOne('nl-1', signal);

    await expect(
      newsletterAdapter.update('nl-1', {
        ...toNewsletterInput(sent),
        title: '몰래 고친 제목',
        status: 'draft',
      }),
    ).rejects.toMatchObject({ status: 422 });

    const after = await newsletterAdapter.fetchOne('nl-1', signal);
    expect(after.title).toBe(sent.title);
    expect(after.status).toBe('sent');
  });
});
