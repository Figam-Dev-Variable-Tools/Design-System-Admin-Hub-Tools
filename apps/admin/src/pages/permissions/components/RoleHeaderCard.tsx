// 역할 헤더 카드 — 역할명 · 적용 상태 · 데이터 접근 범위
//
// 카드/버튼/배지는 members 의 것을 재사용한다 (복제 금지).
//
// [적용 상태] '현재 적용 중' 이면 배지, 아니면 '이 역할 적용' 버튼.
// [데이터 접근 범위] 역할당 하나. 저장만 하고 실제 필터링은 백엔드가 한다.
import type { CSSProperties } from 'react';
import { useId } from 'react';
import { Link } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  badgeStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  fieldLabelStyle,
  hintStyle,
} from '../../../shared/ui';
import { ROLE_SCOPE_META, SYSTEM_ROLE_REASON } from '../../../shared/permissions/roles';
import type { Role, RoleScope } from '../../../shared/permissions/roles';
import { LockIcon } from '../icons';
import { cssVar } from '@tds/ui';

const activeBadgeStyle: CSSProperties = {
  ...badgeStyle,
  background: cssVar('color.feedback.info.surface'),
  color: cssVar('color.feedback.info.text'),
};

const titleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const lockStyle: CSSProperties = {
  display: 'inline-flex',
  color: cssVar('color.text.muted'),
};

const scopeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const scopeSelectStyle: CSSProperties = {
  ...controlStyle(false),
  width: 'auto',
  minWidth: `calc(${cssVar('space.6')} * 5)`,
};

const scopeHintStyle: CSSProperties = {
  ...hintStyle,
  minWidth: 0,
};

/** 관리자 관리 목록 — 역할 필터가 URL 을 소유하므로 ?role= 로 바로 착지한다 */
const ADMINS_PATH = '/users/admins';

interface RoleHeaderCardProps {
  readonly role: Role;
  readonly active: boolean;
  readonly activeRoleName: string;
  /**
   * 이 역할을 배정받은 운영자 수 — null 이면 '확인 불가'(조회기 미배선)다.
   * 0 과 null 을 같게 그리지 않는다: '아무도 없다' 와 '모른다' 는 다음 행동이 다르다.
   */
  readonly assigneeCount: number | null;
  readonly onActivate: () => void;
  readonly onScopeChange: (scope: RoleScope) => void;
  /** 슈퍼어드민 비활성 사유 문구의 id — 비활성 컨트롤이 aria-describedby 로 가리킨다 */
  readonly systemReasonId: string;
}

export function RoleHeaderCard({
  role,
  active,
  activeRoleName,
  assigneeCount,
  onActivate,
  onScopeChange,
  systemReasonId,
}: RoleHeaderCardProps) {
  const titleId = useId();
  const scopeId = useId();

  const locked = role.system;
  const scopeMeta = ROLE_SCOPE_META.find((meta) => meta.key === role.scope) ?? ROLE_SCOPE_META[0];

  return (
    <Card aria-labelledby={titleId}>
      <CardTitle
        id={titleId}
        action={
          active ? (
            <span style={activeBadgeStyle}>현재 적용 중</span>
          ) : (
            <Button variant="secondary" onClick={onActivate}>
              이 역할 적용
            </Button>
          )
        }
      >
        <span style={titleStyle}>
          <span>{role.name}</span>
          {locked && (
            <span style={lockStyle} title={SYSTEM_ROLE_REASON}>
              <LockIcon />
            </span>
          )}
        </span>
      </CardTitle>

      {/* 이 역할이 지금 누구에게 붙어 있는가 — 권한만 다루는 화면에서 유일하게 '사람' 을 가리키는 줄.
          숫자를 보여 주는 데서 끝내지 않고 그 명단으로 보낸다(관리자 관리의 ?role= 필터가 URL 을 소유한다).
          삭제가 막히는 이유가 곧 이 숫자라, 사유를 읽은 운영자가 다음 행동을 바로 할 수 있어야 한다. */}
      <div style={scopeRowStyle}>
        <span style={fieldLabelStyle}>배정 운영자</span>
        {assigneeCount === null ? (
          <span style={scopeHintStyle}>
            운영자 명부를 확인할 수 없어 배정 인원을 셀 수 없습니다. 이 상태에서는 역할을 삭제할 수
            없습니다.
          </span>
        ) : (
          <>
            <Link
              to={`${ADMINS_PATH}?role=${encodeURIComponent(role.id)}`}
              className="tds-ui-link tds-ui-focusable"
            >
              이 역할 운영자 {formatNumber(assigneeCount)}명
            </Link>
            <span style={scopeHintStyle}>
              {assigneeCount > 0
                ? '배정된 운영자가 있는 역할은 삭제할 수 없습니다 — 먼저 이 운영자들의 역할을 바꿔 주세요.'
                : '이 역할을 쓰는 운영자가 없습니다.'}
            </span>
          </>
        )}
      </div>

      <div style={scopeRowStyle}>
        <label htmlFor={scopeId} style={fieldLabelStyle}>
          데이터 접근 범위
        </label>
        {/* TODO(backend): scope 는 저장만 한다 — 목록/상세 질의의 실제 필터링은 서버 몫이다.
            PUT /api/roles/:id  { scope } */}
        <select
          id={scopeId}
          className="tds-perm-select tds-ui-focusable"
          style={scopeSelectStyle}
          value={role.scope}
          disabled={locked}
          aria-describedby={locked ? systemReasonId : undefined}
          onChange={(event) => onScopeChange(event.target.value as RoleScope)}
        >
          {ROLE_SCOPE_META.map((meta) => (
            <option key={meta.key} value={meta.key}>
              {meta.label}
            </option>
          ))}
        </select>
        <span style={scopeHintStyle}>{scopeMeta?.description}</span>
      </div>

      <p style={hintStyle}>
        {active
          ? '체크를 바꾸면 즉시 저장되고, 사이드바 메뉴와 대시보드 위젯에 리로드 없이 그대로 반영됩니다.'
          : `체크를 바꾸면 즉시 저장됩니다. 다만 지금 적용 중인 역할은 '${activeRoleName}' 이라 이 역할의 변경은 화면에 나타나지 않습니다 — 적용하려면 '이 역할 적용'을 누르세요.`}
      </p>
    </Card>
  );
}
