// AUTO-GENERATED from contracts/Checkbox.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const CheckboxArgTypes = {
  id: {
    description: 'input 의 id. label htmlFor 의 기준',
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
  label: {
    description: '가시 라벨. 클릭 시 토글되는 히트 영역이다',
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
  name: {
    description: '폼 제출 키. 빈 문자열이면 속성을 부여하지 않는다. 실사용: LoginForm(name="rememberEmail") — 오너 확정 화면의 DOM 이다',
    control: {
      type: 'text',
    },
    table: {
      category: 'Props',
      type: {
        summary: 'string',
      },
      defaultValue: {
        summary: '""',
      },
    },
  },
  checked: {
    description: '체크 상태. 제어 값 — onChange 로만 바뀐다',
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
  disabled: {
    description: '비활성. native disabled 속성 — onChange 발화 없음',
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
  onChange: {
    description: '체크 토글. disabled 에서는 발화 금지 — Storybook Play Function 이 전수 검증 발화 차단 상태: disabled',
    action: 'onChange',
    control: false,
    table: {
      category: 'Events',
      type: {
        summary: 'ChangeEvent<HTMLInputElement>',
      },
    },
  },
} as const;

/**
 * 커버리지 검증용 조합 행렬 — enum prop 값 곱 × boolean prop 당 2.
 * 총 4개 조합. Story 커버리지는 이 행렬 대비 100%여야 G5 통과.
 *
 * **states 는 여기 없다** — contract-test 의 combinationMatrixSize() 와 같은 식이어야 하고,
 * state 커버리지는 A77 축2(contract-states)가 단언 있는 테스트로 따로 강제한다.
 */
export const combinationMatrix = [
  { checked: 'false', disabled: 'false' },
  { checked: 'false', disabled: 'true' },
  { checked: 'true', disabled: 'false' },
  { checked: 'true', disabled: 'true' },
] as const;

export type CheckboxCombination = (typeof combinationMatrix)[number];
