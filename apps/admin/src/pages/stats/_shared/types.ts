// 통계 공통 타입 (A40 소유 — apps/admin/src/pages/stats/**)
//
// [경계] 6개 통계 화면이 공유하는 **모양**만 여기 있다. '방문자'·'매출' 같은 도메인 의미는
// 각 화면의 types.ts 가 갖는다. 여기 있는 것은 KPI 한 칸·추이 한 계열·표 한 컬럼의 골격이다.
import type { ReactNode } from 'react';

import type { MetricUnit } from './format';

/** KPI 한 칸 — 현재 값 + 비교 기간의 같은 값 */
export interface StatsKpi {
  readonly id: string;
  readonly label: string;
  readonly unit: MetricUnit;
  readonly value: number;
  /** 비교 기간 값. 비교 안 함이면 null — 카드가 증감을 그리지 않는다 */
  readonly compareValue: number | null;
  /** 낮을수록 좋은 지표(이탈률·취소율·탈퇴) — 증감 색을 뒤집는다 */
  readonly isLowerBetter?: boolean;
  /** 지표 정의 — ⓘ 도움말. 관리자가 '순매출이 뭔데?'를 묻지 않게 한다 */
  readonly hint?: string;
}

/**
 * 추이 차트 한 벌 — 현재 기간과 비교 기간을 같은 x축에 겹친다.
 * 화면은 여러 지표의 추이를 갖고, 사용자가 SegmentedControl 로 하나를 고른다.
 */
export interface StatsTrend {
  readonly id: string;
  /** 계열 이름 — 지표 선택 버튼과 범례에 뜬다 (예: '방문자') */
  readonly label: string;
  readonly labels: readonly string[];
  readonly current: readonly number[];
  /** 비교 기간 계열. 비교 안 함이면 null */
  readonly compare: readonly number[] | null;
  readonly unit: MetricUnit;
}

/**
 * 통계 표의 컬럼 — 표시·정렬·CSV 를 **한 곳에서** 정의한다.
 *
 * 셋을 따로 두면 내보낸 엑셀과 화면의 숫자가 갈라진다 (ERP-12: '값은 표시대로').
 * sortValue 가 있으면 그 컬럼은 정렬 가능해진다 (ERP-04).
 */
export interface StatsColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly align: 'left' | 'right';
  readonly render: (row: T) => ReactNode;
  /** CSV 한 칸 — 화면에 보이는 값과 같아야 한다 */
  readonly csv: (row: T) => string;
  /** 지정하면 정렬 가능한 헤더가 된다 */
  readonly sortValue?: (row: T) => number | string;
}

/** 정렬 방향 */
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  readonly key: string;
  readonly direction: SortDirection;
}

/** 좌측/상단 세그먼트 옵션 — 화면마다 축이 다르다(신규/재방문, 결제수단, 주문상태 …) */
export interface SegmentOption {
  readonly id: string;
  readonly label: string;
}

/** 구성비 막대 한 줄 — 유입경로·주문상태처럼 '점유율'이 본질인 표현 */
export interface ShareItem {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  /** 비교 기간 값 — 없으면 null */
  readonly compareValue: number | null;
}
