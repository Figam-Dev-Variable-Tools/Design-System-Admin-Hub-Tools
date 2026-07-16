// AUTO-GENERATED from contracts/TextareaField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type TextareaFieldState = 'default' | 'focus-visible' | 'disabled' | 'error';

/**
 * 제어 textarea + 글자수 카운터 — 긴 글 입력('공지 본문·FAQ 답변·약관 조문·상품 설명' 등)을 FormField 껍데기 안에 담는다. 출처: apps/admin/src/shared/ui/TextareaField.tsx (소비 30곳). 네 화면이 각자 textarea + 카운터 + 검증 배선을 복사하면 최대 길이·오류 자리·카운터 형식이 어긋난다 — 한 벌만 둔다.

[FormField 조립] 라벨/오류/힌트/필수 표식과 우측 카운터('N/max')는 FormField(molecule) 에 위임한다 (dependencies: FormField). 이 컴포넌트는 그 슬롯 안에 제어 <textarea> 를 넣고, htmlFor 로 라벨과 잇고, aria-invalid·aria-describedby(errorIdOf/hintIdOf)로 접근성을 배선한다. id 는 useId 로 생성한다.

[리치 텍스트 아님] 지금은 제어된 <textarea> 로만 본문을 받는다(WYSIWYG 미도입 — ADR 사안). 서식 본문이 요구되면 내부만 에디터로 바꾸고 value/onChange 계약은 유지한다.

[도메인을 모른다] 무슨 본문인지 알지 못한다 — value/onChange/maxLength 와 라벨 문자열만 받는다.

[exactOptionalPropertyTypes] 옵셔널 문자열 prop(error·hint·placeholder)은 호출부가 string|undefined 를 그대로 넘긴다 — 구현이 경계에서 undefined 를 허용해 받고 정규화한다 (FormField 와 동일 처리, 30곳 호출부 무변경).
 */
export interface TextareaFieldProps {
  /**
   * 필드 레이블 — FormField 로 내려보낸다
   */
  label: string;
  /**
   * 제어 컴포넌트 입력값. 카운터('value.length/maxLength')의 분자도 이 길이에서 나온다
   */
  value: string;
  /**
   * 최대 길이 — native maxLength 와 카운터 분모('N/max')를 함께 정한다
   */
  maxLength: number;
  /**
   * 필수 필드 — FormField 로 내려보내 레이블에 마커(*)를 그리고, **동시에 <textarea> 자신에게 native required + aria-required 로 잇는다** (마커는 aria-hidden 장식이라 그것만으로는 AT 에 닿지 않는다 — A11Y-11)
   * @default false
   */
  required?: boolean;
  /**
   * 비활성 — native disabled 로 입력을 막는다. onChange 발화도 차단한다(blockedWhen)
   * @default false
   */
  disabled?: boolean;
  /**
   * 인라인 오류 메시지 — FormField 로 내려보낸다. 값이 있으면 aria-invalid=true + aria-describedby=errorIdOf(id). 빈 문자열/미지정이면 오류 없음
   * @default ""
   */
  error?: string;
  /**
   * 보조 안내 — FormField 로 내려보낸다. 오류가 없을 때만 그리고, 그때 aria-describedby=hintIdOf(id)
   * @default ""
   */
  hint?: string;
  /**
   * 보조 예시 텍스트. 빈 문자열/미지정이면 속성을 부여하지 않는다
   * @default ""
   */
  placeholder?: string;
  /**
   * textarea 표시 행 수(native rows). 최소 높이는 별도로 토큰 배수로도 보장한다
   * @default 8
   */
  rows?: number;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 입력값 변경 — 이벤트가 아니라 새 문자열(event.target.value)을 그대로 넘긴다. disabled 에서는 발화 금지(내부 가드 + native disabled 이중 차단)
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onChange?: (payload: string) => void;
}
