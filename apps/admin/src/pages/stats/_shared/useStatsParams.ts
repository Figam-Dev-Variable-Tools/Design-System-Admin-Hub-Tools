// 통계 조회 조건의 URL 직렬화 (A40 소유 — apps/admin/src/pages/stats/**)
//
// [IA-13 — URL 이 조회 조건의 단일 원천이다]
// 조건을 컴포넌트 useState 에 두면 새로고침·뒤로가기에서 통째로 사라진다. 운영자의 핵심 루프는
// '조건을 맞추고(10초) → 표를 보고 → 행을 열고 → 뒤로' 인데, 뒤로가 조건을 잃으면 매번 10초를
// 다시 쓴다. '이 조건 좀 봐주세요' 하고 링크를 공유하는 것도 URL 상태 없이는 불가능하다.
//
// [replace 인 이유] 조건 변경은 history 를 쌓지 않는다(replace). 검색어를 한 글자씩 지우면
// 뒤로가기 20번이 필요해지기 때문이다. 그래도 IA-13 이 요구하는 것은 전부 성립한다 —
// 상세를 열면 push 가 일어나므로, 뒤로가기는 **조건이 살아있는 목록 URL** 로 돌아온다.
//
// [기본값은 URL 에 쓰지 않는다] preset=last7 처럼 기본값이면 파라미터를 지운다.
// 그래야 공유 링크가 짧고, '기본 상태'의 URL 이 언제나 하나로 정규화된다.
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { parseFilter } from '../../../shared/crud';
import {
  DEFAULT_COMPARE_MODE,
  DEFAULT_PRESET_ID,
  isCalendarDate,
  isCompareMode,
  isPeriodPresetId,
  resolvePreset,
  toSeoulDate,
} from './period';
import type { CompareMode, PeriodPresetId, StatsPeriod } from './period';
import type { SegmentOption, SortDirection, SortState } from './types';

/** 한 페이지에 몇 행 — ERP-05 의 page-size selector */
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

const SEGMENT_ALL = 'all';

/** 화면마다 다른 축 — 세그먼트 목록·드릴다운 축·기본 정렬 */
interface StatsParamsConfig {
  /** 빈 배열이면 이 화면에는 세그먼트 축이 없다 */
  readonly segments: readonly SegmentOption[];
  /** 드릴다운 축(일자별/시간대별/요일별 …). 빈 배열이면 축이 하나뿐이다 */
  readonly views: readonly SegmentOption[];
  /** 추이 차트가 그릴 수 있는 지표들. 빈 배열이면 지표가 하나뿐이다 */
  readonly metrics: readonly SegmentOption[];
  readonly defaultSort: SortState | null;
}

interface StatsParams {
  readonly preset: PeriodPresetId;
  readonly period: StatsPeriod;
  readonly compare: CompareMode;
  readonly segment: string;
  /** 드릴다운 축 — URL 에 실려야 '이 시간대별 화면 좀 봐주세요' 링크가 성립한다 */
  readonly view: string;
  /** 추이 차트가 그리는 지표 */
  readonly metric: string;
  readonly sort: SortState | null;
  readonly page: number;
  readonly pageSize: number;
  readonly keyword: string;
  /** 서울 기준 오늘 — 프리셋 계산의 기준점 (마운트 시점에 고정) */
  readonly today: string;
  /** 기본값에서 벗어난 조건이 하나라도 있는가 — Empty 의 '필터 초기화' 분기 (STATE-05) */
  readonly hasActiveFilters: boolean;
}

export interface StatsParamsApi extends StatsParams {
  readonly setPreset: (preset: PeriodPresetId) => void;
  readonly setPeriod: (period: StatsPeriod) => void;
  readonly setCompare: (compare: CompareMode) => void;
  readonly setSegment: (segment: string) => void;
  readonly setView: (view: string) => void;
  readonly setMetric: (metric: string) => void;
  readonly setKeyword: (keyword: string) => void;
  readonly setPage: (page: number) => void;
  readonly setPageSize: (size: number) => void;
  /** 같은 컬럼을 다시 누르면 방향만 뒤집는다 (ERP-04) */
  readonly toggleSort: (key: string) => void;
  readonly resetFilters: () => void;
}

