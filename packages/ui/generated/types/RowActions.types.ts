// AUTO-GENERATED from contracts/RowActions.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type RowActionsState = 'default' | 'hover' | 'focus-visible' | 'disabled';

/**
 * 목록 행의 인라인 액션 — 수정(연필) · 삭제(휴지통). 콘텐츠 목록(공지·FAQ·팝업·배너)의 행 끝 액션이 동일해 한 벌로 올렸다. 도메인을 모른다 — 무엇을 수정/삭제하는지 알지 못하며 콜백과 접근성 라벨(label)·진행중 잠금(disabled)만 받는다. 출처: apps/admin/src/shared/ui/RowActions.tsx (소비 6곳). 삭제는 여기서 곧바로 지우지 않는다 — 호출부가 onDelete 안에서 확인 다이얼로그를 연다(확인 없는 삭제 금지). onEdit/onDelete 는 각각 있을 때만 해당 버튼을 그린다.
 */
export interface RowActionsProps {
  /**
   * 스크린 리더용 대상 이름 — 행마다 달라야 한다('공지 제목'). 버튼 aria-label 은 '{label} 수정'/'{label} 삭제'
   */
  label: string;
  /**
   * 진행 중(삭제 요청 등) — 두 버튼을 잠근다(native disabled)
   * @default false
   */
  disabled?: boolean;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 수정 — 지정되면 연필 버튼을 그린다. 미지정(읽기 전용 행)이면 생략. disabled 에서는 발화 금지
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onEdit?: (payload: void) => void;
  /**
   * 삭제 — 지정되면 휴지통 버튼을 그린다. 호출부가 확인 다이얼로그를 연다. disabled 에서는 발화 금지
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onDelete?: (payload: void) => void;
}
