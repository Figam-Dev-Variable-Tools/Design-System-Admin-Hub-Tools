/**
 * Design System/Templates/Users/Permissions — 권한 관리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Users`(사용자 관리)다 — 실화면 라우트는 /users/roles 이고
 * packages/ui/pages/_data/pages.ts 의 Users 그룹에 `['/users/roles', '권한 관리', 'Roles']` 로 있다.
 * (실제 화면명은 'Roles' 지만 화면의 본질은 역할×권한 매트릭스라 스토리명은 Permissions 로 둔다 —
 *  과제 지정 규약 `Design System/Templates/<메뉴>/Permissions`.)
 *
 * 대응 실화면: apps/admin/src/pages/permissions/PermissionsPage.tsx 와 그 하위 조립
 *   (RolePanel · RoleHeaderCard · PermissionMatrixTable · DashboardWidgetsCard · RoleFormModal).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 역할 목록 패널(FilterRail)  → Panel(notice 슬롯에 안내문 3문단)
 *   목록 항목(선택/자물쇠/적용중 배지) → 로컬 버튼 + Icon(lock) + StatusBadge('적용 중')
 *   추가·수정·삭제 액션               → Button(ghost) + Icon(plus·pencil·trash)
 *   역할 헤더 카드                    → Card + 로컬 제목 + Button('이 역할 적용') / StatusBadge('현재 적용 중')
 *   데이터 접근 범위                  → SelectField
 *   권한 매트릭스(리소스×액션)         → TriStateCheckbox + triStateProps (그룹행 3상태·열 전체선택·마스터)
 *   대시보드 위젯                     → Checkbox(위젯별) + TriStateCheckbox(전체 선택)
 *   역할 생성/이름변경 모달           → Modal + TextField
 *   역할 삭제 확인                    → ConfirmDialog
 *
 * [모델이 규칙을 갖는다] 조회를 끄면 나머지 액션이 함께 꺼지고, 다른 액션을 켜면 조회가 켜진다 —
 * 실화면은 shared/permissions/resources.ts 가 강제한다. 여기서는 그 규칙을 스토리 로컬 모델로 미러한다
 * (신규 DS 아님 — 순수 상태 계산). 그룹 행 = 자식의 3상태 합집합.
 *
 * [DS 갭 메모] 리소스×액션 매트릭스 표는 대응 DS 조직(Table 은 행-모델 표라 접기/펼치기 매트릭스에 맞지
 * 않는다)이 없어, 토큰만 쓴 로컬 <table> 골격에 DS TriStateCheckbox 를 얹어 미러한다(실화면
 * PermissionMatrixTable 도 같은 방식의 앱 로컬 레이아웃이다).
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Icon,
  Modal,
  Panel,
  SelectField,
  StatusBadge,
  TextField,
  TriStateCheckbox,
  cssVar,
  triStateProps,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Users/Permissions',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ────────────────────────────────────────────────────────────────────────────
 * 액션 · 리소스 모델 (실화면 shared/permissions/resources.ts 를 축약해 인라인)
 * ──────────────────────────────────────────────────────────────────────────── */

type PermissionAction = 'read' | 'create' | 'update' | 'remove' | 'export';

const ACTION_META: readonly {
  readonly key: PermissionAction;
  readonly label: string;
  readonly description: string;
}[] = [
  { key: 'read', label: '조회', description: '메뉴 노출 + 목록/상세 조회' },
  { key: 'create', label: '등록', description: '신규 생성' },
  { key: 'update', label: '수정', description: '기존 항목 변경' },
  { key: 'remove', label: '삭제', description: '항목 삭제' },
  { key: 'export', label: '내보내기', description: 'CSV/엑셀 다운로드' },
];

const ACTIONS: readonly PermissionAction[] = ACTION_META.map((meta_) => meta_.key);

interface DemoResource {
  readonly id: string;
  readonly label: string;
  /** 그룹이면 자식 리소스, 잎/단독이면 빈 배열 */
  readonly children: readonly DemoResource[];
}

