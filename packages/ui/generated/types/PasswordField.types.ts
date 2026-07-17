// AUTO-GENERATED from contracts/PasswordField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

import type { ChangeEvent, FocusEvent, MouseEvent } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type PasswordFieldState = 'default' | 'hover' | 'focus-visible' | 'disabled' | 'error';

/**
 * 비밀번호 입력 필드 — TextField + 표시/숨김 토글 버튼. 표시/숨김은 순수 표현 관심사이므로 이 컴포넌트가 소유하되(폼 상태로 끌어올리지 않는다), 계약상 revealed 는 제어 가능한 prop 으로 노출한다. 토글 전환 시 입력값·커서 위치를 유지한다. 출처 구현: apps/admin/src/pages/login/components/PasswordField.tsx

[ref] input 참조는 계약 prop 이 아니라 forwardRef 로 노출한다 (TextField 와 동일 판정 — 현행 구현이 커서 복원을 위해 내부 ref 를 이미 갖고 있으므로 그것을 그대로 전달한다). 호출부가 document.getElementById(id) 로 DOM 을 더듬는 우회를 없앤다.
 */
export interface PasswordFieldProps {
  /**
   * input 의 id. label 의 htmlFor 및 토글 버튼의 aria-controls 가 참조한다
   */
  id: string;
  /**
   * 필드 레이블. 시각적으로 노출되며 input 의 접근 가능한 이름이 된다
   */
  label: string;
  /**
   * 제어 컴포넌트 입력값
   */
  value: string;
  /**
   * 인라인 에러 메시지. 빈 문자열이면 에러 없음 — 값이 있으면 aria-invalid + aria-describedby 연결
   * @default ""
   */
  error?: string;
  /**
   * 비활성. 입력·토글 모두 차단 + aria-disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * 필수 입력. native required 속성 → aria-required. **레이블에 시각 마커(*)를 주입하지 않는다** — 이 문장의 이전 판("레이블에 필수 표식")은 오기(erratum)였다. TextField.required 와 동일 판정: 라벨 textContent = 접근 가능한 이름이며, 마커는 getByLabel 정확일치를 깨고 오너 확정 로그인 화면에 없던 표식을 만든다
   * @default false
   */
  required?: boolean;
  /**
   * 폼 제출 키이자 비밀번호 관리자의 필드 판정 근거. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="password")
   * @default ""
   */
  name?: string;
  /**
   * 브라우저 자동완성 힌트 (current-password · new-password). **없으면 비밀번호 관리자 채우기가 퇴행한다.** 실사용: LoginForm(autoComplete="current-password")
   * @default ""
   */
  autoComplete?: string;
  /**
   * 보조 예시 텍스트. TextField 에는 있으나 PasswordField 가 전달하지 않아 끊겨 있던 표면이다 — 자식 TextField 로 그대로 내려보낸다
   * @default ""
   */
  placeholder?: string;
  /**
   * 표시/숨김 상태. true 면 input type=text(평문) + 눈 감김 아이콘, false 면 type=password + 눈 아이콘
   * @default false
   */
  revealed?: boolean;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 입력값 변경
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onChange?: (payload: ChangeEvent<HTMLInputElement>) => void;
  /**
   * 포커스 이탈 — 폼 검증 트리거 지점. disabled 에서는 발화 금지 (자식 TextField 의 가드로 실제 차단된다 — 실측 확인됨). 계약이 현실보다 약했던 부분의 정정이며, 이 보장을 고정하는 테스트로 고정한다
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onBlur?: (payload: FocusEvent<HTMLInputElement>) => void;
  /**
   * 표시/숨김 토글 버튼 클릭. disabled 에서는 발화 금지 — Storybook Play Function이 전수 검증
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onToggleReveal?: (payload: MouseEvent) => void;
}
