// 역할(Role) 모델
//
// [권한의 단위]
// 역할 = 권한 매트릭스(리소스 × 액션) + 대시보드 위젯 + 데이터 접근 범위(scope).
// 그중 하나(activeRoleId)가 '현재 적용 중'이 되어 앱의 유효 권한을 결정한다.
//
// 역할은 **권한만** 다룬다 — 운영자 배정(memberIds)은 이 모델에서 제거됐다.
// 누구에게 어떤 역할을 주는지는 관리자 관리(pages/admins) 화면의 몫이다.
//
// [저장] localStorage(mock). 형태가 바뀌었으므로 version 으로 옛 저장값을 가려낸다.
// TODO(backend): GET /api/roles · PUT /api/roles/:id/permissions
import { formatNumber } from '../format';
import {
  DASHBOARD_WIDGET_KEYS,
  createWidgets,
  normalizeLegacyPermissions,
  normalizeWidgets,
} from './feature-registry';
import type { PermissionMap, WidgetMap } from './feature-registry';
import {
  createMatrix,
  createReadOnlyMatrix,
  matrixFromLegacyPermissions,
  navPageResourceId,
  normalizeMatrix,
  withResourceAction,
} from './resources';
import type { PermissionMatrix } from './resources';
import { ROLE_ADMIN_PATH } from './route-resource';

/* ── 데이터 접근 범위 ────────────────────────────────────────────────────── */

// TODO(backend): scope 는 목록/상세 질의의 필터 조건이다 — 실제 필터링은 서버가 한다.
// 프론트는 역할에 저장·표시만 하고, 저장된 값을 API 가 그대로 신뢰하지 않도록
// 서버도 세션의 역할에서 scope 를 다시 읽어야 한다.
export type RoleScope = 'all' | 'department' | 'own';

const ROLE_SCOPES: readonly RoleScope[] = ['all', 'department', 'own'];

interface RoleScopeMeta {
  readonly key: RoleScope;
  readonly label: string;
  readonly description: string;
}

export const ROLE_SCOPE_META: readonly RoleScopeMeta[] = [
  { key: 'all', label: '전체', description: '모든 데이터를 조회·처리할 수 있어요.' },
  { key: 'department', label: '소속 부서', description: '자신이 속한 부서의 데이터만 다뤄요.' },
  { key: 'own', label: '본인', description: '자신이 만든 데이터만 다뤄요.' },
];

function normalizeScope(raw: unknown): RoleScope {
  return ROLE_SCOPES.find((scope) => scope === raw) ?? 'all';
}

/* ── 역할 ────────────────────────────────────────────────────────────────── */

export interface Role {
  readonly id: string;
  readonly name: string;
  /** 시스템 역할(슈퍼어드민) — 이름 변경·삭제·권한 수정 불가. 항상 전 권한 ON */
  readonly system: boolean;
  /** 데이터 접근 범위 — 역할당 하나 */
  readonly scope: RoleScope;
  /** 메뉴 권한 — 리소스 × 액션 */
  readonly permissions: PermissionMatrix;
  /** 대시보드 위젯 — 액션 개념이 없어 매트릭스와 분리한다 */
  readonly widgets: WidgetMap;
}

/** 저장 형태 — 이 한 덩어리가 통째로 localStorage 에 들어간다 */
export interface RoleState {
  readonly version: typeof ROLE_STATE_VERSION;
  readonly roles: readonly Role[];
  /** 앱의 유효 권한을 결정하는 역할 */
  readonly activeRoleId: string;
}

/** 저장 형태 버전 — 2 = 리소스×액션 매트릭스. 1(평면 맵)은 마이그레이션 대상 */
export const ROLE_STATE_VERSION = 2;

/* 기본 역할 3종의 id.
 *
 * [왜 export 하는가 — 운영자 픽스처가 같은 값을 보아야 하기 때문이다]
 * 운영자에게 역할을 배정하는 곳은 관리자 관리 화면이고(이 파일 머리말), 백엔드가 없는 동안
 * `pages/admins/fixtures.ts` 의 운영자들도 **실재하는 역할 id** 를 들고 있어야 한다. 그 값을
 * 픽스처에 손으로 베껴 적으면, 여기서 id 를 바꾸는 순간 픽스처의 운영자들이 존재하지 않는 역할을
 * 가리키게 되고 상세 화면의 '역할' 이 조용히 '—' 로 바뀐다. 정본을 하나로 둔다. */
