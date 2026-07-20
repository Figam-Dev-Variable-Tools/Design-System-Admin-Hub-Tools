// Table — 상호작용 목록 표 (organism · contracts/Table.contract.json@1.0.0)
//
// <table> 골격과 캡션·정렬 헤더·스켈레톤·빈 행·본문 행을 소유한다. 셀 내용은 전부 호출부가 만든
// ReactNode 로 들어오고 이 컴포넌트는 표의 골격과 상호작용만 그린다.
//
// [이 컴포넌트가 모르는 것] 권한·선택 상태·행 모델·정렬 비교·빈 상태의 한국어 카피. 전부 앱의
// 사실이라 정렬은 sortKey/sortDirection 으로 **판정의 결과만** 들어오고, 권한이 만든 열은
// 완성된 <th>/<td> 배열(leadingHead·trailingHead·행의 leading·trailing)로 들어온다.
// DS 가 그것들을 배우면 이 앱에서만 쓸 수 있는 표가 된다 (계약 description 참조).
//
// [DataTable 과 다른 컴포넌트다] DataTable 은 정적 수치 표(천 단위 구분·단위·합계 tfoot)이고
// 이쪽은 상호작용 목록 표다. 겹치는 prop 이 caption 하나뿐이라 합치지 않는다.
import type { MouseEvent, ReactNode } from 'react';

import { Skeleton } from '../../atoms/Skeleton';
import type { TableProps } from '../../../generated/types/Table.types';
import './Table.css';

type TableColumn = TableProps['columns'][number];
type TableRow = TableProps['rows'][number];

/** aria-sort 는 계약이 정한 두 값만 낸다 — 정렬돼 있지 않은 열에는 속성 자체를 내린다 */
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

/**
 * 행 활성화를 가로채는 요소들 — 이 안에서 시작한 클릭은 행 이동으로 치지 않는다.
 * 이게 없으면 체크박스를 누를 때마다 행이 활성화돼 화면이 튄다.
 */
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, [role="menu"], [role="menuitem"]';

/**
 * 이 클릭을 행 활성화로 봐도 되는가.
 *
 * 텍스트를 드래그해 선택하던 중이면 활성화하지 않는다 — 셀 값 복사를 막지 않기 위해서다.
 * 그리고 행 안의 인터랙티브 요소에서 시작했으면 그쪽이 자기 일을 해야 한다.
 */
function isPlainRowClick(event: MouseEvent<HTMLTableRowElement>): boolean {
  if (window.getSelection()?.toString() !== '') return false;
  const target = event.target as HTMLElement | null;
  return target?.closest(INTERACTIVE_SELECTOR) === null;
}

/** 셀 클래스 — 정렬(align)과 줄바꿈 금지(nowrap)는 열의 속성이라 헤더와 본문이 같은 규칙을 쓴다 */
function cellClassName(base: string, column: TableColumn | undefined): string {
  const parts = [base];
  if (column?.align === 'end') parts.push(`${base}--end`);
  if (column?.nowrap === true) parts.push(`${base}--nowrap`);
  return parts.join(' ');
}