function readNumber(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

/* ── URL 조각 읽기 ───────────────────────────────────────────────────────────
 *
 * 아래 순수 함수들은 원래 하나의 거대한 useMemo 안에 늘어서 있었고 순환 복잡도가 23 이었다
 * (상한 15). 조각마다 이름을 주면 복잡도가 흩어질 뿐 아니라 '이 파라미터는 어떻게 해석되는가'가
 * 함수 이름으로 읽힌다.
 */

/**
 * 기간 — custom 이면 URL 의 날짜가 원천이고, 프리셋이면 계산이 원천이라 URL 의 날짜를 무시한다.
 * 그래야 '최근 7일' 링크를 내일 열어도 어제 기준이 아니라 내일 기준으로 뜬다.
 */
function readPeriod(
  searchParams: URLSearchParams,
  preset: PeriodPresetId,
  today: string,
): StatsPeriod {
  const resolved = resolvePreset(preset, today);
  if (resolved !== null) return resolved;

  const rawStart = searchParams.get('start');
  const rawEnd = searchParams.get('end');
  return {
    start: isCalendarDate(rawStart) ? rawStart : today,
    end: isCalendarDate(rawEnd) ? rawEnd : today,
  };
}

/** 목록형 파라미터(segment/view/metric) — 후보가 없으면 빈 값, 있으면 첫 항목이 기본이다 */
function readOption(
  searchParams: URLSearchParams,
  key: string,
  ids: readonly string[],
  fallback: string,
): string {
  if (ids.length === 0) return fallback;
  return parseFilter(searchParams.get(key) ?? '', ids, ids[0] ?? fallback);
}

/** 정렬 — sort 가 없으면 화면의 기본 정렬이다 */
function readSort(searchParams: URLSearchParams, defaultSort: SortState | null): SortState | null {
  const key = searchParams.get('sort');
  if (key === null) return defaultSort;
  const direction: SortDirection = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
  return { key, direction };
}

function readPageSize(searchParams: URLSearchParams): number {
  const size = readNumber(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE;
}

export function useStatsParams(config: StatsParamsConfig): StatsParamsApi {
  const [searchParams, setSearchParams] = useSearchParams();

  // '오늘'은 마운트 시 한 번 고정한다 — 매 렌더 new Date() 를 부르면 자정을 넘길 때
  // 조회 기간이 사용자 몰래 바뀌고, useMemo 의존성이 매번 달라져 무한 재조회가 된다.
  const [today] = useState(() => toSeoulDate(new Date()));

  const segmentIds = useMemo(() => config.segments.map((option) => option.id), [config.segments]);
  const viewIds = useMemo(() => config.views.map((option) => option.id), [config.views]);
  const metricIds = useMemo(() => config.metrics.map((option) => option.id), [config.metrics]);

  const params = useMemo<StatsParams>(() => {
    const rawPreset = searchParams.get('preset');
    const preset: PeriodPresetId = isPeriodPresetId(rawPreset) ? rawPreset : DEFAULT_PRESET_ID;

    const rawCompare = searchParams.get('compare');
    const compare: CompareMode = isCompareMode(rawCompare) ? rawCompare : DEFAULT_COMPARE_MODE;

    const segment = readOption(searchParams, 'segment', segmentIds, SEGMENT_ALL);
    const keyword = searchParams.get('q') ?? '';

    // 기본값에서 벗어난 것이 하나라도 있으면 '필터 초기화'를 권할 수 있다 (STATE-05).
    // view/metric 은 '보는 각도'이지 조건이 아니므로 세지 않는다.
    const hasActiveFilters =
      preset !== DEFAULT_PRESET_ID ||
      compare !== DEFAULT_COMPARE_MODE ||
      (segmentIds.length > 0 && segment !== segmentIds[0]) ||
      keyword.trim() !== '';

    return {
      preset,
      period: readPeriod(searchParams, preset, today),
      compare,
      segment,
      view: readOption(searchParams, 'view', viewIds, ''),
      metric: readOption(searchParams, 'metric', metricIds, ''),
      sort: readSort(searchParams, config.defaultSort),
      page: readNumber(searchParams.get('page'), 1),
      pageSize: readPageSize(searchParams),
      keyword,
      today,
      hasActiveFilters,
    };
  }, [searchParams, today, segmentIds, viewIds, metricIds, config.defaultSort]);

  /**
   * URL 을 갱신한다. 기본값이면 파라미터를 지워 URL 을 정규화한다.
   * 조건이 바뀌면 페이지는 1로 돌아간다 — 3페이지를 보다 조건을 바꿨는데 3페이지에 남으면
   * 결과가 1페이지뿐일 때 false-empty 가 뜬다 (STATE-04).
   */
  const update = useCallback(
    (patch: Readonly<Record<string, string | null>>, options?: { readonly keepPage?: boolean }) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === '') next.delete(key);
            else next.set(key, value);
          }
          if (options?.keepPage !== true) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPreset = useCallback(
    (preset: PeriodPresetId) => {
      // 프리셋으로 돌아가면 custom 날짜는 URL 에서 지운다 — 죽은 파라미터를 남기지 않는다
      if (preset === 'custom') {
        update({ preset, start: params.period.start, end: params.period.end });
        return;
      }
      update({ preset: preset === DEFAULT_PRESET_ID ? null : preset, start: null, end: null });
    },
    [update, params.period.start, params.period.end],
  );

  const setPeriod = useCallback(
    (period: StatsPeriod) => {
      // 날짜를 직접 고르는 순간 프리셋은 'custom' 이다
      update({ preset: 'custom', start: period.start, end: period.end });
    },
    [update],
  );

  const setCompare = useCallback(
    (compare: CompareMode) => {
      update({ compare: compare === DEFAULT_COMPARE_MODE ? null : compare });
    },
    [update],
  );

  const setSegment = useCallback(
    (segment: string) => {
      update({ segment: segment === segmentIds[0] ? null : segment });
    },
    [update, segmentIds],
  );

  const setView = useCallback(
    (view: string) => {
      // 축을 바꾸면 정렬 기준 컬럼이 달라질 수 있다 — 정렬을 기본으로 되돌린다
      update({ view: view === viewIds[0] ? null : view, sort: null, dir: null });
    },
    [update, viewIds],
  );

  const setMetric = useCallback(
    (metric: string) => {
      // 차트 지표는 표의 페이지와 무관하다 — 보던 페이지를 그대로 둔다
      update({ metric: metric === metricIds[0] ? null : metric }, { keepPage: true });
    },
    [update, metricIds],
  );

  const setKeyword = useCallback(
    (keyword: string) => {
      update({ q: keyword.trim() === '' ? null : keyword });
    },
    [update],
  );

  const setPage = useCallback(
    (page: number) => {
      update({ page: page <= 1 ? null : String(page) }, { keepPage: true });
    },
    [update],
  );

  const setPageSize = useCallback(
    (size: number) => {
      update({ size: size === DEFAULT_PAGE_SIZE ? null : String(size) });
    },
    [update],
  );

  const toggleSort = useCallback(
    (key: string) => {
      const isSame = params.sort?.key === key;
      const direction: SortDirection = isSame && params.sort?.direction === 'desc' ? 'asc' : 'desc';
      update({ sort: key, dir: direction });
    },
    [update, params.sort],
  );

  const resetFilters = useCallback(() => {
    // view(드릴다운 축)는 필터가 아니라 '보는 각도'다 — 초기화가 축까지 되돌리면
    // 시간대별을 보던 사람이 영문도 모르고 일자별로 튕긴다
    update({
      preset: null,
      start: null,
      end: null,
      compare: null,
      segment: null,
      q: null,
      sort: null,
      dir: null,
    });
  }, [update]);

  return {
    ...params,
    setPreset,
    setPeriod,
    setCompare,
    setSegment,
    setView,
    setMetric,
    setKeyword,
    setPage,
    setPageSize,
    toggleSort,
    resetFilters,
  };
}
