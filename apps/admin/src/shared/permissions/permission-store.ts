// 권한 상태 전역 스토어
//
// [왜 Zustand 인가]
// 권한은 이 앱의 **유일한 진짜 전역 클라이언트 상태**다 — roles/activeRole/selectedRole 와
// 그 편집 액션(15종), localStorage 영속, 크로스탭 동기화. 이전에는 React Context + useMemo 로
// 한 덩어리 value 를 만들어 모든 소비자에게 흘렸다(전역 재렌더). 이제 그 상태를 Zustand 스토어가
// 소유하고, 소비자는 usePermissions() 로 필요한 조각만 구독한다(선택적 구독).
//
// [저장 로직을 persist 미들웨어로 옮기지 않은 이유 — 판단]
// 영속은 아래 loadState/saveState 를 **그대로** 쓴다. 이유는 견고성이다:
//   - loadState 는 세 갈래 마이그레이션(v2 정규화 · v1 역할+평면맵 · v0 별도 키 tds-admin.permissions)을
//     흡수하고, 옛 키를 제거하며, resources 계층의 불변식(read 의존·그룹=합집합)을 통과시킨다.
//   - Zustand persist 는 name 키 하나만 읽으므로 v0 의 **별도 키**를 자연히 집어오지 못하고,
//     migrate/merge 로 위 로직을 재구현하면 표면적만 늘어 E2E(권한→메뉴/위젯 가시성) 리스크가 커진다.
//   - 크로스탭 동기화는 persist 도 기본 제공하지 않아 어차피 storage 리스너를 직접 달아야 한다.
// 따라서 검증된 함수를 재사용하는 편이 동작 보존과 견고성 모두에서 우위다. 스토어는 상태를 소유하고,
// 영속은 스토어 변경에 얹힌 얇은 부수효과로 남긴다.
import { create } from 'zustand';

import { createWidgets } from './feature-registry';
import type { DashboardWidgetKey, WidgetMap } from './feature-registry';
import {
  createMatrix,
  isActionOn,
  withActionForAll,
  withAllPermissions,
  withResourceAction,
} from './resources';
import type { PermissionAction, PermissionMatrix, ResourceId } from './resources';
import { ROLE_ADMIN_PATH, resourceIdForPath } from './route-resource';
import {
  ROLE_STATE_VERSION,
  createInitialRoleState,
  createRoleId,
  createSuperAdminRole,
  findRole,
  migrateLegacyPermissions,
  migrateLegacyRoleState,
  normalizeRoleState,
  roleDeletionBlock,
  validateRoleName,
} from './roles';
import type { Role, RoleScope, RoleState } from './roles';

/** 저장 키. 크로스탭 리스너(subscribeToOtherTabs)가 이 키의 storage 이벤트만 반응한다 */
const STORAGE_KEY = 'tds-admin.roles';

/** 역할 도입 이전의 평면 PermissionMap 키 — 첫 로드 때 '운영자' 역할의 권한으로 흡수한다 */
const LEGACY_FLAT_KEY = 'tds-admin.permissions';

function saveState(state: RoleState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 무시한다 — 현재 세션 동안은 메모리 상태로 계속 동작한다
  }
}

/**
 * 저장값 → RoleState. 세 갈래를 모두 흡수한다.
 *   v2 (version:2)      — 그대로 정규화
 *   v1 (역할 + 평면 맵)  — 역할별 menu.* 를 read=true 로 흡수
 *   v0 (평면 맵 단독)    — '운영자' 역할의 권한으로 흡수
 * 깨져 있으면 기본 역할로 폴백한다.
 */
