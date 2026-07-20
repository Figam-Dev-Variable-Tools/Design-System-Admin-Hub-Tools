// AdminFormPage — 운영자 등록/수정 (라우트: /users/admins/new · /users/admins/:id/edit)
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 화면이 채우는 빈자리]
// 역할 모델(shared/permissions/roles.ts)은 '권한만 다룬다' 로 재설계되면서 운영자 배정을
// 스스로에게서 제거하고, "누구에게 어떤 역할을 주는지는 관리자 관리 화면의 몫" 이라고 적어 두었다.
// 그런데 그 화면은 만들어진 적이 없었다 — 역할은 있는데 배정할 곳이 없는 상태였다. 이 폼이 그 자리다.
//
// [역할 목록을 여기서 만들지 않는다] 셀렉트의 선택지는 권한 스토어의 roles 를 그대로 읽는다.
// 목록을 복제하면 역할 화면에서 만든 역할이 이 폼에 뜨지 않거나, 지운 역할이 남아 배정 가능해진다.
//
// [배선] 데이터는 공용 CRUD 프레임워크(useCrudForm + FormPageShell)가 맡는다 — 상세 로딩·404 분기·
// 저장 실패 시 입력 보존·409 충돌 다이얼로그·미저장 이탈 가드가 전부 그 안에 이미 있다.
// 이 파일이 더하는 것은 **운영자 고유의 규칙** 하나다: 자기 역할은 자기가 바꾸지 못한다(guards.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { CSSProperties } from 'react';

import { FormPageShell, useCrudForm } from '../../shared/crud';
import { usePermissions } from '../../shared/permissions/PermissionProvider';
import {
  Alert,
  alertActionRowStyle,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  hintIdOf,
  hintStyle,
  SelectField,
  TextareaField,
} from '../../shared/ui';
import { adminAdapter } from './data-source';
import { isCurrentOperator, SELF_ROLE_CHANGE_REASON } from './guards';
import { useAdminGroupsQuery } from './queries';
import { useAdminGuardContext } from './useAdminGuardContext';
import {
  ADMIN_ACCOUNT_MAX_LENGTH,
  ADMIN_DEPARTMENT_MAX_LENGTH,
  ADMIN_MEMO_MAX_LENGTH,
  ADMIN_NICKNAME_MAX_LENGTH,
  ADMIN_POSITION_MAX_LENGTH,
} from './types';
import type { AdminDraft, AdminUser } from './types';
import { adminSchema } from './validation';
import type { AdminFormValues } from './validation';
import { cssVar } from '@tds/ui';

const RESOURCE = 'admins';
const ENTITY_LABEL = '운영자';
const LIST_PATH = '/users/admins';
const UNSAVED_MESSAGE =
  '운영자 정보에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

/** 잠긴 역할 셀렉트의 사유가 붙는 곳 — aria-describedby 로 컨트롤과 잇는다 */
const ROLE_LOCK_HINT_ID = hintIdOf('admin-role');

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 6), 1fr))',
  gap: cssVar('space.4'),
};

const EMPTY: AdminFormValues = {
  nickname: '',
  account: '',
  groupId: '',
  roleId: '',
  department: '',
  position: '',
  phone: '',
  memo: '',
};

/**
 * 폼 값 → 어댑터 입력.
 *
 * 공백 정리는 저장소도 한 번 더 한다(fixtures.normalize) — 이 폼 말고 다른 경로로 들어오는 값도
 * 있을 수 있기 때문이다. 여기서 미리 터는 것은 '보이는 값과 저장되는 값이 같게' 하기 위해서다.
 */
function toInput(values: AdminFormValues): AdminDraft {
  return {
    nickname: values.nickname.trim(),
    account: values.account.trim(),
    groupId: values.groupId,
    roleId: values.roleId,
    department: values.department.trim(),
    position: values.position.trim(),
    phone: values.phone.trim(),
    memo: values.memo.trim(),
  };
}

