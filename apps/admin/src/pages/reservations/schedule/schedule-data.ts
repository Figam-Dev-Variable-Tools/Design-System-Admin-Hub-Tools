// 예약 일정(달력) 순수 데이터 헬퍼 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// [라이브러리 없이 직접] 시간 슬롯·가용량 계산은 순수 함수다(외부 캘린더 라이브러리 미도입).
// 예약 일정 화면의 일/주 뷰가 이 슬롯 정의와 셀 집계를 쓴다. 순수라 테스트로 고정한다.
//
// [슬롯·가용량 모델] 하루를 1시간 슬롯으로 나눈다(영업시간 09~20시). 한 슬롯의 수용량(가용량)은
// 배정 가능한 자원 수다 — 자원마다 같은 시간에 하나의 예약만 받을 수 있다고 본다. 유효 예약이
// 수용량에 도달하면 '마감'이다. 취소·노쇼는 자리를 비우므로 세지 않는다(reservationsInSlot 이 처리).
import { listResources } from '../_shared/resources';
import { reservationsInSlot } from '../_shared/reservation';
import type { Reservation } from '../_shared/reservation';

const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;

export interface Slot {
  /** 자정 기준 시작 분 */
  readonly startMin: number;
  /** 자정 기준 종료 분 */
  readonly endMin: number;
  /** 'HH:mm' 표기 */
  readonly label: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** 영업시간 09~20시를 1시간 슬롯으로 — 일/주 뷰의 행 */
export const DAY_SLOTS: readonly Slot[] = Array.from(
  { length: CLOSE_HOUR - OPEN_HOUR },
  (_, index) => {
    const hour = OPEN_HOUR + index;
    return { startMin: hour * 60, endMin: (hour + 1) * 60, label: `${pad2(hour)}:00` };
  },
);

/** 한 슬롯의 수용량(가용량) — 배정 가능한 자원 수 */
export function slotCapacity(): number {
  return listResources().length;
}

interface SlotCell {
  readonly reservations: readonly Reservation[];
  readonly booked: number;
  readonly capacity: number;
  /** 예약이 수용량에 도달했는가(마감) */
  readonly full: boolean;
}

/** 특정 날짜·슬롯의 셀 집계 — 걸치는 유효 예약 + 예약 수/수용량/마감 여부 */
export function slotCell(all: readonly Reservation[], date: string, slot: Slot): SlotCell {
  const reservations = reservationsInSlot(all, date, slot.startMin, slot.endMin);
  const capacity = slotCapacity();
  const booked = reservations.length;
  return { reservations, booked, capacity, full: booked >= capacity };
}