export const SUPER_ADMIN_ROLE_ID = 'role-super-admin';
export const OPERATOR_ROLE_ID = 'role-operator';
export const VIEWER_ROLE_ID = 'role-viewer';

export const ROLE_NAME_MAX_LENGTH = 30;

/** 시스템 역할을 수정할 수 없는 이유 — 비활성 컨트롤의 aria-describedby 문구로도 쓴다 */
export const SYSTEM_ROLE_REASON =
  '슈퍼어드민(전체권한)은 시스템 역할이라 이름 변경·삭제·권한 수정을 할 수 없어요. 항상 모든 리소스의 모든 액션을 가져요.';

/* ── 기본 역할 ───────────────────────────────────────────────────────────── */

export function createSuperAdminRole(): Role {
  return {
    id: SUPER_ADMIN_ROLE_ID,
    name: '슈퍼어드민(전체권한)',
    system: true,
    scope: 'all',
    permissions: createMatrix(true),
    widgets: createWidgets(true),
  };
}

/**
 * '뷰어' 역할의 권한 — 전 리소스 조회, **단 권한 관리(`/users/roles`)는 제외**.
 *
 * [왜 여기서 read 를 뺀다] 권한 관리 화면은 역할을 편집하고 그 안에는 '이 역할 적용' 버튼이 있다.
 * 조회 전용 역할이 그 화면에 닿으면 클릭 한 번으로 슈퍼어드민으로 신원을 바꿀 수 있다. 버튼 자체를
 * 막으면 update 를 잃은 역할에서 빠져나올 길이 사라져 영구 잠금이 되므로(permission-store.ts 의
 * activateRole 머리말), 대신 **뷰어가 이 화면에 아예 닿지 못하게** 한다 — read 를 빼면 사이드바에서
 * 사라지고(AppShell), 주소로 들어와도 403 이며(RequirePermission), 그 버튼에 이르는 길이 없어진다.
 * 다른 기본 역할(운영자·슈퍼어드민)은 이 화면을 봐야 하므로 건드리지 않는다.
 *
 * 정본은 createReadOnlyMatrix 다 — 그것을 읽고 이 리소스 하나만 read=false 로 덮는다. enforceMatrix
 * 가 그룹(사용자 관리) 행을 남은 자식(관리자 관리)의 합집합으로 다시 계산하므로 그룹은 그대로 보인다.
 */
export function createViewerMatrix(): PermissionMatrix {
  return withResourceAction(
    createReadOnlyMatrix(),
    navPageResourceId(ROLE_ADMIN_PATH),
    'read',
    false,
  );
}

/**
 * 기본 역할 3종.
 *
 * operator* 인자를 받는 이유: 재설계 이전에 저장돼 있던 권한을 '운영자' 역할로 흡수하기
 * 위해서다(마이그레이션). 저장값이 없으면 전 권한 ON — 재설계 이전의 첫 실행 동작 그대로다.
 */
function createDefaultRoles(
  operatorPermissions: PermissionMatrix,
  operatorWidgets: WidgetMap,
): readonly Role[] {
  return [
    createSuperAdminRole(),
    {
      id: OPERATOR_ROLE_ID,
      name: '운영자',
      system: false,
      scope: 'all',
      permissions: operatorPermissions,
      widgets: operatorWidgets,
    },
    {
      id: VIEWER_ROLE_ID,
      name: '뷰어',
      system: false,
      // 읽기 전용 역할의 표본 — 권한 관리를 뺀 모든 리소스 조회만, 본인 데이터만
      scope: 'own',
      permissions: createViewerMatrix(),
      widgets: createWidgets(true),
    },
  ];
}

function createDefaultRoleState(
  operatorPermissions: PermissionMatrix,
  operatorWidgets: WidgetMap,
): RoleState {
  return {
    version: ROLE_STATE_VERSION,
    roles: createDefaultRoles(operatorPermissions, operatorWidgets),
    activeRoleId: OPERATOR_ROLE_ID,
  };
}

