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
import { createMatrix, createReadOnlyMatrix, isActionOn } from './resources';
import { createSuperAdminRole, createViewerMatrix, ROLE_STATE_VERSION } from './roles';
import type { Role } from './roles';
import { ROLE_ADMIN_PATH, resourceIdForPath } from './route-resource';

/**
 * 평범한(시스템 아님) 역할 하나.
 *
 * [기본이 '전 권한 ON' 인 이유] 저장소가 이제 **자기 자신의 편집도 게이팅한다**(roleAdminBlock) —
 * 적용 중인 역할이 `/users/roles` 의 등록·수정·삭제를 갖고 있어야 편집이 통과한다. 예전처럼
 * 전 권한 OFF 로 두면 아래 삭제 가드 테스트들이 **의도한 이유(배정 인원)가 아니라 권한 때문에**
 * 실패하며, 그러면 지키려던 사실을 더는 지키지 않는다. 권한 축을 시험하는 곳은 권한을 명시한다.
 */
function makeRole(id: string, name: string, granted = true): Role {
  return {
    id,
    name,
    system: false,
    scope: 'all',
    permissions: createMatrix(granted),
    widgets: createWidgets(granted),
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
    expect(result.ok === false ? result.error : '').toBe('시스템 역할은 삭제할 수 없어요.');
    expect(roleIds()).toContain(SUPER.id);
  });

  it('마지막 역할은 삭제할 수 없다', () => {
    seedRoles([OPS], OPS.id);

    const result = usePermissionStore.getState().deleteRole(OPS.id);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toBe('마지막 역할은 삭제할 수 없어요.');
    expect(roleIds()).toEqual([OPS.id]);
  });

  it('없는 역할은 삭제할 수 없다', () => {
    const result = usePermissionStore.getState().deleteRole('role-does-not-exist');

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toBe('역할을 찾을 수 없어요.');
  });
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 권한 상승 차단 — 조회 권한만 있는 세션은 권한 모델을 바꿀 수 없다
 *
 * [무엇을 지키나] 권한 관리 화면(`/users/roles`)은 권한 모델 **자신을** 편집한다. 여기가 열려
 * 있으면 조회 권한만 받은 사람이 역할을 만들어 자기 역할에 등록·수정·삭제를 얹을 수 있고, 그
 * 순간 앱의 다른 모든 게이팅이 무의미해진다.
 *
 * [왜 저장소에서 단언하는가] 화면은 버튼을 없앤다(RolePanel.test.tsx). 그러나 버튼만 감추고
 * 저장 경로가 열려 있으면 막은 것이 아니다 — 다른 탭에서 방금 강등된 세션의 잔여 클릭·위조된
 * 저장값은 화면을 지나지 않는다. 두 술어가 **같은 리소스**를 읽는다는 사실은 아래 첫 단언과
 * route-resource.test.ts 가 함께 고정한다.
 *
 * [기본 세션이 전권이라 헛돌기 쉽다] 그래서 여기서는 매번 **읽기 전용 역할을 적용 중으로 세운다**.
 * 반대 방향(권한이 있으면 통과한다) 단언을 같은 자리에 두어, 이 단언들이 '아무나 못 한다' 가
 * 아니라 '권한이 없는 사람만 못 한다' 를 지키게 한다.
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * 전 리소스 조회만 — **권한 관리 read 를 손으로 켠** 조회 전용 세션.
 *
 * [배포되는 '뷰어' 와는 이제 다르다] 앱이 배포하는 뷰어 역할은 `/users/roles` read 가 빠져(패키징
 * 결정 — roles.ts 의 createViewerMatrix) 그 화면에 닿지 못한다. 여기 READER 는 createReadOnlyMatrix
 * 그대로라 **그 read 를 여전히 가진** 세션이다 — 곧, 누군가 권한 관리 read 를 손으로 켰거나 옛
 * 저장값에서 넘어온 조회 전용 세션. 이 매트릭스로 시험하는 것은 "화면에 닿더라도 쓰기는 막힌다"
 * (권한 상승 차단)와 "그럼에도 신원 전환은 통과한다"(fail-closed 가 아니라 패키징이라는 사실)이다.
 */
const READER: Role = {
  id: 'role-reader',
  name: '조회 전용',
  system: false,
  scope: 'own',
  permissions: createReadOnlyMatrix(),
  widgets: createWidgets(true),
};

/** '적용 중인 역할' 이 곧 행위자다 — 유효 권한을 내는 것은 activeRoleId 하나뿐이다 */
function actAsReader(): void {
  seedRoles([SUPER, OPS, READER], READER.id);
}

