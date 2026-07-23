// 배너 목록 표
//
// 수정 연필은 별도 폼 페이지(/content/banners/:id/edit)로 이동한다(RowActions onEdit → 라우팅).
//
// [정렬 순서 재정렬] FAQ 와 동일하게 필터/검색이 없는 자연 순서 화면(reorderable)에서만 켠다 —
//   드래그 핸들러·grip/화살표·이동 버튼·moveArrayItem 은 DS 소유다(@tds/ui TableReorder) —
//   앱은 shared/ui 배럴을 통해 재수출본만 쓴다. 예전의 shared/ui/tableReorder 사본은 B3 승격 때 삭제됐다.
// [상태 토글] ON/OFF 를 목록에서 바로 토글(RowToggle) — 낙관적 업데이트·토스트·롤백은 호출부.
//   RowToggle 은 권한이 없으면 스위치를 배지로 바꾼다 (shared/crud/RowToggle · EXC-03).
import type { CSSProperties } from 'react';

import { RowToggle } from '../../../../shared/crud';
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
  SkeletonRows,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { PAGE_SIZE, PLACEMENT_LABEL } from '../types';
import type { Banner } from '../types';
import { cssVar } from '@tds/ui';

const COLUMNS = ['제목', '위치', '노출 기간', '상태', '정렬 순서'] as const;

const SELECT_ALL_LABEL_ID = 'banners-select-all-label';

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
  /**
   * 수정 권한 (EXC-03) — false 면 연필·ON/OFF 스위치·순서 이동이 사라진다.
   *
   * 손으로 만든 표라 CrudTable 의 게이팅을 물려받지 못했다: 조회 권한만 가진 역할이
   * ON/OFF 스위치를 눌러 배너를 실제로 켜고 끌 수 있었다(인라인 토글 7종과 같은 결함).
   * ON/OFF 열은 데이터 열이기도 하므로 컨트롤만 사라지고 값은 배지로 남는다(RowToggle).
   */
  readonly canUpdate: boolean;
  /** 삭제 권한 (EXC-03) — false 면 휴지통을 그리지 않는다 */
  readonly canRemove: boolean;
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
  canUpdate,
  canRemove,
}: BannersTableProps) {
  const selection = tableSelectionState(banners, selectedIds);
  const ids = banners.map((banner) => banner.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);

  /* 재정렬은 update 다 — 핸들만 남기고 저장을 막으면 끌 수는 있는데 제자리로 튕긴다 */
  const canReorder = reorderable && canUpdate;
  /* 선택을 소비하는 것이 둘이다 — 일괄 ON/OFF(update)와 일괄 삭제(remove) */
  const canSelect = canUpdate || canRemove;
  const showActions = canReorder || canUpdate || canRemove;
  // 선행 열: (선택 가능 시 체크박스 1) + (재정렬 가능 시 grip 1) + 순번(1)
  const leadingCols = 1 + (canSelect ? 1 : 0) + (canReorder ? 1 : 0);
  const totalCols = COLUMNS.length + (showActions ? 1 : 0) + leadingCols;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {showActions
          ? '배너 목록 — 체크박스로 선택하고 수정/삭제 버튼으로 각 배너를 관리해요.'
          : '배너 목록 — 조회 전용이에요.'}
        {canReorder && ' 각 행의 위/아래 버튼 또는 드래그로 정렬 순서를 바꿔요.'}
      </caption>

      <thead>
        <tr>
          {canSelect && (
            <SelectAllHeaderCell
              label="이 페이지의 배너 전체 선택"
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
          <SkeletonRows rows={PAGE_SIZE} cols={totalCols} />
        ) : banners.length === 0 ? (
          <tr>
            <td colSpan={totalCols} style={emptyCellStyle}>
              등록된 배너가 없어요.
            </td>
          </tr>
        ) : (
          banners.map((banner, index) => (
            <tr
              key={banner.id}
              style={canReorder ? rowStyle(banner.id, {}) : undefined}
              {...(canReorder ? rowProps(banner.id) : {})}
            >
              {canSelect && (
                <RowSelectCell
                  id={banner.id}
                  label={`${banner.title} 선택`}
                  checked={selectedIds.has(banner.id)}
                  onToggle={(checked) => onToggleOne(banner.id, checked)}
                />
              )}
              {canReorder && <ReorderGripCell />}
              <SeqCell seq={startIndex + index + 1} />
              <td style={titleCellStyle}>{banner.title}</td>
              <td style={nowrapCellStyle}>{PLACEMENT_LABEL[banner.placement]}</td>
              <td style={nowrapCellStyle}>{`${banner.startAt} ~ ${banner.endAt}`}</td>
              <td style={nowrapCellStyle}>
                {/* 권한이 없으면 스위치는 사라지고 'ON 인가' 라는 사실만 배지로 남는다 */}
                <RowToggle
                  checked={banner.enabled}
                  busy={togglingIds.has(banner.id)}
                  canUpdate={canUpdate}
                  label={`${banner.title} 노출 여부`}
                  onLabel="ON"
                  offLabel="OFF"
                  onChange={(next) => onToggleEnabled(banner, next)}
                />
              </td>
              <td style={numericCellStyle}>{formatNumber(banner.order)}</td>
              {showActions && (
                <td style={actionCellStyle}>
                  <span style={rowActionsWrapStyle}>
                    {canReorder && (
                      <ReorderMoveButtons
                        label={banner.title}
                        index={index}
                        count={banners.length}
                        locked={reordering}
                        onMove={moveBy}
                      />
                    )}
                    {/* RowActions 는 콜백이 있을 때만 그 버튼을 그린다 — 권한을 콜백의
                        유무로 표현하면 계약을 바꾸지 않고 게이팅이 성립한다 (CrudTable 과 같다) */}
                    {(canUpdate || canRemove) && (
                      <RowActions
                        label={banner.title}
                        disabled={deletingId === banner.id}
                        {...(canUpdate && { onEdit: () => onEdit(banner) })}
                        {...(canRemove && { onDelete: () => onDelete(banner) })}
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
