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
// [저장] localStorage (PermissionProvider). 백엔드 연동 지점:
// TODO(backend): GET /api/roles · PUT /api/roles/:id/permissions
import { useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import './permissions.css';
import { Card, CardTitle, ConfirmDialog, hintStyle, useToast } from '../../shared/ui';
import { usePermissions } from '../../shared/permissions/PermissionProvider';
// 배정 인원은 권한의 일부가 아니라 **운영자 명부의 사실**이다 — 권한 스토어는 그것을 직접 읽지
// 않고 주입된 조회기에 묻는다(shared/permissions/permission-store.ts 의 이음매 머리말).
import { roleAssigneeCountOf } from '../../shared/permissions/permission-store';
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

  const [dialog, setDialog] = useState<DialogKind | null>(null);

  const systemReasonId = useId();
  const matrixTitleId = useId();

  const isActive = selectedRoleId === activeRoleId;
  const isSystem = selectedRole.system;

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

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <RolePanel
          roles={roles}
          selectedRoleId={selectedRoleId}
          activeRoleId={activeRoleId}
          assigneeCounts={assigneeCounts}
          systemReasonId={systemReasonId}
          onSelect={selectRole}
          onCreate={() => setDialog('create')}
          onRename={() => setDialog('rename')}
          onDelete={() => setDialog('delete')}
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
              toast.success(`'${selectedRole.name}' 역할을 적용했습니다.`);
            }}
            onScopeChange={setScope}
          />

          <Card aria-labelledby={matrixTitleId}>
            <CardTitle id={matrixTitleId}>권한설정</CardTitle>

            <p style={hintStyle}>
              {isSystem
                ? '슈퍼어드민은 모든 리소스의 모든 액션을 갖습니다. 잠겨 있어 바꿀 수 없습니다.'
                : '조회를 끄면 등록·수정·삭제·내보내기도 함께 꺼집니다. 반대로 등록·수정·삭제·내보내기를 켜면 조회가 함께 켜집니다.'}
            </p>

            {/* 역할을 바꾸면 표를 다시 만든다 — 접기/펼침 기본값(권한이 켜진 그룹은 펼침)을
                새 역할 기준으로 다시 계산하기 위해서다 */}
            <PermissionMatrixTable
              key={selectedRoleId}
              matrix={selectedRole.permissions}
              disabled={isSystem}
              disabledReasonId={systemReasonId}
              onToggleAction={setResourceAction}
              onToggleColumn={setActionForAll}
              onToggleAll={setAllPermissions}
            />
          </Card>

          <DashboardWidgetsCard
            widgets={selectedRole.widgets}
            disabled={isSystem}
            disabledReasonId={systemReasonId}
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
            if (result.ok) toast.success(`'${name.trim()}' 역할을 만들었습니다.`);
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
            if (result.ok) toast.success(`역할명을 '${name.trim()}' 으로 바꿨습니다.`);
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
              ? `'${selectedRole.name}' 은 지금 적용 중인 역할입니다. 이 역할을 쓰는 운영자는 없으며, 삭제하면 남아 있는 첫 역할이 대신 적용됩니다. 삭제할까요?`
              : `'${selectedRole.name}' 역할을 삭제합니다. 이 역할을 쓰는 운영자는 없습니다. 되돌릴 수 없습니다 — 삭제할까요?`
          }
          confirmLabel="역할 삭제"
          // 역할 저장소는 localStorage(PermissionProvider)라 즉시 끝난다 — 진행 중 상태가 없다
          busy={false}
          onCancel={closeDialog}
          onConfirm={() => {
            const name = selectedRole.name;
            const result = deleteRole(selectedRoleId);
            // 실패를 성공 톤으로 알리지 않는다 (예: 마지막 남은 역할은 지울 수 없다)
            if (result.ok) toast.success(`'${name}' 역할을 삭제했습니다.`);
            else toast.error(result.error);
            closeDialog();
          }}
        />
      )}
    </div>
  );
}
