// 예약 일정(달력) 슬롯 집계 테스트 (A41) — 슬롯 정의·자원 점유·마감·중복(순수)
import { describe, expect, it } from 'vitest';

import { DAY_SLOTS, occupiedResourceCount, slotCell, slotResourceCapacity } from './schedule-data';
import { listResources } from '../_shared/resources';
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

/** 자원 마스터의 id — '진짜 만실'은 이 목록을 남김없이 채운 것이다 */
const RESOURCE_IDS = listResources().map((resource) => resource.id);

describe('슬롯 정의(순수)', () => {
  it('영업시간 09~20시를 1시간 슬롯으로', () => {
    expect(DAY_SLOTS).toHaveLength(11);
    expect(DAY_SLOTS[0]).toEqual({ startMin: 540, endMin: 600, label: '09:00' });
    expect(DAY_SLOTS[10]).toEqual({ startMin: 1140, endMin: 1200, label: '19:00' });
  });
  it('수용량은 배정 가능한 자원 수', () => {
    expect(slotResourceCapacity()).toBe(RESOURCE_IDS.length);
  });
});

describe('occupiedResourceCount — 자원 점유(순수)', () => {
  it('같은 자원에 몰린 예약은 자원 하나로 센다 — 건수가 아니라 점유다', () => {
    const list = ['a', 'b', 'c', 'd'].map((id) => reservationOf({ id, resourceId: 'room-b' }));
    expect(occupiedResourceCount(list)).toBe(1);
  });
  it('서로 다른 자원은 각각 센다', () => {
    const list = RESOURCE_IDS.map((resourceId, index) =>
      reservationOf({ id: `r${String(index)}`, resourceId }),
    );
    expect(occupiedResourceCount(list)).toBe(RESOURCE_IDS.length);
  });
  it('예약이 없으면 0', () => {
    expect(occupiedResourceCount([])).toBe(0);
  });
});

describe('slotCell — 셀 집계·마감(순수)', () => {
  const slot = { startMin: 600, endMin: 660, label: '10:00' } as const; // 10:00~11:00

  it('걸치는 유효 예약과 점유 자원 수 — 취소는 자리를 비운다', () => {
    const list = [
      reservationOf({
        id: 'a',
        resourceId: 'room-a',
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
      }),
      reservationOf({
        id: 'b',
        resourceId: 'room-b',
        startTime: '10:30',
        endTime: '11:30',
        status: 'requested',
      }),
      reservationOf({
        id: 'c',
        resourceId: 'room-c',
        startTime: '10:00',
        endTime: '11:00',
        status: 'cancelled',
      }),
    ];
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.reservations.map((r) => r.id)).toEqual(['a', 'b']);
    // 유효 예약 2건이 서로 다른 두 자원을 점유한다 — 취소된 room-c 는 비어 있다
    expect(cell.occupiedResources).toBe(2);
    expect(cell.totalResources).toBe(slotResourceCapacity());
    expect(cell.full).toBe(false);
    expect(cell.overbooked).toBe(false);
  });

  /**
   * [진짜 만실] 자원을 **하나도 남김없이** 채운 것만 마감이다.
   * 예전 픽스처는 같은 자원(room-b)에 수용량만큼 예약을 몰아넣고 마감을 확인했다 — 그건 마감이
   * 아니라 더블부킹이었고 실제로는 자원 3개가 비어 있었다(아래 회귀 테스트가 그 사실을 고정한다).
   * 그래서 픽스처를 **자원 4종**으로 바꿔 마감 검증 자체는 그대로 살린다.
   */
  it('모든 자원이 점유되면 마감', () => {
    const list = RESOURCE_IDS.map((resourceId, index) =>
      reservationOf({
        id: `r${String(index)}`,
        resourceId,
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
      }),
    );
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.occupiedResources).toBe(RESOURCE_IDS.length);
    expect(cell.full).toBe(true);
    expect(cell.overbooked).toBe(false);
  });

  it('자원 하나만 비어도 마감이 아니다', () => {
    const list = RESOURCE_IDS.slice(0, -1).map((resourceId, index) =>
      reservationOf({ id: `r${String(index)}`, resourceId }),
    );
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.occupiedResources).toBe(RESOURCE_IDS.length - 1);
    expect(cell.full).toBe(false);
  });

  /**
   * [회귀 · 비둘기집] 한 자원에 예약을 수용량만큼 몰아넣어도 **다른 자원은 그대로 비어 있다.**
   * 예전엔 `booked = reservations.length` 가 자원 구분 없이 건수를 세고 그것을 **자원 개수**와
   * 비교해서, room-b 4건이 '마감'이 됐다 — room-a·room-c·seat-1 이 비어 있는데도. 달력은 마감이라
   * 하고 폼은 room-a 신규 예약을 충돌 0건으로 통과시켰다. 한 앱이 같은 데이터로 두 말을 했다.
   */
  it('한 자원에 예약이 몰려도 다른 자원이 비었으면 마감이 아니다', () => {
    const list = RESOURCE_IDS.map((_, index) =>
      reservationOf({ id: `r${String(index)}`, resourceId: 'room-b' }),
    );
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.reservations).toHaveLength(RESOURCE_IDS.length);
    // 점유한 자원은 room-b 하나뿐이다 — 나머지 자원은 아직 예약을 받을 수 있다
    expect(cell.occupiedResources).toBe(1);
    expect(cell.full).toBe(false);
    // 다만 그 한 자원 안에서는 더블부킹이다 — 셀이 이 사실을 삼키지 않는다
    expect(cell.overbooked).toBe(true);
  });

  it('마감이면서 동시에 중복일 수 있다 — 자원을 다 채우고 그 위에 겹친 경우', () => {
    const list = [
      ...RESOURCE_IDS.map((resourceId, index) =>
        reservationOf({ id: `r${String(index)}`, resourceId }),
      ),
      reservationOf({ id: 'extra', resourceId: 'room-b' }),
    ];
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.full).toBe(true);
    expect(cell.overbooked).toBe(true);
  });

  it('겹치지 않는 예약은 셀에 들어오지 않는다', () => {
    const list = [reservationOf({ id: 'a', startTime: '11:00', endTime: '12:00' })];
    const cell = slotCell(list, '2026-07-16', slot);
    expect(cell.reservations).toHaveLength(0);
    expect(cell.occupiedResources).toBe(0);
    expect(cell.full).toBe(false);
    expect(cell.overbooked).toBe(false);
  });
});