/** nav-config 파생 리소스의 대표 부분집합 (실화면은 nav 트리 전체를 파생한다) */
const RESOURCES: readonly DemoResource[] = [
  { id: 'page:/dashboard', label: '대시보드', children: [] },
  {
    id: 'group:/users',
    label: '사용자 관리',
    children: [
      { id: 'page:/users/members', label: '회원 관리', children: [] },
      { id: 'page:/users/settings', label: '고객 설정', children: [] },
      { id: 'page:/users/admins', label: '관리자 관리', children: [] },
      { id: 'page:/users/roles', label: '권한 관리', children: [] },
    ],
  },
  {
    id: 'group:/content',
    label: '콘텐츠 관리',
    children: [
      { id: 'page:/content/notices', label: '공지사항', children: [] },
      { id: 'page:/content/faq', label: 'FAQ', children: [] },
      { id: 'page:/content/popups', label: '팝업 관리', children: [] },
    ],
  },
  {
    id: 'group:/products',
    label: '상품 관리',
    children: [
      { id: 'page:/products', label: '상품', children: [] },
      { id: 'page:/products/categories', label: '카테고리', children: [] },
      { id: 'page:/products/coupons', label: '쿠폰', children: [] },
    ],
  },
  {
    id: 'group:/settings',
    label: '시스템 설정',
    children: [
      { id: 'page:/settings/site', label: '사이트 설정', children: [] },
      { id: 'page:/settings/api-keys', label: 'API Key 설정', children: [] },
    ],
  },
];

type Grant = Readonly<Record<PermissionAction, boolean>>;
type Matrix = Readonly<Record<string, Grant>>;
type TriState = 'on' | 'off' | 'mixed';

const GRANT_OFF: Grant = {
  read: false,
  create: false,
  update: false,
  remove: false,
  export: false,
};

/** 편집 단위 = 잎(페이지) + 단독 잎. 그룹은 자식의 합집합으로 파생되므로 여기 없다 */
const EDITABLE: readonly DemoResource[] = RESOURCES.flatMap((resource) =>
  resource.children.length === 0 ? [resource] : resource.children,
);

/** 의존 규칙 (1)(2) — read 를 끄면 전부 꺼지고, 쓰기를 켜면 read 가 함께 켜진다 */
function grantWithAction(grant: Grant, action: PermissionAction, enabled: boolean): Grant {
  if (action === 'read') return enabled ? { ...grant, read: true } : GRANT_OFF;
  const next = { ...grant, [action]: enabled };
  return enabled ? { ...next, read: true } : next;
}

function triOf(values: readonly boolean[]): TriState {
  if (values.length === 0) return 'off';
  if (values.every((value) => value)) return 'on';
  return values.some((value) => value) ? 'mixed' : 'off';
}

function grantOf(matrix: Matrix, id: string): Grant {
  return matrix[id] ?? GRANT_OFF;
}

/** 그룹 행 체크박스 — 자식 전부 ON→on / 일부→mixed / 전부 OFF→off */
function groupActionState(
  matrix: Matrix,
  resource: DemoResource,
  action: PermissionAction,
): TriState {
  if (resource.children.length === 0) return grantOf(matrix, resource.id)[action] ? 'on' : 'off';
  return triOf(resource.children.map((child) => grantOf(matrix, child.id)[action]));
}

function columnState(matrix: Matrix, action: PermissionAction): TriState {
  return triOf(EDITABLE.map((resource) => grantOf(matrix, resource.id)[action]));
}

function masterState(matrix: Matrix): TriState {
  return triOf(
    EDITABLE.flatMap((resource) => ACTIONS.map((action) => grantOf(matrix, resource.id)[action])),
  );
}

function hasAnyGrant(matrix: Matrix, resource: DemoResource): boolean {
  const targets = resource.children.length === 0 ? [resource] : resource.children;
  return targets.some((target) => ACTIONS.some((action) => grantOf(matrix, target.id)[action]));
}

/* ── 데모 매트릭스 빌더 ─────────────────────────────────────────────────────── */

/** 리소스별 부여할 액션 집합을 함수로 받아 매트릭스를 만든다 */
function buildMatrix(grantsFor: (id: string) => readonly PermissionAction[]): Matrix {
  const matrix: Record<string, Grant> = {};
  for (const resource of EDITABLE) {
    let grant = GRANT_OFF;
    for (const action of grantsFor(resource.id)) grant = grantWithAction(grant, action, true);
    matrix[resource.id] = grant;
  }
  return matrix;
}

