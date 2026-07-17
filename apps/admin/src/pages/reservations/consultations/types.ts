// 상담 예약 도메인 타입 · 순수 규칙 · 뷰 헬퍼
//
// 국내 관례를 따른다: 상담 유형(방문/전화/화상)·희망일시·담당 배정·상태(요청→확정→상담완료/노쇼/취소).
// 예약(방문)과 같은 상태 흐름을 쓰되 '완료'는 '상담완료'로 표기한다(_shared/booking 공유).
import type { BookingStatus, BookingStatusFilter } from '../_shared/booking';
import { BOOKING_FILTER_ALL } from '../_shared/booking';
import { toMinutes } from '../_shared/calendar';

type ConsultChannel = 'visit' | 'phone' | 'video';

const CONSULT_CHANNELS = ['visit', 'phone', 'video'] as const;

export function isConsultChannel(value: unknown): value is ConsultChannel {
  return typeof value === 'string' && (CONSULT_CHANNELS as readonly string[]).includes(value);
}

export interface ConsultBooking {
  readonly id: string;
  /** 상담예약번호 — 'CSB-YYYYMMDD-NNN' */
  readonly code: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly channel: ConsultChannel;
  /** 상담 주제/분야 */
  readonly topic: string;
  /** 희망 날짜 'YYYY-MM-DD' */
  readonly preferredDate: string;
  /** 희망 시각 'HH:mm' */
  readonly preferredTime: string;
  /** 담당자 id — 미배정이면 '' */
  readonly staffId: string;
  readonly status: BookingStatus;
  /** 상담 메모 — 없으면 '' */
  readonly note: string;
}

export type ConsultBookingInput = Omit<ConsultBooking, 'id' | 'code'>;

export const CONSULT_BOOKING_TOPIC_MAX = 80;
export const CONSULT_BOOKING_NOTE_MAX = 500;

export const CHANNEL_COMPLETED_LABEL = '상담완료';

interface Option<T extends string> {
  readonly id: T;
  readonly label: string;
}

export const CONSULT_CHANNEL_OPTIONS: readonly Option<ConsultChannel>[] = [
  { id: 'visit', label: '방문상담' },
  { id: 'phone', label: '전화상담' },
  { id: 'video', label: '화상상담' },
];

export function consultChannelLabel(channel: ConsultChannel): string {
  return CONSULT_CHANNEL_OPTIONS.find((option) => option.id === channel)?.label ?? channel;
}

export function filterConsultBookings(
  list: readonly ConsultBooking[],
  status: BookingStatusFilter,
): readonly ConsultBooking[] {
  if (status === BOOKING_FILTER_ALL) return list;
  return list.filter((booking) => booking.status === status);
}

export function searchConsultBookings(
  list: readonly ConsultBooking[],
  keyword: string,
): readonly ConsultBooking[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter(
    (booking) =>
      booking.code.toLowerCase().includes(needle) ||
      booking.customerName.toLowerCase().includes(needle) ||
      booking.topic.toLowerCase().includes(needle),
  );
}

/** 희망일시 오름차순(임박한 것이 위). 같은 시각은 id 안정 정렬. */
export function sortConsultBookings(list: readonly ConsultBooking[]): readonly ConsultBooking[] {
  return [...list].sort((a, b) => {
    if (a.preferredDate !== b.preferredDate) return a.preferredDate < b.preferredDate ? -1 : 1;
    const at = toMinutes(a.preferredTime);
    const bt = toMinutes(b.preferredTime);
    if (at !== bt) return at < bt ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
