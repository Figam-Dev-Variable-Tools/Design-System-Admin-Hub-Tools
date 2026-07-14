// 목록 상단 툴바 — 검색 + 내보내기 (A40 소유)
//
// 회원 관리 툴바(MembersToolbar)와 **같은 검색 패턴**이다. 다만 여기에는 일괄 액션 자리가 없다:
// 감사 로그에는 일괄로 할 일이 없고(삭제·발송이 없다), 일괄 액션이 없으면 **체크박스도 없다.**
// 회원 관리에서 '선택이 아무 동작에도 연결되지 않는다'가 이미 결함으로 지적됐다 — 반복하지 않는다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  controlStyle,
  DownloadIcon,
  SearchIcon,
  visuallyHiddenStyle,
} from '../../../shared/ui';

const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  flexGrow: 1,
  minWidth: 0,
  maxWidth: 'calc(var(--tds-space-6) * 14)',
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

interface LoginHistoryToolbarProps {
  readonly keyword: string;
  readonly onKeywordChange: (keyword: string) => void;
  readonly onExport: () => void;
  readonly exporting: boolean;
}

export function LoginHistoryToolbar({
  keyword,
  onKeywordChange,
  onExport,
  exporting,
}: LoginHistoryToolbarProps) {
  const searchId = useId();

  return (
    <div style={barStyle}>
      <div style={searchWrapStyle}>
        <label htmlFor={searchId} style={visuallyHiddenStyle}>
          계정, 이름 또는 IP 검색
        </label>
        <span style={searchIconStyle}>
          <SearchIcon />
        </span>
        <input
          id={searchId}
          type="search"
          className="tds-ui-input tds-ui-focusable"
          style={searchInputStyle}
          placeholder="계정 · 이름 · IP 검색"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </div>

      <Button variant="secondary" disabled={exporting} onClick={onExport}>
        <DownloadIcon />
        {exporting ? '내보내는 중…' : '내보내기'}
      </Button>
    </div>
  );
}