const ALL_ACTIONS: readonly PermissionAction[] = ACTIONS;

/** 전부 OFF 매트릭스 — 폴백 */
const GRANT_OFF_MATRIX: Matrix = buildMatrix(() => []);

/** 운영자 — 사용자/상품은 넓게, 콘텐츠/설정은 조회 위주 → 열·그룹에 mixed 가 나온다 */
const OPERATOR_MATRIX: Matrix = buildMatrix((id) => {
  if (id === 'page:/dashboard') return ['read'];
  if (id.startsWith('page:/users')) return ALL_ACTIONS;
  if (id.startsWith('page:/products')) return ['read', 'create', 'update'];
  if (id.startsWith('page:/content'))
    return id === 'page:/content/notices' ? ['read', 'create', 'update'] : ['read'];
  return ['read']; // 설정
});

/** 뷰어 — 전 리소스 조회만 */
const VIEWER_MATRIX: Matrix = buildMatrix(() => ['read']);

/** 슈퍼어드민 — 전 권한(시스템 역할이라 화면에서 잠근다) */
const SUPER_MATRIX: Matrix = buildMatrix(() => ALL_ACTIONS);

/* ── 대시보드 위젯 ──────────────────────────────────────────────────────────── */

const WIDGET_META: readonly { readonly key: string; readonly label: string }[] = [
  { key: 'todo', label: '할 일' },
  { key: 'sales', label: '매출 요약' },
  { key: 'visitors', label: '방문자' },
  { key: 'orders', label: '주문 현황' },
  { key: 'members', label: '신규 회원' },
  { key: 'inquiries', label: '문의 현황' },
];
type WidgetMap = Readonly<Record<string, boolean>>;
const WIDGETS_ALL: WidgetMap = Object.fromEntries(WIDGET_META.map((meta_) => [meta_.key, true]));
const WIDGETS_SOME: WidgetMap = {
  ...WIDGETS_ALL,
  orders: false,
  inquiries: false,
};

/* ── 역할 ───────────────────────────────────────────────────────────────────── */

type RoleScope = 'all' | 'department' | 'own';
const SCOPE_META: readonly {
  readonly key: RoleScope;
  readonly label: string;
  readonly description: string;
}[] = [
  { key: 'all', label: '전체', description: '모든 데이터를 조회·처리할 수 있어요.' },
  { key: 'department', label: '소속 부서', description: '자신이 속한 부서의 데이터만 다뤄요.' },
  { key: 'own', label: '본인', description: '자신이 만든 데이터만 다뤄요.' },
];

interface DemoRole {
  readonly id: string;
  readonly name: string;
  readonly system: boolean;
  readonly scope: RoleScope;
  readonly matrix: Matrix;
  readonly widgets: WidgetMap;
}

const ROLES: readonly DemoRole[] = [
  {
    id: 'role-super-admin',
    name: '슈퍼어드민(전체권한)',
    system: true,
    scope: 'all',
    matrix: SUPER_MATRIX,
    widgets: WIDGETS_ALL,
  },
  {
    id: 'role-operator',
    name: '운영자',
    system: false,
    scope: 'all',
    matrix: OPERATOR_MATRIX,
    widgets: WIDGETS_SOME,
  },
  {
    id: 'role-viewer',
    name: '뷰어',
    system: false,
    scope: 'own',
    matrix: VIEWER_MATRIX,
    widgets: WIDGETS_ALL,
  },
];

const ACTIVE_ROLE_ID = 'role-operator';

const SYSTEM_ROLE_REASON =
  '슈퍼어드민(전체권한)은 시스템 역할이라 이름 변경·삭제·권한 수정을 할 수 없어요. 항상 모든 리소스의 모든 액션을 가져요.';

/* ────────────────────────────────────────────────────────────────────────────
 * 스타일 (토큰·rem 만)
 * ──────────────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const cardTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const lockStyle: CSSProperties = {
  display: 'inline-flex',
  color: cssVar('color.text.muted'),
};

/* 좌측 패널 목록 */
const navHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
  paddingLeft: cssVar('space.2'),
};

const actionsBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
  paddingBottom: cssVar('space.2'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

function roleItemStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: cssVar('space.2'),
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderRadius: cssVar('radius.md'),
    borderStyle: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    ...typography('typography.label.md'),
    background: active ? cssVar('color.feedback.info.surface') : 'transparent',
    color: active ? cssVar('color.feedback.info.text') : cssVar('color.text.muted'),
  };
}

const roleNameStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/* 역할 헤더 카드 */
const scopeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const scopeLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const scopeSelectWrapStyle: CSSProperties = {
  minWidth: `calc(${cssVar('space.6')} * 5)`,
};

/* 매트릭스 표 */
const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const tableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  minWidth: `calc(${cssVar('space.6')} * 20)`,
};

const thBaseStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
};

const resourceHeadStyle: CSSProperties = {
  ...thBaseStyle,
  textAlign: 'left',
  width: `calc(${cssVar('space.6')} * 8)`,
};

const actionHeadStyle: CSSProperties = {
  ...thBaseStyle,
  textAlign: 'center',
  verticalAlign: 'bottom',
};

const actionHeadLabelStyle: CSSProperties = {
  display: 'block',
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  color: cssVar('color.text.default'),
};

const actionHeadHintStyle: CSSProperties = {
  display: 'block',
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  whiteSpace: 'nowrap',
};

const cellStyle: CSSProperties = {
  textAlign: 'center',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.subtle'),
};

function nameCellStyle(kind: 'group' | 'child'): CSSProperties {
  return {
    ...cellStyle,
    textAlign: 'left',
    paddingLeft:
      kind === 'child' ? `calc(${cssVar('space.6')} + ${cssVar('space.2')})` : cssVar('space.2'),
    fontWeight:
      kind === 'group'
        ? cssVar('primitive.typography.font-weight.bold')
        : cssVar('primitive.typography.font-weight.regular'),
  };
}

const nameRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const disclosureStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: cssVar('color.text.muted'),
  cursor: 'pointer',
};

/* 위젯 그리드 */
const widgetGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ────────────────────────────────────────────────────────────────────────────
 * 좌측 역할 목록 패널 (실화면 RolePanel → DS Panel)
 * ──────────────────────────────────────────────────────────────────────────── */

