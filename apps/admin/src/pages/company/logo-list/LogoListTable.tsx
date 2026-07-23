// 로고 목록 표
//
// 체크박스 + 순번 + 이름 + 링크 + 행 액션(수정 모달/삭제 확인). 로고 이미지는 목록에 두지 않고
// 등록/수정 모달에서만 다룬다(소유자 확정). 정렬 순서가 의미 있어
// 드래그 재정렬을 켠다(검색어가 없을 때만 — 필터된 부분집합 재정렬은 의미가 흐려진다).
//
// [EXC-03] 손으로 만든 표라 CrudTable 의 게이팅(canUpdate/canRemove)을 물려받지 못했다 —
// 조회 권한만 가진 역할에게 체크박스·연필·휴지통·노출 스위치·순서 이동이 전부 열려 있었다.
// 상태 열은 데이터 열이기도 하므로 컨트롤만 사라지고 값은 배지로 남는다 (shared/crud/RowToggle).
import type { CSSProperties } from 'react';

import { RowToggle } from '../../../shared/crud';
import {
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  SkeletonRows,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import type { LogoItem } from './types';
import { cssVar } from '@tds/ui';

const SELECT_ALL_LABEL_ID = 'logo-select-all-label';

const nameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const thumbEmptyStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
};

const linkCellStyle: CSSProperties = {
  ...tdStyle,
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
};

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
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
  /** 수정 권한 (EXC-03) — false 면 연필·노출 스위치·순서 이동이 사라진다 */
  readonly canUpdate: boolean;
  /** 삭제 권한 (EXC-03) — false 면 휴지통을 그리지 않는다 */
  readonly canRemove: boolean;
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
  canUpdate,
  canRemove,
}: LogoListTableProps) {
  const ids = items.map((item) => item.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  const selection = tableSelectionState(items, selectedIds);

  /* 재정렬은 update 다 — 핸들만 남기고 저장을 막으면 끌 수는 있는데 제자리로 튕긴다 */
  const canReorder = reorderable && canUpdate;
  /* 선택을 소비하는 것은 일괄 삭제뿐이다 — 삭제할 수 없으면 체크박스도 두지 않는다 */
  const canSelect = canRemove;
  const showActions = canReorder || canUpdate || canRemove;
  const leadingCols = 1 + (canSelect ? 1 : 0) + (canReorder ? 1 : 0);
  const totalCols = COLUMNS.length + (showActions ? 1 : 0) + leadingCols;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {showActions
          ? `${entityLabel} 목록 — 체크박스로 선택, 각 행에서 노출 여부를 ON/OFF 토글하거나 수정·삭제할 수 있어요.`
          : `${entityLabel} 목록 — 조회 전용이에요.`}
        {canReorder && ' 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿔요.'}
      </caption>

      <thead>
        <tr>
          {canSelect && (
            <SelectAllHeaderCell
              label={`이 페이지의 ${entityLabel} 전체 선택`}
              labelId={SELECT_ALL_LABEL_ID}
              selection={selection}
              onToggleAll={onToggleAll}
            />
          )}
          {canReorder && <ReorderGripHeaderCell />}
          <SeqHeaderCell />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" style={thStyle}>
              {column}
            </th>
          ))}
          {showActions && (
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows cols={totalCols} />
        ) : items.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              등록된 {entityLabel}가 없어요.
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr
              key={item.id}
              style={canReorder ? rowStyle(item.id, {}) : undefined}
              {...(canReorder ? rowProps(item.id) : {})}
            >
              {canSelect && (
                <RowSelectCell
                  id={item.id}
                  label={`${item.name} 선택`}
                  checked={selectedIds.has(item.id)}
                  onToggle={(checked) => onToggleOne(item.id, checked)}
                />
              )}
              {canReorder && <ReorderGripCell />}
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
                {/* 권한이 없으면 스위치는 사라지고 '지금 노출인가' 라는 사실만 배지로 남는다 */}
                <RowToggle
                  checked={item.active}
                  busy={togglingIds.has(item.id)}
                  canUpdate={canUpdate}
                  label={`${item.name} 노출 여부`}
                  onLabel="노출"
                  offLabel="숨김"
                  onChange={(next) => onToggleActive(item, next)}
                />
              </td>
              {showActions && (
                <td style={actionCellStyle}>
                  <span style={rowActionsWrapStyle}>
                    {canReorder && (
                      <ReorderMoveButtons
                        label={item.name}
                        index={index}
                        count={items.length}
                        locked={reordering}
                        onMove={moveBy}
                      />
                    )}
                    {/* RowActions 는 콜백이 있을 때만 그 버튼을 그린다 */}
                    {(canUpdate || canRemove) && (
                      <RowActions
                        label={item.name}
                        disabled={deletingId === item.id}
                        {...(canUpdate && { onEdit: () => onEdit(item) })}
                        {...(canRemove && { onDelete: () => onDelete(item) })}
                      />
                    )}
                  </span>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
