// 로고 목록 표 (A41 소유 — apps/admin/src/pages/company/logo-list/**)
//
// 체크박스 + 순번 + 로고 썸네일 + 이름 + 링크 + 행 액션(수정 모달/삭제 확인). 정렬 순서가 의미 있어
// 드래그 재정렬을 켠다(검색어가 없을 때만 — 필터된 부분집합 재정렬은 의미가 흐려진다).
import type { CSSProperties } from 'react';

import {
  ImageThumb,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import type { LogoItem } from './types';

const SELECT_ALL_LABEL_ID = 'logo-select-all-label';

const nameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
};

const thumbCellStyle: CSSProperties = {
  ...tdStyle,
  width: 'calc(var(--tds-space-6) * 3)',
};

const thumbEmptyStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const linkCellStyle: CSSProperties = {
  ...tdStyle,
  maxWidth: 'calc(var(--tds-space-6) * 8)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: 'calc(var(--tds-space-6) * 3)',
  textAlign: 'right',
};

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  justifyContent: 'flex-end',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

const COLUMNS = ['로고', '이름', '링크'] as const;

interface LogoListTableProps {
  readonly items: readonly LogoItem[];
  readonly loading: boolean;
  readonly entityLabel: string;
  readonly onEdit: (item: LogoItem) => void;
  readonly onDelete: (item: LogoItem) => void;
  readonly deletingId: string | null;
  readonly reorderable: boolean;
  readonly onReorder: (orderedIds: readonly string[]) => void;
  readonly reordering: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
}

function SkeletonRows({ columns }: { readonly columns: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={`skeleton-${String(index)}`}>
          {Array.from({ length: columns }, (_, cell) => (
            <td key={`cell-${String(cell)}`} style={tdStyle}>
              <span className="tds-ui-skeleton" aria-hidden="true" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function LogoListTable({
  items,
  loading,
  entityLabel,
  onEdit,
  onDelete,
  deletingId,
  reorderable,
  onReorder,
  reordering,
  selectedIds,
  onToggleOne,
  onToggleAll,
}: LogoListTableProps) {
  const ids = items.map((item) => item.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  const selection = tableSelectionState(items, selectedIds);

  const leadingCols = 2 + (reorderable ? 1 : 0);
  const totalCols = COLUMNS.length + 1 + leadingCols;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {entityLabel} 목록 — 체크박스로 선택, 각 행에서 수정·삭제할 수 있습니다.
        {reorderable && ' 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿉니다.'}
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label={`이 페이지의 ${entityLabel} 전체 선택`}
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={onToggleAll}
          />
          {reorderable && <ReorderGripHeaderCell />}
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
          <SkeletonRows columns={totalCols} />
        ) : items.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              등록된 {entityLabel}가 없습니다.
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr
              key={item.id}
              style={reorderable ? rowStyle(item.id, {}) : undefined}
              {...(reorderable ? rowProps(item.id) : {})}
            >
              <RowSelectCell
                id={item.id}
                label={`${item.name} 선택`}
                checked={selectedIds.has(item.id)}
                onToggle={(checked) => onToggleOne(item.id, checked)}
              />
              {reorderable && <ReorderGripCell />}
              <SeqCell seq={index + 1} />
              <td style={thumbCellStyle}>
                <ImageThumb src={item.logoUrl} alt={`${item.name} 로고`} />
              </td>
              <td style={nameCellStyle}>{item.name}</td>
              <td style={linkCellStyle}>
                {item.linkUrl.trim() !== '' ? (
                  <a
                    href={item.linkUrl}
                    className="tds-ui-link tds-ui-focusable"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.linkUrl}
                  </a>
                ) : (
                  <span style={thumbEmptyStyle}>—</span>
                )}
              </td>
              <td style={actionCellStyle}>
                <span style={rowActionsWrapStyle}>
                  {reorderable && (
                    <ReorderMoveButtons
                      label={item.name}
                      index={index}
                      count={items.length}
                      locked={reordering}
                      onMove={moveBy}
                    />
                  )}
                  <RowActions
                    label={item.name}
                    disabled={deletingId === item.id}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
                  />
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
