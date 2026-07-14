// AUTO-GENERATED from contracts/Checkbox.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 상태: beta

import type { ChangeEvent } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type CheckboxState = 'default' | 'hover' | 'focus-visible' | 'disabled' | 'checked';

/**
 * 체크박스 + 라벨. 출처: apps/admin/src/pages/login/components/Checkbox.tsx. 제어 컴포넌트로 checked/onChange 를 반드시 짝지어 받는다 (비제어 defaultChecked 는 지원하지 않는다). 라벨은 htmlFor={id} 로 연결되어 라벨 클릭으로도 토글된다.
 */
export interface CheckboxProps {
  /**
   * input 의 id. label htmlFor 의 기준
   */
  id: string;
  /**
   * 가시 라벨. 클릭 시 토글되는 히트 영역이다
   */
  label: string;
  /**
   * 폼 제출 키. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="rememberEmail") — 오너 확정 화면의 DOM 이다
   * @default ""
   */
  name?: string;
  /**
   * 체크 상태. 제어 값 — onChange 로만 바뀐다
   */
  checked: boolean;
  /**
   * 비활성. native disabled 속성 — onChange 발화 없음
   * @default false
   */
  disabled?: boolean;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 체크 토글. disabled 에서는 발화 금지 — Storybook Play Function 이 전수 검증
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onChange?: (payload: ChangeEvent<HTMLInputElement>) => void;
}
