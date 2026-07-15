// 예약 자원·담당자 카탈로그 (A41 소유 — apps/admin/src/pages/reservations/**)
//
// [왜 공통인가] 예약(자원배정·담당)·상담 예약(담당)·예약 일정(자원별 가용량)이 같은 자원/담당자
// 목록을 참조한다. 한 곳(여기)에서만 정의하고 셋이 함께 읽는다 — 목록이 어긋나지 않도록.
//
// [백엔드 연동 지점] 실제로는 자원·담당자 마스터를 조회한다.
//   // TODO(backend): GET /api/reservations/resources · GET /api/reservations/staff
//
// [확장] kind 를 늘리면(장비·차량 등) 자원 유형이 열린다. capacity(정원)는 자원마다 다르다.

type ResourceKind = 'room' | 'seat';

interface ReservationResource {
  readonly id: string;
  readonly name: string;
  readonly kind: ResourceKind;
  /** 정원(동시 수용 인원) — 예약 인원 상한 판정에 쓴다 */
  readonly capacity: number;
}

interface ReservationStaff {
  readonly id: string;
  readonly name: string;
  /** 담당 역할(상담사·디자이너 등) — 표시용 */
  readonly role: string;
}

/** 자원(공간/좌석) 마스터 — 예약이 자리를 배정받는다 */
const RESOURCES: readonly ReservationResource[] = [
  { id: 'room-a', name: '세미나룸 A', kind: 'room', capacity: 12 },
  { id: 'room-b', name: '상담룸 B', kind: 'room', capacity: 4 },
  { id: 'room-c', name: '상담룸 C', kind: 'room', capacity: 2 },
  { id: 'seat-1', name: '오픈석 1', kind: 'seat', capacity: 1 },
];

/** 담당자 마스터 — 예약·상담 예약이 배정한다 */
const STAFF: readonly ReservationStaff[] = [
  { id: 'staff-kim', name: '김상담', role: '수석 상담사' },
  { id: 'staff-lee', name: '이응대', role: '상담사' },
  { id: 'staff-park', name: '박컨설', role: '컨설턴트' },
];

export function listResources(): readonly ReservationResource[] {
  return RESOURCES;
}

export function listStaff(): readonly ReservationStaff[] {
  return STAFF;
}

export function findResource(id: string): ReservationResource | undefined {
  return RESOURCES.find((resource) => resource.id === id);
}

export function resourceName(id: string): string {
  return findResource(id)?.name ?? '미배정';
}

/** 자원 정원 — 알 수 없는 자원은 0(상한 없음으로 취급하지 않도록 호출부가 판단) */
export function resourceCapacity(id: string): number {
  return findResource(id)?.capacity ?? 0;
}

export function staffName(id: string): string {
  return STAFF.find((member) => member.id === id)?.name ?? '미배정';
}
