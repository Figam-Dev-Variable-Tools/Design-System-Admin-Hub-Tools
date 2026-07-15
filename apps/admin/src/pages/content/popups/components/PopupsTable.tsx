// 팝업 목록 표 (A41 소유)
//
// 수정 연필은 별도 폼 페이지(/content/popups/:id/edit)로 이동한다(RowActions onEdit → 라우팅).
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import {
  numericCellStyle,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  ToggleSwitch,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { PAGE_SIZE, POSITION_LABEL } from '../types';
import type { Popup } from '../types';

const COLUMNS = ['제목', '위치', '노출 기간', '상태', '우선순위'] as const;

/** 체크박스 + 순번 = 앞의 2열, 뒤에 행 액션 1열 */
const LEADING_COLS = 2;
const TOTAL_COLS = COLUMNS.length + LEADING_COLS + 1;
const SELECT_ALL_LABEL_ID = 'popups-select-all-label';

const titleCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
};

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: 'calc(var(--tds-space-6) * 2)',
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'center',
};

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <tr key={`skeleton-${String(index)}`}>
          {Array.from({ length: TOTAL_COLS }, (_, cell) => (
            <td key={`cell-${String(cell)}`} style={tdStyle}>
              <span className="tds-ui-skeleton" aria-hidden="true" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

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
}: PopupsTableProps) {
  const selection = tableSelectionState(popups, selectedIds);

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        팝업 목록 — 체크박스로 선택하고 수정/삭제 버튼으로 각 팝업을 관리합니다.
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label="이 페이지의 팝업 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={onToggleAll}
          />
          <th scope="col" style={thStyle}>
            순번
          </th>
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
          <SkeletonRows />
        ) : popups.length === 0 ? (
          <tr>
            <td colSpan={TOTAL_COLS} style={emptyCellStyle}>
              등록된 팝업이 없습니다.
            </td>
          </tr>
        ) : (
          popups.map((popup, index) => (
            <tr key={popup.id}>
              <RowSelectCell
                id={popup.id}
                label={`${popup.title} 선택`}
                checked={selectedIds.has(popup.id)}
                onToggle={(checked) => onToggleOne(popup.id, checked)}
              />
              <td style={numericCellStyle}>{formatNumber(startIndex + index + 1)}</td>
              <td style={titleCellStyle}>{popup.title}</td>
              <td style={nowrapCellStyle}>{POSITION_LABEL[popup.position]}</td>
              <td style={nowrapCellStyle}>{`${popup.startAt} ~ ${popup.endAt}`}</td>
              <td style={nowrapCellStyle}>
                <ToggleSwitch
                  checked={popup.enabled}
                  label={`${popup.title} 노출 여부`}
                  busy={togglingIds.has(popup.id)}
                  onChange={(next) => onToggleEnabled(popup, next)}
                />
              </td>
              <td style={numericCellStyle}>{formatNumber(popup.priority)}</td>
              <td style={actionCellStyle}>
                <RowActions
                  label={popup.title}
                  disabled={deletingId === popup.id}
                  onEdit={() => onEdit(popup)}
                  onDelete={() => onDelete(popup)}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
