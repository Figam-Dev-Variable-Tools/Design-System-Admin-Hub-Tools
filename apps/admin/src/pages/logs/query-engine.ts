// 조회 규칙 — 필터 · 검색 · 정렬 · 페이지네이션 (apps/admin/src/pages/logs/**)
//
// [이 파일이 하는 일] 4화면의 어댑터(data-source.ts)가 **전부 이 엔진을 부른다.**
// 화면마다 다른 것은 '어떤 축이 있고 무엇을 검색하는가' 뿐이고, 그 규칙(AND 결합·정렬·페이지 자르기)은
// 하나뿐이어야 한다. 규칙이 4벌이면 4개 화면이 조금씩 다르게 동작하고, 그 차이는 아무도 의도하지 않는다.
//
// [React 를 모른다] 이 파일은 데이터 계층이다. 정렬이 페이지 자르기보다 **먼저** 일어나야 하므로
// (10페이지 중 1페이지만 정렬하면 그것은 정렬이 아니다) 정렬 규칙도 여기 산다 — 컬럼(UI)이 아니라.
//
// [백엔드가 붙으면] 이 파일은 통째로 서버의 WHERE · ORDER BY · LIMIT 로 대체된다.
// 그때 각 data-source.ts 의 함수 본문만 HTTP 호출로 바뀌고 화면은 한 줄도 바뀌지 않는다.
import { toCsvText } from '../../shared/download';
import { withinRange } from './period';
import { ALL_FILTER } from './types';
import type {
  LogAxisCounts,
  LogEntryBase,
  LogQuery,
  LogResult,
  SortValue,
  SortValues,
} from './types';

/* ── 화면이 엔진에 알려주는 것 ───────────────────────────────────────────── */

/**
 * 필터 축 하나의 판정기.
 * `valueOf` 는 그 항목이 **어느 칸에 속하는가**(optionId)를 돌려준다 — 판정과 집계가 한 함수에서 나온다.
 * (예: API 로그의 '상태' 축은 statusCode 200 → '2xx' 를 돌려준다.)
 */
export interface AxisMatcher<E extends LogEntryBase> {
  readonly key: string;
  readonly valueOf: (entry: E) => string;
}

export interface LogDataSpec<E extends LogEntryBase> {
  /** 픽스처. 백엔드가 붙으면 사라진다 */
  readonly entries: readonly E[];
  readonly axes: readonly AxisMatcher<E>[];
  /** 검색 대상 필드들 — 이 문자열 중 하나라도 검색어를 포함하면 걸린다 */
  readonly searchOf: (entry: E) => readonly string[];
  readonly sortValues: SortValues<E>;
}

/* ── 필터 ────────────────────────────────────────────────────────────────── */

/** 기간만 적용 — 좌측 배지 숫자의 모수다 (축·검색과 무관한 '이 기간의 전부') */
function withinPeriod<E extends LogEntryBase>(spec: LogDataSpec<E>, query: LogQuery): readonly E[] {
  return spec.entries.filter((entry) => withinRange(entry.occurredAtIso, query.range));
}

/**
 * 기간 + 모든 축 + 검색어 — 전부 **AND** 로 걸린다.
 *
 * **테스트는 이 함수를 직접 부른다** — 어댑터의 지연과 `?fail=` 스위치를 거치지 않고
 * 필터 규칙만 검증하기 위해서다. 규칙이 여기 한 곳에만 있으므로 화면과 내보내기가 어긋나지 않는다.
 */
export function applyLogQuery<E extends LogEntryBase>(
  spec: LogDataSpec<E>,
  query: LogQuery,
): readonly E[] {
  const keyword = query.keyword.trim().toLowerCase();

  return spec.entries.filter((entry) => {
    if (!withinRange(entry.occurredAtIso, query.range)) return false;

    for (const axis of spec.axes) {
      const selected = query.axes[axis.key] ?? ALL_FILTER;
      if (selected !== ALL_FILTER && axis.valueOf(entry) !== selected) return false;
    }

    if (keyword === '') return true;
    return spec.searchOf(entry).some((field) => field.toLowerCase().includes(keyword));
  });
}

/* ── 집계 (좌측 배지) ────────────────────────────────────────────────────── */