function loadState(): RoleState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      const version =
        typeof parsed === 'object' && parsed !== null
          ? (parsed as Record<string, unknown>)['version']
          : undefined;

      const state =
        version === ROLE_STATE_VERSION
          ? normalizeRoleState(parsed)
          : migrateLegacyRoleState(parsed);
      if (version !== ROLE_STATE_VERSION) saveState(state);
      return state;
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_FLAT_KEY);
    const migrated =
      legacyRaw === null
        ? createInitialRoleState()
        : migrateLegacyPermissions(JSON.parse(legacyRaw));

    saveState(migrated);
    try {
      window.localStorage.removeItem(LEGACY_FLAT_KEY);
    } catch {
      // 정리 실패는 무시한다 — 새 키가 있으면 옛 키를 다시 읽지 않는다
    }
    return migrated;
  } catch {
    // 저장소 접근 불가(프라이빗 모드) · JSON 파손 — 기본 역할로 동작한다
    return createInitialRoleState();
  }
}

/* ── 역할 사용처 조회 — 의존 방향을 뒤집는다 (주입 이음매) ────────────────────
 *
 * [문제] 역할 삭제 가드는 "이 역할을 든 운영자가 몇 명인가" 를 알아야 하는데, 그 답은 운영자
 * 명부(`pages/admins`)가 갖고 있다. 그렇다고 이 파일이 그 페이지 모듈을 import 하면
 * **shared/permissions → pages/admins 결합**이 되고, code-quality 게이트의 페이지 결합 축이
 * 임계치 0 이라 곧바로 blocker 로 잡힌다. 방향도 틀렸다 — 권한 층은 '누가 그 역할인가' 를
 * 모르는 채로 남아야 한다(roles.ts 머리말: 배정은 관리자 관리 화면의 몫이다).
 *
 * [해법] 여기는 조회기의 **자리만** 만들고, 실제 구현을 꽂는 일은 두 도메인을 모두 아는
 * 합성 지점(`src/wiring.ts`)이 한다. 발신 프로필 조회기(shared/fixtures/admin-groups.ts 의
 * registerSenderUsageLookup)와 **같은 이음매·같은 규약**이다 — 앱에 이미 있는 방식을 따른다.
 *
 * [등록 전에는 null 을 돌려준다 — 그리고 그때는 삭제를 막는다] 배선되지 않은 상태에서 0 을
 * 돌려주면 "쓰는 사람이 없다" 로 읽혀 **삭제가 조용히 통과**한다. 모르는 것과 없는 것은 다르다
 * (roleDeletionBlock 이 null 을 '확인 불가' 로 다뤄 거절한다 — fail-closed).
 */
type RoleAssigneeCountLookup = (roleId: string) => number;

let roleAssigneeCountLookup: RoleAssigneeCountLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 배선 지점은 `src/wiring.ts` */
export function registerRoleAssigneeCountLookup(lookup: RoleAssigneeCountLookup): void {
  roleAssigneeCountLookup = lookup;
}

/** 이 역할을 배정받은 운영자 수 — 조회기가 등록되지 않았으면 null(확인 불가) */
export function roleAssigneeCountOf(roleId: string): number | null {
  return roleAssigneeCountLookup === null ? null : roleAssigneeCountLookup(roleId);
}

/* ── 역할 편집 결과 ──────────────────────────────────────────────────────── */

export type RoleMutationResult =
  { readonly ok: true } | { readonly ok: false; readonly error: string };

const OK: RoleMutationResult = { ok: true };

function fail(error: string): RoleMutationResult {
  return { ok: false, error };
}

/** 역할 목록이 비는 일은 없어야 하지만(정규화가 막는다), 타입 안전을 위한 최후 보루 */
const FALLBACK_ROLE: Role = createSuperAdminRole();

/* ── 파생 셀렉터 (스토어 액션과 usePermissions 가 공유) ───────────────────── */

/** 앱의 유효 권한을 결정하는 역할. 역할이 사라졌으면(다른 탭 삭제) 첫 역할로 폴백한다 */
export function activeRoleOf(roleState: RoleState): Role {
  return findRole(roleState.roles, roleState.activeRoleId) ?? roleState.roles[0] ?? FALLBACK_ROLE;
}

