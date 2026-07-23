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
import { roleDeletionBlock, SYSTEM_ROLE_REASON } from '../../../shared/permissions/roles';
import type { Role } from '../../../shared/permissions/roles';
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
  /**
   * 역할 id → 그 역할을 배정받은 운영자 수 (null = 확인 불가).
   *
   * 키 있는 Record 로 받는다 — 배열을 받아 find 로 짚으면 못 찾았을 때 **엉뚱한 역할의 숫자**로
   * 폴백하기 쉽고, 그 실수는 '0명이라 지웠는데 3명이 고아가 됐다' 로 나타난다.
   */
  readonly assigneeCounts: Readonly<Record<string, number | null>>;
  /** 시스템 역할 비활성 사유 문구의 id — 비활성 버튼이 aria-describedby 로 가리킨다 */
  readonly systemReasonId: string;
  /**
   * 이 라우트(`/users/roles`)의 쓰기 권한.
   *
   * [왜 '비활성' 이 아니라 '부재' 인가] 시스템 역할 잠금(위의 systemReasonId)은 **할 수는 있지만
   * 이 대상에는 못 한다**는 뜻이라 버튼이 남고 사유를 말한다. 권한 없음은 **애초에 이 일이
   * 내 것이 아니다**라는 뜻이므로 컨트롤 자체가 없다 — 이 앱의 규약이다(B2 명세 §9.3).
   */
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  readonly onSelect: (roleId: string) => void;
  readonly onCreate: () => void;
  readonly onRename: () => void;
  readonly onDelete: () => void;
}

export function RolePanel({
  roles,
  selectedRoleId,
  activeRoleId,
  assigneeCounts,
  systemReasonId,
  canCreate,
  canUpdate,
  canRemove,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: RolePanelProps) {
  const selected = roles.find((role) => role.id === selectedRoleId) ?? null;
  const locked = selected === null || selected.system;

  /**
   * 삭제만 사유가 하나 더 있다 — 이 역할을 든 운영자가 남아 있는가(고아 참조 방지).
   * 시스템 역할은 이미 잠겨 있으므로 그때는 배정 수를 묻지 않는다(사유가 둘이면 하나만 말한다).
   * 상품·고객센터 카테고리 삭제 버튼과 같은 관용구: **사유를 aria-label/title 에 싣는다** —
   * 비활성 상태와 색만으로 이유를 전달하지 않는다.
   */
  const deleteBlock =
    selected === null || selected.system
      ? null
      : roleDeletionBlock(selected.name, assigneeCounts[selected.id] ?? null);
  const deleteLocked = locked || deleteBlock !== null;

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
            '적용 중' 역할의 권한이 곧 이 관리자 앱의 유효 권한이에요. 조회를 끄면 사이드바의 메뉴와
            하위 메뉴가 즉시 사라져요.
          </p>
          <p style={hintStyle}>
            체크는 누르는 즉시 저장돼요 — 따로 저장 버튼이 없어요. 설정은 이 브라우저에 저장되며,
            열려 있는 다른 탭에도 실시간으로 반영돼요.
          </p>
        </>
      }
    >
      <nav style={filterNavStyle} aria-label="역할 목록">
        <h2 style={filterHeadingStyle}>역할</h2>

        {/* 셋 다 없으면 액션바 자체를 그리지 않는다 — 빈 테두리만 남기지 않는다 */}
        {(canCreate || canUpdate || canRemove) && (
          <div style={actionsStyle}>
            {canCreate && (
              <Button variant="ghost" onClick={onCreate}>
                <Icon name="plus" />
                추가
              </Button>
            )}
            {canUpdate && (
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
            )}
            {canRemove && (
              <Button
                variant="ghost"
                disabled={deleteLocked}
                aria-describedby={locked ? systemReasonId : undefined}
                // 배정 사유는 이 화면에만 있는 문장이라 보이는 문구(systemReasonId)로 가리킬 수 없다 —
                // 버튼 자신이 이름과 툴팁으로 말한다
                aria-label={deleteBlock ?? undefined}
                title={locked ? SYSTEM_ROLE_REASON : (deleteBlock ?? undefined)}
                onClick={onDelete}
              >
                <Icon name="trash" />
                삭제
              </Button>
            )}
          </div>
        )}

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
                        <Icon name="lock" />
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
