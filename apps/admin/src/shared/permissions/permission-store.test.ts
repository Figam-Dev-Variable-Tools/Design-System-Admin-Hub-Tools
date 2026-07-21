// 역할 삭제 가드 — 배정된 역할은 지워지지 않는다
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 역할 삭제는 이 앱에서 **가장 넓게 번지는 삭제**다. 지우는 순간 그 역할을 든 운영자의 roleId 가
// 존재하지 않는 id 를 가리키고(고아 참조), 상세 화면의 '역할' 은 조용히 '—' 가 된다. 누가 무슨
// 권한이었는지는 어디에도 남지 않으므로 복구는 기억에 의존한다. 카테고리(상품·고객센터)는 이미
// 사용 중이면 삭제를 막고 있었는데 정작 이쪽만 무방비였다.
//
// [왜 스토어 테스트인가 — 화면 테스트로는 부족하다]
// 화면(RolePanel)은 버튼을 잠그지만 그것은 **안내**다. 확인과 실제 삭제 사이에 다른 탭에서 운영자가
// 이 역할로 옮겨질 수 있으므로 거절의 책임은 저장소가 진다(admin-group 삭제 가드와 같은 분담).
// 그 책임을 여기서 못 박는다.
//
// [배정 인원을 어떻게 아는가] 권한 층은 운영자 명부를 모른다(모르는 채로 남아야 한다 —
// shared/permissions → pages/admins 결합 금지). 조회기를 주입받고, 제품에서는 src/wiring.ts 가
// 꽂는다. 테스트도 같은 이음매로 사실을 꽂는다.
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from './feature-registry';
import {
  registerRoleAssigneeCountLookup,
  usePermissionStore,
  roleAssigneeCountOf,
} from './permission-store';
import { createMatrix } from './resources';
import { createSuperAdminRole, ROLE_STATE_VERSION } from './roles';
import type { Role } from './roles';

/** 권한 내용은 이 테스트의 관심사가 아니다 — 전 권한 OFF 의 평범한 역할 하나 */
function makeRole(id: string, name: string): Role {
  return {
    id,
    name,
    system: false,
    scope: 'all',
    permissions: createMatrix(false),
    widgets: createWidgets(false),
  };
}

/** 저장값(localStorage)이 아니라 스토어 상태를 직접 세운다 — 판정만 시험한다 */
function seedRoles(roles: readonly Role[], activeRoleId: string): void {
  usePermissionStore.setState({
    roleState: { version: ROLE_STATE_VERSION, roles, activeRoleId },
    requestedRoleId: null,
  });
}

const SUPER = createSuperAdminRole();
const OPS = makeRole('role-ops', '운영자');
const VIEWER = makeRole('role-viewer', '뷰어');

function roleIds(): readonly string[] {
  return usePermissionStore.getState().roleState.roles.map((role) => role.id);
}

beforeEach(() => {
  window.localStorage.clear();
  seedRoles([SUPER, OPS, VIEWER], OPS.id);
});

describe('deleteRole — 배정된 운영자 확인', () => {
  it('이 역할을 쓰는 운영자가 있으면 삭제하지 않는다 (인원수를 말한다)', () => {
    // '운영자' 역할을 든 사람이 2명이라고 알려 준다 — 제품에서는 wiring.ts 가 명부를 센다
    registerRoleAssigneeCountLookup((id) => (id === OPS.id ? 2 : 0));

    const result = usePermissionStore.getState().deleteRole(OPS.id);

    expect(result.ok).toBe(false);
    // 실패 이유는 숫자를 포함해야 한다 — '삭제할 수 없습니다' 만으로는 다음에 할 일을 알 수 없다
    expect(result.ok === false ? result.error : '').toContain('2명');
    // 그리고 역할은 그대로 남아 있다 (거절이 곧 보존이다)
    expect(roleIds()).toContain(OPS.id);
  });

  it('배정된 운영자가 0명이면 삭제된다', () => {
    registerRoleAssigneeCountLookup(() => 0);

    const result = usePermissionStore.getState().deleteRole(OPS.id);

    expect(result.ok).toBe(true);
    expect(roleIds()).not.toContain(OPS.id);
    // 적용 중이던 역할을 지웠으므로 남은 첫 역할이 대신 적용된다 (권한 없는 상태로 남지 않게)
    expect(usePermissionStore.getState().roleState.activeRoleId).toBe(SUPER.id);
  });

  it('다른 역할의 배정 인원은 이 역할의 삭제를 막지 않는다', () => {
    registerRoleAssigneeCountLookup((id) => (id === VIEWER.id ? 5 : 0));

    expect(usePermissionStore.getState().deleteRole(OPS.id).ok).toBe(true);
    expect(roleIds()).toEqual([SUPER.id, VIEWER.id]);
  });

  it('조회기가 배선되지 않았으면 삭제를 거절한다 (fail-closed — 모르는 것과 없는 것은 다르다)', async () => {
    // 조회기는 모듈 전역이라 '등록 이전' 을 되돌리려면 모듈을 새로 들여와야 한다.
    // (제품에서 이 상태는 wiring.ts 를 부르지 않은 경로다 — 그때 삭제가 통과하면 안 된다.)
    vi.resetModules();
    const fresh = await import('./permission-store');

    expect(fresh.roleAssigneeCountOf(OPS.id)).toBeNull();

    fresh.usePermissionStore.setState({
      roleState: { version: ROLE_STATE_VERSION, roles: [SUPER, OPS, VIEWER], activeRoleId: OPS.id },
      requestedRoleId: null,
    });

    const result = fresh.usePermissionStore.getState().deleteRole(OPS.id);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('확인하지 못해');
    expect(fresh.usePermissionStore.getState().roleState.roles.map((role) => role.id)).toContain(
      OPS.id,
    );
  });

  it('조회기는 등록되면 그 답을 그대로 돌려준다 (이음매 자체의 계약)', () => {
    registerRoleAssigneeCountLookup((id) => (id === OPS.id ? 3 : 0));
    expect(roleAssigneeCountOf(OPS.id)).toBe(3);
    expect(roleAssigneeCountOf(VIEWER.id)).toBe(0);
  });
});

describe('deleteRole — 기존 규칙은 그대로다', () => {
  beforeEach(() => {
    // 배정 인원 때문에 막히는 것이 아님을 분명히 한다 — 전부 0명으로 둔다
    registerRoleAssigneeCountLookup(() => 0);
  });

  it('시스템 역할은 삭제할 수 없다', () => {
    const result = usePermissionStore.getState().deleteRole(SUPER.id);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toBe('시스템 역할은 삭제할 수 없습니다.');
    expect(roleIds()).toContain(SUPER.id);
  });

  it('마지막 역할은 삭제할 수 없다', () => {
    seedRoles([OPS], OPS.id);

    const result = usePermissionStore.getState().deleteRole(OPS.id);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toBe('마지막 역할은 삭제할 수 없습니다.');
    expect(roleIds()).toEqual([OPS.id]);
  });

  it('없는 역할은 삭제할 수 없다', () => {
    const result = usePermissionStore.getState().deleteRole('role-does-not-exist');

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toBe('역할을 찾을 수 없습니다.');
  });
});
