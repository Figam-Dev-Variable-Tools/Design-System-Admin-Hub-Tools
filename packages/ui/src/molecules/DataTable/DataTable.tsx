// DataTable — 범용 데이터 표 (molecule · contracts/DataTable.contract.json@1.1.0)
//
// 도메인 중립: 컬럼/행/요약 행을 데이터 prop 으로 주입받는다 (ADR-0003).
// rowKey 컬럼은 th[scope=row], 나머지는 td. 헤더 셀은 th[scope=col].
// caption 은 시각적으로 숨기되 스크린리더에는 노출한다.
//
// [본문 셀의 단위] unit 은 요약(tfoot) 행에 붙는다. 컬럼이 unitInBody=true 를 선언하면 **본문 행에도**
// 같은 접미사를 붙인다 (계약 columns.unitInBody · 기본 false). 이전 구현은 본문 셀에 withUnit=false 를
// 하드코딩해, 단위가 필요한 컬럼(대시보드 '매출액'의 '원')의 단위를 잃었다.
import type { DataTableProps } from '../../../generated/types/DataTable.types';
import './DataTable.css';

const numberFormat = new Intl.NumberFormat('ko-KR');

/** 셀 값 표기 — 숫자는 천 단위 구분, 단위(unit)는 withUnit 일 때만 붙인다 (계약 columns.unit) */
function formatCell(value: string | number | undefined, unit: string, withUnit: boolean): string {
  if (value === undefined) return '';
  const text = typeof value === 'number' ? numberFormat.format(value) : value;
  if (!withUnit || unit === '') return text;
  return `${text}${unit}`;
}

/** dimZero — 0 이하의 수치 셀을 흐리게 (문자열 셀은 대상 아님) */
function isDimmed(value: string | number | undefined, dimZero: boolean): boolean {
  return dimZero && typeof value === 'number' && value <= 0;
}

export function DataTable({
  columns,
  rows,
  rowKey,
  summaryRows = [],
  caption,
  dimZero = true,
  empty = '표시할 항목이 없습니다.',
}: DataTableProps) {
  const bodyColumns = columns.filter((column) => column.key !== rowKey);
  const keyColumn = columns.find((column) => column.key === rowKey);

  const cellClass = (align: 'left' | 'right' | undefined, dimmed: boolean, summary: boolean) =>
    [
      'tds-datatable__cell',
      `tds-datatable__cell--${align ?? 'right'}`,
      dimmed ? 'tds-datatable__cell--dim' : '',
      summary ? 'tds-datatable__cell--summary' : '',
    ]
      .filter((token) => token !== '')
      .join(' ');

  return (
    <div className="tds-datatable">
      <table className="tds-datatable__table">
        <caption className="tds-datatable__caption">{caption}</caption>

        <thead>
          <tr>
            <th
              scope="col"
              className={`tds-datatable__head tds-datatable__cell--${keyColumn?.align ?? 'left'}`}
            >
              {keyColumn?.label ?? ''}
            </th>
            {bodyColumns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`tds-datatable__head tds-datatable__cell--${column.align ?? 'right'}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={String(row[rowKey])}>
              <th scope="row" className={cellClass(keyColumn?.align ?? 'left', false, false)}>
                {formatCell(row[rowKey], '', false)}
              </th>
              {bodyColumns.map((column) => {
                const value = row[column.key];
                return (
                  <td
                    key={column.key}
                    className={cellClass(column.align, isDimmed(value, dimZero), false)}
                  >
                    {/* 계약 columns.unitInBody — 이 컬럼이 요청할 때만 본문에도 단위를 붙인다 */}
                    {formatCell(value, column.unit ?? '', column.unitInBody === true)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>

        {summaryRows.length > 0 ? (
          <tfoot>
            {summaryRows.map((summary) => (
              <tr key={String(summary[rowKey])}>
                <th scope="row" className={cellClass(keyColumn?.align ?? 'left', false, true)}>
                  {formatCell(summary[rowKey], '', false)}
                </th>
                {bodyColumns.map((column) => {
                  const value = summary[column.key];
                  return (
                    <td
                      key={column.key}
                      className={cellClass(column.align, isDimmed(value, dimZero), true)}
                    >
                      {formatCell(value, column.unit ?? '', true)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tfoot>
        ) : null}
      </table>

      {rows.length === 0 ? <p className="tds-datatable__empty">{empty}</p> : null}
    </div>
  );
}
