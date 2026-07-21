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
  withActionForAll,
  withAllPermissions,
  withResourceAction,
} from './resources';
import type { PermissionAction, PermissionMatrix, ResourceId } from './resources';
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

  function updateSelected(update: (role: Role) => Role): void {
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
      const { roles } = get().roleState;
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
      const { roles } = get().roleState;
      const role = findRole(roles, roleId);
      if (role === null) return fail('역할을 찾을 수 없습니다.');
      if (role.system) return fail('시스템 역할은 이름을 바꿀 수 없습니다.');

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
      const { roles } = get().roleState;
      const role = findRole(roles, roleId);
      if (role === null) return fail('역할을 찾을 수 없습니다.');
      if (role.system) return fail('시스템 역할은 삭제할 수 없습니다.');
      if (roles.length <= 1) return fail('마지막 역할은 삭제할 수 없습니다.');

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
