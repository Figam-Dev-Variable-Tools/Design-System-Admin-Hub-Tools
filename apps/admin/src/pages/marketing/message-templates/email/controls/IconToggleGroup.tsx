// IconToggleGroup — 아이콘 버튼 몇 개 중 하나를 고르는 줄 (정렬 컨트롤)
//
// [왜 SegmentedControl(@tds/ui) 이 아닌가] 목업의 정렬 줄은 라벨 없는 **아이콘 버튼 3개**이고,
// 스펙이 aria-pressed 를 지정했다. DS 의 SegmentedControl 은 radiogroup/aria-checked 시맨틱을
// 소유하는 **라벨 있는 트랙**이라 생김새도 시맨틱도 다르다. 라벨 있는 세그먼트(H1|H2|H3 등)는
// 그쪽을 그대로 쓰고, 아이콘 정렬 줄만 여기서 그린다 — 두 벌을 만든 것이 아니라 서로 다른 물건이다.
//
// [aria-pressed 토글 버튼 묶음] 각 버튼이 '눌림/안 눌림' 을 스스로 알린다. 묶음은 role="group" 과
// 이름을 갖는다 — 그래야 스크린리더가 '정렬' 이라는 맥락 안에서 세 버튼을 읽는다.
import type { CSSProperties, ReactNode } from 'react';

import { iconButtonStyle } from '../styles';
import { cssVar } from '@tds/ui';

const groupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

export interface IconToggleOption<T extends string> {
  readonly id: T;
  /** 접근 가능한 이름 — 아이콘만 보이므로 이것이 유일한 이름이다 */
  readonly label: string;
  readonly icon: ReactNode;
}

interface IconToggleGroupProps<T extends string> {
  /** 묶음의 접근 가능한 이름 (예: 'Align') */
  readonly label: string;
  readonly value: T;
  readonly options: readonly IconToggleOption<T>[];
  readonly disabled?: boolean;
  readonly onChange: (next: T) => void;
}

export function IconToggleGroup<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: IconToggleGroupProps<T>) {
  const locked = disabled === true;
  return (
    <div style={groupStyle} role="group" aria-label={label}>
      {options.map((option) => {
        const pressed = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            style={iconButtonStyle(pressed, locked)}
            aria-pressed={pressed}
            aria-label={option.label}
            disabled={locked}
            onClick={() => {
              onChange(option.id);
            }}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