export function Table({
  caption,
  columns,
  rows,
  leadingHead = [],
  trailingHead = [],
  sortKey = '',
  sortDirection = 'asc',
  loading = false,
  skeletonRows = 5,
  empty = null,
  onSortToggle,
}: TableProps) {
  /* 열 수는 배열 길이의 합이다 — 예전에는 호출부가
     `columns.length + 1 + (showSelect?1:0) + (showActions?1:0)` 를 손으로 셌고,
     그 식이 틀리면 스켈레톤과 빈 행의 colSpan 이 조용히 어긋난다. */
  const totalCols = leadingHead.length + columns.length + trailingHead.length;

  /** 이 열이 지금 정렬 기준인가 — 판정은 앱이 끝냈고 여기서는 문자열 비교만 한다 */
  const isSorted = (column: TableColumn): boolean => sortKey !== '' && sortKey === column.id;

  /* 정렬 버튼은 열이 sortable 을 선언하고 **동시에** 콜백이 있을 때만 그린다.
     콜백 없이 버튼만 그리면 눌러도 조용한 버튼이 되어 어포던스가 거짓말을 한다. */
  const canSort = (column: TableColumn): boolean =>
    column.sortable === true && onSortToggle !== undefined;

  const renderHeaderContent = (column: TableColumn): ReactNode => {
    if (!canSort(column)) return column.header;
    const sorted = isSorted(column);

    return (
      <button type="button" className="tds-table__sort" onClick={() => onSortToggle?.(column.id)}>
        {column.header}
        {/* 방향 표식은 시각 전용이다 — aria-sort 가 이미 같은 사실을 말하므로
            여기까지 낭독되면 스크린리더 사용자는 정렬 상태를 두 번 듣는다 */}
        <span aria-hidden="true" className="tds-table__sort-mark">
          {sorted ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
        </span>
        <span className="tds-table__sr-only">
          {sorted ? '정렬 기준 · 다시 누르면 방향 전환' : '이 열로 정렬'}
        </span>
      </button>
    );
  };

  const renderRow = (row: TableRow) => {
    const activate = row.onActivate;
    const className = [
      'tds-table__row',
      ...(activate === undefined ? [] : ['tds-table__row--activatable']),
      ...(row.selected === true ? ['tds-table__row--selected'] : []),
    ].join(' ');

    return (
      <tr
        key={row.id}
        className={className}
        // 선택은 '아니다' 도 말해야 하는 상태가 아니다 — 선택 개념이 없는 표의 행에
        // aria-selected="false" 를 달면 스크린리더가 없는 선택지를 있다고 읽는다
        // (IconButton 의 pressed off/unset 구분과 같은 판단).
        {...(row.selected === undefined ? {} : { 'aria-selected': row.selected })}
        {...(activate === undefined
          ? {}
          : {
              onClick: (event: MouseEvent<HTMLTableRowElement>) => {
                if (isPlainRowClick(event)) activate();
              },
            })}
      >
        {/* leading/trailing 은 완성된 <td>/<th> 요소다 — 호출부가 체크박스 셀·순번 셀·
            액션 셀을 통째로 넘긴다. DS 는 감싸지 않고 그대로 흘린다. */}
        {row.leading?.map((cell, index) => (
          <Slot key={`lead-${String(index)}`}>{cell}</Slot>
        ))}

        {row.cells.map((cell, index) => (
          <td
            key={columns[index]?.id ?? `cell-${String(index)}`}
            className={cellClassName('tds-table__cell', columns[index])}
          >
            {cell}
          </td>
        ))}

        {row.trailing?.map((cell, index) => (
          <Slot key={`trail-${String(index)}`}>{cell}</Slot>
        ))}
      </tr>
    );
  };

  return (
    <table className="tds-table" aria-busy={loading}>
      {/* 시각적으로는 숨기되 접근성 트리에는 남긴다 — 표의 접근 가능한 이름이 된다.
          문장을 권한에 맞게 고르는 것은 호출부의 일이다(DS 는 권한을 모른다). */}
      <caption className="tds-table__caption">{caption}</caption>

      <thead>
        <tr>
          {leadingHead.map((cell, index) => (
            <Slot key={`lead-head-${String(index)}`}>{cell}</Slot>
          ))}

          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              className={cellClassName('tds-table__head', column)}
              /* 정렬 상태는 th 가 갖는다 — 버튼이 아니라 열의 속성이다 (ERP-04).
                 버튼에 붙이면 보조기술이 '이 버튼이 정렬돼 있다' 로 읽는다. */
              {...(isSorted(column) ? { 'aria-sort': ARIA_SORT[sortDirection] } : {})}
            >
              {renderHeaderContent(column)}
            </th>
          ))}

          {trailingHead.map((cell, index) => (
            <Slot key={`trail-head-${String(index)}`}>{cell}</Slot>
          ))}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          Array.from({ length: skeletonRows }, (_, rowIndex) => (
            <tr key={`skeleton-${String(rowIndex)}`}>
              {Array.from({ length: totalCols }, (_, cellIndex) => (
                <td key={`cell-${String(cellIndex)}`} className="tds-table__cell">
                  {/* aria-hidden — 내용 없는 셀이 낭독되면 '빈 값' 으로 오해된다.
                      aria-busy 가 이미 '지금 불러오는 중' 을 말하고 있다. */}
                  <Skeleton />
                </td>
              ))}
            </tr>
          ))
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={totalCols} className="tds-table__empty">
              {empty}
            </td>
          </tr>
        ) : (
          rows.map(renderRow)
        )}
      </tbody>
    </table>
  );
}

/**
 * 호출부가 넘긴 완성된 셀 요소를 그대로 통과시키는 자리표.
 *
 * `<>{cell}</>` 로 감싸는 것과 같지만 key 를 받을 자리가 필요해 함수로 둔다 —
 * Fragment 에 key 를 주려면 `<Fragment key=…>` 를 써야 하는데 그러면 import 가 하나 늘고
 * 배열 map 마다 반복된다.
 */
function Slot({ children }: { readonly children: ReactNode }) {
  return <>{children}</>;
}
