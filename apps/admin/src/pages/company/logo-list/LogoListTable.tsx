// 로고 목록 표
//
// 체크박스 + 순번 + 이름 + 링크 + 행 액션(수정 모달/삭제 확인). 로고 이미지는 목록에 두지 않고
// 등록/수정 모달에서만 다룬다(소유자 확정). 정렬 순서가 의미 있어
// 드래그 재정렬을 켠다(검색어가 없을 때만 — 필터된 부분집합 재정렬은 의미가 흐려진다).
import type { CSSProperties } from 'react';

import {
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
  ToggleSwitch,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import type { LogoItem } from './types';

const SELECT_ALL_LABEL_ID = 'logo-select-all-label';

const nameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
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

const COLUMNS = ['이름', '링크', '상태'] as const;

const statusCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

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
  /** 노출 여부를 목록에서 바로 ON/OFF — 링크 오른쪽 상태 열 */
  readonly onToggleActive: (item: LogoItem, next: boolean) => void;
  /** 토글 요청 중인 항목 — 해당 토글이 busy 로 잠긴다 */
  readonly togglingIds: ReadonlySet<string>;
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
  onToggleActive,
  togglingIds,
}: LogoListTableProps) {
  const ids = items.map((item) => item.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  const selection = tableSelectionState(items, selectedIds);

  const leadingCols = 2 + (reorderable ? 1 : 0);
  const totalCols = COLUMNS.length + 1 + leadingCols;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {entityLabel} 목록 — 체크박스로 선택, 각 행에서 노출 여부를 ON/OFF 토글하거나 수정·삭제할 수
        있습니다.
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
              <td style={statusCellStyle}>
                <ToggleSwitch
                  checked={item.active}
                  label={`${item.name} 노출 여부`}
                  busy={togglingIds.has(item.id)}
                  onChange={(next) => onToggleActive(item, next)}
                />
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
