// 문의 동작 회귀 테스트 (A41) — 필터(유형·채널·상태)·검색·정렬·타임라인 append·타입가드(순수)
import { describe, expect, it } from 'vitest';

import {
  appendEvent,
  filterInquiries,
  isInquiryStatus,
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