/** 저장값이 없거나 깨졌을 때의 폴백 — 운영자는 전 권한 ON */
export function createInitialRoleState(): RoleState {
  return createDefaultRoleState(createMatrix(true), createWidgets(true));
}

/* ── 정규화 (저장값 방어) ────────────────────────────────────────────────── */

function normalizeRole(raw: unknown): Role | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const source = raw as Record<string, unknown>;
  const id = source['id'];
  const name = source['name'];
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || name === '') return null;

  const system = id === SUPER_ADMIN_ROLE_ID || source['system'] === true;
  // 시스템 역할은 저장값과 무관하게 항상 전 권한 ON 이다 (잠금 상태를 만들지 않는다)
  if (system) return { ...createSuperAdminRole(), id, name };

  return {
    id,
    name,
    system: false,
    scope: normalizeScope(source['scope']),
    permissions: normalizeMatrix(source['permissions']),
    widgets: normalizeWidgets(source['widgets'], createWidgets(false)),
  };
}

function assembleRoleState(roles: readonly Role[], rawActive: unknown): RoleState {
  const seen = new Set<string>();
  const unique: Role[] = [];
  for (const role of roles) {
    if (seen.has(role.id)) continue;
    seen.add(role.id);
    unique.push(role);
  }

  // 슈퍼어드민이 없으면 되살린다 — 전 권한을 잃는 잠금 상태를 막는다
  if (!seen.has(SUPER_ADMIN_ROLE_ID)) unique.unshift(createSuperAdminRole());

  const first = unique[0];
  if (first === undefined) return createInitialRoleState();

  const active =
    typeof rawActive === 'string' && unique.some((role) => role.id === rawActive)
      ? rawActive
      : first.id;

  return { version: ROLE_STATE_VERSION, roles: unique, activeRoleId: active };
}

/** 저장된 v2 RoleState 를 신뢰 가능한 값으로 되돌린다 */
export function normalizeRoleState(raw: unknown): RoleState {
  if (typeof raw !== 'object' || raw === null) return createInitialRoleState();

  const source = raw as Record<string, unknown>;
  const rawRoles = Array.isArray(source['roles']) ? source['roles'] : [];

  const roles: Role[] = [];
  for (const entry of rawRoles) {
    const role = normalizeRole(entry);
    if (role !== null) roles.push(role);
  }

  return assembleRoleState(roles, source['activeRoleId']);
}

/* ── 마이그레이션 ────────────────────────────────────────────────────────── */

/** 위젯은 옛 평면 맵의 dashboard.* 키를 그대로 옮긴다 */
function widgetsFromLegacy(legacy: PermissionMap): WidgetMap {
  return Object.fromEntries(
    DASHBOARD_WIDGET_KEYS.map((key) => [key, legacy[key]]),
  ) as unknown as WidgetMap;
}

/**
 * v1 저장값(`tds-admin.roles`, 역할별 **평면 PermissionMap**) → v2.
 * 각 역할의 menu.* true 는 그 그룹과 하위 메뉴의 read=true 로 흡수된다.
 * 운영자 배정(memberIds)은 모델에서 사라졌으므로 버린다.
 */
export function migrateLegacyRoleState(raw: unknown): RoleState {
  if (typeof raw !== 'object' || raw === null) return createInitialRoleState();

  const source = raw as Record<string, unknown>;
  const rawRoles = Array.isArray(source['roles']) ? source['roles'] : [];

  const roles: Role[] = [];
  for (const entry of rawRoles) {
    if (typeof entry !== 'object' || entry === null) continue;

    const roleSource = entry as Record<string, unknown>;
    const id = roleSource['id'];
    const name = roleSource['name'];
    if (typeof id !== 'string' || id === '' || typeof name !== 'string' || name === '') continue;

    if (id === SUPER_ADMIN_ROLE_ID || roleSource['system'] === true) {
      roles.push({ ...createSuperAdminRole(), id, name });
      continue;
    }

    const legacy = normalizeLegacyPermissions(roleSource['permissions']);
    roles.push({
      id,
      name,
      system: false,
      scope: 'all',
      permissions: matrixFromLegacyPermissions(legacy),
      widgets: widgetsFromLegacy(legacy),
    });
  }

  if (roles.length === 0) return createInitialRoleState();
  return assembleRoleState(roles, source['activeRoleId']);
}

