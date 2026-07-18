// AUTO-GENERATED from contracts/SelectionBar.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Actions · 상태: beta

import type { ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type SelectionBarState = 'default' | 'focus-visible';

/**
 * 선택 일괄 액션 바 — '선택 개수 + 일괄 액션(삭제·ON/OFF)'. 콘텐츠 목록 6종(공지·FAQ·팝업·배너·약관·개인정보)이 행을 체크박스로 고르면 상단에 뜬다. 도메인을 모른다 — 무엇을 골랐는지 알지 못하며 선택 개수(count)·단위 문구(noun)·해제 콜백(onClear)·액션 버튼(children)만 받는다. 출처: apps/admin/src/shared/ui/SelectionBar.tsx (소비 7곳). count 가 0 이면 아무것도 렌더하지 않는다(선택이 없으면 바가 없다).
 */
export interface SelectionBarProps {
  /**
   * 선택된 행 수. 0 이면 아무것도 그리지 않는다. 천 단위 구분으로 표기한다
   */
  count: number;
  /**
   * 개수 단위 문구('건'/'명' 등). 기본 '건'
   * @default "건"
   */
  noun?: string;
  /**
   * 일괄 액션 버튼들(일괄 삭제 · 일괄 ON/OFF 등). 어떤 액션인지는 호출부가 버튼으로 넣는다
   */
  children: ReactNode;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 선택 해제. 지정되면 '선택 해제' 버튼을 그리고 누르면 발화한다. 미지정이면 버튼을 그리지 않는다
   */
  onClear?: (payload: void) => void;
}
