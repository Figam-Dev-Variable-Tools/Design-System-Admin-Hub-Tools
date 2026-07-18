// AUTO-GENERATED from contracts/DataTable.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Tables · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type DataTableState = 'default';

/**
 * 범용 데이터 표 — 컬럼 정의 + 행 데이터 + 합계(요약) 행. 도메인 중립: '기간별 분석' 같은 도메인 의미는 컬럼/행 데이터를 주입하는 organism 이 소유한다 (ADR-0003). 행의 첫 컬럼(rowKey)은 th[scope=row] 로 렌더하고 나머지는 td 다. 출처 구현: apps/admin/src/pages/dashboard/components/PeriodTable.tsx 를 도메인 제거해 일반화

[rowKey 는 tbody 와 tfoot 에 함께 적용된다] 요약 행도 rowKey 컬럼의 값을 th[scope=row] 로 렌더한다. 본문 행의 키 필드(예: date)와 요약 행의 표시 필드(예: label)가 다르면 **호출부가 어댑터에서 같은 키로 맞춘다** (예: summaries.map(s => ({ date: s.label, ...s }))). 별도의 summaryRowKey prop 을 두지 않는다 — 데이터 정형화는 데이터를 소유한 쪽의 일이고, 표에 키 필드를 두 개 두면 스코프/헤더 연결 규칙이 두 갈래로 갈라진다
 */
export interface DataTableProps {
  /**
   * 컬럼 정의. align 기본값은 'right'(수치). unit 은 요약(tfoot) 행에 붙는다. unitInBody=true 면 **본문(tbody) 행에도** 같은 unit 접미사를 붙인다 (기본 false — 현행 동작 유지). 실사용: 대시보드 기간별 분석의 매출액 컬럼만 본문에 '원' 을 붙인다 (PeriodTable.tsx:114 — column.key === 'revenue' 일 때만 withUnit). 현행 구현은 본문 셀에 withUnit=false 를 하드코딩해(DataTable.tsx:84) 이 컬럼의 단위가 사라진다. 데이터 prop — Figma 대응 없음 (ADR-0003)
   */
  columns: ReadonlyArray<{ key: string; label: string; align?: 'left' | 'right'; unit?: string; unitInBody?: boolean }>;
  /**
   * 본문 행. 각 행은 columns[].key 를 키로 갖는다. 빈 배열이면 empty 문구를 렌더한다. 데이터 prop — Figma 대응 없음
   */
  rows: ReadonlyArray<Record<string, string | number>>;
  /**
   * 행 식별 컬럼 키. React key 이자 th[scope=row] 로 렌더되는 컬럼이다
   */
  rowKey: string;
  /**
   * tfoot 에 렌더되는 합계/요약 행. 강조 배경 + 단위 표기. 데이터 prop — Figma 대응 없음
   * @default []
   */
  summaryRows?: ReadonlyArray<Record<string, string | number>>;
  /**
   * 표의 목적을 설명하는 caption. 시각적으로 숨기되 스크린리더에는 노출한다
   */
  caption: string;
  /**
   * 0 이하의 수치 셀을 흐리게 처리 — 눈이 0을 건너뛰고 유의미한 수치에 먼저 가게 한다
   * @default true
   */
  dimZero?: boolean;
  /**
   * rows 가 빈 배열일 때 표시할 문구
   * @default "표시할 항목이 없습니다."
   */
  empty?: string;
}
