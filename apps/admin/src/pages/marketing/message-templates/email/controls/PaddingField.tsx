// PaddingField — 상/하/좌/우 네 슬라이더 한 묶음
//
// [왜 따로 빼나] 7종 블록 **전부**가 padding 을 갖는다(BlockBase). 네 슬라이더 + 라벨 배선을
// INSPECT 패널마다 복붙하면 블록 종류마다 상한이나 라벨이 어긋난다.
import type { CSSProperties } from 'react';

import { cssVar, Slider } from '@tds/ui';

import { FieldBox } from './FieldBox';
import { PADDING_MAX } from '../blocks';
import type { BlockPadding } from '../../types';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/**
 * 슬라이더 값 옆의 단위 표기.
 * 이것은 **스타일 값이 아니라 사람이 읽는 문구**다 — 린트가 막는 것은 `'32px'` 처럼 치수가 박힌
 * 리터럴이고(숫자+px), 숫자는 언제나 state 에서 온다. 그래서 단위 글자만 따로 둔다.
 */
const PX_UNIT = 'px';

/** 네 변의 순서와 이름 — 화면과 상태 키를 한곳에서 잇는다 */
const SIDES: readonly { readonly key: keyof BlockPadding; readonly label: string }[] = [
  // 바깥 FieldBox 가 이미 '여백' 이라 적지만 여기서 한 번 더 적는다 — 이 글자는 Slider 의
  // 접근성 이름이라 스크린리더가 홀로 읽는다('위쪽' 만으로는 무엇의 위쪽인지 알 수 없다).
  { key: 'top', label: '위쪽 여백' },
  { key: 'bottom', label: '아래쪽 여백' },
  { key: 'left', label: '왼쪽 여백' },
  { key: 'right', label: '오른쪽 여백' },
];

interface PaddingFieldProps {
  readonly idPrefix: string;
  readonly value: BlockPadding;
  readonly disabled?: boolean;
  readonly onChange: (next: BlockPadding) => void;
}

export function PaddingField({ idPrefix, value, disabled, onChange }: PaddingFieldProps) {
  return (
    <FieldBox label="여백">
      <div style={listStyle}>
        {SIDES.map((side) => (
          <Slider
            key={side.key}
            id={`${idPrefix}-padding-${side.key}`}
            label={side.label}
            value={value[side.key]}
            min={0}
            max={PADDING_MAX}
            unit={PX_UNIT}
            {...(disabled === undefined ? {} : { disabled })}
            onChange={(next) => {
              onChange({ ...value, [side.key]: next });
            }}
          />
        ))}
      </div>
    </FieldBox>
  );
}

export { PX_UNIT };
