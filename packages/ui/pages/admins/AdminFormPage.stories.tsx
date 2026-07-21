/**
 * Design System/Templates/Admins/Admin Form — 운영자 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Admins` 다 — _data/pages.ts 의 Users 그룹에서 이 화면
 * (`/users/admins/new` · `/users/admins/:id/edit`)의 영문명은 "Admins", 스크린명은 "Admin Form" 이다.
 *
 * 대응 실화면: apps/admin/src/pages/admins/AdminFormPage.tsx — 공용 CRUD 껍데기
 * (shared/crud/FormPageShell + useCrudForm) 위에 운영자 고유 필드를 얹는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 앱 공용 FormPageShell 은 DS 로 노출돼 있지 않으므로 그 골격
 * (뒤로가기 · 제목 · 설명 · 카드 · 저장/취소 줄)을 토큰만 쓴 로컬 레이아웃으로 재현한다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록 복귀 버튼             → 토큰만 쓴 <button> + Icon(chevron-left)
 *   제목(등록/수정) + 설명     → 토큰 <h1> + <p>
 *   폼 카드 + CardTitle        → Card + 토큰 <h2>(DS Card 는 표면만 소유)
 *   닉네임·계정·부서·직급·연락처 → TextField (라벨·필수·오류를 자체 소유)
 *   소속 그룹·역할             → FormField + SelectField (라벨·필수·힌트는 FormField 가 소유)
 *   그룹 목록 조회 실패        → Alert(danger) + 다시 시도 Button
 *   관리자 메모               → TextareaField (maxLength 500)
 *   저장/취소 줄              → Button(secondary/primary)
 *
 * [운영자 고유 규칙] 자기 역할은 자기가 바꾸지 못한다(guards.ts) — 본인 수정 시 역할 셀렉트가 잠기고
 * 그 사유가 힌트로 붙는다. SelfRoleLocked 스토리가 그 상태를 재현한다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  Icon,
  Skeleton,
  SelectField,
  TextareaField,
  TextField,
} from '../../src';
import { cssVar, typography } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Design System/Templates/Admins/Admin Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 입력 길이 상한 · 선택지 (실화면 types.ts / 권한 스토어 미러) ──────────────────────────────── */

const ADMIN_NICKNAME_MAX_LENGTH = 30;
const ADMIN_ACCOUNT_MAX_LENGTH = 100;
const ADMIN_DEPARTMENT_MAX_LENGTH = 30;
const ADMIN_POSITION_MAX_LENGTH = 30;
const ADMIN_MEMO_MAX_LENGTH = 500;

/** 소속 그룹 = 메시지 템플릿의 발신 프로필 — 권한 스토어가 아니라 그룹 저장소에서 온다 */
const GROUPS: readonly { readonly id: string; readonly name: string }[] = [
  { id: 'g-super', name: '최고 관리자' },
  { id: 'g-content', name: '콘텐츠 운영' },
  { id: 'g-cs', name: '고객지원' },
];

/** 역할 선택지 — 권한 스토어의 roles 를 그대로 읽는다(목록을 복제하지 않는다) */
const ROLES: readonly { readonly id: string; readonly name: string; readonly system: boolean }[] = [
  { id: 'r-super', name: '최고 관리자', system: true },
  { id: 'r-content', name: '콘텐츠 매니저', system: false },
  { id: 'r-cs', name: '고객지원 담당', system: false },
  { id: 'r-viewer', name: '읽기 전용', system: false },
];

const SELF_ROLE_CHANGE_REASON =
  '자기 자신의 역할은 바꿀 수 없습니다. 다른 시스템 관리자에게 요청하세요.';

interface AdminFormValues {
  nickname: string;
  account: string;
  groupId: string;
  roleId: string;
  department: string;
  position: string;
  phone: string;
  memo: string;
}

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

const PREFILLED: AdminFormValues = {
  nickname: '김운영',
  account: 'operator@tds.local',
  groupId: 'g-super',
  roleId: 'r-super',
  department: '운영본부',
  position: '본부장',
  phone: '010-1234-5678',
  memo: '전사 운영 총괄. 야간 장애 1차 대응 담당(온콜 로테이션 A조).',
};

/* ── 스타일(토큰만) ──────────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.6'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  border: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  cursor: 'pointer',
  ...typography('typography.label.md'),
};

const titleBlockStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

/** 한 줄에 필드 여럿 — 좁아지면 자동으로 접힌다(실화면 rowStyle) */
const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.4'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 화면 조립 (rules-of-hooks: Decorator 화살표가 아닌 Capitalized 컴포넌트에서 useState) ────── */

type FormState = 'create' | 'edit' | 'loading' | 'self-locked' | 'groups-error';

const ROLE_LOCK_HINT_ID = 'admin-role-lock-hint';