/**
 * v0 저장값(`tds-admin.permissions`, 앱 전체가 공유하던 평면 맵) → v2.
 * 그 맵이 곧 '운영자' 역할의 권한이 된다 — 사용자가 보던 화면이 그대로 유지된다.
 */
export function migrateLegacyPermissions(raw: unknown): RoleState {
  const legacy = normalizeLegacyPermissions(raw);
  return createDefaultRoleState(matrixFromLegacyPermissions(legacy), widgetsFromLegacy(legacy));
}

/* ── 편집 헬퍼 ───────────────────────────────────────────────────────────── */

export function createRoleId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `role-${Date.now().toString(36)}-${random}`;
}

export function findRole(roles: readonly Role[], roleId: string): Role | null {
  return roles.find((role) => role.id === roleId) ?? null;
}

/**
 * 역할명 검증 — 빈 값·길이·중복(대소문자 무시). 통과하면 null.
 * ignoreRoleId 는 '수정' 에서 자기 자신을 중복 검사에서 빼기 위한 것이다.
 */
export function validateRoleName(
  name: string,
  roles: readonly Role[],
  ignoreRoleId: string | null,
): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return '역할명을 입력하세요.';
  if (trimmed.length > ROLE_NAME_MAX_LENGTH) {
    return `역할명은 ${String(ROLE_NAME_MAX_LENGTH)}자를 넘을 수 없어요.`;
  }

  const key = trimmed.toLocaleLowerCase();
  const duplicated = roles.some(
    (role) => role.id !== ignoreRoleId && role.name.trim().toLocaleLowerCase() === key,
  );
  return duplicated ? '이미 같은 이름의 역할이 있어요.' : null;
}

/* ── 삭제 가드 ────────────────────────────────────────────────────────────────
 *
 * [왜 이것이 이 앱에서 가장 위험한 삭제인가] 역할을 지우면 그 역할을 든 운영자의 `roleId` 가
 * **존재하지 않는 id** 를 가리킨다(고아 참조). 그 순간 상세 화면의 '역할' 은 조용히 '—' 가 되고,
 * 그 사람이 무슨 권한이었는지는 아무 데도 남지 않는다 — 되돌리려면 누가 어떤 역할이었는지를
 * 기억에 의존해 다시 배정해야 한다. 카테고리 삭제(상품·고객센터)는 이미 같은 이유로 사용 중일 때
 * 막고 있었는데, 정작 더 위험한 역할 삭제만 무방비였다.
 *
 * [문구를 도메인이 갖는 이유는 adminGroupDeletionBlock 과 같다] 이 문장은 두 곳에서 쓰인다 —
 * 화면이 삭제 버튼을 잠그며 다는 사유(aria-label/title)와, 저장소(permission-store)가 삭제를
 * 거절하며 돌려주는 오류다. 두 곳에 따로 적으면 경합으로 거절됐을 때만 다른 문장이 뜬다.
 */

/**
 * 역할 삭제를 막아야 하는 이유 — 없으면 null.
 *
 * `assigneeCount === null` 은 '0명' 이 아니라 **'확인 불가'** 다(조회기 미배선 — permission-store.ts
 * 의 registerRoleAssigneeCountLookup 머리말). 모르는 것을 '없음' 으로 읽으면 배정된 역할이 조용히
 * 지워지므로 그때도 막는다(fail-closed).
 */
export function roleDeletionBlock(roleName: string, assigneeCount: number | null): string | null {
  if (assigneeCount === null) {
    return `'${roleName}' 역할을 쓰는 운영자를 확인하지 못해 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.`;
  }
  if (assigneeCount > 0) {
    return `'${roleName}' 역할을 쓰는 운영자가 ${formatNumber(assigneeCount)}명 있어 삭제할 수 없어요. 관리자 관리에서 이 운영자들의 역할을 먼저 바꾼 뒤 다시 삭제해 주세요.`;
  }
  return null;
}
