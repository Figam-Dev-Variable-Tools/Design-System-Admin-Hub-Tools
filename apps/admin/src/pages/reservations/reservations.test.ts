// 예약 동작 회귀 테스트 — 더블부킹·활성·필터·검색·정렬·슬롯(순수)
import { describe, expect, it } from 'vitest';

import {
  filterReservations,
  findConflicts,
  hasConflict,
  isActive,
  reservationsInSlot,
  searchReservations,
  sortReservations,
} from './_shared/reservation';
import type { Reservation } from './_shared/reservation';

function reservationOf(overrides: Partial<Reservation> & { id: string }): Reservation {
  return {
    code: 'RSV-20260716-000',
    customerName: '홍길동',
    customerPhone: '010-0000-0000',
    date: '2026-07-16',
    startTime: '10:00',
    endTime: '11:00',
    partySize: 2,
    resourceId: 'room-b',
    staffId: 'staff-kim',
    deposit: 0,
    request: '',
    status: 'confirmed',
    memo: '',
    ...overrides,
  };
}

describe('findConflicts — 더블부킹(순수)', () => {
  const base = reservationOf({
    id: 'a',
    resourceId: 'room-b',
    startTime: '10:00',
    endTime: '11:00',
  });

  it('같은 자원·같은 날·시간 겹침이면 충돌', () => {
    const candidate = reservationOf({ id: 'b', startTime: '10:30', endTime: '11:30' });
    expect(findConflicts([base], candidate).map((r) => r.id)).toEqual(['a']);
    expect(hasConflict([base], candidate)).toBe(true);
  });
  it('경계 접함(11:00~12:00)은 충돌 아님', () => {
    const candidate = reservationOf({ id: 'b', startTime: '11:00', endTime: '12:00' });
    expect(findConflicts([base], candidate)).toHaveLength(0);
  });
  it('다른 자원이면 충돌 아님', () => {
    const candidate = reservationOf({
      id: 'b',
      resourceId: 'room-c',
      startTime: '10:30',
      endTime: '11:30',
    });
    expect(findConflicts([base], candidate)).toHaveLength(0);
  });
  it('자기 자신(같은 id)은 충돌에서 제외', () => {
    expect(findConflicts([base], base)).toHaveLength(0);
  });
  it('취소·노쇼(자리 비움)는 충돌로 세지 않는다', () => {
    const cancelled = reservationOf({ id: 'a', status: 'cancelled' });
    const candidate = reservationOf({ id: 'b', startTime: '10:30', endTime: '11:30' });
    expect(findConflicts([cancelled], candidate)).toHaveLength(0);
    const candidateCancelled = reservationOf({
      id: 'b',
      status: 'noshow',
      startTime: '10:30',
      endTime: '11:30',
    });
    expect(findConflicts([base], candidateCancelled)).toHaveLength(0);
  });
});

describe('isActive·필터·검색·정렬(순수)', () => {
  const list = [
    reservationOf({
      id: 'a',
      date: '2026-07-14',
      startTime: '10:00',
      status: 'visited',
      code: 'RSV-1',
      customerName: '김철수',
    }),
    reservationOf({
      id: 'b',
      date: '2026-07-16',
      startTime: '09:00',
      status: 'requested',
      code: 'RSV-2',
      customerName: '이영희',
    }),
    reservationOf({
      id: 'c',
      date: '2026-07-16',
      startTime: '14:00',
      status: 'cancelled',
      code: 'RSV-3',
      customerName: '박민수',
    }),
  ];

  it('isActive — 취소는 비활성', () => {
    // a(방문완료)·b(요청)은 활성, c(취소)는 비활성
    expect(list.map(isActive)).toEqual([true, true, false]);
  });
  it('상태 필터', () => {
    expect(filterReservations(list, 'requested').map((r) => r.id)).toEqual(['b']);
    expect(filterReservations(list, 'all')).toHaveLength(3);
  });
  it('예약번호·고객 검색', () => {
    expect(searchReservations(list, '이영희').map((r) => r.id)).toEqual(['b']);
    expect(searchReservations(list, 'rsv-3').map((r) => r.id)).toEqual(['c']);
  });
  it('방문일시 내림차순 정렬(임박·최근이 위)', () => {
    expect(sortReservations(list).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('reservationsInSlot — 달력 셀(순수)', () => {
  const list = [
    reservationOf({
      id: 'a',
      date: '2026-07-16',
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
    }),
    reservationOf({
      id: 'b',
      date: '2026-07-16',
      startTime: '10:30',
      endTime: '12:00',
      status: 'requested',
    }),
    reservationOf({
      id: 'c',
      date: '2026-07-16',
      startTime: '10:00',
      endTime: '11:00',
      status: 'cancelled',
    }),
    reservationOf({
      id: 'd',
      date: '2026-07-17',
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
    }),
  ];

  it('해당 날짜·슬롯에 걸치는 유효 예약만', () => {
    // 10:00~11:00 슬롯(600~660분)
    const cell = reservationsInSlot(list, '2026-07-16', 600, 660);
    expect(cell.map((r) => r.id)).toEqual(['a', 'b']);
  });
  it('다른 날짜는 포함하지 않는다', () => {
    expect(reservationsInSlot(list, '2026-07-16', 600, 660).some((r) => r.id === 'd')).toBe(false);
  });
});
