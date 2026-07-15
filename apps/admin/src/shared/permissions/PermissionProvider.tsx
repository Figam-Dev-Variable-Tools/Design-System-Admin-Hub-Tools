// 권한 상태 소비 계약 (A41 소유 — apps/admin/src/**)
//
// [모델] 권한의 단위는 **역할(Role)** 이다. 역할 = 리소스×액션 매트릭스 + 대시보드 위젯 + scope.
// 그중 하나(activeRoleId)가 '현재 적용 중'이고, 그 역할이 앱의 유효 권한을 결정한다.
//
// [상태의 소유자 — 재설계 후]
//   전역 클라이언트 상태(roles/activeRole/selectedRole + 15개 액션)는 이제 **Zustand 스토어**가
//   소유한다 (./permission-store.ts). 이 파일은 두 가지만 책임진다:
//     1) usePermissions() — 스토어를 조각 단위로 구독해 **기존 PermissionContextValue 계약을 그대로**
//        재구성한다. 소비자(AppShell·DashboardPage·StatsSection·PermissionsPage·nav)는 무수정이다.
//     2) PermissionProvider — 크로스탭 storage 동기화의 mount/unmount 지점.
//        (더는 Context 를 들지 않는다 — 스토어가 전역이라 Provider 없이도 상태에 닿는다.
//         다만 main.tsx 를 건드리지 않고 리스너 수명주기를 컴포넌트에 묶어 두기 위해 유지한다.)
//
// [기존 소비처 호환 — 중요]
//   isEnabled(key: FeatureKey) 의 **시그니처와 의미가 그대로다**.
//     - 'dashboard.*' → 활성 역할의 위젯 토글          (DashboardPage / StatsSection 무수정)
//     - 'menu.*'      → 그 메뉴 리소스의 read          (레거시 키 호환)
//   AppShell 은 여기에 더해 can(resourceId, action) 으로 **그룹과 잎을 각각** 거른다.
//
// [저장] localStorage(mock). 다른 탭에서 바꾼 값도 storage 이벤트로 따라온다 (permission-store.ts).
// 백엔드가 붙으면 loadState/saveState 두 함수만 갈아끼우면 되고 화면 코드는 그대로다.
// TODO(backend): GET /api/roles · PUT /api/roles/:id/permissions
import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { isDashboardWidgetKey } from './feature-registry';
import type { DashboardWidgetKey, FeatureKey } from './feature-registry';
import {
  activeRoleOf,
  selectedRoleOf,
  subscribeToOtherTabs,
  usePermissionStore,
} from './permission-store';
import type { PermissionStore, RoleMutationResult } from './permission-store';
import { isActionOn, menuResourceIdFor } from './resources';
import type { PermissionAction, ResourceId } from './resources';
import type { Role, RoleScope } from './roles';

// RoleFormModal 이 이 경로에서 계약 타입을 계속 import 한다 — 재노출로 소비처 무수정 유지
export type { RoleMutationResult };

/* ── 컨텍스트 계약 (불변 — 소비처가 의존하는 표면) ──────────────────────── */

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

/* ── 액션 셀렉터 ─────────────────────────────────────────────────────────── */

/** 스토어 액션(참조 안정)만 골라낸다 — useShallow 로 안정 객체를 얻어 불필요한 재계산을 막는다 */
function selectActions(store: PermissionStore) {
  return {
    selectRole: store.selectRole,
    activateRole: store.activateRole,
    createRole: store.createRole,
    renameRole: store.renameRole,
    deleteRole: store.deleteRole,
    setResourceAction: store.setResourceAction,
    setActionForAll: store.setActionForAll,
    setAllPermissions: store.setAllPermissions,
    setWidget: store.setWidget,
    setAllWidgets: store.setAllWidgets,
    setScope: store.setScope,
  };
}

/* ── 소비 계약 ───────────────────────────────────────────────────────────── */

export function usePermissions(): PermissionContextValue {
  // 데이터 조각만 구독한다 — 상태가 바뀌지 않으면 재계산도 재렌더도 없다
  const roleState = usePermissionStore((store) => store.roleState);
  const requestedRoleId = usePermissionStore((store) => store.requestedRoleId);
  // 액션은 스토어 생성 시 한 번 만들어져 참조가 불변 — useShallow 로 안정 객체를 유지
  const actions = usePermissionStore(useShallow(selectActions));

  const activeRole = activeRoleOf(roleState);
  const selectedRole = selectedRoleOf(roleState, requestedRoleId);

  return useMemo<PermissionContextValue>(
    () => ({
      // 유효 권한 = 활성 역할. 이 두 함수가 기존 소비처(AppShell·Dashboard)를 지탱한다
      isEnabled: (key) => {
        if (isDashboardWidgetKey(key)) return activeRole.widgets[key];
        const resourceId = menuResourceIdFor(key);
        return resourceId === null ? false : isActionOn(activeRole.permissions, resourceId, 'read');
      },
      can: (resourceId, action) => isActionOn(activeRole.permissions, resourceId, action),

      roles: roleState.roles,
      activeRole,
      activeRoleId: activeRole.id,
      selectedRole,
      selectedRoleId: selectedRole.id,

      ...actions,
    }),
    [roleState, activeRole, selectedRole, actions],
  );
}

/* ── 크로스탭 동기화 mount 지점 ──────────────────────────────────────────── */

export function PermissionProvider({ children }: { readonly children: ReactNode }) {
  useEffect(() => subscribeToOtherTabs(), []);
  return <>{children}</>;
}
