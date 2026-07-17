// 예약 일정(달력) 순수 데이터 헬퍼
//
// [라이브러리 없이 직접] 시간 슬롯·가용량 계산은 순수 함수다(외부 캘린더 라이브러리 미도입).
// 예약 일정 화면의 일/주 뷰가 이 슬롯 정의와 셀 집계를 쓴다. 순수라 테스트로 고정한다.
//
// [슬롯·가용량 모델] 하루를 1시간 슬롯으로 나눈다(영업시간 09~20시). 셀이 세는 것은 **자원(개)**이다:
// 분모는 배정 가능한 자원 수, 분자는 **실제로 점유된 자원 수**다. 자원마다 같은 시간에 하나의 예약만
// 받으므로, 자원이 남김없이 점유되면 '마감'이다. 취소·노쇼는 자리를 비운다(reservationsInSlot 이 처리).
//
// [왜 건수가 아니라 점유인가 — 비둘기집] 예전엔 분자가 `reservations.length`(예약 건수)였다. 건수와
// 자원 수는 **다른 양**인데 그 둘을 비교하니, 상담룸 B 한 곳에 4건이 몰리면 room-a·room-c·seat-1 이
// 텅 비었는데도 '마감'이 됐다. 반대로 자원 4개에 1건씩(완전 정상)도 똑같이 '마감'이라, 화면은 **정상
// 만실과 빈 방 3개를 구분하지 못했다.** 게다가 폼은 같은 순간 room-a 신규 예약을 충돌 0건으로
// 통과시켰다 — 한 앱이 같은 데이터로 두 말을 한 것이다. 분자를 점유 자원 수로 바꿔 단위를 맞춘다.
//
// [이름] 여기의 '수용량'은 **자원 수(개)**다. 자원의 정원(명, resources.resourceCapacity)과는 다른
// 양이고, 정원은 인원 상한 검증(reservation-validation)이 쓴다 — 두 양이 이름으로 섞이지 않게 한다.
//
// [중복] 자원별 점유로 세면 한 자원에 몰린 예약이 분자를 밀어올리지 않는다(그게 옳다). 대신 그
// 더블부킹이 셀의 숫자에서 보이지 않게 되므로, overbooked 로 따로 사실을 남긴다 — 목록의 '중복'
// 배지·폼의 경고와 같은 사실을 달력도 말한다.
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

/** 한 슬롯에 배정할 수 있는 **자원 수**(개) — 셀 분모. 자원의 정원(명)과는 다른 양이다 */
export function slotResourceCapacity(): number {
  return listResources().length;
}

/** 예약들이 실제로 점유한 **서로 다른 자원의 수**(개) — 한 자원에 몰린 예약은 자원 하나로 센다 */
export function occupiedResourceCount(reservations: readonly Reservation[]): number {
  return new Set(reservations.map((reservation) => reservation.resourceId)).size;
}

interface SlotCell {
  readonly reservations: readonly Reservation[];
  /** 점유된 자원 수(분자) */
  readonly occupiedResources: number;
  /** 배정 가능한 자원 수(분모) */
  readonly totalResources: number;
  /** 자원이 남김없이 점유되었는가(마감) */
  readonly full: boolean;
  /** 한 자원에 겹치는 유효 예약이 둘 이상인가(더블부킹이 이 슬롯 안에 있다) */
  readonly overbooked: boolean;
}

/** 특정 날짜·슬롯의 셀 집계 — 걸치는 유효 예약 + 점유/전체 자원 수·마감·중복 */
export function slotCell(all: readonly Reservation[], date: string, slot: Slot): SlotCell {
  const reservations = reservationsInSlot(all, date, slot.startMin, slot.endMin);
  const totalResources = slotResourceCapacity();
  const occupiedResources = occupiedResourceCount(reservations);
  return {
    reservations,
    occupiedResources,
    totalResources,
    full: occupiedResources >= totalResources,
    overbooked: reservations.length > occupiedResourceCount(reservations),
  };
}