/** 권한 관리 화면에서 '보고 있는' 역할. 고르기 전(null)에는 활성 역할과 같다 */
export function selectedRoleOf(roleState: RoleState, requestedRoleId: string | null): Role {
  const active = activeRoleOf(roleState);
  return (requestedRoleId === null ? null : findRole(roleState.roles, requestedRoleId)) ?? active;
}

/* ── 이 저장소 자신의 쓰기 게이팅 — 권한 상승 차단 ──────────────────────────
 *
 * [무엇이 뚫려 있었나] 권한 관리 화면(`/users/roles`)은 **권한 모델을 정의하는 화면**인데
 * 쓰기 판정을 아무도 하지 않았다. 조회 권한만 받은 사람이 그 화면을 열어 역할을 만들고,
 * 자기 역할의 매트릭스에 등록·수정·삭제를 얹을 수 있었다 — 앱 안의 모든 다른 게이팅을
 * 무의미하게 만드는 단 하나의 구멍이다(권한 상승).
 *
 * [왜 화면이 아니라 저장소가 거절하는가] 화면도 같은 판정으로 컨트롤을 없앤다. 그러나 화면만
 * 막으면 **다른 탭에서 그 사이에 강등된 세션**·위조된 저장값·직접 호출이 그대로 통과한다.
 * 역할 삭제 가드(roleDeletionBlock)가 이미 같은 분담을 쓴다: 화면이 미리 잠그고, 거절의
 * 책임은 저장소가 진다.
 *
 * [무엇을 게이팅하지 '않는가' — activateRole/selectRole]
 *   이 둘은 역할 모델을 바꾸지 않는다. 바꾸는 것은 **이 브라우저의 신원**(어느 역할로 앱을
 *   보고 있는가)이고, 신원은 권한이 파생돼 나오는 근원이지 권한의 대상이 아니다.
 *   신원 전환을 자기 자신의 권한으로 잠그면 순환이 된다: update 를 잃은 역할을 한 번 적용하는
 *   순간 다른 역할로 되돌아갈 길이 영영 사라진다 — 저장소가 localStorage 뿐이라 서버가 풀어
 *   줄 수도 없다(영구 잠금). 백엔드가 붙으면 이 두 액션은 아예 사라진다(세션이 역할을 소유한다).
 *
 * [재검토 — '개발 빌드에서만 보이게' 는 왜 아닌가]
 *   남아 있는 사실은 분명하다: 조회 전용 역할(뷰어)도 이 화면의 read 를 갖고 있어(roles.ts 의
 *   createReadOnlyMatrix) '이 역할 적용' 으로 슈퍼어드민을 적용할 수 있다 — 한 번의 클릭이다.
 *   그래서 이 컨트롤을 개발 빌드로 내리는 안을 실제로 검토했고, 다음 이유로 택하지 않았다.
 *
 *   ① **선례는 반대 방향을 가리킨다.** 플랜 축에도 같은 모양의 DEV 전환 패널이 있었고 운영자
 *      지시로 제거됐다(entitlement-store.ts 의 devSetTier 머리말). 그 제거가 가능했던 이유는
 *      **대체 통로가 있었기 때문**이다 — receivePlan 으로 사내 어드민이 실제 값을 준다.
 *      역할에는 그런 통로가 없다. 세션도 백엔드도 없어, 이 버튼이 사라지면 운영 빌드에서
 *      활성 역할을 바꿀 방법이 **하나도** 남지 않는다.
 *   ② 그러면 이 화면이 죽는다. PermissionsPage 는 자기 문구로 "적용하려면 '이 역할 적용'을
 *      누르세요" 라고 말한다 — 활성이 아닌 역할의 편집은 그 버튼 없이는 영원히 관측되지 않는다.
 *      끄는 순간 '편집은 되는데 확인할 수 없는' 화면이 된다.
 *   ③ 막아도 상승 경로는 남는다. 이 층은 보안 경계가 아니라고 이미 선언돼 있고
 *      (RequirePermission.tsx 머리말 — "위조된 localStorage 로 이 가드는 우회된다"),
 *      같은 사람이 `tds-admin.roles` 를 손으로 고치면 같은 상태에 닿는다. 얻는 것은 두 경로 중
 *      하나를 닫는 것뿐인데, 치르는 값은 **되돌릴 수 없는 운영 사고**(영구 잠금)다.
 *
 *   [그러면 진짜 해법은 무엇인가] 두 가지이고 둘 다 코드가 답할 수 없다.
 *     · 백엔드: 세션이 역할을 소유하면 이 액션은 존재 이유가 사라진다(위 TODO).
 *     · 그 전까지의 완화는 **패키징 결정**이다 — 조회 전용 역할에게 `/users/roles` 의 read 를
 *       주지 않으면 이 화면에 닿지 못한다. 기본 매트릭스를 바꾸는 일이라 운영자 판단이 필요하다.
 */