function toValues(admin: AdminUser): AdminFormValues {
  return {
    nickname: admin.nickname,
    account: admin.account,
    groupId: admin.groupId,
    roleId: admin.roleId,
    department: admin.department,
    position: admin.position,
    phone: admin.phone,
    memo: admin.memo,
  };
}

export default function AdminFormPage() {
  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
    loaded,
  } = useCrudForm<AdminUser, AdminDraft, AdminFormValues>({
    resource: RESOURCE,
    adapter: adminAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: adminSchema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    register,
    formState: { errors },
  } = form;

  const groupsQuery = useAdminGroupsQuery();
  const groups = groupsQuery.data ?? [];
  const { roles } = usePermissions();
  const { context: guardContext } = useAdminGuardContext();

  /**
   * 자기 역할은 자기가 바꾸지 못한다 (guards.ts SELF_ROLE_CHANGE_REASON).
   *
   * [왜 폼 값이 아니라 `loaded`(서버 원본)로 판정하나] 잠금의 근거는 화면이 아니라 서버가 갖고
   * 있어야 한다. 폼의 account 값으로 판정하면, 사용자가 계정 칸을 남의 이메일로 고쳐 적는 것만으로
   * 잠금이 풀린다 — 그 뒤 자기 역할을 마음대로 올릴 수 있다. useCrudForm 이 `loaded` 를 내주는
   * 이유가 정확히 이것이다(그 훅의 주석).
   */
  const editingSelf =
    loaded !== undefined &&
    guardContext !== null &&
    isCurrentOperator(loaded, guardContext.currentAccount);

  const disabled = saving || loadingDetail;
  const roleDisabled = disabled || editingSelf;

  /** 역할 칸이 가리켜야 할 설명들 — 잠긴 사유 + 검증 오류 (없으면 undefined) */
  const roleDescribedBy =
    [
      editingSelf ? ROLE_LOCK_HINT_ID : null,
      errors.roleId !== undefined ? errorIdOf('admin-role') : null,
    ]
      .filter((id): id is string => id !== null)
      .join(' ') || undefined;

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="운영자 정보"
      description="별표(*) 항목은 필수입니다. 계정(이메일)은 로그인 아이디이자 이 운영자를 식별하는 값입니다."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailure={loadFailure}
      onRetryLoad={retryLoad}
      serverError={serverError}
      errorReference={errorReference}
      conflict={conflict}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      <div style={rowStyle}>
        <FormField
          htmlFor="admin-nickname"
          label="닉네임"
          required
          error={errors.nickname?.message}
        >
          <input
            id="admin-nickname"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.nickname !== undefined)}
            maxLength={ADMIN_NICKNAME_MAX_LENGTH}
            placeholder="예: 김운영"
            disabled={disabled}
            aria-invalid={errors.nickname !== undefined}
            aria-describedby={
              errors.nickname !== undefined ? errorIdOf('admin-nickname') : undefined
            }
            {...register('nickname')}
          />
        </FormField>

        <FormField
          htmlFor="admin-account"
          label="계정(이메일)"
          required
          error={errors.account?.message}
          hint="로그인 아이디로 쓰입니다. 이미 등록된 계정은 저장 시 거절됩니다."
        >
          <input
            id="admin-account"
            type="email"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.account !== undefined)}
            maxLength={ADMIN_ACCOUNT_MAX_LENGTH}
            placeholder="예: operator@tds.local"
            disabled={disabled}
            aria-invalid={errors.account !== undefined}
            aria-describedby={errors.account !== undefined ? errorIdOf('admin-account') : undefined}
            {...register('account')}
          />
        </FormField>
      </div>

      {/* 그룹 목록을 못 불러오면 셀렉트는 빈 채로 뜬다 — 그것을 '그룹이 없다' 로 읽지 않게 말한다 */}
      {groupsQuery.error !== null && (
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>소속 그룹 목록을 불러오지 못했습니다. 그룹을 고르려면 다시 시도해 주세요.</span>
            <Button variant="secondary" onClick={() => void groupsQuery.refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      <div style={rowStyle}>
        <FormField
          htmlFor="admin-group"
          label="소속 그룹(발신 프로필)"
          required
          error={errors.groupId?.message}
          hint="메시지 템플릿의 발신 프로필과 같은 목록입니다."
        >
          <SelectField
            id="admin-group"
            disabled={disabled || groupsQuery.isPending}
            aria-invalid={errors.groupId !== undefined}
            // [A11Y-11] '잘못됨' 만 알리고 **왜인지 말하지 않는** 컨트롤을 만들지 않는다 —
            // FormField 가 그린 오류 문구를 가리킨다
            aria-describedby={errors.groupId !== undefined ? errorIdOf('admin-group') : undefined}
            {...register('groupId')}
          >
            <option value="">{groupsQuery.isPending ? '불러오는 중…' : '그룹을 고르세요'}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          htmlFor="admin-role"
          label="역할(권한)"
          required
          error={errors.roleId?.message}
          {...(!editingSelf && { hint: '역할이 이 운영자가 할 수 있는 일을 결정합니다.' })}
        >
          <SelectField
            id="admin-role"
            disabled={roleDisabled}
            aria-invalid={errors.roleId !== undefined}
            // 이 칸은 두 가지를 동시에 말해야 할 수 있다: 잠긴 사유와 검증 오류. 하나만 남기면
            // 스크린리더가 나머지 하나를 영영 읽지 못하므로 **둘 다** 가리킨다(공백 구분).
            aria-describedby={roleDescribedBy}
            {...register('roleId')}
          >
            <option value="">역할을 고르세요</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.system ? `${role.name} · 시스템 역할` : role.name}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>

      {/* 비활성 컨트롤에는 반드시 사유가 붙는다 — 잠긴 셀렉트만 보여 주면 고장으로 읽힌다 */}
      {editingSelf && (
        <p id={ROLE_LOCK_HINT_ID} style={hintStyle}>
          {SELF_ROLE_CHANGE_REASON}
        </p>
      )}

      <div style={rowStyle}>
        <FormField htmlFor="admin-department" label="부서" error={errors.department?.message}>
          <input
            id="admin-department"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.department !== undefined)}
            maxLength={ADMIN_DEPARTMENT_MAX_LENGTH}
            placeholder="예: 운영본부"
            disabled={disabled}
            aria-invalid={errors.department !== undefined}
            aria-describedby={
              errors.department !== undefined ? errorIdOf('admin-department') : undefined
            }
            {...register('department')}
          />
        </FormField>

        <FormField htmlFor="admin-position" label="직급" error={errors.position?.message}>
          <input
            id="admin-position"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.position !== undefined)}
            maxLength={ADMIN_POSITION_MAX_LENGTH}
            placeholder="예: 팀장"
            disabled={disabled}
            aria-invalid={errors.position !== undefined}
            aria-describedby={
              errors.position !== undefined ? errorIdOf('admin-position') : undefined
            }
            {...register('position')}
          />
        </FormField>

        <FormField htmlFor="admin-phone" label="연락처" error={errors.phone?.message}>
          <input
            id="admin-phone"
            type="tel"
            inputMode="tel"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.phone !== undefined)}
            placeholder="예: 010-1234-5678"
            disabled={disabled}
            aria-invalid={errors.phone !== undefined}
            aria-describedby={errors.phone !== undefined ? errorIdOf('admin-phone') : undefined}
            {...register('phone')}
          />
        </FormField>
      </div>

      <TextareaField
        label="관리자 메모"
        value={form.watch('memo')}
        onChange={(value) => form.setValue('memo', value, { shouldDirty: true })}
        maxLength={ADMIN_MEMO_MAX_LENGTH}
        disabled={disabled}
        error={errors.memo?.message}
        placeholder="담당 업무·인수인계 등 내부 참고 사항을 기록하세요."
        rows={3}
      />
    </FormPageShell>
  );
}
