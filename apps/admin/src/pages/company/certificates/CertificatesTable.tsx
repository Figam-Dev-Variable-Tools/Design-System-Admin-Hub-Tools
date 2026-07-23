// 인증서/특허 목록 표 (재정렬 가능)
//
// 체크박스 + 정렬 손잡이 + 순번 + 명칭 + 발급기관 + 발급일 + 구분 + 행 액션(순서 이동 · 수정 · 삭제).
//
// [이미지 열이 없다 — 2026-07-22 운영자 지시]
// 목록에서 증빙 썸네일 열을 뺐다. 이미지 자체는 그대로 있고(등록·수정 폼의 이미지 입력은 유지),
// **목록에서 보여 주지 않을 뿐**이다. 열이 사라졌으니 캡션의 열 서술도 함께 줄였다 — 캡션이 없는 열을
// 읽어 주면 스크린리더 사용자는 표에 없는 칸을 찾아 헤맨다.
//
// [왜 공용 CrudListShell/CrudTable 이 아닌가 — 이 화면만의 이유]
// 드래그 재정렬은 **<tr> 에 draggable·onDragStart·onDrop 을 걸어야** 성립하는데, 그 <tr> 은 DS Table
// (organism · 계약 1.0.0)이 소유하고 행 모델에 드래그 손잡이가 없다. 그래서 CrudTable 도 줄 수 없다.
// DS 계약을 넓히는 것은 이 작업의 범위 밖이라, 이미 같은 이유로 자기 표를 가진 네 화면
// (FAQ · 배너 · 고객센터 FAQ · 로고 목록)과 **같은 형태**로 이 화면도 표만 지역에 둔다.
// 재정렬 UI 자체는 새로 만들지 않는다 — DS TableReorder(손잡이 셀 · 이동 버튼 · 드래그 훅)를 그대로 쓴다.
//
// [행 클릭이 없다] 재정렬 표에서는 행 제스처가 드래그에 점유된다 — 끌다 만 동작이 클릭으로 읽히면
// 수정 화면으로 튕겨 나간다. 수정은 연필 버튼이 연다(네 재정렬 표의 공통 규칙).
import type { CSSProperties } from 'react';

