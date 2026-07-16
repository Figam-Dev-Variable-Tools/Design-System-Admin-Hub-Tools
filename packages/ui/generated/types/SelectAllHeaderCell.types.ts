// AUTO-GENERATED from contracts/SelectAllHeaderCell.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type SelectAllHeaderCellState = 'default' | 'focus-visible' | 'checked' | 'indeterminate';

/**
 * 표 헤더의 전체선택 칸 — 보이지 않는 라벨 + 3상태 체크박스(TriStateCheckbox)를 담은 <th>. 이 페이지의 행이 전부 선택됐으면 on, 일부면 mixed, 아니면 off. 회원·운영자·콘텐츠 목록이 같은 규칙으로 쓴다. 도메인을 모른다 — 라벨 문구(label)·라벨 id(labelId)·선택 상태(selection)·전체토글 콜백만 받는다. 출처: apps/admin/src/shared/ui/TableSelection.tsx 의 SelectAllHeaderCell. selection 은 동반 유틸 tableSelectionState(rows, selectedIds) 가 계산한 {allSelected, someSelected} 다 — 보이지 않는 행은 세지 않는다(다른 페이지의 선택이 남아 있어도 이 페이지 상태만 본다). 보이는 라벨이 없으므로 숨긴 문구를 labelId 로 두고 TriStateCheckbox 의 labelledBy 로 잇는다.
 */
export interface SelectAllHeaderCellProps {
  /**
   * 보이지 않는 라벨 문구 — 예: '이 페이지의 회원 전체 선택'
   */
  label: string;
  /**
   * 라벨 요소의 id — 표마다 달라야 한다(한 문서에 두 표가 있을 수 있다). TriStateCheckbox 의 labelledBy 로 이어진다
   */
  labelId: string;
  /**
   * 이 페이지의 선택 상태 — 동반 유틸 tableSelectionState 가 계산한다. allSelected → 체크박스 on, someSelected → mixed(부분 선택). 데이터 prop — Figma 대응 없음
   */
  selection: { readonly allSelected: boolean; readonly someSelected: boolean };

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 전체선택/해제 — 다음 상태(boolean)를 인자로 발화한다
   */
  onToggleAll?: (payload: boolean) => void;
}
