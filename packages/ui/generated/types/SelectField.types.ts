// AUTO-GENERATED from contracts/SelectField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 상태: beta

import type { ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type SelectFieldState = 'default' | 'focus-visible' | 'disabled' | 'error';

/**
 * 드롭다운 컨트롤 — raw <select> 의 무손실 드롭인. 출처: apps/admin/src/shared/ui/SelectField.tsx (소비 63곳: 콘텐츠·회원·권한·마케팅·상품·영업 폼). 네이티브 화살표를 지우고(appearance:none) 토큰 여백을 둔 커스텀 chevron 을 얹어 모든 화면에서 같은 드롭다운을 낸다. 입력(TextField)과 높이·테두리·radius·포커스링을 공유한다.

[네이티브 속성 패스스루 — 계약 prop 이 아니다] 계약 props(isInvalid·children) 외의 표준 <select> 속성(value · defaultValue · onChange · name · id · disabled · ref · aria-* …)은 구현이 <select> 로 그대로 전달한다 (Button/Card 선례). 그래서 raw <select> 의 무손실 드롭인이다 (RHF register spread · 제어형 value 모두 그대로). E2E 가 getByLabel(...).selectOption(...) 로 조작하므로 네이티브 combobox 시맨틱 유지가 계약이다. className/style 은 토큰 규칙 보호를 위해 차단한다. ref 는 계약 prop 이 아니라 forwardRef 로 노출한다 (TextField/Alert 선례).

[isInvalid 이름] 오류 상태 boolean 은 naming-guard(boolean-prop) 규칙상 is 접두가 필요하다 — 앱 원안의 invalid 는 Button 의 fullWidth→isFullWidth 와 같은 판정으로 isInvalid 로 좁혔다 (호출부 10곳 동시 이관). aria-invalid 는 이와 별개로 호출부가 네이티브 패스스루로 함께 준다.
 */
export interface SelectFieldProps {
  /**
   * 오류 상태 — 입력의 controlStyle(invalid) 와 같은 붉은(feedback.danger) 테두리를 낸다. 메시지는 감싸는 FormField 가 렌더한다(이 컨트롤은 테두리만 바꾼다)
   * @default false
   */
  isInvalid?: boolean;
  /**
   * <option> 들 — 호출부가 넣는다 (raw <select> 와 동일). 커스텀 컴포넌트로 감싸지 않고 그대로 <select> 자식으로 렌더한다
   */
  children: ReactNode;
}