import {
  Empty,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
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
  useReorderableRows,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { certKindLabel, certKindTone } from './types';
import type { CertItem } from './types';
import { cssVar } from '@tds/ui';

const SELECT_ALL_LABEL_ID = 'cert-select-all';

/** 데이터 열 — 이미지 열은 없다(파일 머리말) */
const COLUMNS = ['명칭', '발급기관', '발급일', '구분'] as const;

const nameCellStyle: CSSProperties = {
  ...tdStyle,
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const nowrapCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  width: `calc(${cssVar('space.6')} * 4)`,
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
};

interface CertificatesTableProps {
  readonly items: readonly CertItem[];
  /** **최초 로드만** — 재조회 중에는 false 여야 이전 행이 유지된다 (STATE-01) */
  readonly loading: boolean;
  readonly entityLabel: string;
  /** 수정 권한 (EXC-03) — false 면 연필을 그리지 않는다 */
  readonly canUpdate: boolean;
  /** 삭제 권한 (EXC-03) — false 면 휴지통과 **선택 체크박스**를 그리지 않는다 */
  readonly canRemove: boolean;
  readonly onEdit: (item: CertItem) => void;
  readonly onDelete: (item: CertItem) => void;
  readonly deletingId: string | null;
  /**
   * 지금 순서를 바꿀 수 있는가 — 거부 사유는 화면이 **문장으로** 보여 준다(types.ts certReorderRefusal).
   * false 면 손잡이 열과 이동 버튼이 통째로 사라진다.
   */
  readonly reorderable: boolean;
  /** 새 순서 요청 — movedId 는 이번에 움직인 행(낭독의 주어) */
  readonly onReorder: (orderedIds: readonly string[], movedId: string) => void;
  /** 재정렬 저장 중 — 드래그와 이동 버튼을 전부 잠근다 */
  readonly reordering: boolean;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleOne: (id: string, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
  /** 필터가 걸린 채 0행인가 — Empty 가 '필터 초기화' 를 권한다 (STATE-05) */
  readonly hasActiveFilters: boolean;
  readonly onResetFilters: () => void;
}

export function CertificatesTable({
  items,
  loading,
  entityLabel,
  canUpdate,
  canRemove,
  onEdit,
  onDelete,
  deletingId,
  reorderable,
  onReorder,
  reordering,
  selectedIds,
  onToggleOne,
  onToggleAll,
  hasActiveFilters,
  onResetFilters,
}: CertificatesTableProps) {
  const ids = items.map((item) => item.id);
  const { rowProps, rowStyle, moveBy } = useReorderableRows(ids, onReorder, reordering);
  const selection = tableSelectionState(items, selectedIds);

  const showSelect = canRemove;
  const showActions = canUpdate || canRemove || reorderable;

  /* 선행 열: (선택) + (손잡이) + 순번 — 스켈레톤·빈 행의 colSpan 이 이 수와 어긋나면 표가 깨진다 */
  const leadingCols = 1 + (showSelect ? 1 : 0) + (reorderable ? 1 : 0);
  const totalCols = COLUMNS.length + leadingCols + (showActions ? 1 : 0);

  /* 캡션이 실제 표 구성을 말한다 — 열 목록도, 할 수 있는 조작도 권한·재정렬 가능 여부를 따라간다.
     없는 버튼을 있다고 읽어 주면 스크린리더 사용자는 존재하지 않는 조작을 찾아 표를 헤맨다. */
  const operations = [
    showSelect && '체크박스로 선택',
    canUpdate && '연필 버튼으로 수정',
    canRemove && '휴지통 버튼으로 삭제',
  ].filter((part): part is string => part !== false);

  const caption =
    `${entityLabel} 목록 — ${COLUMNS.join(' · ')} 열로 이루어져 있어요.` +
    (operations.length === 0 ? ' 조회 전용이에요.' : ` ${operations.join(', ')}해요.`) +
    (reorderable ? ' 각 행의 위/아래 버튼 또는 행 드래그로 정렬 순서를 바꿔요.' : '');

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>{caption}</caption>

      <thead>
        <tr>
          {showSelect && (
            <SelectAllHeaderCell
              label={`이 페이지의 ${entityLabel} 전체 선택`}
              labelId={SELECT_ALL_LABEL_ID}
              selection={selection}
              onToggleAll={onToggleAll}
            />
          )}
          {reorderable && <ReorderGripHeaderCell />}
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
              <Empty
                label={entityLabel}
                hasActiveFilters={hasActiveFilters}
                {...(hasActiveFilters && { onResetFilters })}
              />
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr
              key={item.id}
              style={reorderable ? rowStyle(item.id, {}) : undefined}
              {...(reorderable ? rowProps(item.id) : {})}
              {...(showSelect ? { 'aria-selected': selectedIds.has(item.id) } : {})}
            >
              {showSelect && (
                <RowSelectCell
                  id={item.id}
                  label={`${item.name} 선택`}
                  checked={selectedIds.has(item.id)}
                  onToggle={(checked) => onToggleOne(item.id, checked)}
                />
              )}
              {reorderable && <ReorderGripCell />}
              {/* 순번은 화면상 위치다 — 이 표에서는 그것이 곧 저장되는 정렬 순서이기도 하다 */}
              <SeqCell seq={index + 1} />
              <td style={nameCellStyle}>{item.name}</td>
              <td style={nowrapCellStyle}>{item.issuer}</td>
              <td style={nowrapCellStyle}>{item.issuedOn}</td>
              <td style={nowrapCellStyle}>
                <StatusBadge tone={certKindTone(item.kind)} label={certKindLabel(item.kind)} />
              </td>
              {showActions && (
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
                    {/* RowActions 는 콜백이 있을 때만 그 버튼을 그린다 — 권한을 콜백의 유무로 표현한다 */}
                    <RowActions
                      label={item.name}
                      disabled={deletingId === item.id}
                      {...(canUpdate && { onEdit: () => onEdit(item) })}
                      {...(canRemove && { onDelete: () => onDelete(item) })}
                    />
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
