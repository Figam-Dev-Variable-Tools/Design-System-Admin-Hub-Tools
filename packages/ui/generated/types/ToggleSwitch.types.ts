// AUTO-GENERATED from contracts/ToggleSwitch.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 카테고리: Inputs · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type ToggleSwitchState = 'default' | 'focus-visible' | 'disabled' | 'checked';

/**
 * ON/OFF 토글 스위치 — 이진 노출 상태를 목록/폼에서 바로 켜고 끈다. 출처: apps/admin/src/shared/ui/ToggleSwitch.tsx (소비 30곳: FAQ 노출·팝업/배너 ON/OFF·상품 전시·리뷰 노출·계정 거래 등). 도메인을 모른다 — 무엇을 켜는지 알지 못하고 checked 불리언과 콜백·접근성 라벨만 받는다. role="switch" + aria-checked 이며 <button> 이라 Space/Enter 로 토글된다(버튼 기본 동작). 보이는 ON/OFF 문구로 상태를 색과 글자로 이중 전달한다(WCAG 1.4.1).

[busy = 낙관적 업데이트 잠금] 요청 진행 중에는 잠그고(disabled) aria-busy 로 진행을 알리며 흐리게 표시한다 — disabled 와 같은 시각 잠금이라 별도 Figma Variant 축을 만들지 않아도 되지만, 스키마가 boolean 에 figmaProperty 를 요구하므로 Busy 로 매핑한다.
 */
export interface ToggleSwitchProps {
  /**
   * ON 상태 — 트랙 색과 손잡이 위치를 결정한다. 제어 값이며 onChange 로만 바뀐다
   */
  checked: boolean;
  /**
   * 스크린 리더용 이름(aria-label) — 보이는 라벨이 없는 표 안에서 무엇을 켜는지 알린다('FAQ 노출 여부' 등)
   */
  label: string;
  /**
   * 비활성 — 잠그고 흐리게 표시한다. onChange 발화 없음
   * @default false
   */
  disabled?: boolean;
  /**
   * 낙관적 업데이트 요청 진행 중 — disabled 와 동일하게 잠그고(onChange 없음) aria-busy=true 로 진행을 알린다
   * @default false
   */
  busy?: boolean;
  /**
   * ON 상태 문구 (기본 'ON'). 색+글자로 상태를 이중 전달한다
   * @default "ON"
   */
  onLabel?: string;
  /**
   * OFF 상태 문구 (기본 'OFF')
   * @default "OFF"
   */
  offLabel?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 다음 상태(!checked)를 인자로 발화한다. disabled/busy 잠금 상태에서는 발화 금지 — <button disabled> 가 네이티브로 막는다 (Storybook Play Function 이 전수 검증)
   * 발화 차단 상태: disabled, busy (Storybook Play Function 이 전수 검증)
   */
  onChange?: (payload: boolean) => void;
}
