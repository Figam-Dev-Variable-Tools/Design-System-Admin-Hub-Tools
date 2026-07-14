// Checkbox — 체크박스 + 라벨 (atom · contracts/Checkbox.contract.json@1.1.0)
//
// 제어 컴포넌트 — checked/onChange 를 짝지어 받는다 (비제어 defaultChecked 미지원).
// 라벨은 htmlFor={id} 로 연결되어 라벨 클릭도 히트 영역이 된다.
// aria-checked 는 native input[type=checkbox] 가 스스로 노출하므로 별도 속성을 두지 않는다.
// name 은 폼 제출 키다 — 빈 문자열이면 속성을 부여하지 않는다 (계약 props.name).
import type { ChangeEvent } from 'react';

import type { CheckboxProps } from '../../../generated/types/Checkbox.types';
import './Checkbox.css';

export function Checkbox({
  id,
  label,
  name = '',
  checked,
  disabled = false,
  onChange,
}: CheckboxProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    // 계약 events.onChange.blockedWhen — disabled 에서는 발화 금지
    if (disabled) return;
    onChange?.(event);
  };

  return (
    <div className="tds-checkbox">
      <input
        id={id}
        className="tds-checkbox__control"
        type="checkbox"
        name={name === '' ? undefined : name}
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
      />
      <label htmlFor={id} className="tds-checkbox__label">
        {label}
      </label>
    </div>
  );
}
