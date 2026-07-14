// 권한 리소스 × 액션 매트릭스 — 권한 모델의 본체 (A40 소유)
//
// ┌ 리소스 ────────────────────────────────────────────────────────────────────┐
// │ **하드코딩하지 않는다.** 메뉴 트리의 SSOT 인 ../layout/nav-config.ts 에서 파생한다.  │
// │  - 가지(branch)  → 그룹 리소스 (부모 행)   id: `group:{basePath}`               │
// │  - 가지의 잎     → 페이지 리소스 (자식 행) id: `page:{to}`                       │
// │  - 최상위 잎     → 단독 리소스 (대시보드)  id: `page:{to}`                       │
// │ id 에 kind 를 접두어로 붙이는 이유: '상품 관리'(basePath '/products')와 그 첫 잎    │
// │ ('/products')처럼 경로가 겹치는 쌍이 실제로 있다 — 접두어가 없으면 id 가 충돌한다.    │
// │ 메뉴가 늘거나 줄면 nav-config 만 고치면 되고, 리소스 목록은 자동으로 따라온다.        │
// └────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 액션 5종 ──────────────────────────────────────────────────────────────────┐
// │ read(조회) create(등록) update(수정) remove(삭제) export(내보내기)              │
// └────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 의존 규칙 — **모델 계층에서 강제한다** (UI 가 아니라) ───────────────────────────┐
// │ (1) read 가 꺼지면 나머지 4개도 꺼진다   — 조회하지 못하는 것을 수정할 수는 없다.     │
// │ (2) 나머지 중 하나라도 켜지면 read 가 켜진다.                                    │
// │ (3) 그룹 리소스의 권한 = 자식(페이지)들의 **합집합**.                              │
// │     → 그룹은 실제 화면이 아니라 메뉴 묶음이다. 자식이 전부 read=false 면 그룹도       │
// │       read=false 가 되고, 사이드바에서 그룹째 사라진다(AppShell).                  │
// │ 모든 변경(withXxx)·모든 로드(normalizeMatrix)가 enforceMatrix 를 통과하므로         │
// │ 저장값이 모순 상태로 남는 경로가 없다. UI 는 규칙을 '보여줄' 뿐 강제하지 않는다.       │
// └────────────────────────────────────────────────────────────────────────────┘
import { NAV_SECTIONS } from '../layout/nav-config';
import type { FeatureKey, PermissionMap } from './feature-registry';

/* ── 액션 ────────────────────────────────────────────────────────────────── */

const PERMISSION_ACTIONS = ['read', 'create', 'update', 'remove', 'export'] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

interface ActionMeta {
  readonly key: PermissionAction;
  readonly label: string;
  readonly description: string;
}

export const ACTION_META: readonly ActionMeta[] = [
  { key: 'read', label: '조회', description: '메뉴 노출 + 목록/상세 조회' },
  { key: 'create', label: '등록', description: '신규 생성' },
  { key: 'update', label: '수정', description: '기존 항목 변경' },
  { key: 'remove', label: '삭제', description: '항목 삭제' },
  { key: 'export', label: '내보내기', description: 'CSV/엑셀 다운로드' },
];

/** read 를 뺀 나머지 — 의존 규칙 (1)(2)의 대상 */
const WRITE_ACTIONS: readonly PermissionAction[] = PERMISSION_ACTIONS.filter(
  (action) => action !== 'read',
);

/* ── 리소스 (nav-config 파생) ────────────────────────────────────────────── */

export type ResourceId = string;

export interface PermissionResource {
  readonly id: ResourceId;
  readonly label: string;
  /** 그룹이면 하위 메뉴, 잎/단독이면 빈 배열 */
  readonly children: readonly PermissionResource[];
}

/** 사이드바 잎(라우트) → 리소스 id. AppShell 이 잎 가시성 판정에 쓴다 */
export function navPageResourceId(to: string): ResourceId {
  return `page:${to}`;
}

/** 사이드바 가지(basePath) → 리소스 id. AppShell 이 그룹 가시성 판정에 쓴다 */
export function navGroupResourceId(basePath: string): ResourceId {
  return `group:${basePath}`;
}

