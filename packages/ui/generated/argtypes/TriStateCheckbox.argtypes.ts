// AUTO-GENERATED from contracts/TriStateCheckbox.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)

/** Storybook argTypes — 계약에서 생성. Story 파일에서 spread 하여 사용한다. */
export const TriStateCheckboxArgTypes = {
  checked: {
    description: '체크 상태 (모델의 \'on\'). 제어 값 — onChange 로만 바뀐다',
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
  indeterminate: {
    description: '부분 선택(\'mixed\') — checked 보다 우선해 표시된다. HTML 속성이 아니라 DOM 프로퍼티라 ref 로만 설정되며 aria-checked="mixed" 로 노출된다',
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
    description: '비활성 — native disabled. onChange 발화 없음. disabled 이면 indeterminate 표시도 끈다(잠긴 시스템 역할 등)',
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
  id: {
    description: 'input 의 id — 감싸는 <label> 이 htmlFor 로 가리킬 때 쓴다. 빈 문자열이면 부여하지 않는다',
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
  labelledBy: {
    description: '라벨 요소의 id (aria-labelledby) — 보이는 텍스트가 있으면 이걸 쓴다. 빈 문자열이면 부여하지 않는다',
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
  label: {
    description: '접근 가능한 이름(aria-label) — 보이는 라벨이 없을 때만 쓴다(\'{리소스명} {액션명}\'). 빈 문자열이면 부여하지 않는다',
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
  describedBy: {
    description: '비활성 사유 문구의 id (aria-describedby) — 잠긴 시스템 역할 안내 등. 빈 문자열이면 부여하지 않는다',
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
  onChange: {
    description: '다음 체크 상태를 인자로 발화한다. disabled 에서는 발화 금지 — native disabled 가 막는다 (Storybook Play Function 이 전수 검증) 발화 차단 상태: disabled',
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
  { checked: 'false', indeterminate: 'false', disabled: 'false' },
  { checked: 'false', indeterminate: 'false', disabled: 'true' },
  { checked: 'false', indeterminate: 'true', disabled: 'false' },
  { checked: 'false', indeterminate: 'true', disabled: 'true' },
  { checked: 'true', indeterminate: 'false', disabled: 'false' },
  { checked: 'true', indeterminate: 'false', disabled: 'true' },
  { checked: 'true', indeterminate: 'true', disabled: 'false' },
  { checked: 'true', indeterminate: 'true', disabled: 'true' },
] as const;

export type TriStateCheckboxCombination = (typeof combinationMatrix)[number];
