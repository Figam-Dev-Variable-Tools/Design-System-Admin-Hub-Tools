// 상담 예약 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// [백엔드 연동 지점] 프레임워크 createCrudAdapter 에 시드를 넣는다.
//   // TODO(backend): GET/POST /api/reservations/consultations · GET/PUT/DELETE /api/reservations/consultations/:id
import { createCrudAdapter } from '../../../shared/crud';
import { sortConsultBookings } from './types';
import type { ConsultBooking, ConsultBookingInput } from './types';

const CONSULT_BOOKING_SEED: readonly ConsultBooking[] = [
  {
    id: 'csb-1',
    code: 'CSB-20260717-001',
    customerName: '윤아름',
    customerPhone: '010-7777-**88',
    channel: 'visit',
    topic: '인테리어 리모델링 상담',
    preferredDate: '2026-07-17',
    preferredTime: '15:00',
    staffId: 'staff-park',
    status: 'confirmed',
    note: '방문 상담 확정 · 도면 지참 요청',
  },
  {
    id: 'csb-2',
    code: 'CSB-20260718-002',
    customerName: '조현우',
    customerPhone: '010-8888-**99',
    channel: 'video',
    topic: 'ERP 도입 컨설팅',
    preferredDate: '2026-07-18',
    preferredTime: '10:00',
    staffId: '',
    status: 'requested',
    note: '',
  },
  {
    id: 'csb-3',
    code: 'CSB-20260716-001',
    customerName: '배수지',
    customerPhone: '010-9999-**00',
    channel: 'phone',
    topic: '요금제 문의',
    preferredDate: '2026-07-16',
    preferredTime: '13:30',
    staffId: 'staff-lee',
    status: 'visited',
    note: '전화 상담 완료 · 견적 발송 예정',
  },
  {
    id: 'csb-4',
    code: 'CSB-20260715-001',
    customerName: '남도일',
    customerPhone: '010-1111-**22',
    channel: 'visit',
    topic: '매장 창업 상담',
    preferredDate: '2026-07-15',
    preferredTime: '11:00',
    staffId: 'staff-kim',
    status: 'cancelled',
    note: '고객 개인 사정으로 취소',
  },
];

let seq = CONSULT_BOOKING_SEED.length;

function nextCode(input: ConsultBookingInput, existing: readonly ConsultBooking[]): string {
  const compact = input.preferredDate.replaceAll('-', '');
  const sameDay = existing.filter(
    (booking) => booking.preferredDate === input.preferredDate,
  ).length;
  return `CSB-${compact}-${String(sameDay + 1).padStart(3, '0')}`;
}

export const consultBookingAdapter = createCrudAdapter<ConsultBooking, ConsultBookingInput>({
  scope: 'reservation-consultations',
  seed: CONSULT_BOOKING_SEED,
  build: (input, existing) => {
    seq += 1;
    return { id: `csb-${String(seq)}`, code: nextCode(input, existing), ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortConsultBookings,
});
