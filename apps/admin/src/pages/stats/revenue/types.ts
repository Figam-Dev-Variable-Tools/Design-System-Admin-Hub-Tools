// 매출 통계 도메인 타입 (A40 소유)
//
// [순매출의 정의 — 카페24 매출 통계를 그대로 따른다. 여기가 유일한 원천이다]
//   결제합계  기간 안에 결제가 완료된 금액의 합
//   환불합계  기간 안에 환불 처리된 금액의 합
//   순매출    결제합계 − 환불합계
//   결제건수  결제가 완료된 주문 건수
//   객단가    순매출 ÷ 결제건수 (결제건수가 0 이면 나눌 수 없어 0)
//
// [왜 셋을 모두 보여주나] '매출'을 결제합계로 부르는 화면과 순매출로 부르는 화면이 섞이면 같은
// 기간의 매출이 두 값으로 보고된다. 그래서 이 화면은 결제·환불·순매출을 나란히 세우고, 어느
// 것이 순매출인지 이름으로 못 박는다. 환불합계는 낮을수록 좋은 지표라 증감 색을 뒤집는다.
//
// [과세/면세/영세] 순매출을 세 구분으로 나눈 값이다 — 셋의 합은 언제나 순매출과 같다.
// 과세 상품에는 부가세가 붙고, 면세(도서·농축수산물 등)와 영세(수출 등)에는 붙지 않는다.
import type { SegmentOption } from '../_shared/types';

/** 결제수단 세그먼트 — 'all' 은 네 수단의 합이다 */
export type PayMethod = 'all' | 'card' | 'transfer' | 'vbank' | 'easy';

export const PAY_METHODS: readonly SegmentOption[] = [
  { id: 'all', label: '전체' },
  { id: 'card', label: '신용카드' },
  { id: 'transfer', label: '계좌이체' },
  { id: 'vbank', label: '가상계좌' },
  { id: 'easy', label: '간편결제' },
];

export function isPayMethod(value: unknown): value is PayMethod {
  return typeof value === 'string' && PAY_METHODS.some((option) => option.id === value);
}

/** 집계가 실제로 쌓이는 결제수단 — 'all' 은 저장하지 않고 넷을 더해서 만든다 */
export type RevenuePayMethod = Exclude<PayMethod, 'all'>;

/** 결제수단 이름 — 결제수단별 표의 첫 칸 */
export function payMethodLabel(method: PayMethod): string {
  return PAY_METHODS.find((option) => option.id === method)?.label ?? method;
}

/** 드릴다운 축 — 일자별 흐름에서 결제수단별 구성으로 파고든다 */
export const REVENUE_BREAKDOWNS: readonly SegmentOption[] = [
  { id: 'daily', label: '일자별' },
  { id: 'method', label: '결제수단별' },
];

/** 한 구간(하루 또는 결제수단 하나)의 매출 지표 */
export interface RevenueRow {
  /** 구간 식별자 — 일자('2026-07-16') 또는 결제수단('card') */
  readonly id: string;
  /** 표에 보이는 이름 — '2026.07.16' · '신용카드' */
  readonly label: string;
  /** 결제합계 */
  readonly paymentTotal: number;
  /** 환불합계 */
  readonly refundTotal: number;
  /** 순매출 = 결제합계 − 환불합계 */
  readonly netRevenue: number;
  /** 결제건수 */
  readonly orderCount: number;
  /** 과세 순매출 */
  readonly taxable: number;
  /** 면세 순매출 */
  readonly taxFree: number;
  /** 영세 순매출 */
  readonly zeroRated: number;
}

/**
 * 결제수단별 집계 한 벌 — 화면이 세그먼트로 하나를 고른다.
 * 수단별 자리를 모두 채워 두므로 세그먼트 전환에 재조회가 필요 없다.
 */
export type RevenueByMethod = Readonly<Record<PayMethod, readonly RevenueRow[]>>;

export interface RevenueStats {
  /** 일자별 — 추이 차트와 기본 표의 원천 */
  readonly daily: RevenueByMethod;
  /** 비교 기간의 일자별. 비교 안 함이면 null */
  readonly compareDaily: RevenueByMethod | null;
  /** 결제수단별 — 기간 합계 한 줄씩 */
  readonly byMethod: readonly RevenueRow[];
}

const EMPTY_BY_METHOD: RevenueByMethod = {
  all: [],
  card: [],
  transfer: [],
  vbank: [],
  easy: [],
};

export const EMPTY_REVENUE_STATS: RevenueStats = {
  daily: EMPTY_BY_METHOD,
  compareDaily: null,
  byMethod: [],
};

/** 객단가 — 순매출 ÷ 결제건수. 결제건수가 0 이면 나눌 수 없다(0 으로 나누면 Infinity 다) */
export function aovOf(netRevenue: number, orderCount: number): number {
  return orderCount === 0 ? 0 : netRevenue / orderCount;
}

export function sumOf(rows: readonly RevenueRow[], pick: (row: RevenueRow) => number): number {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

/**
 * 기간 전체의 객단가 — 합계끼리 나눈다. 날짜별 객단가를 단순 평균하면 결제가 1건뿐인 날이
 * 100건인 날과 같은 무게를 가져 값이 조용히 틀어진다.
 */
export function averageOrderValue(rows: readonly RevenueRow[]): number {
  return aovOf(
    sumOf(rows, (row) => row.netRevenue),
    sumOf(rows, (row) => row.orderCount),
  );
}
