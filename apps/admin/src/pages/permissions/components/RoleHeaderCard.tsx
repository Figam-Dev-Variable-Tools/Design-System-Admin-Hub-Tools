// 역할 헤더 카드 — 역할명 · 적용 상태 · 데이터 접근 범위
//
// 카드/버튼/배지는 members 의 것을 재사용한다 (복제 금지).
//
// [적용 상태] '현재 적용 중' 이면 배지, 아니면 '이 역할 적용' 버튼.
// [데이터 접근 범위] 역할당 하나. 저장만 하고 실제 필터링은 백엔드가 한다.
import type { CSSProperties } from 'react';
import { useId } from 'react';

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

const activeBadgeStyle: CSSProperties = {
  ...badgeStyle,
  background: 'var(--tds-color-feedback-info-surface)',
  color: 'var(--tds-color-feedback-info-text)',
};

const titleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

const lockStyle: CSSProperties = {
  display: 'inline-flex',
  color: 'var(--tds-color-text-muted)',
};

const scopeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
  minWidth: 0,
};

const scopeSelectStyle: CSSProperties = {
  ...controlStyle(false),
  width: 'auto',
  minWidth: 'calc(var(--tds-space-6) * 5)',
};

const scopeHintStyle: CSSProperties = {
  ...hintStyle,
  minWidth: 0,
};

interface RoleHeaderCardProps {
  readonly role: Role;
  readonly active: boolean;
  readonly activeRoleName: string;
  readonly onActivate: () => void;
  readonly onScopeChange: (scope: RoleScope) => void;
  /** 슈퍼어드민 비활성 사유 문구의 id — 비활성 컨트롤이 aria-describedby 로 가리킨다 */
  readonly systemReasonId: string;
}

export function RoleHeaderCard({
  role,
  active,
  activeRoleName,
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