function buildResources(): readonly PermissionResource[] {
  const resources: PermissionResource[] = [];

  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      const item = entry.item;

      if (item.kind === 'leaf') {
        // 최상위 잎(대시보드) — 자식이 없는 단독 행
        resources.push({ id: navPageResourceId(item.to), label: item.label, children: [] });
        continue;
      }

      resources.push({
        id: navGroupResourceId(item.basePath),
        label: item.label,
        children: item.children.map((leaf) => ({
          id: navPageResourceId(leaf.to),
          label: leaf.label,
          children: [],
        })),
      });
    }
  }

  return resources;
}

/** 매트릭스의 행 — 최상위(그룹 14개 + 단독 잎). 자식은 각 항목의 children */
export const PERMISSION_RESOURCES: readonly PermissionResource[] = buildResources();

/**
 * 사람이 직접 켜고 끄는 리소스 = 페이지(잎) + 단독 잎.
 * 그룹은 자식의 합집합으로 **파생**되므로 여기에 없다.
 */
const EDITABLE_RESOURCES: readonly PermissionResource[] = PERMISSION_RESOURCES.flatMap(
  (resource) => (resource.children.length === 0 ? [resource] : resource.children),
);

/** 그룹 + 자식 + 단독 — 매트릭스가 값을 갖는 모든 id */
const ALL_RESOURCES: readonly PermissionResource[] = PERMISSION_RESOURCES.flatMap((resource) => [
  resource,
  ...resource.children,
]);

/** nav-config 의 NavEntry.permission(FeatureKey) → 그 항목의 최상위 리소스 id */
const MENU_KEY_TO_RESOURCE: ReadonlyMap<FeatureKey, ResourceId> = (() => {
  const map = new Map<FeatureKey, ResourceId>();
  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      const item = entry.item;
      map.set(
        entry.permission,
        item.kind === 'leaf' ? navPageResourceId(item.to) : navGroupResourceId(item.basePath),
      );
    }
  }
  return map;
})();

/** 레거시 평면 키(menu.*)를 새 리소스로 잇는다 — isEnabled('menu.users') 호환의 근거 */
export function menuResourceIdFor(key: FeatureKey): ResourceId | null {
  return MENU_KEY_TO_RESOURCE.get(key) ?? null;
}

/* ── 매트릭스 ────────────────────────────────────────────────────────────── */

type ResourceGrant = Readonly<Record<PermissionAction, boolean>>;

/** resourceId → 액션 5종의 on/off */
export type PermissionMatrix = Readonly<Record<ResourceId, ResourceGrant>>;

function createGrant(enabled: boolean): ResourceGrant {
  return Object.fromEntries(
    PERMISSION_ACTIONS.map((action) => [action, enabled]),
  ) as unknown as ResourceGrant;
}

const GRANT_OFF: ResourceGrant = createGrant(false);

function grantOf(matrix: PermissionMatrix, resourceId: ResourceId): ResourceGrant {
  return matrix[resourceId] ?? GRANT_OFF;
}

export function isActionOn(
  matrix: PermissionMatrix,
  resourceId: ResourceId,
  action: PermissionAction,
): boolean {
  return grantOf(matrix, resourceId)[action];
}

function setGrantAction(
  grant: ResourceGrant,
  action: PermissionAction,
  enabled: boolean,
): ResourceGrant {
  const next: Record<PermissionAction, boolean> = { ...grant };
  next[action] = enabled;
  return next;
}

/**
 * 의존 규칙 (1)(2)를 적용한 액션 변경 — 잎 리소스 한 칸의 유일한 변경 경로.
 * - read 를 끄면 나머지 4개가 함께 꺼진다
 * - 나머지 중 하나를 켜면 read 가 함께 켜진다
 */
function grantWithAction(
  grant: ResourceGrant,
  action: PermissionAction,
  enabled: boolean,
): ResourceGrant {
  if (action === 'read') return enabled ? setGrantAction(grant, 'read', true) : GRANT_OFF;
  const next = setGrantAction(grant, action, enabled);
  return enabled ? setGrantAction(next, 'read', true) : next;
}

