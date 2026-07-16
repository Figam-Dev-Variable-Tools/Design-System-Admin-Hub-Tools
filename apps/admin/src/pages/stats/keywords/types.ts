// 검색어 분석 도메인 타입 (A40 소유)
//
// [용어는 카페24를 따른다 — 참조검색어]
//   참조검색어      유입된 방문의 출처(검색엔진)에서 실제로 쓰인 검색어
//   참조검색어 없음 유입 URL 에 검색어 파라미터가 없을 때 **카페24가 문구 그대로 표시하는 값**이다.
//                   버그가 아니라 하나의 실제 행이다 — 출처는 있는데 검색어를 알 수 없는 유입.
//   구매전환율      구매건수 ÷ 방문수 × 100 (카페24 정의)
//   클릭률(CTR)     클릭수 ÷ 검색수 × 100
//
// [정직 고지 — '검색결과 없음'은 업계 관례가 아니라 우리가 더한 것이다]
// 카페24·메이크샵·고도몰·식스샵·아임웹 어디에도 '검색결과 없음 / 제로 결과 검색어' 리포트는
// 없다. 조사해도 근거를 찾지 못했다. 그래도 싣는 이유는 이것이 **의도한 차별점**이기 때문이다:
// 손님이 찾아 들어온 검색어인데 우리 카탈로그에 걸리는 상품이 0개라면, 그건 운영자가 오늘 손댈
// 수 있는 매출 누수다(상품을 넣거나 동의어를 걸면 메워진다). 뒤에 읽는 사람이 '카페24에도 있는
// 지표겠거니' 하고 넘겨짚지 않도록 여기 적어 둔다.
import type { SegmentOption } from '../_shared/types';

/** 검색어 유형 세그먼트 — '우리가 받아낸 검색어'와 '놓친 검색어'를 갈라 보는 것이 이 화면의 축이다 */
export type KeywordSegment = 'all' | 'hasResult' | 'zeroResult';

export const KEYWORD_SEGMENTS: readonly SegmentOption[] = [
  { id: 'all', label: '전체' },
  { id: 'hasResult', label: '결과 있음' },
  { id: 'zeroResult', label: '결과 없음' },
];

export function isKeywordSegment(value: unknown): value is KeywordSegment {
  return typeof value === 'string' && KEYWORD_SEGMENTS.some((option) => option.id === value);
}

/**
 * 표의 축 — 이 화면은 축이 하나다. 검색어 분석의 본질은 드릴다운이 아니라 **순위**이기 때문이다
 * (방문자 통계의 일자별/시간대별/요일별과 다른 지점).
 */
export const KEYWORD_VIEWS: readonly SegmentOption[] = [{ id: 'ranking', label: '검색어 순위' }];

/** 검색어 한 줄 — 기간 전체를 합친 값 */
export interface KeywordRow {
  readonly id: string;
  readonly keyword: string;
  /** 이 검색어로 유입된 검색 횟수 */
  readonly searchCount: number;
  /** 이 검색어에 걸리는 우리 카탈로그의 상품 수 — 0이면 '검색결과 없음' */
  readonly resultCount: number;
  readonly clickCount: number;
  readonly purchaseCount: number;
  readonly visitCount: number;
  /**
   * 참조검색어 없음 행인가.
   *
   * 검색어를 알 수 없는 유입이라 '검색결과 수'라는 개념 자체가 성립하지 않는다. 이 행을
   * resultCount===0 만으로 판정하면 '검색결과 없음' KPI 에 섞여 들어가, 운영자가 **손댈 수 없는
   * 것을 손댈 것으로** 세게 된다(동의어를 걸 대상이 없다). 그래서 상태를 별도 필드로 갖는다.
   */
  readonly isUnknownReferrer: boolean;
}

