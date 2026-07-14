// 3상태 체크박스 (A40 소유 — apps/admin/src/shared/ui/**)
//
// indeterminate 는 HTML 속성이 아니라 **DOM 프로퍼티**다 — ref 로만 설정할 수 있다.
// 목록의 '전체 선택'과 권한 매트릭스의 부모(그룹) 행·열 전체선택이 같은 규칙을 쓴다.
//
// [a11y] 보이는 라벨이 없는 자리(매트릭스의 칸)에서는 label 로 접근 가능한 이름을 준다
// ('{리소스명} {액션명}'). 비활성 사유는 describedBy 로 잇는다.
import { useEffect, useRef } from 'react';

import { checkboxStyle } from './styles';

/** 모델의 TriState('on'|'off'|'mixed')를 체크박스 props 로 옮긴다 */
export function triStateProps(state: 'on' | 'off' | 'mixed'): {
  readonly checked: boolean;
  readonly indeterminate: boolean;
} {
  return { checked: state === 'on', indeterminate: state === 'mixed' };
}

interface TriStateCheckboxProps {
  /**
   * input 의 id — 감싸는 `<label>` 이 `htmlFor` 로 가리킬 때 쓴다.
   *
   * 커스텀 컴포넌트 안의 input 은 정적 분석이 볼 수 없어, label 이 이것을 감싸기만 하면
   * jsx-a11y/label-has-associated-control 이 '라벨에 연결된 컨트롤이 없다'고 본다.
   * id 를 명시해 **명시적 연결**로 바꾼다 (클릭-토글 동작은 암묵적 연결과 동일하다).
   */
  readonly id?: string | undefined;
  readonly checked: boolean;
  /** 일부만 선택됨 — checked 보다 우선해서 표시된다 */
  readonly indeterminate: boolean;
  readonly disabled?: boolean | undefined;
  readonly onChange: (checked: boolean) => void;
  /** 라벨 요소의 id — 보이는 텍스트가 있으면 이걸 쓴다 */
  readonly labelledBy?: string | undefined;
  /** 보이는 라벨이 없을 때만 쓴다 */
  readonly label?: string | undefined;
  /** 비활성 사유 문구의 id (잠긴 시스템 역할 안내 등) */
  readonly describedBy?: string | undefined;
}

export function TriStateCheckbox({
  id,
  checked,
  indeterminate,
  disabled = false,
  onChange,
  labelledBy,
  label,
  describedBy,
}: TriStateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current !== null) ref.current.indeterminate = indeterminate && !disabled;
  }, [indeterminate, disabled]);

  return (
    <input
      id={id}
      ref={ref}
      type="checkbox"
      className="tds-ui-check tds-ui-focusable"
      style={checkboxStyle}
      checked={checked}
      disabled={disabled}
      aria-checked={indeterminate && !checked ? 'mixed' : checked}
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}
