// PermissionsPage — 권한 관리 (라우트: /users/roles)
//
// 좌: 역할 목록 패널(추가/수정/삭제)
// 우: 역할 헤더(적용 상태 · 데이터 접근 범위) → 권한 매트릭스(리소스 × 액션) → 대시보드 위젯
//
// 이 화면은 **권한만** 다룬다. 어떤 운영자가 어떤 역할을 갖는지는 관리자 관리 화면의 몫이다.
//
// [즉시 저장] 저장 버튼이 없다. 체크를 바꾸면 그 자리에서 저장되고, 그 역할이 '적용 중' 이면
// 사이드바·대시보드가 리로드 없이 따라 바뀐다 (PermissionProvider 구독).
//
// [모델이 규칙을 갖는다] 조회를 끄면 나머지 액션이 함께 꺼지고, 다른 액션을 켜면 조회가 함께
// 켜진다 — shared/permissions/resources.ts 가 강제한다. 화면은 결과를 보여줄 뿐이다.
//
// [쓰기 게이팅 — 이 화면이 가장 위험한 이유]
// 여기는 **권한 모델 자신을 편집하는 화면**이다. 그런데 오랫동안 쓰기 판정을 아무도 하지 않아,
// 조회 권한만 받은 사람이 역할을 만들고 자기 역할의 매트릭스에 등록·수정·삭제를 얹을 수 있었다.
// 그러면 앱의 다른 모든 게이팅이 한 번의 클릭으로 무의미해진다(권한 상승).
//
// 이제 이 라우트의 create/update/remove 를 읽어
//   · 역할 추가·개명·삭제 버튼은 **없애고**(비활성이 아니라 부재 — B2 명세 §9.3)
//   · 매트릭스·위젯·범위는 잠그고 그 사유를 보이는 문단으로 붙인다(조회 사실은 남겨야 하므로)
// 그리고 **같은 판정을 저장소도 한다**(shared/permissions/permission-store.ts 의 roleAdminBlock) —
// 버튼만 감추고 저장 경로가 열려 있으면 막은 것이 아니다. 두 술어가 같은 리소스를 읽는다는 사실은
// route-resource.test.ts 가 고정한다.
//
// [저장] localStorage (PermissionProvider). 백엔드 연동 지점:
// TODO(backend): GET /api/roles · PUT /api/roles/:id/permissions
import { useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import './permissions.css';
import { Card, CardTitle, ConfirmDialog, hintStyle, useToast } from '../../shared/ui';
import { usePermissions } from '../../shared/permissions/PermissionProvider';
// 배정 인원은 권한의 일부가 아니라 **운영자 명부의 사실**이다 — 권한 스토어는 그것을 직접 읽지
// 않고 주입된 조회기에 묻는다(shared/permissions/permission-store.ts 의 이음매 머리말).
import {
  roleAdminDeniedReason,
  roleAssigneeCountOf,
} from '../../shared/permissions/permission-store';
import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
import { DashboardWidgetsCard } from './components/DashboardWidgetsCard';
import { PermissionMatrixTable } from './components/PermissionMatrixTable';
import { RoleFormModal } from './components/RoleFormModal';
import { RoleHeaderCard } from './components/RoleHeaderCard';
import { RolePanel } from './components/RolePanel';
import { cssVar } from '@tds/ui';

type DialogKind = 'create' | 'rename' | 'delete';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 패널은 고정 폭, 우측은 남는 폭 전부 (AdminsPage 와 같은 그리드)
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

export default function PermissionsPage() {
  const {
    roles,
    activeRole,
    activeRoleId,
    selectedRole,
    selectedRoleId,
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
  } = usePermissions();

  const toast = useToast();
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();

  const [dialog, setDialog] = useState<DialogKind | null>(null);

  const systemReasonId = useId();
  const writeReasonId = useId();
  const matrixTitleId = useId();

  const isActive = selectedRoleId === activeRoleId;
  const isSystem = selectedRole.system;
  /** 매트릭스·위젯·범위가 잠기는 두 사유. 시스템 역할 쪽이 더 구체적이라 먼저 말한다 */
  const editLocked = isSystem || !canUpdate;
  const editReasonId = isSystem ? systemReasonId : writeReasonId;

  /**
   * 역할 id → 배정 인원 (null = 확인 불가).
   *
   * 배열 대신 키 있는 Record 다 — 화면 세 곳(좌측 삭제 버튼·헤더 링크·삭제 확인 문구)이 같은
   * 숫자를 봐야 하는데, 각자 find 로 짚으면 못 찾은 자리만 다른 값으로 흐른다.
   */
  const assigneeCounts = useMemo<Readonly<Record<string, number | null>>>(
    () => Object.fromEntries(roles.map((role) => [role.id, roleAssigneeCountOf(role.id)])),
    [roles],
  );
  const selectedAssigneeCount = assigneeCounts[selectedRoleId] ?? null;

  const closeDialog = () => {
    setDialog(null);
  };

  /**
   * 팝업을 여는 것 자체가 판정을 지난다 — 팝업은 **부모의 판정을 물려받지 않는다**.
   * 버튼이 없어도 상태만 바뀌면 열리는 경로(다른 탭에서 방금 강등된 세션의 잔여 클릭)가 남기
   * 때문이다. 열리더라도 저장은 저장소가 다시 거절하지만, 열리지 않는 편이 정직하다.
   */
  const openDialog = (kind: DialogKind) => {
    const allowed = kind === 'create' ? canCreate : kind === 'rename' ? canUpdate : canRemove;
    if (!allowed) return;
    setDialog(kind);
  };

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <RolePanel
          roles={roles}
          selectedRoleId={selectedRoleId}
          activeRoleId={activeRoleId}
          assigneeCounts={assigneeCounts}
          systemReasonId={systemReasonId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canRemove={canRemove}
          onSelect={selectRole}
          onCreate={() => openDialog('create')}
          onRename={() => openDialog('rename')}
          onDelete={() => openDialog('delete')}
        />

        <div style={mainColumnStyle}>
          <RoleHeaderCard
            role={selectedRole}
            active={isActive}
            activeRoleName={activeRole.name}
            assigneeCount={selectedAssigneeCount}
            systemReasonId={systemReasonId}
            onActivate={() => {
              activateRole(selectedRoleId);
              toast.success(`'${selectedRole.name}' 역할을 적용했어요.`);
            }}
            onScopeChange={setScope}
            canUpdate={canUpdate}
            writeReasonId={writeReasonId}
          />

          <Card aria-labelledby={matrixTitleId}>
            <CardTitle id={matrixTitleId}>권한설정</CardTitle>

            <p style={hintStyle}>
              {isSystem
                ? '슈퍼어드민은 모든 리소스의 모든 액션을 가져요. 잠겨 있어 바꿀 수 없어요.'
                : '조회를 끄면 등록·수정·삭제·내보내기도 함께 꺼져요. 반대로 등록·수정·삭제·내보내기를 켜면 조회가 함께 켜져요.'}
            </p>

            {/* 사유는 색·비활성 상태가 아니라 **문장**으로 남는다 — 잠긴 체크박스들이
                aria-describedby 로 이 문단을 가리킨다. 시스템 역할 사유(좌측 패널의
                systemReasonId)와 자리를 나눠 갖는다: 둘 중 해당하는 하나만 연결된다. */}
            {!canUpdate && (
              <p id={writeReasonId} style={hintStyle}>
                {roleAdminDeniedReason('update')}
              </p>
            )}

            {/* 역할을 바꾸면 표를 다시 만든다 — 접기/펼침 기본값(권한이 켜진 그룹은 펼침)을
                새 역할 기준으로 다시 계산하기 위해서다 */}
            <PermissionMatrixTable
              key={selectedRoleId}
              matrix={selectedRole.permissions}
              disabled={editLocked}
              disabledReasonId={editReasonId}
              onToggleAction={setResourceAction}
              onToggleColumn={setActionForAll}
              onToggleAll={setAllPermissions}
            />
          </Card>

          <DashboardWidgetsCard
            widgets={selectedRole.widgets}
            disabled={editLocked}
            disabledReasonId={editReasonId}
            onToggle={setWidget}
            onToggleAll={setAllWidgets}
          />
        </div>
      </div>

      {dialog === 'create' && (
        <RoleFormModal
          mode="create"
          initialName=""
          onClose={closeDialog}
          onSubmit={(name) => {
            const result = createRole(name);
            if (result.ok) toast.success(`'${name.trim()}' 역할을 만들었어요.`);
            return result;
          }}
        />
      )}

      {dialog === 'rename' && (
        <RoleFormModal
          mode="rename"
          initialName={selectedRole.name}
          onClose={closeDialog}
          onSubmit={(name) => {
            const result = renameRole(selectedRoleId, name);
            if (result.ok) toast.success(`역할명을 '${name.trim()}' 으로 바꿨어요.`);
            return result;
          }}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          intent="delete"
          title="역할 삭제"
          /* 다이얼로그는 **배정 0명일 때만** 열린다(배정이 있으면 좌측 삭제 버튼이 잠긴다) —
             그래서 여기서 말할 것은 '아무도 이 역할을 쓰고 있지 않다' 는 사실 확인이다.
             운영진 그룹 삭제 다이얼로그가 같은 문장('이 그룹에 속한 운영자는 없으며…')을 쓴다. */
          message={
            isActive
              ? `'${selectedRole.name}' 은 지금 적용 중인 역할이에요. 이 역할을 쓰는 운영자는 없으며, 삭제하면 남아 있는 첫 역할이 대신 적용돼요. 삭제할까요?`
              : `'${selectedRole.name}' 역할을 삭제할까요? 이 역할을 쓰는 운영자는 없어요. 되돌릴 수 없어요.`
          }
          confirmLabel="역할 삭제"
          // 역할 저장소는 localStorage(PermissionProvider)라 즉시 끝난다 — 진행 중 상태가 없다
          busy={false}
          onCancel={closeDialog}
          onConfirm={() => {
            const name = selectedRole.name;
            const result = deleteRole(selectedRoleId);
            // 실패를 성공 톤으로 알리지 않는다 (예: 마지막 남은 역할은 지울 수 없다)
            if (result.ok) toast.success(`'${name}' 역할을 삭제했어요.`);
            else toast.error(result.error);
            closeDialog();
          }}
        />
      )}
    </div>
  );
}
