// 상담 이력 동작 회귀 테스트 — 후속조치 대기·유형/대기 필터·검색·정렬(순수)
import { describe, expect, it } from 'vitest';

import {
  consultOutcomeTone,
  filterConsultations,
  hasPendingFollowUp,
  searchConsultations,
  sortConsultations,
} from './types';
import type { Consultation } from './types';

function consultOf(overrides: Partial<Consultation> & { id: string }): Consultation {
  return {
    accountName: '(주)테스트',
    contactPerson: '홍길동',
    consultType: 'phone',
    topic: '상담 주제',
    consultedAt: '2026-07-14T10:00:00',
    consultant: '담당',
    content: '내용',
    outcome: 'neutral',
    followUpAction: '',
    followUpAt: '',
    followUpDone: false,
    related: '',
    ...overrides,
  };
}

describe('hasPendingFollowUp — 후속조치 대기(순수)', () => {
  it('후속조치가 있고 미완료면 대기', () => {
    expect(
      hasPendingFollowUp(consultOf({ id: 'a', followUpAction: '회신', followUpDone: false })),
    ).toBe(true);
  });
  it('완료됐으면 대기 아님', () => {
    expect(
      hasPendingFollowUp(consultOf({ id: 'a', followUpAction: '회신', followUpDone: true })),
    ).toBe(false);
  });
  it('후속조치가 없으면 대기 아님', () => {
    expect(hasPendingFollowUp(consultOf({ id: 'a', followUpAction: '' }))).toBe(false);
  });
});

describe('consultOutcomeTone(순수)', () => {
  it('결과별 톤', () => {
    expect(consultOutcomeTone('positive')).toBe('success');
    expect(consultOutcomeTone('negative')).toBe('danger');
    expect(consultOutcomeTone('neutral')).toBe('neutral');
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    consultOf({ id: 'a', consultType: 'phone', consultedAt: '2026-07-10T10:00:00' }),
    consultOf({
      id: 'b',
      consultType: 'visit',
      topic: '가나 미팅',
      followUpAction: '회신',
      followUpDone: false,
      consultedAt: '2026-07-14T10:00:00',
    }),
  ];

  it('유형 필터', () => {
    expect(filterConsultations(list, 'visit', false).map((c) => c.id)).toEqual(['b']);
    expect(filterConsultations(list, 'all', false)).toHaveLength(2);
  });
  it('후속조치 대기 필터', () => {
    expect(filterConsultations(list, 'all', true).map((c) => c.id)).toEqual(['b']);
  });
  it('주제 검색', () => {
    expect(searchConsultations(list, '가나').map((c) => c.id)).toEqual(['b']);
  });
  it('상담일시 내림차순 정렬', () => {
    expect(sortConsultations(list).map((c) => c.id)).toEqual(['b', 'a']);
  });
});