/**
 * 저장값이 모순이면(read=false 인데 수정=true) **더 좁은 쪽으로** 되돌린다.
 * 최소 권한 원칙 — 조회 권한이 없는 역할에 쓰기 권한을 자동으로 부여하지 않는다.
 */
function enforceGrant(grant: ResourceGrant): ResourceGrant {
  if (grant.read) return grant;
  return WRITE_ACTIONS.some((action) => grant[action]) ? GRANT_OFF : grant;
}

function unionGrants(grants: readonly ResourceGrant[]): ResourceGrant {
  const next: Record<PermissionAction, boolean> = { ...GRANT_OFF };
  for (const grant of grants) {
    for (const action of PERMISSION_ACTIONS) {
      if (grant[action]) next[action] = true;
    }
  }
  return next;
}

/**
 * 매트릭스 불변식 강제 — 모든 변경·로드가 반드시 이 함수를 통과한다.
 * (1)(2) 잎마다 read 의존 규칙 / (3) 그룹 = 자식의 합집합.
 */
function enforceMatrix(matrix: PermissionMatrix): PermissionMatrix {
  const next: Record<ResourceId, ResourceGrant> = {};

  for (const resource of PERMISSION_RESOURCES) {
    if (resource.children.length === 0) {
      next[resource.id] = enforceGrant(grantOf(matrix, resource.id));
      continue;
    }

    const childGrants: ResourceGrant[] = [];
    for (const child of resource.children) {
      const grant = enforceGrant(grantOf(matrix, child.id));
      next[child.id] = grant;
      childGrants.push(grant);
    }
    next[resource.id] = unionGrants(childGrants);
  }

  return next;
}

export function createMatrix(enabled: boolean): PermissionMatrix {
  const matrix: Record<ResourceId, ResourceGrant> = {};
  for (const resource of ALL_RESOURCES) matrix[resource.id] = createGrant(enabled);
  return enforceMatrix(matrix);
}

/** 조회만 허용 — '뷰어' 역할의 기본값 */
export function createReadOnlyMatrix(): PermissionMatrix {
  const matrix: Record<ResourceId, ResourceGrant> = {};
  for (const resource of ALL_RESOURCES) {
    matrix[resource.id] = grantWithAction(GRANT_OFF, 'read', true);
  }
  return enforceMatrix(matrix);
}

/* ── 변경 (전부 enforceMatrix 를 통과한다) ───────────────────────────────── */

function findResource(resourceId: ResourceId): PermissionResource | null {
  return ALL_RESOURCES.find((resource) => resource.id === resourceId) ?? null;
}

/**
 * 한 리소스의 한 액션을 바꾼다.
 * 그룹 행이면 **자식 전체**에 같은 액션을 적용한다 (부모 체크박스 = 자식 일괄 토글).
 */
export function withResourceAction(
  matrix: PermissionMatrix,
  resourceId: ResourceId,
  action: PermissionAction,
  enabled: boolean,
): PermissionMatrix {
  const resource = findResource(resourceId);
  if (resource === null) return matrix;

  const targets = resource.children.length === 0 ? [resource] : resource.children;
  const next: Record<ResourceId, ResourceGrant> = { ...matrix };
  for (const target of targets) {
    next[target.id] = grantWithAction(grantOf(matrix, target.id), action, enabled);
  }
  return enforceMatrix(next);
}

/** 한 액션을 모든 리소스에 (열 전체선택) */
export function withActionForAll(
  matrix: PermissionMatrix,
  action: PermissionAction,
  enabled: boolean,
): PermissionMatrix {
  const next: Record<ResourceId, ResourceGrant> = { ...matrix };
  for (const resource of EDITABLE_RESOURCES) {
    next[resource.id] = grantWithAction(grantOf(matrix, resource.id), action, enabled);
  }
  return enforceMatrix(next);
}

/** 모든 액션 × 모든 리소스 ('전체' 행) */
export function withAllPermissions(enabled: boolean): PermissionMatrix {
  return createMatrix(enabled);
}

/* ── 조회 (UI 의 3상태 계산) ─────────────────────────────────────────────── */

type TriState = 'on' | 'off' | 'mixed';

