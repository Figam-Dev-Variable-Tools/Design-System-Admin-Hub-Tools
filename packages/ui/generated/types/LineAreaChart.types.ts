// AUTO-GENERATED from contracts/LineAreaChart.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Charts · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type LineAreaChartState = 'default';

/**
 * 범용 선 + 면적 차트 — 계열마다 kind 로 선/면적을 고른다. 외부 차트 라이브러리 의존 0 (SVG 좌표 직접 계산, Catmull-Rom → 3차 베지어 스무딩). 도메인 중립: '방문자/페이지뷰' 같은 계열 의미는 데이터를 주입하는 organism 이 소유한다 (ADR-0003). 출처 구현: apps/admin/src/pages/dashboard/components/VisitorChart.tsx 를 일반화
 */
export interface LineAreaChartProps {
  /**
   * 계열 목록. values 길이는 labels 길이와 같아야 한다. 데이터 prop — Figma 대응 없음 (ADR-0003)
   */
  series: ReadonlyArray<{ id: string; label: string; kind: 'line' | 'area'; values: readonly number[] }>;
  /**
   * x축 눈금 라벨. 데이터 prop — Figma 대응 없음
   */
  labels: ReadonlyArray<string>;
  /**
   * 계열 범례 표시 여부. 범례는 장식이 아니라 계열 식별 수단이므로 기본 노출
   * @default true
   */
  showLegend?: boolean;
  /**
   * role=img 의 접근 가능한 이름. 차트가 전달하는 추세를 문장으로 기술한다
   */
  ariaLabel: string;
}
