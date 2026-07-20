// 공지 목록 표
//
// [a11y] 시각적으로 숨긴 <caption> · 모든 th 에 scope. 행을 누르면 상세로 간다(useRowNavigation).
// [행 액션] 삭제만 행에 둔다(수정은 상세에서) — RowActions 공통 모듈. 삭제는 확인 다이얼로그를 거친다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../../shared/format';
import {
  numericCellStyle,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  SkeletonRows,
  StatusBadge,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { useRowNavigation } from '../../../../shared/useRowNavigation';
import { CATEGORY_LABEL, PAGE_SIZE, STATUS_LABEL, STATUS_TONE } from '../types';
import type { NoticeSummary } from '../types';
import { cssVar } from '@tds/ui';

const COLUMNS = ['제목', '분류', '상태', '작성자', '게시일', '조회수'] as const;

/** 체크박스 + 순번 = 앞의 2열, 뒤에 행 액션 1열 */
const LEADING_COLS = 2;
const SELECT_ALL_LABEL_ID = 'notices-select-all-label';

const titleCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: cssVar('space.6'),
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

const titleGroupStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const TOTAL_COLS = COLUMNS.length + LEADING_COLS + 1;

interface NoticesTableProps {
  readonly notices: readonly NoticeSummary[];
  readonly loading: boolean;
  readonly onDelete: (notice: NoticeSummary) => void;
  /** 삭제 요청 중인 공지 — 해당 행의 액션이 잠긴다 */
  readonly deletingId: string | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  /** 순번 시작값 — (현재페이지-1) × 페이지크기. 행의 순번 = startIndex + 행인덱스 + 1 */
  readonly startIndex: number;
}

export function NoticesTable({
  notices,
  loading,
  onDelete,
  deletingId,
  selectedIds,
  onToggleOne,
  onToggleAll,
  startIndex,
}: NoticesTableProps) {
  const { rowNavProps } = useRowNavigation();
  const selection = tableSelectionState(notices, selectedIds);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        공지사항 목록 — 행을 누르면 상세로 이동합니다. 체크박스·제목 링크·삭제 버튼은 각자의 동작을
        수행합니다.
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label="이 페이지의 공지 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={onToggleAll}
          />
          <SeqHeaderCell />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          <th scope="col" style={thStyle}>
            <span style={visuallyHiddenStyle}>행 액션</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={TOTAL_COLS} />
        ) : notices.length === 0 ? (
          <tr>
            <td colSpan={TOTAL_COLS} style={emptyCellStyle}>
              조회된 공지사항이 없습니다.
            </td>
          </tr>
        ) : (
          notices.map((notice, index) => {
            const detailPath = `/content/notices/${notice.id}`;
            return (
              <tr key={notice.id} className="tds-ui-row" {...rowNavProps(detailPath)}>
                <RowSelectCell
                  id={notice.id}
                  label={`${notice.title} 선택`}
                  checked={selectedIds.has(notice.id)}
                  onToggle={(checked) => onToggleOne(notice.id, checked)}
                />
                <SeqCell seq={startIndex + index + 1} />
                <td style={titleCellStyle}>
                  <span style={titleGroupStyle}>
                    {notice.pinned && <StatusBadge tone="warning" label="고정" />}
                    <Link to={detailPath} className="tds-ui-link tds-ui-focusable">
                      {notice.title}
                    </Link>
                  </span>
                </td>
                <td style={nowrapCellStyle}>{CATEGORY_LABEL[notice.category]}</td>
                <td style={nowrapCellStyle}>
                  <StatusBadge
                    tone={STATUS_TONE[notice.status]}
                    label={STATUS_LABEL[notice.status]}
                  />
                </td>
                <td style={nowrapCellStyle}>{notice.author}</td>
                <td style={nowrapCellStyle}>{formatDateTime(notice.publishedAtIso)}</td>
                <td style={numericCellStyle}>{formatNumber(notice.views)}</td>
                <td style={actionCellStyle}>
                  <RowActions
                    label={notice.title}
                    disabled={deletingId === notice.id}
                    onDelete={() => onDelete(notice)}
                  />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
