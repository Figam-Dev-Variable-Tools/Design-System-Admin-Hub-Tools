// 좌측 운영진 그룹 패널
//
// [그룹을 여기서 만들고 지운다] 예전 요구사항은 '운영진 그룹은 조회/필터 대상일 뿐' 이었으나,
// 운영진 그룹과 메시지 템플릿의 '발신 프로필' 이 같은 실체로 합쳐지면서(shared/domain/admin-group.ts)
// **그 실체를 만드는 화면이 필요해졌다.** 회원 관리의 그룹 필터가 이미 `footer` 슬롯에 같은 버튼을
// 달고 있으므로, 여기서도 FilterPanel 의 그 슬롯을 쓴다 — 버튼 자리를 새로 만들지 않는다.
//
// [삭제 버튼이 목록이 아니라 footer 에 있는 이유] 항목마다 휴지통을 달면 필터를 고르려다 그룹을
// 지우는 클릭이 생긴다. 필터 항목은 '고르는 것' 하나만 하고, 삭제는 **지금 고른 그룹**에 대해
// footer 에서 한다 — 무엇을 지우는지가 선택 상태로 이미 드러나 있다.
//
// 선택 항목의 시각 규칙(배경 강조 + 파란 텍스트)은 회원 목록의 등급 필터와 같다 —
// 골격은 shared/ui 의 FilterPanel/FilterRail 한 벌이고, 여기서 다시 만들지 않는다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { Button, FilterPanel, FilterRail, hintStyle } from '../../../shared/ui';
import type { FilterOption } from '../../../shared/ui';
import { GROUP_ALL } from '../types';
import type { AdminGroup, AdminGroupCounts } from '../types';
import { cssVar } from '@tds/ui';

const noticeLinkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
};

/** footer 는 버튼 둘을 나란히 받는다 — FilterPanel 이 주는 자리는 한 칸이라 여기서 나눈다 */
const footerActionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  width: '100%',
};

interface AdminGroupPanelProps {
  readonly value: string;
  readonly groups: readonly AdminGroup[];
  /** 아직 안 불러왔으면 null — 건수 자리에 '—' 를 둔다 */
  readonly counts: AdminGroupCounts | null;
  /** 전체 운영자 수 — 아직 안 불러왔으면 null */
  readonly totalAll: number | null;
  /** 삭제 대상 확인 중 — 참조 현황을 조회하는 동안 버튼을 잠근다 */
  readonly checkingDeletion: boolean;
  /**
   * 이 라우트(`/users/admins`)의 쓰기 권한.
   *
   * [왜 '부재' 인가] 잠긴 삭제 버튼('전체 운영자' 를 고른 상태·확인 중)은 **할 수는 있는데 지금
   * 이 대상에는 못 한다**는 뜻이라 남아서 이유를 말한다. 권한 없음은 그 일 자체가 내 것이
   * 아니라는 뜻이므로 컨트롤이 사라진다 (B2 명세 §9.3).
   */
  readonly canCreate: boolean;
  readonly canRemove: boolean;
  readonly onChange: (groupId: string) => void;
  readonly onCreate: () => void;
  readonly onDelete: () => void;
}

export function AdminGroupPanel({
  value,
  groups,
  counts,
  totalAll,
  checkingDeletion,
  canCreate,
  canRemove,
  onChange,
  onCreate,
  onDelete,
}: AdminGroupPanelProps) {
  const options = useMemo<readonly FilterOption<string>[]>(
    () => [
      { id: GROUP_ALL, label: '전체 운영자' },
      ...groups.map((group) => ({ id: group.id, label: `운영 - ${group.name}` })),
    ],
    [groups],
  );

  /** '전체 운영자' 는 그룹이 아니다 — 지울 대상이 없으므로 삭제 버튼을 내리지 않고 잠근다 */
  const selectedGroup = groups.find((group) => group.id === value) ?? null;

  /** '전체 운영자' 의 배지는 그룹 건수가 아니라 전체 운영자 수다 — 같은 맵에 얹어 배지 하나로 합류시킨다 */
  const badges = useMemo<Readonly<Record<string, number>> | null>(
    () => (counts === null || totalAll === null ? null : { ...counts, [GROUP_ALL]: totalAll }),
    [counts, totalAll],
  );

  return (
    <FilterRail
      notice={
        <>
          <p style={hintStyle}>
            여러 사람과 함께 사이트를 관리할 수 있어요. 믿을 수 있는 사용자 그룹에게만 조심해서 관리
            권한을 주세요.
          </p>
          <p style={hintStyle}>
            각 항목에는 알림 발신 및 수신 권한과 사이트 내 조회 및 편집 권한을 포함하고 있어요.
          </p>
          <p style={hintStyle}>
            회원가입과 관련된 설정은{' '}
            <Link
              to="/users/settings"
              style={noticeLinkStyle}
              className="tds-ui-link tds-ui-focusable"
            >
              [가입 및 그룹설정]
            </Link>{' '}
            및{' '}
            <Link
              to="/settings/oauth"
              style={noticeLinkStyle}
              className="tds-ui-link tds-ui-focusable"
            >
              [소셜 로그인 설정]
            </Link>
            을 참고하세요.
          </p>
        </>
      }
    >
      <FilterPanel
        navLabel="운영진 그룹 필터"
        heading="운영진 그룹"
        options={options}
        value={value}
        counts={badges}
        onChange={onChange}
        /*
         * [scroll 을 켜지 않는다 — 만든 것이 보여야 한다]
         * 회원 그룹 필터는 `scroll` 로 최대 10줄까지만 보이는데, 그 축은 **다른 축(등급) 아래에
         * 붙은 두 번째 축**이라 높이를 눌러야 한다. 여기는 축이 하나뿐이고, 무엇보다 이 목록은
         * 사용자가 방금 만든 것이 들어오는 곳이다. 실제로 켜 봤더니 그룹이 7개가 되는 순간
         * **새로 만든 그룹이 스크롤 아래로 잘려** '만들었는데 목록이 그대로' 로 보였다.
         * 목록이 길어져 사이드바가 늘어나는 쪽이, 방금 만든 것이 안 보이는 쪽보다 낫다.
         */
        footer={
          // 둘 다 없으면 footer 자체를 넘기지 않는다 — 빈 칸만 남기지 않는다
          canCreate || canRemove ? (
            <div style={footerActionsStyle}>
              {canCreate && (
                <Button variant="secondary" onClick={onCreate}>
                  + 새 그룹 만들기
                </Button>
              )}
              {canRemove && (
                <Button
                  variant="secondary"
                  // 고른 것이 그룹일 때만 지운다. 무엇을 지우는지 라벨이 직접 말한다 —
                  // '삭제' 한 낱말이면 눌러 보기 전에는 대상을 알 수 없다
                  disabled={selectedGroup === null || checkingDeletion}
                  onClick={onDelete}
                >
                  {selectedGroup === null
                    ? '그룹 삭제'
                    : checkingDeletion
                      ? '확인 중…'
                      : `'${selectedGroup.name}' 그룹 삭제`}
                </Button>
              )}
            </div>
          ) : undefined
        }
      />
    </FilterRail>
  );
}
