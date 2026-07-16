// 선택 가능한 목록 표 (A41 소유 — apps/admin/src/shared/crud/** · 앱 공용 선언적 CRUD 프레임워크)
//
// 연혁·인증서·ESG 목록이 같은 표 골격을 쓴다: 체크박스 + 순번 + (열들) + 행 액션(수정/삭제).
// 열 구성만 다르므로 columns 로 받는다. 콘텐츠 목록이 쓰는 shared/ui 프리미티브(RowSelectCell·
// SelectAllHeaderCell·RowActions·tableSelectionState·tableStyle)를 그대로 재사용한다.
import type { CSSProperties, ReactNode } from 'react';

import {
  Empty,
  numericCellStyle,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  tableSelectionState,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../ui';
import { useRowNavigation } from '../useRowNavigation';

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

/**
 * 빈 상태의 맥락 (STATE-05) — '왜 비었는가' 를 표가 알아야 무엇을 권할지 정할 수 있다.
 *
 * 예전에는 `emptyLabel: string` 하나였고, 26개 호출부가 전부 '등록된 X이(가) 없습니다' 를 하드코딩
 * 했다. 그래서 **검색이 안 맞아서 비었을 때도** '아직 없으니 등록하세요' 라고 말했다 — 사용자는
 * 지우면 될 검색어를 그대로 둔 채 등록 버튼을 찾는다. 조사(이/가)도 26곳에 손으로 박혀 있었다.
 */
export interface EmptyContext {
  /** 검색어가 걸려 있는가 → '검색 지우기' */
  readonly hasQuery?: boolean;
  /** 필터가 걸려 있는가 → '필터 초기화' */
  readonly hasActiveFilters?: boolean;
  readonly onClearSearch?: () => void;
  readonly onResetFilters?: () => void;
  /** 정말 비었을 때만 보이는 생성 CTA */
  readonly createAction?: ReactNode;
  /** '{createVerb}된 {label}이(가) 없습니다' — 기본 '등록' */
  readonly createVerb?: string;
}

interface CrudTableProps<T extends { id: string }> {
  readonly items: readonly T[];
  /** **최초 로드만** — 재조회 중에는 false 여야 이전 행이 유지된다 (STATE-01) */
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
  /** 빈 상태의 맥락 — 없으면 '진짜 비어있음' 으로 그린다 */
  readonly empty?: EmptyContext;
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
  empty = {},
}: CrudTableProps<T>) {
  const { rowActivateProps } = useRowNavigation();
  const selection = tableSelectionState(items, selectedIds);
  // 체크박스(1) + 순번(1) + 열 개수 + 액션(1)
  const totalCols = columns.length + 3;

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>
        {entityLabel} 목록 — 행을 누르면 해당 항목으로 이동합니다. 체크박스·수정·삭제 버튼은 각자의
        동작을 수행합니다.
      </caption>

      <thead>
        <tr>
          <SelectAllHeaderCell
            label={`이 페이지의 ${entityLabel} 전체 선택`}
            labelId={selectAllLabelId}
            selection={selection}
            onToggleAll={onToggleAll}
          />
          <SeqHeaderCell />
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
              {/* 조사(이/가)·3분기 copy·복구 액션은 전부 Empty 가 소유한다 — 호출부는 맥락만 준다 */}
              <Empty
                label={entityLabel}
                createVerb={empty.createVerb ?? '등록'}
                hasQuery={empty.hasQuery ?? false}
                hasActiveFilters={empty.hasActiveFilters ?? false}
                action={empty.createAction ?? null}
                {...(empty.onClearSearch !== undefined && { onClearSearch: empty.onClearSearch })}
                {...(empty.onResetFilters !== undefined && {
                  onResetFilters: empty.onResetFilters,
                })}
              />
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr key={item.id} className="tds-ui-row" {...rowActivateProps(() => onEdit(item))}>
              <RowSelectCell
                id={item.id}
                label={`${nameOf(item)} 선택`}
                checked={selectedIds.has(item.id)}
                onToggle={(checked) => onToggleOne(item.id, checked)}
              />
              <SeqCell seq={index + 1} />
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
