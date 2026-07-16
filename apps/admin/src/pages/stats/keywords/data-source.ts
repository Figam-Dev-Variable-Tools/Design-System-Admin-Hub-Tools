// 검색어 분석 조회 — 픽스처 (A40 소유)
//
// [백엔드 0] 지금은 결정론적 픽스처다. 백엔드가 붙으면 buildStats 안쪽만 fetch 로 바꾼다 —
// 지연·실패·빈 상태의 재현 경로(_shared/mock.ts)와 화면은 그대로다.
//
// TODO(backend): GET /api/stats/keywords?start&end&segment&q
// TODO(backend): GET /api/stats/keywords/daily?start&end
import { eachDay, formatDayLabel, periodLength } from '../_shared/period';
import type { StatsPeriod } from '../_shared/period';
import { loadStats, seededRandom, seededSeries } from '../_shared/mock';
import { EMPTY_KEYWORD_STATS, isZeroResultKeyword, sumOf } from './types';
import type { KeywordDailyRow, KeywordRow, KeywordStats } from './types';

const SCOPE = 'stats-keywords';

/** 카페24가 검색어를 알 수 없는 유입에 그대로 붙이는 문구 — 우리가 지어낸 이름이 아니다 */
const UNKNOWN_REFERRER_KEYWORD = '참조검색어 없음';

interface KeywordSeed {
  readonly keyword: string;
  /** 하루 평균 검색 수의 기준값 — 상위 검색어와 꼬리 검색어의 격차를 만든다 */
  readonly base: number;
  /** 이 검색어에 걸리는 상품 수. 0이면 '검색결과 없음' */
  readonly resultCount: number;
}

/**
 * 실제 커머스의 검색어 분포를 흉내낸다 — 상위 몇 개가 대부분을 먹고 긴 꼬리가 붙는다.
 * 평평한 픽스처는 '순위'라는 이 화면의 본질을 확인할 수 없게 만든다.
 */
const KEYWORD_SEEDS: readonly KeywordSeed[] = [
  { keyword: '원피스', base: 86, resultCount: 214 },
  { keyword: '니트', base: 74, resultCount: 168 },
  { keyword: '가디건', base: 68, resultCount: 132 },
  { keyword: '청바지', base: 61, resultCount: 97 },
  { keyword: '운동화', base: 57, resultCount: 143 },
  { keyword: '백팩', base: 49, resultCount: 76 },
  { keyword: '맨투맨', base: 45, resultCount: 88 },
  { keyword: '후드티', base: 42, resultCount: 91 },
  { keyword: '코트', base: 39, resultCount: 64 },
  { keyword: '패딩', base: 37, resultCount: 58 },
  { keyword: '텀블러', base: 34, resultCount: 47 },
  { keyword: '캠핑의자', base: 31, resultCount: 23 },
  { keyword: '셔츠', base: 29, resultCount: 112 },
  { keyword: '블라우스', base: 27, resultCount: 73 },
  { keyword: '슬랙스', base: 26, resultCount: 54 },
  { keyword: '스커트', base: 24, resultCount: 69 },
  { keyword: '레깅스', base: 23, resultCount: 38 },
  { keyword: '자켓', base: 22, resultCount: 61 },
  { keyword: '스니커즈', base: 21, resultCount: 84 },
  { keyword: '크로스백', base: 20, resultCount: 45 },
  { keyword: '토트백', base: 19, resultCount: 39 },
  { keyword: '지갑', base: 18, resultCount: 52 },
  { keyword: '모자', base: 17, resultCount: 66 },
  { keyword: '목도리', base: 16, resultCount: 28 },
  { keyword: '장갑', base: 15, resultCount: 31 },
  { keyword: '양말', base: 14, resultCount: 74 },
  { keyword: '벨트', base: 13, resultCount: 26 },
  { keyword: '선글라스', base: 12, resultCount: 33 },
  { keyword: '시계', base: 12, resultCount: 41 },
  { keyword: '목걸이', base: 11, resultCount: 57 },
  { keyword: '귀걸이', base: 10, resultCount: 62 },
  { keyword: '향수', base: 9, resultCount: 24 },
  { keyword: '핸드크림', base: 9, resultCount: 18 },
  { keyword: '요가매트', base: 8, resultCount: 12 },
  { keyword: '등산화', base: 7, resultCount: 21 },
  { keyword: '캠핑테이블', base: 7, resultCount: 16 },
  // 검색결과 없음 — 손님은 이걸 찾아 들어왔는데 카탈로그에 걸리는 상품이 0개다.
  // 검색 수가 꼬리 검색어 수준이 아니라는 점이 중요하다 — 메울 값어치가 있는 자리다.
  { keyword: '오버핏코트', base: 12, resultCount: 0 },
  { keyword: '방수백팩', base: 9, resultCount: 0 },
  { keyword: '링클프리셔츠', base: 6, resultCount: 0 },
  { keyword: '캠핑화로대', base: 5, resultCount: 0 },
];

