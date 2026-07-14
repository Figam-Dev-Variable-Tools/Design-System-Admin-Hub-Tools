// 목록 상단 툴바 — 검색 + 일괄 액션 + 내보내기 (A40 소유)
//
// [요구사항] '사용자 추가' / '대량 추가' 버튼은 존재하지 않는다 (회원가입으로만 유입).
//
// [일괄 액션] 행 선택(체크박스)이 붙을 자리는 여기다. 1건 이상 선택하면 선택된 회원을 대상으로
// '알림 발송' / '회원 삭제' 가 나타난다 — 선택이 아무 동작에도 연결되지 않는 상태를 없앤다.
// 액션은 행 ⋯ 메뉴와 동일한 2종이며(요구사항), 삭제는 확인 다이얼로그를 거친다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  controlStyle,
  DownloadIcon,
  SearchIcon,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';

const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
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

interface MembersToolbarProps {
  readonly keyword: string;
  readonly onKeywordChange: (keyword: string) => void;
  readonly onExport: () => void;
  readonly exporting: boolean;
  /** 선택된 행 수 — 1건 이상이면 일괄 액션이 나타난다 */
  readonly selectedCount: number;
  /** 선택된 회원 전원에게 알림 발송 (확인 절차 없음 — 행 ⋯ 메뉴와 동일) */
  readonly onBulkNotify: () => void;
  /** 선택된 회원 일괄 삭제 (확인 다이얼로그를 거친다) */
  readonly onBulkDelete: () => void;
  /** 일괄 발송 진행 중 — 중복 제출을 막는다 */
  readonly bulkNotifying: boolean;
}

export function MembersToolbar({
  keyword,
  onKeywordChange,
  onExport,
  exporting,
  selectedCount,
  onBulkNotify,
  onBulkDelete,
  bulkNotifying,
}: MembersToolbarProps) {
  const searchId = useId();
  const hasSelection = selectedCount > 0;

  return (
    <div style={barStyle}>
      <div style={searchWrapStyle}>
        <label htmlFor={searchId} style={visuallyHiddenStyle}>
          닉네임 또는 계정 검색
        </label>
        <span style={searchIconStyle}>
          <SearchIcon />
        </span>
        <input
          id={searchId}
          type="search"
          className="tds-ui-input tds-ui-focusable"
          style={searchInputStyle}
          placeholder="검색"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </div>

      <div style={actionsStyle}>
        {hasSelection && (
          <>
            <Button variant="secondary" disabled={bulkNotifying} onClick={onBulkNotify}>
              {bulkNotifying ? '발송 중…' : `선택 ${formatNumber(selectedCount)}명 알림 발송`}
            </Button>
            <Button variant="danger" disabled={bulkNotifying} onClick={onBulkDelete}>
              {`선택 ${formatNumber(selectedCount)}명 삭제`}
            </Button>
          </>
        )}

        <Button variant="secondary" disabled={exporting} onClick={onExport}>
          <DownloadIcon />
          {exporting ? '내보내는 중…' : '내보내기'}
        </Button>
      </div>
    </div>
  );
}
