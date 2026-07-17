// 선택 가능한 목록 표 (앱 공용 선언적 CRUD 프레임워크)
//
// 연혁·인증서·ESG 목록이 같은 표 골격을 쓴다: 체크박스 + 순번 + (열들) + 행 액션(수정/삭제).
// 열 구성만 다르므로 columns 로 받는다. 콘텐츠 목록이 쓰는 shared/ui 프리미티브(RowSelectCell·
// SelectAllHeaderCell·RowActions·tableSelectionState·tableStyle)를 그대로 재사용한다.
//
// [행 모델은 @tanstack/react-table 이 소유한다 — 오너 확정 스택]
//   표에서 '무엇을 어떤 순서로 그릴 것인가'(행 모델 · 정렬 상태 · 정렬 비교)는 라이브러리가 갖고,
//   '어떻게 보일 것인가'(셀 마크업 · 토큰 · a11y)는 이 파일이 갖는다.
//
//   체크박스 · 순번 · 행 액션을 TanStack 의 display column 으로 넣지 않고 손으로 그리는 이유:
//   이 셋은 **데이터 열이 아니라 표의 골격**이다. 순번은 정렬과 무관하게 화면상 위치를 세고
//   (정렬해도 1,2,3 이다), 체크박스는 선택 상태를, 액션은 행 정체성을 다룬다. 이것을 컬럼 모델에
//   넣으면 flexRender 를 거치느라 25개 화면이 의존하는 DOM 이 바뀐다. 얻는 것 없이 위험만 산다.
//
// [정렬은 opt-in 이다] column.sortValue 를 준 열만 정렬 가능해진다. 아무 화면도 주지 않으면
//   렌더 결과는 도입 전과 **완전히 동일**하다 (getSortedRowModel 은 빈 sorting 에서 항등이다).
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';

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
  /**
   * 이 열로 정렬할 때 비교할 값. 주면 헤더가 정렬 버튼이 되고 `aria-sort` 가 붙는다.
   * 없으면 이 열은 정렬 불가다 (기본).
   */
  readonly sortValue?: (item: T) => string | number;
}

/** 정렬 상태 — 열 header 를 키로 쓴다 (열의 고유 식별자) */
export interface CrudSort {
  readonly key: string;
  readonly direction: 'asc' | 'desc';
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

const sortButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
};

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
  /** 현재 정렬 — null 이면 items 가 온 순서 그대로다 (어댑터의 정본 순서) */
  readonly sort?: CrudSort | null;
  /** 정렬 가능한 헤더를 눌렀을 때. sort 를 주면서 이것을 빼면 헤더는 눌러도 조용하다 */
  readonly onToggleSort?: (key: string) => void;
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
  sort = null,
  onToggleSort,
}: CrudTableProps<T>) {
  const { rowActivateProps } = useRowNavigation();
  const selection = tableSelectionState(items, selectedIds);
  // 체크박스(1) + 순번(1) + 열 개수 + 액션(1)
  const totalCols = columns.length + 3;

  /* ── TanStack 행 모델 ────────────────────────────────────────────────────
     열 정의는 header 를 id 로 삼는다 — CrudColumn 에 별도 id 가 없고, 한 표 안에서
     header 는 이미 유일하다 (기존 코드도 header 를 React key 로 쓰고 있었다).

     [useMemo 를 붙인 이유] TanStack 은 columns/data 의 **참조**로 캐시를 무효화한다.
     매 렌더마다 새 배열을 만들어 넘기면 행 모델·정렬을 매번 다시 계산한다. 지금은 3~22행이라
     티가 안 나지만, 이 도입의 목적이 '행이 늘어날 때'인 만큼 그때 정확히 새는 자리다. */
  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<T>();
    return columns.map((column) =>
      helper.accessor((item) => (column.sortValue === undefined ? '' : column.sortValue(item)), {
        id: column.header,
        header: column.header,
        enableSorting: column.sortValue !== undefined,
        // 셀은 CrudColumn.render 가 그대로 그린다 — 표시는 계속 호출부의 것이다
        cell: (context) => column.render(context.row.original),
      }),
    );
  }, [columns]);

  const data = useMemo(() => [...items], [items]);

  const sorting: SortingState = useMemo(
    () => (sort === null ? [] : [{ id: sort.key, desc: sort.direction === 'desc' }]),
    [sort],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    getRowId: (item) => item.id,
    manualSorting: false,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: () => {
      /* 정렬 상태의 단일 원천은 URL(useListState.sort)이다 — 헤더 버튼이 onToggleSort 로
         직접 올린다. TanStack 의 내부 상태 갱신 경로는 쓰지 않는다 (state 를 항상 주입한다). */
    },
  });

  const rows = table.getRowModel().rows;

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
          {table.getHeaderGroups()[0]?.headers.map((header) => {
            const isSorted = sort !== null && sort.key === header.column.id;
            const canSort = header.column.getCanSort() && onToggleSort !== undefined;
            return (
              <th
                key={header.id}
                scope="col"
                style={thStyle}
                // 정렬 상태는 th 가 갖는다 — 버튼이 아니라 열의 속성이다 (ERP-04 · StatsTable 과 동일)
                aria-sort={isSorted ? ARIA_SORT[sort.direction] : undefined}
              >
                {canSort ? (
                  <button
                    type="button"
                    className="tds-ui-focusable"
                    style={sortButtonStyle}
                    onClick={() => {
                      onToggleSort(header.column.id);
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {/* 방향 표식 — aria-sort 가 이미 알리므로 시각 전용이다 */}
                    <span aria-hidden="true">
                      {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                    <span style={visuallyHiddenStyle}>
                      {isSorted ? '정렬 기준 · 다시 누르면 방향 전환' : '이 열로 정렬'}
                    </span>
                  </button>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </th>
            );
          })}
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
          rows.map((row, index) => {
            const item = row.original;
            return (
              <tr key={row.id} className="tds-ui-row" {...rowActivateProps(() => onEdit(item))}>
                <RowSelectCell
                  id={item.id}
                  label={`${nameOf(item)} 선택`}
                  checked={selectedIds.has(item.id)}
                  onToggle={(checked) => onToggleOne(item.id, checked)}
                />
                {/* 순번은 화면상 위치다 — 정렬해도 위에서부터 1,2,3 이다 */}
                <SeqCell seq={index + 1} />
                {row.getVisibleCells().map((cell, cellIndex) => {
                  const column = columns[cellIndex];
                  return (
                    <td
                      key={cell.id}
                      style={
                        column?.numeric
                          ? numericCellStyle
                          : column?.nowrap
                            ? nowrapCellStyle
                            : tdStyle
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
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
            );
          })
        )}
      </tbody>
    </table>
  );
}
