// SegmentedControl — 트랙 위 단일 선택 컨트롤 (molecule · contracts/SegmentedControl.contract.json@1.0.0)
//
// 라디오 그룹 시맨틱(role=radiogroup + role=radio + aria-checked)을 소유한다.
// 도메인 중립: 옵션은 options prop 으로 주입한다 (ADR-0003).
//
// [키보드 — WAI-ARIA Radio Group 패턴 · 계약 a11y.keyboard: Tab · ArrowLeft · ArrowRight · Space · Enter]
//
//   radiogroup 컨테이너는 **포커스를 받지 않는다** — 포커스는 언제나 radio 위에 있다.
//   그래서 키 핸들러도 컨테이너가 아니라 각 radio 가 가진다. (jsx-a11y/interactive-supports-focus 가
//   가리킨 진짜 결함이 이것이다: 키 핸들러를 컨테이너에 달아 두면, 그 컨테이너가 포커스를 받지 못하는 한
//   화살표 키는 **radio 에서 버블링되어 올라올 때만** 동작한다. 컨테이너를 tabindex 로 focusable 하게
//   만드는 것은 오답이다 — 라디오 그룹은 그룹 자체가 탭 정지점이 되면 안 된다. 핸들러를 focusable 한
//   radio 로 내리는 것이 정답이다.)
//
//   로빙 tabindex — 그룹 전체가 탭 순서에서 **한 칸**만 차지한다:
//     · 선택된 세그먼트가 tabIndex=0, 나머지는 -1
//     · 선택된 것이 없으면(value 가 options 에 없으면) **첫 세그먼트**가 탭 진입점이 된다.
//       이 폴백이 없으면 모든 세그먼트가 -1 이 되어 **그룹 전체가 키보드로 도달 불가능**해진다.
//   ArrowLeft/ArrowRight — 선택과 포커스를 함께 옮긴다 (선택이 포커스를 따른다 · 라디오 그룹 관례).
//   Space/Enter — native <button> 이 click 으로 바꿔 주므로 별도 처리가 필요 없다.
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

import type { SegmentedControlProps } from '../../../generated/types/SegmentedControl.types';
import './SegmentedControl.css';

export function SegmentedControl({
  value,
  options,
  size = 'md',
  disabled = false,
  ariaLabel,
  onChange,
}: SegmentedControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const selectedIndex = options.findIndex((option) => option.id === value);
  /** 로빙 tabindex 의 탭 진입점 — 선택된 것이 없으면 첫 세그먼트 */
  const tabStopIndex = selectedIndex < 0 ? 0 : selectedIndex;

  const select = (id: string) => {
    // 계약 events.onChange.blockedWhen — disabled 에서는 발화 금지
    if (disabled) return;
    onChange?.(id);
  };

  const focusSegment = (id: string) => {
    trackRef.current?.querySelector<HTMLButtonElement>(`[data-segment-id="${id}"]`)?.focus();
  };

  /** 좌우 화살표 — 선택과 포커스를 함께 옮긴다. 핸들러의 소유자는 포커스를 가진 radio 다 */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0 || options.length === 0) return;
    event.preventDefault();

    const next = options[(tabStopIndex + step + options.length) % options.length];
    if (next === undefined) return;

    select(next.id);
    focusSegment(next.id);
  };

  return (
    <div
      ref={trackRef}
      className={`tds-segmented tds-segmented--${size}`}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled ? true : undefined}
    >
      {options.map((option, index) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            data-segment-id={option.id}
            className="tds-segmented__segment"
            aria-checked={selected}
            aria-disabled={disabled ? true : undefined}
            disabled={disabled}
            tabIndex={index === tabStopIndex ? 0 : -1}
            onClick={() => {
              select(option.id);
            }}
            onKeyDown={handleKeyDown}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
