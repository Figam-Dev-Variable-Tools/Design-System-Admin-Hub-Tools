// 공지 목록 표
//
// [a11y] 시각적으로 숨긴 <caption> · 모든 th 에 scope. 행을 누르면 상세로 간다(useRowNavigation).
// [행 액션] 삭제만 행에 둔다(수정은 상세에서) — RowActions 공통 모듈. 삭제는 확인 다이얼로그를 거친다.
//
// ┌ [EXC-03] 이 표는 CrudTable 이 아니다 ────────────────────────────────────────────┐
// │ 콘텐츠 목록 6종은 CrudListShell/CrudTable 보다 먼저 손으로 만들어졌다. 그래서       │
// │ 껍데기가 대신 해 주던 게이팅(체크박스·행 액션을 canRemove 로 지우는 일)을 **하나도** │
// │ 받지 못했고, 조회 권한만 가진 역할에게 휴지통과 일괄 삭제가 그대로 열려 있었다.      │
// │ 판정은 화면(NoticesPage)이 한 번만 읽어 CTA·일괄 삭제 바·이 표·삭제 뮤테이션에      │
// │ **같은 값**으로 흘린다 — CrudTable 이 canRemove 로 하는 것과 같은 모양이다.        │
// └──────────────────────────────────────────────────────────────────────────────────┘
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { formatDateTime, formatNumber } from '../../../../shared/format';
import {
  inlineBadgeRowStyle,
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
  /**
   * 삭제 권한 (EXC-03) — false 면 휴지통과 **선택 체크박스**를 그리지 않는다.
   *
   * 체크박스까지 지우는 이유는 CrudTable 과 같다: 이 화면에서 선택을 소비하는 것은 일괄
   * 삭제뿐이라, 삭제할 수 없는 역할에게 남기면 아무 일도 못 하는 UI 를 고르게 된다.
   * 기본값을 두지 않는다 — '적는 것을 잊으면 열린다' 가 이 결함의 원래 모양이었다.
   */
  readonly canRemove: boolean;
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
  canRemove,
}: NoticesTableProps) {
  const { rowNavProps } = useRowNavigation();
  const selection = tableSelectionState(notices, selectedIds);
  /* 열 수는 권한이 정한다 — 체크박스 열과 액션 열이 함께 사라진다.
     colSpan 이 어긋나면 빈 상태 문구가 표 폭을 채우지 못하고 스켈레톤 행도 짧아진다. */
  const totalCols = COLUMNS.length + (canRemove ? LEADING_COLS + 1 : LEADING_COLS - 1);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {canRemove
          ? '공지사항 목록 — 행을 누르면 상세로 이동해요. 체크박스·제목 링크·삭제 버튼은 각자 따로 동작해요.'
          : '공지사항 목록 — 행을 누르면 상세로 이동해요. 조회 전용이라 삭제 버튼은 없어요.'}
      </caption>

      <thead>
        <tr>
          {canRemove && (
            <SelectAllHeaderCell
              label="이 페이지의 공지 전체 선택"
              labelId={SELECT_ALL_LABEL_ID}
              selection={selection}
              onToggleAll={onToggleAll}
            />
          )}
          <SeqHeaderCell />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          {canRemove && (
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={totalCols} />
        ) : notices.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              조회된 공지사항이 없어요.
            </td>
          </tr>
        ) : (
          notices.map((notice, index) => {
            const detailPath = `/content/notices/${notice.id}`;
            return (
              <tr key={notice.id} className="tds-ui-row" {...rowNavProps(detailPath)}>
                {canRemove && (
                  <RowSelectCell
                    id={notice.id}
                    label={`${notice.title} 선택`}
                    checked={selectedIds.has(notice.id)}
                    onToggle={(checked) => onToggleOne(notice.id, checked)}
                  />
                )}
                <SeqCell seq={startIndex + index + 1} />
                <td style={titleCellStyle}>
                  <span style={inlineBadgeRowStyle}>
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
                {canRemove && (
                  <td style={actionCellStyle}>
                    <RowActions
                      label={notice.title}
                      disabled={deletingId === notice.id}
                      onDelete={() => onDelete(notice)}
                    />
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
