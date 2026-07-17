// 운영자 검색 카드 — 돋보기 아이콘 + 입력
//
// 회원 관리 툴바(MembersToolbar)와 같은 검색 패턴이다. 다만 운영자 화면에는
// 내보내기 버튼이 없고, 검색은 닉네임·계정을 대상으로 한다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import { Card, controlStyle, SearchIcon, visuallyHiddenStyle } from '../../../shared/ui';

const searchWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  minWidth: 0,
};

/** 입력 안쪽 왼쪽에 겹쳐 놓는 돋보기 — 클릭이 입력으로 통과하도록 pointerEvents 해제 */
const searchIconStyle: CSSProperties = {
  position: 'absolute',
  left: 'var(--tds-space-3)',
  display: 'inline-flex',
  color: 'var(--tds-color-text-muted)',
  pointerEvents: 'none',
};

const searchInputStyle: CSSProperties = {
  ...controlStyle(false),
  // 아이콘 폭(1.25em) + 좌우 여백만큼 왼쪽 패딩을 늘린다
  paddingLeft: 'calc(var(--tds-space-6) + var(--tds-space-3))',
};

interface AdminsSearchCardProps {
  readonly keyword: string;
  readonly onKeywordChange: (keyword: string) => void;
}

export function AdminsSearchCard({ keyword, onKeywordChange }: AdminsSearchCardProps) {
  const searchId = useId();

  return (
    <Card>
      <div style={searchWrapStyle}>
        <label htmlFor={searchId} style={visuallyHiddenStyle}>
          운영자 닉네임 또는 계정 검색
        </label>
        <span style={searchIconStyle}>
          <SearchIcon />
        </span>
        <input
          id={searchId}
          type="search"
          className="tds-ui-input tds-ui-focusable"
          style={searchInputStyle}
          placeholder="전체 운영자 검색"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </div>
    </Card>
  );
}
