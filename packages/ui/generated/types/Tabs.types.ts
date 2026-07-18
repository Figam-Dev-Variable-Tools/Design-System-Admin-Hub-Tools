// AUTO-GENERATED from contracts/Tabs.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Navigation · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type TabsState = 'default' | 'hover' | 'focus-visible' | 'selected';

/**
 * 하단 밑줄형 탭 목록. 선택된 탭만 액션 컬러 밑줄을 갖고, 비선택 탭도 동일 두께의 투명 밑줄을 둬 전환 시 라벨이 밀리지 않는다. 탭 패널은 이 컴포넌트가 렌더하지 않는다 — aria-controls 로 바깥 패널을 가리킨다. 도메인 중립: 탭 항목은 items prop 으로 주입한다 (ADR-0003). 출처 구현: apps/admin/src/pages/dashboard/components/TabBar.tsx
 */
export interface TabsProps {
  /**
   * 선택된 탭의 id. items[].id 중 하나여야 한다
   */
  value: string;
  /**
   * 탭 목록. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003)
   */
  items: ReadonlyArray<{ id: string; label: string }>;
  /**
   * tablist 의 접근 가능한 이름 (예: '업무 영역')
   */
  ariaLabel: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 선택된 탭의 id 를 전달
   */
  onChange?: (payload: string) => void;
}
