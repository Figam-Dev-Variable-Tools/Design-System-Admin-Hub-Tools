// AUTO-GENERATED from contracts/TriStateCheckbox.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 카테고리: Inputs · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type TriStateCheckboxState = 'default' | 'focus-visible' | 'disabled' | 'checked' | 'indeterminate';

/**
 * 3상태 체크박스 — on/off/mixed. 출처: apps/admin/src/shared/ui/TriStateCheckbox.tsx (소비: 권한 매트릭스의 부모(그룹) 행·열·마스터 전체선택, 목록 표의 전체선택 헤더(TableSelection)). 도메인을 모른다 — checked/indeterminate 두 플래그와 콜백·접근성 라벨만 받는다. 동반 헬퍼 triStateProps(state: 'on'|'off'|'mixed') → {checked, indeterminate} 로 모델의 3상태를 props 로 옮긴다.

[indeterminate 는 DOM 프로퍼티다] HTML 속성이 아니라 DOM 프로퍼티라 ref 로만 설정할 수 있다 — 구현은 useEffect 로 ref.current.indeterminate 를 쓴다. aria-checked="mixed" 로 스크린리더에 부분 선택을 알린다 (손복사 체크박스가 빠뜨렸던 결함을 이 공통 컴포넌트가 회복한다).

[접근성 이름] 보이는 라벨이 없는 자리(매트릭스 칸·표 헤더)에서는 labelledBy 로 숨긴 라벨을, 없으면 label 로 이름을 준다. 비활성 사유는 describedBy 로 잇는다. 빈 문자열이면 해당 aria 속성을 부여하지 않는다.
 */
export interface TriStateCheckboxProps {
  /**
   * 체크 상태 (모델의 'on'). 제어 값 — onChange 로만 바뀐다
   */
  checked: boolean;
  /**
   * 부분 선택('mixed') — checked 보다 우선해 표시된다. HTML 속성이 아니라 DOM 프로퍼티라 ref 로만 설정되며 aria-checked="mixed" 로 노출된다
   */
  indeterminate: boolean;
  /**
   * 비활성 — native disabled. onChange 발화 없음. disabled 이면 indeterminate 표시도 끈다(잠긴 시스템 역할 등)
   * @default false
   */
  disabled?: boolean;
  /**
   * input 의 id — 감싸는 <label> 이 htmlFor 로 가리킬 때 쓴다. 빈 문자열이면 부여하지 않는다
   * @default ""
   */
  id?: string;
  /**
   * 라벨 요소의 id (aria-labelledby) — 보이는 텍스트가 있으면 이걸 쓴다. 빈 문자열이면 부여하지 않는다
   * @default ""
   */
  labelledBy?: string;
  /**
   * 접근 가능한 이름(aria-label) — 보이는 라벨이 없을 때만 쓴다('{리소스명} {액션명}'). 빈 문자열이면 부여하지 않는다
   * @default ""
   */
  label?: string;
  /**
   * 비활성 사유 문구의 id (aria-describedby) — 잠긴 시스템 역할 안내 등. 빈 문자열이면 부여하지 않는다
   * @default ""
   */
  describedBy?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 다음 체크 상태를 인자로 발화한다. disabled 에서는 발화 금지 — native disabled 가 막는다 (Storybook Play Function 이 전수 검증)
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onChange?: (payload: boolean) => void;
}
