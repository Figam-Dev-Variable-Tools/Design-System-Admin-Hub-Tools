// 예약 도메인 타입 · 순수 규칙 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// [왜 _shared 인가] 예약 화면(목록·폼)과 예약 일정(달력)이 같은 예약 데이터를 읽는다. 페이지 간
// 직접 import 는 금지이므로, 타입·규칙과 데이터 소스를 이 섹션 공용(_shared)에 두고 둘이 함께 읽는다
// (marketing/_shared/store 선례와 동일).
//
// [더블부킹] 같은 자원(자리)에 시간이 겹치는 유효 예약이 둘 이상이면 더블부킹이다. 취소·노쇼는
// 자리를 비우므로(occupiesSlot=false) 충돌로 세지 않는다. 판정은 순수 함수라 테스트로 고정한다.
import { BOOKING_FILTER_ALL, occupiesSlot } from './booking';
import type { BookingStatus, BookingStatusFilter } from './booking';
import { rangesOverlap, toMinutes } from './calendar';

export interface Reservation {
  readonly id: string;
  /** 예약번호 — 'RSV-YYYYMMDD-NNN' */
  readonly code: string;
  readonly customerName: string;
  /** 연락처 — 마스킹된 표기(실번호 아님) */
  readonly customerPhone: string;
  /** 방문 날짜 'YYYY-MM-DD' */
  readonly date: string;
  /** 시작 시각 'HH:mm' */
  readonly startTime: string;
  /** 종료 시각 'HH:mm' */
  readonly endTime: string;
  /** 예약 인원 */
  readonly partySize: number;
  /** 배정 자원(자리) id */
  readonly resourceId: string;
  /** 담당자 id — 미배정이면 '' */
  readonly staffId: string;
  /** 예약금(원) — 0 이상 */
  readonly deposit: number;
  /** 요청사항 — 없으면 '' */
  readonly request: string;
  readonly status: BookingStatus;
  /** 관리자 메모 — 없으면 '' */
  readonly memo: string;
}

/** 쓰기 입력 — id·code 는 어댑터가 배정한다 */
export type ReservationInput = Omit<Reservation, 'id' | 'code'>;

export const RESERVATION_REQUEST_MAX = 500;
export const RESERVATION_MEMO_MAX = 500;
export const PARTY_SIZE_MAX = 100;

/** 자리를 차지하는(유효) 예약만 — 취소·노쇼 제외 */
export function isActive(reservation: Reservation): boolean {
  return occupiesSlot(reservation.status);
}

interface ConflictCandidate {
  readonly id?: string | undefined;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly resourceId: string;
  readonly status: BookingStatus;
}

/**
 * 후보 예약과 더블부킹(같은 자원·같은 날·시간 겹침)인 기존 예약들.
 * 후보 자신(id 일치)과 취소·노쇼(자리 비움)는 제외한다. 후보가 비활성이면 충돌 없음.
 */
export function findConflicts(
  list: readonly Reservation[],
  candidate: ConflictCandidate,
): readonly Reservation[] {
  if (!occupiesSlot(candidate.status)) return [];
  const start = toMinutes(candidate.startTime);
  const end = toMinutes(candidate.endTime);
  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) return [];

  return list.filter((reservation) => {
    if (reservation.id === candidate.id) return false;
    if (!isActive(reservation)) return false;
    if (reservation.resourceId !== candidate.resourceId) return false;
    if (reservation.date !== candidate.date) return false;
    return rangesOverlap(
      start,
      end,
      toMinutes(reservation.startTime),
      toMinutes(reservation.endTime),
    );
  });
}

export function hasConflict(list: readonly Reservation[], candidate: ConflictCandidate): boolean {
  return findConflicts(list, candidate).length > 0;
}

/** 상태 필터('전체'면 전체) */
export function filterReservations(
  list: readonly Reservation[],
  status: BookingStatusFilter,
): readonly Reservation[] {
  if (status === BOOKING_FILTER_ALL) return list;
  return list.filter((reservation) => reservation.status === status);
}

/** 예약번호·고객명·연락처 검색(대소문자 무시) */
export function searchReservations(
  list: readonly Reservation[],
  keyword: string,
): readonly Reservation[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (reservation) =>
      reservation.code.toLowerCase().includes(needle) ||
      reservation.customerName.toLowerCase().includes(needle) ||
      reservation.customerPhone.toLowerCase().includes(needle),
  );
}

/** 방문일시 내림차순(임박·최근이 위). 같은 시각은 id 안정 정렬. */
export function sortReservations(list: readonly Reservation[]): readonly Reservation[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.startTime !== b.startTime) return a.startTime < b.startTime ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/** 특정 날짜의 유효 예약 — reservationsInSlot 이 파일 내부에서 쓴다 */
function reservationsOnDate(list: readonly Reservation[], date: string): readonly Reservation[] {
  return list.filter((reservation) => reservation.date === date && isActive(reservation));
}

/**
 * 특정 날짜·시간슬롯[slotStart, slotEnd)에 걸치는 유효 예약 — 달력 셀이 쓴다.
 * 슬롯 경계는 분 단위로 비교한다.
 */
export function reservationsInSlot(
  list: readonly Reservation[],
  date: string,
  slotStart: number,
  slotEnd: number,
): readonly Reservation[] {
  return reservationsOnDate(list, date).filter((reservation) =>
    rangesOverlap(
      toMinutes(reservation.startTime),
      toMinutes(reservation.endTime),
      slotStart,
      slotEnd,
    ),
  );
}