function AdminFormScreen({ state }: { state: FormState }) {
  const isEdit = state === 'edit' || state === 'loading' || state === 'self-locked';
  const loadingDetail = state === 'loading';
  const groupsError = state === 'groups-error';
  const editingSelf = state === 'self-locked';

  const [values, setValues] = useState<AdminFormValues>(() =>
    state === 'create' || groupsError ? EMPTY : PREFILLED,
  );

  const set =
    <K extends keyof AdminFormValues>(key: K) =>
    (value: AdminFormValues[K]): void => {
      setValues((prev) => ({ ...prev, [key]: value }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    // 저장 로직은 조립 밖(useCrudForm)의 책임 — 템플릿에서는 기본 제출만 막는다
    event.preventDefault();
  };

  return (
    <div style={pageStyle}>
      <button type="button" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div style={titleBlockStyle}>
        <h1 style={pageTitleStyle}>{isEdit ? '운영자 수정' : '운영자 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 계정(이메일)은 로그인 아이디이자 이 운영자를 식별하는 값입니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>운영자 정보</h2>

            {loadingDetail ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <div style={bodyStyle}>
                <div style={rowStyle}>
                  <TextField
                    id="admin-nickname"
                    label="닉네임 *"
                    value={values.nickname}
                    maxLength={ADMIN_NICKNAME_MAX_LENGTH}
                    required
                    placeholder="예: 김운영"
                    onChange={(event) => set('nickname')(event.target.value)}
                  />
                  <TextField
                    id="admin-account"
                    label="계정(이메일) *"
                    type="email"
                    value={values.account}
                    maxLength={ADMIN_ACCOUNT_MAX_LENGTH}
                    required
                    placeholder="예: operator@tds.local"
                    onChange={(event) => set('account')(event.target.value)}
                  />
                </div>
                <p style={hintStyle}>
                  계정은 로그인 아이디로 쓰입니다. 이미 등록된 계정은 저장 시 거절됩니다.
                </p>

                {/* 그룹 목록을 못 불러오면 셀렉트는 빈 채로 뜬다 — '그룹이 없다' 로 읽지 않게 말한다 */}
                {groupsError && (
                  <Alert tone="danger">
                    <div style={alertRowStyle}>
                      <span>
                        소속 그룹 목록을 불러오지 못했습니다. 그룹을 고르려면 다시 시도해 주세요.
                      </span>
                      <Button variant="secondary">다시 시도</Button>
                    </div>
                  </Alert>
                )}

                <div style={rowStyle}>
                  <FormField
                    htmlFor="admin-group"
                    label="소속 그룹(발신 프로필)"
                    required
                    hint="메시지 템플릿의 발신 프로필과 같은 목록입니다."
                  >
                    <SelectField
                      id="admin-group"
                      value={values.groupId}
                      onChange={(event) => set('groupId')(event.target.value)}
                    >
                      <option value="">
                        {groupsError ? '불러오지 못했습니다' : '그룹을 고르세요'}
                      </option>
                      {GROUPS.map((group) => (
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
                    hint={
                      editingSelf ? undefined : '역할이 이 운영자가 할 수 있는 일을 결정합니다.'
                    }
                  >
                    <SelectField
                      id="admin-role"
                      value={values.roleId}
                      disabled={editingSelf}
                      {...(editingSelf && { 'aria-describedby': ROLE_LOCK_HINT_ID })}
                      onChange={(event) => set('roleId')(event.target.value)}
                    >
                      <option value="">역할을 고르세요</option>
                      {ROLES.map((role) => (
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
                  <TextField
                    id="admin-department"
                    label="부서"
                    value={values.department}
                    maxLength={ADMIN_DEPARTMENT_MAX_LENGTH}
                    placeholder="예: 운영본부"
                    onChange={(event) => set('department')(event.target.value)}
                  />
                  <TextField
                    id="admin-position"
                    label="직급"
                    value={values.position}
                    maxLength={ADMIN_POSITION_MAX_LENGTH}
                    placeholder="예: 팀장"
                    onChange={(event) => set('position')(event.target.value)}
                  />
                  <TextField
                    id="admin-phone"
                    label="연락처"
                    inputMode="tel"
                    value={values.phone}
                    placeholder="예: 010-1234-5678"
                    onChange={(event) => set('phone')(event.target.value)}
                  />
                </div>

                <TextareaField
                  label="관리자 메모"
                  value={values.memo}
                  maxLength={ADMIN_MEMO_MAX_LENGTH}
                  rows={3}
                  placeholder="담당 업무·인수인계 등 내부 참고 사항을 기록하세요."
                  onChange={(value) => set('memo')(value)}
                />
              </div>
            )}

            <div style={actionsStyle}>
              <Button type="button" variant="secondary">
                취소
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={loadingDetail}>
                {isEdit ? '저장' : '등록'}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

/** 등록 — 빈 폼(신규 운영자 배정). 필수 항목은 별표로 표시된다 */
export const Create: Story = {
  render: () => <AdminFormScreen state="create" />,
};

/** 수정 — 기존 운영자 값이 채워진 폼(제목 '운영자 수정' · 저장 버튼) */
export const Edit: Story = {
  render: () => <AdminFormScreen state="edit" />,
};

/** 로딩 — 수정 진입 시 상세 미도착: 카드 본문 스켈레톤 4줄(STATE-01) */
export const Loading: Story = {
  render: () => <AdminFormScreen state="loading" />,
};

/** 역할 잠김 — 본인을 수정할 때: 역할 셀렉트가 잠기고 사유가 힌트로 붙는다(guards.ts SELF_ROLE_CHANGE_REASON) */
export const SelfRoleLocked: Story = {
  render: () => <AdminFormScreen state="self-locked" />,
};

/** 그룹 로드 실패 — 소속 그룹 목록 조회 실패: 셀렉트는 빈 채로 두고 Alert(danger)로 이유를 밝힌다 */
export const GroupsError: Story = {
  render: () => <AdminFormScreen state="groups-error" />,
};
