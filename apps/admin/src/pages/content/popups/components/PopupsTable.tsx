// 팝업 목록 표
//
// 수정 연필은 별도 폼 페이지(/content/popups/:id/edit)로 이동한다(RowActions onEdit → 라우팅).
//
// [EXC-03] 손으로 만든 표라 CrudTable 의 게이팅(canUpdate/canRemove)을 물려받지 못했다 —
// 조회 권한만 가진 역할에게 체크박스·연필·휴지통·ON/OFF 스위치가 전부 열려 있었다.
// ON/OFF 는 데이터 열이기도 하므로 컨트롤만 사라지고 값은 배지로 남는다 (shared/crud/RowToggle).
import type { CSSProperties } from 'react';

import { RowToggle } from '../../../../shared/crud';
import { formatNumber } from '../../../../shared/format';
import {
  numericCellStyle,
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
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { PAGE_SIZE, POSITION_LABEL } from '../types';
import type { Popup } from '../types';
import { cssVar } from '@tds/ui';

const COLUMNS = ['제목', '위치', '노출 기간', '상태', '우선순위'] as const;

const SELECT_ALL_LABEL_ID = 'popups-select-all-label';

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
  width: `calc(${cssVar('space.6')} * 2)`,
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

interface PopupsTableProps {
  readonly popups: readonly Popup[];
  readonly loading: boolean;
  readonly onEdit: (popup: Popup) => void;
  readonly onDelete: (popup: Popup) => void;
  readonly deletingId: string | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  readonly startIndex: number;
  /** 목록에서 바로 ON/OFF 토글 */
  readonly onToggleEnabled: (popup: Popup, next: boolean) => void;
  /** ON/OFF 요청 중인 팝업 — 스위치를 잠근다 */
  readonly togglingIds: ReadonlySet<string>;
  /** 수정 권한 (EXC-03) — false 면 연필과 ON/OFF 스위치가 사라진다(값은 배지로 남는다) */
  readonly canUpdate: boolean;
  /** 삭제 권한 (EXC-03) — false 면 휴지통을 그리지 않는다 */
  readonly canRemove: boolean;
}

export function PopupsTable({
  popups,
  loading,
  onEdit,
  onDelete,
  deletingId,
  selectedIds,
  onToggleOne,
  onToggleAll,
  startIndex,
  onToggleEnabled,
  togglingIds,
  canUpdate,
  canRemove,
}: PopupsTableProps) {
  const selection = tableSelectionState(popups, selectedIds);

  /* 선택을 소비하는 것이 둘이다 — 일괄 ON/OFF(update)와 일괄 삭제(remove) */
  const canSelect = canUpdate || canRemove;
  const showActions = canUpdate || canRemove;
  // 선행 열: (선택 가능 시 체크박스 1) + 순번(1)
  const totalCols = COLUMNS.length + (canSelect ? 1 : 0) + 1 + (showActions ? 1 : 0);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {showActions
          ? '팝업 목록 — 체크박스로 선택하고 수정/삭제 버튼으로 각 팝업을 관리해요.'
          : '팝업 목록 — 조회 전용이에요.'}
      </caption>

      <thead>
        <tr>
          {canSelect && (
            <SelectAllHeaderCell
              label="이 페이지의 팝업 전체 선택"
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
          {showActions && (
            <th scope="col" style={thStyle}>
              <span style={visuallyHiddenStyle}>행 액션</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={PAGE_SIZE} cols={totalCols} />
        ) : popups.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              등록된 팝업이 없어요.
            </td>
          </tr>
        ) : (
          popups.map((popup, index) => (
            <tr key={popup.id}>
              {canSelect && (
                <RowSelectCell
                  id={popup.id}
                  label={`${popup.title} 선택`}
                  checked={selectedIds.has(popup.id)}
                  onToggle={(checked) => onToggleOne(popup.id, checked)}
                />
              )}
              <SeqCell seq={startIndex + index + 1} />
              <td style={titleCellStyle}>{popup.title}</td>
              <td style={nowrapCellStyle}>{POSITION_LABEL[popup.position]}</td>
              <td style={nowrapCellStyle}>{`${popup.startAt} ~ ${popup.endAt}`}</td>
              <td style={nowrapCellStyle}>
                {/* 권한이 없으면 스위치는 사라지고 'ON 인가' 라는 사실만 배지로 남는다 */}
                <RowToggle
                  checked={popup.enabled}
                  busy={togglingIds.has(popup.id)}
                  canUpdate={canUpdate}
                  label={`${popup.title} 노출 여부`}
                  onLabel="ON"
                  offLabel="OFF"
                  onChange={(next) => onToggleEnabled(popup, next)}
                />
              </td>
              <td style={numericCellStyle}>{formatNumber(popup.priority)}</td>
              {showActions && (
                <td style={actionCellStyle}>
                  {/* RowActions 는 콜백이 있을 때만 그 버튼을 그린다 — 권한을 콜백의
                      유무로 표현하면 계약을 바꾸지 않고 게이팅이 성립한다 */}
                  <RowActions
                    label={popup.title}
                    disabled={deletingId === popup.id}
                    {...(canUpdate && { onEdit: () => onEdit(popup) })}
                    {...(canRemove && { onDelete: () => onDelete(popup) })}
                  />
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
