// 로그 표 — 4화면이 컬럼만 갈아끼워 쓴다 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 표에 **없는** 것 — 그리고 왜 없는가]
//
//   · **체크박스 열이 없다.** 일괄 액션이 없기 때문이다. 선택은 무언가를 하기 위한 것이지
//     선택 그 자체가 목적이 아니다 (회원 관리에서 지적된 결함 — FS-003 검수).
//   · **⋯ 액션 열이 없다.** 삭제도 수정도 없다. 감사 기록은 불변이다 —
//     `data-source.ts` 에 쓰기 함수를 만들지 않았으므로 **여기서 부를 수 있는 것도 없다.**
//
// 이 표가 하는 일은 **보여주는 것과, 눌러서 상세를 여는 것** 둘뿐이다.
// ─────────────────────────────────────────────────────────────────────────────
//
// [A11Y-08 — 행 클릭에는 키보드 등가물이 있다]
// 행 전체 클릭은 **마우스 사용자를 위한 보조 수단**이다(useRowNavigation 이 그렇게 설계됐다).
// 그래서 첫 칸(시각)이 상세를 여는 **진짜 버튼**이다 — Tab 으로 닿고 Enter/Space 로 열린다.
// 이 버튼이 없으면 키보드 사용자는 상세에 영원히 도달하지 못한다 (WCAG 2.1.1).
//
// [ERP-04 — 정렬] 헤더는 <th> 안의 <button> 이다: 클릭·키보드 조작이 되고, aria-sort 가 현재
// 방향을 보조기술에 알리며, 화살표가 눈에 보인다. 숫자 컬럼은 tabular-nums 우측 정렬을 유지한다.
//
// [STATE-05 — 빈 상태] 0행일 때 '표시할 항목이 없습니다' 한 줄로 뭉개지 않는다. DS <Empty> 가
// 검색/필터/진짜 비어있음을 **다른 문구와 다른 복구 수단**으로 가른다. 감사 로그에는 '등록' CTA 가
// 없으므로(만들 수 없는 기록이다) action 슬롯은 비운다 — 그것이 이 화면의 정직한 빈 상태다.
import type { CSSProperties } from 'react';
// Empty 는 아직 앱의 shared/ui 배럴에 재수출돼 있지 않다 — DS public entry 에서 직접 가져온다.
// (Tabs·SegmentedControl·DataTable 등 다른 화면들이 이미 쓰는 경로다. 배럴 재수출은 shared/** 의
//  소유라 이번 배치에서 손대지 않고 보고서에 남긴다.)
import { Empty } from '@tds/ui';

import {
  numericCellStyle,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { useRowNavigation } from '../../../shared/useRowNavigation';
import type { LogColumn, LogEntryBase, LogTone, SortState, SortValues } from '../types';

const nowrapCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

/** 빈 상태·스켈레톤이 들어가는 칸 — 표 폭을 그대로 쓴다 */
const spanCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: 'var(--tds-space-6)',
  paddingBottom: 'var(--tds-space-6)',
};

/** 상세를 여는 첫 칸 버튼 — 링크처럼 보이되 이동이 아니라 다이얼로그를 연다 */
const openButtonStyle: CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'none',
  color: 'var(--tds-color-action-primary-default)',
  font: 'inherit',
  whiteSpace: 'nowrap',
  textDecoration: 'underline',
  cursor: 'pointer',
};

