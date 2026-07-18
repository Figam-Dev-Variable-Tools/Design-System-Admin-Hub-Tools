// AUTO-GENERATED from contracts/Alert.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 카테고리: Feedback · 상태: beta

import type { MouseEvent, ReactNode } from 'react';

/** `Alert.tone` 허용 값 (계약이 유일한 원천) */
export type AlertTone = 'danger' | 'info' | 'success' | 'warning';

/** 계약에 선언된 상호작용 상태 */
export type AlertState = 'default';

/**
 * 피드백 메시지 — 인라인 안내/에러 배너. 출처: apps/admin/src/pages/login/components/Alert.tsx · apps/admin/src/shared/ui/Alert.tsx. 색상만으로 의미를 전달하지 않도록(WCAG 1.4.1) tone 별 아이콘을 함께 렌더한다. tabIndex=-1 이라 바깥에서 프로그래매틱 포커스를 옮길 수 있다(제출 실패 시 에러로 포커스 이동).

[루트 요소는 블록 컨테이너(<div>) 다 — <p> 가 아니다] children 은 node 슬롯이고 실호출부가 블록 자식을 넘긴다 (MemberDetailPage: <div> + 재시도/목록 <Button> 2개). <p> 안의 <div> 는 브라우저가 <p> 를 자동으로 닫아 레이아웃이 붕괴한다. 현행 구현(Alert.tsx:52)이 <p> 를 쓰고 있다 — 정정 대상. role/aria-live/tabIndex 는 그대로 유지한다.

[ref] 배너 포커스 이동용 ref 는 계약 prop 이 아니라 forwardRef 로 노출한다 (TextField 와 동일 판정).
 */
export interface AlertProps {
  /**
   * 메시지 의미. 색상(feedback 토큰)과 아이콘, 그리고 라이브 리전 시맨틱(danger=assertive / 그 외=polite)을 함께 결정한다
   * @default "danger"
   */
  tone?: AlertTone;
  /**
   * 메시지 본문. 아이콘 옆 <span> 으로 렌더된다
   */
  children: ReactNode;
  /**
   * 요소 id. 폼 컨트롤의 aria-describedby 로 이 메시지를 가리킬 때 쓴다. 빈 문자열이면 id 를 부여하지 않는다
   * @default ""
   */
  id?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 닫기(×) 버튼 클릭. **핸들러를 주면 닫기 버튼이 나타나고, 주지 않으면 나타나지 않는다** — 해제 가능 여부는 별도 boolean 이 아니라 이 핸들러의 유무로 결정한다 (shared/ui 선례). 배너를 언마운트하는 것은 호출부의 책임이다 (실사용: MembersPage 상단 안내 배너). 버튼의 접근 가능한 이름은 aria-label="안내 닫기"
   */
  onClose?: (payload: MouseEvent) => void;
}
