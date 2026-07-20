// 카운터가 **입력칸 오른쪽에 붙는** 한 줄 입력 (사이트 설정 전용)
//
// [왜 _shared/fields 의 TextInputField 가 아닌가] 그 필드는 FormField 를 쓰고, FormField 는 라벨과
// 카운터를 **같은 줄(입력칸 위)** 에 놓는다. 이 화면은 라벨이 왼쪽 열로 빠져 나가 있어 그 줄 자체가
// 없다 — 카운터가 갈 곳은 입력칸의 오른쪽뿐이다. 겹쳐 띄우지 않고 나란히 두는 이유는 값이 길어질
// 때 글자와 숫자가 서로를 먹지 않게 하기 위해서다.
//
// [A11Y-11] aria-invalid 를 켤 때는 오류 <p> 의 id 를 aria-describedby 로 잇고, 오류가 없으면 힌트를
// 잇는다. 카운터는 **항상** 함께 잇는다 — '몇 자 남았는지' 는 오류가 없을 때도 필요한 정보다.
import type { CSSProperties } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { controlStyle, errorTextStyle } from '../../../../shared/ui';
import { cssVar } from '@tds/ui';

const boxStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const counterStyle: CSSProperties = {
  flexShrink: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

interface CountedInputProps {
  readonly id: string;
  /** '14/20' · '36/40 byte' — 단위는 호출부가 정한다(글자 수인지 바이트인지가 화면마다 다르다) */
  readonly counter: string;
  readonly registration: UseFormRegisterReturn;
  readonly disabled: boolean;
  readonly error?: string | undefined;
  /** 왼쪽 열 설명 문단의 id — 오류가 없을 때 여기에 잇는다 */
  readonly hintId?: string | undefined;
  readonly placeholder?: string | undefined;
  /**
   * 입력 자체를 막는 상한. **글자 수 기준일 때만 준다** — 바이트 상한은 maxLength 로 표현할 수
   * 없다(한글 1자 = 2byte). 바이트 상한은 검증이 판정하고 카운터가 미리 보여 준다.
   */
  readonly maxLength?: number | undefined;
}

export function CountedInput({
  id,
  counter,
  registration,
  disabled,
  error,
  hintId,
  placeholder,
  maxLength,
}: CountedInputProps) {
  const invalid = error !== undefined && error !== '';
  const errorId = `${id}-error`;
  const counterId = `${id}-counter`;

  const describedBy = [invalid ? errorId : hintId, counterId]
    .filter((token): token is string => token !== undefined && token !== '')
    .join(' ');

  return (
    <div style={boxStyle}>
      <div style={rowStyle}>
        <input
          id={id}
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(invalid, disabled)}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...(placeholder === undefined ? {} : { placeholder })}
          {...(maxLength === undefined ? {} : { maxLength })}
          {...registration}
        />
        <span id={counterId} style={counterStyle}>
          {counter}
        </span>
      </div>

      {invalid && (
        <p id={errorId} role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
