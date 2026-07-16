// AUTO-GENERATED from contracts/Pagination.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type PaginationState = 'default' | 'hover' | 'focus-visible' | 'disabled';

/**
 * 페이지네이션 — 이전 / 번호 창 / 다음. 현재 페이지 주변 최대 5개 번호만 보여준다(전부 그리면 줄이 넘친다). 도메인을 모른다 — 회원·운영자·적립금 내역 어느 목록이든 page·totalPages·onChange 와 nav 접근성 label 만 받는다. 출처: apps/admin/src/shared/ui/Pagination.tsx (소비 9곳). totalPages ≤ 1 이면 아무것도 렌더하지 않는다(단일 페이지엔 페이지네이션이 없다).
 */
export interface PaginationProps {
  /**
   * 현재 페이지 (1-based). 번호 창이 이 값을 가운데 두려 민다
   */
  page: number;
  /**
   * 전체 페이지 수. 1 이하이면 컴포넌트가 렌더되지 않는다
   */
  totalPages: number;
  /**
   * nav 의 접근성 이름(aria-label). 회원 목록이 기본값 — 다른 목록이 재사용할 때만 바꾼다
   * @default "회원 목록 페이지"
   */
  label?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 선택된 페이지 번호를 인자로 발화한다. 이전/다음/번호 버튼 모두 이 콜백으로 귀결된다
   */
  onChange?: (payload: number) => void;
}
