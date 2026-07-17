// 예약 상태 흐름 공용 규칙
//
// [왜 공통인가] 국내 예약 솔루션(네이버 예약·캐치테이블·똑닥)의 예약 상태는 도메인이 달라도 같은
// 골격을 쓴다: 요청 → 확정 → 완료, 그리고 이탈(취소·노쇼). 예약(방문)과 상담 예약이 이 흐름을
// 공유하므로 상태·라벨·톤·전이 규칙을 한 곳에 둔다(라벨의 '완료'만 도메인별로 다르다).
//
// [상태전이 규칙] 요청↦확정/취소 · 확정↦방문완료/노쇼/취소 · 방문완료·노쇼·취소는 종료(전이 없음).
//   되돌리기(확정→요청 등)는 막는다 — 감사 성격상 상태는 앞으로만 나아간다.
import type { StatusTone } from '../../../shared/ui';

export type BookingStatus = 'requested' | 'confirmed' | 'visited' | 'noshow' | 'cancelled';

/** 타입가드의 단일 원천(파일 내부 전용) */
const BOOKING_STATUSES = ['requested', 'confirmed', 'visited', 'noshow', 'cancelled'] as const;

/** select 값(문자열)을 BookingStatus 로 안전하게 좁힌다(as 캐스팅 대신) */
export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === 'string' && (BOOKING_STATUSES as readonly string[]).includes(value);
}

interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

/** '완료' 는 도메인마다 다르다(방문완료/상담완료) — completedLabel 로 주입한다 */
const STATUS_META: Record<BookingStatus, StatusMeta> = {
  requested: { label: '요청', tone: 'warning' },
  confirmed: { label: '확정', tone: 'info' },
  visited: { label: '완료', tone: 'success' },
  noshow: { label: '노쇼', tone: 'danger' },
  cancelled: { label: '취소', tone: 'neutral' },
};

export function bookingStatusLabel(status: BookingStatus, completedLabel = '완료'): string {
  return status === 'visited' ? completedLabel : STATUS_META[status].label;
}

export function bookingStatusTone(status: BookingStatus): StatusTone {
  return STATUS_META[status].tone;
}

/** 상태별 허용 전이(자기 자신 제외) — 되돌리기·종료 상태에서의 전이는 없다 */
const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['visited', 'noshow', 'cancelled'],
  visited: [],
  noshow: [],
  cancelled: [],
};

export function nextStatuses(from: BookingStatus): readonly BookingStatus[] {
  return TRANSITIONS[from];
}

/** from→to 전이가 허용되는가(자기 자신은 항상 허용 — 저장 시 상태 미변경) */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** select 에 그릴 상태 후보 — 현재 상태 + 허용 전이 */
export function statusChoices(from: BookingStatus): readonly BookingStatus[] {
  return [from, ...TRANSITIONS[from]];
}

/** 종료(전이 불가) 상태 — 방문완료·노쇼·취소 */
export function isTerminalStatus(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** 예약을 자리(정원)에서 차지하는 상태만 유효로 본다 — 취소·노쇼는 자리를 비운다 */
export function occupiesSlot(status: BookingStatus): boolean {
  return status === 'requested' || status === 'confirmed' || status === 'visited';
}

export const BOOKING_FILTER_ALL = 'all';
export type BookingStatusFilter = typeof BOOKING_FILTER_ALL | BookingStatus;

interface BookingStatusOption {
  readonly id: BookingStatus;
  readonly label: string;
}

/** 필터·폼 select 공용 옵션 — 완료 라벨을 도메인이 정한다 */
export function bookingStatusOptions(completedLabel = '완료'): readonly BookingStatusOption[] {
  return BOOKING_STATUSES.map((id) => ({ id, label: bookingStatusLabel(id, completedLabel) }));
}
