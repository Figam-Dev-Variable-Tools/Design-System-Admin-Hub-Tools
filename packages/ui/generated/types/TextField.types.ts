// AUTO-GENERATED from contracts/TextField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 상태: beta

import type { ChangeEvent, FocusEvent, ReactNode } from 'react';

/** `TextField.type` 허용 값 (계약이 유일한 원천) */
export type TextFieldType = 'text' | 'email' | 'password' | 'number';

/** 계약에 선언된 상호작용 상태 */
export type TextFieldState = 'default' | 'hover' | 'focus-visible' | 'disabled' | 'error';

/**
 * 라벨 + 단일행 입력 + 인라인 에러 메시지. 출처: apps/admin/src/pages/login/components/TextField.tsx. 값과 콜백만 받는 제어 컴포넌트다 — 유효성 규칙·상태 머신·API 는 소유하지 않는다. 에러가 있으면 aria-invalid=true 와 aria-describedby="{id}-error" 로 메시지를 연결한다.

[ref] input 요소 참조는 계약 prop 이 아니라 forwardRef 로 노출한다 (제출 실패 시 첫 오류 필드로 포커스를 옮기는 데 필요 — LoginPage). ref 는 Figma/Storybook 대응이 없고, 스키마의 slot 타입은 ReactNode 를 생성하므로 RefObject 를 담을 수 없다. 구현: forwardRef<HTMLInputElement, TextFieldProps & NativeInputProps>.

[네이티브 속성 패스스루] 계약 props 외의 표준 input 속성은 구현이 <input> 으로 전달한다 (Card 선례). 단 폼 동작에 직접 관여하는 name · autoComplete · inputMode 는 호출부가 반드시 쓰는 표면이라 계약에 명시한다 (id · placeholder 선례와 동일).
 */
export interface TextFieldProps {
  /**
   * input 의 id. label htmlFor 및 에러 메시지 id(`{id}-error`)의 기준
   */
  id: string;
  /**
   * 가시 라벨. <label htmlFor={id}> 로 렌더 — placeholder 로 대체 금지
   */
  label: string;
  /**
   * 제어 값. onChange 와 항상 짝을 이룬다
   */
  value: string;
  /**
   * input type
   * @default "text"
   */
  type?: TextFieldType;
  /**
   * 위반 메시지. 빈 문자열이면 정상 상태 — 비어있지 않으면 error 상태(테두리 danger + 메시지 렌더 + aria-invalid)
   * @default ""
   */
  error?: string;
  /**
   * 비활성. native disabled 속성 — onBlur/onChange 발화 없음
   * @default false
   */
  disabled?: boolean;
  /**
   * 필수 입력. native required 속성 → aria-required. **라벨에 시각 마커(*)를 주입하지 않는다** — <label> 의 textContent 가 곧 접근 가능한 이름이므로 마커를 넣으면 이름이 "이메일*" 이 되어 getByLabel/getByLabelText 정확일치 셀렉터가 깨지고(E2E FS-001), 오너 확정 로그인 화면에 없던 표식이 새로 나타난다. 현행 구현(TextField.tsx:63-67)이 계약에 없는 마커를 주입하고 있다 — 정정 대상(A30). 표식이 필요한 화면이 실제로 생기면 그때 실호출부와 함께 prop 을 추가한다
   * @default false
   */
  required?: boolean;
  /**
   * 보조 예시 텍스트. 라벨을 대체하지 않는다
   * @default ""
   */
  placeholder?: string;
  /**
   * 폼 제출 키이자 브라우저 자동완성·비밀번호 관리자의 필드 판정 근거. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="email")
   * @default ""
   */
  name?: string;
  /**
   * 브라우저 자동완성 힌트 (username · email · current-password …). 빈 문자열이면 속성을 부여하지 않는다. **없으면 자격증명 자동완성이 퇴행한다** — 기능 손실이지 장식이 아니다. 실사용: LoginForm(autoComplete="username")
   * @default ""
   */
  autoComplete?: string;
  /**
   * 모바일 소프트 키보드 힌트 (email · numeric · tel …). 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(inputMode="email")
   * @default ""
   */
  inputMode?: string;
  /**
   * 입력 오른쪽에 겹쳐 놓는 요소(비밀번호 표시 토글 등). 있으면 입력의 오른쪽 여백을 넓혀 텍스트와 겹치지 않게 한다
   * 허용 컴포넌트: Button, Icon
   * @default null
   */
  trailing?: ReactNode;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 입력 변경. 제어 컴포넌트이므로 필수 — 부모가 value 를 갱신한다
   */
  onChange?: (payload: ChangeEvent<HTMLInputElement>) => void;
  /**
   * 포커스 이탈(주로 blur-시점 유효성 검사 트리거). disabled 에서는 발화 금지 — Storybook Play Function 이 전수 검증
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onBlur?: (payload: FocusEvent<HTMLInputElement>) => void;
}
