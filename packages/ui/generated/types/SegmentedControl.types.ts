// AUTO-GENERATED from contracts/SegmentedControl.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

/** `SegmentedControl.size` 허용 값 (계약이 유일한 원천) */
export type SegmentedControlSize = 'sm' | 'md';

/** 계약에 선언된 상호작용 상태 */
export type SegmentedControlState = 'default' | 'hover' | 'focus-visible' | 'disabled' | 'selected';

/**
 * 세그먼티드 컨트롤 — 트랙(회색 배경) 위에 선택된 세그먼트만 알약으로 떠 있는 단일 선택 컨트롤. 라디오 그룹 시맨틱을 소유한다. 도메인 중립: 옵션은 options prop 으로 주입하며 '일/주/월' 같은 도메인 의미는 조립하는 organism/page 가 정한다 (ADR-0003). 출처 구현: apps/admin/src/pages/dashboard/components/RangeToggle.tsx
 */
export interface SegmentedControlProps {
  /**
   * 선택된 세그먼트의 id. options[].id 중 하나여야 한다
   */
  value: string;
  /**
   * 세그먼트 목록. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003)
   */
  options: ReadonlyArray<{ id: string; label: string }>;
  /**
   * 세그먼트 높이·좌우 패딩 스케일
   * @default "md"
   */
  size?: SegmentedControlSize;
  /**
   * 그룹 전체 비활성. onChange 차단 + aria-disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * radiogroup 의 접근 가능한 이름 (예: '조회 기간'). 시각 레이블이 없으므로 필수
   */
  ariaLabel: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 선택된 세그먼트의 id 를 전달. disabled 에서는 발화 금지 — Storybook Play Function이 전수 검증
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onChange?: (payload: string) => void;
}
