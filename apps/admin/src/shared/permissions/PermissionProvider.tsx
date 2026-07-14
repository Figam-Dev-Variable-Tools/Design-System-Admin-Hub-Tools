// 권한 상태 전역 공급자 (A40 소유 — apps/admin/src/**)
//
// [모델] 권한의 단위는 **역할(Role)** 이다. 역할 = 리소스×액션 매트릭스 + 대시보드 위젯 + scope.
// 그중 하나(activeRoleId)가 '현재 적용 중'이고, 그 역할이 앱의 유효 권한을 결정한다.
//
// [기존 소비처 호환 — 중요]
//   isEnabled(key: FeatureKey) 의 **시그니처와 의미가 그대로다**.
//     - 'dashboard.*' → 활성 역할의 위젯 토글          (DashboardPage / StatsSection 무수정)
//     - 'menu.*'      → 그 메뉴 리소스의 read          (레거시 키 호환)
//   그래서 권한을 끄면 메뉴/위젯이 리로드 없이 즉시 사라지는 동작이 유지된다.
//
//   AppShell 은 여기에 더해 can(resourceId, action) 으로 **그룹과 잎을 각각** 거른다.
//
// [편집] set* 함수는 **선택 중인 역할**(selectedRoleId)을 바꾼다. 선택 = 활성 역할이면
//   화면이 그 자리에서 따라 바뀐다. 모든 변경은 모델 계층(resources.ts)의 의존 규칙을
//   통과하므로 저장값이 모순 상태(read=false 인데 update=true)로 남을 수 없다.
//
// [저장] localStorage(mock). 다른 탭에서 바꾼 값도 storage 이벤트로 따라온다.
// 백엔드가 붙으면 loadState/saveState 두 함수만 갈아끼우면 되고 화면 코드는 그대로다.
// TODO(backend): GET /api/roles · PUT /api/roles/:id/permissions
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { createWidgets, isDashboardWidgetKey } from './feature-registry';
import type { DashboardWidgetKey, FeatureKey, WidgetMap } from './feature-registry';
import {
  createMatrix,
  isActionOn,
  menuResourceIdFor,
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
  validateRoleName,
} from './roles';
import type { Role, RoleScope, RoleState } from './roles';

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

/* ── 역할 편집 결과 ──────────────────────────────────────────────────────── */

export type RoleMutationResult =
  { readonly ok: true } | { readonly ok: false; readonly error: string };

const OK: RoleMutationResult = { ok: true };

function fail(error: string): RoleMutationResult {
  return { ok: false, error };
}

/** 역할 목록이 비는 일은 없어야 하지만(정규화가 막는다), 타입 안전을 위한 최후 보루 */
const FALLBACK_ROLE: Role = createSuperAdminRole();

/* ── 컨텍스트 ────────────────────────────────────────────────────────────── */

interface PermissionContextValue {
  /** 기존 API — 활성 역할 기준. dashboard.* = 위젯 토글, menu.* = 그 메뉴의 read */
  readonly isEnabled: (key: FeatureKey) => boolean;
  /** 활성 역할 기준의 리소스×액션 판정 — AppShell 이 메뉴 그룹·잎을 거를 때 쓴다 */
  readonly can: (resourceId: ResourceId, action: PermissionAction) => boolean;

  readonly roles: readonly Role[];
  readonly activeRole: Role;
  readonly activeRoleId: string;
  readonly selectedRole: Role;
  readonly selectedRoleId: string;

  readonly selectRole: (roleId: string) => void;
  /** 선택한 역할을 '현재 적용 중' 으로 만든다 — 사이드바/대시보드가 즉시 이 역할을 따른다 */
  readonly activateRole: (roleId: string) => void;

  readonly createRole: (name: string) => RoleMutationResult;
  readonly renameRole: (roleId: string, name: string) => RoleMutationResult;
  readonly deleteRole: (roleId: string) => RoleMutationResult;

  /* 선택 중인 역할의 편집 — 토글하는 즉시 저장된다 */
  readonly setResourceAction: (
    resourceId: ResourceId,
    action: PermissionAction,
    enabled: boolean,
  ) => void;
  /** 한 액션을 모든 리소스에 (열 전체선택) */
  readonly setActionForAll: (action: PermissionAction, enabled: boolean) => void;
  /** 모든 액션 × 모든 리소스 ('전체' 행) */
  readonly setAllPermissions: (enabled: boolean) => void;

  readonly setWidget: (key: DashboardWidgetKey, enabled: boolean) => void;
  readonly setAllWidgets: (enabled: boolean) => void;

  readonly setScope: (scope: RoleScope) => void;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<RoleState>(loadState);
  // 권한 관리 화면에서 '보고 있는' 역할. 고르기 전에는 활성 역할과 같다
  const [requestedRoleId, setRequestedRoleId] = useState<string | null>(null);

  // 다른 탭에서 바꾼 역할/권한을 따라간다
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setState(loadState());
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const { roles, activeRoleId } = state;

