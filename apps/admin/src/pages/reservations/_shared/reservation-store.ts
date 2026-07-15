// 예약 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다. 예약 목록·폼과 예약 일정(달력)이
// 같은 어댑터를 읽는다(_shared 라 페이지 간 결합이 아니다).
//   // TODO(backend): GET/POST /api/reservations · GET/PUT/DELETE /api/reservations/:id
import { createCrudAdapter } from '../../../shared/crud';
import { sortReservations } from './reservation';
import type { Reservation, ReservationInput } from './reservation';

const RESERVATION_SEED: readonly Reservation[] = [
  {
    id: 'rsv-1',
    code: 'RSV-20260716-001',
    customerName: '김도현',
    customerPhone: '010-1234-**56',
    date: '2026-07-16',
    startTime: '10:00',
    endTime: '11:00',
    partySize: 3,
    resourceId: 'room-b',
    staffId: 'staff-kim',
    deposit: 30000,
    request: '주차 가능한지 문의드립니다.',
    status: 'confirmed',
    memo: '',
  },
  {
    id: 'rsv-2',
    code: 'RSV-20260716-002',
    customerName: '이서연',
    customerPhone: '010-2345-**67',
    date: '2026-07-16',
    startTime: '14:00',
    endTime: '15:30',
    partySize: 8,
    resourceId: 'room-a',
    staffId: 'staff-lee',
    deposit: 50000,
    request: '',
    status: 'requested',
    memo: '단체 예약 — 확정 전 인원 재확인 필요',
  },
  {
    id: 'rsv-3',
    code: 'RSV-20260717-001',
    customerName: '박민준',
    customerPhone: '010-3456-**78',
    date: '2026-07-17',
    startTime: '11:00',
    endTime: '12:00',
    partySize: 2,
    resourceId: 'room-c',
    staffId: 'staff-park',
    deposit: 0,
    request: '창가 자리 희망',
    status: 'confirmed',
    memo: '',
  },
  {
    id: 'rsv-4',
    code: 'RSV-20260715-001',
    customerName: '최지우',
    customerPhone: '010-4567-**89',
    date: '2026-07-15',
    startTime: '16:00',
    endTime: '17:00',
    partySize: 1,
    resourceId: 'seat-1',
    staffId: '',
    deposit: 10000,
    request: '',
    status: 'visited',
    memo: '방문 완료 · 만족도 높음',
  },
  {
    id: 'rsv-5',
    code: 'RSV-20260714-001',
    customerName: '정하윤',
    customerPhone: '010-5678-**90',
    date: '2026-07-14',
    startTime: '13:00',
    endTime: '14:00',
    partySize: 4,
    resourceId: 'room-b',
    staffId: 'staff-kim',
    deposit: 20000,
    request: '',
    status: 'cancelled',
    memo: '고객 요청으로 취소 · 예약금 환불 완료',
  },
  {
    id: 'rsv-6',
    code: 'RSV-20260718-001',
    customerName: '강태오',
    customerPhone: '010-6789-**01',
    date: '2026-07-18',
    startTime: '10:30',
    endTime: '11:30',
    partySize: 6,
    resourceId: 'room-a',
    staffId: 'staff-lee',
    deposit: 40000,
    request: '노트북 연결용 HDMI 필요',
    status: 'requested',
    memo: '',
  },
];

/** 날짜별 일련번호로 예약번호를 만든다 — 'RSV-YYYYMMDD-NNN' */
function nextCode(input: ReservationInput, existing: readonly Reservation[]): string {
  const compact = input.date.replaceAll('-', '');
  const sameDay = existing.filter((reservation) => reservation.date === input.date).length;
  return `RSV-${compact}-${String(sameDay + 1).padStart(3, '0')}`;
}

let seq = RESERVATION_SEED.length;

export const reservationAdapter = createCrudAdapter<Reservation, ReservationInput>({
  scope: 'reservations',
  seed: RESERVATION_SEED,
  build: (input, existing) => {
    seq += 1;
    return { id: `rsv-${String(seq)}`, code: nextCode(input, existing), ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortReservations,
});