function rowOf(seed: KeywordSeed, days: number, period: StatsPeriod): KeywordRow {
  const random = seededRandom(`${SCOPE}:${period.start}:${seed.keyword}`);
  const searchCount = Math.max(1, Math.round(seed.base * days * (0.82 + random() * 0.36)));
  const hasResult = seed.resultCount > 0;
  // 방문 수는 검색 수보다 작다 — 검색 결과를 보고 들어오지 않는 사람이 있다
  const visitCount = Math.round(searchCount * (0.74 + random() * 0.2));
  return {
    id: seed.keyword,
    keyword: seed.keyword,
    searchCount,
    resultCount: seed.resultCount,
    // 결과가 0개면 클릭할 상품 자체가 없다 — CTR·구매전환율이 0으로 내려앉는 것이 이 화면의 신호다
    clickCount: hasResult ? Math.round(searchCount * (0.22 + random() * 0.46)) : 0,
    purchaseCount: hasResult ? Math.round(visitCount * (0.005 + random() * 0.035)) : 0,
    visitCount,
    isUnknownReferrer: false,
  };
}

/**
 * 참조검색어 없음 — 유입 URL 에 검색어 파라미터가 없어 검색어를 알 수 없는 방문.
 * 숨기면 검색 유입 합계가 실제 유입과 어긋나므로 하나의 행으로 세운다.
 */
function unknownReferrerRowOf(days: number, period: StatsPeriod): KeywordRow {
  const random = seededRandom(`${SCOPE}:${period.start}:unknown-referrer`);
  const searchCount = Math.round(120 * days * (0.85 + random() * 0.3));
  const visitCount = Math.round(searchCount * (0.9 + random() * 0.08));
  return {
    id: 'unknown-referrer',
    keyword: UNKNOWN_REFERRER_KEYWORD,
    searchCount,
    // 검색어를 모르니 '결과 수'가 성립하지 않는다 — 화면이 이 행을 '—' 로 그린다
    resultCount: 0,
    clickCount: Math.round(searchCount * (0.3 + random() * 0.3)),
    purchaseCount: Math.round(visitCount * (0.008 + random() * 0.02)),
    visitCount,
    isUnknownReferrer: true,
  };
}

function rowsOf(period: StatsPeriod): readonly KeywordRow[] {
  const days = periodLength(period);
  return [
    ...KEYWORD_SEEDS.map((seed) => rowOf(seed, days, period)),
    unknownReferrerRowOf(days, period),
  ];
}

/** 합계를 일자별 가중치로 쪼갠다 — 일자 합이 표의 합과 어긋나지 않게 한다 */
function distribute(total: number, weights: readonly number[]): readonly number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (weightSum === 0 ? 0 : Math.round((total * weight) / weightSum)));
}

/**
 * 일자별 집계 — 표의 합계를 날짜로 흩뿌린다.
 *
 * 지표마다 **다른 seed 의 가중치**를 쓰는 이유: 하나의 가중치로 전부 나누면 구매전환율이
 * 매일 같은 값이 되어 추이 차트가 직선이 된다. 그러면 '오늘 전환이 나빴나'를 화면에서 볼 수 없다.
 */
function dailyRowsOf(period: StatsPeriod, rows: readonly KeywordRow[]): readonly KeywordDailyRow[] {
  const days = eachDay(period);
  const searchWeights = seededSeries(`${SCOPE}:search`, days, 100, 40);
  const zeroWeights = seededSeries(`${SCOPE}:zero`, days, 100, 70);
  const purchaseWeights = seededSeries(`${SCOPE}:purchase`, days, 100, 60);

  const search = distribute(
    sumOf(rows, (row) => row.searchCount),
    searchWeights,
  );
  // 방문은 검색을 따라 움직인다 — 같은 가중치를 쓴다
  const visit = distribute(
    sumOf(rows, (row) => row.visitCount),
    searchWeights,
  );
  const zero = distribute(
    sumOf(rows.filter(isZeroResultKeyword), (row) => row.searchCount),
    zeroWeights,
  );
  const purchase = distribute(
    sumOf(rows, (row) => row.purchaseCount),
    purchaseWeights,
  );

  return days.map((day, index) => ({
    id: day,
    label: formatDayLabel(day),
    searchCount: search[index] ?? 0,
    zeroResultSearchCount: zero[index] ?? 0,
    purchaseCount: purchase[index] ?? 0,
    visitCount: visit[index] ?? 0,
  }));
}

/** 조회 조건 — 호출부는 fetchKeywordStats 로만 닿는다. 공개 표면을 넓히지 않는다 */
interface KeywordQuery {
  readonly period: StatsPeriod;
  readonly comparePeriod: StatsPeriod | null;
}

export function fetchKeywordStats(query: KeywordQuery, signal: AbortSignal): Promise<KeywordStats> {
  return loadStats<KeywordStats>(
    SCOPE,
    signal,
    () => {
      const rows = rowsOf(query.period);
      const compareRows = query.comparePeriod === null ? null : rowsOf(query.comparePeriod);
      return {
        rows,
        compareRows,
        daily: dailyRowsOf(query.period, rows),
        compareDaily:
          query.comparePeriod === null || compareRows === null
            ? null
            : dailyRowsOf(query.comparePeriod, compareRows),
      };
    },
    () => EMPTY_KEYWORD_STATS,
  );
}
