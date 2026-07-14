// 좌측 그룹 필터 (A40 소유)
//
// 등급(tier)과는 다른 축이다 — 등급 필터와 함께 고르면 AND 로 걸린다.
// 그룹은 관리자가 만든다. 회원을 만드는 것이 아니라 **묶음**을 만드는 것이므로,
// '사용자 추가 금지' 요구사항과 충돌하지 않는다.
import type { CSSProperties } from 'react';

// 제목·목록·항목 스타일은 shared/ui 로 승격됐다 — 등급/그룹/운영진/역할/로그인 이력 필터가 같은 한 벌을 쓴다
import {
  badgeStyle,
  Button,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  hintStyle,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { GROUP_ALL } from '../types';
import type { GroupCounts, MemberGroup } from '../types';

const wrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

/** 공통 목록 + 이 화면만의 제약: 그룹 수에 상한이 없다 —
 *  사이드바가 그룹 수에 비례해 늘어나지 않도록 목록만 스크롤시킨다
 *  (항목 높이 ≈ space-6, 약 10개 분량에서 스크롤이 시작된다) */
const groupListStyle: CSSProperties = {
  ...filterListStyle,
  maxHeight: 'calc(var(--tds-space-6) * 10)',
  overflowY: 'auto',
};

/** 그룹 목록 조회 실패 — 목록 자리에 문구 + 재시도 버튼을 둔다 ('전체 그룹' 항목은 남는다) */
const errorRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
};

const createRowStyle: CSSProperties = {
  display: 'flex',
  marginTop: 'var(--tds-space-1)',
};

interface GroupFilterProps {
  readonly value: string;
  readonly groups: readonly MemberGroup[];
  /** 아직 안 불러왔으면 null — 건수 자리에 '—' 를 둔다 */
  readonly counts: GroupCounts | null;
  readonly onChange: (groupId: string) => void;
  readonly onCreate: () => void;
  /** 그룹 목록 조회 실패 — 전용 재시도 경로를 연다 */
  readonly failed?: boolean;
  readonly onRetry?: () => void;
}

export function GroupFilter({
  value,
  groups,
  counts,
  onChange,
  onCreate,
  failed = false,
  onRetry,
}: GroupFilterProps) {
  return (
    <nav style={wrapperStyle} aria-label="회원 그룹 필터">
      <h2 style={filterHeadingStyle}>그룹</h2>

      <ul style={groupListStyle}>
        <li>
          <button
            type="button"
            className="tds-ui-listitem tds-ui-focusable"
            style={filterItemStyle(value === GROUP_ALL)}
            aria-pressed={value === GROUP_ALL}
            onClick={() => onChange(GROUP_ALL)}
          >
            <span>전체 그룹</span>
          </button>
        </li>

        {failed && onRetry !== undefined && (
          <li>
            <div role="alert" style={errorRowStyle}>
              <span style={hintStyle}>그룹 목록을 불러오지 못했습니다.</span>
              <Button variant="secondary" onClick={onRetry}>
                다시 시도
              </Button>
            </div>
          </li>
        )}

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
                <span>{group.label}</span>
                <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div style={createRowStyle}>
        <Button variant="secondary" onClick={onCreate}>
          + 새 그룹 만들기
        </Button>
      </div>
    </nav>
  );
}
