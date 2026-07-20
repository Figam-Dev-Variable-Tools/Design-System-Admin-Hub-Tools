// 좌측 역할 목록 패널
//
// 껍데기(패널 + 하단 안내문)는 공유 FilterRail 이다 — 다른 좌측 필터와 같은 한 벌.
//
// [목록은 왜 공유 FilterPanel 이 아닌가] 이 목록의 항목은 '라벨 + 건수 배지' 가 아니다:
// 시스템 역할에는 자물쇠 아이콘이 붙고, 적용 중인 역할에는 **숫자가 아닌** '적용 중' 배지가 붙는다.
// FilterPanel 은 그 둘(항목별 아이콘 · 숫자 아닌 배지)을 일부러 열어 두지 않았다 — 지금 없는 축을
// 미리 여는 대신, 이 화면에서만 필요한 항목 렌더링을 여기 남긴다. 선택 강조·hover·aria 표기는
// 공유 filterItemStyle 과 aria-pressed(A11Y-12)를 그대로 쓰므로 규칙이 갈라지지는 않는다.
//
// 시스템 역할(슈퍼어드민)을 고르면 '수정'·'삭제' 가 비활성되고,
// 그 이유는 aria-describedby 로 연결된 문구가 알려준다 (색·툴팁만으로 전달하지 않는다).
import type { CSSProperties } from 'react';

// 제목·목록·항목 + 패널 껍데기 스타일은 shared/ui 로 승격됐다 —
// 등급/그룹/운영진/역할/로그인 이력 필터가 같은 한 벌을 쓴다
import {
  badgeStyle,
  Button,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  FilterRail,
  hintStyle,
  Icon,
} from '../../../shared/ui';
import { SYSTEM_ROLE_REASON } from '../../../shared/permissions/roles';
import type { Role } from '../../../shared/permissions/roles';
import { LockIcon, PlusIcon } from '../icons';
import { cssVar } from '@tds/ui';

/**
 * 상단 액션 3개 — 아이콘 + 라벨의 ghost 버튼.
 *
 * ⚠ 하단 안내문(`filterNoticeStyle`)과 토큰 모양이 닮았지만 **다른 것**이다: 이쪽은 목록 위의
 * 액션바(border-bottom), 저쪽은 목록 아래의 안내문(border-top)이다. 합치지 않는다.
 */
const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
  paddingTop: 0,
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
};

const roleNameStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 시스템 역할의 자물쇠 — '수정 불가'를 색·비활성 말고도 알린다 */
const lockStyle: CSSProperties = {
  display: 'inline-flex',
  flexShrink: 0,
  color: cssVar('color.text.muted'),
};

/** '적용 중' 배지 — 지금 앱의 유효 권한을 내는 역할 */
const activeBadgeStyle: CSSProperties = {
  ...badgeStyle,
  background: cssVar('color.feedback.info.surface'),
  color: cssVar('color.feedback.info.text'),
};

interface RolePanelProps {
  readonly roles: readonly Role[];
  readonly selectedRoleId: string;
  readonly activeRoleId: string;
  /** 시스템 역할 비활성 사유 문구의 id — 비활성 버튼이 aria-describedby 로 가리킨다 */
  readonly systemReasonId: string;
  readonly onSelect: (roleId: string) => void;
  readonly onCreate: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export function RolePanel({
  roles,
  selectedRoleId,
  activeRoleId,
  systemReasonId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: RolePanelProps) {
  const selected = roles.find((role) => role.id === selectedRoleId) ?? null;
  const locked = selected === null || selected.system;

  return (
    <FilterRail
      notice={
        <>
          {/* 비활성 컨트롤(수정·삭제 버튼, 매트릭스 체크박스, 범위 select)이 가리키는 문구 —
              보이는 텍스트이기도 하다 (사유를 색·비활성 상태만으로 전달하지 않는다) */}
          <p id={systemReasonId} style={hintStyle}>
            {SYSTEM_ROLE_REASON}
          </p>
          <p style={hintStyle}>
            '적용 중' 역할의 권한이 곧 이 관리자 앱의 유효 권한입니다. 조회를 끄면 사이드바의 메뉴와
            하위 메뉴가 즉시 사라집니다.
          </p>
          <p style={hintStyle}>
            체크는 누르는 즉시 저장됩니다 — 따로 저장 버튼이 없습니다. 설정은 이 브라우저에
            저장되며, 열려 있는 다른 탭에도 실시간으로 반영됩니다.
          </p>
        </>
      }
    >
      <nav style={filterNavStyle} aria-label="역할 목록">
        <h2 style={filterHeadingStyle}>역할</h2>

        <div style={actionsStyle}>
          <Button variant="ghost" onClick={onCreate}>
            <PlusIcon />
            추가
          </Button>
          <Button
            variant="ghost"
            disabled={locked}
            aria-describedby={locked ? systemReasonId : undefined}
            title={locked ? SYSTEM_ROLE_REASON : undefined}
            onClick={onRename}
          >
            <Icon name="pencil" />
            수정
          </Button>
          <Button
            variant="ghost"
            disabled={locked}
            aria-describedby={locked ? systemReasonId : undefined}
            title={locked ? SYSTEM_ROLE_REASON : undefined}
            onClick={onDelete}
          >
            <Icon name="trash" />
            삭제
          </Button>
        </div>

        <ul style={filterListStyle}>
          {roles.map((role) => {
            const active = role.id === selectedRoleId;
            return (
              <li key={role.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onSelect(role.id)}
                >
                  <span style={roleNameStyle}>
                    <span>{role.name}</span>
                    {role.system && (
                      <span style={lockStyle} title={SYSTEM_ROLE_REASON}>
                        <LockIcon />
                      </span>
                    )}
                  </span>
                  {role.id === activeRoleId && <span style={activeBadgeStyle}>적용 중</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </FilterRail>
  );
}
