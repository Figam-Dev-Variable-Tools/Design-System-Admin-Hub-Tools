// 좌측 등급 필터 (A40 소유)
//
// [요구사항] 여기에는 '사용자 추가' / '대량 추가' 버튼이 **없다**.
// 고객은 회원가입으로만 유입되며, 관리자가 회원을 직접 만드는 경로는 제공하지 않는다.
// 그 사실은 사이드바 하단 안내문(MembersPage)이 화면에 명시한다.
//
// 그룹 필터(GroupFilter)와는 다른 축이며, 둘을 함께 고르면 AND 로 걸린다.
import type { CSSProperties } from 'react';

// 제목·목록·항목 스타일은 shared/ui 로 승격됐다 — 등급/그룹/운영진/역할/로그인 이력 필터가 같은 한 벌을 쓴다
import {
  badgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { TIER_FILTERS } from '../types';
import type { MemberTier, TierCounts } from '../types';

const wrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

interface TierFilterProps {
  readonly value: MemberTier | 'all';
  /** 아직 안 불러왔으면 null — 건수 자리에 '—' 를 둔다 */
  readonly counts: TierCounts | null;
  readonly onChange: (tier: MemberTier | 'all') => void;
}

export function TierFilter({ value, counts, onChange }: TierFilterProps) {
  return (
    <nav style={wrapperStyle} aria-label="회원 등급 필터">
      <h2 style={filterHeadingStyle}>등급</h2>

      <ul style={filterListStyle}>
        {TIER_FILTERS.map((filter) => {
          const active = filter.id === value;
          const count = counts === null ? null : counts[filter.id];
          return (
            <li key={filter.id}>
              <button
                type="button"
                className="tds-ui-listitem tds-ui-focusable"
                style={filterItemStyle(active)}
                aria-pressed={active}
                onClick={() => onChange(filter.id)}
              >
                <span>{filter.label}</span>
                <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
