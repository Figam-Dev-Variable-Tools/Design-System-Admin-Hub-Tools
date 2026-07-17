// TriStateCheckbox — 3상태 체크박스 (atom · contracts/TriStateCheckbox.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/TriStateCheckbox.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// indeterminate 는 HTML 속성이 아니라 DOM 프로퍼티다 — ref 로만 설정한다 (useEffect). aria-checked="mixed"
// 로 부분 선택을 스크린리더에 알린다. 빈 문자열 aria(id/labelledBy/label/describedBy)는 속성을 부여하지
// 않는다. disabled 이면 indeterminate 표시를 끄고 native disabled 로 onChange 를 막는다 (계약 blockedWhen).
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import { useEffect, useRef } from 'react';

import type { TriStateCheckboxProps } from '../../../generated/types/TriStateCheckbox.types';
import './TriStateCheckbox.css';

/**
 * 모델의 TriState('on'|'off'|'mixed')를 체크박스 props 로 옮기는 동반 헬퍼.
 * (Tabs 의 tabId, TextField 의 textFieldErrorId 처럼 컴포넌트와 함께 공개된다)
 */
export function triStateProps(state: 'on' | 'off' | 'mixed'): {
  readonly checked: boolean;
  readonly indeterminate: boolean;
} {
  return { checked: state === 'on', indeterminate: state === 'mixed' };
}

export function TriStateCheckbox({
  checked,
  indeterminate,
  disabled = false,
  id = '',
  labelledBy = '',
  label = '',
  describedBy = '',
  onChange,
}: TriStateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // indeterminate 는 DOM 프로퍼티 — 속성이 아니라 ref 로만 설정된다. disabled 이면 표시를 끈다
    if (ref.current !== null) ref.current.indeterminate = indeterminate && !disabled;
  }, [indeterminate, disabled]);

  return (
    <input
      ref={ref}
      id={id === '' ? undefined : id}
      type="checkbox"
      className="tds-tristate"
      checked={checked}
      disabled={disabled}
      // [aria-checked 는 DOM 을 따라간다 — 넘겨짚지 않는다]
      //
      // 네이티브 체크박스에서 aria-checked 는 **"mixed" 일 때만** 허용된다. on/off 는 native
      // `checked` 가 정본이라 aria-checked 를 덧대면 중복이고, 값이 어긋나면 **모순**이다.
      // 그리고 화면에 실제로 그려지는 mixed 는 위 useEffect 가 넣는 DOM 프로퍼티
      // `indeterminate && !disabled` 다 — aria 도 정확히 그 조건을 따라야 한다.
      //
      // 예전 식 `indeterminate && !checked ? 'mixed' : checked` 는 두 갈래에서 DOM 과 어긋났다
      // (axe `aria-conditional-attr`(serious) 가 실측으로 잡아낸 2건):
      //   · OnMixed(checked+indeterminate)  : DOM 은 indeterminate 인데 aria-checked="true" 를 냈다
      //     → 스크린리더에 '전체 선택' 으로 읽힌다. 실제 화면은 부분 선택이다.
      //   · MixedDisabled(indeterminate+disabled): 표시는 껐는데(위 effect) aria-checked="mixed" 를
      //     남겨 **존재하지 않는 부분 선택**을 알렸다.
      // 이제 mixed 가 아니면 속성을 아예 내지 않고 native checked 에 맡긴다.
      aria-checked={indeterminate && !disabled ? 'mixed' : undefined}
      aria-labelledby={labelledBy === '' ? undefined : labelledBy}
      aria-label={label === '' ? undefined : label}
      aria-describedby={describedBy === '' ? undefined : describedBy}
      // 계약 events.onChange.blockedWhen — disabled 는 native disabled 가 막는다
      onChange={(event) => onChange?.(event.target.checked)}
    />
  );
}