/** aria-sort 는 '지금 이 표가 무엇으로 정렬돼 있는가'를 말한다 — 정렬 중이 아닌 컬럼은 none */
function ariaSortOf(columnId: string, sort: SortState): 'ascending' | 'descending' | 'none' {
  if (sort.key !== columnId) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

/** 방향 글리프 — 정렬 중이 아니면 양방향(↕)으로 '누를 수 있다'만 알린다 */
function sortGlyphOf(columnId: string, sort: SortState): string {
  if (sort.key !== columnId) return '↕';
  return sort.direction === 'asc' ? '↑' : '↓';
}

function SkeletonRows({ rows, cols }: { readonly rows: number; readonly cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={`skeleton-${String(index)}`}>
          {Array.from({ length: cols }, (_, cell) => (
            <td key={`cell-${String(cell)}`} style={tdStyle}>
              <span className="tds-ui-skeleton" aria-hidden="true" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface LogTableProps<E extends LogEntryBase> {
  readonly caption: string;
  readonly entries: readonly E[];
  readonly columns: readonly LogColumn<E>[];
  /** 정렬 가능한 컬럼의 판정 — 여기 키가 있는 컬럼만 헤더가 버튼이 된다 (ERP-04) */
  readonly sortValues: SortValues<E>;
  readonly sort: SortState;
  readonly loading: boolean;
  /** 스켈레톤 행 수 = 페이지 크기 (COMP-06 — 로딩 모양이 실제 결과와 같은 크기여야 한다) */
  readonly skeletonRows: number;
  readonly toneOf: (entry: E) => LogTone;
  /** 상세(페이로드) 다이얼로그를 연다 */
  readonly onOpen: (entry: E) => void;
  readonly onToggleSort: (columnId: string) => void;
  /** STATE-05 — 빈 상태의 3분기 맥락 */
  readonly emptyLabel: string;
  readonly hasQuery: boolean;
  readonly hasActiveFilters: boolean;
  readonly onClearSearch: () => void;
  readonly onResetFilters: () => void;
}

export function LogTable<E extends LogEntryBase>({
  caption,
  entries,
  columns,
  sortValues,
  sort,
  loading,
  skeletonRows,
  toneOf,
  onOpen,
  onToggleSort,
  emptyLabel,
  hasQuery,
  hasActiveFilters,
  onClearSearch,
  onResetFilters,
}: LogTableProps<E>) {
  // 행 어디를 눌러도 상세가 열린다 — 첫 칸의 버튼은 훅이 알아서 제외한다(인터랙티브 가드)
  const { rowActivateProps } = useRowNavigation();

  return (
    <table style={tableStyle} aria-busy={loading}>
      <caption style={visuallyHiddenStyle}>{caption}</caption>

      <thead>
        <tr>
          {columns.map((column) => {
            const sortable = sortValues[column.id] !== undefined;
            const style = column.numeric ? { ...thStyle, textAlign: 'right' as const } : thStyle;

            return (
              <th key={column.id} scope="col" style={style} aria-sort={ariaSortOf(column.id, sort)}>
                {sortable ? (
                  <button
                    type="button"
                    className="tds-log-sort tds-ui-focusable"
                    onClick={() => onToggleSort(column.id)}
                  >
                    <span>{column.label}</span>
                    <span
                      className={
                        sort.key === column.id
                          ? 'tds-log-sort__arrow tds-log-sort__arrow--active'
                          : 'tds-log-sort__arrow'
                      }
                      aria-hidden="true"
                    >
                      {sortGlyphOf(column.id, sort)}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            );
          })}
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <SkeletonRows rows={skeletonRows} cols={columns.length} />
        ) : entries.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={spanCellStyle}>
              <Empty
                label={emptyLabel}
                createVerb="기록"
                hasQuery={hasQuery}
                hasActiveFilters={hasActiveFilters}
                onClearSearch={onClearSearch}
                onResetFilters={onResetFilters}
              />
            </td>
          </tr>
        ) : (
          entries.map((entry) => {
            const tone = toneOf(entry);
            const className = tone === 'neutral' ? 'tds-ui-row' : `tds-ui-row tds-log-row--${tone}`;

            return (
              <tr key={entry.id} className={className} {...rowActivateProps(() => onOpen(entry))}>
                {columns.map((column, index) => {
                  const style = column.numeric
                    ? numericCellStyle
                    : column.nowrap === true
                      ? nowrapCellStyle
                      : tdStyle;

                  // 첫 칸은 상세를 여는 **키보드 경로**다 (A11Y-08)
                  if (index === 0) {
                    return (
                      <td key={column.id} style={style}>
                        <button
                          type="button"
                          className="tds-ui-focusable"
                          style={openButtonStyle}
                          onClick={() => onOpen(entry)}
                        >
                          {column.render(entry)}
                        </button>
                      </td>
                    );
                  }

                  return (
                    <td key={column.id} style={style}>
                      {column.render(entry)}
                    </td>
                  );
                })}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
