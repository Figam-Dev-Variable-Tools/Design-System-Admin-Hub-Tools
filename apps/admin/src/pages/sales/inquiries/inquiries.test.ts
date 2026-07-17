// 문의 동작 회귀 테스트 — 필터(유형·채널·상태)·검색·정렬·타임라인 append·타입가드(순수)
//   + 견적 발행 연동(자동 생성·승계·중복 발행 방지·양방향 링크)
import { describe, expect, it } from 'vitest';

import { findQuoteByInquiry, listQuotes } from '../quotes/data-source';
import { inquiryAdapter } from './data-source';
import {
  appendEvent,
  filterInquiries,
  hasIssuedQuote,
  isInquiryStatus,
  requestsQuoteIssue,
  searchInquiries,
  sortInquiries,
  toInquiryInput,
} from './types';
import type { Inquiry, InquiryEvent } from './types';

function inquiryOf(overrides: Partial<Inquiry> & { id: string }): Inquiry {
  return {
    inquiryNo: 'INQ-20260714-001',
    title: '문의',
    type: 'quote',
    channel: 'web',
    customerName: '홍길동',
    company: '(주)테스트',
    contact: 'hong@test.example',
    assignee: '',
    priority: 'normal',
    status: 'received',
    receivedAt: '2026-07-14T09:00:00',
    body: '내용',
    quoteId: '',
    timeline: [],
    ...overrides,
  };
}

describe('필터·검색·정렬(순수)', () => {
  const list = [
    inquiryOf({
      id: 'a',
      type: 'quote',
      channel: 'web',
      status: 'received',
      receivedAt: '2026-07-10T09:00:00',
    }),
    inquiryOf({
      id: 'b',
      type: 'claim',
      channel: 'phone',
      status: 'answered',
      company: '가나상사',
      receivedAt: '2026-07-14T09:00:00',
    }),
  ];

  it('유형·채널·상태 복합 필터', () => {
    expect(filterInquiries(list, 'claim', 'all', 'all').map((i) => i.id)).toEqual(['b']);
    expect(filterInquiries(list, 'all', 'web', 'all').map((i) => i.id)).toEqual(['a']);
    expect(filterInquiries(list, 'all', 'all', 'answered').map((i) => i.id)).toEqual(['b']);
    expect(filterInquiries(list, 'all', 'all', 'all')).toHaveLength(2);
  });

  it('제목·거래처 검색', () => {
    expect(searchInquiries(list, '가나').map((i) => i.id)).toEqual(['b']);
  });

  it('접수일시 내림차순 정렬', () => {
    expect(sortInquiries(list).map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('toInquiryInput 은 id 를 뺀다', () => {
    expect(toInquiryInput(inquiryOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});

describe('isInquiryStatus — 타입가드(순수)', () => {
  it('유효한 상태만 좁힌다', () => {
    expect(isInquiryStatus('answered')).toBe(true);
    expect(isInquiryStatus('bogus')).toBe(false);
    expect(isInquiryStatus(42)).toBe(false);
  });
});

describe('견적 발행 판정(순수)', () => {
  it('quoteId 가 있으면 이미 발행된 문의다(중복 발행 방지 키)', () => {
    expect(hasIssuedQuote({ quoteId: '' })).toBe(false);
    expect(hasIssuedQuote({ quoteId: 'qt-9' })).toBe(true);
  });
  it('견적 발행 상태만 발행을 요청한다', () => {
    expect(requestsQuoteIssue('quote_issued')).toBe(true);
    expect(requestsQuoteIssue('in_progress')).toBe(false);
    expect(requestsQuoteIssue('answered')).toBe(false);
  });
  it('견적 발행은 유효한 상태값이다', () => {
    expect(isInquiryStatus('quote_issued')).toBe(true);
  });
});

/**
 * 문의 → 견적 발행 연동 (H) — 어댑터 경계에서 확인한다. 백엔드가 없으므로 어댑터가 이 전이의 정본이다.
 * 픽스처 저장소는 모듈 상태라 순서에 의존한다 — 한 흐름으로 이어서 단언한다.
 */
describe('문의 → 견적 발행 연동(어댑터)', () => {
  const signal = new AbortController().signal;
  const target = 'inq-2'; // 견적 미발행 문의(시드)

  it('견적 발행으로 바꾸면 견적이 자동 생성되고 양방향으로 연결된다', async () => {
    const before = await inquiryAdapter.fetchOne(target, signal);
    expect(hasIssuedQuote(before)).toBe(false);

    await inquiryAdapter.update(target, { ...toInquiryInput(before), status: 'quote_issued' });
    const after = await inquiryAdapter.fetchOne(target, signal);

    // 문의 → 견적
    expect(hasIssuedQuote(after)).toBe(true);
    // 견적 → 문의 (역링크)
    const quote = findQuoteByInquiry(target);
    expect(quote?.id).toBe(after.quoteId);
    expect(quote?.inquiryNo).toBe(before.inquiryNo);
  });

  it('생성된 견적은 문의의 회사·담당자·문의내용을 승계하고 번호를 자동 부여받는다', () => {
    const quote = findQuoteByInquiry(target);
    expect(quote?.accountName).toBe('대성물산 주식회사');
    expect(quote?.contactName).toBe('최과장');
    expect(quote?.inquiryBody).toBe('내년도 유지보수 계약 갱신 조건을 알고 싶습니다.');
    expect(quote?.quoteNo).toMatch(/^Q-\d{8}-\d{3}$/);
    expect(quote?.status).toBe('draft');
  });

  it('타임라인에 자동 생성 사실이 남는다', async () => {
    const after = await inquiryAdapter.fetchOne(target, signal);
    const last = after.timeline[after.timeline.length - 1];
    expect(last?.text).toContain('견적 자동 생성');
    expect(last?.author).toBe('시스템');
  });

  it('이미 발행된 문의를 다시 저장해도 견적을 새로 만들지 않는다(중복 발행 방지)', async () => {
    const issued = await inquiryAdapter.fetchOne(target, signal);
    const countBefore = listQuotes().length;

    await inquiryAdapter.update(target, { ...toInquiryInput(issued), status: 'quote_issued' });
    await inquiryAdapter.update(target, { ...toInquiryInput(issued), status: 'quote_issued' });

    expect(listQuotes()).toHaveLength(countBefore);
    expect((await inquiryAdapter.fetchOne(target, signal)).quoteId).toBe(issued.quoteId);
  });

  it('견적 발행이 아닌 전이는 견적을 만들지 않는다', async () => {
    const other = await inquiryAdapter.fetchOne('inq-1', signal);
    const countBefore = listQuotes().length;

    await inquiryAdapter.update('inq-1', { ...toInquiryInput(other), status: 'answered' });

    expect(listQuotes()).toHaveLength(countBefore);
    expect(findQuoteByInquiry('inq-1')).toBeUndefined();
  });
});

describe('appendEvent — 타임라인 append(순수)', () => {
  it('이벤트를 끝에 덧붙이고 원본을 바꾸지 않는다', () => {
    const base: readonly InquiryEvent[] = [
      { id: 'e1', at: '2026-07-14T09:00:00', author: '시스템', kind: 'received', text: '접수' },
    ];
    const event: InquiryEvent = {
      id: 'e2',
      at: '2026-07-14T10:00:00',
      author: '관리자',
      kind: 'reply',
      text: '답변',
    };
    const next = appendEvent(base, event);
    expect(next).toHaveLength(2);
    expect(next[1]?.id).toBe('e2');
    expect(base).toHaveLength(1);
  });
});
