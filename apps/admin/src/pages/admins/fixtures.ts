// 관리자(운영진) 화면용 더미 저장소
//
// [이 파일의 역할] 백엔드가 없는 동안 화면을 그리기 위한 **표시용 픽스처**다.
// 비즈니스 로직·서버가 아니다. 백엔드가 붙으면 data-source.ts 가 이 파일 대신 실제 HTTP 응답을
// 돌려주게 되고, 이 파일은 삭제된다.
//
// [왜 상수 배열이 아니라 가변 저장소가 됐나] 운영자 등록·수정·삭제 화면이 생겼기 때문이다.
// 화면이 만든 운영자가 목록에 나타나야 하고, 지운 운영자는 상세를 열 수 없어야 한다 —
// 그것을 흉내 내려면 이 모듈이 '지금의 명부' 를 들고 있어야 한다. 형태·규약은 그룹 저장소
// (shared/fixtures/admin-groups.ts)와 같게 맞췄다: 목록은 읽기 전용으로 내보내고, 바꾸는 일은
// 이름 있는 함수로만 한다.
import { findAdminGroup } from '../../shared/fixtures/admin-groups';
import {
  OPERATOR_ROLE_ID,
  SUPER_ADMIN_ROLE_ID,
  VIEWER_ROLE_ID,
} from '../../shared/permissions/roles';
import type { AdminDraft, AdminUser } from './types';

/**
 * 그룹 목록은 **여기 없다** — shared/fixtures/admin-groups.ts 의 정본 저장소가 갖는다.
 * 관리자 관리 화면과 메시지 템플릿 편집기가 같은 목록을 읽어야 하기 때문이다(그 파일 머리말).
 * 이 파일에 남은 것은 운영자(사람) 픽스처뿐이다.
 */
function groupNameOf(id: string): string {
  return findAdminGroup(id)?.name ?? '';
}

/**
 * 운영자 1명을 만든다 — 같은 모양의 객체 리터럴을 5벌 늘어놓지 않기 위한 팩토리다
 * (클린코드 점검 축3 `clone:6a2e6d2266093ff6`: 25·37·49행이 서로의 사본이었다).
 *
 * `group` 라벨은 `groupId` 에서 파생하고, 부서·직급·메모는 **비어 있는 것이 기본**이다
 * (픽스처에 없는 값을 지어내지 않는다 — 채워진 운영자만 department/position 을 넘긴다).
 */
function makeAdmin(admin: {
  readonly id: string;
  readonly nickname: string;
  readonly account: string;
  readonly groupId: string;
  readonly roleId: string;
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
    group: groupNameOf(admin.groupId),
    roleId: admin.roleId,
    joinedAt: admin.joinedAt,
    department: admin.department ?? '',
    position: admin.position ?? '',
    phone: admin.phone,
    memo: '',
  };
}

/**
 * 초기 명부.
 *
 * [역할 배정] id 는 shared/permissions/roles.ts 가 export 하는 기본 역할 3종에서 온다 —
 * 지어내지 않는다. 존재하지 않는 역할 id 를 심으면 상세의 '역할' 이 조용히 '—' 가 된다.
 *
 * [시스템 관리자는 일부러 한 명이다] 마지막 시스템 관리자 보호(guards.ts)는 '한 명 남았을 때'
 * 에만 발현되는 규칙이다. 픽스처가 두 명이면 그 경로는 화면에서 한 번도 보이지 않는다.
 *
 * [A-00001 의 계정이 admin@tds.local 인 이유] 로그인 목업의 시스템 관리자 계정과 **같은 값**이다
 * (pages/login/api.ts). 자기 자신 삭제 금지·자기 권한 박탈 금지는 '로그인한 사람과 이 레코드가
 * 같은 사람인가' 로 판정하는데(guards.ts), 명부의 계정이 전부 example.com 이면 그 가드는 실제
 * 화면에서 절대 걸리지 않는다 — 존재하지만 아무도 볼 수 없는 규칙이 된다.
 */