/** 권한 관리 화면의 리소스 — 화면의 `useRouteWritePermissions()` 와 **같은 답**을 낸다 */
const ROLE_ADMIN_RESOURCE_ID: ResourceId | null = resourceIdForPath(ROLE_ADMIN_PATH);

/** 거부는 boolean 이 아니라 사유 문자열이다 — 모달의 오류 배너와 토스트가 이 문장을 그대로 쓴다 */
const ROLE_ADMIN_DENIED: Readonly<Record<PermissionAction, string>> = {
  read: '권한 관리를 조회할 권한이 없어요.',
  create: '권한 관리의 등록 권한이 없어 역할을 만들 수 없어요.',
  update: '권한 관리의 수정 권한이 없어 역할을 바꿀 수 없어요.',
  remove: '권한 관리의 삭제 권한이 없어 역할을 지울 수 없어요.',
  export: '권한 관리의 내보내기 권한이 없어요.',
};

/**
 * 지금 적용 중인 역할이 이 편집을 할 수 있는가 — 못 하면 그 사유, 되면 null.
 *
 * 리소스를 찾지 못하면(메뉴에서 잎이 사라진 경우) **막는다** — 모르는 것과 허용은 다르다
 * (권한 축은 fail-closed다. 플랜 축의 fail-open 과 반대 방향인 이유는 AppShell 머리말에 있다).
 */
function roleAdminBlock(roleState: RoleState, action: PermissionAction): string | null {
  if (ROLE_ADMIN_RESOURCE_ID === null) return ROLE_ADMIN_DENIED[action];
  return isActionOn(activeRoleOf(roleState).permissions, ROLE_ADMIN_RESOURCE_ID, action)
    ? null
    : ROLE_ADMIN_DENIED[action];
}

/**
 * 화면이 컨트롤을 잠글 때 다는 사유 — 저장소가 거절할 때 돌려주는 문장과 **같은 상수**다.
 * 두 곳에 따로 적으면 경합으로 거절됐을 때만 다른 문장이 뜬다(roleDeletionBlock 과 같은 규약).
 */
export function roleAdminDeniedReason(action: PermissionAction): string {
  return ROLE_ADMIN_DENIED[action];
}

/* ── 스토어 ──────────────────────────────────────────────────────────────── */

export interface PermissionStore {
  readonly roleState: RoleState;
  /** 편집 화면에서 선택 중인 역할 id. 영속하지 않는 세션 상태(크로스탭 동기화 대상 아님) */
  readonly requestedRoleId: string | null;

  readonly selectRole: (roleId: string) => void;
  readonly activateRole: (roleId: string) => void;

  readonly createRole: (name: string) => RoleMutationResult;
  readonly renameRole: (roleId: string, name: string) => RoleMutationResult;
  readonly deleteRole: (roleId: string) => RoleMutationResult;

  readonly setResourceAction: (
    resourceId: ResourceId,
    action: PermissionAction,
    enabled: boolean,
  ) => void;
  readonly setActionForAll: (action: PermissionAction, enabled: boolean) => void;
  readonly setAllPermissions: (enabled: boolean) => void;

