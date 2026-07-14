// 관리자(운영진) 화면용 더미 데이터 (A40 소유)
//
// [이 파일의 역할] 백엔드가 없는 동안 화면을 그리기 위한 **표시용 픽스처**다.
// 비즈니스 로직·저장소가 아니다. 백엔드가 붙으면 data-source.ts 가 이 파일 대신
// 실제 HTTP 응답을 돌려주게 되고, 이 파일은 삭제된다.
import type { MemberDetail } from '../../shared/domain/member';
import type { AdminGroup, AdminUser } from './types';

/**
 * 운영진 그룹 — 관리자가 만들 수 없다(요구사항). 조회/필터 대상일 뿐이다.
 * 좌측 패널은 '운영 - {label}' 로, 표는 label 을 그대로 보여준다.
 */
export const ADMIN_GROUPS: readonly AdminGroup[] = [
  { id: 'admin', label: '운영팀 admin' },
  { id: 'admin-2', label: '운영팀 admin_2' },
];

function groupLabelOf(id: string): string {
  return ADMIN_GROUPS.find((group) => group.id === id)?.label ?? '';
}

/**
 * 운영자 1명을 만든다 — 같은 모양의 객체 리터럴을 5벌 늘어놓지 않기 위한 팩토리다
 * (A83 축3 `clone:6a2e6d2266093ff6`: 25·37·49행이 서로의 사본이었다).
 *
 * `group` 라벨은 `groupId` 에서 파생하고, 부서·직급·메모는 **비어 있는 것이 기본**이다
 * (픽스처에 없는 값을 지어내지 않는다 — 채워진 운영자만 department/position 을 넘긴다).
 */
function makeAdmin(admin: {
  readonly id: string;
  readonly nickname: string;
  readonly account: string;
  readonly groupId: string;
  readonly joinedAt: string;
  readonly phone: string;
  readonly department?: string;
  readonly position?: string;
}): AdminUser {
  return {
    id: admin.id,
    nickname: admin.nickname,
    account: admin.account,
    groupId: admin.groupId,
    group: groupLabelOf(admin.groupId),
    joinedAt: admin.joinedAt,
    department: admin.department ?? '',
    position: admin.position ?? '',
    phone: admin.phone,
    memo: '',
  };
}

/** 목록 화면이 소비하는 운영자 픽스처 (부서·직급은 비어 있을 수 있다) */
export const ADMINS: readonly AdminUser[] = [
  makeAdmin({
    id: 'A-00001',
    nickname: '허권',
    account: 'hikwon@example.com',
    groupId: 'admin-2',
    joinedAt: '2024-07-29',
    phone: '010-9235-8367',
  }),
  makeAdmin({
    id: 'A-00002',
    nickname: '이수민',
    account: 'sumin.lee@example.com',
    groupId: 'admin',
    joinedAt: '2024-07-23',
    phone: '010-5619-5539',
  }),
  makeAdmin({
    id: 'A-00003',
    nickname: '박백민',
    account: 'whitepark@example.com',
    groupId: 'admin-2',
    joinedAt: '2024-06-26',
    department: '운영본부',
    position: '이사',
    phone: '010-7173-7804',
  }),
  makeAdmin({
    id: 'A-00004',
    nickname: '김계환',
    account: 'clon0306@example.com',
    groupId: 'admin',
    joinedAt: '2024-06-19',
    phone: '010-3443-3454',
  }),
  makeAdmin({
    id: 'A-00005',
    nickname: '김지권',
    account: 'kimjikwon95@example.com',
    groupId: 'admin',
    joinedAt: '2024-06-05',
    phone: '010-5619-5539',
  }),
];

/**
 * 운영자 1명 → 회원 상세와 **같은 MemberDetail** 로 변환한다.
 * 상세 화면(MemberDetailPage)을 그대로 재사용하기 위한 어댑터다.
 *
 * [지어내지 않는다] 픽스처에 없는 값(동의 이력·적립금·쿠폰·로그인 이력·주소 등)은
 * 빈 값/0 으로 둔다. 부서·직급 같은 운영자 전용 필드는 이번 상세 범위 밖이라 싣지 않는다.
 */
export function buildAdminDetail(admin: AdminUser): MemberDetail {
  return {
    id: admin.id,
    nickname: admin.nickname,

    referralCode: '',
    // MemberDetail 의 필수 필드 — 운영자에게 회원 등급 개념은 없다. 기본값으로만 채운다.
    tier: 'normal',
    account: admin.account,
    name: admin.nickname,
    phone: admin.phone,
    country: '',
    address: '',
    addressDetail: '',
    birthday: '',
    socialLogin: '',
    referrer: '',

    consents: [],

    // 픽스처에는 날짜만 있다 — 시각은 알 수 없으므로 자정으로 둔다
    joinedAtIso: `${admin.joinedAt}T00:00:00`,
    lastLoginAtIso: '',
    loginCount: 0,
    lastLoginIp: '',
    activity: { posts: 0, comments: 0, reviews: 0, inquiries: 0 },

    points: 0,
    pointHistory: [],

    coupons: [],

    memo: admin.memo,
  };
}
