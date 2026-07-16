// AUTO-GENERATED from contracts/ToggleSwitch.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const ToggleSwitchArgTypes = {
  checked: {
    description: 'ON 상태 — 트랙 색과 손잡이 위치를 결정한다. 제어 값이며 onChange 로만 바뀐다',
    control: {
      type: 'boolean',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'boolean',
      },
    },
  },
  label: {
    description: '스크린 리더용 이름(aria-label) — 보이는 라벨이 없는 표 안에서 무엇을 켜는지 알린다(\'FAQ 노출 여부\' 등)',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
    },
  },
  disabled: {
    description: '비활성 — 잠그고 흐리게 표시한다. onChange 발화 없음',
    control: {
      type: 'boolean',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'boolean',
      },
      defaultValue: {
        summary: 'false',
      },
    },
  },
  busy: {
    description: '낙관적 업데이트 요청 진행 중 — disabled 와 동일하게 잠그고(onChange 없음) aria-busy=true 로 진행을 알린다',
    control: {
      type: 'boolean',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'boolean',
      },
      defaultValue: {
        summary: 'false',
      },
    },
  },
  onLabel: {
    description: 'ON 상태 문구 (기본 \'ON\'). 색+글자로 상태를 이중 전달한다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"ON"',
      },
    },
  },
  offLabel: {
    description: 'OFF 상태 문구 (기본 \'OFF\')',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '"OFF"',
      },
    },
  },
  onChange: {
    description: '다음 상태(!checked)를 인자로 발화한다. disabled/busy 잠금 상태에서는 발화 금지 — <button disabled> 가 네이티브로 막는다 (Storybook Play Function 이 전수 검증) 발화 차단 상태: disabled, busy',
    action: 'onChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'boolean',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 8개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { checked: 'false', disabled: 'false', busy: 'false' },
  { checked: 'false', disabled: 'false', busy: 'true' },
  { checked: 'false', disabled: 'true', busy: 'false' },
  { checked: 'false', disabled: 'true', busy: 'true' },
  { checked: 'true', disabled: 'false', busy: 'false' },
  { checked: 'true', disabled: 'false', busy: 'true' },
  { checked: 'true', disabled: 'true', busy: 'false' },
  { checked: 'true', disabled: 'true', busy: 'true' },
] as const;

export type ToggleSwitchCombination = (typeof combinationMatrix)[number];
