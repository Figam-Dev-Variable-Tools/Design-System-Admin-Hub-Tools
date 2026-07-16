// ToggleSwitch — ON/OFF 토글 스위치 (atom · contracts/ToggleSwitch.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/ToggleSwitch.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// role="switch" + aria-checked. <button> 이라 Space/Enter 로 토글된다(버튼 기본 동작). 보이는 ON/OFF
// 문구로 상태를 색과 글자로 이중 전달한다(WCAG 1.4.1 — 문구 span 은 aria-hidden 장식, 이름은 aria-label).
// disabled/busy 는 <button disabled> 로 잠가 onChange 발화를 네이티브로 막는다 (계약 blockedWhen).
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건 (상태는 aria-checked/:disabled 선택자가 소유).
import type { ToggleSwitchProps } from '../../../generated/types/ToggleSwitch.types';
import './ToggleSwitch.css';

export function ToggleSwitch({
  checked,
  label,
  disabled = false,
  busy = false,
  onLabel = 'ON',
  offLabel = 'OFF',
  onChange,
}: ToggleSwitchProps) {
  // 계약 events.onChange.blockedWhen — disabled/busy 에서는 잠근다 (네이티브 disabled 가 onClick 을 막는다)
  const locked = disabled || busy;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy}
      disabled={locked}
      className="tds-toggle"
      onClick={() => onChange?.(!checked)}
    >
      <span className="tds-toggle__track" aria-hidden="true">
        <span className="tds-toggle__knob" />
      </span>
      <span className="tds-toggle__label" aria-hidden="true">
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}