/** 하루치 검색 집계 — 추이 차트의 원천 */
export interface KeywordDailyRow {
  readonly id: string;
  readonly label: string;
  readonly searchCount: number;
  /** 그날 '검색결과 없음' 검색어로 발생한 검색 수 */
  readonly zeroResultSearchCount: number;
  readonly purchaseCount: number;
  readonly visitCount: number;
}

export interface KeywordStats {
  /** 검색어별 합계 — 표와 KPI 의 원천 */
  readonly rows: readonly KeywordRow[];
  /** 비교 기간의 검색어별 합계. 비교 안 함이면 null */
  readonly compareRows: readonly KeywordRow[] | null;
  readonly daily: readonly KeywordDailyRow[];
  readonly compareDaily: readonly KeywordDailyRow[] | null;
}

export const EMPTY_KEYWORD_STATS: KeywordStats = {
  rows: [],
  compareRows: null,
  daily: [],
  compareDaily: null,
};

/** 분모가 0이면 0 — 검색이 0인데 클릭이 0인 것은 '0%'이지 오류가 아니다 */
function rateOf(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

/** 클릭률(CTR, %) = 클릭수 ÷ 검색수 × 100 */
export function clickRateOf(row: KeywordRow): number {
  return rateOf(row.clickCount, row.searchCount);
}

/** 구매전환율(%) = 구매건수 ÷ 방문수 × 100 (카페24 정의) */
export function conversionRateOf(row: KeywordRow): number {
  return rateOf(row.purchaseCount, row.visitCount);
}

/** 하루치 구매전환율(%) — 추이 차트의 계열 */
export function dailyConversionRateOf(row: KeywordDailyRow): number {
  return rateOf(row.purchaseCount, row.visitCount);
}

/**
 * 검색결과 없음 검색어인가 — 이 화면에서 유일하게 '지금 손댈 수 있는' 행이다.
 * 참조검색어 없음은 제외한다(위 isUnknownReferrer 주석 참조).
 */
export function isZeroResultKeyword(row: KeywordRow): boolean {
  return !row.isUnknownReferrer && row.resultCount === 0;
}

/**
 * 세그먼트와 검색어를 한 번에 건다.
 *
 * 참조검색어 없음은 '결과 있음'에도 '결과 없음'에도 들지 않는다 — 검색어를 모르니 결과를 셀 수
 * 없기 때문이다. '전체'에서만 보인다.
 */
export function filterKeywordRows(
  rows: readonly KeywordRow[],
  segment: KeywordSegment,
  keyword: string,
): readonly KeywordRow[] {
  const needle = keyword.trim().toLowerCase();
  return rows.filter((row) => {
    if (needle !== '' && !row.keyword.toLowerCase().includes(needle)) return false;
    if (segment === 'zeroResult') return isZeroResultKeyword(row);
    if (segment === 'hasResult') return !row.isUnknownReferrer && row.resultCount > 0;
    return true;
  });
}

export function sumOf(rows: readonly KeywordRow[], pick: (row: KeywordRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

/**
 * 평균 클릭률(%) — 검색 수로 가중한다.
 * 행별 CTR 의 단순 평균은 검색이 3건뿐인 꼬리 검색어를 상위 검색어와 같은 무게로 세어 값을 왜곡한다.
 */
export function averageClickRate(rows: readonly KeywordRow[]): number {
  return rateOf(
    sumOf(rows, (row) => row.clickCount),
    sumOf(rows, (row) => row.searchCount),
  );
}

/** 구매전환율(%) — 전체 구매건수 ÷ 전체 방문수 */
export function totalConversionRate(rows: readonly KeywordRow[]): number {
  return rateOf(
    sumOf(rows, (row) => row.purchaseCount),
    sumOf(rows, (row) => row.visitCount),
  );
}

/** 검색결과 없음 검색어의 **개수** — 검색 횟수가 아니라 종류를 센다 */
export function zeroResultCountOf(rows: readonly KeywordRow[]): number {
  return rows.filter(isZeroResultKeyword).length;
}