function RolePanel({
  roles,
  selectedRoleId,
  activeRoleId,
  systemReasonId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  roles: readonly DemoRole[];
  selectedRoleId: string;
  activeRoleId: string;
  systemReasonId: string;
  onSelect: (roleId: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const selected = roles.find((role) => role.id === selectedRoleId) ?? null;
  const locked = selected === null || selected.system;

  return (
    <Panel
      notice={
        <>
          <p id={systemReasonId} style={hintStyle}>
            {SYSTEM_ROLE_REASON}
          </p>
          <p style={hintStyle}>
            '적용 중' 역할의 권한이 곧 이 관리자 앱의 유효 권한이에요. 조회를 끄면 사이드바의 메뉴가
            즉시 사라져요.
          </p>
          <p style={hintStyle}>체크는 누르는 즉시 저장돼요 — 따로 저장 버튼이 없어요.</p>
        </>
      }
    >
      <nav
        aria-label="역할 목록"
        style={{ display: 'flex', flexDirection: 'column', gap: cssVar('space.2') }}
      >
        <h2 style={navHeadingStyle}>역할</h2>

        <div style={actionsBarStyle}>
          <Button variant="ghost" size="sm" iconLeft={<Icon name="plus" />} onClick={onCreate}>
            추가
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Icon name="pencil" />}
            disabled={locked}
            {...(locked ? { 'aria-describedby': systemReasonId } : {})}
            onClick={onRename}
          >
            수정
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<Icon name="trash" />}
            disabled={locked}
            {...(locked ? { 'aria-describedby': systemReasonId } : {})}
            onClick={onDelete}
          >
            삭제
          </Button>
        </div>

        <ul style={listStyle}>
          {roles.map((role) => {
            const active = role.id === selectedRoleId;
            return (
              <li key={role.id}>
                <button
                  type="button"
                  style={roleItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onSelect(role.id)}
                >
                  <span style={roleNameStyle}>
                    <span>{role.name}</span>
                    {role.system && (
                      <span style={lockStyle} title={SYSTEM_ROLE_REASON}>
                        <Icon name="lock" size="sm" />
                      </span>
                    )}
                  </span>
                  {role.id === activeRoleId && <StatusBadge tone="info" label="적용 중" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </Panel>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 역할 헤더 카드
 * ──────────────────────────────────────────────────────────────────────────── */

function RoleHeaderCard({
  role,
  active,
  activeRoleName,
  systemReasonId,
  onActivate,
  onScopeChange,
}: {
  role: DemoRole;
  active: boolean;
  activeRoleName: string;
  systemReasonId: string;
  onActivate: () => void;
  onScopeChange: (scope: RoleScope) => void;
}) {
  const titleId = useId();
  const scopeId = useId();
  const locked = role.system;
  const scopeMeta = SCOPE_META.find((meta_) => meta_.key === role.scope) ?? SCOPE_META[0];

  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <div style={cardTitleRowStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            <span>{role.name}</span>
            {locked && (
              <span style={lockStyle} title={SYSTEM_ROLE_REASON}>
                <Icon name="lock" size="sm" />
              </span>
            )}
          </h2>
          {active ? (
            <StatusBadge tone="info" label="현재 적용 중" />
          ) : (
            <Button variant="secondary" size="sm" onClick={onActivate}>
              이 역할 적용
            </Button>
          )}
        </div>

        <div style={scopeRowStyle}>
          <label htmlFor={scopeId} style={scopeLabelStyle}>
            데이터 접근 범위
          </label>
          <div style={scopeSelectWrapStyle}>
            <SelectField
              id={scopeId}
              value={role.scope}
              disabled={locked}
              {...(locked ? { 'aria-describedby': systemReasonId } : {})}
              onChange={(event) => {
                const next = SCOPE_META.find((meta_) => meta_.key === event.target.value);
                onScopeChange(next?.key ?? 'all');
              }}
            >
              {SCOPE_META.map((meta_) => (
                <option key={meta_.key} value={meta_.key}>
                  {meta_.label}
                </option>
              ))}
            </SelectField>
          </div>
          <span style={hintStyle}>{scopeMeta?.description}</span>
        </div>

        <p style={hintStyle}>
          {active
            ? '체크를 바꾸면 즉시 저장되고, 사이드바 메뉴와 대시보드 위젯에 리로드 없이 반영돼요.'
            : `체크를 바꾸면 즉시 저장돼요. 다만 지금 적용 중인 역할은 '${activeRoleName}' 이라 이 역할의 변경은 화면에 나타나지 않아요.`}
        </p>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 권한 매트릭스 표 (TriStateCheckbox 로 그린다)
 * ──────────────────────────────────────────────────────────────────────────── */

function ResourceRows({
  resource,
  matrix,
  disabled,
  describedBy,
  onToggle,
}: {
  resource: DemoResource;
  matrix: Matrix;
  disabled: boolean;
  describedBy: string;
  onToggle: (resource: DemoResource, action: PermissionAction, enabled: boolean) => void;
}) {
  const rowId = useId();
  const isGroup = resource.children.length > 0;
  const [open, setOpen] = useState(() => hasAnyGrant(matrix, resource));
  const childRowIds = resource.children.map((_, index) => `${rowId}-${String(index)}`);

  return (
    <>
      <tr>
        <th scope="row" style={nameCellStyle('group')}>
          <span style={nameRowStyle}>
            {isGroup && (
              <button
                type="button"
                style={disclosureStyle}
                aria-expanded={open}
                aria-controls={childRowIds.join(' ')}
                onClick={() => setOpen((prev) => !prev)}
              >
                <Icon name={open ? 'chevron-down' : 'chevron-right'} size="sm" />
                <span
                  style={visuallyHidden}
                >{`${resource.label} 하위 메뉴 ${open ? '접기' : '펼치기'}`}</span>
              </button>
            )}
            <span>{resource.label}</span>
          </span>
        </th>

        {ACTION_META.map((action) => (
          <td key={action.key} style={cellStyle}>
            <TriStateCheckbox
              {...triStateProps(groupActionState(matrix, resource, action.key))}
              disabled={disabled}
              describedBy={describedBy}
              label={`${resource.label} ${action.label}`}
              onChange={(next) => onToggle(resource, action.key, next)}
            />
          </td>
        ))}
      </tr>

      {isGroup &&
        open &&
        resource.children.map((child, index) => (
          <tr key={child.id} id={childRowIds[index]}>
            <th scope="row" style={nameCellStyle('child')}>
              <span style={nameRowStyle}>
                <span>{child.label}</span>
              </span>
            </th>
            {ACTION_META.map((action) => (
              <td key={action.key} style={cellStyle}>
                <TriStateCheckbox
                  checked={grantOf(matrix, child.id)[action.key]}
                  indeterminate={false}
                  disabled={disabled}
                  describedBy={describedBy}
                  label={`${child.label} ${action.label}`}
                  onChange={(next) => onToggle(child, action.key, next)}
                />
              </td>
            ))}
          </tr>
        ))}
    </>
  );
}

function PermissionMatrixTable({
  matrix,
  disabled,
  describedBy,
  onToggleResource,
  onToggleColumn,
  onToggleAll,
}: {
  matrix: Matrix;
  disabled: boolean;
  describedBy: string;
  onToggleResource: (resource: DemoResource, action: PermissionAction, enabled: boolean) => void;
  onToggleColumn: (action: PermissionAction, enabled: boolean) => void;
  onToggleAll: (enabled: boolean) => void;
}) {
  return (
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <caption style={visuallyHidden}>
          권한 매트릭스 — 행은 메뉴 리소스, 열은 액션(조회·등록·수정·삭제·내보내기)예요. 조회를 끄면
          나머지 액션도 함께 꺼지고, 다른 액션을 켜면 조회가 함께 켜져요.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={resourceHeadStyle}>
              리소스
            </th>
            {ACTION_META.map((action) => (
              <th key={action.key} scope="col" style={actionHeadStyle}>
                <span style={actionHeadLabelStyle}>{action.label}</span>
                <span style={actionHeadHintStyle}>{action.description}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* '전체' 행 — 마스터 + 열별 전체선택 */}
          <tr>
            <th scope="row" style={nameCellStyle('group')}>
              <span style={nameRowStyle}>
                <TriStateCheckbox
                  {...triStateProps(masterState(matrix))}
                  disabled={disabled}
                  describedBy={describedBy}
                  label="모든 리소스의 모든 액션"
                  onChange={onToggleAll}
                />
                <span>전체</span>
              </span>
            </th>
            {ACTION_META.map((action) => (
              <td key={action.key} style={cellStyle}>
                <TriStateCheckbox
                  {...triStateProps(columnState(matrix, action.key))}
                  disabled={disabled}
                  describedBy={describedBy}
                  label={`모든 리소스 ${action.label}`}
                  onChange={(next) => onToggleColumn(action.key, next)}
                />
              </td>
            ))}
          </tr>

          {RESOURCES.map((resource) => (
            <ResourceRows
              key={resource.id}
              resource={resource}
              matrix={matrix}
              disabled={disabled}
              describedBy={describedBy}
              onToggle={onToggleResource}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 대시보드 위젯 카드
 * ──────────────────────────────────────────────────────────────────────────── */

function DashboardWidgetsCard({
  widgets,
  disabled,
  describedBy,
  onToggle,
  onToggleAll,
}: {
  widgets: WidgetMap;
  disabled: boolean;
  describedBy: string;
  onToggle: (key: string, enabled: boolean) => void;
  onToggleAll: (enabled: boolean) => void;
}) {
  const titleId = useId();
  const selectAllLabelId = useId();
  const onCount = WIDGET_META.filter((meta_) => widgets[meta_.key]).length;
  const state: TriState = onCount === WIDGET_META.length ? 'on' : onCount === 0 ? 'off' : 'mixed';

  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <div style={cardTitleRowStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            대시보드 위젯
          </h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: cssVar('space.2') }}>
            <TriStateCheckbox
              {...triStateProps(state)}
              disabled={disabled}
              describedBy={describedBy}
              labelledBy={selectAllLabelId}
              onChange={onToggleAll}
            />
            <span id={selectAllLabelId} style={hintStyle}>
              전체 선택
            </span>
          </span>
        </div>

        <p style={hintStyle}>
          위젯은 액션(등록·수정·삭제)이 없어 노출/숨김만 정해요. 끄면 대시보드에서 즉시 사라져요.
        </p>

        <ul style={widgetGridStyle}>
          {WIDGET_META.map((meta_) => (
            <li key={meta_.key}>
              <Checkbox
                id={`widget-${meta_.key}`}
                label={meta_.label}
                checked={widgets[meta_.key] ?? false}
                disabled={disabled}
                onChange={(event) => onToggle(meta_.key, event.target.checked)}
              />
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 화면 조립 (제어 상태는 이 Capitalized 컴포넌트가 소유)
 * ──────────────────────────────────────────────────────────────────────────── */

type DialogKind = 'create' | 'rename' | 'delete';

interface ScreenProps {
  readonly initialSelectedRoleId?: string;
  readonly initialDialog?: DialogKind | null;
}

function PermissionsScreen({
  initialSelectedRoleId = ACTIVE_ROLE_ID,
  initialDialog = null,
}: ScreenProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(initialSelectedRoleId);
  const [activeRoleId, setActiveRoleId] = useState(ACTIVE_ROLE_ID);
  const [dialog, setDialog] = useState<DialogKind | null>(initialDialog);
  const [roleName, setRoleName] = useState('');

  // 역할별 매트릭스/위젯을 로컬 상태로 들고 편집한다
  const [matrices, setMatrices] = useState<Readonly<Record<string, Matrix>>>(() =>
    Object.fromEntries(ROLES.map((role) => [role.id, role.matrix])),
  );
  const [widgetsByRole, setWidgetsByRole] = useState<Readonly<Record<string, WidgetMap>>>(() =>
    Object.fromEntries(ROLES.map((role) => [role.id, role.widgets])),
  );

  const systemReasonId = useId();
  const matrixTitleId = useId();

  const role = ROLES.find((entry) => entry.id === selectedRoleId) ?? ROLES[0];
  const roleId = role?.id ?? ROLES[0]?.id ?? '';
  const isSystem = role?.system ?? false;
  const isActive = roleId === activeRoleId;
  const matrix = matrices[roleId] ?? GRANT_OFF_MATRIX;
  const widgets = widgetsByRole[roleId] ?? {};

  const describedBy = isSystem ? systemReasonId : '';

  const toggleResource = (
    target: DemoResource,
    action: PermissionAction,
    enabled: boolean,
  ): void => {
    setMatrices((prev) => {
      const current = prev[roleId] ?? GRANT_OFF_MATRIX;
      const targets = target.children.length === 0 ? [target] : target.children;
      const next: Record<string, Grant> = { ...current };
      for (const leaf of targets)
        next[leaf.id] = grantWithAction(grantOf(current, leaf.id), action, enabled);
      return { ...prev, [roleId]: next };
    });
  };

  const toggleColumn = (action: PermissionAction, enabled: boolean): void => {
    setMatrices((prev) => {
      const current = prev[roleId] ?? GRANT_OFF_MATRIX;
      const next: Record<string, Grant> = { ...current };
      for (const leaf of EDITABLE)
        next[leaf.id] = grantWithAction(grantOf(current, leaf.id), action, enabled);
      return { ...prev, [roleId]: next };
    });
  };

  const toggleAll = (enabled: boolean): void => {
    setMatrices((prev) => ({
      ...prev,
      [roleId]: buildMatrix(() => (enabled ? ALL_ACTIONS : [])),
    }));
  };

  const toggleWidget = (key: string, enabled: boolean): void => {
    setWidgetsByRole((prev) => ({
      ...prev,
      [roleId]: { ...(prev[roleId] ?? {}), [key]: enabled },
    }));
  };

  const toggleAllWidgets = (enabled: boolean): void => {
    setWidgetsByRole((prev) => ({
      ...prev,
      [roleId]: Object.fromEntries(WIDGET_META.map((meta_) => [meta_.key, enabled])),
    }));
  };

  const closeDialog = (): void => {
    setDialog(null);
    setRoleName('');
  };

  const activeRoleName = ROLES.find((entry) => entry.id === activeRoleId)?.name ?? '';

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <RolePanel
          roles={ROLES}
          selectedRoleId={roleId}
          activeRoleId={activeRoleId}
          systemReasonId={systemReasonId}
          onSelect={setSelectedRoleId}
          onCreate={() => setDialog('create')}
          onRename={() => setDialog('rename')}
          onDelete={() => setDialog('delete')}
        />

        <div style={mainColumnStyle}>
          {role !== undefined && (
            <RoleHeaderCard
              role={role}
              active={isActive}
              activeRoleName={activeRoleName}
              systemReasonId={systemReasonId}
              onActivate={() => setActiveRoleId(roleId)}
              onScopeChange={() => {
                /* 데모 — scope 편집은 조립 밖의 책임(백엔드 저장) */
              }}
            />
          )}

          <Card aria-labelledby={matrixTitleId}>
            <div style={cardBodyStyle}>
              <h2 id={matrixTitleId} style={cardTitleStyle}>
                권한설정
              </h2>
              <p style={hintStyle}>
                {isSystem
                  ? '슈퍼어드민은 모든 리소스의 모든 액션을 가져요. 잠겨 있어 바꿀 수 없어요.'
                  : '조회를 끄면 등록·수정·삭제·내보내기도 함께 꺼져요. 반대로 등록·수정·삭제·내보내기를 켜면 조회가 함께 켜져요.'}
              </p>

              <PermissionMatrixTable
                key={roleId}
                matrix={matrix}
                disabled={isSystem}
                describedBy={describedBy}
                onToggleResource={toggleResource}
                onToggleColumn={toggleColumn}
                onToggleAll={toggleAll}
              />
            </div>
          </Card>

          <DashboardWidgetsCard
            widgets={widgets}
            disabled={isSystem}
            describedBy={describedBy}
            onToggle={toggleWidget}
            onToggleAll={toggleAllWidgets}
          />
        </div>
      </div>

      {(dialog === 'create' || dialog === 'rename') && (
        <Modal
          title={dialog === 'create' ? '역할 추가' : '역할명 수정'}
          icon={<Icon name={dialog === 'create' ? 'plus-circle' : 'pencil'} />}
          onClose={closeDialog}
          footer={
            <>
              <Button variant="secondary" onClick={closeDialog}>
                취소
              </Button>
              <Button variant="primary" onClick={closeDialog}>
                {dialog === 'create' ? '만들기' : '저장'}
              </Button>
            </>
          }
        >
          <TextField
            id="role-name"
            label="역할명"
            value={dialog === 'rename' && roleName === '' ? (role?.name ?? '') : roleName}
            placeholder="예: 콘텐츠 편집자"
            onChange={(event) => setRoleName(event.target.value)}
          />
        </Modal>
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          intent="delete"
          title="역할 삭제"
          message={
            isActive
              ? `'${role?.name ?? ''}' 은 지금 적용 중인 역할이에요. 삭제하면 남아 있는 첫 역할이 대신 적용돼요. 삭제할까요?`
              : `'${role?.name ?? ''}' 역할을 삭제할까요? 되돌릴 수 없어요.`
          }
          confirmLabel="역할 삭제"
          onCancel={closeDialog}
          onConfirm={closeDialog}
        />
      )}
    </div>
  );
}

/** 정상: 운영자 역할 선택(적용 중) — 사용자/상품 넓은 권한, 콘텐츠/설정 조회 위주(열·그룹에 mixed) */
export const Default: Story = {
  render: () => <PermissionsScreen />,
};

/** 시스템 역할: 슈퍼어드민 선택 → 전 권한 ON + 매트릭스·위젯 전체 비활성(사유 aria-describedby) */
export const SystemRoleSelected: Story = {
  render: () => <PermissionsScreen initialSelectedRoleId="role-super-admin" />,
};

/** 뷰어: 조회만 켜진 역할 — 열 전체선택이 '조회'만 on, 나머지 off */
export const ViewerRole: Story = {
  render: () => <PermissionsScreen initialSelectedRoleId="role-viewer" />,
};

/** 역할 추가 모달: 이름 입력 폼(Modal + TextField) */
export const CreateRoleDialog: Story = {
  render: () => <PermissionsScreen initialDialog="create" />,
};

/** 역할 삭제 확인: 적용 중 역할 삭제 경고(ConfirmDialog) */
export const DeleteRoleDialog: Story = {
  render: () => <PermissionsScreen initialDialog="delete" />,
};