/**
 * 축별 건수 — **기간 안에서만** 센다. 축과 검색어는 세지 않는다.
 *
 * 기간은 이 화면의 *스코프*이고(감사 로그는 언제나 '언제부터 언제까지'를 먼저 정한다),
 * 축은 그 스코프 안을 나누는 자다. 그래서 '이 기간에 성공 N · 실패 M' 이 읽힌다.
 * (로그인 이력이 정한 규칙 — 4화면이 같은 규칙을 쓴다.)
 */
function countAxes<E extends LogEntryBase>(
  spec: LogDataSpec<E>,
  scope: readonly E[],
): Readonly<Record<string, LogAxisCounts>> {
  const out: Record<string, LogAxisCounts> = {};

  for (const axis of spec.axes) {
    const counts: Record<string, number> = { [ALL_FILTER]: scope.length };
    for (const entry of scope) {
      const id = axis.valueOf(entry);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    out[axis.key] = counts;
  }

  return out;
}

/* ── 정렬 (ERP-04) ───────────────────────────────────────────────────────── */

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  // 한국어는 코드포인트 순서와 사전 순서가 다르다 — '가나다'로 읽히게 로케일 비교를 쓴다
  return String(a).localeCompare(String(b), 'ko');
}

/**
 * 정렬 — **언제나 결정적이다.**
 *
 * 비교값이 같은 두 행(같은 초에 일어난 두 API 호출)의 순서가 실행마다 달라지면,
 * 새로고침할 때마다 표가 미묘하게 다르게 보이고 페이지 경계의 행이 두 페이지에 나타나거나
 * 어느 페이지에도 나타나지 않는다. 그래서 동점은 **id 로 끊는다** — id 는 유일하므로 순서가 확정된다.
 */
function sortEntries<E extends LogEntryBase>(
  spec: LogDataSpec<E>,
  entries: readonly E[],
  query: LogQuery,
): readonly E[] {
  const valueOf = spec.sortValues[query.sort.key];
  if (valueOf === undefined) return entries;

  const sign = query.sort.direction === 'asc' ? 1 : -1;

  return [...entries].sort((a, b) => {
    const primary = compareValues(valueOf(a), valueOf(b));
    if (primary !== 0) return primary * sign;
    return a.id.localeCompare(b.id) * sign;
  });
}

/* ── 실행 ────────────────────────────────────────────────────────────────── */

/**
 * 조회 한 번 = 필터 → 집계 → 정렬 → 페이지 자르기.
 * 순서가 중요하다: **정렬이 자르기보다 먼저**여야 페이지 2의 첫 행이 페이지 1의 마지막 행 다음이 된다.
 */
export function runLogQuery<E extends LogEntryBase>(
  spec: LogDataSpec<E>,
  query: LogQuery,
): LogResult<E> {
  const scope = withinPeriod(spec, query);
  const filtered = applyLogQuery(spec, query);
  const sorted = sortEntries(spec, filtered, query);
  const start = (query.page - 1) * query.pageSize;

  return {
    entries: sorted.slice(start, start + query.pageSize),
    axisCounts: countAxes(spec, scope),
    total: filtered.length,
  };
}

/** 내보내기용 — 현재 페이지가 아니라 **필터·검색에 걸린 전체**를, 화면과 같은 순서로 (ERP-12) */
export function runLogExport<E extends LogEntryBase>(
  spec: LogDataSpec<E>,
  query: LogQuery,
): readonly E[] {
  return sortEntries(spec, applyLogQuery(spec, query), query);
}

/* ── CSV (ERP-12) ────────────────────────────────────────────────────────── */

/**
 * CSV 한 열 — **헤더는 한국어**이고 셀은 이미 사람이 읽는 문자열이다.
 *
 * 화면에서 빨갛던 행은 CSV 에서도 실패여야 한다. **색은 파일로 옮겨지지 않는다** —
 * 그래서 문자열이 스스로 말해야 한다 (결과 열에 '실패'가 그대로 들어간다).
 */
export interface LogCsvColumn<E extends LogEntryBase> {
  readonly header: string;
  readonly cell: (entry: E) => string;
}

/**
 * 헤더 + 행 → CSV 본문. 이스케이프는 shared/download 가, UTF-8 BOM 은 downloadCsv 가 맡는다
 * (BOM 이 없으면 엑셀이 한글을 깨뜨린다 — ERP-12).
 */
export function toLogCsv<E extends LogEntryBase>(
  columns: readonly LogCsvColumn<E>[],
  entries: readonly E[],
): string {
  return toCsvText(
    columns.map((column) => column.header),
    entries.map((entry) => columns.map((column) => column.cell(entry))),
  );
}
