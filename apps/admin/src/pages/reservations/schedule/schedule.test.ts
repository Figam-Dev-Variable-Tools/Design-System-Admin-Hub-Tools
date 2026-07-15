// 예약 일정(달력) 슬롯 집계 테스트 (A41) — 슬롯 정의·셀 집계·마감(순수)
import { describe, expect, it } from 'vitest';

import { DAY_SLOTS, slotCapacity, slotCell } from './schedule-data';
import type { Reservation } from '../_shared/reservation';

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
    staffId: '',
    deposit: 0,
    request: '',
    status: 'confirmed',
    memo: '',
    ...overrides,
  };
}

describe('슬롯 정의(순수)', () => {
  it('영업시간 09~20시를 1시간 슬롯으로', () => {
    expect(DAY_SLOTS).toHaveLength(11);
    expect(DAY_SLOTS[0]).toEqual({ startMin: 540, endMin: 600, label: '09:00' });
    expect(DAY_SLOTS[10]).toEqual({ startMin: 1140, endMin: 1200, label: '19:00' });
  });
  it('수용량은 자원 수', () => {
    expect(slotCapacity()).toBeGreaterThan(0);
  });
});

describe('slotCell — 셀 집계·마감(순수)', () => {
  const slot = { startMin: 600, endMin: 660, label: '10:00' } as const; // 10:00~11:00

  it('걸치는 유효 예약과 예약 수/수용량', () => {
    const list = [
      reservationOf({ id: 'a', startTime: '10:00', endTime: '11:00', status: 'confirmed' }),
      reservationOf({ id: 'b', startTime: '10:30', endTime: '11:30', status: 'requested' }),
      reservationOf({ id: 'c', startTime: '10:00', endTime: '11:00', status: 'cancelled' }),
    ];
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.reservations.map((r) => r.id)).toEqual(['a', 'b']);
    expect(cell.booked).toBe(2);
    expect(cell.capacity).toBe(slotCapacity());
  });
  it('예약 수가 수용량에 도달하면 마감', () => {
    const capacity = slotCapacity();
    const list = Array.from({ length: capacity }, (_, index) =>
      reservationOf({
        id: `r${String(index)}`,
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
      }),
    );
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.full).toBe(true);
  });
});
