// 좌측 운영진 그룹 패널
//
// [요구사항] 회원 관리의 GroupFilter 와 달리 **'새 운영진 그룹 만들기' 버튼이 없다**.
// 운영진 그룹은 조회/필터 대상일 뿐, 이 화면에서 만들지 않는다.
//
// 선택 항목의 시각 규칙(배경 강조 + 파란 텍스트)은 회원 목록의 등급 필터와 같다 —
// 골격은 shared/ui 의 FilterPanel/FilterRail 한 벌이고, 여기서 다시 만들지 않는다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { FilterPanel, FilterRail, hintStyle } from '../../../shared/ui';
import type { FilterOption } from '../../../shared/ui';
import { GROUP_ALL } from '../types';
import type { AdminGroup, AdminGroupCounts } from '../types';

const noticeLinkStyle: CSSProperties = {
  color: 'var(--tds-color-action-primary-default)',
  textDecoration: 'none',
};

interface AdminGroupPanelProps {
  readonly value: string;
  readonly groups: readonly AdminGroup[];
  /** 아직 안 불러왔으면 null — 건수 자리에 '—' 를 둔다 */
  readonly counts: AdminGroupCounts | null;
  /** 전체 운영자 수 — 아직 안 불러왔으면 null */
  readonly totalAll: number | null;
  readonly onChange: (groupId: string) => void;
}

export function AdminGroupPanel({
  value,
  groups,
  counts,
  totalAll,
  onChange,
}: AdminGroupPanelProps) {
  const options = useMemo<readonly FilterOption<string>[]>(
    () => [
      { id: GROUP_ALL, label: '전체 운영자' },
      ...groups.map((group) => ({ id: group.id, label: `운영 - ${group.label}` })),
    ],
    [groups],
  );

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
            여러 사람과 함께 사이트를 관리할 수 있습니다. 믿을 수 있는 사용자 그룹에게만 조심해서
            관리 권한을 주세요.
          </p>
          <p style={hintStyle}>
            각 항목에는 알림 발신 및 수신 권한과 사이트 내 조회 및 편집 권한을 포함하고 있습니다.
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
      />
    </FilterRail>
  );
}
