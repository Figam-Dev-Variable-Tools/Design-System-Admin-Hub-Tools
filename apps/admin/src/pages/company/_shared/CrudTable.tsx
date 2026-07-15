// 선택 가능한 목록 표 (A41 소유 — apps/admin/src/pages/company/**)
//
// 연혁·인증서·ESG 목록이 같은 표 골격을 쓴다: 체크박스 + 순번 + (열들) + 행 액션(수정/삭제).
// 열 구성만 다르므로 columns 로 받는다. 콘텐츠 목록이 쓰는 shared/ui 프리미티브(RowSelectCell·
// SelectAllHeaderCell·RowActions·tableSelectionState·tableStyle)를 그대로 재사용한다.
import type { CSSProperties, ReactNode } from 'react';

import { formatNumber } from '../../../shared/format';
import {
  numericCellStyle,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';

export interface CrudColumn<T> {
  readonly header: string;
  readonly render: (item: T) => ReactNode;
  /** 숫자 열 — 우측 정렬 + tabular-nums */
  readonly numeric?: boolean;
  /** 줄바꿈 방지 */
  readonly nowrap?: boolean;
}

const nowrapCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

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

interface CrudTableProps<T extends { id: string }> {
  readonly items: readonly T[];
  readonly loading: boolean;
  readonly entityLabel: string;
  readonly columns: readonly CrudColumn<T>[];
  /** 각 행의 접근성 이름(선택 라벨·액션 라벨) */
  readonly nameOf: (item: T) => string;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  readonly onEdit: (item: T) => void;
  readonly onDelete: (item: T) => void;
  readonly deletingId: string | null;
  readonly selectAllLabelId: string;
  readonly emptyLabel: string;
}

export function CrudTable<T extends { id: string }>({
  items,
  loading,
  entityLabel,
  columns,
  nameOf,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onEdit,
  onDelete,
  deletingId,
  selectAllLabelId,
  emptyLabel,
}: CrudTableProps<T>) {
  const selection = tableSelectionState(items, selectedIds);
  // 체크박스(1) + 순번(1) + 열 개수 + 액션(1)
  const totalCols = columns.length + 3;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {entityLabel} 목록 — 체크박스로 선택, 각 행에서 수정·삭제할 수 있습니다.
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label={`이 페이지의 ${entityLabel} 전체 선택`}
            labelId={selectAllLabelId}
            selection={selection}
            onToggleAll={onToggleAll}
          />
          <th scope="col" style={thStyle}>
            순번
          </th>
          {columns.map((column) => (
            <th key={column.header} scope="col" style={thStyle}>
              {column.header}
            </th>
          ))}
          <th scope="col" style={thStyle}>
            <span style={visuallyHiddenStyle}>행 액션</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          Array.from({ length: 5 }, (_, index) => (
            <tr key={`skeleton-${String(index)}`}>
              {Array.from({ length: totalCols }, (_, cell) => (
                <td key={`cell-${String(cell)}`} style={tdStyle}>
                  <span className="tds-ui-skeleton" aria-hidden="true" />
                </td>
              ))}
            </tr>
          ))
        ) : items.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr key={item.id}>
              <RowSelectCell
                id={item.id}
                label={`${nameOf(item)} 선택`}
                checked={selectedIds.has(item.id)}
                onToggle={(checked) => onToggleOne(item.id, checked)}
              />
              <td style={numericCellStyle}>{formatNumber(index + 1)}</td>
              {columns.map((column) => (
                <td
                  key={column.header}
                  style={
                    column.numeric ? numericCellStyle : column.nowrap ? nowrapCellStyle : tdStyle
                  }
                >
                  {column.render(item)}
                </td>
              ))}
              <td style={actionCellStyle}>
                <span style={rowActionsWrapStyle}>
                  <RowActions
                    label={nameOf(item)}
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
