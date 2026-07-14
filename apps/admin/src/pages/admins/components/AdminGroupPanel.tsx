// 좌측 운영진 그룹 패널 (A40 소유)
//
// [요구사항] 회원 관리의 GroupFilter 와 달리 **'새 운영진 그룹 만들기' 버튼이 없다**.
// 운영진 그룹은 조회/필터 대상일 뿐, 이 화면에서 만들지 않는다.
//
// 선택 항목의 시각 규칙(배경 강조 + 파란 텍스트)은 회원 관리의 TierFilter 와 같다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

// 제목·목록·항목 + 패널 껍데기 스타일은 shared/ui 로 승격됐다 —
// 등급/그룹/운영진/역할/로그인 이력 필터가 같은 한 벌을 쓴다
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterNoticeStyle,
  filterPanelStyle,
  hintStyle,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
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
  return (
    <aside style={filterPanelStyle}>
      <nav style={filterNavStyle} aria-label="운영진 그룹 필터">
        <h2 style={filterHeadingStyle}>운영진 그룹</h2>

        <ul style={filterListStyle}>
          <li>
            <button
              type="button"
              className="tds-ui-listitem tds-ui-focusable"
              style={filterItemStyle(value === GROUP_ALL)}
              aria-pressed={value === GROUP_ALL}
              onClick={() => onChange(GROUP_ALL)}
            >
              <span>전체 운영자</span>
              <span style={badgeStyle}>{totalAll === null ? '—' : formatNumber(totalAll)}</span>
            </button>
          </li>

          {groups.map((group) => {
            const active = group.id === value;
            const count = counts === null ? null : (counts[group.id] ?? 0);
            return (
              <li key={group.id}>
                <button
                  type="button"
                  className="tds-ui-listitem tds-ui-focusable"
                  style={filterItemStyle(active)}
                  aria-pressed={active}
                  onClick={() => onChange(group.id)}
                >
                  <span>{`운영 - ${group.label}`}</span>
                  <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={filterNoticeStyle}>
        <p style={hintStyle}>
          여러 사람과 함께 사이트를 관리할 수 있습니다. 믿을 수 있는 사용자 그룹에게만 조심해서 관리
          권한을 주세요.
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
      </div>
    </aside>
  );
}