function selectedMatrixOf(roleId: string) {
  const role = usePermissionStore.getState().roleState.roles.find((item) => item.id === roleId);
  if (role === undefined) throw new Error(`역할 ${roleId} 이 사라졌어요.`);
  return role.permissions;
}

describe('권한 관리 화면 자신의 쓰기 게이팅', () => {
  beforeEach(() => {
    // 배정 인원 때문에 막히는 것이 아님을 분명히 한다 — 권한 축만 남긴다
    registerRoleAssigneeCountLookup(() => 0);
  });

  it('화면이 묻는 리소스와 저장소가 묻는 리소스는 같은 하나다', () => {
    // 화면은 useRouteWritePermissions() → resourceIdForPath(location.pathname) 로 답을 얻는다.
    // 저장소도 같은 함수에 같은 경로를 넣는다. 여기서 갈라지면 버튼과 저장이 다른 것을 본다.
    expect(resourceIdForPath(ROLE_ADMIN_PATH)).not.toBeNull();
    expect(resourceIdForPath('/users/roles')).toBe(resourceIdForPath(ROLE_ADMIN_PATH));
  });

  it('조회 전용 역할은 역할을 만들 수 없다 (사유 문자열을 돌려준다)', () => {
    actAsReader();

    const result = usePermissionStore.getState().createRole('내가 만든 역할');

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('등록 권한이 없어');
    expect(roleIds()).toEqual([SUPER.id, OPS.id, READER.id]);
  });

  it('조회 전용 역할은 역할명을 바꿀 수 없다', () => {
    actAsReader();

    const result = usePermissionStore.getState().renameRole(OPS.id, '바뀐 이름');

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('수정 권한이 없어');
    expect(
      usePermissionStore.getState().roleState.roles.find((role) => role.id === OPS.id)?.name,
    ).toBe(OPS.name);
  });

  it('조회 전용 역할은 역할을 지울 수 없다', () => {
    actAsReader();

    const result = usePermissionStore.getState().deleteRole(OPS.id);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('삭제 권한이 없어');
    expect(roleIds()).toContain(OPS.id);
  });

  it('조회 전용 역할은 자기 매트릭스에 쓰기 권한을 얹을 수 없다 (권한 상승)', () => {
    actAsReader();
    const target = resourceIdForPath(ROLE_ADMIN_PATH) ?? '';
    usePermissionStore.getState().selectRole(READER.id);

    usePermissionStore.getState().setResourceAction(target, 'update', true);

    expect(isActionOn(selectedMatrixOf(READER.id), target, 'update')).toBe(false);
  });

  it('열 전체선택·전체 켜기 같은 우회로도 같은 판정을 지난다', () => {
    actAsReader();
    const target = resourceIdForPath(ROLE_ADMIN_PATH) ?? '';
    usePermissionStore.getState().selectRole(READER.id);

    usePermissionStore.getState().setActionForAll('update', true);
    usePermissionStore.getState().setAllPermissions(true);

    expect(isActionOn(selectedMatrixOf(READER.id), target, 'update')).toBe(false);
    expect(isActionOn(selectedMatrixOf(READER.id), target, 'remove')).toBe(false);
  });

  it('위젯과 데이터 접근 범위도 잠긴다 — 같은 통로를 지나기 때문이다', () => {
    actAsReader();
    usePermissionStore.getState().selectRole(READER.id);

    usePermissionStore.getState().setAllWidgets(false);
    usePermissionStore.getState().setScope('all');

    const reader = usePermissionStore.getState().roleState.roles.find((r) => r.id === READER.id);
    expect(reader?.scope).toBe('own');
    expect(reader?.widgets).toEqual(READER.widgets);
  });

  /**
   * 반대 방향 — 이것이 없으면 '전부 막아 버렸다' 로도 위 단언들이 통과한다.
   * 즉 위 여섯 건이 헛돌지 않는다는 것을 같은 파일 안에서 보장한다.
   */
  it('권한이 있는 역할은 그대로 편집할 수 있다', () => {
    seedRoles([SUPER, OPS, READER], OPS.id);
    const target = resourceIdForPath(ROLE_ADMIN_PATH) ?? '';
    usePermissionStore.getState().selectRole(READER.id);

    expect(usePermissionStore.getState().createRole('새 역할').ok).toBe(true);
    expect(usePermissionStore.getState().renameRole(READER.id, '조회 전용2').ok).toBe(true);

    usePermissionStore.getState().selectRole(READER.id);
    usePermissionStore.getState().setResourceAction(target, 'update', true);
    expect(isActionOn(selectedMatrixOf(READER.id), target, 'update')).toBe(true);
  });

  /**
   * 신원 전환(activateRole)은 일부러 게이팅하지 않는다 — permission-store.ts 의 머리말 참고.
   * 자기 권한으로 자기 신원을 잠그면 update 를 잃은 역할에서 영영 빠져나올 수 없다(영구 잠금).
   * 이 단언은 그 결정을 **의도**로 못 박는다: 나중에 누가 무심코 막으면 여기서 걸린다.
   *
   * [2차 검토에서도 유지] '개발 빌드에서만 보이게' 하는 안을 함께 검토했고, 역할 축에는 플랜
   * 축의 receivePlan 같은 대체 통로가 없어(= 끄면 활성 역할을 바꿀 방법이 하나도 없어) 택하지
   * 않았다. 근거 전문은 permission-store.ts 의 '재검토' 문단에 있다.
   */
  it('역할 적용(신원 전환)은 권한과 무관하게 통과한다 — 영구 잠금을 만들지 않는다', () => {
    actAsReader();

    usePermissionStore.getState().activateRole(OPS.id);

    expect(usePermissionStore.getState().roleState.activeRoleId).toBe(OPS.id);
  });

  /**
   * [뒤집힌 단언 — 패키징 결정이 내려졌다] 예전에는 "조회 전용 역할도 슈퍼어드민을 적용할 수 있다"
   * 였다. 그 완화(운영자 확정)를 지금 했다 — roles.ts 의 createViewerMatrix 가 배포되는 뷰어 역할에서
   * `/users/roles` read 를 뺀다. 그래서 배포본 뷰어는 그 화면에 닿지 못한다(사이드바에서 사라지고,
   * 주소로 들어와도 403). 버튼에 이르는 길이 사라지므로 신원 전환 버튼은 그대로 둔 채(영구 잠금
   * 방지) 권한 상승 경로가 닫힌다.
   */
  it('배포되는 뷰어 역할은 권한 관리 read 가 없어 그 화면에 닿지 못한다', () => {
    const roleAdmin = resourceIdForPath(ROLE_ADMIN_PATH) ?? '';
    // 정본(createReadOnlyMatrix)은 이 화면 read 를 갖는다 — 그것이 예전 위험의 전제였다
    expect(isActionOn(createReadOnlyMatrix(), roleAdmin, 'read')).toBe(true);
    // 배포본 뷰어는 딱 이 리소스의 read 만 꺼진다 → 사이드바·라우트 가드가 화면을 막는다
    expect(isActionOn(createViewerMatrix(), roleAdmin, 'read')).toBe(false);
    // 같은 그룹의 이웃(관리자 관리) 조회는 그대로다 — 뷰어가 나머지 화면·그룹을 잃지 않는다
    const sibling = resourceIdForPath('/users/admins') ?? '';
    expect(sibling).not.toBe('');
    expect(isActionOn(createViewerMatrix(), sibling, 'read')).toBe(true);
  });

  /**
   * [남는 위험은 여전히 증언된다] 완화는 코드(fail-closed)가 아니라 **패키징**이다. 그 증거를 여기
   * 남긴다: 권한 관리 read 를 손으로 켠(또는 옛 저장값에서 넘어온) 조회 전용 세션이면 — 즉 화면에
   * 닿을 수만 있으면 — 저장소는 여전히 슈퍼어드민 적용을 통과시킨다. activateRole 을 게이팅하지
   * 않는 결정(위 '영구 잠금' 단언)이 남긴 대가다. 배포본에서 이 경로가 닫힌 것은 read 를 뺐기
   * 때문일 뿐, 저장소가 막아서가 아니다.
   */
  it('권한 관리 read 를 손으로 켠 조회 전용 세션이면 여전히 슈퍼어드민을 적용할 수 있다 (fail-closed 아님)', () => {
    actAsReader();
    // 전제: 이 세션은 그 화면에 닿는다 — read 를 손으로 갖고 있다
    const roleAdmin = resourceIdForPath(ROLE_ADMIN_PATH) ?? '';
    expect(isActionOn(READER.permissions, roleAdmin, 'read')).toBe(true);

    usePermissionStore.getState().activateRole(SUPER.id);

    expect(usePermissionStore.getState().roleState.activeRoleId).toBe(SUPER.id);
  });
});