  readonly setWidget: (key: DashboardWidgetKey, enabled: boolean) => void;
  readonly setAllWidgets: (enabled: boolean) => void;

  readonly setScope: (scope: RoleScope) => void;

  /** 다른 탭에서 바뀐 저장값을 다시 읽어들인다 — PermissionProvider 의 storage 리스너가 호출한다 */
  readonly syncFromStorage: () => void;
}

export const usePermissionStore = create<PermissionStore>((set, get) => {
  /** 모든 영속 변경의 단일 통로 — 저장과 상태 갱신을 한 곳에서 묶는다 */
  function mutate(updater: (prev: RoleState) => RoleState): void {
    set((store) => {
      const next = updater(store.roleState);
      saveState(next);
      return { roleState: next };
    });
  }

  /** roleId 의 역할을 갈아끼운다. 시스템 역할은 항상 전 권한 ON 이라 편집을 무시한다 */
  function updateRole(roleId: string, update: (role: Role) => Role): void {
    mutate((prev) => ({
      ...prev,
      roles: prev.roles.map((role) => (role.id !== roleId || role.system ? role : update(role))),
    }));
  }

  /**
   * 선택 중인 역할의 편집(매트릭스·위젯·범위)의 **단일 통로**.
   *
   * 여기 한 곳에서 수정 권한을 묻는다 — 여섯 개 setter 가 각자 물으면 하나만 빠뜨려도 그 축만
   * 조용히 열린다(이 파일이 고치고 있는 결함이 정확히 그 모양이다).
   *
   * [왜 조용히 무시하는가 — 이 자리에 한해서] 화면은 같은 판정으로 체크박스를 이미 잠그고
   * 사유를 붙였다(PermissionsPage 의 writeReasonId). 그러니 여기에 도달하는 경로는 경합
   * (다른 탭에서 방금 강등)이나 위조뿐이고, 그때 사용자가 볼 것은 '체크가 되돌아온다' 는
   * 사실 그 자체다. 반대로 역할 추가·개명·삭제는 사용자가 **명시적으로 제출**한 것이라
   * 침묵이 곧 거짓말이 되므로 사유 문자열을 돌려준다(RoleMutationResult).
   */
  function updateSelected(update: (role: Role) => Role): void {
    if (roleAdminBlock(get().roleState, 'update') !== null) return;
    const selectedId = selectedRoleOf(get().roleState, get().requestedRoleId).id;
    updateRole(selectedId, update);
  }

  function updatePermissions(update: (permissions: PermissionMatrix) => PermissionMatrix): void {
    updateSelected((role) => ({ ...role, permissions: update(role.permissions) }));
  }

  function updateWidgets(update: (widgets: WidgetMap) => WidgetMap): void {
    updateSelected((role) => ({ ...role, widgets: update(role.widgets) }));
  }

  return {
    roleState: loadState(),
    requestedRoleId: null,

    selectRole: (roleId) => {
      set({ requestedRoleId: roleId });
    },

    activateRole: (roleId) => {
      mutate((prev) =>
        prev.roles.some((role) => role.id === roleId) ? { ...prev, activeRoleId: roleId } : prev,
      );
    },

    createRole: (name) => {
      const { roleState } = get();
      const denied = roleAdminBlock(roleState, 'create');
      if (denied !== null) return fail(denied);

      const { roles } = roleState;
      const invalid = validateRoleName(name, roles, null);
      if (invalid !== null) return fail(invalid);

      const role: Role = {
        id: createRoleId(),
        name: name.trim(),
        system: false,
        scope: 'all',
        // 새 역할은 전 권한 OFF 로 시작한다 — 필요한 것만 켜서 쓴다 (최소 권한)
        permissions: createMatrix(false),
        widgets: createWidgets(false),
      };
      mutate((prev) => ({ ...prev, roles: [...prev.roles, role] }));
      set({ requestedRoleId: role.id });
      return OK;
    },

    renameRole: (roleId, name) => {
      const { roleState } = get();
      const denied = roleAdminBlock(roleState, 'update');
      if (denied !== null) return fail(denied);

      const { roles } = roleState;
      const role = findRole(roles, roleId);
      if (role === null) return fail('역할을 찾을 수 없어요.');
      if (role.system) return fail('시스템 역할은 이름을 바꿀 수 없어요.');

      const invalid = validateRoleName(name, roles, roleId);
      if (invalid !== null) return fail(invalid);

      const trimmed = name.trim();
      mutate((prev) => ({
        ...prev,
        roles: prev.roles.map((item) => (item.id === roleId ? { ...item, name: trimmed } : item)),
      }));
      return OK;
    },

    deleteRole: (roleId) => {
      const { roleState } = get();
      const denied = roleAdminBlock(roleState, 'remove');
      if (denied !== null) return fail(denied);

      const { roles } = roleState;
      const role = findRole(roles, roleId);
      if (role === null) return fail('역할을 찾을 수 없어요.');
      if (role.system) return fail('시스템 역할은 삭제할 수 없어요.');
      if (roles.length <= 1) return fail('마지막 역할은 삭제할 수 없어요.');

      // 배정된 운영자가 있으면(또는 확인할 수 없으면) 거절한다 — 고아 roleId 를 만들지 않는다.
      // 화면(RolePanel)도 같은 판정으로 버튼을 미리 잠그지만, 거절의 책임은 저장소가 진다:
      // 다른 탭에서 그 사이에 운영자가 이 역할로 옮겨질 수 있다(admin-group 삭제 가드와 같은 분담).
      const blocked = roleDeletionBlock(role.name, roleAssigneeCountOf(roleId));
      if (blocked !== null) return fail(blocked);

      mutate((prev) => {
        const remaining = prev.roles.filter((item) => item.id !== roleId);
        const first = remaining[0];
        if (first === undefined) return prev;
        return {
          ...prev,
          roles: remaining,
          // 적용 중이던 역할을 지웠다면 남은 첫 역할이 적용된다 (권한 없는 상태로 남지 않게)
          activeRoleId: prev.activeRoleId === roleId ? first.id : prev.activeRoleId,
        };
      });

      const fallback = roles.find((item) => item.id !== roleId);
      set({ requestedRoleId: fallback?.id ?? null });
      return OK;
    },

    setResourceAction: (resourceId, action, enabled) => {
      updatePermissions((permissions) =>
        withResourceAction(permissions, resourceId, action, enabled),
      );
    },

    setActionForAll: (action, enabled) => {
      updatePermissions((permissions) => withActionForAll(permissions, action, enabled));
    },

    setAllPermissions: (enabled) => {
      updatePermissions(() => withAllPermissions(enabled));
    },

    setWidget: (key, enabled) => {
      updateWidgets((widgets) => ({ ...widgets, [key]: enabled }));
    },

    setAllWidgets: (enabled) => {
      updateWidgets(() => createWidgets(enabled));
    },

    setScope: (scope) => {
      updateSelected((role) => ({ ...role, scope }));
    },

    syncFromStorage: () => {
      set({ roleState: loadState() });
    },
  };
});

/**
 * 다른 탭에서 바꾼 역할/권한을 따라간다. storage 이벤트는 그 이벤트를 낸 탭 이외에서만
 * 발화하므로(같은 탭 save 는 재진입하지 않는다) 저장→재로드 루프가 생기지 않는다.
 * PermissionProvider 가 mount 시 호출하고 unmount 시 반환된 정리 함수를 부른다.
 */
export function subscribeToOtherTabs(): () => void {
  function handleStorage(event: StorageEvent): void {
    if (event.key !== STORAGE_KEY) return;
    usePermissionStore.getState().syncFromStorage();
  }
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}