function triStateOf(values: readonly boolean[]): TriState {
  if (values.length === 0) return 'off';
  if (values.every((value) => value)) return 'on';
  return values.some((value) => value) ? 'mixed' : 'off';
}

/** 그룹 행의 체크박스 — 자식 전부 ON → on / 일부 → mixed / 전부 OFF → off */
export function groupActionState(
  matrix: PermissionMatrix,
  resource: PermissionResource,
  action: PermissionAction,
): TriState {
  if (resource.children.length === 0) {
    return isActionOn(matrix, resource.id, action) ? 'on' : 'off';
  }
  return triStateOf(resource.children.map((child) => isActionOn(matrix, child.id, action)));
}

/** 열 헤더의 전체선택 — 그 액션이 모든 (편집 가능) 리소스에서 켜졌는가 */
export function columnState(matrix: PermissionMatrix, action: PermissionAction): TriState {
  return triStateOf(EDITABLE_RESOURCES.map((resource) => isActionOn(matrix, resource.id, action)));
}

/** '전체' 행의 마스터 체크박스 — 모든 액션 × 모든 리소스 */
export function matrixState(matrix: PermissionMatrix): TriState {
  const values = EDITABLE_RESOURCES.flatMap((resource) =>
    PERMISSION_ACTIONS.map((action) => isActionOn(matrix, resource.id, action)),
  );
  return triStateOf(values);
}

/** 접기/펼치기 기본값 — 권한이 하나라도 켜진 그룹은 펼쳐서 보여준다 */
export function hasAnyGrant(matrix: PermissionMatrix, resource: PermissionResource): boolean {
  const targets = resource.children.length === 0 ? [resource] : resource.children;
  return targets.some((target) =>
    PERMISSION_ACTIONS.some((action) => isActionOn(matrix, target.id, action)),
  );
}

/* ── 저장값 방어 · 마이그레이션 ──────────────────────────────────────────── */

/** 저장된 JSON → 매트릭스. 모르는 id·값은 버리고, 빠진 리소스는 전부 OFF 로 채운다 */
export function normalizeMatrix(raw: unknown): PermissionMatrix {
  if (typeof raw !== 'object' || raw === null) return createMatrix(false);

  const source = raw as Record<string, unknown>;
  const matrix: Record<ResourceId, ResourceGrant> = {};

  for (const resource of ALL_RESOURCES) {
    const rawGrant = source[resource.id];
    if (typeof rawGrant !== 'object' || rawGrant === null) {
      matrix[resource.id] = GRANT_OFF;
      continue;
    }

    const grantSource = rawGrant as Record<string, unknown>;
    const grant: Record<PermissionAction, boolean> = { ...GRANT_OFF };
    for (const action of PERMISSION_ACTIONS) {
      grant[action] = grantSource[action] === true;
    }
    matrix[resource.id] = grant;
  }

  return enforceMatrix(matrix);
}

/**
 * 마이그레이션 — 재설계 이전의 평면 맵(menu.* boolean)을 매트릭스로 흡수한다.
 *
 * 옛 모델에서 menu.users=true 는 '사용자 관리 그룹과 그 하위 메뉴가 전부 보인다' 는 뜻이었다.
 * 그래서 그룹과 **모든 자식**의 read 를 켠다 — 사용자가 보던 메뉴가 그대로 유지된다.
 * 나머지 액션(등록/수정/삭제/내보내기)은 옛 모델에 존재하지 않았으므로 켜지 않는다.
 */
export function matrixFromLegacyPermissions(legacy: PermissionMap): PermissionMatrix {
  const matrix: Record<ResourceId, ResourceGrant> = {};
  for (const resource of ALL_RESOURCES) matrix[resource.id] = GRANT_OFF;

  const readOn = grantWithAction(GRANT_OFF, 'read', true);

  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      if (!legacy[entry.permission]) continue;

      const item = entry.item;
      if (item.kind === 'leaf') {
        matrix[navPageResourceId(item.to)] = readOn;
        continue;
      }

      matrix[navGroupResourceId(item.basePath)] = readOn;
      for (const leaf of item.children) matrix[navPageResourceId(leaf.to)] = readOn;
    }
  }

  return enforceMatrix(matrix);
}