const SEED: readonly AdminUser[] = [
  makeAdmin({
    id: 'A-00001',
    nickname: '허권',
    account: 'admin@tds.local',
    groupId: 'admin-2',
    roleId: SUPER_ADMIN_ROLE_ID,
    joinedAt: '2024-07-29',
    phone: '010-9235-8367',
  }),
  makeAdmin({
    id: 'A-00002',
    nickname: '이수민',
    account: 'sumin.lee@example.com',
    groupId: 'admin',
    roleId: OPERATOR_ROLE_ID,
    joinedAt: '2024-07-23',
    phone: '010-5619-5539',
  }),
  makeAdmin({
    id: 'A-00003',
    nickname: '박백민',
    account: 'whitepark@example.com',
    groupId: 'admin-2',
    roleId: OPERATOR_ROLE_ID,
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
    roleId: VIEWER_ROLE_ID,
    joinedAt: '2024-06-19',
    phone: '010-3443-3454',
  }),
  makeAdmin({
    id: 'A-00005',
    nickname: '김지권',
    account: 'kimjikwon95@example.com',
    groupId: 'admin',
    roleId: OPERATOR_ROLE_ID,
    joinedAt: '2024-06-05',
    phone: '010-5619-5539',
  }),
];

let admins: readonly AdminUser[] = SEED;
let adminSeq = SEED.length;

/** 지금의 명부 — 목록·집계·가드가 전부 이 함수를 거친다(스냅샷을 붙들지 않는다) */
export function listAdmins(): readonly AdminUser[] {
  return admins;
}

export function findAdmin(id: string): AdminUser | null {
  return admins.find((admin) => admin.id === id) ?? null;
}

/**
 * 같은 계정의 운영자가 이미 있는가 — 대소문자·앞뒤 공백을 무시하고 본다.
 *
 * 계정은 이 사람이 누구인지를 정하는 값이다(세션의 이메일과 맞춰 자기 자신을 찾는다 — guards.ts).
 * 'Admin@…' 과 'admin@…' 이 나란히 있으면 '로그인한 사람' 이 두 레코드에 걸린다.
 *
 * `ignoreId` 는 수정에서 자기 자신을 중복 검사에서 빼기 위한 것이다
 * (validateRoleName 이 같은 이유로 같은 인자를 갖는다).
 */
function hasAdminAccount(account: string, ignoreId: string | null): boolean {
  const normalized = account.trim().toLocaleLowerCase();
  return admins.some(
    (admin) => admin.id !== ignoreId && admin.account.trim().toLocaleLowerCase() === normalized,
  );
}

/** 계정 중복 거절 — 어댑터가 이 오류를 409 대응 문구로 바꾼다 */
export const DUPLICATE_ADMIN_ACCOUNT = '이미 같은 계정의 운영자가 있어요.';

/** 입력의 공백을 털어 저장 형태로 — 앞뒤 공백만 다른 두 레코드를 만들지 않는다 */
function normalize(draft: AdminDraft): AdminDraft {
  return {
    nickname: draft.nickname.trim(),
    account: draft.account.trim(),
    groupId: draft.groupId,
    roleId: draft.roleId,
    department: draft.department.trim(),
    position: draft.position.trim(),
    phone: draft.phone.trim(),
    memo: draft.memo.trim(),
  };
}

export function addAdmin(draft: AdminDraft): AdminUser {
  const input = normalize(draft);
  if (hasAdminAccount(input.account, null)) throw new Error(DUPLICATE_ADMIN_ACCOUNT);

  adminSeq += 1;
  const created: AdminUser = {
    ...input,
    // id 와 가입일은 저장소가 붙인다 — 화면이 만든 값을 믿지 않는다(AdminDraft 주석)
    id: `A-${String(adminSeq).padStart(5, '0')}`,
    group: groupNameOf(input.groupId),
    joinedAt: new Date().toISOString().slice(0, 10),
  };
  admins = [...admins, created];
  return created;
}

export function patchAdmin(id: string, draft: AdminDraft): AdminUser {
  const current = findAdmin(id);
  if (current === null) throw new Error('운영자를 찾을 수 없어요.');

  const input = normalize(draft);
  if (hasAdminAccount(input.account, id)) throw new Error(DUPLICATE_ADMIN_ACCOUNT);

  // 가입일은 수정 대상이 아니다 — 지나간 사실이라 폼이 고칠 값이 아니다
  const updated: AdminUser = {
    ...input,
    id: current.id,
    group: groupNameOf(input.groupId),
    joinedAt: current.joinedAt,
  };
  admins = admins.map((admin) => (admin.id === id ? updated : admin));
  return updated;
}

export function removeAdmin(id: string): void {
  admins = admins.filter((admin) => admin.id !== id);
}
