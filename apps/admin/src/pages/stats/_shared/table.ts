// 통계 표의 순수 로직 — 정렬·페이지·범위 표기 (A40 소유 — apps/admin/src/pages/stats/**)
//
// 렌더에서 떼어낸 이유: 정렬 안정성·페이지 경계·범위 산술은 **눈으로 검증할 수 없다**.
// 순수 함수로 두면 단위 테스트가 경계를 전수로 찌른다 (ERP-05 의 range math 요구).
import { formatNumber } from '../../../shared/format';
import type { SortState, StatsColumn } from './types';

/**
 * 정렬 — 지정된 컬럼의 sortValue 기준.
 *
 * [안정 정렬] 값이 같은 행은 **원래 순서**를 지킨다. Array.prototype.sort 는 ES2019 부터
 * 안정이지만, 그것과 별개로 tie 를 index 로 깨서 정렬이 두 번 눌러도 흔들리지 않게 한다.
 * [한국어] 문자열은 localeCompare('ko-KR') — '가나다' 순이 코드포인트 순과 다르다.
 */
export function sortRows<T>(
  rows: readonly T[],
  columns: readonly StatsColumn<T>[],
  sort: SortState | null,
): readonly T[] {
  if (sort === null) return rows;

  const column = columns.find((item) => item.key === sort.key);
  const sortValue = column?.sortValue;
  if (sortValue === undefined) return rows;

  const factor = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const a = sortValue(left.row);
      const b = sortValue(right.row);
      if (a === b) return left.index - right.index;
      const compared =
        typeof a === 'number' && typeof b === 'number'
          ? a - b
          : String(a).localeCompare(String(b), 'ko-KR');
      return compared * factor;
    })
    .map((item) => item.row);
}

export function totalPagesOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * 현재 페이지가 범위를 벗어났으면 마지막 유효 페이지로 당긴다 (STATE-04).
 * 조건을 좁혀 결과가 줄면 3페이지에 남아 false-empty 를 보는 일이 없어진다.
 */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, page), totalPagesOf(total, pageSize));
}

export function pageSlice<T>(rows: readonly T[], page: number, pageSize: number): readonly T[] {
  const start = (clampPage(page, rows.length, pageSize) - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/**
 * '전체 1,234건 중 26–50' — 한국 ERP 그리드가 기대하는 가시 범위 표기 (ERP-05).
 * 0건이면 범위가 없다.
 */
export function rangeTextOf(total: number, page: number, pageSize: number): string {
  if (total === 0) return '전체 0건';
  const safePage = clampPage(page, total, pageSize);
  const first = (safePage - 1) * pageSize + 1;
  const last = Math.min(first + pageSize - 1, total);
  return `전체 ${formatNumber(total)}건 중 ${formatNumber(first)}–${formatNumber(last)}`;
}
