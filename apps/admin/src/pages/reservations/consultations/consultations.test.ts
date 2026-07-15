// 상담 예약 동작 회귀 테스트 (A41) — 채널 라벨·필터·검색·정렬·타입가드(순수)
import { describe, expect, it } from 'vitest';

import {
  consultChannelLabel,
  filterConsultBookings,
  isConsultChannel,
  searchConsultBookings,
  sortConsultBookings,
} from './types';
import type { ConsultBooking } from './types';

function bookingOf(overrides: Partial<ConsultBooking> & { id: string }): ConsultBooking {
  return {
    code: 'CSB-20260716-000',
    customerName: '윤아름',
    customerPhone: '010-0000-0000',
    channel: 'visit',
    topic: '리모델링 상담',
    preferredDate: '2026-07-16',
    preferredTime: '15:00',
    staffId: 'staff-park',
    status: 'requested',
    note: '',
    ...overrides,
  };
}

describe('채널 라벨·타입가드(순수)', () => {
  it('채널 라벨', () => {
    expect(consultChannelLabel('visit')).toBe('방문상담');
    expect(consultChannelLabel('phone')).toBe('전화상담');
    expect(consultChannelLabel('video')).toBe('화상상담');
  });
  it('isConsultChannel', () => {
    expect(isConsultChannel('video')).toBe(true);
    expect(isConsultChannel('chat')).toBe(false);
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    bookingOf({
      id: 'a',
      status: 'confirmed',
      preferredDate: '2026-07-17',
      preferredTime: '15:00',
      topic: '인테리어',
      customerName: '김하나',
    }),
    bookingOf({
      id: 'b',
      status: 'requested',
      preferredDate: '2026-07-16',
      preferredTime: '13:30',
      topic: '요금제',
      customerName: '이두리',
    }),
    bookingOf({
      id: 'c',
      status: 'requested',
      preferredDate: '2026-07-16',
      preferredTime: '10:00',
      topic: '창업',
      customerName: '박세찌',
    }),
  ];

  it('상태 필터', () => {
    expect(filterConsultBookings(list, 'confirmed').map((b) => b.id)).toEqual(['a']);
    expect(filterConsultBookings(list, 'all')).toHaveLength(3);
  });
  it('주제 검색', () => {
    expect(searchConsultBookings(list, '요금').map((b) => b.id)).toEqual(['b']);
  });
  it('희망일시 오름차순 정렬(임박한 것이 위)', () => {
    expect(sortConsultBookings(list).map((b) => b.id)).toEqual(['c', 'b', 'a']);
  });
});
