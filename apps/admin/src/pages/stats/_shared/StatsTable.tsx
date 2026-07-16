// 통계 드릴다운 표 — 정렬 · 페이지 · 내보내기 범위 (A40 소유 — apps/admin/src/pages/stats/**)
//
// [왜 @tds/ui DataTable 이 아닌가] DataTable 은 **정렬을 모른다**. 헤더를 직접 그리므로 호출부가
// 정렬 버튼을 끼워 넣을 수 없고, aria-sort 도 없다. 통계는 '어느 검색어가 제일 많나'가 곧
// 정렬이라서 정렬이 부가 기능이 아니라 본체다 (ERP-04). 그래서 이 섹션이 자기 표를 갖는다.
//   → 보고: DataTable 에 sortable 헤더를 얹어 여기를 지우는 것이 옳다. packages/ui 는 F1 소유라
//     이번 배치에서 건드리지 않았다.
// DataTable 은 정렬이 필요 없는 '기간별 추이' 표에는 그대로 쓴다 (StatsTrendTable).
//
// [STATE-01] loading 은 **최초 로드에서만** 스켈레톤이다. 재조회 중에는 이전 행을 그대로 둔다 —
// 표를 훑는 중에 행이 사라지면 운영자가 자기 자리를 잃는다. 그 판정은 호출부(useStatsQuery)가
// data===undefined 로 내리고, 여기는 받은 대로 그린다.
import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  Pagination,
  SelectField,
  mutedTextStyle,
  numericCellStyle,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';

import { pageSlice, rangeTextOf, sortRows, totalPagesOf } from './table';
import { PAGE_SIZE_OPTIONS } from './useStatsParams';
import type { SortState, StatsColumn } from './types';

/** 넓은 표는 페이지를 넘치지 않고 자기 컨테이너 안에서 가로 스크롤한다 (IA-14 · ERP-15) */
const scrollStyle: CSSProperties = {
  inlineSize: '100%',
  minInlineSize: 0,
  overflowX: 'auto',
};

/** 긴 표에서 헤더가 사라지면 어느 열이 뭔지 잃는다 (ERP-03) */
const stickyHeadStyle: CSSProperties = {
  ...thStyle,
  position: 'sticky',
  insetBlockStart: 0,
  zIndex: 1,
};

const sortButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  padding: 0,
  background: 'none',
  borderWidth: 0,
  borderStyle: 'none',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 'var(--tds-space-3)',
  marginBlockStart: 'var(--tds-space-4)',
};

const sizeWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  inlineSize: 'calc(var(--tds-space-6) * 7)',
};

const skeletonCellStyle: CSSProperties = { ...tdStyle, blockSize: 'var(--tds-space-5)' };

interface StatsTableProps<T> {
  /** 필터를 적용한 전체 행 — 정렬·페이지는 이 컴포넌트가 한다 */
  readonly rows: readonly T[];
  readonly columns: readonly StatsColumn<T>[];
  readonly rowKey: (row: T) => string;
  /** 표의 목적 — 시각적으로 숨기되 스크린리더에는 노출 */
  readonly caption: string;
  readonly sort: SortState | null;
  readonly onToggleSort: (key: string) => void;
  readonly page: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
  readonly onPageSizeChange: (size: number) => void;
  /** 최초 로드 — 스켈레톤. 재조회는 false 다 (STATE-01) */
  readonly loading: boolean;
  /** 0행일 때 — 호출부가 Empty 를 3분기로 만들어 넘긴다 (STATE-05) */
  readonly empty: ReactNode;
}

const ARIA_SORT: Readonly<Record<'asc' | 'desc', 'ascending' | 'descending'>> = {
  asc: 'ascending',
  desc: 'descending',
};

export function StatsTable<T>({
  rows,
  columns,
  rowKey,
  caption,
  sort,
  onToggleSort,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
  empty,
}: StatsTableProps<T>) {
  const sizeLabelId = useId();

  const sorted = sortRows(rows, columns, sort);
  const visible = pageSlice(sorted, page, pageSize);
  const totalPages = totalPagesOf(rows.length, pageSize);

  const headCellStyle = (column: StatsColumn<T>): CSSProperties => ({
    ...stickyHeadStyle,
    textAlign: column.align === 'right' ? 'right' : 'left',
  });

  const bodyCellStyle = (column: StatsColumn<T>): CSSProperties =>
    column.align === 'right' ? numericCellStyle : tdStyle;

  return (
    <div>
      <div style={scrollStyle}>
        <table style={tableStyle} aria-busy={loading}>
          <caption style={visuallyHiddenStyle}>{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                const isSortable = column.sortValue !== undefined;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={headCellStyle(column)}
                    // 정렬 상태는 th 가 갖는다 — 버튼이 아니라 열의 속성이다 (ERP-04)
                    aria-sort={isSorted && sort !== null ? ARIA_SORT[sort.direction] : undefined}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        className="tds-ui-focusable"
                        style={sortButtonStyle}
                        onClick={() => {
                          onToggleSort(column.key);
                        }}
                      >
                        {column.header}
                        {/* 방향 표식 — aria-sort 가 이미 알리므로 시각 전용이다 */}
                        <span aria-hidden="true">
                          {isSorted ? (sort?.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                        <span style={visuallyHiddenStyle}>
                          {isSorted ? '정렬 기준 · 다시 누르면 방향 전환' : '이 열로 정렬'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading
              ? // 스켈레톤 행 수 = 페이지 크기, 칸 수 = 실제 컬럼 수 (COMP-06 — 하드코딩 5 금지)
                Array.from({ length: pageSize }, (_, index) => (
                  <tr key={`skeleton-${String(index)}`}>
                    {columns.map((column) => (
                      <td key={column.key} style={skeletonCellStyle}>
                        <span className="tds-ui-skeleton" aria-hidden="true" />
                      </td>
                    ))}
                  </tr>
                ))
              : visible.map((row) => (
                  <tr key={rowKey(row)}>
                    {columns.map((column) => (
                      <td key={column.key} style={bodyCellStyle(column)}>
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* 성공했는데 0행일 때만 empty 다 — 로딩/에러는 여기 오지 않는다 (STATE-01) */}
      {!loading && rows.length === 0 ? empty : null}

      {loading || rows.length === 0 ? null : (
        <div style={footerStyle}>
          <p style={{ ...mutedTextStyle, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {rangeTextOf(rows.length, page, pageSize)}
          </p>

          <div style={sizeWrapStyle}>
            {/* label 이 아니라 span 이다 — 연결은 aria-labelledby 가 한다. SelectField 는 자기 id 를
                호출부에서 받지만 htmlFor 로 묶으면 라벨 클릭이 열리는 대신 포커스만 옮겨 붙는다 */}
            <span id={sizeLabelId} style={{ ...mutedTextStyle, whiteSpace: 'nowrap' }}>
              페이지당
            </span>
            <SelectField
              aria-labelledby={sizeLabelId}
              value={String(pageSize)}
              onChange={(event) => {
                onPageSizeChange(Number(event.target.value));
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={String(size)}>
                  {String(size)}건
                </option>
              ))}
            </SelectField>
          </div>

          <Pagination
            page={Math.min(page, totalPages)}
            totalPages={totalPages}
            label={`${caption} 페이지`}
            onChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