  // 역할이 사라졌거나(다른 탭에서 삭제) 아직 고르지 않았으면 활성 역할을 본다.
  const activeRole = findRole(roles, activeRoleId) ?? roles[0] ?? FALLBACK_ROLE;
  const selectedRole =
    (requestedRoleId === null ? null : findRole(roles, requestedRoleId)) ?? activeRole;

  const mutate = useCallback((updater: (prev: RoleState) => RoleState) => {
    setState((prev) => {
      const next = updater(prev);
      saveState(next);
      return next;
    });
  }, []);

  /** roleId 의 역할을 갈아끼운다. 시스템 역할은 항상 전 권한 ON 이라 편집을 무시한다 */
  const updateRole = useCallback(
    (roleId: string, update: (role: Role) => Role) => {
      mutate((prev) => ({
        ...prev,
        roles: prev.roles.map((role) => (role.id !== roleId || role.system ? role : update(role))),
      }));
    },
    [mutate],
  );

  const selectedId = selectedRole.id;

  const updatePermissions = useCallback(
    (update: (permissions: PermissionMatrix) => PermissionMatrix) => {
      updateRole(selectedId, (role) => ({ ...role, permissions: update(role.permissions) }));
    },
    [selectedId, updateRole],
  );

  const updateWidgets = useCallback(
    (update: (widgets: WidgetMap) => WidgetMap) => {
      updateRole(selectedId, (role) => ({ ...role, widgets: update(role.widgets) }));
    },
    [selectedId, updateRole],
  );

  const setResourceAction = useCallback(
    (resourceId: ResourceId, action: PermissionAction, enabled: boolean) => {
      updatePermissions((permissions) =>
        withResourceAction(permissions, resourceId, action, enabled),
      );
    },
    [updatePermissions],
  );

  const setActionForAll = useCallback(
    (action: PermissionAction, enabled: boolean) => {
      updatePermissions((permissions) => withActionForAll(permissions, action, enabled));
    },
    [updatePermissions],
  );

  const setAllPermissions = useCallback(
    (enabled: boolean) => {
      updatePermissions(() => withAllPermissions(enabled));
    },
    [updatePermissions],
  );

  const setWidget = useCallback(
    (key: DashboardWidgetKey, enabled: boolean) => {
      updateWidgets((widgets) => ({ ...widgets, [key]: enabled }));
    },
    [updateWidgets],
  );

  const setAllWidgets = useCallback(
    (enabled: boolean) => {
      updateWidgets(() => createWidgets(enabled));
    },
    [updateWidgets],
  );

  const setScope = useCallback(
    (scope: RoleScope) => {
      updateRole(selectedId, (role) => ({ ...role, scope }));
    },
    [selectedId, updateRole],
  );

  const selectRole = useCallback((roleId: string) => {
    setRequestedRoleId(roleId);
  }, []);

  const activateRole = useCallback(
    (roleId: string) => {
      mutate((prev) =>
        prev.roles.some((role) => role.id === roleId) ? { ...prev, activeRoleId: roleId } : prev,
      );
    },
    [mutate],
  );

  const createRole = useCallback(
    (name: string): RoleMutationResult => {
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
      setRequestedRoleId(role.id);
      return OK;
    },
    [roles, mutate],
  );

  const renameRole = useCallback(
    (roleId: string, name: string): RoleMutationResult => {
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
    [roles, mutate],
  );

  const deleteRole = useCallback(
    (roleId: string): RoleMutationResult => {
      const role = findRole(roles, roleId);
      if (role === null) return fail('역할을 찾을 수 없습니다.');
      if (role.system) return fail('시스템 역할은 삭제할 수 없습니다.');
      if (roles.length <= 1) return fail('마지막 역할은 삭제할 수 없습니다.');

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
      setRequestedRoleId(fallback?.id ?? null);
      return OK;
    },
    [roles, mutate],
  );

  const value = useMemo<PermissionContextValue>(() => {
    const permissions = activeRole.permissions;

    return {
      // 유효 권한 = 활성 역할. 이 두 함수가 기존 소비처(AppShell·Dashboard)를 지탱한다
      isEnabled: (key) => {
        if (isDashboardWidgetKey(key)) return activeRole.widgets[key];
        const resourceId = menuResourceIdFor(key);
        return resourceId === null ? false : isActionOn(permissions, resourceId, 'read');
      },
      can: (resourceId, action) => isActionOn(permissions, resourceId, action),

      roles,
      activeRole,
      activeRoleId: activeRole.id,
      selectedRole,
      selectedRoleId: selectedRole.id,

      selectRole,
      activateRole,
      createRole,
      renameRole,
      deleteRole,

      setResourceAction,
      setActionForAll,
      setAllPermissions,
      setWidget,
      setAllWidgets,
      setScope,
    };
  }, [
    activeRole,
    selectedRole,
    roles,
    selectRole,
    activateRole,
    createRole,
    renameRole,
    deleteRole,
    setResourceAction,
    setActionForAll,
    setAllPermissions,
    setWidget,
    setAllWidgets,
    setScope,
  ]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextValue {
  const value = useContext(PermissionContext);
  if (value === null) {
    throw new Error('usePermissions 는 <PermissionProvider> 안에서만 쓸 수 있습니다.');
  }
  return value;
}
