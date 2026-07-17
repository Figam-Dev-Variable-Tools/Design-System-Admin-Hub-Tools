// 배너 목록 표
//
// 수정 연필은 별도 폼 페이지(/content/banners/:id/edit)로 이동한다(RowActions onEdit → 라우팅).
//
// [정렬 순서 재정렬] FAQ 와 동일하게 필터/검색이 없는 자연 순서 화면(reorderable)에서만 켠다 —
//   드래그 핸들러·grip/화살표·이동 버튼·moveArrayItem 은 shared/ui/tableReorder 공통 모듈이다.
// [상태 토글] ON/OFF 를 목록에서 바로 토글(ToggleSwitch) — 낙관적 업데이트·토스트·롤백은 호출부.
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import {
  numericCellStyle,
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
} from '../../../../shared/ui';
import { PAGE_SIZE, PLACEMENT_LABEL } from '../types';
import type { Banner } from '../types';

const COLUMNS = ['제목', '위치', '노출 기간', '상태', '정렬 순서'] as const;

const SELECT_ALL_LABEL_ID = 'banners-select-all-label';

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

function SkeletonRows({ columns }: { readonly columns: number }) {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
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

interface BannersTableProps {
  readonly banners: readonly Banner[];
  readonly loading: boolean;
  readonly onEdit: (banner: Banner) => void;
  readonly onDelete: (banner: Banner) => void;
  readonly deletingId: string | null;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  readonly startIndex: number;
  /** 목록에서 바로 ON/OFF 토글 */
  readonly onToggleEnabled: (banner: Banner, next: boolean) => void;
  readonly togglingIds: ReadonlySet<string>;
  /** 정렬 재정렬을 켤지 — 필터/검색이 없는 자연 순서 화면에서만 true */
  readonly reorderable: boolean;
  readonly onReorder: (orderedIds: readonly string[]) => void;
  readonly reordering: boolean;
}

export function BannersTable({
  banners,
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
  reorderable,
  onReorder,
  reordering,
}: BannersTableProps) {
  const selection = tableSelectionState(banners, selectedIds);
  const ids = banners.map((banner) => banner.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);

  // 선행 열: 체크박스(1) + (재정렬 가능 시 grip 1) + 순번(1)
  const leadingCols = 2 + (reorderable ? 1 : 0);
  const totalCols = COLUMNS.length + 1 + leadingCols;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        배너 목록 — 체크박스로 선택하고 수정/삭제 버튼으로 각 배너를 관리합니다.
        {reorderable && ' 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿉니다.'}
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label="이 페이지의 배너 전체 선택"
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
        ) : banners.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              등록된 배너가 없습니다.
            </td>
          </tr>
        ) : (
          banners.map((banner, index) => (
            <tr
              key={banner.id}
              style={reorderable ? rowStyle(banner.id, {}) : undefined}
              {...(reorderable ? rowProps(banner.id) : {})}
            >
              <RowSelectCell
                id={banner.id}
                label={`${banner.title} 선택`}
                checked={selectedIds.has(banner.id)}
                onToggle={(checked) => onToggleOne(banner.id, checked)}
              />
              {reorderable && <ReorderGripCell />}
              <SeqCell seq={startIndex + index + 1} />
              <td style={titleCellStyle}>{banner.title}</td>
              <td style={nowrapCellStyle}>{PLACEMENT_LABEL[banner.placement]}</td>
              <td style={nowrapCellStyle}>{`${banner.startAt} ~ ${banner.endAt}`}</td>
              <td style={nowrapCellStyle}>
                <ToggleSwitch
                  checked={banner.enabled}
                  label={`${banner.title} 노출 여부`}
                  busy={togglingIds.has(banner.id)}
                  onChange={(next) => onToggleEnabled(banner, next)}
                />
              </td>
              <td style={numericCellStyle}>{formatNumber(banner.order)}</td>
              <td style={actionCellStyle}>
                <span style={rowActionsWrapStyle}>
                  {reorderable && (
                    <ReorderMoveButtons
                      label={banner.title}
                      index={index}
                      count={banners.length}
                      locked={reordering}
                      onMove={moveBy}
                    />
                  )}
                  <RowActions
                    label={banner.title}
                    disabled={deletingId === banner.id}
                    onEdit={() => onEdit(banner)}
                    onDelete={() => onDelete(banner)}
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
