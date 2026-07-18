// AUTO-GENERATED from contracts/RowSelectCell.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Tables · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type RowSelectCellState = 'default' | 'focus-visible' | 'checked';

/**
 * 표 행의 선택 칸 — 보이지 않는 라벨 + 단일 체크박스를 담은 <td>. 목록 표(회원·운영자·공지·FAQ·팝업·배너·버전 이력)의 행 선택 마크업을 한 벌로 올렸다. 도메인을 모른다 — 행 식별자(id)·보이지 않는 라벨 문구(label)·checked·토글 콜백만 받는다. 출처: apps/admin/src/shared/ui/TableSelection.tsx 의 RowSelectCell (TableSelection 묶음의 행-셀 대표). 보이는 라벨이 없으므로 시각적으로 숨긴 문구를 두고 aria-labelledby(id 파생) 로 잇는다.
 */
export interface RowSelectCellProps {
  /**
   * 행 식별자 — 보이지 않는 라벨의 id('select-{id}')를 파생한다(한 문서에 여러 표가 있어도 안 겹친다)
   */
  id: string;
  /**
   * 보이지 않는 라벨 문구 — 예: '{공지 제목} 선택'. aria-labelledby 로 체크박스에 이어진다
   */
  label: string;
  /**
   * 선택 여부. 제어 값 — onToggle 로만 바뀐다
   */
  checked: boolean;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 다음 선택 상태(boolean)를 인자로 발화한다
   */
  onToggle?: (payload: boolean) => void;
}
