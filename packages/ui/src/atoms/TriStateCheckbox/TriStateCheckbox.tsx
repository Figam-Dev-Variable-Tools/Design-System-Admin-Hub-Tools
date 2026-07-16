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
      aria-checked={indeterminate && !checked ? 'mixed' : checked}
      aria-labelledby={labelledBy === '' ? undefined : labelledBy}
      aria-label={label === '' ? undefined : label}
      aria-describedby={describedBy === '' ? undefined : describedBy}
      // 계약 events.onChange.blockedWhen — disabled 는 native disabled 가 막는다
      onChange={(event) => onChange?.(event.target.checked)}
    />
  );
}
