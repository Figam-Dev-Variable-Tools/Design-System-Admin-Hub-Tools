// 이벤트 회귀 테스트 — 필터·검색·정렬(순수) + 폼 검증(기간·혜택·배너)
import { describe, expect, it } from 'vitest';

import { filterEvents, searchEvents, sortEvents, toEventInput } from './types';
import type { MarketingEvent } from './types';
import { eventSchema } from './validation';
import type { EventFormValues } from './validation';

function eventOf(overrides: Partial<MarketingEvent> & { id: string }): MarketingEvent {
  return {
    title: '이벤트',
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    phase: 'ongoing',
    target: '전체 회원',
    benefitType: 'none',
    benefitDetail: '',
    bannerLinked: false,
    bannerLabel: '',
    description: '',
    ...overrides,
  };
}

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    eventOf({ id: 'a', title: '가이벤트', phase: 'ongoing', startAt: '2026-07-01' }),
    eventOf({ id: 'b', title: '나이벤트', phase: 'ended', startAt: '2026-03-01' }),
  ];
  it('상태 필터', () => {
    expect(filterEvents(list, 'ended').map((e) => e.id)).toEqual(['b']);
    expect(filterEvents(list, 'all')).toHaveLength(2);
  });
  it('이벤트명 검색', () => {
    expect(searchEvents(list, '나이벤트').map((e) => e.id)).toEqual(['b']);
  });
  it('시작일 내림차순 정렬', () => {
    expect(sortEvents(list).map((e) => e.id)).toEqual(['a', 'b']);
  });
  it('toEventInput 은 id 를 뺀다', () => {
    expect(toEventInput(eventOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});

function valuesOf(overrides: Partial<EventFormValues> = {}): EventFormValues {
  return {
    title: '여름 이벤트',
    startAt: '2026-07-01',
    endAt: '2026-07-31',
    phase: 'ongoing',
    target: '전체 회원',
    benefitType: 'none',
    benefitDetail: '',
    bannerLinked: false,
    bannerLabel: '',
    description: '',
    ...overrides,
  };
}

function messageFor(values: EventFormValues, path: string): string | undefined {
  const result = eventSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('eventSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(eventSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('이벤트명이 비면 막는다', () => {
    expect(messageFor(valuesOf({ title: '' }), 'title')).toContain('입력');
  });
  it('종료일이 시작일보다 빠르면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-07-31', endAt: '2026-07-01' }), 'endAt')).toContain(
      '빠를',
    );
  });
  it('쿠폰 혜택인데 상세가 없으면 막는다', () => {
    expect(
      messageFor(valuesOf({ benefitType: 'coupon', benefitDetail: '' }), 'benefitDetail'),
    ).toContain('혜택');
  });
  it('배너 연동인데 배너명이 없으면 막는다', () => {
    expect(messageFor(valuesOf({ bannerLinked: true, bannerLabel: '' }), 'bannerLabel')).toContain(
      '배너',
    );
  });
  // [회귀] 여기 있던 사본 isRealDate 는 형식만 보고 실재 여부를 보지 않아 2026-02-31 을
  // 통과시켰다(Date 가 3/3 으로 굴린 뒤 !Number.isNaN 이 참). 정본 isCalendarDate 로 수렴해 막는다.
  it('달력에 없는 날짜(2026-02-31)를 주면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-02-31' }), 'startAt')).toContain('YYYY-MM-DD');
  });
});
